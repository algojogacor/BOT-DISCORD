// scripts/import-players.js
// Import data pemain dari dataset male_players.csv
// Letakkan file di: data/male_players.csv

import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DatabaseSync } from 'node:sqlite';
import { Buffer } from 'buffer';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const DB_PATH = join(DATA_DIR, 'game.db');

// ─── CSV Parser ───────────────────────────────────────────────────────────────
function parseCSV(content) {
  const lines = content.split('\n').filter(l => l.trim());
  const headers = parseCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = parseCSVLine(line);
    const row = {};
    headers.forEach((h, i) => row[h.trim()] = values[i]?.trim() || '');
    return row;
  });
}

function parseCSVLine(line) {
  const result = [];
  let cur = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') {
      inQuotes = !inQuotes;
    } else if (line[i] === ',' && !inQuotes) {
      result.push(cur); cur = '';
    } else {
      cur += line[i];
    }
  }
  result.push(cur);
  return result;
}

// ─── Whitelist 20 klub EPL asli ───────────────────────────────────────────────
const EPL_CLUBS = new Set([
  'Arsenal', 'Aston Villa', 'AFC Bournemouth', 'Brentford',
  'Brighton & Hove Albion', 'Burnley', 'Chelsea', 'Crystal Palace',
  'Everton', 'Fulham', 'Liverpool', 'Luton Town', 'Manchester City',
  'Manchester United', 'Newcastle United', 'Nottingham Forest',
  'Sheffield United', 'Tottenham Hotspur', 'West Ham United',
  'Wolverhampton Wanderers',
]);

// ─── Konfigurasi liga ─────────────────────────────────────────────────────────
const LEAGUES_TO_IMPORT = {
  'England': {
    leagueName: 'Premier League',
    leagueKey: 'Premier League',
    teamCount: 20,
    clubWhitelist: EPL_CLUBS,
  },
  'Spain': {
    leagueName: 'La Liga',
    leagueKey: 'La Liga',
    teamCount: 20,
    clubWhitelist: null,
  },
};

const FIFA_VERSION = '24.0';

const CLUB_COLORS = [
  '🔴', '🔵', '🟡', '🟢', '⚫', '⚪', '🟠', '🟣', '🔶', '🔷',
  '🌕', '💜', '❤️', '💙', '💚', '💛', '🖤', '🤍', '🧡', '💜',
];

const POSITION_MAP = {
  'GK': 'GK', 'CB': 'CB', 'LB': 'LB', 'RB': 'RB',
  'LWB': 'LB', 'RWB': 'RB', 'CDM': 'CDM', 'CM': 'CM',
  'CAM': 'CAM', 'LM': 'LW', 'RM': 'RW', 'LW': 'LW',
  'RW': 'RW', 'CF': 'CF', 'ST': 'ST', 'LS': 'ST', 'RS': 'ST',
};

function normalizePosition(pos) {
  return POSITION_MAP[pos?.toUpperCase()] || 'CM';
}

