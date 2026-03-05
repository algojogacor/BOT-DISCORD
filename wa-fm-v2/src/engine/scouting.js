// src/engine/scouting.js — Scouting Network & Youth Academy

import { dbAll, dbRun, dbGet, getClub, getPlayer } from '../db/database.js';

// ─── Scout Regions ────────────────────────────────────────────────────────────
export const SCOUT_REGIONS = {
  'premier_league': { name: 'Premier League', cost: 50000, duration: 3, quality: 85 },
  'la_liga': { name: 'La Liga', cost: 45000, duration: 3, quality: 82 },
  'serie_a': { name: 'Serie A', cost: 40000, duration: 3, quality: 80 },
  'bundesliga': { name: 'Bundesliga', cost: 40000, duration: 3, quality: 79 },
  'liga1_id': { name: 'Liga 1 Indonesia', cost: 15000, duration: 2, quality: 60 },
  'south_america': { name: 'Amerika Selatan', cost: 35000, duration: 4, quality: 75 },
  'africa': { name: 'Afrika', cost: 20000, duration: 4, quality: 65 },
};

// ─── Player Roles ─────────────────────────────────────────────────────────────
export const PLAYER_ROLES = {
  // Kiper
  'GK': ['Sweeper Keeper', 'Traditional Keeper', 'Rushing Keeper'],
  // Bek
  'CB': ['Ball Playing Defender', 'No-Nonsense CB', 'Libero'],
  'LB': ['Attacking Fullback', 'Defensive Fullback', 'Wing Back'],
  'RB': ['Attacking Fullback', 'Defensive Fullback', 'Wing Back'],
  // Tengah
  'CDM': ['Anchor Man', 'Ball Winning Midfielder', 'Deep Lying Playmaker'],
  'CM': ['Box to Box', 'Deep Lying Playmaker', 'Advanced Playmaker', 'Carrilero'],
  'CAM': ['Advanced Playmaker', 'Enganche', 'Shadow Striker'],
  // Sayap
  'LW': ['Inside Forward', 'Wide Playmaker', 'Inverted Winger', 'Winger'],
  'RW': ['Inside Forward', 'Wide Playmaker', 'Inverted Winger', 'Winger'],
  // Depan
  'CF': ['False 9', 'Advanced Forward', 'Pressing Forward'],
  'ST': ['Poacher', 'Advanced Forward', 'Target Man', 'Pressing Forward'],
};

// Bonus/penalty role ke statistik match
export const ROLE_MODIFIERS = {
  'Sweeper Keeper': { att: 0.05, def: 0.08 },
  'Ball Playing Defender': { att: 0.08, def: 0.0 },
  'No-Nonsense CB': { att: 0.0, def: 0.12 },
  'Attacking Fullback': { att: 0.12, def: -0.05 },
  'Defensive Fullback': { att: 0.0, def: 0.10 },
  'Ball Winning Midfielder': { att: 0.0, def: 0.10 },
  'Box to Box': { att: 0.08, def: 0.05 },
  'Deep Lying Playmaker': { att: 0.05, def: 0.03 },
  'Advanced Playmaker': { att: 0.12, def: 0.0 },
  'Inside Forward': { att: 0.15, def: -0.05 },
  'Winger': { att: 0.10, def: 0.0 },
  'Poacher': { att: 0.18, def: -0.08 },
  'Target Man': { att: 0.10, def: 0.0 },
  'Pressing Forward': { att: 0.08, def: 0.05 },
  'False 9': { att: 0.10, def: 0.05 },
};

// ─── Inisialisasi Scouts Default ──────────────────────────────────────────────
export function initDefaultScouts(clubId) {
  const existing = dbGet(`SELECT id FROM scouts WHERE club_id = ?`, clubId);
  if (existing) return;

  const club = getClub(clubId);
  const rep = club?.reputation || 50;

  // Setiap klub mulai dengan 2 scout default
  const scouts = [
    { name: 'Ahmad Basuki', ability: Math.min(80, 40 + Math.floor(rep * 0.4)), country: 'Indonesia' },
    { name: 'Carlos Mendez', ability: Math.min(85, 45 + Math.floor(rep * 0.4)), country: 'Brazil' },
  ];

  for (const s of scouts) {
    dbRun(`INSERT INTO scouts (club_id, name, ability, country, cost) VALUES (?, ?, ?, ?, ?)`,
      clubId, s.name, s.ability, s.country, s.ability * 100);
  }
}

