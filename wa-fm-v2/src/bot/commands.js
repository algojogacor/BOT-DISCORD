// src/bot/commands.js — Full FM Bot Commands v2

import {
  getSession, setSession, clearSessionState, getClubByPhone, getClub,
  getLeague, getActiveLeague, getLeagueClubs, getClubPlayers, getAvailablePlayers,
  getPlayer, updateClub, dbGet, dbAll, dbRun
} from '../db/database.js';
import {
  processMatchday, startUserMatch, tryAdvanceMatchday,
  formatStandings, formatSchedule, setupLeague, applyStandings
} from '../engine/league.js';
import {
  searchPlayers, makeOffer, sellPlayer, loanPlayer, getFreeAgents,
  formatFinanceSummary, formatMoney
} from '../engine/transfer.js';
import {
  preMatchPress, applyPreMatchPress, halftimeTeamTalk,
  applyHalftimeTeamTalk, postMatchInterview, applyPostMatchInterview,
  formatPlayerTalkMenu
} from '../engine/press.js';
import {
  formatDecisionPrompt, DECISION, simulateUntilDecision,
  formatMatchReport, applyDecision
} from '../engine/match.js';
import { formatFitnessReport, formatRotationAdvice } from '../engine/stamina.js';
import {
  sendScout, processScoutReports, formatYouthAcademy, promoteYouthPlayer,
  SCOUT_REGIONS, PLAYER_ROLES, initDefaultScouts, getOrCreateManager,
  updateManagerReputation, getAvailableJobs, applyForJob, recordManagerHistory
} from '../engine/scouting.js';
import { formatBoardReport, checkManagerFiring, generateBoardTargets } from '../engine/board.js';
import { formatDetailedFinance, upgradeFacility } from '../engine/finance.js';
import {
  formatSquadHarmonyReport, formatAIApproach, checkAIApproaches,
  formatSetPieceSpec, assignSetPieceSpecialists, assignCaptain,
  generateMatchConditions, formatMatchConditions
} from '../engine/squad.js';
import { formatCupBracket, formatCupStandings, setupDomesticCup } from '../engine/cup.js';
import {
  generateSponsorOffers, formatSponsorOffers, activateSponsor,
  processSponsorWinBonus, getActiveSponsor, formatActiveSponsor
} from '../engine/sponsor.js';
import {
  formatStaffReport, formatHireMenu, hireStaff, getStaffModifiers
} from '../engine/staff.js';

async function send(sock, jid, text) {
  await sock.sendMessage(jid, { text });
}

// ─── Router ───────────────────────────────────────────────────────────────────
export async function handleMessage(sock, chatJid, senderJid, text, leagueName) {
  const raw = text.trim();
  const msg = raw.toLowerCase();
  const args = raw.trim().split(/\s+/).slice(1);
  const session = getSession(senderJid) || { state: 'idle' };

  if (session.state && session.state !== 'idle') {
    return handleState(sock, chatJid, senderJid, raw, session);
  }

  // ── Core ──
  if (msg === '!menu' || msg === 'menu') return sendMenu(sock, chatJid);
  if (msg === '!buatliga') return handleBuatLiga(sock, chatJid, senderJid, leagueName);
  if (msg === '!daftar') return handleJoin(sock, chatJid, senderJid);
  if (msg === '!mulai') return handleStartLeague(sock, chatJid, senderJid, leagueName);
  if (msg === '!main' || msg === '!mainkanlaga') return handlePlayMatch(sock, chatJid, senderJid);
  if (msg === '!next' || msg === '!lanjut') return handleNext(sock, chatJid, senderJid);
  if (msg === '!info') return handleInfo(sock, chatJid);

  // ── Info ──
  if (msg === '!klasemen') return send(sock, chatJid, formatStandings((await getActiveLid())));
  if (msg === '!jadwal') return handleSchedule(sock, chatJid);
  if (msg === '!timku') return handleMyTeam(sock, chatJid, senderJid);
  if (msg === '!pemain') return handleSquad(sock, chatJid, senderJid);
  if (msg === '!topscorer') return handleTopScorer(sock, chatJid);
  if (msg === '!cedera') return handleInjuries(sock, chatJid, senderJid);
  if (msg === '!kontrak') return handleContracts(sock, chatJid, senderJid);
  if (msg === '!keuangan') return handleFinance(sock, chatJid, senderJid);

  // ── Fitness ──
  if (msg === '!fitness') return handleFitness(sock, chatJid, senderJid);
  if (msg === '!rotasi') return handleRotasi(sock, chatJid, senderJid);

  // ── Transfer ──
  if (msg.startsWith('!cari ')) return handleSearch(sock, chatJid, senderJid, args.join(' '));
  if (msg.startsWith('!beli ')) return handleBuy(sock, chatJid, senderJid, args);
  if (msg.startsWith('!jual ')) return handleSell(sock, chatJid, senderJid, args);
  if (msg.startsWith('!pinjam ')) return handleLoan(sock, chatJid, senderJid, args);
  if (msg === '!freeagent') return handleFreeAgents(sock, chatJid, senderJid);

  // ── Taktik ──
  if (msg.startsWith('!formasi')) return handleTactic(sock, chatJid, senderJid, args);
  if (msg.startsWith('!style ')) return handleStyle(sock, chatJid, senderJid, args[0]);
  if (msg === '!taktikinfo') return handleTacticInfo(sock, chatJid, senderJid);

  // ── Player Role ──
  if (msg.startsWith('!role ')) return handleSetRole(sock, chatJid, senderJid, args);

  // ── Scouting ──
  if (msg === '!scout') return handleScoutMenu(sock, chatJid, senderJid);
  if (msg.startsWith('!scout ')) return handleSendScout(sock, chatJid, senderJid, args);
  if (msg === '!laporanscout') return handleScoutReports(sock, chatJid, senderJid);
  if (msg === '!scoutedpemain') return handleScoutedPlayers(sock, chatJid, senderJid);

  // ── Youth Academy ──
  if (msg === '!youth') return handleYouth(sock, chatJid, senderJid);
  if (msg.startsWith('!promosi ')) return handlePromote(sock, chatJid, senderJid, args[0]);

  // ── Manager Career ──
  if (msg === '!manajer') return handleManagerProfile(sock, chatJid, senderJid);
  if (msg === '!lamarpekerjaan') return handleJobMenu(sock, chatJid, senderJid);
  if (msg.startsWith('!lamar ')) return handleApplyJob(sock, chatJid, senderJid, args[0]);

  // ── Board ──
  if (msg === '!board') return handleBoard(sock, chatJid, senderJid);

  // ── Finance ──
  if (msg === '!keuangandetail') return handleDetailFinance(sock, chatJid, senderJid);
  if (msg.startsWith('!upgrade ')) return handleUpgrade(sock, chatJid, senderJid, args[0]);

  // ── Squad Harmony ──
  if (msg === '!harmony') return handleHarmony(sock, chatJid, senderJid);
  if (msg === '!kapten') return handleCaptain(sock, chatJid, senderJid);

  // ── Set Piece ──
  if (msg === '!setpiece') return handleSetPiece(sock, chatJid, senderJid);

  // ── Cup ──
  if (msg === '!piala') return handleCupStatus(sock, chatJid, senderJid);
  if (msg === '!mainpiala') return handlePlayCup(sock, chatJid, senderJid);

  // ── AI Approaches ──
  if (msg.startsWith('!tolak ')) return handleRejectApproach(sock, chatJid, senderJid, args.join(' '));
  if (msg === '!tawaranai') return handleAIApproaches(sock, chatJid, senderJid);

  // ── Weather ──
  if (msg === '!cuaca') return handleWeather(sock, chatJid, senderJid);

  // ── Player Interaction ──
  if (msg.startsWith('!bicara ')) return handlePlayerTalk(sock, chatJid, senderJid, args.join(' '));

  // ── Sponsor ──
  if (msg === '!sponsor') return handleSponsor(sock, chatJid, senderJid);

  // ── Backroom Staff ──
  if (msg === '!staf') return handleStaff(sock, chatJid, senderJid);
  if (msg.startsWith('!rekrutstaf ')) return handleHireStaff(sock, chatJid, senderJid, args);

  // ── Player Detail (Personality/Trait) ──
  if (msg.startsWith('!pemaindetail ')) return handlePlayerDetail(sock, chatJid, senderJid, args.join(' '));

  // ── Derby Info ──
  if (msg === '!derby') return handleDerbyInfo(sock, chatJid, senderJid);
}

// ─── State Machine ────────────────────────────────────────────────────────────
async function handleState(sock, chatJid, senderJid, raw, session) {
  const state = session.state;
  const data = session.state_data ? JSON.parse(session.state_data) : {};

  if (state === 'choosing_team') return handleTeamChoice(sock, chatJid, senderJid, raw, data);
  if (state === 'press_conf') return handlePressResponse(sock, chatJid, senderJid, raw, data);
  if (state === 'halftime_talk') return handleHalftimeTalk(sock, chatJid, senderJid, raw, data);
  if (state === 'match_decision') return handleMatchDecision(sock, chatJid, senderJid, raw, data);
  if (state === 'post_match') return handlePostMatchResponse(sock, chatJid, senderJid, raw, data);
  if (state === 'buying_player') return handleBuyOffer(sock, chatJid, senderJid, raw, data);
  if (state === 'player_talk') return handlePlayerTalkChoice(sock, chatJid, senderJid, raw, data);
  if (state === 'choosing_sponsor') return handleSponsorChoice(sock, chatJid, senderJid, raw, data);
  if (state === 'hiring_staff') return handleHireStaffChoice(sock, chatJid, senderJid, raw, data);

  clearSessionState(senderJid);
}

// ─── Join & Team Selection ────────────────────────────────────────────────────
async function handleJoin(sock, chatJid, senderJid) {
  const existing = getClubByPhone(senderJid);
  if (existing) return send(sock, chatJid, `⚽ @${senderJid.split('@')[0]} sudah jadi manajer *${existing.name}*!\nKetik *!timku*`);

  // Cari liga aktif ATAU setup (hasil import Kaggle)
  const league = dbGet(`SELECT * FROM leagues WHERE status IN ('active','setup') ORDER BY id DESC LIMIT 1`);
  if (!league) return send(sock, chatJid, `❌ Belum ada liga. Ketik *!buatliga* untuk membuat liga baru.`);

  // Ambil semua klub dari semua liga yang tersedia
  const clubs = dbAll(`
    SELECT c.*, l.name as league_name
    FROM clubs c JOIN leagues l ON c.league_id = l.id
    WHERE c.is_user = 0 AND l.status IN ('active','setup')
    ORDER BY l.id, c.reputation DESC
  `);
  if (!clubs.length) return send(sock, chatJid, `❌ Semua klub sudah dipilih!`);

  // Group by liga
  const grouped = {};
  for (const c of clubs) {
    if (!grouped[c.league_name]) grouped[c.league_name] = [];
    grouped[c.league_name].push(c);
  }

  // Kirim header dulu
  await send(sock, chatJid, `⚽ *PILIH TIM — @${senderJid.split('@')[0]}*\n_Pilih liga dan balas dengan nomor:_`);

  // Kirim per liga sebagai pesan terpisah supaya tidak terpotong
  let globalIdx = 1;
  for (const [lname, lclubs] of Object.entries(grouped)) {
    let msg = `*── ${lname} ──*\n`;
    for (const c of lclubs) {
      msg += `${globalIdx}. ${c.color} *${c.name}* ⭐${c.reputation} | 💰${formatMoney(c.transfer_budget)}\n`;
      globalIdx++;
    }
    await send(sock, chatJid, msg);
    await new Promise(r => setTimeout(r, 300));
  }

  setSession(senderJid, { state: 'choosing_team', league_id: league.id });
  await send(sock, chatJid, `_Balas nomor pilihanmu (1-${globalIdx - 1})_`);
}

