// src/engine/cup.js — Domestic Cup & Champions League

import { dbGet, dbAll, dbRun, getClub, getLeague, getAvailablePlayers } from '../db/database.js';
import { simulateUntilDecision, formatMatchReport } from './match.js';
import { applyStandings } from './league.js';
import { applyMatchFatigue } from './stamina.js';
import { updateTacticalFamiliarity } from './scouting.js';
import { formatMoney } from './transfer.js';

// ─── Cup Config ───────────────────────────────────────────────────────────────
export const CUP_CONFIGS = {
  domestic: {
    name: 'Piala Domestik',
    emoji: '🏆',
    rounds: ['R1','R2','R3','QF','SF','F'],
    prizePerRound: { R1:50_000, R2:100_000, R3:200_000, QF:500_000, SF:1_000_000, F:3_000_000 },
    winnerBonus: 5_000_000,
  },
  champions: {
    name: 'Champions League',
    emoji: '⭐',
    rounds: ['GS','R16','QF','SF','F'],
    prizePerRound: { GS:2_000_000, R16:3_000_000, QF:5_000_000, SF:8_000_000, F:12_000_000 },
    winnerBonus: 20_000_000,
  },
  europa: {
    name: 'Europa League',
    emoji: '🟠',
    rounds: ['GS','R32','R16','QF','SF','F'],
    prizePerRound: { GS:500_000, R32:1_000_000, R16:2_000_000, QF:3_000_000, SF:5_000_000, F:8_000_000 },
    winnerBonus: 10_000_000,
  },
};

// ─── Setup Domestic Cup ───────────────────────────────────────────────────────
export function setupDomesticCup(leagueId) {
  const clubs = dbAll(`SELECT * FROM clubs WHERE league_id = ?`, leagueId);
  if (clubs.length < 4) return null;

  // Buat cup baru
  dbRun(`INSERT INTO cups (league_id, type, name, current_round, status) VALUES (?, 'domestic', ?, 'R1', 'active')`,
    leagueId, CUP_CONFIGS.domestic.name);
  const cup = dbGet(`SELECT * FROM cups ORDER BY id DESC LIMIT 1`);

  // Shuffle clubs untuk draw
  const shuffled = [...clubs].sort(() => Math.random() - 0.5);

  // Generate R1 fixtures (matchday cup akan diselipkan di MD 5, 10, 17, 22, 28, 34)
  const CUP_MATCHDAYS = { R1:5, R2:10, R3:17, QF:22, SF:28, F:34 };
  const pairs = [];
  for (let i = 0; i < shuffled.length - 1; i += 2) {
    pairs.push({ home: shuffled[i].id, away: shuffled[i+1].id });
  }
  // Jika ganjil, satu tim dapat bye
  if (shuffled.length % 2 === 1) {
    const byeTeam = shuffled[shuffled.length - 1];
    dbRun(`INSERT INTO cup_entries (cup_id, club_id, round, status) VALUES (?, ?, 'R2', 'bye')`,
      cup.id, byeTeam.id);
  }

  for (const p of pairs) {
    dbRun(`
      INSERT INTO matches (league_id, competition, matchday, home_club_id, away_club_id, status)
      VALUES (?, 'cup', ?, ?, ?, 'scheduled')
    `, leagueId, CUP_MATCHDAYS.R1, p.home, p.away);
    const m = dbGet(`SELECT id FROM matches ORDER BY id DESC LIMIT 1`);
    dbRun(`INSERT INTO cup_entries (cup_id, club_id, round, match_id, status) VALUES (?, ?, 'R1', ?, 'active')`,
      cup.id, p.home, m.id);
    dbRun(`INSERT INTO cup_entries (cup_id, club_id, round, match_id, status) VALUES (?, ?, 'R1', ?, 'active')`,
      cup.id, p.away, m.id);
  }

  return cup;
}

