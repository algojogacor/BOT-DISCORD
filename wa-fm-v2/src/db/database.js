// src/db/database.js — Schema lengkap Football Manager v2

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { applyPatches } from './schema_patch.js';
import { Buffer } from 'buffer';

// node:sqlite on Windows may return UTF-8 bytes decoded as latin1.
// This function re-encodes them correctly.
function fixStr(s) {
  if (typeof s !== 'string') return s;
  try {
    const buf = Buffer.from(s, 'latin1');
    const decoded = buf.toString('utf-8');
    // If decoding produces valid chars and is different, use it
    if (decoded !== s && !decoded.includes('\ufffd')) return decoded;
  } catch (_) { }
  return s;
}

function fixRow(row) {
  if (!row || typeof row !== 'object') return row;
  for (const key of Object.keys(row)) {
    if (typeof row[key] === 'string') row[key] = fixStr(row[key]);
  }
  return row;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');
const DB_PATH = join(DATA_DIR, 'game.db');

let db;

export function initDB() {
  mkdirSync(DATA_DIR, { recursive: true });
  db = new DatabaseSync(DB_PATH);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`);
  db.exec(`
  CREATE TABLE IF NOT EXISTS leagues (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, country TEXT DEFAULT 'Indonesia',
    season INTEGER DEFAULT 1, current_matchday INTEGER DEFAULT 1, total_matchdays INTEGER DEFAULT 34,
    prize_champion INTEGER DEFAULT 50000000, status TEXT DEFAULT 'setup', created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS clubs (
    id INTEGER PRIMARY KEY AUTOINCREMENT, league_id INTEGER, real_id INTEGER,
    name TEXT NOT NULL, short_name TEXT, city TEXT, country TEXT, color TEXT DEFAULT '⚽',
    stadium TEXT DEFAULT 'Stadion Utama', stadium_cap INTEGER DEFAULT 30000,
    reputation INTEGER DEFAULT 50, balance INTEGER DEFAULT 10000000,
    wage_budget INTEGER DEFAULT 1000000, transfer_budget INTEGER DEFAULT 5000000,
    formation TEXT DEFAULT '4-3-3', tactic_style TEXT DEFAULT 'balanced',
    pressing INTEGER DEFAULT 50, tempo INTEGER DEFAULT 50, width INTEGER DEFAULT 50,
    is_user INTEGER DEFAULT 0, user_phone TEXT, manager_name TEXT DEFAULT 'Manajer',
    morale INTEGER DEFAULT 70, played INTEGER DEFAULT 0, won INTEGER DEFAULT 0,
    drawn INTEGER DEFAULT 0, lost INTEGER DEFAULT 0, gf INTEGER DEFAULT 0,
    ga INTEGER DEFAULT 0, points INTEGER DEFAULT 0,
    FOREIGN KEY(league_id) REFERENCES leagues(id)
  );
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT, real_id INTEGER, club_id INTEGER,
    name TEXT NOT NULL, short_name TEXT, nationality TEXT, position TEXT,
    age INTEGER DEFAULT 23, height INTEGER DEFAULT 178, weight INTEGER DEFAULT 75,
    overall INTEGER DEFAULT 70, potential INTEGER DEFAULT 75,
    pace INTEGER DEFAULT 70, shooting INTEGER DEFAULT 65, passing INTEGER DEFAULT 65,
    dribbling INTEGER DEFAULT 65, defending INTEGER DEFAULT 50, physical INTEGER DEFAULT 70,
    market_value INTEGER DEFAULT 1000000, wage INTEGER DEFAULT 50000,
    contract_end INTEGER DEFAULT 2026,
    form INTEGER DEFAULT 70, morale INTEGER DEFAULT 70,
    fatigue INTEGER DEFAULT 0, condition INTEGER DEFAULT 100,
    role TEXT DEFAULT NULL,
    injury_until TEXT, injury_type TEXT,
    suspended_until INTEGER DEFAULT 0, yellow_cards INTEGER DEFAULT 0, red_cards INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0, assists INTEGER DEFAULT 0, appearances INTEGER DEFAULT 0,
    clean_sheets INTEGER DEFAULT 0, avg_rating REAL DEFAULT 0,
    FOREIGN KEY(club_id) REFERENCES clubs(id)
  );
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT, league_id INTEGER, competition TEXT DEFAULT 'league',
    matchday INTEGER, home_club_id INTEGER, away_club_id INTEGER,
    home_score INTEGER, away_score INTEGER, home_xg REAL, away_xg REAL,
    status TEXT DEFAULT 'scheduled', current_minute INTEGER DEFAULT 0,
    current_half INTEGER DEFAULT 1, home_subs_used INTEGER DEFAULT 0, away_subs_used INTEGER DEFAULT 0,
    match_state TEXT, match_log TEXT, user_pending TEXT,
    home_lineup TEXT, away_lineup TEXT, home_formation TEXT, away_formation TEXT, played_at TEXT,
    FOREIGN KEY(league_id) REFERENCES leagues(id),
    FOREIGN KEY(home_club_id) REFERENCES clubs(id),
    FOREIGN KEY(away_club_id) REFERENCES clubs(id)
  );
  CREATE TABLE IF NOT EXISTS transfers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER, from_club_id INTEGER,
    to_club_id INTEGER, fee INTEGER DEFAULT 0, wage INTEGER DEFAULT 0,
    contract_years INTEGER DEFAULT 3, type TEXT DEFAULT 'permanent',
    status TEXT DEFAULT 'pending', initiated_by INTEGER, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS sessions (
    phone TEXT PRIMARY KEY, club_id INTEGER, league_id INTEGER,
    state TEXT DEFAULT 'idle', state_data TEXT, last_active TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS trophies (
    id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, name TEXT, season INTEGER
  );
  CREATE TABLE IF NOT EXISTS match_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, match_id INTEGER, minute INTEGER,
    type TEXT, club_id INTEGER, player_id INTEGER, detail TEXT
  );
  CREATE TABLE IF NOT EXISTS press_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT, match_id INTEGER, club_id INTEGER,
    type TEXT, choice TEXT, effect TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS scouts (
    id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, name TEXT NOT NULL,
    ability INTEGER DEFAULT 60, country TEXT, cost INTEGER DEFAULT 5000
  );
  CREATE TABLE IF NOT EXISTS scouting_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT, scout_id INTEGER, club_id INTEGER,
    target_player_id INTEGER, target_region TEXT,
    assigned_matchday INTEGER, complete_matchday INTEGER,
    status TEXT DEFAULT 'scouting', report TEXT
  );
  CREATE TABLE IF NOT EXISTS scouted_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, player_id INTEGER,
    revealed_overall INTEGER, revealed_potential INTEGER, scouted_at INTEGER, notes TEXT
  );
  CREATE TABLE IF NOT EXISTS youth_players (
    id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, name TEXT NOT NULL,
    position TEXT, age INTEGER DEFAULT 16, overall INTEGER DEFAULT 55,
    potential INTEGER DEFAULT 75, nationality TEXT, joined_season INTEGER, promoted INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS tactical_familiarity (
    id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, formation TEXT,
    familiarity INTEGER DEFAULT 0, matches_played INTEGER DEFAULT 0,
    UNIQUE(club_id, formation)
  );
  CREATE TABLE IF NOT EXISTS managers (
    phone TEXT PRIMARY KEY, name TEXT DEFAULT 'Manajer', nationality TEXT DEFAULT 'Indonesia',
    reputation INTEGER DEFAULT 30, seasons_managed INTEGER DEFAULT 0,
    trophies INTEGER DEFAULT 0, current_club_id INTEGER,
    job_status TEXT DEFAULT 'employed', history TEXT
  );
  `);
  applyPatches(db);
  return db;
}

export function getDB() { if (!db) initDB(); return db; }

// ─── Generic helpers ──────────────────────────────────────────────────────────
export function dbGet(sql, ...params) {
  const row = getDB().prepare(sql).get(...params);
  return fixRow(row);
}
export function dbAll(sql, ...params) {
  const rows = getDB().prepare(sql).all(...params);
  return rows.map(fixRow);
}
export function dbRun(sql, ...params) { return getDB().prepare(sql).run(...params); }

// ─── Sessions ─────────────────────────────────────────────────────────────────
export function getSession(phone) { return dbGet(`SELECT * FROM sessions WHERE phone = ?`, phone); }
export function setSession(phone, data) {
  const ex = dbGet(`SELECT phone FROM sessions WHERE phone = ?`, phone);
  if (ex) {
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    dbRun(`UPDATE sessions SET ${sets}, last_active = datetime('now') WHERE phone = ?`, ...Object.values(data), phone);
  } else {
    const cols = Object.keys(data).join(', ');
    const phs = Object.keys(data).map(() => '?').join(', ');
    dbRun(`INSERT INTO sessions (phone, ${cols}) VALUES (?, ${phs})`, phone, ...Object.values(data));
  }
}
export function clearSessionState(phone) {
  dbRun(`UPDATE sessions SET state = 'idle', state_data = NULL WHERE phone = ?`, phone);
}

// ─── Clubs ────────────────────────────────────────────────────────────────────
export function getClub(id) { return dbGet(`SELECT * FROM clubs WHERE id = ?`, id); }
export function getClubByPhone(phone) { return dbGet(`SELECT * FROM clubs WHERE user_phone = ?`, phone); }
export function getLeagueClubs(lid) {
  return dbAll(`SELECT * FROM clubs WHERE league_id = ? ORDER BY points DESC, (gf-ga) DESC, gf DESC`, lid);
}
export function getUserClubs() { return dbAll(`SELECT * FROM clubs WHERE is_user = 1`); }
export function updateClub(id, data) {
  const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
  dbRun(`UPDATE clubs SET ${sets} WHERE id = ?`, ...Object.values(data), id);
}

// ─── Players ──────────────────────────────────────────────────────────────────
export function getPlayer(id) { return dbGet(`SELECT * FROM players WHERE id = ?`, id); }
export function getClubPlayers(cid) { return dbAll(`SELECT * FROM players WHERE club_id = ? ORDER BY overall DESC`, cid); }
export function getAvailablePlayers(cid) {
  const club = getClub(cid);
  const league = club?.league_id ? dbGet(`SELECT current_matchday FROM leagues WHERE id = ?`, club.league_id) : { current_matchday: 1 };
  return dbAll(`
    SELECT * FROM players
    WHERE club_id = ? AND injury_until IS NULL AND (suspended_until IS NULL OR suspended_until <= ?)
    ORDER BY overall DESC
  `, cid, league?.current_matchday || 1);
}
export function updatePlayer(id, data) {
  const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
  dbRun(`UPDATE players SET ${sets} WHERE id = ?`, ...Object.values(data), id);
}

// ─── Leagues ──────────────────────────────────────────────────────────────────
export function getLeague(id) { return dbGet(`SELECT * FROM leagues WHERE id = ?`, id); }
export function getActiveLeague() { return dbGet(`SELECT * FROM leagues WHERE status = 'active' ORDER BY id DESC LIMIT 1`); }
export function updateLeague(id, data) {
  const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
  dbRun(`UPDATE leagues SET ${sets} WHERE id = ?`, ...Object.values(data), id);
}

// ─── Matches ──────────────────────────────────────────────────────────────────
export function getMatch(id) { return dbGet(`SELECT * FROM matches WHERE id = ?`, id); }
export function getMatchesByMatchday(lid, md) {
  return dbAll(`
    SELECT m.*,
      hc.name as home_name, hc.short_name as home_short, hc.color as home_color, hc.is_user as home_is_user, hc.formation as home_formation,
      ac.name as away_name, ac.short_name as away_short, ac.color as away_color, ac.is_user as away_is_user, ac.formation as away_formation
    FROM matches m
    JOIN clubs hc ON m.home_club_id = hc.id
    JOIN clubs ac ON m.away_club_id = ac.id
    WHERE m.league_id = ? AND m.matchday = ?
    ORDER BY m.id
  `, lid, md);
}
export function updateMatch(id, data) {
  const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
  dbRun(`UPDATE matches SET ${sets} WHERE id = ?`, ...Object.values(data), id);
}

// ─── Transfers ────────────────────────────────────────────────────────────────
export function getPendingTransfers(clubId) {
  return dbAll(`
    SELECT t.*, p.name as player_name, p.position, p.overall,
      fc.name as from_club, tc.name as to_club
    FROM transfers t JOIN players p ON t.player_id = p.id
    JOIN clubs fc ON t.from_club_id = fc.id JOIN clubs tc ON t.to_club_id = tc.id
    WHERE (t.to_club_id = ? OR t.from_club_id = ?) AND t.status = 'pending'
  `, clubId, clubId);
}