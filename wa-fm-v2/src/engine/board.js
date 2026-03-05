// src/engine/board.js — Board Expectations, Confidence & Job Security

import { dbGet, dbAll, dbRun, getClub, getLeague, updateClub } from '../db/database.js';
import { fireManager } from './scouting.js';
import { formatMoney } from './transfer.js';

// ─── Board Target Types ───────────────────────────────────────────────────────
// Ditentukan berdasarkan reputasi klub di awal musim
export function generateBoardTargets(clubId, leagueId) {
  const club  = getClub(clubId);
  const clubs = dbAll(`SELECT * FROM clubs WHERE league_id = ? ORDER BY reputation DESC`, leagueId);
  const rank  = clubs.findIndex(c => c.id === clubId) + 1;
  const total = clubs.length;
  const rep   = club?.reputation || 50;

  let posTarget, cupTarget, financeTarget, description;

  if (rank <= 2) {
    posTarget    = 1;       // harus juara
    cupTarget    = 'final'; // minimal final
    description  = 'Juara liga dan bersaing di semua kompetisi';
  } else if (rank <= 5) {
    posTarget    = 4;       // top 4
    cupTarget    = 'sf';    // semifinal
    description  = 'Finis top 4 dan lolos semifinal piala';
  } else if (rank <= 8) {
    posTarget    = 8;
    cupTarget    = 'qf';
    description  = 'Finis top 8 liga';
  } else if (rank <= total - 3) {
    posTarget    = total - 3; // jangan degradasi
    cupTarget    = 'r3';
    description  = 'Jangan degradasi, tampil solid';
  } else {
    posTarget    = total - 1;
    cupTarget    = 'r2';
    description  = 'Bertahan di liga, hindari juru kunci';
  }

  // Hapus target lama dulu
  dbRun(`DELETE FROM board_targets WHERE club_id = ?`, clubId);
  dbRun(`
    INSERT INTO board_targets (club_id, league_id, pos_target, cup_target, description, confidence)
    VALUES (?, ?, ?, ?, ?, 50)
  `, clubId, leagueId, posTarget, cupTarget, description);

  return { posTarget, cupTarget, description };
}

// ─── Update Board Confidence ──────────────────────────────────────────────────
export function updateBoardConfidence(clubId, leagueId) {
  const target = dbGet(`SELECT * FROM board_targets WHERE club_id = ?`, clubId);
  if (!target) return 50;

  const clubs   = dbAll(`SELECT * FROM clubs WHERE league_id = ? ORDER BY points DESC`, leagueId);
  const curRank = clubs.findIndex(c => c.id === clubId) + 1;
  const total   = clubs.length;
  const league  = getLeague(leagueId);
  const md      = league?.current_matchday || 1;

  let confidence = target.confidence || 50;
  let delta = 0;

  // Evaluasi berdasarkan posisi vs target
  const rankDiff = curRank - target.pos_target;
  if (rankDiff <= -3)     delta += 10;  // jauh di atas target
  else if (rankDiff <= 0) delta += 5;   // sesuai/lebih baik dari target
  else if (rankDiff <= 3) delta -= 5;   // sedikit di bawah
  else                    delta -= 15;  // jauh di bawah target

  // Bonus/penalty berdasarkan tren 5 matchday terakhir
  const recentMatches = dbAll(`
    SELECT home_score, away_score, home_club_id, away_club_id
    FROM matches WHERE league_id = ? AND (home_club_id = ? OR away_club_id = ?)
    AND status = 'completed' ORDER BY matchday DESC LIMIT 5
  `, leagueId, clubId, clubId);

  let recentPts = 0;
  for (const m of recentMatches) {
    const isHome = m.home_club_id === clubId;
    const myScore = isHome ? m.home_score : m.away_score;
    const opScore = isHome ? m.away_score : m.home_score;
    if (myScore > opScore) recentPts += 3;
    else if (myScore === opScore) recentPts += 1;
  }

  if (recentPts >= 12) delta += 8;   // 4-5 kemenangan
  else if (recentPts >= 9) delta += 4;
  else if (recentPts <= 3) delta -= 8;  // 0-1 kemenangan dari 5 game

  confidence = Math.min(100, Math.max(0, confidence + delta));
  dbRun(`UPDATE board_targets SET confidence = ? WHERE club_id = ?`, confidence, clubId);
  return confidence;
}

