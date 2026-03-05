// src/engine/squad.js — Squad Harmony, Captain, International Break, Weather, AI Transfers

import { dbGet, dbAll, dbRun, getClub, getPlayer, updatePlayer, updateClub } from '../db/database.js';
import { formatMoney, makeOffer, searchPlayers, calculateMarketValue } from './transfer.js';

// ═══════════════════════════════════════════════════════════════════
// SQUAD HARMONY
// ═══════════════════════════════════════════════════════════════════

export function updateSquadHarmony(clubId) {
  const players = dbAll(`SELECT * FROM players WHERE club_id = ? ORDER BY overall DESC`, clubId);
  const club = getClub(clubId);
  if (!players.length) return 70;

  // Faktor 1: Bench warmer morale
  const starters = players.slice(0, 11);
  const bench = players.slice(11);

  for (const p of bench) {
    // Pemain bench dengan overall tinggi merasa tidak dihargai, DENGAN MEMPERHITUNGKAN PROFESSIONALISM
    const ovDiff = (p.overall || 65) - (starters[10]?.overall || 60);
    const prof = p.professionalism || 50;

    // Low professionalism = gampang ngambek. High prof = lebih sabar.
    const patience = Math.floor(prof / 20); // 0-5 patience multiplier

    if (ovDiff > 8 && (p.appearances || 0) <= patience) {
      // Bench warmer unhappy
      const dropAmount = 15 - Math.floor(prof / 10); // Prof rendah drop lebih banyak
      const newMorale = Math.max(10, (p.morale || 70) - dropAmount);
      dbRun(`UPDATE players SET morale = ? WHERE id = ?`, newMorale, p.id);
    }
  }

  // Faktor 2: Banyak kebangsaan = harmony lebih rendah sedikit
  const nationalities = new Set(players.map(p => p.nationality));
  const natPenalty = Math.min(15, (nationalities.size - 5) * 1.5);

  // Faktor 3: Rata-rata morale tim
  const avgMorale = Math.round(players.reduce((s, p) => s + (p.morale || 70), 0) / players.length);

  const harmony = Math.max(20, Math.min(100, avgMorale - natPenalty));
  dbRun(`UPDATE clubs SET morale = ? WHERE id = ?`, harmony, clubId);
  return harmony;
}

// ─── Captain System ───────────────────────────────────────────────────────────
export function assignCaptain(clubId) {
  // Kapten = pemain dengan morale + overall tertinggi + appearances terbanyak
  const players = dbAll(`
    SELECT * FROM players WHERE club_id = ? AND injury_until IS NULL
    ORDER BY (morale * 0.3 + overall * 0.4 + appearances * 0.3) DESC LIMIT 1
  `, clubId);

  if (!players.length) return null;

  const captain = players[0];
  dbRun(`UPDATE clubs SET captain_id = ? WHERE id = ?`, captain.id, clubId);
  dbRun(`UPDATE players SET is_captain = 1 WHERE id = ?`, captain.id);
  dbRun(`UPDATE players SET is_captain = 0 WHERE club_id = ? AND id != ?`, clubId, captain.id);

  return captain;
}

export function getCaptainBonus(clubId) {
  const club = getClub(clubId);
  const captain = club?.captain_id ? getPlayer(club.captain_id) : null;
  if (!captain) return 1.0;

  // Kapten dengan morale tinggi memberi boost ke tim
  const captainMorale = captain.morale || 70;
  if (captainMorale >= 85) return 1.05;
  if (captainMorale >= 70) return 1.02;
  if (captainMorale <= 40) return 0.97;
  return 1.0;
}

// ─── Bench Warmer Report ──────────────────────────────────────────────────────
export function getBenchWarmers(clubId) {
  const league = dbGet(`SELECT * FROM leagues l JOIN clubs c ON c.league_id = l.id WHERE c.id = ?`, clubId);
  const md = league?.current_matchday || 1;
  if (md < 5) return [];

  return dbAll(`
    SELECT * FROM players
    WHERE club_id = ? AND appearances <= 3 AND overall >= 72
    ORDER BY overall DESC
  `, clubId);
}