// ─── Setup Champions League ───────────────────────────────────────────────────
export function setupChampionsLeague(prevSeasonClubs) {
  // prevSeasonClubs: [{clubId, leagueId, finalRank}] — top 4 dari setiap liga
  const qualified = prevSeasonClubs.filter(c => c.finalRank <= 4);
  if (qualified.length < 8) return null;

  dbRun(`INSERT INTO cups (league_id, type, name, current_round, status) VALUES (0, 'champions', 'UEFA Champions League', 'GS', 'active')`);
  const cup = dbGet(`SELECT * FROM cups ORDER BY id DESC LIMIT 1`);

  // Group stage: 4 grup, 4 tim per grup
  const shuffled = [...qualified].sort(() => Math.random() - 0.5).slice(0, 16);
  const groups   = ['A','B','C','D'];

  for (let g = 0; g < 4; g++) {
    const groupTeams = shuffled.slice(g * 4, g * 4 + 4);
    for (const team of groupTeams) {
      dbRun(`INSERT INTO cup_entries (cup_id, club_id, round, group_name, status, gs_pts) VALUES (?, ?, 'GS', ?, 'active', 0)`,
        cup.id, team.clubId, groups[g]);
    }

    // Generate 6 matchdays group stage (home & away round robin)
    const teamIds = groupTeams.map(t => t.clubId);
    const gsFixtures = generateGroupFixtures(teamIds);
    for (const f of gsFixtures) {
      dbRun(`INSERT INTO matches (league_id, competition, matchday, home_club_id, away_club_id, status) VALUES (0, 'champions', ?, ?, ?, 'scheduled')`,
        f.matchday, f.home, f.away);
    }
  }

  return cup;
}

function generateGroupFixtures(teams) {
  // 6 matchdays GS: MD 3,5,7,9,11,13 (relative to UCL calendar)
  const matchdays = [3,5,7,9,11,13];
  const fixtures  = [];
  const pairs     = [
    [0,1],[2,3],[0,2],[1,3],[0,3],[1,2],
  ];
  pairs.forEach((p, i) => {
    fixtures.push({ home: teams[p[0]], away: teams[p[1]], matchday: matchdays[i] });
    fixtures.push({ home: teams[p[1]], away: teams[p[0]], matchday: matchdays[i] + 1 });
  });
  return fixtures;
}