// ─── Budget System (Berbasis Nilai Skuad — Realistis) ─────────────────────────
//
// Setiap klub mendapat budget berdasarkan dua faktor:
//   1. reputation  — dari rata-rata overall pemain (menentukan bracket)
//   2. avgSquadValue — rata-rata nilai pasar per pemain dari data FIFA
//
// squadTotal = avgSquadValue × 25 (estimasi skuad penuh)
// Transfer budget = persentase dari squadTotal, dengan floor minimum per bracket
//
// Contoh nyata:
//   Man City (rep 82, avgVal ~30M)   → squadTotal ~750M → transfer ~150M
//   Arsenal  (rep 78, avgVal ~18M)   → squadTotal ~450M → transfer ~81M
//   Newcastle (rep 75, avgVal ~10M)  → squadTotal ~250M → transfer ~50M
//   West Ham  (rep 72, avgVal ~5M)   → squadTotal ~125M → transfer ~25M
//   Luton     (rep 69, avgVal ~2M)   → squadTotal  ~50M → transfer ~8M
//   Sheffield (rep 68, avgVal ~1.5M) → squadTotal  ~38M → transfer ~8M
//
function getBudget(reputation, avgSquadValue = 0) {
  const squadTotal = avgSquadValue * 25;

  let transfer, wage;

  if (reputation >= 82) {
    // Elite: Man City, Real Madrid, Liverpool
    transfer = Math.max(150_000_000, Math.floor(squadTotal * 0.20));
    wage = Math.max(5_000_000, Math.floor(squadTotal * 0.008));
  } else if (reputation >= 78) {
    // Top: Arsenal, Atletico, Tottenham
    transfer = Math.max(80_000_000, Math.floor(squadTotal * 0.18));
    wage = Math.max(3_000_000, Math.floor(squadTotal * 0.006));
  } else if (reputation >= 75) {
    // Upper-mid: Newcastle, Brighton, Real Betis
    transfer = Math.max(50_000_000, Math.floor(squadTotal * 0.16));
    wage = Math.max(2_000_000, Math.floor(squadTotal * 0.005));
  } else if (reputation >= 72) {
    // Mid: West Ham, Everton, Sevilla
    transfer = Math.max(25_000_000, Math.floor(squadTotal * 0.14));
    wage = Math.max(1_200_000, Math.floor(squadTotal * 0.004));
  } else if (reputation >= 70) {
    // Mid-lower: Bournemouth, Brentford, Girona
    transfer = Math.max(15_000_000, Math.floor(squadTotal * 0.12));
    wage = Math.max(800_000, Math.floor(squadTotal * 0.003));
  } else if (reputation >= 65) {
    // Lower: Luton, Sheffield Utd, Las Palmas
    transfer = Math.max(8_000_000, Math.floor(squadTotal * 0.10));
    wage = Math.max(400_000, Math.floor(squadTotal * 0.002));
  } else {
    // Bottom: relegation / newly promoted
    transfer = Math.max(3_000_000, Math.floor(squadTotal * 0.08));
    wage = Math.max(150_000, Math.floor(squadTotal * 0.001));
  }

  // Round ke nearest 500K agar angka rapi di WhatsApp
  transfer = Math.floor(transfer / 500_000) * 500_000;
  wage = Math.floor(wage / 50_000) * 50_000;

  // Balance (kas) = 50% transfer budget sebagai modal operasional awal
  const balance = Math.floor(transfer * 0.5);

  return { transfer, wage, balance };
}