export function formatSquadHarmonyReport(clubId) {
  const club = getClub(clubId);
  const players = dbAll(`SELECT * FROM players WHERE club_id = ? ORDER BY overall DESC`, clubId);
  const harmony = club?.morale || 70;
  const captain = club?.captain_id ? getPlayer(club.captain_id) : null;
  const warmers = getBenchWarmers(clubId);

  const harmonyBar = '█'.repeat(Math.floor(harmony / 10)) + '░'.repeat(10 - Math.floor(harmony / 10));
  const harmonyEmoji = harmony >= 75 ? '🟢' : harmony >= 50 ? '🟡' : '🔴';

  let msg = `👥 *SQUAD HARMONY — ${club?.name}*\n\n`;
  msg += `${harmonyEmoji} Keselarasan: [${harmonyBar}] ${harmony}/100\n\n`;

  if (captain) {
    msg += `🎗️ Kapten: *${captain.name}* (${captain.position}) Morale: ${captain.morale || 70}\n\n`;
  }

  if (warmers.length > 0) {
    msg += `⚠️ *Bench Warmer Tidak Bahagia:*\n`;
    for (const w of warmers.slice(0, 4)) {
      msg += `  😤 ${w.name} (${w.position}) ⭐${w.overall} — ${w.appearances || 0} penampilan\n`;
    }
    msg += `_Mainkan atau jual mereka sebelum morale drop parah_\n\n`;
  }

  const happy = players.filter(p => (p.morale || 70) >= 75).length;
  const neutral = players.filter(p => (p.morale || 70) >= 50 && (p.morale || 70) < 75).length;
  const unhappy = players.filter(p => (p.morale || 70) < 50).length;

  msg += `😊 Bahagia: ${happy} | 😐 Netral: ${neutral} | 😤 Tidak Puas: ${unhappy}`;
  return msg;
}

// ═══════════════════════════════════════════════════════════════════
// INTERNATIONAL BREAK
// ═══════════════════════════════════════════════════════════════════

// International break terjadi di MD 9 dan MD 25
export const INTL_BREAK_MATCHDAYS = [9, 25];

export function processInternationalBreak(leagueId, matchday) {
  if (!INTL_BREAK_MATCHDAYS.includes(matchday)) return null;

  const clubs = dbAll(`SELECT * FROM clubs WHERE league_id = ?`, leagueId);
  const callups = [];
  const injuries = [];

  for (const club of clubs) {
    const players = dbAll(`SELECT * FROM players WHERE club_id = ? AND overall >= 72`, club.id);

    for (const p of players) {
      // Peluang dipanggil timnas: pemain overall 72+ dari negara aktif
      if (Math.random() < 0.15) {
        callups.push({ player: p, club: club.name });

        // 8% chance cedera saat international duty
        if (Math.random() < 0.08) {
          const injDuration = 7 + Math.floor(Math.random() * 14);
          const until = new Date();
          until.setDate(until.getDate() + injDuration);
          dbRun(`UPDATE players SET injury_until = ?, injury_type = ? WHERE id = ?`,
            until.toISOString().split('T')[0], 'Cedera Timnas', p.id);
          injuries.push({ player: p, days: injDuration });
        }

        // Fatigue naik karena perjalanan internasional
        const newFatigue = Math.min(100, (p.fatigue || 0) + 20);
        dbRun(`UPDATE players SET fatigue = ? WHERE id = ?`, newFatigue, p.id);
      }
    }
  }

  return { matchday, callups, injuries };
}

export function formatIntlBreakReport(breakResult, userClubId) {
  if (!breakResult) return null;

  const myCallups = breakResult.callups.filter(c => {
    const p = dbGet(`SELECT club_id FROM players WHERE id = ?`, c.player.id);
    return p?.club_id === userClubId;
  });
  const myInjuries = breakResult.injuries.filter(i => {
    const p = dbGet(`SELECT club_id FROM players WHERE id = ?`, i.player.id);
    return p?.club_id === userClubId;
  });

  if (!myCallups.length && !myInjuries.length) return null;

  let msg = `🌍 *INTERNATIONAL BREAK — MD ${breakResult.matchday}*\n\n`;

  if (myCallups.length > 0) {
    msg += `✈️ *Dipanggil Timnas:*\n`;
    for (const c of myCallups) {
      msg += `  ${c.player.name} (${c.player.nationality})\n`;
    }
    msg += '\n';
  }

  if (myInjuries.length > 0) {
    msg += `🚑 *Cedera saat Tugas Timnas:*\n`;
    for (const i of myInjuries) {
      msg += `  ⚠️ ${i.player.name} — absen ${i.days} hari\n`;
    }
    msg += '\n';
  }

  msg += `_Pemain kembali dengan fatigue +20. Rotasi skuad di MD berikutnya!_`;
  return msg;
}