// ─── Simulate Cup Matchday ────────────────────────────────────────────────────
export function simulateCupMatchday(cupId, matchday) {
  const matches = dbAll(`
    SELECT m.*, hc.name as home_name, ac.name as away_name,
      hc.is_user as home_is_user, ac.is_user as away_is_user
    FROM matches m
    JOIN clubs hc ON m.home_club_id = hc.id
    JOIN clubs ac ON m.away_club_id = ac.id
    WHERE m.competition IN ('cup','champions','europa') AND m.matchday = ? AND m.status = 'scheduled'
  `, matchday);

  const results = [];
  for (const m of matches) {
    if (m.home_is_user || m.away_is_user) {
      results.push({ match: m, isUser: true });
      continue;
    }

    // AI vs AI cup match
    const homePlayers = getAvailablePlayers(m.home_club_id);
    const awayPlayers = getAvailablePlayers(m.away_club_id);
    const homeClub    = getClub(m.home_club_id);
    const awayClub    = getClub(m.away_club_id);

    const homeStr = Math.round(homePlayers.reduce((s, p) => s + (p.overall||65), 0) / (homePlayers.length||1));
    const awayStr = Math.round(awayPlayers.reduce((s, p) => s + (p.overall||65), 0) / (awayPlayers.length||1));

    let state = {
      homePlayers, awayPlayers, homeScore: 0, awayScore: 0,
      minute: 0, maxMinute: 45,
      homeTactic: homeClub?.tactic_style || 'balanced',
      awayTactic: awayClub?.tactic_style || 'balanced',
      homeStrength: homeStr, awayStrength: awayStr,
      homeSubsLeft: 5, awaySubsLeft: 5,
      isUserHome: false, isUserAway: false,
    };

    const r1 = simulateUntilDecision(state);
    state    = { ...state, homeScore: r1.hScore, awayScore: r1.aScore, minute: 45, maxMinute: 90 };
    const r2 = simulateUntilDecision(state);

    let hScore = r2.hScore, aScore = r2.aScore;

    // Extra time if draw in knockout
    const cup = dbGet(`SELECT * FROM cups WHERE id = ?`, cupId);
    if (hScore === aScore && cup?.current_round !== 'GS') {
      // Penalties
      const penHome = Math.floor(Math.random() * 3) + 3;
      const penAway = Math.floor(Math.random() * 3) + 3;
      hScore = penHome > penAway ? hScore + 1 : hScore;
      aScore = penAway > penHome ? aScore + 1 : aScore;
      if (penHome === penAway) {
        // sudden death: slight home advantage
        hScore += Math.random() > 0.5 ? 1 : 0;
        aScore += hScore === r2.hScore ? 1 : 0;
      }
    }

    dbRun(`UPDATE matches SET home_score=?, away_score=?, status='completed' WHERE id=?`,
      hScore, aScore, m.id);

    const winner = hScore > aScore ? m.home_club_id : m.away_club_id;
    const loser  = hScore > aScore ? m.away_club_id : m.home_club_id;

    // Update cup entries
    dbRun(`UPDATE cup_entries SET status='through' WHERE cup_id=? AND club_id=?`, cupId, winner);
    dbRun(`UPDATE cup_entries SET status='eliminated' WHERE cup_id=? AND club_id=?`, cupId, loser);

    // Prize money
    const cupCfg = dbGet(`SELECT type FROM cups WHERE id=?`, cupId);
    const cfg    = CUP_CONFIGS[cupCfg?.type || 'domestic'];
    const round  = cup?.current_round || 'R1';
    const prize  = cfg?.prizePerRound?.[round] || 0;
    if (prize > 0) {
      dbRun(`UPDATE clubs SET balance = balance + ? WHERE id = ?`, prize, winner);
      dbRun(`UPDATE clubs SET balance = balance + ? WHERE id = ?`, Math.floor(prize * 0.3), loser);
    }

    applyMatchFatigue(m.home_club_id, buildMinMap(homePlayers));
    applyMatchFatigue(m.away_club_id, buildMinMap(awayPlayers));

    const report = formatMatchReport(homeClub, awayClub, hScore, aScore,
      [...(r1.events||[]), ...(r2.events||[])], matchday);
    results.push({ match: m, hScore, aScore, winner, report, isUser: false });
  }

  return results;
}

// ─── Advance Cup Round ────────────────────────────────────────────────────────
export function advanceCupRound(cupId) {
  const cup       = dbGet(`SELECT * FROM cups WHERE id = ?`, cupId);
  if (!cup || cup.status !== 'active') return null;

  const roundOrder = ['R1','R2','R3','QF','SF','F'];
  const gsRounds   = ['GS','R16','QF','SF','F']; // UCL
  const isUCL      = cup.type === 'champions' || cup.type === 'europa';
  const rounds     = isUCL ? gsRounds : roundOrder;

  const curIdx     = rounds.indexOf(cup.current_round);
  if (curIdx === -1) return null;

  // Jika final sudah selesai → cup selesai
  if (cup.current_round === 'F') {
    const winner = dbGet(`SELECT club_id FROM cup_entries WHERE cup_id = ? AND status = 'through' ORDER BY id DESC LIMIT 1`, cupId);
    if (winner) {
      const cfg    = CUP_CONFIGS[cup.type];
      dbRun(`UPDATE clubs SET balance = balance + ? WHERE id = ?`, cfg.winnerBonus, winner.club_id);
      dbRun(`INSERT INTO trophies (club_id, name, season) VALUES (?, ?, ?)`,
        winner.club_id, cup.name, 1);
      dbRun(`UPDATE cups SET status='finished' WHERE id=?`, cupId);
      const winnerClub = getClub(winner.club_id);
      return { finished: true, winner: winnerClub, cupName: cup.name, bonus: cfg.winnerBonus };
    }
    return null;
  }

  // Advance ke ronde berikutnya
  const nextRound = rounds[curIdx + 1];
  const winners   = dbAll(`SELECT club_id FROM cup_entries WHERE cup_id = ? AND status = 'through'`, cupId);

  if (winners.length < 2) return null;

  dbRun(`UPDATE cups SET current_round = ? WHERE id = ?`, nextRound, cupId);

  // Generate fixtures for next round
  const CUP_MATCHDAYS_NEXT = { R2:10, R3:17, QF:22, SF:28, F:34, R16:18, };
  const nextMD = CUP_MATCHDAYS_NEXT[nextRound] || 30;

  const teams = [...winners].sort(() => Math.random() - 0.5);
  for (let i = 0; i < teams.length - 1; i += 2) {
    const home = teams[i].club_id;
    const away = teams[i+1].club_id;
    dbRun(`INSERT INTO matches (league_id, competition, matchday, home_club_id, away_club_id, status) VALUES (?, ?, ?, ?, ?, 'scheduled')`,
      cup.league_id || 0, cup.type === 'domestic' ? 'cup' : cup.type, nextMD, home, away);
    const m = dbGet(`SELECT id FROM matches ORDER BY id DESC LIMIT 1`);
    dbRun(`UPDATE cup_entries SET round = ?, match_id = ?, status = 'active' WHERE cup_id = ? AND club_id = ?`,
      nextRound, m.id, cupId, home);
    dbRun(`UPDATE cup_entries SET round = ?, match_id = ?, status = 'active' WHERE cup_id = ? AND club_id = ?`,
      nextRound, m.id, cupId, away);
  }

  return { nextRound, teamsLeft: teams.length };
}