async function handleTeamChoice(sock, chatJid, senderJid, raw) {
  // Ambil ulang semua klub tersedia
  const clubs = dbAll(`
    SELECT c.* FROM clubs c JOIN leagues l ON c.league_id = l.id
    WHERE c.is_user = 0 AND l.status IN ('active','setup')
    ORDER BY l.id, c.reputation DESC
  `);
  const idx = parseInt(raw.trim()) - 1;

  if (isNaN(idx) || idx < 0 || idx >= clubs.length)
    return send(sock, chatJid, `❌ Nomor tidak valid.`);

  const chosen = clubs[idx];
  dbRun(`UPDATE clubs SET is_user = 1, user_phone = ? WHERE id = ?`, senderJid, chosen.id);
  setSession(senderJid, { state: 'idle', club_id: chosen.id, league_id: chosen.league_id });

  // Init scouts & manager profile
  initDefaultScouts(chosen.id);
  getOrCreateManager(senderJid, senderJid.split('@')[0]);
  dbRun(`UPDATE managers SET current_club_id = ? WHERE phone = ?`, chosen.id, senderJid);

  // Init tactical familiarity untuk formasi default
  try {
    dbRun(`INSERT OR IGNORE INTO tactical_familiarity (club_id, formation, familiarity) VALUES (?, ?, 50)`,
      chosen.id, chosen.formation || '4-3-3');
  } catch (_) { }

  await send(sock, chatJid,
    `✅ *Selamat datang, Manajer!*\n\n${chosen.color} *${chosen.name}*\n⭐ Reputasi: ${chosen.reputation}/100\n💰 Budget Transfer: ${formatMoney(chosen.transfer_budget)}\n\nKetik *!timku* untuk lihat skuad, *!pemain* untuk skuad lengkap!`
  );
}

// ─── Start League ─────────────────────────────────────────────────────────────
async function handleStartLeague(sock, chatJid, senderJid, leagueName) {
  // Cari liga setup yang belum dimulai (prioritas: yang ada user daftarnya)
  const league = dbGet(`
    SELECT l.* FROM leagues l
    WHERE l.status IN ('setup','active')
    ORDER BY
      (SELECT COUNT(*) FROM clubs WHERE league_id = l.id AND is_user = 1) DESC,
      l.id DESC
    LIMIT 1
  `);
  if (!league) return send(sock, chatJid, `❌ Belum ada liga. Ketik *!buatliga*`);
  if (league.status === 'active')
    return send(sock, chatJid, `⚠️ Liga *${league.name}* sudah berjalan! MD ${league.current_matchday}/${league.total_matchdays}`);

  const users = dbAll(`SELECT * FROM clubs WHERE league_id = ? AND is_user = 1`, league.id);
  if (!users.length) return send(sock, chatJid, `⚠️ Kamu harus *!daftar* dulu ke liga *${league.name}*!`);

  const total = setupLeague(league.id);
  let msg = `🏆 *${league.name} — MUSIM DIMULAI!*\n\n📅 ${total} matchday\n\n*Manajer:*\n`;
  for (const u of users) msg += `  👤 @${u.user_phone?.split('@')[0]} → ${u.color} ${u.name}\n`;
  msg += `\nKetik *!main* untuk mulai Matchday 1! ⚽`;
  await send(sock, chatJid, msg);
}


// ─── Buat Liga ────────────────────────────────────────────────────────────────
async function handleBuatLiga(sock, chatJid, senderJid, leagueName) {
  const existing = getActiveLeague() || dbGet(`SELECT * FROM leagues ORDER BY id DESC LIMIT 1`);

  if (existing && existing.status === 'active') {
    return send(sock, chatJid, `⚠️ Liga *${existing.name}* sudah aktif!\nKetik *!daftar* untuk bergabung.`);
  }
  if (existing && existing.status === 'setup') {
    const clubCount = dbGet(`SELECT COUNT(*) as c FROM clubs WHERE league_id = ?`, existing.id)?.c || 0;
    return send(sock, chatJid,
      `✅ Liga *${existing.name}* sudah ada (${clubCount} klub).\nKetik *!daftar* untuk pilih tim, lalu *!mulai*`);
  }

  await send(sock, chatJid, `⏳ Membuat liga & generate pemain...`);

  dbRun(`INSERT INTO leagues (name, country, status) VALUES (?, 'Indonesia', 'setup')`, leagueName);
  const league = dbGet(`SELECT * FROM leagues ORDER BY id DESC LIMIT 1`);

  const clubs = [
    { name: 'Garuda FC', short: 'GAR', city: 'Jakarta', rep: 85, color: '🔴', budget: 80000000 },
    { name: 'Singa Malaya', short: 'SIN', city: 'Medan', rep: 80, color: '🔵', budget: 65000000 },
    { name: 'Elang Timur', short: 'ELA', city: 'Surabaya', rep: 78, color: '🟡', budget: 55000000 },
    { name: 'Rajawali Utara', short: 'RAJ', city: 'Bandung', rep: 76, color: '🟢', budget: 50000000 },
    { name: 'Harimau Selatan', short: 'HAR', city: 'Makassar', rep: 74, color: '⚫', budget: 45000000 },
    { name: 'Badak Barat', short: 'BAD', city: 'Banten', rep: 72, color: '⚪', budget: 40000000 },
    { name: 'Naga Kencana', short: 'NAG', city: 'Semarang', rep: 70, color: '🟠', budget: 35000000 },
    { name: 'Kuda Besi', short: 'KUD', city: 'Yogyakarta', rep: 68, color: '🟣', budget: 30000000 },
    { name: 'Merak Biru', short: 'MER', city: 'Palembang', rep: 66, color: '🔶', budget: 25000000 },
    { name: 'Pendekar Banten', short: 'PEN', city: 'Serang', rep: 64, color: '🔷', budget: 22000000 },
    { name: 'Cobra Borneo', short: 'COB', city: 'Balikpapan', rep: 62, color: '🌕', budget: 20000000 },
    { name: 'Paus Ambon', short: 'PAU', city: 'Ambon', rep: 60, color: '💜', budget: 18000000 },
    { name: 'Panther Bali', short: 'PAN', city: 'Denpasar', rep: 71, color: '❤️', budget: 32000000 },
    { name: 'Banteng Jogja', short: 'BAN', city: 'Yogyakarta', rep: 69, color: '💙', budget: 28000000 },
    { name: 'Wulung Selat', short: 'WUL', city: 'Batam', rep: 65, color: '💚', budget: 23000000 },
    { name: 'Tapak Kalimantan', short: 'TAP', city: 'Pontianak', rep: 63, color: '💛', budget: 21000000 },
    { name: 'Srikandi Maluku', short: 'SRI', city: 'Ternate', rep: 58, color: '🖤', budget: 15000000 },
    { name: 'Bintang Papua', short: 'BIN', city: 'Jayapura', rep: 56, color: '🤍', budget: 12000000 },
  ];

  const positions = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST', 'ST', 'CB', 'LW'];
  const FN = ['Arya', 'Bagas', 'Rizky', 'Dimas', 'Naufal', 'Raka', 'Faiz', 'Hafizh', 'Yusuf', 'Dafa',
    'Hendra', 'Wahyu', 'Andi', 'Rendi', 'Galih', 'Irfan', 'Taufik', 'Eko', 'Bima', 'Satria'];
  const LN = ['Pratama', 'Putra', 'Santoso', 'Wijaya', 'Setiawan', 'Nugroho', 'Maulana',
    'Ramadhan', 'Haikal', 'Alfarizi', 'Hidayat', 'Kurniawan', 'Firmansyah', 'Prabowo', 'Saputra'];

  for (const c of clubs) {
    dbRun(`INSERT INTO clubs (league_id,name,short_name,city,country,color,reputation,balance,transfer_budget,wage_budget,formation,tactic_style) VALUES (?,?,?,?,'Indonesia',?,?,?,?,?,'4-3-3','balanced')`,
      league.id, c.name, c.short, c.city, c.color, c.rep, c.budget, c.budget, Math.floor(c.budget * 0.015));

    const clubId = dbGet(`SELECT id FROM clubs WHERE league_id = ? AND name = ?`, league.id, c.name)?.id;
    if (!clubId) continue;

    for (let i = 0; i < 15; i++) {
      const pos = positions[i % positions.length];
      const base = c.rep - 12 + Math.floor(Math.random() * 20);
      const name = `${FN[Math.floor(Math.random() * FN.length)]} ${LN[Math.floor(Math.random() * LN.length)]}`;
      const personalities = ['Leader', 'Ambitious', 'Loyal', 'Mercenary', 'Troublemaker', 'Professional'];
      const traits = ['Free-Kick Specialist', 'Dribbler', 'Poacher', 'Playmaker', 'Anchor', 'None', 'None', 'None'];
      const ppers = personalities[Math.floor(Math.random() * personalities.length)];
      const ptrait = traits[Math.floor(Math.random() * traits.length)];
      dbRun(`INSERT INTO players (club_id,name,position,age,overall,potential,nationality,wage,contract_end,form,morale,fatigue,condition,personality,playstyle_trait) VALUES (?,?,?,?,?,?,'Indonesia',?,?,70,75,0,100,?,?)`,
        clubId, name, pos,
        19 + Math.floor(Math.random() * 14),
        Math.min(88, Math.max(52, base)),
        Math.min(93, Math.max(55, base + Math.floor(Math.random() * 13))),
        Math.max(3000, base * 900),
        new Date().getFullYear() + 1 + Math.floor(Math.random() * 4),
        ppers, ptrait
      );
    }
  }
  // ── Seed Rivalries (Derby) ──
  const rivalryPairs = [
    ['Garuda FC', 'Singa Malaya', 'Derby Nusantara', 100],
    ['Elang Timur', 'Rajawali Utara', 'Derby Jawa', 90],
    ['Harimau Selatan', 'Panther Bali', 'Derby Pulau', 80],
    ['Naga Kencana', 'Banteng Jogja', 'Derby Tengah', 85],
    ['Badak Barat', 'Pendekar Banten', 'Derby Banten', 75],
    ['Cobra Borneo', 'Tapak Kalimantan', 'Derby Kalimantan', 80],
    ['Srikandi Maluku', 'Paus Ambon', 'Derby Timur', 70],
  ];
  for (const [n1, n2, rname, intensity] of rivalryPairs) {
    const c1 = dbGet(`SELECT id FROM clubs WHERE league_id = ? AND name = ?`, league.id, n1);
    const c2 = dbGet(`SELECT id FROM clubs WHERE league_id = ? AND name = ?`, league.id, n2);
    if (c1 && c2) {
      dbRun(`INSERT OR IGNORE INTO rivalries (club_id_1, club_id_2, rivalry_name, intensity) VALUES (?, ?, ?, ?)`,
        c1.id, c2.id, rname, intensity);
    }
  }

  const total = dbGet(`SELECT COUNT(*) as c FROM players WHERE club_id IN (SELECT id FROM clubs WHERE league_id = ?)`, league.id)?.c || 0;
  await send(sock, chatJid,
    `🏆 *${leagueName} BERHASIL DIBUAT!*\n\n✅ 18 klub Liga Indonesia\n✅ ${total} pemain\n⚔️ 7 rivalitas klasik\n\n*Cara mulai:*\n1️⃣ *!daftar* → pilih tim\n2️⃣ *!mulai* → mulai musim\n3️⃣ *!main* → main!`
  );
}