// ═══════════════════════════════════════════════════════════════════
// WEATHER & PITCH CONDITIONS
// ═══════════════════════════════════════════════════════════════════

export const WEATHER_CONDITIONS = [
  { id: 'sunny', name: 'Cerah ☀️', passMod: 1.0, dribMod: 1.0, fatMod: 1.1, freq: 0.35 },
  { id: 'cloudy', name: 'Berawan ⛅', passMod: 1.0, dribMod: 1.0, fatMod: 1.0, freq: 0.30 },
  { id: 'rainy', name: 'Hujan 🌧️', passMod: 0.88, dribMod: 0.82, fatMod: 0.95, freq: 0.20 },
  { id: 'heavy_rain', name: 'Hujan Deras ⛈️', passMod: 0.78, dribMod: 0.72, fatMod: 0.90, freq: 0.08 },
  { id: 'windy', name: 'Berangin 💨', passMod: 0.92, dribMod: 0.95, fatMod: 1.0, freq: 0.07 },
];

export const PITCH_CONDITIONS = [
  { id: 'perfect', name: 'Lapangan Sempurna 🟩', mod: 1.05, freq: 0.20 },
  { id: 'good', name: 'Lapangan Baik', mod: 1.00, freq: 0.45 },
  { id: 'average', name: 'Lapangan Biasa', mod: 0.97, freq: 0.25 },
  { id: 'poor', name: 'Lapangan Buruk', mod: 0.92, freq: 0.10 },
];

export function generateMatchConditions() {
  const rnd = Math.random();
  let cumulative = 0;
  let weather = WEATHER_CONDITIONS[0];
  for (const w of WEATHER_CONDITIONS) {
    cumulative += w.freq;
    if (rnd <= cumulative) { weather = w; break; }
  }

  const rnd2 = Math.random();
  cumulative = 0;
  let pitch = PITCH_CONDITIONS[0];
  for (const p of PITCH_CONDITIONS) {
    cumulative += p.freq;
    if (rnd2 <= cumulative) { pitch = p; break; }
  }

  return { weather, pitch };
}

export function applyConditionsToStrength(baseStrength, conditions) {
  if (!conditions) return baseStrength;
  const { weather, pitch } = conditions;
  // Cuaca buruk mengurangi strength lebih untuk tim teknis (passing/dribbling style)
  const weatherMod = (weather.passMod + weather.dribMod) / 2;
  return Math.round(baseStrength * weatherMod * pitch.mod);
}

export function formatMatchConditions(conditions) {
  if (!conditions) return '';
  return `${conditions.weather.name} | ${conditions.pitch.name}`;
}

// ═══════════════════════════════════════════════════════════════════
// AI TRANSFER ACTIVITY
// ═══════════════════════════════════════════════════════════════════