// ─── Format uang untuk log console ───────────────────────────────────────────
function fmtM(n) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return `${n}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function importData() {
  console.log('🏃 FIFA Data Importer\n');

  const playerFile = join(DATA_DIR, 'male_players.csv');

  if (!existsSync(playerFile)) {
    console.error(`❌ File tidak ditemukan: ${playerFile}`);
    console.log('\n   Letakkan male_players.csv di folder data/');
    process.exit(1);
  }

  console.log('📖 Membaca male_players.csv...');
  const allPlayers = parseCSV(readFileSync(playerFile, 'utf-8'));

  const playerData = allPlayers.filter(p => p.fifa_version === FIFA_VERSION);
  console.log(`   ✅ ${playerData.length} pemain (FIFA ${FIFA_VERSION})\n`);

  const db = new DatabaseSync(DB_PATH);
  db.exec(`PRAGMA journal_mode = WAL;`);

  db.exec(`
    CREATE TABLE IF NOT EXISTS leagues (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, country TEXT, season INTEGER DEFAULT 1, current_matchday INTEGER DEFAULT 1, total_matchdays INTEGER DEFAULT 34, prize_champion INTEGER DEFAULT 50000000, prize_runnerup INTEGER DEFAULT 25000000, status TEXT DEFAULT 'setup', created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS clubs (id INTEGER PRIMARY KEY AUTOINCREMENT, league_id INTEGER, real_id INTEGER, name TEXT NOT NULL, short_name TEXT, city TEXT, country TEXT, color TEXT DEFAULT '⚽', stadium TEXT DEFAULT 'Stadion Utama', stadium_cap INTEGER DEFAULT 30000, reputation INTEGER DEFAULT 50, balance INTEGER DEFAULT 10000000, wage_budget INTEGER DEFAULT 1000000, transfer_budget INTEGER DEFAULT 5000000, formation TEXT DEFAULT '4-3-3', tactic_style TEXT DEFAULT 'balanced', pressing INTEGER DEFAULT 50, tempo INTEGER DEFAULT 50, width INTEGER DEFAULT 50, is_user INTEGER DEFAULT 0, user_phone TEXT, manager_name TEXT DEFAULT 'Manajer', morale INTEGER DEFAULT 70, played INTEGER DEFAULT 0, won INTEGER DEFAULT 0, drawn INTEGER DEFAULT 0, lost INTEGER DEFAULT 0, gf INTEGER DEFAULT 0, ga INTEGER DEFAULT 0, points INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS players (id INTEGER PRIMARY KEY AUTOINCREMENT, real_id INTEGER, club_id INTEGER, name TEXT NOT NULL, short_name TEXT, nationality TEXT, position TEXT, age INTEGER DEFAULT 23, height INTEGER DEFAULT 178, weight INTEGER DEFAULT 75, overall INTEGER DEFAULT 70, potential INTEGER DEFAULT 75, pace INTEGER DEFAULT 70, shooting INTEGER DEFAULT 65, passing INTEGER DEFAULT 65, dribbling INTEGER DEFAULT 65, defending INTEGER DEFAULT 50, physical INTEGER DEFAULT 70, market_value INTEGER DEFAULT 1000000, wage INTEGER DEFAULT 50000, contract_end INTEGER DEFAULT 2026, form INTEGER DEFAULT 70, morale INTEGER DEFAULT 70, fatigue INTEGER DEFAULT 0, injury_until TEXT, injury_type TEXT, suspended_until INTEGER DEFAULT 0, yellow_cards INTEGER DEFAULT 0, red_cards INTEGER DEFAULT 0, goals INTEGER DEFAULT 0, assists INTEGER DEFAULT 0, appearances INTEGER DEFAULT 0, clean_sheets INTEGER DEFAULT 0, avg_rating REAL DEFAULT 0);
    CREATE TABLE IF NOT EXISTS matches (id INTEGER PRIMARY KEY AUTOINCREMENT, league_id INTEGER, competition TEXT DEFAULT 'league', matchday INTEGER, home_club_id INTEGER, away_club_id INTEGER, home_score INTEGER, away_score INTEGER, home_xg REAL, away_xg REAL, status TEXT DEFAULT 'scheduled', current_minute INTEGER DEFAULT 0, current_half INTEGER DEFAULT 1, home_subs_used INTEGER DEFAULT 0, away_subs_used INTEGER DEFAULT 0, match_state TEXT, match_log TEXT, user_pending TEXT, home_lineup TEXT, away_lineup TEXT, home_formation TEXT, away_formation TEXT, played_at TEXT);
    CREATE TABLE IF NOT EXISTS transfers (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER, from_club_id INTEGER, to_club_id INTEGER, fee INTEGER DEFAULT 0, wage INTEGER DEFAULT 0, contract_years INTEGER DEFAULT 3, type TEXT DEFAULT 'permanent', status TEXT DEFAULT 'pending', initiated_by INTEGER, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS sessions (phone TEXT PRIMARY KEY, club_id INTEGER, league_id INTEGER, state TEXT DEFAULT 'idle', state_data TEXT, last_active TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS fixtures (id INTEGER PRIMARY KEY AUTOINCREMENT, league_id INTEGER, matchday INTEGER, home_club_id INTEGER, away_club_id INTEGER, match_id INTEGER);
    CREATE TABLE IF NOT EXISTS trophies (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, name TEXT, season INTEGER);
    CREATE TABLE IF NOT EXISTS press_events (id INTEGER PRIMARY KEY AUTOINCREMENT, match_id INTEGER, club_id INTEGER, type TEXT, choice TEXT, effect TEXT, created_at TEXT DEFAULT (datetime('now')));
    CREATE TABLE IF NOT EXISTS match_events (id INTEGER PRIMARY KEY AUTOINCREMENT, match_id INTEGER, minute INTEGER, type TEXT, club_id INTEGER, player_id INTEGER, detail TEXT);
  `);

  let totalClubs = 0;
  let totalPlayers = 0;

  for (const [country, config] of Object.entries(LEAGUES_TO_IMPORT)) {
    console.log(`\n🌍 Mengimport ${config.leagueName} (${country})...`);

    let leaguePlayers = playerData.filter(p => {
      const league = (p.league_name || '').trim();
      const club = (p.club_name || '').trim();
      return league === config.leagueKey && club !== '';
    });

    if (config.clubWhitelist) {
      leaguePlayers = leaguePlayers.filter(p =>
        config.clubWhitelist.has(p.club_name.trim())
      );
    }

    if (leaguePlayers.length === 0) {
      console.log(`   ❌ Tidak ada pemain ditemukan. Skipping...`);
      continue;
    }

    console.log(`   ✅ ${leaguePlayers.length} pemain ditemukan`);

    const leagueResult = db.prepare(`
      INSERT INTO leagues (name, country, status) VALUES (?, ?, 'setup')
    `).run(config.leagueName, country);
    const leagueId = leagueResult.lastInsertRowid;

    const clubMap = {};
    for (const p of leaguePlayers) {
      const clubName = p.club_name.trim();
      if (!clubMap[clubName]) clubMap[clubName] = [];
      clubMap[clubName].push(p);
    }

    const sortedClubs = Object.entries(clubMap).sort((a, b) => {
      const avgA = a[1].reduce((s, p) => s + (parseInt(p.overall) || 65), 0) / a[1].length;
      const avgB = b[1].reduce((s, p) => s + (parseInt(p.overall) || 65), 0) / b[1].length;
      return avgB - avgA;
    });

    let colorIdx = 0;
    let clubCount = 0;

    console.log(`\n   ${'Klub'.padEnd(35)} ${'OVR'.padEnd(5)} ${'Transfer'.padEnd(10)} ${'Wage/mgg'.padEnd(10)} Kas`);
    console.log(`   ${'─'.repeat(70)}`);

    for (const [clubName, clubPlayers] of sortedClubs) {
      if (clubCount >= config.teamCount) break;

      const rep = Math.round(
        clubPlayers.reduce((s, p) => s + (parseInt(p.overall) || 65), 0) / clubPlayers.length
      );

      // Hitung rata-rata nilai pasar dari data FIFA (pakai fallback jika kosong)
      const avgSquadValue = clubPlayers.reduce((s, p) => {
        const v = parseFloat(p.value_eur) || 0;
        const fallback = Math.floor(Math.pow((parseInt(p.overall) || 65) / 50, 3) * 1_000_000);
        return s + (v > 0 ? v : fallback);
      }, 0) / (clubPlayers.length || 1);

      const budget = getBudget(rep, avgSquadValue);

      const clubResult = db.prepare(`
        INSERT INTO clubs (league_id, name, short_name, country, color, reputation, balance, transfer_budget, wage_budget)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        leagueId,
        clubName,
        clubName.substring(0, 3).toUpperCase(),
        country,
        CLUB_COLORS[colorIdx % CLUB_COLORS.length],
        Math.min(99, Math.max(40, rep)),
        budget.balance,
        budget.transfer,
        budget.wage,
      );
      const clubId = clubResult.lastInsertRowid;
      colorIdx++;
      clubCount++;
      totalClubs++;

      const topPlayers = clubPlayers
        .sort((a, b) => (parseInt(b.overall) || 65) - (parseInt(a.overall) || 65))
        .slice(0, 25);

      for (const p of topPlayers) {
        const overall = parseInt(p.overall) || 65;
        const potential = parseInt(p.potential) || overall;
        const pace = parseInt(p.pace) || 65;
        const shooting = parseInt(p.shooting) || 65;
        const passing = parseInt(p.passing) || 65;
        const dribbling = parseInt(p.dribbling) || 65;
        const defending = parseInt(p.defending) || 50;
        const physical = parseInt(p.physic) || 65;
        const age = parseInt(p.age) || 23;
        const height = parseInt(p.height_cm) || 178;
        const weight = parseInt(p.weight_kg) || 75;
        const wage = parseInt(p.wage_eur) || Math.round(overall * overall * 5);
        let mv = parseFloat(p.value_eur) || 0;
        if (mv === 0) mv = Math.floor(Math.pow(overall / 50, 3) * 1_000_000);

        db.prepare(`
          INSERT INTO players (real_id, club_id, name, short_name, nationality, position, age,
            height, weight, overall, potential, pace, shooting, passing, dribbling, defending, physical,
            market_value, wage, contract_end)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          parseInt(p.player_id) || 0,
          clubId,
          p.long_name || p.short_name || 'Unknown',
          p.short_name || 'Unknown',
          p.nationality_name || country,
          normalizePosition(p.player_positions?.split(',')[0]?.trim() || 'CM'),
          age, height, weight,
          overall, potential,
          pace, shooting, passing, dribbling, defending, physical,
          mv, wage,
          new Date().getFullYear() + Math.floor(Math.random() * 4) + 1,
        );
        totalPlayers++;
      }

      process.stdout.write(
        `   ${clubName.padEnd(35)} ${String(rep).padEnd(5)} ` +
        `${fmtM(budget.transfer).padEnd(10)} ${fmtM(budget.wage).padEnd(10)} ${fmtM(budget.balance)}\n`
      );
    }

    console.log(`\n   📊 ${clubCount} klub diimport untuk ${config.leagueName}`);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`✅ Import selesai!`);
  console.log(`   🏟️  ${totalClubs} klub`);
  console.log(`   👤 ${totalPlayers} pemain`);
  console.log(`\nJalankan 'npm start' untuk mulai bot!`);
  db.close();
}

importData().catch(err => {
  console.error('❌ Import gagal:', err.message);
  process.exit(1);
});