// ─── Kirim Scout ──────────────────────────────────────────────────────────────
export function sendScout(clubId, targetType, targetId, currentMatchday) {
  // targetType: 'player' | 'region'
  const club = getClub(clubId);
  if (!club) return { ok: false, msg: '❌ Klub tidak ditemukan.' };

  const scouts = dbAll(`SELECT * FROM scouts WHERE club_id = ?`, clubId);
  if (scouts.length === 0) return { ok: false, msg: '❌ Kamu tidak punya scout!' };

  // Cek scout yang tidak sedang bertugas
  const busyScoutIds = dbAll(`
    SELECT scout_id FROM scouting_assignments
    WHERE club_id = ? AND status = 'scouting'
  `, clubId).map(r => r.scout_id);

  const availableScout = scouts.find(s => !busyScoutIds.includes(s.id));
  if (!availableScout) {
    return { ok: false, msg: `⚠️ Semua scout sedang bertugas! Tunggu laporan mereka.` };
  }

  let duration = 3;
  let regionName = '';

  if (targetType === 'player') {
    const player = getPlayer(targetId);
    if (!player) return { ok: false, msg: '❌ Pemain tidak ditemukan.' };
    duration = Math.max(2, Math.floor(4 - availableScout.ability / 40));
    regionName = player.name;
  } else {
    const region = SCOUT_REGIONS[targetId];
    if (!region) return { ok: false, msg: `❌ Region tidak dikenal.` };
    duration = region.duration;
    regionName = region.name;

    // Biaya scouting region
    if ((club.balance || 0) < region.cost) {
      return { ok: false, msg: `❌ Saldo tidak cukup! Butuh ${fmtMoney(region.cost)}, kamu punya ${fmtMoney(club.balance)}` };
    }
    dbRun(`UPDATE clubs SET balance = balance - ? WHERE id = ?`, region.cost, clubId);
  }

  dbRun(`
    INSERT INTO scouting_assignments
    (scout_id, club_id, target_player_id, target_region, assigned_matchday, complete_matchday, status)
    VALUES (?, ?, ?, ?, ?, ?, 'scouting')
  `,
    availableScout.id, clubId,
    targetType === 'player' ? targetId : null,
    targetType === 'region' ? targetId : null,
    currentMatchday,
    currentMatchday + duration,
  );

  return {
    ok: true,
    msg: `🔭 *${availableScout.name}* dikirim untuk scout *${regionName}*!\n\nLaporan tersedia dalam *${duration} matchday* (MD ${currentMatchday + duration})\n💸 Biaya: ${targetType === 'region' ? fmtMoney(SCOUT_REGIONS[targetId]?.cost || 0) : 'Gratis'}`,
  };
}

// ─── Proses Laporan Scout ─────────────────────────────────────────────────────
export function processScoutReports(clubId, currentMatchday) {
  const done = dbAll(`
    SELECT sa.*, sc.ability as scout_ability, sc.name as scout_name
    FROM scouting_assignments sa
    JOIN scouts sc ON sa.scout_id = sc.id
    WHERE sa.club_id = ? AND sa.complete_matchday <= ? AND sa.status = 'scouting'
  `, clubId, currentMatchday);

  const reports = [];

  for (const assignment of done) {
    if (assignment.target_player_id) {
      // Scout pemain spesifik
      const report = scoutPlayerReport(assignment.target_player_id, assignment.scout_ability, clubId, currentMatchday);
      dbRun(`UPDATE scouting_assignments SET status = 'complete', report = ? WHERE id = ?`,
        JSON.stringify(report), assignment.id);
      reports.push({ type: 'player', scoutName: assignment.scout_name, report });
    } else if (assignment.target_region) {
      // Scout region → temukan talent tersembunyi
      const report = scoutRegionReport(assignment.target_region, assignment.scout_ability, clubId, currentMatchday);
      dbRun(`UPDATE scouting_assignments SET status = 'complete', report = ? WHERE id = ?`,
        JSON.stringify(report), assignment.id);
      reports.push({ type: 'region', scoutName: assignment.scout_name, report });
    }
  }

  return reports;
}

