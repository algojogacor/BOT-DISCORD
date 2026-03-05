// src/db/schema_patch.js — Patch schema (safe, idempotent)
export function applyPatches(db) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS scouts (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, name TEXT NOT NULL, ability INTEGER DEFAULT 60, country TEXT, cost INTEGER DEFAULT 5000)`,
    `CREATE TABLE IF NOT EXISTS scouting_assignments (id INTEGER PRIMARY KEY AUTOINCREMENT, scout_id INTEGER, club_id INTEGER, target_player_id INTEGER, target_region TEXT, assigned_matchday INTEGER, complete_matchday INTEGER, status TEXT DEFAULT 'scouting', report TEXT)`,
    `CREATE TABLE IF NOT EXISTS scouted_players (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, player_id INTEGER, revealed_overall INTEGER, revealed_potential INTEGER, scouted_at INTEGER, notes TEXT)`,
    `CREATE TABLE IF NOT EXISTS youth_players (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, name TEXT NOT NULL, position TEXT, age INTEGER DEFAULT 16, overall INTEGER DEFAULT 55, potential INTEGER DEFAULT 75, nationality TEXT, joined_season INTEGER, promoted INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS tactical_familiarity (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, formation TEXT, familiarity INTEGER DEFAULT 0, matches_played INTEGER DEFAULT 0, UNIQUE(club_id, formation))`,
    `CREATE TABLE IF NOT EXISTS managers (phone TEXT PRIMARY KEY, name TEXT DEFAULT 'Manajer', nationality TEXT DEFAULT 'Indonesia', reputation INTEGER DEFAULT 30, seasons_managed INTEGER DEFAULT 0, trophies INTEGER DEFAULT 0, current_club_id INTEGER, job_status TEXT DEFAULT 'employed', history TEXT)`,
    `CREATE TABLE IF NOT EXISTS board_targets (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, league_id INTEGER, pos_target INTEGER DEFAULT 10, cup_target TEXT DEFAULT 'qf', description TEXT, confidence INTEGER DEFAULT 50, UNIQUE(club_id))`,
    `CREATE TABLE IF NOT EXISTS cups (id INTEGER PRIMARY KEY AUTOINCREMENT, league_id INTEGER, type TEXT DEFAULT 'domestic', name TEXT, current_round TEXT DEFAULT 'R1', status TEXT DEFAULT 'active', winner_id INTEGER)`,
    `CREATE TABLE IF NOT EXISTS cup_entries (id INTEGER PRIMARY KEY AUTOINCREMENT, cup_id INTEGER, club_id INTEGER, round TEXT, group_name TEXT, match_id INTEGER, status TEXT DEFAULT 'active', gs_pts INTEGER DEFAULT 0, gs_played INTEGER DEFAULT 0, gs_gf INTEGER DEFAULT 0, gs_ga INTEGER DEFAULT 0)`,
    `CREATE TABLE IF NOT EXISTS finance_log (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, type TEXT, amount INTEGER, description TEXT, created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS ai_approaches (id INTEGER PRIMARY KEY AUTOINCREMENT, player_id INTEGER, from_club_id INTEGER, to_club_id INTEGER, offer_fee INTEGER, offer_wage INTEGER, status TEXT DEFAULT 'pending', created_at TEXT DEFAULT (datetime('now')))`,
    `CREATE TABLE IF NOT EXISTS sponsors (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, name TEXT, type TEXT, upfront INTEGER DEFAULT 0, win_bonus INTEGER DEFAULT 0, goal_bonus INTEGER DEFAULT 0, objective TEXT, obj_bonus INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1)`,
    `CREATE TABLE IF NOT EXISTS rivalries (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id_1 INTEGER, club_id_2 INTEGER, rivalry_name TEXT, intensity INTEGER DEFAULT 100, UNIQUE(club_id_1, club_id_2))`,
    `CREATE TABLE IF NOT EXISTS backroom_staff (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, name TEXT, role TEXT, rating INTEGER DEFAULT 50, wage INTEGER DEFAULT 5000)`,
  ];
  for (const sql of tables) { try { db.exec(sql); } catch (_) { } }

  const cols = [
    `ALTER TABLE players ADD COLUMN fatigue INTEGER DEFAULT 0`,
    `ALTER TABLE players ADD COLUMN condition INTEGER DEFAULT 100`,
    `ALTER TABLE players ADD COLUMN role TEXT DEFAULT NULL`,
    `ALTER TABLE players ADD COLUMN is_captain INTEGER DEFAULT 0`,
    // New Realism columns for players
    `ALTER TABLE players ADD COLUMN loyalty INTEGER DEFAULT 50`,
    `ALTER TABLE players ADD COLUMN professionalism INTEGER DEFAULT 50`,
    `ALTER TABLE players ADD COLUMN injury_proneness INTEGER DEFAULT 50`,
    `ALTER TABLE players ADD COLUMN loan_club_id INTEGER DEFAULT NULL`,
    `ALTER TABLE clubs ADD COLUMN captain_id INTEGER`,
    `ALTER TABLE clubs ADD COLUMN penalty_taker INTEGER`,
    `ALTER TABLE clubs ADD COLUMN freekick_taker INTEGER`,
    `ALTER TABLE clubs ADD COLUMN corner_taker INTEGER`,
    `ALTER TABLE clubs ADD COLUMN last_weather TEXT`,
    `ALTER TABLE clubs ADD COLUMN current_cup_round TEXT`,
    // New Realism columns for clubs
    `ALTER TABLE clubs ADD COLUMN stadium_level INTEGER DEFAULT 1`,
    `ALTER TABLE clubs ADD COLUMN academy_level INTEGER DEFAULT 1`,
    `ALTER TABLE clubs ADD COLUMN training_facilities INTEGER DEFAULT 1`,
    `ALTER TABLE clubs ADD COLUMN fanbase_trust INTEGER DEFAULT 50`,
    // New Realism columns for transfers
    `ALTER TABLE transfers ADD COLUMN release_clause INTEGER DEFAULT NULL`,
    `ALTER TABLE transfers ADD COLUMN sell_on_fee INTEGER DEFAULT 0`,
    `ALTER TABLE transfers ADD COLUMN goal_bonus INTEGER DEFAULT 0`,
    `ALTER TABLE transfers ADD COLUMN clean_sheet_bonus INTEGER DEFAULT 0`,
    // Next-Level Appends
    `ALTER TABLE players ADD COLUMN personality TEXT`,
    `ALTER TABLE players ADD COLUMN playstyle_trait TEXT`,
  ];
  for (const sql of cols) { try { db.exec(sql); } catch (_) { } }
}