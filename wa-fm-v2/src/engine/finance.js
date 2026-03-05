// src/engine/finance.js — Matchday Revenue, TV Rights, Prize Money

import { dbGet, dbAll, dbRun, getClub, getLeague } from '../db/database.js';
import { formatMoney } from './transfer.js';

// ─── Revenue Config ───────────────────────────────────────────────────────────
// Tiket per kapasitas * occupancy rate berdasarkan performance
const TICKET_PRICE_BASE = 50; // per seat per game
const TV_RIGHTS_PER_MD = {  // berdasarkan reputasi liga
  80: 3_000_000,
  65: 1_500_000,
  50: 500_000,
  0: 100_000,
};

// ─── Hitung Matchday Revenue ──────────────────────────────────────────────────
export function calculateMatchdayRevenue(clubId, isHome, result) {
  // result: 'win' | 'draw' | 'loss'
  const club = getClub(clubId);
  if (!club) return 0;

  const cap = club.stadium_cap || 30_000;
  const rep = club.reputation || 50;
  const stadiumMod = 1 + ((club.stadium_level || 1) * 0.1);
  const ticketPrice = (TICKET_PRICE_BASE * stadiumMod) + Math.floor(rep * 0.5);

  // Occupancy: menang → penuh, draw → 85%, kalah → 70%
  const occupancy = result === 'win' ? 0.95 : result === 'draw' ? 0.82 : 0.70;

  // Home game dapat penuh, away game tidak ada pemasukan tiket
  const ticketRevenue = isHome ? Math.floor(cap * occupancy * ticketPrice) : 0;

  // TV rights (semua match, home & away)
  const tvKey = Object.keys(TV_RIGHTS_PER_MD).reverse().find(k => rep >= parseInt(k));
  const tvRev = TV_RIGHTS_PER_MD[tvKey] || TV_RIGHTS_PER_MD[0];

  // Merchandise (kecil, tiap matchday) - BOOSTED by Star Players
  // Kita asumsikan pemain bintang = overall >= 85 (Global Superstar)
  const starPlayersCount = dbGet(`SELECT COUNT(*) as stars FROM players WHERE club_id = ? AND overall >= 85`, clubId)?.stars || 0;
  let mercRev = Math.floor(rep * 500 * (result === 'win' ? 1.3 : 1.0));

  // Extra merch from star players (jersey sales, global appeal)
  mercRev += (starPlayersCount * 150000);

  return { ticketRevenue, tvRev, mercRev, total: ticketRevenue + tvRev + mercRev };
}

// ─── Apply Revenue ke Club ────────────────────────────────────────────────────
export function applyMatchRevenue(clubId, isHome, homeScore, awayScore) {
  const isHomeClub = true; // called per-club
  const myScore = isHome ? homeScore : awayScore;
  const opScore = isHome ? awayScore : homeScore;
  const result = myScore > opScore ? 'win' : myScore === opScore ? 'draw' : 'loss';

  const rev = calculateMatchdayRevenue(clubId, isHome, result);

  dbRun(`UPDATE clubs SET balance = balance + ? WHERE id = ?`, rev.total, clubId);

  // Log revenue
  dbRun(`INSERT INTO finance_log (club_id, type, amount, description) VALUES (?, 'revenue', ?, ?)`,
    clubId, rev.total,
    `MD Revenue: Tiket ${formatMoney(rev.ticketRevenue)} + TV ${formatMoney(rev.tvRev)} + Merch ${formatMoney(rev.mercRev)}`
  );

  return rev;
}