function scoutPlayerReport(playerId, scoutAbility, clubId, matchday) {
  const p = getPlayer(playerId);
  if (!p) return null;

  // Scout ability mempengaruhi akurasi estimasi
  const error = Math.max(1, Math.floor((100 - scoutAbility) / 10));
  const revOverall = clamp(p.overall + randRange(-error, error), 40, 99);
  const revPA = clamp(p.potential + randRange(-error * 2, error), 40, 99);

  // Save ke scouted_players
  const existing = dbGet(`SELECT id FROM scouted_players WHERE club_id = ? AND player_id = ?`, clubId, playerId);
  if (existing) {
    dbRun(`UPDATE scouted_players SET revealed_overall = ?, revealed_potential = ?, scouted_at = ? WHERE id = ?`,
      revOverall, revPA, matchday, existing.id);
  } else {
    dbRun(`INSERT INTO scouted_players (club_id, player_id, revealed_overall, revealed_potential, scouted_at) VALUES (?, ?, ?, ?, ?)`,
      clubId, playerId, revOverall, revPA, matchday);
  }

  return {
    playerId, name: p.name, position: p.position, age: p.age,
    nationality: p.nationality,
    revOverall, revPA,
    marketValue: p.market_value,
    wage: p.wage,
    notes: generateScoutNote(revOverall, revPA, p.age),
  };
}

function scoutRegionReport(region, scoutAbility, clubId, matchday) {
  const regionData = SCOUT_REGIONS[region];
  if (!regionData) return null;

  // Cari pemain tersembunyi di region ini dengan potential tinggi tapi overall masih muda
  // Filter: pemain muda (≤23), PA tinggi (≥75), belum pernah discouting oleh klub ini
  const candidates = dbAll(`
    SELECT p.* FROM players p
    JOIN clubs c ON p.club_id = c.id
    LEFT JOIN scouted_players sp ON sp.player_id = p.id AND sp.club_id = ?
    WHERE p.age <= 23
      AND p.potential >= 72
      AND (c.league_id IN (SELECT id FROM leagues WHERE status = 'active'))
      AND sp.id IS NULL
    ORDER BY p.potential DESC, RANDOM()
    LIMIT 5
  `, clubId);

  const found = [];
  for (const p of candidates) {
    const report = scoutPlayerReport(p.id, scoutAbility, clubId, matchday);
    if (report) found.push(report);
  }

  return { region: regionData.name, found };
}

function generateScoutNote(overall, pa, age) {
  const potential = pa - overall;
  const notes = [];

  if (age <= 19 && pa >= 80) notes.push('⭐ Wonderkid! Potensi sangat tinggi');
  else if (age <= 21 && pa >= 78) notes.push('✨ Bakat muda menjanjikan');

  if (potential >= 15) notes.push('📈 Ruang berkembang sangat besar');
  else if (potential >= 8) notes.push('📊 Masih bisa berkembang');
  else if (potential <= 2) notes.push('📉 Mendekati puncak kemampuan');

  if (overall >= 85) notes.push('🔥 Pemain kelas dunia');
  else if (overall >= 78) notes.push('💪 Pemain solid');
  else if (overall >= 70) notes.push('👍 Pemain cukup baik');
  else notes.push('🔄 Butuh pengembangan lebih');

  return notes.join('\n');
}

// ─── Youth Academy ────────────────────────────────────────────────────────────
const YOUTH_NAMES = [
  'Arya Dimas', 'Rafif Alfarizi', 'Raka Pratama', 'Naufal Haikal', 'Faiz Rendra',
  'Rizky Maulana', 'Akbar Setiawan', 'Dafa Khoirul', 'Hafizh Ramadhan', 'Yusuf Ilham',
  'Marco Santander', 'Luis Herrera', 'Pablo Rojas', 'Diego Fuentes', 'Mateo Silva',
  'Jamie Wilson', 'Callum Fraser', 'Liam O\'Brien', 'Harry Stone', 'Ethan Clarke',
  'Kai Weber', 'Leon Schulz', 'Finn Müller', 'Max Fischer', 'Jonas Becker',
];