// ─── Cek Apakah Manajer Dipecat ──────────────────────────────────────────────
export function checkManagerFiring(phone, clubId, leagueId) {
  const target     = dbGet(`SELECT * FROM board_targets WHERE club_id = ?`, clubId);
  if (!target) return null;

  const confidence = updateBoardConfidence(clubId, leagueId);
  const league     = getLeague(leagueId);
  const md         = league?.current_matchday || 1;

  // Terlalu dini untuk pecat (sebelum MD 8)
  if (md < 8) return null;

  // Dipecat jika confidence < 20
  if (confidence < 20) {
    fireManager(phone);
    return {
      fired: true,
      msg: `🔴 *KAMU DIPECAT!*\n\n` +
        `Dewan direktur kehilangan kepercayaan pada kepemimpinanmu.\n` +
        `Confidence board: ${confidence}/100\n\n` +
        `Target yang tidak tercapai: ${target.description}\n\n` +
        `_Ketik !lamarpekerjaan untuk cari klub baru_`,
    };
  }

  return { fired: false, confidence };
}

// ─── Format Board Report ──────────────────────────────────────────────────────
export function formatBoardReport(clubId, leagueId) {
  const target = dbGet(`SELECT * FROM board_targets WHERE club_id = ?`, clubId);
  const club   = getClub(clubId);
  if (!target || !club) return `❌ Tidak ada data board.`;

  const clubs   = dbAll(`SELECT * FROM clubs WHERE league_id = ? ORDER BY points DESC`, leagueId);
  const curRank = clubs.findIndex(c => c.id === clubId) + 1;
  const conf    = target.confidence || 50;

  const confBar   = '█'.repeat(Math.floor(conf/10)) + '░'.repeat(10 - Math.floor(conf/10));
  const confEmoji = conf >= 70 ? '🟢' : conf >= 40 ? '🟡' : '🔴';

  const cupMap = { final:'Final', sf:'Semifinal', qf:'Perempat Final', r3:'Babak 3', r2:'Babak 2' };

  let msg = `📋 *EKSPEKTASI BOARD — ${club.name}*\n`;
  msg += `${'─'.repeat(32)}\n`;
  msg += `🎯 Target Liga: *Top ${target.pos_target}* (saat ini: #${curRank})\n`;
  msg += `🏆 Target Piala: *${cupMap[target.cup_target] || target.cup_target}*\n`;
  msg += `📝 ${target.description}\n\n`;
  msg += `${confEmoji} Kepercayaan Board:\n[${confBar}] ${conf}/100\n\n`;

  if (conf >= 70)      msg += `✅ Board sangat mendukungmu saat ini.`;
  else if (conf >= 50) msg += `⚠️ Board masih percaya, tapi perhatikan performa.`;
  else if (conf >= 30) msg += `🔴 Board mulai tidak sabar! Butuh hasil segera.`;
  else                 msg += `💀 *BAHAYA!* Board hampir memecat kamu!`;

  return msg;
}

// ─── Bonus Kinerja dari Board ─────────────────────────────────────────────────
export function applySeasonBonus(clubId, finalRank, leagueId) {
  const target = dbGet(`SELECT * FROM board_targets WHERE club_id = ?`, clubId);
  const club   = getClub(clubId);
  if (!target || !club) return null;

  const exceeded = finalRank <= target.pos_target;
  let bonusMsg   = '';
  let budgetBonus = 0;

  if (finalRank === 1) {
    budgetBonus = 30_000_000;
    bonusMsg = `🏆 Juara liga! Board memberikan budget tambahan ${formatMoney(budgetBonus)}`;
  } else if (exceeded) {
    budgetBonus = 10_000_000;
    bonusMsg = `✅ Target terlampaui! Budget bonus ${formatMoney(budgetBonus)}`;
  } else if (finalRank > target.pos_target + 5) {
    budgetBonus = -5_000_000;
    bonusMsg = `⚠️ Target tidak tercapai. Budget transfer dipotong ${formatMoney(Math.abs(budgetBonus))}`;
  }

  if (budgetBonus !== 0) {
    dbRun(`UPDATE clubs SET transfer_budget = MAX(0, transfer_budget + ?) WHERE id = ?`,
      budgetBonus, clubId);
  }

  return { exceeded, budgetBonus, bonusMsg };
}