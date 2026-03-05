// src/engine/transfer.js — Transfer Market, Finance & Player Development

import { getClub, getPlayer, updateClub, updatePlayer, dbGet, dbAll, dbRun } from '../db/database.js';

// ─── Transfer Market ──────────────────────────────────────────────────────────

export function searchPlayers(query, userClubId, maxBudget = null) {
  let sql = `
    SELECT p.*, c.name as club_name, c.color as club_color, c.id as current_club_id
    FROM players p
    JOIN clubs c ON p.club_id = c.id
    WHERE p.club_id != ? AND p.injury_until IS NULL
  `;
  const params = [userClubId];
  if (query) { sql += ` AND (p.name LIKE ? OR p.position LIKE ?)`; params.push(`%${query}%`, `%${query}%`); }
  if (maxBudget) { sql += ` AND p.market_value <= ?`; params.push(maxBudget); }
  sql += ` ORDER BY p.overall DESC LIMIT 20`;
  return dbAll(sql, ...params);
}

export function makeOffer(fromClubId, playerId, fee, wage, contractYears = 3, clauses = {}) {
  const player = getPlayer(playerId);
  const club = getClub(fromClubId);
  if (!player || !club) return { ok: false, msg: 'Data tidak ditemukan.' };

  if (club.transfer_budget < fee)
    return { ok: false, msg: `❌ Budget transfer tidak cukup!\nBudget: ${formatMoney(club.transfer_budget)}\nPenawaran: ${formatMoney(fee)}` };
  if (club.wage_budget < wage)
    return { ok: false, msg: `❌ Budget gaji tidak cukup!\nWage budget tersisa: ${formatMoney(club.wage_budget)}/minggu` };

  const existing = dbGet(`SELECT id FROM transfers WHERE player_id = ? AND status = 'pending'`, playerId);
  if (existing) return { ok: false, msg: `⚠️ Sudah ada penawaran aktif untuk pemain ini.` };

  const minAccept = Math.floor(player.market_value * 0.90);

  // Handling Release Clause Logic
  const activeContract = dbGet(`SELECT release_clause FROM transfers WHERE player_id = ? AND to_club_id = ? AND status = 'completed'`, playerId, player.club_id);
  const releaseClause = activeContract?.release_clause;

  if (releaseClause && fee >= releaseClause) {
    return completeTransfer(fromClubId, playerId, fee, wage, contractYears, clauses);
  }

  if (fee >= minAccept) {
    return completeTransfer(fromClubId, playerId, fee, wage, contractYears, clauses);
  } else if (fee >= player.market_value * 0.70) {
    const counterFee = Math.floor(player.market_value * 0.95);
    return {
      ok: false, counter: true, counterFee,
      msg: `⚠️ *Penawaran ditolak!*\n\nMereka meminta *${formatMoney(counterFee)}*.\nBalas *!beli ${player.name} ${Math.floor(counterFee / 1_000_000)}M* untuk counter balik.`,
    };
  } else {
    return { ok: false, msg: `❌ *Penawaran ditolak keras!*\nNilai pasar ${player.name}: ${formatMoney(player.market_value)}\nKamu menawar terlalu rendah.` };
  }
}