export function generateYouthIntake(clubId, season) {
  // Tiap akhir musim, youth academy hasilkan 3-5 pemain baru
  const count = Math.floor(Math.random() * 3) + 3;
  const club = getClub(clubId);
  const repBonus = Math.floor((club?.reputation || 50) / 20);
  const players = [];

  const positions = ['GK', 'CB', 'LB', 'CM', 'CAM', 'LW', 'ST', 'RB', 'CDM', 'RW'];

  for (let i = 0; i < count; i++) {
    const name = YOUTH_NAMES[Math.floor(Math.random() * YOUTH_NAMES.length)];
    const position = positions[Math.floor(Math.random() * positions.length)];
    const age = 16 + Math.floor(Math.random() * 3); // 16-18
    const overall = 48 + Math.floor(Math.random() * 20) + repBonus; // 48-72+
    const potential = overall + 10 + Math.floor(Math.random() * 25) + repBonus; // PA tersembunyi
    const capped = Math.min(95, potential);

    dbRun(`
      INSERT INTO youth_players (club_id, name, position, age, overall, potential, nationality, joined_season)
      VALUES (?, ?, ?, ?, ?, ?, 'Indonesia', ?)
    `, clubId, name, position, age, overall, capped, season);

    players.push({ name, position, age, overall });
  }

  return players;
}

export function promoteYouthPlayer(clubId, youthId) {
  const youth = dbGet(`SELECT * FROM youth_players WHERE id = ? AND club_id = ?`, youthId, clubId);
  if (!youth) return { ok: false, msg: '❌ Pemain tidak ditemukan di youth academy.' };
  if (youth.promoted) return { ok: false, msg: `❌ ${youth.name} sudah dipromosi ke first team.` };

  // Tambah ke first team players
  const personalities = ['Leader', 'Ambitious', 'Loyal', 'Mercenary', 'Troublemaker', 'Professional'];
  const traits = ['Free-Kick Specialist', 'Dribbler', 'Poacher', 'Playmaker', 'Anchor', 'None', 'None', 'None'];
  const ppers = personalities[Math.floor(Math.random() * personalities.length)];
  const ptrait = traits[Math.floor(Math.random() * traits.length)];
  dbRun(`
    INSERT INTO players (club_id, name, position, age, overall, potential, nationality,
      wage, contract_end, form, morale, personality, playstyle_trait)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 65, 80, ?, ?)
  `, clubId, youth.name, youth.position, youth.age, youth.overall, youth.potential,
    youth.nationality || 'Indonesia',
    Math.max(5000, youth.overall * 200),
    new Date().getFullYear() + 3,
    ppers, ptrait
  );

  dbRun(`UPDATE youth_players SET promoted = 1 WHERE id = ?`, youthId);

  return {
    ok: true,
    msg: `🎉 *${youth.name}* resmi dipromosi ke first team!\n${youth.position} | ⭐${youth.overall} | Usia ${youth.age}`,
  };
}

export function formatYouthAcademy(clubId) {
  const youths = dbAll(`SELECT * FROM youth_players WHERE club_id = ? AND promoted = 0 ORDER BY overall DESC`, clubId);
  if (youths.length === 0) return `🏫 Youth academy kosong.\nPemain baru akan masuk di akhir musim.`;

  let msg = `🏫 *YOUTH ACADEMY*\n\n`;
  youths.forEach((y, i) => {
    msg += `${i + 1}. *${y.name}* (${y.position}) Usia: ${y.age} ⭐${y.overall}\n`;
  });
  msg += `\n_Ketik !promosi [nomor] untuk promosi ke first team_\n_PA tersembunyi — kirim scout untuk assess_`;
  return msg;
}

// ─── Tactical Familiarity ─────────────────────────────────────────────────────
export function updateTacticalFamiliarity(clubId, formation) {
  const existing = dbGet(`SELECT * FROM tactical_familiarity WHERE club_id = ? AND formation = ?`, clubId, formation);

  if (existing) {
    const newFam = Math.min(100, existing.familiarity + 5);
    dbRun(`UPDATE tactical_familiarity SET familiarity = ?, matches_played = matches_played + 1 WHERE id = ?`,
      newFam, existing.id);
    return newFam;
  } else {
    // Formasi baru: mulai dari 20
    dbRun(`INSERT INTO tactical_familiarity (club_id, formation, familiarity, matches_played) VALUES (?, ?, 20, 1)`,
      clubId, formation);
    return 20;
  }
}

export function getTacticalFamiliarity(clubId, formation) {
  const rec = dbGet(`SELECT familiarity FROM tactical_familiarity WHERE club_id = ? AND formation = ?`, clubId, formation);
  return rec?.familiarity ?? 20; // Default 20 untuk formasi baru
}