// ─── Play Match ───────────────────────────────────────────────────────────────
async function handlePlayMatch(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `@${senderJid.split('@')[0]} ❌ Belum daftar! Ketik *!daftar*`);

  const league = getActiveLeague();
  if (!league) return send(sock, chatJid, `❌ Belum ada liga aktif.`);

  // Cek scout reports dulu
  const newReports = processScoutReports(club.id, league.current_matchday);
  if (newReports.length > 0) {
    await send(sock, chatJid, formatScoutReportNotif(newReports));
  }

  const md = processMatchday(league.id);
  if (!md) return send(sock, chatJid, `❌ Gagal proses matchday.`);

  const myMatch = dbGet(`
    SELECT * FROM matches WHERE league_id = ? AND matchday = ?
    AND (home_club_id = ? OR away_club_id = ?)
  `, league.id, league.current_matchday, club.id, club.id);

  if (!myMatch) return send(sock, chatJid, `ℹ️ Tidak ada pertandinganmu MD ini.`);
  if (myMatch.status === 'completed')
    return send(sock, chatJid, `✅ Sudah main MD ${league.current_matchday}! Ketik *!next*`);

  const isHome = myMatch.home_club_id === club.id;
  const opponent = getClub(isHome ? myMatch.away_club_id : myMatch.home_club_id);

  // Fitness warning
  const tired = dbAll(`SELECT name FROM players WHERE club_id = ? AND fatigue >= 75`, club.id);
  let warningMsg = '';
  if (tired.length > 0) {
    warningMsg = `\n⚠️ *Peringatan Fitness:* ${tired.slice(0, 3).map(p => p.name).join(', ')} dalam kondisi kelelahan! Pertimbangkan rotasi (*!rotasi*)\n`;
  }

  // Pre-match press conf
  const press = preMatchPress(club, opponent);
  setSession(senderJid, {
    state: 'press_conf',
    state_data: JSON.stringify({ matchId: myMatch.id, clubId: club.id, isHome }),
  });
  await send(sock, chatJid,
    `📢 *MATCHDAY ${league.current_matchday}*\n${isHome ? '🏠 HOME' : '✈️ AWAY'}: *${club.name}* vs *${opponent?.name}*${warningMsg}\n\n${press.prompt}`
  );
}

// ─── Press Conference ─────────────────────────────────────────────────────────
async function handlePressResponse(sock, chatJid, senderJid, raw, data) {
  const club = getClub(data.clubId);
  clearSessionState(senderJid);

  if (raw.toLowerCase() !== 'skip') {
    const msg = applyPreMatchPress(raw, club);
    await send(sock, chatJid, msg);
  }

  await new Promise(r => setTimeout(r, 400));
  const result = startUserMatch(data.matchId, data.clubId);
  if (!result) return send(sock, chatJid, `❌ Error memulai pertandingan.`);
  await sendMatchProgress(sock, chatJid, senderJid, result, getClub(data.clubId));
}

// ─── Match Progress ───────────────────────────────────────────────────────────
async function sendMatchProgress(sock, chatJid, senderJid, result, club) {
  // Send key events
  if (result.events?.length > 0) {
    const key = result.events.filter(e => ['goal', 'own_goal', 'red', 'injury'].includes(e.type));
    if (key.length > 0) {
      await send(sock, chatJid, `⚽ *LIVE*\n${key.slice(-5).map(e => `  ${e.minute}' ${e.text}`).join('\n')}`);
    }
  }

  if (result.done) {
    await send(sock, chatJid, result.report);
    await finishMatchFlow(sock, chatJid, senderJid, result, club);
    return;
  }

  const isHT = result.isHalftime || result.decisionPoint?.type === 'halftime';
  const subsLeft = result.subsLeft || 5;

  let prompt;
  if (isHT) {
    const updClub = getClub(club.id);
    const isHome = result.state?.isHome;
    prompt = halftimeTeamTalk(updClub, result.hScore, result.aScore, isHome);
    setSession(senderJid, {
      state: 'halftime_talk',
      state_data: JSON.stringify({ matchState: result.state, clubId: club.id }),
    });
  } else {
    prompt = formatDecisionPrompt(result.decisionPoint, result.userPlayers, subsLeft, club?.tactic_style);
    setSession(senderJid, {
      state: 'match_decision',
      state_data: JSON.stringify({ matchState: result.state, decisionPoint: result.decisionPoint, clubId: club.id }),
    });
  }

  const isHome = result.state?.isHome;
  const myScore = isHome ? result.hScore : result.aScore;
  const opScore = isHome ? result.aScore : result.hScore;
  await send(sock, chatJid, `📊 Skor: *${result.hScore}-${result.aScore}* | Menit ${result.state?.minute || '?'}\n\n${prompt}`);
}

// ─── Match Decision ───────────────────────────────────────────────────────────
async function handleMatchDecision(sock, chatJid, senderJid, raw, data) {
  const { matchState, decisionPoint, clubId } = data;
  const club = getClub(clubId);
  clearSessionState(senderJid);

  const changes = applyDecision(decisionPoint, raw, matchState);
  let state = { ...matchState };
  if (changes.tacticChange && changes.tacticChange !== 'request') {
    if (state.isHome) state.homeTactic = changes.tacticChange;
    else state.awayTactic = changes.tacticChange;
  }
  state.pendingDecision = null;

  const r = simulateUntilDecision({ ...state, minute: state.minute, maxMinute: state.half === 1 ? 45 : 90 });

  if (state.half === 1 && r.state !== 'fulltime') {
    const htTalk = halftimeTeamTalk(club, r.hScore, r.aScore, state.isHome);
    setSession(senderJid, {
      state: 'halftime_talk',
      state_data: JSON.stringify({ matchState: { ...state, homeScore: r.hScore, awayScore: r.aScore, half: 1.5, minute: 45, maxMinute: 90, allEvents: [...(state.allEvents || []), ...(r.events || [])] }, clubId }),
    });
    return send(sock, chatJid, `📊 Skor babak 1: *${r.hScore}-${r.aScore}*\n\n${htTalk}`);
  }

  const allEvents = [...(state.allEvents || []), ...(r.events || [])];
  if (r.decisionPoint) {
    const prompt = formatDecisionPrompt(r.decisionPoint, state.isHome ? state.homePlayers : state.awayPlayers, state.homeSubsLeft, club?.tactic_style);
    setSession(senderJid, {
      state: 'match_decision',
      state_data: JSON.stringify({ matchState: { ...state, homeScore: r.hScore, awayScore: r.aScore, minute: r.minute, allEvents }, decisionPoint: r.decisionPoint, clubId }),
    });
    return send(sock, chatJid, `📊 Skor: *${r.hScore}-${r.aScore}*\n\n${prompt}`);
  }

  await finalizeMatch(sock, chatJid, senderJid, state, r, allEvents, clubId);
}

// ─── Halftime Talk ────────────────────────────────────────────────────────────
async function handleHalftimeTalk(sock, chatJid, senderJid, raw, data) {
  const { matchState, clubId } = data;
  const club = getClub(clubId);
  clearSessionState(senderJid);

  if (raw !== 'skip' && raw !== '6') {
    const msg = applyHalftimeTeamTalk(raw, club, matchState.homeScore, matchState.awayScore, matchState.isHome);
    await send(sock, chatJid, `${msg}\n\n▶️ *Babak 2 dimulai...*`);
  }

  const state2 = { ...matchState, minute: 45, maxMinute: 90, half: 2 };
  const r2 = simulateUntilDecision(state2);
  const allEvents = [...(matchState.allEvents || []), ...(r2.events || [])];

  const goals = r2.events?.filter(e => e.type === 'goal' || e.type === 'own_goal') || [];
  if (goals.length) await send(sock, chatJid, goals.map(e => `  ${e.minute}' ${e.text}`).join('\n'));

  if (r2.decisionPoint && r2.state !== 'fulltime') {
    const prompt = formatDecisionPrompt(r2.decisionPoint, matchState.isHome ? matchState.homePlayers : matchState.awayPlayers, matchState.homeSubsLeft, club?.tactic_style);
    setSession(senderJid, {
      state: 'match_decision',
      state_data: JSON.stringify({
        matchState: { ...state2, homeScore: r2.hScore, awayScore: r2.aScore, minute: r2.minute, allEvents },
        decisionPoint: r2.decisionPoint, clubId,
      }),
    });
    return send(sock, chatJid, `📊 Skor: *${r2.hScore}-${r2.aScore}*\n\n${formatDecisionPrompt(r2.decisionPoint, matchState.isHome ? matchState.homePlayers : matchState.awayPlayers, matchState.homeSubsLeft, club?.tactic_style)}`);
  }

  await finalizeMatch(sock, chatJid, senderJid, state2, r2, allEvents, clubId);
}

// ─── Finalize Match ───────────────────────────────────────────────────────────
async function finalizeMatch(sock, chatJid, senderJid, state, result, allEvents, clubId) {
  const match = dbGet(`SELECT * FROM matches WHERE id = ?`, state.matchId);
  const homeClub = getClub(match?.home_club_id);
  const awayClub = getClub(match?.away_club_id);
  const league = getLeague(state.leagueId);

  dbRun(`UPDATE matches SET home_score=?, away_score=?, status='completed', match_log=?, played_at=datetime('now') WHERE id=?`,
    result.hScore, result.aScore, JSON.stringify(allEvents), state.matchId);

  if (match) applyStandings(state.leagueId, match.home_club_id, match.away_club_id, result.hScore, result.aScore);

  const { updatePlayerStats } = await import('../engine/match.js');
  updatePlayerStats(allEvents, state.homePlayers, state.awayPlayers);

  const { applyMatchFatigue, applyMatchdayRecovery } = await import('../engine/stamina.js');
  applyMatchFatigue(match?.home_club_id, buildMinMap(state.homePlayers));
  applyMatchFatigue(match?.away_club_id, buildMinMap(state.awayPlayers));

  const { updateTacticalFamiliarity } = await import('../engine/scouting.js');
  const club = getClub(clubId);
  updateTacticalFamiliarity(clubId, club?.formation || '4-3-3');

  const report = homeClub && awayClub
    ? formatMatchReport(homeClub, awayClub, result.hScore, result.aScore, allEvents, league?.current_matchday || 1)
    : `Skor: ${result.hScore}-${result.aScore}`;

  await send(sock, chatJid, report);

  // Manager reputation update
  const isHome = state.isHome;
  const myScore = isHome ? result.hScore : result.aScore;
  const opScore = isHome ? result.aScore : result.hScore;
  const repDelta = myScore > opScore ? 3 : myScore === opScore ? 1 : -2;
  updateManagerReputation(senderJid, repDelta);

  // Post-match interview
  setSession(senderJid, {
    state: 'post_match',
    state_data: JSON.stringify({ hScore: result.hScore, aScore: result.aScore, isHome, clubId }),
  });
  const updClub = getClub(clubId);
  const opp = getClub(isHome ? match?.away_club_id : match?.home_club_id);
  await send(sock, chatJid, postMatchInterview(updClub, result.hScore, result.aScore, isHome, opp || { name: 'Lawan' }));
}

async function finishMatchFlow(sock, chatJid, senderJid, result, club) {
  // Post-match interview
  const league = getActiveLeague();
  const myMatch = dbGet(`SELECT * FROM matches WHERE league_id = ? AND matchday = ? AND (home_club_id = ? OR away_club_id = ?) AND status = 'completed' ORDER BY id DESC LIMIT 1`,
    league?.id, league?.current_matchday, club.id, club.id);
  const isHome = myMatch?.home_club_id === club.id;

  setSession(senderJid, {
    state: 'post_match',
    state_data: JSON.stringify({ hScore: result.hScore, aScore: result.aScore, isHome, clubId: club.id }),
  });
  const repDelta = (isHome ? result.hScore > result.aScore : result.aScore > result.hScore) ? 3 : -1;
  updateManagerReputation(senderJid, repDelta);
  await send(sock, chatJid, postMatchInterview(club, result.hScore, result.aScore, isHome, { name: 'Lawan' }));
}

async function handlePostMatchResponse(sock, chatJid, senderJid, raw, data) {
  const club = getClub(data.clubId);
  clearSessionState(senderJid);
  if (raw.toLowerCase() !== 'skip') {
    const isWin = data.isHome ? data.hScore > data.aScore : data.aScore > data.hScore;
    const msg = applyPostMatchInterview(raw, club, isWin);
    await send(sock, chatJid, msg);
  }
  const league = getActiveLeague();
  if (league) {
    const adv = tryAdvanceMatchday(league.id);
    if (adv === 'finished') {
      const clubs = getLeagueClubs(league.id);
      const champ = clubs[0];
      recordManagerHistory(senderJid, club.id, league.season || 1, `${club.points} poin`);
      if (champ?.id === club.id) {
        updateManagerReputation(senderJid, 15);
        await send(sock, chatJid, `🏆 *SELAMAT! KAMU JUARA ${league.name}!*\n+15 reputasi manajer!\n\n${formatStandings(league.id)}`);
      } else {
        await send(sock, chatJid, `🏁 *Musim selesai!* Ketik *!klasemen* untuk lihat hasil akhir.\nKetik *!manajer* untuk lihat profilmu.`);
      }
    } else if (adv === 'advanced') {
      const updated = getLeague(league.id);
      await send(sock, chatJid, `\n✅ *Matchday ${updated.current_matchday}* siap! Ketik *!main*`);
    }
  }
}

function buildMinMap(players) {
  const m = {};
  for (const p of (players || [])) if (p?.id) m[p.id] = 90;
  return m;
}

// ─── Transfer Handlers ────────────────────────────────────────────────────────
async function handleSearch(sock, chatJid, senderJid, query) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const players = searchPlayers(query, club.id);
  if (!players.length) return send(sock, chatJid, `🔍 Tidak ada hasil untuk "${query}"`);

  // Cek apakah sudah di-scout (PA terlihat)
  const scoutedIds = dbAll(`SELECT player_id, revealed_potential FROM scouted_players WHERE club_id = ?`, club.id)
    .reduce((m, r) => { m[r.player_id] = r.revealed_potential; return m; }, {});

  let msg = `🔍 *HASIL CARI: "${query}"*\n\n`;
  players.slice(0, 10).forEach((p, i) => {
    const pa = scoutedIds[p.id] ? ` PA:~${scoutedIds[p.id]}` : ` PA:❓ (scout dulu)`;
    msg += `${i + 1}. *${p.name}* (${p.position}) ⭐${p.overall}${pa}\n   🏟️${p.club_name} | 💰${formatMoney(p.market_value)} | 💵${formatMoney(p.wage)}/mgg\n`;
  });
  msg += `\n_!beli [nama] untuk tawar | !scout [nama] untuk kirim scout_`;
  await send(sock, chatJid, msg);
}