// ─── Weekly Wage Payment & FFP Rules ──────────────────────────────────────────
export function processWeeklyWages(leagueId) {
  const clubs = dbAll(`SELECT * FROM clubs WHERE league_id = ?`, leagueId);
  for (const club of clubs) {
    const totalWage = dbGet(`SELECT SUM(wage) as total FROM players WHERE club_id = ?`, club.id)?.total || 0;
    if (totalWage > 0) {
      dbRun(`UPDATE clubs SET balance = balance - ? WHERE id = ?`, totalWage, club.id);
      if (club.is_user) {
        dbRun(`INSERT INTO finance_log (club_id, type, amount, description) VALUES (?, 'expense', ?, 'Pembayaran gaji pemain')`,
          club.id, totalWage);
      }

      // Financial Fair Play Check (FFP - Simplified)
      // Jika balance negatif, mulai kurangi fanbase trust (fans khawatir klub bangkrut)
      // Jika balance telanjur minus besar (-50M), kurangi poin
      if (club.balance - totalWage < -50000000) {
        // Warning FFP - Kurangi Poin
        dbRun(`UPDATE clubs SET points = MAX(0, points - 3), fanbase_trust = MAX(0, fanbase_trust - 10) WHERE id = ?`, club.id);
        if (club.is_user) {
          dbRun(`INSERT INTO finance_log (club_id, type, amount, description) VALUES (?, 'penalty', 0, '⚠️ Sanksi FFP: Pengurangan 3 Poin!')`, club.id);
        }
      } else if (club.balance - totalWage < -10000000) {
        // Hanya turun fanbase trust + board confidence
        dbRun(`UPDATE clubs SET fanbase_trust = MAX(0, fanbase_trust - 5) WHERE id = ?`, club.id);
      }
    }
  }
}

// ─── Upgrade Facilities ───────────────────────────────────────────────────────
export function upgradeFacility(clubId, type) {
  const club = getClub(clubId);
  if (!club) return { ok: false, msg: 'Klub tidak ditemukan.' };

  // type: 'stadium' | 'academy' | 'training'
  let levelCol, costBase, maxLvl, label;
  if (type === 'stadium') { levelCol = 'stadium_level'; costBase = 25000000; maxLvl = 5; label = 'Stadion'; }
  else if (type === 'academy') { levelCol = 'academy_level'; costBase = 10000000; maxLvl = 5; label = 'Akademi'; }
  else if (type === 'training') { levelCol = 'training_facilities'; costBase = 15000000; maxLvl = 5; label = 'Fasilitas Latihan'; }
  else { return { ok: false, msg: 'Tipe fasilitas tidak valid.' }; }

  const curLevel = club[levelCol] || 1;
  if (curLevel >= maxLvl) return { ok: false, msg: `Maksimal level ${label} (Lv. ${maxLvl}) sudah tercapai.` };

  // Biaya naik eksponensial berdasarkan level
  const upgradeCost = costBase * (curLevel);

  if (club.balance < upgradeCost) {
    return { ok: false, msg: `❌ Saldo tidak cukup!\nBiaya upgrade ${label} ke Lv. ${curLevel + 1}: ${formatMoney(upgradeCost)}` };
  }

  dbRun(`UPDATE clubs SET balance = balance - ?, ${levelCol} = ${levelCol} + 1 WHERE id = ?`, upgradeCost, clubId);
  dbRun(`INSERT INTO finance_log (club_id, type, amount, description) VALUES (?, 'expense', ?, ?)`, clubId, upgradeCost, `Upgrade ${label} ke Lv. ${curLevel + 1}`);

  // Extra actions explicitly for stadiums
  if (type === 'stadium') {
    const newCap = (club.stadium_cap || 30000) + 15000;
    dbRun(`UPDATE clubs SET stadium_cap = ? WHERE id = ?`, newCap, clubId);
  }

  return { ok: true, msg: `✅ *${label} Berhasil Diupgrade!*\nSekarang ${label} berada di Level ${curLevel + 1}.\nBiaya: -${formatMoney(upgradeCost)}.` };
}

// ─── End of Season Prize Money ────────────────────────────────────────────────
export function distributeSeasonPrizes(leagueId) {
  const league = getLeague(leagueId);
  const clubs = dbAll(`SELECT * FROM clubs WHERE league_id = ? ORDER BY points DESC`, leagueId);

  const prizes = [
    clubs.length >= 1 ? 50_000_000 : 0,  // 1st
    clubs.length >= 2 ? 30_000_000 : 0,  // 2nd
    clubs.length >= 3 ? 20_000_000 : 0,  // 3rd
    clubs.length >= 4 ? 15_000_000 : 0,  // 4th
    clubs.length >= 5 ? 10_000_000 : 0,  // 5th
  ];

  // TV Rights distribution (setiap tim dapat TV money)
  const tvBase = 5_000_000;

  const results = [];
  clubs.forEach((club, idx) => {
    const prize = prizes[idx] || 2_000_000;
    const tvMoney = tvBase + (clubs.length - idx) * 200_000;
    const total = prize + tvMoney;

    dbRun(`UPDATE clubs SET balance = balance + ?, transfer_budget = transfer_budget + ? WHERE id = ?`,
      total, Math.floor(prize * 0.5), club.id);

    dbRun(`INSERT INTO finance_log (club_id, type, amount, description) VALUES (?, 'prize', ?, ?)`,
      club.id, total, `Prize Akhir Musim (Posisi ${idx + 1}) + TV Rights`);

    results.push({ club: club.name, position: idx + 1, prize, tvMoney, total });
  });

  return results;
}