export function completeTransfer(toClubId, playerId, fee, wage, contractYears, clauses = {}) {
  const player = getPlayer(playerId);
  const toClub = getClub(toClubId);
  const fromClub = getClub(player?.club_id);
  if (!player || !toClub) return { ok: false, msg: 'Data tidak ditemukan.' };

  // Calculate Sell-on Fee
  const prvContract = dbGet(`SELECT sell_on_fee FROM transfers WHERE player_id = ? AND to_club_id = ? AND status = 'completed' ORDER BY id DESC LIMIT 1`, playerId, fromClub?.id);
  let sellOnAmount = 0;
  if (prvContract && prvContract.sell_on_fee > 0 && fromClub) {
    sellOnAmount = Math.floor(fee * (prvContract.sell_on_fee / 100));
    // Sell-on money goes to previous club of the selling club? Here we just deduct from profit as it's a simplification, or give to previous club if tracked. For now, deduct sell-on fee from the sale profit of the selling club.
  }

  updatePlayer(playerId, {
    club_id: toClubId, wage, contract_end: new Date().getFullYear() + contractYears,
    goals: 0, assists: 0, appearances: 0, avg_rating: 0, loyalty: 50, loan_club_id: null
  }); // reset loyalty, cancel loans
  updateClub(toClubId, { transfer_budget: toClub.transfer_budget - fee, wage_budget: toClub.wage_budget - wage });

  if (fromClub) {
    updateClub(fromClub.id, { transfer_budget: fromClub.transfer_budget + Math.floor((fee - sellOnAmount) * 0.85), balance: fromClub.balance + (fee - sellOnAmount) });
  }
  dbRun(`UPDATE transfers SET status = 'completed' WHERE player_id = ? AND status = 'pending'`, playerId);

  // Register the new completed contract with clauses
  dbRun(`INSERT INTO transfers (player_id, from_club_id, to_club_id, fee, wage, contract_years, type, status, release_clause, sell_on_fee) VALUES (?, ?, ?, ?, ?, ?, 'permanent', 'completed', ?, ?)`,
    playerId, fromClub?.id || null, toClubId, fee, wage, contractYears, clauses.release_clause || null, clauses.sell_on_fee || 0
  );

  return { ok: true, msg: `✅ *TRANSFER SELESAI!*\n\n🔴 ${player.name} resmi bergabung!\n💰 Biaya: ${formatMoney(fee)}\n💵 Gaji: ${formatMoney(wage)}/minggu\n📝 Kontrak: ${contractYears} tahun` };
}

export function sellPlayer(fromClubId, playerId) {
  const player = getPlayer(playerId);
  const club = getClub(fromClubId);
  if (!player || !club || player.club_id !== fromClubId)
    return { ok: false, msg: '❌ Pemain tidak ditemukan di tim kamu.' };

  const fee = Math.floor(player.market_value * (0.80 + Math.random() * 0.20));
  const buyingClub = dbGet(`SELECT * FROM clubs WHERE is_user = 0 AND id != ? ORDER BY RANDOM() LIMIT 1`, fromClubId);
  if (!buyingClub) return { ok: false, msg: '❌ Tidak ada klub yang tertarik saat ini.' };

  updatePlayer(playerId, { club_id: buyingClub.id });
  updateClub(fromClubId, { transfer_budget: club.transfer_budget + fee, wage_budget: club.wage_budget + player.wage, balance: club.balance + fee });

  return { ok: true, msg: `✅ *${player.name} DIJUAL!*\nDibeli ${buyingClub.name}\n💰 ${formatMoney(fee)} | Wage budget +${formatMoney(player.wage)}/mgg` };
}

export function loanPlayer(fromClubId, playerId) {
  const player = getPlayer(playerId);
  const fromClub = getClub(fromClubId);
  if (!player || !fromClub) return { ok: false, msg: 'Data tidak ditemukan.' };

  const loanClub = dbGet(`SELECT * FROM clubs WHERE is_user = 0 AND id != ? ORDER BY RANDOM() LIMIT 1`, fromClubId);
  if (!loanClub) return { ok: false, msg: '❌ Tidak ada klub yang tertarik meminjam.' };

  const loanFee = Math.floor(player.wage * 0.5 * 26);
  updatePlayer(playerId, { loan_club_id: loanClub.id }); // Use loan_club_id system Instead of changing club_id
  updateClub(fromClubId, { wage_budget: fromClub.wage_budget + Math.floor(player.wage * 0.5) });

  return { ok: true, msg: `✅ *${player.name} DIPINJAMKAN!*\nDipinjam ${loanClub.name} (6 bulan)\n💰 Loan fee: ${formatMoney(loanFee)}` };
}

export function getFreeAgents() {
  return dbAll(`SELECT * FROM players WHERE club_id IS NULL ORDER BY overall DESC LIMIT 15`);
}

export function signFreeAgent(clubId, playerId, wage, contractYears = 2) {
  const player = getPlayer(playerId);
  const club = getClub(clubId);
  if (!player || !club || player.club_id) return { ok: false, msg: '❌ Pemain tidak available.' };
  if (club.wage_budget < wage) return { ok: false, msg: `❌ Wage budget tidak cukup!` };

  updatePlayer(playerId, { club_id: clubId, wage, contract_end: new Date().getFullYear() + contractYears });
  updateClub(clubId, { wage_budget: club.wage_budget - wage });

  return { ok: true, msg: `✅ *${player.name}* resmi bergabung sebagai free agent!\n💵 Gaji: ${formatMoney(wage)}/minggu` };
}