async function handleBuy(sock, chatJid, senderJid, args) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);

  // Cek apakah ada angka di akhir (fee)
  const lastArg = args[args.length - 1];
  const feeArg = /^\d+(\.\d+)?[MKm]?$/.test(lastArg) ? args.pop() : null;
  const query = args.join(' ');

  const players = searchPlayers(query, club.id);
  if (!players.length) return send(sock, chatJid, `❌ Pemain tidak ditemukan: "${query}"`);
  const p = players[0];

  if (feeArg) {
    // Langsung tawar dengan fee yang disebutkan
    const fee = parseMoney(feeArg);
    const result = makeOffer(club.id, p.id, fee, Math.floor(p.market_value * 0.0005));
    return send(sock, chatJid, result.msg);
  }

  // Tanya berapa fee-nya
  const suggested = Math.floor(p.market_value * 0.92);
  setSession(senderJid, {
    state: 'buying_player',
    state_data: JSON.stringify({ playerId: p.id, suggestedFee: suggested, clubId: club.id }),
  });
  await send(sock, chatJid,
    `💼 *PENAWARAN — ${p.name}*\n\n${p.position} ⭐${p.overall} | Usia ${p.age}\n🏟️ ${p.club_name}\n💰 Nilai pasar: ${formatMoney(p.market_value)}\n\nMasukkan fee penawaran (contoh: 45 atau 45M)\n_Budgetmu: ${formatMoney(club.transfer_budget)}_`
  );
}

async function handleBuyOffer(sock, chatJid, senderJid, raw, data) {
  clearSessionState(senderJid);
  const fee = parseMoney(raw);
  const wage = Math.floor((getPlayer(data.playerId)?.wage || 50000) * 1.1);
  const result = makeOffer(data.clubId, data.playerId, fee, wage);
  await send(sock, chatJid, result.msg);
}

async function handleSell(sock, chatJid, senderJid, args) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const name = args.join(' ');
  const players = dbAll(`SELECT * FROM players WHERE club_id = ? AND name LIKE ?`, club.id, `%${name}%`);
  if (!players.length) return send(sock, chatJid, `❌ Pemain tidak ditemukan: "${name}"`);
  await send(sock, chatJid, sellPlayer(club.id, players[0].id).msg);
}

async function handleLoan(sock, chatJid, senderJid, args) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const name = args.join(' ');
  const players = dbAll(`SELECT * FROM players WHERE club_id = ? AND name LIKE ?`, club.id, `%${name}%`);
  if (!players.length) return send(sock, chatJid, `❌ Pemain tidak ditemukan: "${name}"`);
  await send(sock, chatJid, loanPlayer(club.id, players[0].id).msg);
}

async function handleFreeAgents(sock, chatJid, senderJid) {
  const fas = getFreeAgents();
  if (!fas.length) return send(sock, chatJid, `ℹ️ Tidak ada free agent saat ini.`);
  let msg = `📋 *FREE AGENTS*\n\n`;
  fas.slice(0, 10).forEach((p, i) => { msg += `${i + 1}. *${p.name}* (${p.position}) ⭐${p.overall} Usia ${p.age}\n   💵 Gaji: ${formatMoney(p.wage)}/mgg\n`; });
  msg += `\n_!beli [nama] untuk rekrut_`;
  await send(sock, chatJid, msg);
}

// ─── Fitness ──────────────────────────────────────────────────────────────────
async function handleFitness(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  await send(sock, chatJid, formatFitnessReport(club.id));
}

async function handleRotasi(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  await send(sock, chatJid, formatRotationAdvice(club.id));
}

// ─── Scouting ────────────────────────────────────────────────────────────────
async function handleScoutMenu(sock, chatJid, senderJid) {
  const regions = Object.entries(SCOUT_REGIONS)
    .map(([k, v], i) => `${i + 1}. *${v.name}* — ${formatMoney(v.cost)} (${v.duration} MD)`)
    .join('\n');

  await send(sock, chatJid,
    `🔭 *SCOUTING MENU*\n\n*Scout Wilayah:*\n${regions}\n\n*Scout Pemain Spesifik:*\n!scout [nama pemain]\n\n*Scout Wilayah:*\n!scout region [1-${Object.keys(SCOUT_REGIONS).length}]\n\n_Laporan selesai dalam beberapa matchday. Ketik !laporanscout_`
  );
}

async function handleSendScout(sock, chatJid, senderJid, args) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const league = getActiveLeague();
  if (!league) return send(sock, chatJid, `❌ Belum ada liga aktif.`);

  if (args[0]?.toLowerCase() === 'region') {
    const idx = parseInt(args[1]) - 1;
    const regionKey = Object.keys(SCOUT_REGIONS)[idx];
    if (!regionKey) return send(sock, chatJid, `❌ Region tidak valid. Ketik *!scout* untuk daftar.`);
    const result = sendScout(club.id, 'region', regionKey, league.current_matchday);
    return send(sock, chatJid, result.msg);
  }

  // Scout pemain spesifik
  const query = args.join(' ');
  const players = searchPlayers(query, club.id);
  if (!players.length) return send(sock, chatJid, `❌ Pemain tidak ditemukan: "${query}"`);
  const result = sendScout(club.id, 'player', players[0].id, league.current_matchday);
  await send(sock, chatJid, result.msg);
}

async function handleScoutReports(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const league = getActiveLeague();

  const reports = dbAll(`
    SELECT sa.*, sc.name as scout_name
    FROM scouting_assignments sa JOIN scouts sc ON sa.scout_id = sc.id
    WHERE sa.club_id = ? ORDER BY sa.complete_matchday DESC LIMIT 10
  `, club.id);

  if (!reports.length) return send(sock, chatJid, `🔭 Belum ada laporan scout. Kirim scout dulu dengan *!scout*`);

  let msg = `🔭 *LAPORAN SCOUT*\n\n`;
  for (const r of reports) {
    const status = r.status === 'scouting'
      ? `⏳ Selesai MD ${r.complete_matchday}`
      : `✅ Selesai`;
    msg += `${r.scout_name}: ${r.target_region || `Player ID ${r.target_player_id}`} — ${status}\n`;
    if (r.status === 'complete' && r.report) {
      const rep = JSON.parse(r.report);
      if (rep.name) {
        msg += `  👤 *${rep.name}* (${rep.position}) Usia ${rep.age}\n`;
        msg += `  ⭐ Overall: ~${rep.revOverall} | PA: ~${rep.revPA}\n`;
        msg += `  ${rep.notes?.split('\n')[0] || ''}\n`;
      } else if (rep.found) {
        msg += `  Ditemukan ${rep.found.length} talent\n`;
      }
    }
    msg += '\n';
  }
  msg += `_Ketik !scoutedpemain untuk daftar lengkap pemain yang sudah di-scout_`;
  await send(sock, chatJid, msg);
}

async function handleScoutedPlayers(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);

  const scouted = dbAll(`
    SELECT sp.*, p.name, p.position, p.age, p.nationality, p.market_value, c.name as club_name
    FROM scouted_players sp
    JOIN players p ON sp.player_id = p.id
    JOIN clubs c ON p.club_id = c.id
    WHERE sp.club_id = ?
    ORDER BY sp.revealed_potential DESC
  `, club.id);

  if (!scouted.length) return send(sock, chatJid, `🔭 Belum ada pemain yang di-scout.`);

  let msg = `🔭 *SHORTLIST SCOUT*\n\n`;
  scouted.slice(0, 12).forEach((p, i) => {
    const wk = p.age <= 21 && p.revealed_potential >= 78 ? ' 🌟WONDERKID' : '';
    msg += `${i + 1}. *${p.name}* (${p.position}) Usia ${p.age}${wk}\n`;
    msg += `   ⭐~${p.revealed_overall} | PA:~${p.revealed_potential} | 🏟️${p.club_name}\n`;
    msg += `   💰${formatMoney(p.market_value)}\n`;
  });
  msg += `\n_!beli [nama] untuk tawar_`;
  await send(sock, chatJid, msg);
}