// ─── Format Cup Standings (Group Stage) ──────────────────────────────────────
export function formatCupStandings(cupId) {
  const cup = dbGet(`SELECT * FROM cups WHERE id = ?`, cupId);
  if (!cup) return `❌ Cup tidak ditemukan.`;

  const entries = dbAll(`
    SELECT ce.*, c.name, c.color
    FROM cup_entries ce JOIN clubs c ON ce.club_id = c.id
    WHERE ce.cup_id = ? AND ce.round = 'GS'
    ORDER BY ce.group_name, ce.gs_pts DESC
  `, cupId);

  if (!entries.length) return `📊 Belum ada data grup.`;

  const groups = {};
  for (const e of entries) {
    if (!groups[e.group_name]) groups[e.group_name] = [];
    groups[e.group_name].push(e);
  }

  let msg = `${CUP_CONFIGS[cup.type]?.emoji || '🏆'} *${cup.name} — GRUP*\n\n`;
  for (const [grp, teams] of Object.entries(groups)) {
    msg += `*Grup ${grp}*\n`;
    teams.forEach((t, i) => {
      const q = i < 2 ? '✅' : '❌';
      msg += `${q} ${t.color} ${t.name} — ${t.gs_pts || 0}pts\n`;
    });
    msg += '\n';
  }
  return msg;
}

// ─── Format Cup Bracket ───────────────────────────────────────────────────────
export function formatCupBracket(leagueId) {
  const cups = dbAll(`SELECT * FROM cups WHERE league_id = ? AND status = 'active'`, leagueId);
  if (!cups.length) return `❌ Tidak ada kompetisi piala aktif.`;

  let msg = `🏆 *STATUS KOMPETISI PIALA*\n\n`;

  for (const cup of cups) {
    const cfg     = CUP_CONFIGS[cup.type] || CUP_CONFIGS.domestic;
    const entries = dbAll(`
      SELECT ce.status, c.name, c.color, c.is_user
      FROM cup_entries ce JOIN clubs c ON ce.club_id = c.id
      WHERE ce.cup_id = ? AND ce.status IN ('active','through','bye')
      ORDER BY c.reputation DESC
    `, cup.id);

    msg += `${cfg.emoji} *${cup.name}*\n`;
    msg += `Ronde: ${cup.current_round}\n`;
    msg += `Tim tersisa: ${entries.length}\n`;

    const userEntry = entries.find(e => e.is_user);
    if (userEntry) {
      msg += `👤 Kamu masih ada! (${userEntry.name})\n`;
    }
    msg += '\n';
  }

  return msg;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function buildMinMap(players) {
  const m = {};
  for (const p of (players||[])) if (p?.id) m[p.id] = 90;
  return m;
}