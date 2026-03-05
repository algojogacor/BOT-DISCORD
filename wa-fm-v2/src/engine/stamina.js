// src/engine/stamina.js — Stamina, Fatigue & Fitness Management

import { dbAll, dbRun, dbGet, getClub } from '../db/database.js';

// ─── Konstanta ────────────────────────────────────────────────────────────────
const FATIGUE_PER_MATCH   = 25;   // fatigue naik per pertandingan
const FATIGUE_RECOVERY    = 15;   // recovery per matchday istirahat
const MAX_FATIGUE         = 100;
const INJURY_BASE_CHANCE  = 0.03; // 3% base per match
const HIGH_FATIGUE_THRESH = 75;   // di atas ini risiko cedera naik drastis

// ─── Posisi & Fatigue Rate ─────────────────────────────────────────────────
// Pemain tertentu lebih cepat lelah
const POSITION_FATIGUE_RATE = {
  'GK':  0.6,
  'CB':  0.8,
  'LB':  1.1,  // fullback lari paling banyak
  'RB':  1.1,
  'CDM': 1.0,
  'CM':  1.15,
  'CAM': 1.0,
  'LW':  1.2,
  'RW':  1.2,
  'CF':  0.9,
  'ST':  0.85,
};

// ─── Hitung Kondisi Pemain ─────────────────────────────────────────────────
export function getPlayerCondition(player) {
  const fatigue = player.fatigue || 0;
  return Math.max(20, 100 - fatigue);
}

// ─── Pengaruh Kondisi ke Performa ─────────────────────────────────────────
// Returns multiplier 0.6-1.0
export function conditionMultiplier(player) {
  const cond = getPlayerCondition(player);
  if (cond >= 90) return 1.0;
  if (cond >= 75) return 0.93;
  if (cond >= 60) return 0.84;
  if (cond >= 45) return 0.74;
  return 0.63;
}

// ─── Hitung Efective Strength Tim ─────────────────────────────────────────
// Mempertimbangkan fatigue semua pemain
export function calcTeamEffectiveStrength(players, tacticFamiliarity = 100) {
  if (!players || players.length === 0) return 60;

  const avgOverall = players.reduce((s, p) => s + (p.overall || 65), 0) / players.length;
  const avgCond    = players.reduce((s, p) => s + conditionMultiplier(p), 0) / players.length;

  // Tactical familiarity penalty: 0-100 → 0.85-1.0 multiplier
  const famMult = 0.85 + (tacticFamiliarity / 100) * 0.15;

  return Math.round(avgOverall * avgCond * famMult);
}

// ─── Apply Fatigue Setelah Match ──────────────────────────────────────────
export function applyMatchFatigue(clubId, minutesPlayed = {}) {
  // minutesPlayed: { playerId: minutes }
  const players = dbAll(`SELECT * FROM players WHERE club_id = ?`, clubId);

  for (const p of players) {
    const mins    = minutesPlayed[p.id] || 0;
    if (mins === 0) continue; // tidak main, tidak lelah

    const rate    = POSITION_FATIGUE_RATE[p.position] || 1.0;
    const fatInc  = Math.round(FATIGUE_PER_MATCH * rate * (mins / 90));

    // Cedera risiko lebih tinggi jika sudah lelah
    const currentFatigue = p.fatigue || 0;
    if (currentFatigue > HIGH_FATIGUE_THRESH) {
      const injRisk = INJURY_BASE_CHANCE * ((currentFatigue - HIGH_FATIGUE_THRESH) / 25 + 1);
      if (Math.random() < injRisk && !p.injury_until) {
        const injTypes = [
          { type: 'Kram otot', days: 7 },
          { type: 'Kelelahan fisik', days: 10 },
          { type: 'Keseleo', days: 14 },
        ];
        const inj = injTypes[Math.floor(Math.random() * injTypes.length)];
        const until = new Date();
        until.setDate(until.getDate() + inj.days);
        dbRun(`UPDATE players SET injury_until = ?, injury_type = ? WHERE id = ?`,
          until.toISOString().split('T')[0], inj.type, p.id);
      }
    }

    const newFatigue = Math.min(MAX_FATIGUE, currentFatigue + fatInc);
    dbRun(`UPDATE players SET fatigue = ?, condition = ? WHERE id = ?`,
      newFatigue, Math.max(20, 100 - newFatigue), p.id);
  }
}