function formatScoutReportNotif(reports) {
  let msg = `🔭 *LAPORAN SCOUT MASUK!*\n\n`;
  for (const r of reports) {
    msg += `📋 *${r.scoutName}* melaporkan:\n`;
    if (r.type === 'player' && r.report?.name) {
      const rep = r.report;
      const wk = rep.age <= 21 && rep.revPA >= 78 ? ' 🌟 WONDERKID!' : '';
      msg += `  *${rep.name}* (${rep.position}) Usia ${rep.age}${wk}\n`;
      msg += `  Overall: ~${rep.revOverall} | PA: ~${rep.revPA}\n`;
      msg += `  ${rep.notes?.split('\n')[0] || ''}\n\n`;
    } else if (r.type === 'region' && r.report?.found?.length > 0) {
      msg += `  Ditemukan ${r.report.found.length} talent di ${r.report.region}:\n`;
      for (const f of r.report.found.slice(0, 3)) {
        const wk = f.age <= 21 && f.revPA >= 78 ? ' 🌟' : '';
        msg += `  - ${f.name} (${f.position}) ~${f.revOverall}/PA:~${f.revPA}${wk}\n`;
      }
      msg += '\n';
    }
  }
  msg += `_Ketik !scoutedpemain untuk shortlist lengkap_`;
  return msg;
}

// ─── Youth Academy ────────────────────────────────────────────────────────────
async function handleYouth(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  await send(sock, chatJid, formatYouthAcademy(club.id));
}

async function handlePromote(sock, chatJid, senderJid, numStr) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const youths = dbAll(`SELECT * FROM youth_players WHERE club_id = ? AND promoted = 0 ORDER BY overall DESC`, club.id);
  const idx = parseInt(numStr) - 1;
  if (isNaN(idx) || idx < 0 || idx >= youths.length)
    return send(sock, chatJid, `❌ Nomor tidak valid.`);
  await send(sock, chatJid, promoteYouthPlayer(club.id, youths[idx].id).msg);
}

// ─── Manager Career ───────────────────────────────────────────────────────────
async function handleManagerProfile(sock, chatJid, senderJid) {
  const mgr = getOrCreateManager(senderJid);
  const club = mgr.current_club_id ? getClub(mgr.current_club_id) : null;
  const history = JSON.parse(mgr.history || '[]');

  let msg = `👔 *PROFIL MANAJER*\n\n`;
  msg += `📛 Nama: *${mgr.name || senderJid.split('@')[0]}*\n`;
  msg += `⭐ Reputasi: *${mgr.reputation}/100*\n`;
  msg += `🏟️ Klub Sekarang: *${club?.name || 'Tanpa Klub'}*\n`;
  msg += `📅 Musim Dikelola: ${mgr.seasons_managed}\n`;
  msg += `🏆 Trofi: ${mgr.trophies}\n\n`;

  const repLabel =
    mgr.reputation >= 80 ? '🌍 Manajer Kelas Dunia' :
      mgr.reputation >= 60 ? '🌟 Manajer Ternama' :
        mgr.reputation >= 40 ? '💪 Manajer Berpengalaman' :
          mgr.reputation >= 20 ? '📈 Manajer Potensial' : '🌱 Manajer Baru';
  msg += `Status: ${repLabel}\n\n`;

  if (history.length > 0) {
    msg += `📋 *Riwayat:*\n`;
    history.slice(-3).forEach(h => { msg += `  • Musim ${h.season}: ${h.result}\n`; });
  }

  msg += `\n_Ketik !lamarpekerjaan untuk lihat lowongan_`;
  await send(sock, chatJid, msg);
}

async function handleJobMenu(sock, chatJid, senderJid) {
  const mgr = getOrCreateManager(senderJid);
  const jobs = getAvailableJobs(mgr.reputation || 30);

  if (!jobs.length) return send(sock, chatJid, `ℹ️ Tidak ada lowongan saat ini.`);

  let msg = `💼 *LOWONGAN MANAJER*\n_Cocok untuk reputasimu (${mgr.reputation}/100)_\n\n`;
  jobs.slice(0, 8).forEach((c, i) => {
    msg += `${i + 1}. ${c.color} *${c.name}* (${c.league_name})\n`;
    msg += `   ⭐${c.reputation} | 💰${formatMoney(c.transfer_budget)}\n`;
  });
  msg += `\n_!lamar [nomor] untuk melamar_`;
  await send(sock, chatJid, msg);
}

async function handleApplyJob(sock, chatJid, senderJid, numStr) {
  const mgr = getOrCreateManager(senderJid);
  const jobs = getAvailableJobs(mgr.reputation || 30);
  const idx = parseInt(numStr) - 1;
  if (isNaN(idx) || idx < 0 || idx >= jobs.length)
    return send(sock, chatJid, `❌ Nomor tidak valid.`);

  const result = applyForJob(senderJid, jobs[idx].id);
  await send(sock, chatJid, result.msg);
}

// ─── Tactic Handlers ──────────────────────────────────────────────────────────
const FORMATIONS = ['4-3-3', '4-4-2', '3-5-2', '5-3-2', '4-2-3-1', '4-1-4-1', '3-4-3'];
const TACTIC_STYLES = {
  attacking: '⚔️ Menyerang total (+ATK, -DEF)',
  pressing: '🔥 High pressing (+INT, drain stamina)',
  balanced: '⚖️ Seimbang',
  counter: '🏃 Counter attack (-ATK, +DEF, cepat)',
  defensive: '🛡️ Bertahan ketat (-ATK, +DEF)',
};

async function handleTactic(sock, chatJid, senderJid, args) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  if (!args.length) return send(sock, chatJid, `⚙️ Formasi: ${FORMATIONS.join(' | ')}\n_Contoh: !formasi 4-3-3_`);

  const form = FORMATIONS.find(f => f === args[0] || f.replace(/-/g, '') === args[0].replace(/-/g, ''));
  if (!form) return send(sock, chatJid, `❌ Formasi tidak dikenal.`);

  const { getTacticalFamiliarity } = await import('../engine/scouting.js');
  const fam = getTacticalFamiliarity(club.id, form);
  updateClub(club.id, { formation: form });

  const famMsg = fam < 40
    ? `\n⚠️ Tim belum familiar dengan formasi ini (${fam}/100). Performa mungkin turun dulu.`
    : fam < 70
      ? `\n📊 Familiaritas tim: ${fam}/100`
      : `\n✅ Tim sudah sangat familiar (${fam}/100)`;

  await send(sock, chatJid, `✅ Formasi *${form}* diterapkan!${famMsg}`);
}

async function handleStyle(sock, chatJid, senderJid, style) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  if (!style) {
    return send(sock, chatJid, `⚽ *Gaya Bermain:*\n\n${Object.entries(TACTIC_STYLES).map(([k, v]) => `• *${k}* — ${v}`).join('\n')}\n\n_Contoh: !style attacking_`);
  }
  const key = Object.keys(TACTIC_STYLES).find(k => k === style.toLowerCase());
  if (!key) return send(sock, chatJid, `❌ Pilihan: ${Object.keys(TACTIC_STYLES).join(', ')}`);
  updateClub(club.id, { tactic_style: key });
  await send(sock, chatJid, `✅ Gaya bermain: *${key}* — ${TACTIC_STYLES[key]}`);
}

async function handleTacticInfo(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const fams = dbAll(`SELECT * FROM tactical_familiarity WHERE club_id = ? ORDER BY familiarity DESC`, club.id);
  let msg = `📊 *FAMILIARITAS TAKTIK — ${club.name}*\n\n`;
  if (!fams.length) {
    msg += `Belum ada data. Main dulu!`;
  } else {
    for (const f of fams) {
      const bar = '█'.repeat(Math.floor(f.familiarity / 10)) + '░'.repeat(10 - Math.floor(f.familiarity / 10));
      msg += `${f.formation.padEnd(8)} [${bar}] ${f.familiarity}/100 (${f.matches_played} match)\n`;
    }
  }
  msg += `\n_Familiarity naik +5 setiap pertandingan. Formasi baru mulai dari 20._`;
  await send(sock, chatJid, msg);
}

async function handleSetRole(sock, chatJid, senderJid, args) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);

  const playerName = args[0];
  if (!playerName) return send(sock, chatJid, `_Contoh: !role Saliba "Ball Playing Defender"_`);

  const players = dbAll(`SELECT * FROM players WHERE club_id = ? AND name LIKE ?`, club.id, `%${playerName}%`);
  if (!players.length) return send(sock, chatJid, `❌ Pemain tidak ditemukan.`);
  const p = players[0];

  const availRoles = PLAYER_ROLES[p.position] || [];
  if (!availRoles.length) return send(sock, chatJid, `❌ Tidak ada role untuk posisi ${p.position}`);

  // Kalau tidak ada role dipilih, tampilkan daftar
  const roleInput = args.slice(1).join(' ').replace(/"/g, '');
  if (!roleInput) {
    let msg = `🎭 *PILIH ROLE — ${p.name} (${p.position})*\n\n`;
    availRoles.forEach((r, i) => { msg += `${i + 1}. ${r}\n`; });
    msg += `\n_Contoh: !role ${p.name.split(' ')[0]} 1_`;
    return send(sock, chatJid, msg);
  }

  const idx = parseInt(roleInput) - 1;
  const role = !isNaN(idx) && idx >= 0 ? availRoles[idx] : availRoles.find(r => r.toLowerCase().includes(roleInput.toLowerCase()));
  if (!role) return send(sock, chatJid, `❌ Role tidak dikenal.`);

  dbRun(`UPDATE players SET role = ? WHERE id = ?`, role, p.id);

  const { ROLE_MODIFIERS } = await import('../engine/scouting.js');
  const mod = ROLE_MODIFIERS[role] || { att: 0, def: 0 };
  await send(sock, chatJid,
    `🎭 *${p.name}* sekarang bermain sebagai *${role}*\n` +
    `⚔️ ATK Bonus: ${mod.att >= 0 ? '+' : ''}${Math.round(mod.att * 100)}% | 🛡️ DEF Bonus: ${mod.def >= 0 ? '+' : ''}${Math.round(mod.def * 100)}%`
  );
}

// ─── Player Talk ──────────────────────────────────────────────────────────────
// Cooldown: setiap pemain hanya bisa diajak bicara 1x per matchday
// Disimpan di tabel player_talk_log (club_id, player_id, matchday)

async function handlePlayerTalk(sock, chatJid, senderJid, name) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const players = dbAll(`SELECT * FROM players WHERE club_id = ? AND name LIKE ?`, club.id, `%${name}%`);
  if (!players.length) return send(sock, chatJid, `❌ Pemain tidak ditemukan: "${name}"`);
  const p = players[0];

  // Pastikan tabel log ada
  dbRun(`CREATE TABLE IF NOT EXISTS player_talk_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    club_id INTEGER, player_id INTEGER, matchday INTEGER,
    UNIQUE(club_id, player_id, matchday)
  )`);

  // Cek cooldown: sudah bicara di matchday ini?
  const league = getActiveLeague();
  const md = league?.current_matchday || 1;
  const alreadyTalked = dbGet(
    `SELECT id FROM player_talk_log WHERE club_id = ? AND player_id = ? AND matchday = ?`,
    club.id, p.id, md
  );

  if (alreadyTalked) {
    return send(sock, chatJid,
      `⏳ *Sudah bicara dengan ${p.name} hari ini!*\n\n` +
      `Kamu hanya bisa bicara dengan pemain yang sama *1x per matchday*.\n` +
      `Bicara lagi setelah MD ${md + 1}.`
    );
  }

  setSession(senderJid, { state: 'player_talk', state_data: JSON.stringify({ playerId: p.id }) });
  await send(sock, chatJid, formatPlayerTalkMenu(p));
}