export function runAITransferWindow(leagueId) {
  // Dijalankan di akhir musim / awal musim baru
  const aiClubs = dbAll(`SELECT * FROM clubs WHERE league_id = ? AND is_user = 0`, leagueId);
  const results = { bought: [], sold: [] };

  for (const club of aiClubs) {
    const clubPlayers = dbAll(`SELECT * FROM players WHERE club_id = ?`, club.id);

    // 1. Jual pemain tua atau bench warmer
    const toSell = clubPlayers.filter(p =>
      (p.age >= 33 && (p.overall || 65) < 75) ||
      ((p.appearances || 0) === 0 && (p.overall || 65) < (club.reputation - 10))
    );

    for (const p of toSell.slice(0, 2)) {
      // Cari pembeli AI lain
      const buyer = dbAll(`SELECT * FROM clubs WHERE league_id = ? AND is_user = 0 AND id != ?`, leagueId, club.id)
        .sort(() => Math.random() - 0.5)[0];
      if (!buyer) continue;

      const fee = Math.floor(p.market_value * (0.7 + Math.random() * 0.3));
      dbRun(`UPDATE players SET club_id = ? WHERE id = ?`, buyer.id, p.id);
      dbRun(`UPDATE clubs SET transfer_budget = transfer_budget + ?, balance = balance + ? WHERE id = ?`,
        fee, fee, club.id);
      dbRun(`UPDATE clubs SET transfer_budget = MAX(0, transfer_budget - ?) WHERE id = ?`,
        fee, buyer.id);
      results.sold.push({ player: p.name, from: club.name, to: buyer.name, fee });
    }

    // 2. Beli pemain yang dibutuhkan
    const budget = club.transfer_budget || 0;
    if (budget < 3_000_000) continue;

    // Cek posisi yang kurang
    const posCounts = {};
    for (const p of clubPlayers) { posCounts[p.position] = (posCounts[p.position] || 0) + 1; }
    const needed = ['GK', 'CB', 'LB', 'RB', 'CM', 'ST'].filter(pos => (posCounts[pos] || 0) < 2);

    for (const pos of needed.slice(0, 1)) {
      // Cari pemain di liga yang affordable
      const target = dbAll(`
        SELECT p.* FROM players p
        JOIN clubs c ON p.club_id = c.id
        WHERE c.league_id = ? AND p.club_id != ? AND p.position = ?
          AND p.market_value <= ? AND p.market_value > 0
        ORDER BY p.overall DESC LIMIT 3
      `, leagueId, club.id, pos, Math.floor(budget * 0.4))
        .sort(() => Math.random() - 0.5)[0];

      if (!target) continue;

      const fee = Math.floor(target.market_value * (0.9 + Math.random() * 0.15));
      if (fee > budget) continue;

      const fromClub = getClub(target.club_id);
      dbRun(`UPDATE players SET club_id = ? WHERE id = ?`, club.id, target.id);
      dbRun(`UPDATE clubs SET transfer_budget = MAX(0, transfer_budget - ?) WHERE id = ?`, fee, club.id);
      if (fromClub) {
        dbRun(`UPDATE clubs SET transfer_budget = transfer_budget + ? WHERE id = ?`, fee, fromClub.id);
      }
      results.bought.push({ player: target.name, to: club.name, fee });
    }
  }

  return results;
}

// ─── AI Approach User Player ──────────────────────────────────────────────────
// AI bisa approach pemain bintang user dengan tawaran gaji lebih tinggi
export function checkAIApproaches(userClubId, leagueId) {
  const userPlayers = dbAll(`SELECT * FROM players WHERE club_id = ? ORDER BY overall DESC`, userClubId);
  const approaches = [];

  for (const p of userPlayers.slice(0, 5)) { // hanya top 5 pemain
    // Peluang di-approach: overall tinggi, kontrak mau habis
    const contractYear = p.contract_end || new Date().getFullYear() + 2;
    const yearsLeft = contractYear - new Date().getFullYear();

    if ((p.overall >= 78) && yearsLeft <= 1 && Math.random() < 0.3) {
      const aiClub = dbAll(`
        SELECT * FROM clubs WHERE league_id = ? AND is_user = 0 AND reputation > ?
        ORDER BY RANDOM() LIMIT 1
      `, leagueId, (getClub(userClubId)?.reputation || 50) - 5)[0];

      if (!aiClub) continue;

      const offerWage = Math.floor(p.wage * (1.3 + Math.random() * 0.4));
      approaches.push({
        player: p,
        fromClub: aiClub,
        offerWage,
        fee: Math.floor(p.market_value * 0.95),
      });
    }
  }

  return approaches;
}

export function formatAIApproach(approach) {
  const { player, fromClub, offerWage, fee } = approach;
  return (
    `💼 *TAWARAN DARI AI KLUB!*\n\n` +
    `${fromClub.color} *${fromClub.name}* tertarik dengan *${player.name}*\n\n` +
    `💰 Fee yang ditawarkan: ${formatMoney(fee)}\n` +
    `💵 Gaji ditawarkan: ${formatMoney(offerWage)}/mgg\n` +
    `_(${Math.round((offerWage / (player.wage || 1)) * 100 - 100)}% lebih tinggi dari gaji saat ini)_\n\n` +
    `Ketik *!tolak ${player.name}* untuk tolak atau biarkan saja jika mau jual.`
  );
}