// ─── Recovery Antar Matchday ──────────────────────────────────────────────
export function applyMatchdayRecovery(leagueId) {
  // Semua pemain recover sedikit setiap matchday berlalu
  const players = dbAll(`
    SELECT p.* FROM players p
    JOIN clubs c ON p.club_id = c.id
    WHERE c.league_id = ?
  `, leagueId);

  for (const p of players) {
    if (!p.fatigue) continue;
    const newFatigue = Math.max(0, (p.fatigue || 0) - FATIGUE_RECOVERY);
    dbRun(`UPDATE players SET fatigue = ?, condition = ? WHERE id = ?`,
      newFatigue, Math.max(20, 100 - newFatigue), p.id);
  }
}

// ─── Rekomen Rotasi ───────────────────────────────────────────────────────
// Kembalikan pemain terbaik per posisi yang tidak kelelahan
export function getOptimalLineup(clubId) {
  const players   = dbAll(`
    SELECT * FROM players
    WHERE club_id = ? AND injury_until IS NULL
    ORDER BY overall DESC
  `, clubId);

  const lineup = [];
  const posUsed = {};
  const posNeeded = { GK:1, CB:2, LB:1, RB:1, CM:2, CAM:1, LW:1, RW:1, ST:1 };

  // Prioritas: pemain dengan kondisi baik & overall tinggi
  const sorted = [...players].sort((a, b) => {
    const scoreA = (a.overall || 65) * conditionMultiplier(a);
    const scoreB = (b.overall || 65) * conditionMultiplier(b);
    return scoreB - scoreA;
  });

  for (const p of sorted) {
    const pos   = p.position || 'CM';
    const need  = posNeeded[pos] || 0;
    const used  = posUsed[pos]   || 0;
    if (used < need) {
      lineup.push(p);
      posUsed[pos] = used + 1;
    }
    if (lineup.length >= 11) break;
  }

  return lineup;
}

// ─── Format Fitness Report ────────────────────────────────────────────────
export function formatFitnessReport(clubId) {
  const players = dbAll(`
    SELECT * FROM players WHERE club_id = ?
    ORDER BY fatigue DESC LIMIT 15
  `, clubId);

  const club = dbGet(`SELECT name FROM clubs WHERE id = ?`, clubId);

  let msg = `💪 *FITNESS REPORT — ${club?.name || ''}*\n\n`;

  const fresh   = players.filter(p => (p.fatigue||0) < 40);
  const tired   = players.filter(p => (p.fatigue||0) >= 40 && (p.fatigue||0) < 75);
  const exhaust = players.filter(p => (p.fatigue||0) >= 75);

  if (exhaust.length > 0) {
    msg += `🔴 *Kelelahan berat (perlu istirahat!)*\n`;
    for (const p of exhaust) {
      msg += `  ${p.name} (${p.position}) — Kondisi: ${getPlayerCondition(p)}%\n`;
    }
    msg += '\n';
  }
  if (tired.length > 0) {
    msg += `🟡 *Cukup lelah*\n`;
    for (const p of tired.slice(0, 5)) {
      msg += `  ${p.name} (${p.position}) — Kondisi: ${getPlayerCondition(p)}%\n`;
    }
    msg += '\n';
  }

  msg += `🟢 Pemain segar: ${fresh.length} orang\n`;
  msg += `\n_Ketik !rotasi untuk lihat rekomendasi lineup_`;
  return msg;
}

// ─── Format Rotation Advice ───────────────────────────────────────────────
export function formatRotationAdvice(clubId) {
  const optimal  = getOptimalLineup(clubId);
  const allPlayers = dbAll(`SELECT * FROM players WHERE club_id = ?`, clubId);

  // Cari pemain yang butuh istirahat
  const needRest = allPlayers
    .filter(p => (p.fatigue || 0) >= HIGH_FATIGUE_THRESH)
    .map(p => p.name);

  let msg = `🔄 *REKOMENDASI LINEUP OPTIMAL*\n\n`;

  if (needRest.length > 0) {
    msg += `⚠️ *Perlu diistirahatkan:*\n`;
    msg += needRest.map(n => `  - ${n}`).join('\n') + '\n\n';
  }

  msg += `✅ *Starting 11 Rekomendasi:*\n`;
  optimal.forEach((p, i) => {
    const cond = getPlayerCondition(p);
    const condEmoji = cond >= 90 ? '🟢' : cond >= 70 ? '🟡' : '🔴';
    msg += `${i+1}. ${p.position.padEnd(3)} ${p.name.padEnd(22)} ${condEmoji}${cond}%\n`;
  });

  return msg;
}