// ─── Relegation TV Rights Penalty ────────────────────────────────────────────
export function applyRelegationPenalty(clubId) {
  const club = getClub(clubId);
  if (!club) return;
  // Klub degradasi kehilangan TV rights besar
  const penalty = 10_000_000;
  dbRun(`UPDATE clubs SET balance = MAX(0, balance - ?), transfer_budget = MAX(0, transfer_budget - ?) WHERE id = ?`,
    penalty, Math.floor(penalty * 0.7), clubId);
  dbRun(`INSERT INTO finance_log (club_id, type, amount, description) VALUES (?, 'penalty', ?, 'Penalti degradasi - kehilangan TV rights')`,
    clubId, penalty);
  return penalty;
}

// ─── Format Finance Report ────────────────────────────────────────────────────
export function formatDetailedFinance(clubId) {
  const club = getClub(clubId);
  if (!club) return `❌ Data tidak ditemukan.`;

  const players = dbAll(`SELECT wage FROM players WHERE club_id = ?`, clubId);
  const totalWage = players.reduce((s, p) => s + (p.wage || 0), 0);
  const weeklyOut = totalWage;
  const logs = dbAll(`SELECT * FROM finance_log WHERE club_id = ? ORDER BY id DESC LIMIT 10`, clubId);

  let msg = `💰 *KEUANGAN DETAIL — ${club.name}*\n`;
  msg += `${'─'.repeat(32)}\n`;
  msg += `💵 Saldo Kas:         ${formatMoney(club.balance)}\n`;
  msg += `🔄 Budget Transfer:   ${formatMoney(club.transfer_budget)}\n`;
  msg += `📋 Budget Wage:       ${formatMoney(club.wage_budget)}/mgg\n`;
  msg += `💸 Total Gaji/Mgg:    ${formatMoney(weeklyOut)}\n`;
  msg += `👥 Jumlah Pemain:     ${players.length}\n\n`;

  // Estimasi pendapatan home game
  const rep = club.reputation || 50;
  const cap = club.stadium_cap || 30_000;
  const estTicket = Math.floor(cap * 0.85 * (TICKET_PRICE_BASE + rep * 0.5));
  const tvKey = Object.keys(TV_RIGHTS_PER_MD).reverse().find(k => rep >= parseInt(k));
  const tvRev = TV_RIGHTS_PER_MD[tvKey] || TV_RIGHTS_PER_MD[0];
  msg += `📺 Est. TV Rights/MD: ${formatMoney(tvRev)}\n`;
  msg += `🎟️ Est. Tiket/Match:  ${formatMoney(estTicket)}\n\n`;

  if (logs.length > 0) {
    msg += `📊 *Transaksi Terakhir:*\n`;
    for (const l of logs.slice(0, 5)) {
      const sign = l.type === 'expense' || l.type === 'penalty' ? '-' : '+';
      msg += `${sign}${formatMoney(l.amount)} — ${l.description?.substring(0, 30) || l.type}\n`;
    }
  }

  return msg;
}

// ─── Tambahan: AI Transfer Budget Seeding ────────────────────────────────────
// Di awal musim, AI klub juga butuh budget segar untuk beli pemain
export function refreshAIBudgets(leagueId) {
  const aiClubs = dbAll(`SELECT * FROM clubs WHERE league_id = ? AND is_user = 0`, leagueId);
  for (const club of aiClubs) {
    const rep = club.reputation || 50;
    const budget = rep >= 80 ? 40_000_000 : rep >= 65 ? 20_000_000 : rep >= 50 ? 8_000_000 : 3_000_000;
    dbRun(`UPDATE clubs SET transfer_budget = MAX(transfer_budget, ?) WHERE id = ?`, budget, club.id);
  }
}

const TICKET_PRICE_BASE_EXPORT = TICKET_PRICE_BASE;
export { TICKET_PRICE_BASE_EXPORT as TICKET_PRICE_BASE };