async function handlePlayerTalkChoice(sock, chatJid, senderJid, raw, data) {
  clearSessionState(senderJid);
  const player = getPlayer(data.playerId);
  if (!player) return send(sock, chatJid, `❌ Pemain tidak ditemukan.`);

  const club   = getClubByPhone(senderJid);
  const league = getActiveLeague();
  const md     = league?.current_matchday || 1;
  const morale = player.morale || 70;

  // ── Opsi 5: Perpanjangan Kontrak (benar-benar update DB) ───────────────────
  if (raw === '5') {
    // Morale tinggi = pemain lebih loyal, minta kenaikan lebih kecil
    // Morale rendah = pemain tidak betah, minta lebih banyak atau tolak sama sekali
    if (morale < 30) {
      // Pemain terlalu tidak senang, tolak perpanjangan
      try { dbRun(`INSERT OR IGNORE INTO player_talk_log (club_id, player_id, matchday) VALUES (?, ?, ?)`, club?.id, player.id, md); } catch (_) {}
      return send(sock, chatJid,
        `😤 *${player.name} menolak perpanjangan kontrak!*\n\n` +
        `Morale terlalu rendah (${morale}/100). Dia tidak betah di tim ini.\n` +
        `Coba perbaiki suasana tim dulu dengan *!harmony* atau perbanyak menit bermainnya.`
      );
    }

    // Kenaikan gaji dipengaruhi overall + morale
    // Morale tinggi (≥75): minta lebih sedikit | Morale rendah (<50): minta lebih banyak
    const baseRaise   = player.overall >= 80 ? 0.20 : player.overall >= 75 ? 0.15 : 0.10;
    const moraleBonus = morale >= 75 ? -0.03 : morale < 50 ? +0.05 : 0; // loyal = diskon, tidak betah = premium
    const raisePercent  = Math.max(0.05, baseRaise + moraleBonus);
    const contractYears = player.overall >= 80 ? 3 : 2;
    const newWage       = Math.floor((player.wage || 50000) * (1 + raisePercent));
    const wageDiff      = newWage - (player.wage || 50000);
    const newContractEnd = (player.contract_end || new Date().getFullYear()) + contractYears;

    if (club && club.wage_budget < wageDiff) {
      try { dbRun(`INSERT OR IGNORE INTO player_talk_log (club_id, player_id, matchday) VALUES (?, ?, ?)`, club.id, player.id, md); } catch (_) {}
      return send(sock, chatJid,
        `❌ *Perpanjangan Kontrak Gagal!*\n\n` +
        `${player.name} minta kenaikan gaji *${formatMoney(wageDiff)}/mgg*,\n` +
        `tapi wage budget sisa hanya *${formatMoney(club.wage_budget)}/mgg*.\n\n` +
        `Jual pemain lain dulu untuk menambah wage budget.`
      );
    }

    // Eksekusi perpanjangan
    dbRun(`UPDATE players SET contract_end = ?, wage = ?, morale = MIN(100, morale + 12) WHERE id = ?`,
      newContractEnd, newWage, player.id);
    if (club) dbRun(`UPDATE clubs SET wage_budget = wage_budget - ? WHERE id = ?`, wageDiff, club.id);
    try { dbRun(`INSERT OR IGNORE INTO player_talk_log (club_id, player_id, matchday) VALUES (?, ?, ?)`, club?.id, player.id, md); } catch (_) {}

    const updated     = getPlayer(player.id);
    const moraleStars = '⭐'.repeat(Math.min(5, Math.ceil((updated?.morale || 70) / 20)));
    const moraleNote  = morale >= 75
      ? `_(Loyal, minta kenaikan lebih kecil)_`
      : morale < 50
        ? `_(Tidak betah, minta kenaikan lebih besar)_`
        : '';
    return send(sock, chatJid,
      `🤝 *KONTRAK DIPERPANJANG!*\n\n` +
      `📋 *${player.name}* resmi tanda tangan!\n\n` +
      `📅 Kontrak baru: hingga *${newContractEnd}* (+${contractYears} tahun)\n` +
      `💵 Gaji baru: *${formatMoney(newWage)}/mgg* (+${Math.round(raisePercent * 100)}%) ${moraleNote}\n\n` +
      `Morale sekarang: ${moraleStars} (${updated?.morale || 70}/100)`
    );
  }

  // ── Opsi 1-4: Efek morale standar ─────────────────────────────────────────
  // Morale awal juga mempengaruhi seberapa besar efeknya
  // Pemain yang sudah happy (morale tinggi) kurang responsif terhadap pujian
  // Pemain yang sedang down (morale rendah) lebih responsif
  const responsiveness = morale >= 85 ? 0.7 : morale <= 40 ? 1.3 : 1.0;

  const effects = {
    '1': { morale: Math.round(10 * responsiveness), msg: `🌟 ${player.name} senang dipuji! Morale naik.` },
    '2': { morale: Math.round(8  * responsiveness), msg: `💰 ${player.name} termotivasi! Tapi ekspektasi gaji naik.` },
    '3': { morale: Math.round(5  * responsiveness), msg: `📋 ${player.name} paham perannya di tim.` },
    '4': { morale: Math.round(-8 * responsiveness), msg: `⚠️ ${player.name} tidak senang tapi termotivasi buktikan diri.` },
  };
  const e = effects[raw] || { morale: 0, msg: `💬 Pembicaraan selesai.` };

  dbRun(`UPDATE players SET morale = MIN(100, MAX(10, morale + ?)) WHERE id = ?`, e.morale, player.id);
  if (club) {
    try { dbRun(`INSERT OR IGNORE INTO player_talk_log (club_id, player_id, matchday) VALUES (?, ?, ?)`, club.id, player.id, md); } catch (_) {}
  }

  const updated     = getPlayer(player.id);
  const moraleStars = '⭐'.repeat(Math.min(5, Math.ceil((updated?.morale || 70) / 20)));
  const delta       = e.morale >= 0 ? `+${e.morale}` : `${e.morale}`;
  await send(sock, chatJid, `${e.msg}\n\nMorale: ${moraleStars} (${updated?.morale || 70}/100) [${delta}]`);
}

// ─── Info Handlers ────────────────────────────────────────────────────────────
async function handleNext(sock, chatJid, senderJid) {
  const league = getActiveLeague();
  if (!league) return send(sock, chatJid, `❌ Belum ada liga aktif.`);
  const adv = tryAdvanceMatchday(league.id);
  if (adv === 'finished') {
    await send(sock, chatJid, `🏁 *MUSIM SELESAI!*\n\n${formatStandings(league.id)}`);
  } else if (adv === 'advanced') {
    const updated = getLeague(league.id);
    await send(sock, chatJid, `✅ *Matchday ${updated.current_matchday}* siap! Ketik *!main*`);

    // Mid-season development notification (MD 17)
    if (updated.current_matchday === 18) {
      const club = getClubByPhone(senderJid);
      if (club) {
        const developed = dbAll(`SELECT name, overall FROM players WHERE club_id = ? ORDER BY overall DESC LIMIT 3`, club.id);
        await send(sock, chatJid, `📊 *EVALUASI PARUH MUSIM!*\n\nPemain berkembang telah dikalkulasikan.\nKetik *!pemain* untuk lihat update overall.`);
      }
    }
  } else {
    const pending = dbAll(`SELECT COUNT(*) as c FROM matches WHERE league_id = ? AND matchday = ? AND status != 'completed'`, league.id, league.current_matchday);
    await send(sock, chatJid, `⏳ Masih ada ${pending[0]?.c || '?'} pertandingan belum selesai.`);
  }
}

async function handleSchedule(sock, chatJid) {
  const league = getActiveLeague();
  if (!league) return send(sock, chatJid, `❌ Belum ada liga aktif.`);
  await send(sock, chatJid, formatSchedule(league.id, league.current_matchday));
}

async function handleMyTeam(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const gd = (club.gf || 0) - (club.ga || 0);
  const mgr = getOrCreateManager(senderJid);
  let msg = `${club.color} *${club.name}*\n${'─'.repeat(28)}\n`;
  msg += `🏟️ ${club.stadium}\n`;
  msg += `⚙️ Formasi: *${club.formation}* | 🎮 Style: *${club.tactic_style}*\n`;
  msg += `💊 Morale: ${'█'.repeat(Math.ceil((club.morale || 70) / 20))}${'░'.repeat(5 - Math.ceil((club.morale || 70) / 20))} ${club.morale || 70}/100\n`;
  msg += `👔 Manajer Rep: ${mgr.reputation}/100\n\n`;
  msg += `📊 M${club.played} W${club.won} D${club.drawn} L${club.lost} | GD:${gd >= 0 ? '+' : ''}${gd} | *${club.points}pts*\n\n`;
  msg += `💰 Transfer: ${formatMoney(club.transfer_budget)} | 💵 Wage: ${formatMoney(club.wage_budget)}/mgg`;
  await send(sock, chatJid, msg);
}

async function handleSquad(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const players = getClubPlayers(club.id);
  if (!players.length) return send(sock, chatJid, `❌ Skuad kosong.`);
  const posOrder = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'CF', 'ST'];
  const grouped = {};
  for (const p of players) { if (!grouped[p.position]) grouped[p.position] = []; grouped[p.position].push(p); }
  let msg = `👥 *SKUAD — ${club.name}*\n\n`;
  for (const pos of posOrder) {
    if (!grouped[pos]) continue;
    for (const p of grouped[pos]) {
      const cond = Math.max(20, 100 - (p.fatigue || 0));
      const condE = cond >= 85 ? '🟢' : cond >= 65 ? '🟡' : '🔴';
      const inj = p.injury_until ? ' 🚑' : '';
      const role = p.role ? ` [${p.role.substring(0, 10)}]` : '';
      msg += `${pos.padEnd(3)} ${p.name.padEnd(20)} ⭐${p.overall} ${condE}${cond}%${inj}${role}\n`;
    }
  }
  msg += `\n🟢=Segar 🟡=Lelah 🔴=Kelelahan 🚑=Cedera`;
  await send(sock, chatJid, msg);
}

async function handleFinance(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  await send(sock, chatJid, formatFinanceSummary(club.id));
}

async function handleTopScorer(sock, chatJid) {
  const league = getActiveLeague();
  if (!league) return send(sock, chatJid, `❌ Belum ada liga aktif.`);
  const scorers = dbAll(`SELECT p.name, p.goals, p.assists, c.name as cn, c.color as cc FROM players p JOIN clubs c ON p.club_id = c.id WHERE c.league_id = ? AND p.goals > 0 ORDER BY p.goals DESC, p.assists DESC LIMIT 10`, league.id);
  if (!scorers.length) return send(sock, chatJid, `📊 Belum ada gol.`);
  let msg = `⚽ *TOP SCORER*\n\n`;
  scorers.forEach((p, i) => { msg += `${i + 1}. *${p.name}* — ${p.cc}${p.cn}\n   ⚽ ${p.goals} | 🎯 ${p.assists}\n`; });
  await send(sock, chatJid, msg);
}