// ─── Finance ──────────────────────────────────────────────────────────────────

export function getFinanceSummary(clubId) {
  const club = getClub(clubId);
  if (!club) return null;
  const players = dbAll(`SELECT wage FROM players WHERE club_id = ?`, clubId);
  const totalWage = players.reduce((s, p) => s + (p.wage || 0), 0);
  return { balance: club.balance, transferBudget: club.transfer_budget, wageBudget: club.wage_budget, weeklyWage: totalWage, playerCount: players.length };
}

export function formatFinanceSummary(clubId) {
  const f = getFinanceSummary(clubId);
  const c = getClub(clubId);
  if (!f) return '❌ Data keuangan tidak ditemukan.';
  return `💰 *KEUANGAN — ${c.name}*\n` +
    `${'─'.repeat(30)}\n` +
    `💵 Saldo:           ${formatMoney(f.balance)}\n` +
    `🔄 Budget Transfer: ${formatMoney(f.transferBudget)}\n` +
    `📋 Budget Wage:     ${formatMoney(f.wageBudget)}/mgg\n` +
    `💸 Total Gaji/Mgg:  ${formatMoney(f.weeklyWage)}\n` +
    `👥 Jumlah Pemain:   ${f.playerCount}\n` +
    `${'─'.repeat(30)}\n` +
    `_Ketik !jual [nama] atau !cari [nama] untuk transfer_`;
}