// ═══════════════════════════════════════════════════════════════════
// SET PIECE SPECIALISTS
// ═══════════════════════════════════════════════════════════════════

export function assignSetPieceSpecialists(clubId) {
  const players = dbAll(`SELECT * FROM players WHERE club_id = ? AND injury_until IS NULL ORDER BY overall DESC`, clubId);
  if (!players.length) return null;

  // Penalty taker: ST/CAM dengan dribbling + shooting tertinggi
  const penTaker = [...players]
    .filter(p => ['ST', 'CAM', 'CF'].includes(p.position))
    .sort((a, b) => ((b.shooting || 65) + (b.dribbling || 65)) - ((a.shooting || 65) + (a.dribbling || 65)))[0]
    || players[0];

  // Freekick taker: CAM/CM dengan passing + shooting
  const fkTaker = [...players]
    .filter(p => ['CAM', 'CM', 'LW', 'RW'].includes(p.position))
    .sort((a, b) => ((b.passing || 65) + (b.shooting || 65)) - ((a.passing || 65) + (a.shooting || 65)))[0]
    || players[1] || players[0];

  // Corner taker: LW/RW/LB/RB dengan crossing (approximated by passing)
  const cornerTaker = [...players]
    .filter(p => ['LW', 'RW', 'LB', 'RB'].includes(p.position))
    .sort((a, b) => (b.passing || 65) - (a.passing || 65))[0]
    || players[2] || players[0];

  dbRun(`UPDATE clubs SET penalty_taker=?, freekick_taker=?, corner_taker=? WHERE id=?`,
    penTaker.id, fkTaker.id, cornerTaker.id, clubId);

  return { penTaker, fkTaker, cornerTaker };
}

export function getSetPieceBonus(clubId, type) {
  const club = getClub(clubId);
  let takerId;
  if (type === 'penalty') takerId = club?.penalty_taker;
  if (type === 'freekick') takerId = club?.freekick_taker;
  if (type === 'corner') takerId = club?.corner_taker;

  if (!takerId) return 1.0;
  const taker = getPlayer(takerId);
  if (!taker) return 1.0;

  const stat = type === 'penalty' ? (taker.shooting || 65)
    : type === 'freekick' ? ((taker.shooting || 65) + (taker.passing || 65)) / 2
      : (taker.passing || 65);

  return 0.8 + (stat / 100) * 0.4; // 0.8 - 1.2 range
}

export function formatSetPieceSpec(clubId) {
  const club = getClub(clubId);
  if (!club) return `❌ Data tidak ditemukan.`;

  const pen = club.penalty_taker ? getPlayer(club.penalty_taker) : null;
  const fk = club.freekick_taker ? getPlayer(club.freekick_taker) : null;
  const corner = club.corner_taker ? getPlayer(club.corner_taker) : null;

  let msg = `⚽ *SET PIECE SPECIALISTS — ${club.name}*\n\n`;
  msg += `🥅 Penalti:      ${pen ? `*${pen.name}* (${pen.position})` : 'Belum ditentukan'}\n`;
  msg += `🎯 Tendangan Bebas: ${fk ? `*${fk.name}* (${fk.position})` : 'Belum ditentukan'}\n`;
  msg += `🏁 Corner:       ${corner ? `*${corner.name}* (${corner.position})` : 'Belum ditentukan'}\n\n`;
  msg += `_Specialists auto-assign berdasarkan statistik terbaik._\n`;
  msg += `_Gunakan !setpiece untuk refresh assignment._`;
  return msg;
}

// ═══════════════════════════════════════════════════════════════════
// MOMENTUM SYSTEM
// ═══════════════════════════════════════════════════════════════════

// Digunakan oleh match engine
export function getMomentumBonus(teamLastGoalMinute, currentMinute) {
  if (!teamLastGoalMinute) return 1.0;
  const minutesSinceGoal = currentMinute - teamLastGoalMinute;
  // 5-10 menit setelah gol: momentum boost +20%
  if (minutesSinceGoal <= 5) return 1.20;
  if (minutesSinceGoal <= 10) return 1.10;
  return 1.0;
}