async function handleInjuries(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const injured = dbAll(`SELECT * FROM players WHERE club_id = ? AND injury_until IS NOT NULL`, club.id);
  if (!injured.length) return send(sock, chatJid, `✅ Tidak ada cedera saat ini!`);
  let msg = `🚑 *CEDERA — ${club.name}*\n\n`;
  for (const p of injured) msg += `  *${p.name}* (${p.position}) — ${p.injury_type}\n  Kembali: ${p.injury_until}\n\n`;
  await send(sock, chatJid, msg);
}

async function handleContracts(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const expiring = dbAll(`SELECT * FROM players WHERE club_id = ? AND contract_end <= ? ORDER BY overall DESC`, club.id, new Date().getFullYear() + 1);
  if (!expiring.length) return send(sock, chatJid, `✅ Tidak ada kontrak yang segera habis.`);
  let msg = `📋 *KONTRAK HAMPIR HABIS*\n\n`;
  for (const p of expiring) msg += `  ⚠️ *${p.name}* (${p.position}) ⭐${p.overall} — Habis: ${p.contract_end}\n`;
  msg += `\n_!bicara [nama] untuk negosiasi_`;
  await send(sock, chatJid, msg);
}

async function handleInfo(sock, chatJid) {
  const league = getActiveLeague();
  if (!league) return send(sock, chatJid, `ℹ️ Belum ada liga aktif.`);
  const users = dbAll(`SELECT * FROM clubs WHERE league_id = ? AND is_user = 1`, league.id);
  let msg = `ℹ️ *${league.name}*\n📅 MD ${league.current_matchday}/${league.total_matchdays}\n🟢 Aktif\n\n👤 *User:*\n`;
  for (const u of users) msg += `  ${u.color} ${u.name} — @${u.user_phone?.split('@')[0]} — ${u.points}pts\n`;
  await send(sock, chatJid, msg);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function getActiveLid() {
  return (getActiveLeague())?.id || 0;
}

function parseMoney(str) {
  const s = String(str).toLowerCase().replace(/[^0-9.mk]/g, '');
  if (s.endsWith('m')) return Math.floor(parseFloat(s) * 1_000_000);
  if (s.endsWith('k')) return Math.floor(parseFloat(s) * 1_000);
  return Math.floor(parseFloat(s) * (parseFloat(s) < 1000 ? 1_000_000 : 1));
}

// ─── Menu ─────────────────────────────────────────────────────────────────────
async function sendMenu(sock, chatJid) {
  // Kirim per bagian agar tidak terpotong WhatsApp
  const sections = [
    `⚽ *FOOTBALL MANAGER v2* ⚽
${'═'.repeat(32)}
*🎮 PERTANDINGAN*
!main            — Main pertandingan liga
!mainpiala       — Main pertandingan piala
!next / !lanjut  — Lanjut ke matchday berikutnya`,

    `*📊 INFO TIM*
!klasemen        — Klasemen liga
!jadwal          — Jadwal matchday saat ini
!timku           — Info tim & statistik
!pemain          — Skuad lengkap + kondisi stamina
!topscorer       — Top scorer & assist
!cedera          — Daftar pemain cedera
!kontrak         — Kontrak pemain mau habis
!info            — Status liga`,

    `*💪 STAMINA & TAKTIK*
!fitness         — Laporan kondisi stamina tim
!rotasi          — Rekomendasi lineup optimal
!formasi [f]     — Ubah formasi (4-3-3, 4-4-2, dst)
!style [s]       — Gaya bermain (attacking/pressing/balanced/counter/defensive)
!taktikinfo      — Tingkat familiaritas tiap formasi
!role [nama]     — Set player role spesifik
!setpiece        — Lihat & set specialist set piece
!kapten          — Tunjuk kapten tim
!cuaca           — Prediksi kondisi pertandingan`,

    `*💰 TRANSFER & KEUANGAN*
!cari [nama]     — Cari pemain (PA tersembunyi sebelum di-scout)
!beli [nama]     — Tawar / beli pemain
!beli [nama] [fee] — Tawar langsung, contoh: !beli Saka 80M
!jual [nama]     — Jual pemain ke AI klub
!pinjam [nama]   — Pinjamkan pemain (wage split 50%)
!freeagent       — Daftar pemain bebas kontrak
!keuangan        — Budget transfer, wage & saldo
!keuangandetail  — Laporan keuangan lengkap + log transaksi
!upgrade [tipe]  — Upgrade stadium/academy/training`,

    `*🔭 SCOUTING*
!scout           — Menu scouting & daftar region
!scout [nama]    — Scout pemain spesifik (gratis)
!scout region [n]— Scout wilayah (temukan wonderkid)
!laporanscout    — Status semua penugasan scout
!scoutedpemain   — Shortlist pemain sudah di-scout`,

    `*🏫 YOUTH ACADEMY*
!youth           — Lihat pemain di youth academy
!promosi [n]     — Promosikan youth ke first team`,

    `*🏆 PIALA & KOMPETISI*
!piala           — Status bracket piala domestik
!mainpiala       — Main pertandingan piala`,

    `*👥 SQUAD & MANAJEMEN*
!harmony         — Laporan squad harmony & bench warmer
!tawaranai       — Lihat tawaran AI klub untuk pemainmu
!tolak [nama]    — Tolak tawaran AI untuk pemain tertentu
!bicara [nama]   — Bicara dengan pemain (morale)`,

    `*📋 BOARD & KARIR*
!board           — Ekspektasi board & kepercayaan direksi
!manajer         — Profil manajer + reputasi + riwayat
!lamarpekerjaan  — Daftar lowongan klub yang tersedia
!lamar [n]       — Lamar ke klub tertentu`,

    `*🤝 SPONSOR & STAF*
!sponsor         — Lihat/pilih sponsor musim ini
!staf            — Lihat backroom staff
!rekrutstaf [role] — Rekrut staf (physio/assistant/coach_attack/coach_defense/coach_fitness)
!pemaindetail [nama] — Detail kepribadian & gaya bermain pemain
!derby           — Lihat daftar rivalitas liga`,

    `*⚙️ SETUP*
!daftar          — Pilih tim (awal game)
!mulai           — Mulai musim liga
!buatliga        — Buat liga baru (tanpa data Kaggle)
!menu            — Tampilkan menu ini
${'═'.repeat(32)}
_FM v2 | Next-Level Edition_`,
  ];

  for (const s of sections) {
    await send(sock, chatJid, s.trim());
    await new Promise(r => setTimeout(r, 250));
  }
}

// ─── Board Handlers ───────────────────────────────────────────────────────────
async function handleBoard(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const league = getActiveLeague();
  if (!league) return send(sock, chatJid, `❌ Belum ada liga.`);

  // Generate board targets jika belum ada
  const existing = dbGet(`SELECT * FROM board_targets WHERE club_id = ?`, club.id);
  if (!existing) {
    const { generateBoardTargets } = await import('../engine/board.js');
    generateBoardTargets(club.id, league.id);
  }

  await send(sock, chatJid, formatBoardReport(club.id, league.id));
}

// ─── Finance Detail ───────────────────────────────────────────────────────────
async function handleDetailFinance(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  await send(sock, chatJid, formatDetailedFinance(club.id));
}

// ─── Upgrade Facilities ───────────────────────────────────────────────────────
async function handleUpgrade(sock, chatJid, senderJid, type) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  if (!type) {
    return send(sock, chatJid, `⚒️ *UPGRADE FASILITAS*\nPilihan:\n- !upgrade stadium (Kapasitas tiket)\n- !upgrade academy (Stat pemain muda)\n- !upgrade training (Stat pemain muda)\n\n_Contoh: !upgrade stadium_`);
  }
  const result = upgradeFacility(club.id, type.toLowerCase());
  await send(sock, chatJid, result.msg);
}

// ─── Squad Harmony ────────────────────────────────────────────────────────────
async function handleHarmony(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  await send(sock, chatJid, formatSquadHarmonyReport(club.id));
}

async function handleCaptain(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const cap = assignCaptain(club.id);
  if (!cap) return send(sock, chatJid, `❌ Tidak ada pemain tersedia.`);
  await send(sock, chatJid,
    `🎗️ *${cap.name}* ditunjuk sebagai kapten!\n${cap.position} | ⭐${cap.overall} | Morale: ${cap.morale || 70}`
  );
}

// ─── Set Piece ────────────────────────────────────────────────────────────────
async function handleSetPiece(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  assignSetPieceSpecialists(club.id);
  await send(sock, chatJid, formatSetPieceSpec(club.id));
}

// ─── Cup Handlers ─────────────────────────────────────────────────────────────
async function handleCupStatus(sock, chatJid, senderJid) {
  const league = getActiveLeague();
  if (!league) return send(sock, chatJid, `❌ Belum ada liga aktif.`);
  const club = getClubByPhone(senderJid);

  // Cek apakah ada cup, kalau belum buat
  const existingCup = dbGet(`SELECT * FROM cups WHERE league_id = ? AND status = 'active'`, league.id);
  if (!existingCup) {
    setupDomesticCup(league.id);
    await send(sock, chatJid, `🏆 *Piala Domestik* telah dibuat! Babak pertama di MD 5.\n\nKetik *!piala* lagi untuk lihat status.`);
    return;
  }

  let msg = formatCupBracket(league.id);

  // Tampilkan pertandingan piala user
  if (club) {
    const myMatch = dbGet(`
      SELECT m.*, hc.name as home_name, ac.name as away_name
      FROM matches m
      JOIN clubs hc ON m.home_club_id = hc.id
      JOIN clubs ac ON m.away_club_id = ac.id
      WHERE m.competition IN ('cup','champions','europa')
        AND (m.home_club_id = ? OR m.away_club_id = ?)
        AND m.status = 'scheduled'
      ORDER BY m.matchday LIMIT 1
    `, club.id, club.id);

    if (myMatch) {
      const opp = myMatch.home_club_id === club.id ? myMatch.away_name : myMatch.home_name;
      msg += `\n👤 *Pertandinganmu berikutnya:*\nvs ${opp} (MD ${myMatch.matchday})\nKetik *!mainpiala* saat matchday tiba`;
    } else {
      // Cek apakah sudah tereliminasi
      const eliminated = dbGet(`
        SELECT ce.* FROM cup_entries ce
        JOIN cups c ON ce.cup_id = c.id
        WHERE c.league_id = ? AND ce.club_id = ? AND ce.status = 'eliminated'
      `, league.id, club.id);
      if (eliminated) msg += `\n❌ Tim kamu sudah tereliminasi dari piala.`;
    }
  }

  await send(sock, chatJid, msg);
}