// ─── Manager Career ───────────────────────────────────────────────────────────
export function getOrCreateManager(phone, name = null) {
  let mgr = dbGet(`SELECT * FROM managers WHERE phone = ?`, phone);
  if (!mgr) {
    dbRun(`INSERT OR IGNORE INTO managers (phone, name) VALUES (?, ?)`,
      phone, name || phone.split('@')[0]);
    mgr = dbGet(`SELECT * FROM managers WHERE phone = ?`, phone);
  }
  return mgr;
}

export function updateManagerReputation(phone, delta) {
  const mgr = dbGet(`SELECT * FROM managers WHERE phone = ?`, phone);
  if (!mgr) return;
  const newRep = clamp((mgr.reputation || 30) + delta, 0, 100);
  dbRun(`UPDATE managers SET reputation = ? WHERE phone = ?`, newRep, phone);
  return newRep;
}

export function recordManagerHistory(phone, clubId, season, result) {
  const mgr = dbGet(`SELECT * FROM managers WHERE phone = ?`, phone);
  if (!mgr) return;
  const history = JSON.parse(mgr.history || '[]');
  history.push({ clubId, season, result, date: new Date().toISOString() });
  dbRun(`UPDATE managers SET history = ?, seasons_managed = seasons_managed + 1 WHERE phone = ?`,
    JSON.stringify(history), phone);
}

export function getAvailableJobs(managerReputation) {
  // Klub tanpa user manager yang reputasinya sesuai
  const minRep = Math.max(0, managerReputation - 20);
  const maxRep = Math.min(100, managerReputation + 30);

  return dbAll(`
    SELECT c.*, l.name as league_name
    FROM clubs c
    JOIN leagues l ON c.league_id = l.id
    WHERE c.is_user = 0
      AND c.reputation BETWEEN ? AND ?
    ORDER BY c.reputation DESC
    LIMIT 10
  `, minRep, maxRep);
}

export function applyForJob(phone, clubId) {
  const mgr = dbGet(`SELECT * FROM managers WHERE phone = ?`, phone);
  const club = getClub(clubId);
  if (!mgr || !club) return { ok: false, msg: '❌ Data tidak ditemukan.' };

  // Cek reputasi
  const repDiff = Math.abs((mgr.reputation || 30) - (club.reputation || 50));
  if (repDiff > 35) {
    return { ok: false, msg: `❌ Reputasimu tidak cukup untuk melamar ke ${club.name}.\nReputasimu: ${mgr.reputation}/100, Butuh: ~${club.reputation - 20}+` };
  }

  // Accept atau reject secara AI
  const chance = Math.max(0.2, 1 - repDiff / 50);
  if (Math.random() < chance) {
    // Lepas dari klub lama
    if (mgr.current_club_id) {
      dbRun(`UPDATE clubs SET is_user = 0, user_phone = NULL WHERE id = ?`, mgr.current_club_id);
    }
    // Assign ke klub baru
    dbRun(`UPDATE clubs SET is_user = 1, user_phone = ? WHERE id = ?`, phone, clubId);
    dbRun(`UPDATE managers SET current_club_id = ?, job_status = 'employed' WHERE phone = ?`, clubId, phone);
    dbRun(`UPDATE sessions SET club_id = ? WHERE phone = ?`, clubId, phone);

    return {
      ok: true,
      msg: `🤝 *LAMARAN DITERIMA!*\n\nSelamat! Kamu resmi jadi manajer *${club.name}*!\n🏟️ Stadion: ${club.stadium}\n💰 Budget: ${fmtMoney(club.transfer_budget)}\n\nKetik *!timku* untuk lihat skuad barumu!`,
    };
  } else {
    return {
      ok: false,
      msg: `❌ *${club.name}* menolak lamaranmu saat ini.\n_Tingkatkan reputasimu dengan meraih prestasi lebih baik._`,
    };
  }
}

export function fireManager(phone) {
  const mgr = dbGet(`SELECT * FROM managers WHERE phone = ?`, phone);
  if (!mgr?.current_club_id) return;
  dbRun(`UPDATE clubs SET is_user = 0, user_phone = NULL WHERE id = ?`, mgr.current_club_id);
  dbRun(`UPDATE managers SET current_club_id = NULL, job_status = 'unemployed' WHERE phone = ?`, phone);
  dbRun(`UPDATE sessions SET club_id = NULL WHERE phone = ?`, phone);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(val, min, max) { return Math.max(min, Math.min(max, val)); }
function randRange(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function fmtMoney(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}