export function formatMoney(amount) {
  if (!amount && amount !== 0) return 'N/A';
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K`;
  return `${amount}`;
}

// ─── Player Development — HANYA mid-season & end-season ──────────────────────

export function seasonPlayerDevelopment(leagueId, type = 'mid') {
  // type: 'mid' (matchday 17) | 'end' (matchday 34)
  const players = dbAll(`
    SELECT p.* FROM players p
    JOIN clubs c ON p.club_id = c.id
    WHERE c.league_id = ?
  `, leagueId);

  const developed = [];
  const declined = [];

  for (const p of players) {
    const age = p.age || 24;
    const overall = p.overall || 65;
    const potential = p.potential || overall;
    const potGap = potential - overall;

    // Faktor usia untuk perkembangan
    let growChance, growAmount;
    if (age <= 19) { growChance = 0.75; growAmount = type === 'end' ? 3 : 2; }
    else if (age <= 21) { growChance = 0.60; growAmount = type === 'end' ? 2 : 1; }
    else if (age <= 23) { growChance = 0.45; growAmount = type === 'end' ? 2 : 1; }
    else if (age <= 26) { growChance = 0.25; growAmount = 1; }
    else if (age <= 29) { growChance = 0.10; growAmount = 1; }
    else { growChance = 0; growAmount = 0; }

    // Pemain di dekat PA tidak bisa grow banyak
    if (potGap <= 2) growChance *= 0.2;
    else if (potGap <= 5) growChance *= 0.5;

    const didGrow = potGap > 0 && Math.random() < growChance;

    if (didGrow) {
      const newOverall = Math.min(potential, overall + growAmount);
      updatePlayer(p.id, { overall: newOverall });
      developed.push({ name: p.name, pos: p.position, from: overall, to: newOverall, age });
    }

    // Decline untuk pemain tua — hanya di end of season
    if (type === 'end' && age >= 32) {
      const declineChance = (age - 31) * 0.12;
      if (Math.random() < declineChance) {
        const newOverall = Math.max(50, overall - 1);
        updatePlayer(p.id, { overall: newOverall });
        declined.push({ name: p.name, pos: p.position, from: overall, to: newOverall, age });
      }
    }

    // Update usia di akhir musim
    if (type === 'end') {
      updatePlayer(p.id, { age: age + 1 });
    }

    // Update nilai pasar sesuai overall baru
    const newVal = calculateMarketValue(p.overall, age, potential);
    updatePlayer(p.id, { market_value: newVal });
  }

  return { developed, declined };
}

// ─── Regen / Newgen ───────────────────────────────────────────────────────────
// Pemain pensiun diganti dengan newgen

const REGEN_NAMES = {
  Indonesia: ['Bagas Kaffa', 'Witan Sulaeman', 'Titan Agung', 'Dimas Drajad', 'Egy Maulana',
    'Hanis Saghara', 'Marselino Ferdinan', 'Pratama Arhan', 'Rafael Struick', 'Asnawi Mangkualam',
    'Rizky Ridho', 'Fachruddin Aryanto', 'Elkan Baggott', 'Todd Rivaldo', 'Sandy Walsh'],
  England: ['Oliver Hughes', 'Liam Carter', 'Jack Morrow', 'Finlay Ross', 'Harry Webb',
    'Callum Briggs', 'Mason Ford', 'Tyler Knox', 'Archie Bell', 'George Frost'],
  Spain: ['Pablo Ruiz', 'Diego Campos', 'Sergio Vega', 'Mateo Ibáñez', 'Álvaro Cruz',
    'Javi Moreno', 'Raúl Prieto', 'Marcos León', 'Iker Santos', 'Adrián Romero'],
};

export function generateNewgens(leagueId, retiredCount = 0) {
  // Tiap pemain pensiun diganti 1 newgen muda
  const clubs = dbAll(`SELECT * FROM clubs WHERE league_id = ?`, leagueId);
  const newgens = [];

  for (const club of clubs) {
    const playerCount = dbGet(`SELECT COUNT(*) as cnt FROM players WHERE club_id = ?`, club.id)?.cnt || 0;
    if (playerCount >= 18) continue; // Skuad sudah cukup

    const toGenerate = Math.max(0, 18 - playerCount);
    const nationality = club.country || 'Indonesia';
    const namePool = REGEN_NAMES[nationality] || REGEN_NAMES['Indonesia'];
    const positions = ['GK', 'CB', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CM', 'CAM', 'LW', 'RW', 'ST'];

    for (let i = 0; i < toGenerate; i++) {
      const name = namePool[Math.floor(Math.random() * namePool.length)];
      const pos = positions[Math.floor(Math.random() * positions.length)];
      const age = 17 + Math.floor(Math.random() * 4);
      const repBonus = Math.floor((club.reputation || 50) / 5);
      const acaLevel = club.academy_level || 1;
      const tfLevel = club.training_facilities || 1;

      const overall = 52 + Math.floor(Math.random() * 18) + repBonus + (acaLevel * 2);
      const potential = overall + 8 + Math.floor(Math.random() * 22) + (tfLevel * 2);

      const personalities = ['Leader', 'Ambitious', 'Loyal', 'Mercenary', 'Troublemaker', 'Professional'];
      const traits = ['Free-Kick Specialist', 'Dribbler', 'Poacher', 'Playmaker', 'Anchor', 'None', 'None', 'None'];
      const ppers = personalities[Math.floor(Math.random() * personalities.length)];
      const ptrait = traits[Math.floor(Math.random() * traits.length)];

      dbRun(`
        INSERT INTO players (club_id, name, position, age, overall, potential, nationality,
          wage, contract_end, form, morale, loyalty, professionalism, injury_proneness, personality, playstyle_trait)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 65, 75, ?, ?, ?, ?, ?)
      `, club.id, name, pos, age, Math.min(95, overall), Math.min(99, potential),
        nationality, Math.max(3000, overall * 150), new Date().getFullYear() + 3,
        40 + Math.floor(Math.random() * 50), 40 + Math.floor(Math.random() * 50), 10 + Math.floor(Math.random() * 80), ppers, ptrait);

      newgens.push({ clubName: club.name, name, pos, age, overall });
    }
  }

  return newgens;
}

export function retireOldPlayers(leagueId) {
  // Pemain >= 36 dengan overall < 70 punya chance pensiun
  const oldPlayers = dbAll(`
    SELECT p.* FROM players p
    JOIN clubs c ON p.club_id = c.id
    WHERE c.league_id = ? AND p.age >= 36
  `, leagueId);

  const retired = [];
  for (const p of oldPlayers) {
    const retireChance = (p.age - 35) * 0.20 + (p.overall < 70 ? 0.15 : 0);
    if (Math.random() < retireChance) {
      dbRun(`DELETE FROM players WHERE id = ?`, p.id);
      retired.push({ name: p.name, age: p.age, overall: p.overall });
    }
  }
  return retired;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function calculateMarketValue(overall, age, potential) {
  let base = Math.pow(overall / 50, 3) * 1_000_000;
  if (age <= 21) base *= 1.5;
  else if (age <= 25) base *= 1.2;
  else if (age <= 28) base *= 1.0;
  else if (age <= 31) base *= 0.7;
  else base *= 0.4;
  if (potential > overall + 10) base *= 1.3;
  return Math.floor(base / 100_000) * 100_000;
}