async function handlePlayCup(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const league = getActiveLeague();
  if (!league) return send(sock, chatJid, `❌ Belum ada liga aktif.`);

  const myMatch = dbGet(`
    SELECT * FROM matches
    WHERE competition IN ('cup','champions','europa')
      AND (home_club_id = ? OR away_club_id = ?)
      AND status = 'scheduled'
    ORDER BY matchday LIMIT 1
  `, club.id, club.id);

  if (!myMatch) return send(sock, chatJid, `❌ Tidak ada pertandingan piala yang dijadwalkan saat ini.`);
  if (myMatch.matchday > league.current_matchday)
    return send(sock, chatJid, `⏳ Pertandingan piala di MD ${myMatch.matchday}. Sekarang masih MD ${league.current_matchday}.`);

  // Pakai flow yang sama dengan liga
  const isHome = myMatch.home_club_id === club.id;
  const opponent = getClub(isHome ? myMatch.away_club_id : myMatch.home_club_id);

  // Generate weather conditions
  const conditions = generateMatchConditions();
  const weatherMsg = `🌤️ Kondisi: ${formatMatchConditions(conditions)}`;

  const { preMatchPress } = await import('../engine/press.js');
  const press = preMatchPress(club, opponent);

  setSession(senderJid, {
    state: 'press_conf',
    state_data: JSON.stringify({ matchId: myMatch.id, clubId: club.id, isHome, isCup: true }),
  });

  const cupInfo = myMatch.competition === 'cup' ? '🏆 PIALA DOMESTIK' :
    myMatch.competition === 'champions' ? '⭐ CHAMPIONS LEAGUE' : '🟠 EUROPA LEAGUE';

  await send(sock, chatJid,
    `${cupInfo}\n${isHome ? '🏠 HOME' : '✈️ AWAY'}: *${club.name}* vs *${opponent?.name}*\n${weatherMsg}\n\n${press.prompt}`
  );
}

// ─── AI Approaches ────────────────────────────────────────────────────────────
async function handleAIApproaches(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const league = getActiveLeague();

  const approaches = checkAIApproaches(club.id, league?.id || 0);
  if (!approaches.length) return send(sock, chatJid, `✅ Tidak ada pendekatan dari AI klub saat ini.`);

  for (const ap of approaches) {
    // Save to DB
    dbRun(`INSERT OR IGNORE INTO ai_approaches (player_id, from_club_id, to_club_id, offer_fee, offer_wage) VALUES (?,?,?,?,?)`,
      ap.player.id, ap.fromClub.id, club.id, ap.fee, ap.offerWage);
    await send(sock, chatJid, formatAIApproach(ap));
  }
}

async function handleRejectApproach(sock, chatJid, senderJid, playerName) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);

  const players = dbAll(`SELECT * FROM players WHERE club_id = ? AND name LIKE ?`, club.id, `%${playerName}%`);
  if (!players.length) return send(sock, chatJid, `❌ Pemain tidak ditemukan.`);
  const p = players[0];

  dbRun(`UPDATE ai_approaches SET status = 'rejected' WHERE player_id = ? AND to_club_id = ?`, p.id, club.id);

  // Player happy to stay = morale boost
  dbRun(`UPDATE players SET morale = MIN(100, morale + 5) WHERE id = ?`, p.id);
  await send(sock, chatJid, `✅ Tawaran untuk *${p.name}* ditolak.\n${p.name} senang tinggal! Morale +5 🙂`);
}

// ─── Weather ──────────────────────────────────────────────────────────────────
async function handleWeather(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  const conditions = generateMatchConditions();

  await send(sock, chatJid,
    `🌤️ *KONDISI PERTANDINGAN BERIKUTNYA*\n\n` +
    `Cuaca: ${conditions.weather.name}\n` +
    `Lapangan: ${conditions.pitch.name}\n\n` +
    `Efek:\n` +
    `  📐 Passing: ${Math.round(conditions.weather.passMod * 100)}%\n` +
    `  🎯 Dribbling: ${Math.round(conditions.weather.dribMod * 100)}%\n` +
    `  💪 Stamina drain: ${Math.round(conditions.weather.fatMod * 100)}%`
  );
}

// ─── Update handlePlayMatch to show weather & board check ─────────────────────
// (These are appended as separate named exports so we can call from handlePlayMatch)
export async function notifyBoardAndWeather(sock, chatJid, senderJid, clubId, leagueId) {
  // Board firing check
  const mgr = getOrCreateManager(senderJid);
  const fired = checkManagerFiring(senderJid, clubId, leagueId);
  if (fired?.fired) {
    clearSessionState(senderJid);
    return send(sock, chatJid, fired.msg);
  }

  // Low confidence warning
  if (fired && fired.confidence < 35) {
    await send(sock, chatJid,
      `⚠️ *PERINGATAN BOARD!*\nKepercayaan board hanya ${fired.confidence}/100.\nHasil negatif berikutnya bisa membuatmu dipecat!`
    );
  }

  // AI approaches check
  const approaches = checkAIApproaches(clubId, leagueId);
  if (approaches.length > 0) {
    for (const ap of approaches) {
      dbRun(`INSERT OR IGNORE INTO ai_approaches (player_id, from_club_id, to_club_id, offer_fee, offer_wage) VALUES (?,?,?,?,?)`,
        ap.player.id, ap.fromClub.id, clubId, ap.fee, ap.offerWage);
    }
    await send(sock, chatJid,
      `💼 *${approaches.length} tawaran AI masuk!* Ketik *!tawaranai* untuk lihat.`
    );
  }

  return null; // no firing
}

// ─── Sponsor Handlers ─────────────────────────────────────────────────────────
async function handleSponsor(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);

  // Cek apakah sudah punya sponsor aktif
  const active = getActiveSponsor(club.id);
  if (active) {
    return send(sock, chatJid, formatActiveSponsor(club.id));
  }

  // Generate sponsor offers
  const offers = generateSponsorOffers(club.id);
  setSession(senderJid, {
    state: 'choosing_sponsor',
    state_data: JSON.stringify({ offers, clubId: club.id }),
  });
  await send(sock, chatJid, formatSponsorOffers(offers));
}

async function handleSponsorChoice(sock, chatJid, senderJid, raw, data) {
  clearSessionState(senderJid);
  const idx = parseInt(raw) - 1;
  if (isNaN(idx) || idx < 0 || idx >= data.offers.length) {
    return send(sock, chatJid, `❌ Pilihan tidak valid. Ketik *!sponsor* untuk coba lagi.`);
  }
  const chosen = data.offers[idx];
  const msg = activateSponsor(data.clubId, chosen);
  await send(sock, chatJid, msg);
}

// ─── Staff Handlers ───────────────────────────────────────────────────────────
async function handleStaff(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);
  await send(sock, chatJid, formatStaffReport(club.id));
}

async function handleHireStaff(sock, chatJid, senderJid, args) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);

  const role = args[0]?.toLowerCase();
  if (!role) return send(sock, chatJid, `❌ Gunakan: *!rekrutstaf [role]*\nPilihan: physio, assistant, coach_attack, coach_defense, coach_fitness`);

  const menu = formatHireMenu(club.id, role);
  setSession(senderJid, {
    state: 'hiring_staff',
    state_data: JSON.stringify({ role, clubId: club.id }),
  });
  await send(sock, chatJid, menu);
}

async function handleHireStaffChoice(sock, chatJid, senderJid, raw, data) {
  clearSessionState(senderJid);
  const idx = parseInt(raw) - 1;
  if (isNaN(idx) || idx < 0) {
    return send(sock, chatJid, `❌ Pilihan tidak valid.`);
  }
  const result = hireStaff(data.clubId, data.role, idx);
  await send(sock, chatJid, result.msg);
}

// ─── Player Detail (Personality & Playstyle Trait) ────────────────────────────
async function handlePlayerDetail(sock, chatJid, senderJid, query) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);

  const player = dbGet(`SELECT * FROM players WHERE club_id = ? AND name LIKE ?`, club.id, `%${query}%`);
  if (!player) return send(sock, chatJid, `❌ Pemain tidak ditemukan: "${query}"`);

  const personalityEmoji = {
    'Leader': '👑', 'Ambitious': '🔥', 'Loyal': '💙',
    'Mercenary': '💰', 'Troublemaker': '⚡', 'Professional': '📋',
  };
  const traitEmoji = {
    'Free-Kick Specialist': '🎯', 'Dribbler': '💨', 'Poacher': '🦊',
    'Playmaker': '🧠', 'Anchor': '⚓', 'None': '—',
  };

  const pe = personalityEmoji[player.personality] || '❓';
  const te = traitEmoji[player.playstyle_trait] || '—';

  let msg = `👤 *DETAIL PEMAIN — ${player.name}*\n${'─'.repeat(30)}\n\n`;
  msg += `📍 Posisi: ${player.position} | Usia: ${player.age}\n`;
  msg += `⭐ Overall: ${player.overall} | PA: ${player.potential}\n`;
  msg += `💵 Gaji: ${formatMoney(player.wage)}/mgg\n`;
  msg += `💰 Nilai: ${formatMoney(player.market_value)}\n\n`;
  msg += `🧬 *Kepribadian:* ${pe} ${player.personality || 'Unknown'}\n`;
  msg += `⚽ *Gaya Bermain:* ${te} ${player.playstyle_trait || 'None'}\n\n`;
  msg += `📊 *Statistik Musim Ini:*\n`;
  msg += `  ⚽ Gol: ${player.goals || 0}\n`;
  msg += `  🅰️ Assist: ${player.assists || 0}\n`;
  msg += `  📅 Penampilan: ${player.appearances || 0}\n`;
  msg += `  🟡 Kartu Kuning: ${player.yellow_cards || 0}\n`;
  msg += `  🟥 Kartu Merah: ${player.red_cards || 0}\n\n`;
  msg += `💪 Form: ${player.form || 70} | 😊 Morale: ${player.morale || 70}\n`;
  msg += `🏃 Fatigue: ${player.fatigue || 0}% | 🤕 Injury Prone: ${player.injury_proneness || 50}\n`;

  if (player.injury_until) {
    msg += `\n🚑 *CEDERA:* ${player.injury_type} — pulih ${player.injury_until}\n`;
  }

  await send(sock, chatJid, msg);
}

// ─── Derby Info ───────────────────────────────────────────────────────────────
async function handleDerbyInfo(sock, chatJid, senderJid) {
  const club = getClubByPhone(senderJid);
  if (!club) return send(sock, chatJid, `❌ Belum daftar!`);

  const rivalries = dbAll(`
    SELECT r.*, c1.name as club1_name, c1.color as club1_color,
      c2.name as club2_name, c2.color as club2_color
    FROM rivalries r
    JOIN clubs c1 ON r.club_id_1 = c1.id
    JOIN clubs c2 ON r.club_id_2 = c2.id
    WHERE r.club_id_1 IN (SELECT id FROM clubs WHERE league_id = ?)
    ORDER BY r.intensity DESC
  `, club.league_id);

  if (!rivalries.length) return send(sock, chatJid, `ℹ️ Tidak ada rivalitas terdaftar di liga ini.`);

  let msg = `⚔️ *DAFTAR RIVALITAS LIGA*\n${'─'.repeat(30)}\n\n`;
  for (const r of rivalries) {
    const isMyDerby = r.club_id_1 === club.id || r.club_id_2 === club.id;
    const marker = isMyDerby ? ' ← TIM KAMU!' : '';
    const fire = r.intensity >= 90 ? '🔥🔥🔥' : r.intensity >= 75 ? '🔥🔥' : '🔥';
    msg += `${fire} *${r.rivalry_name}*${marker}\n`;
    msg += `   ${r.club1_color} ${r.club1_name} vs ${r.club2_color} ${r.club2_name}\n`;
    msg += `   Intensitas: ${r.intensity}/100\n\n`;
  }
  msg += `_Laga derby memiliki efek: Kartu 2x lipat, energi lebih tinggi!_`;
  await send(sock, chatJid, msg);
}
