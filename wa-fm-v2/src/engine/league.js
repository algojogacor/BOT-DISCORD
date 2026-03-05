// src/engine/league.js — Liga Manager v2 (updated)

import {
  getDB, getLeague, updateLeague, getLeagueClubs, getMatchesByMatchday,
  updateClub, getClub, getAvailablePlayers, dbRun, dbGet, dbAll
} from '../db/database.js';
import { simulateUntilDecision, formatMatchReport, updatePlayerStats } from './match.js';
import { seasonPlayerDevelopment, retireOldPlayers, generateNewgens } from './transfer.js';
import { applyMatchFatigue, applyMatchdayRecovery, calcTeamEffectiveStrength } from './stamina.js';
import {
  updateTacticalFamiliarity, getTacticalFamiliarity,
  generateYouthIntake, processScoutReports
} from './scouting.js';
import { updateBoardConfidence, generateBoardTargets, applySeasonBonus, checkManagerFiring } from './board.js';
import { applyMatchRevenue, processWeeklyWages, distributeSeasonPrizes, refreshAIBudgets } from './finance.js';
import {
  updateSquadHarmony, assignCaptain, processInternationalBreak,
  generateMatchConditions, applyConditionsToStrength, runAITransferWindow,
  checkAIApproaches, assignSetPieceSpecialists, INTL_BREAK_MATCHDAYS
} from './squad.js';
import { setupDomesticCup, simulateCupMatchday, advanceCupRound } from './cup.js';
import { getStaffModifiers } from './staff.js';
import { processSponsorWinBonus } from './sponsor.js';

// ─── Round Robin Scheduler ────────────────────────────────────────────────────
export function generateSchedule(clubIds) {
  const teams = [...clubIds];
  if (teams.length % 2 !== 0) teams.push(null);
  const rounds = teams.length - 1;
  const half = teams.length / 2;
  const schedule = [];
  const rotate = [...teams];

  for (let r = 0; r < rounds; r++) {
    const matchday = [];
    for (let i = 0; i < half; i++) {
      const home = rotate[i];
      const away = rotate[rotate.length - 1 - i];
      if (home !== null && away !== null) matchday.push({ home, away });
    }
    schedule.push(matchday);
    const last = rotate.splice(rotate.length - 1, 1)[0];
    rotate.splice(1, 0, last);
  }

  const full = [...schedule];
  for (const md of schedule) {
    full.push(md.map(m => ({ home: m.away, away: m.home })));
  }
  return full;
}

// ─── Setup Liga ───────────────────────────────────────────────────────────────
export function setupLeague(leagueId) {
  const clubs = getLeagueClubs(leagueId);
  if (clubs.length < 2) return false;

  const ids = clubs.map(c => c.id);
  const schedule = generateSchedule(ids);

  const stmt = getDB().prepare(`
    INSERT INTO matches (league_id, matchday, home_club_id, away_club_id, status)
    VALUES (?, ?, ?, ?, 'scheduled')
  `);

  schedule.forEach((matchday, idx) => {
    for (const m of matchday) {
      stmt.run(leagueId, idx + 1, m.home, m.away);
    }
  });

  const total = schedule.length;
  updateLeague(leagueId, { status: 'active', current_matchday: 1, total_matchdays: total });
  return total;
}

// ─── Process Matchday ─────────────────────────────────────────────────────────
export function processMatchday(leagueId) {
  const league = getLeague(leagueId);
  if (!league || league.status !== 'active') return null;

  const matches = getMatchesByMatchday(leagueId, league.current_matchday);
  const aiResults = [];
  const userGames = [];

  for (const m of matches) {
    if (m.status === 'completed') {
      if (m.home_is_user || m.away_is_user) userGames.push(m);
      continue;
    }
    if (m.status === 'in_progress') {
      if (m.home_is_user || m.away_is_user) userGames.push(m);
      continue;
    }

    if (m.home_is_user || m.away_is_user) {
      dbRun(`UPDATE matches SET status = 'in_progress' WHERE id = ?`, m.id);
      userGames.push(m);
      continue;
    }

    // AI vs AI
    const homeClub = getClub(m.home_club_id);
    const awayClub = getClub(m.away_club_id);
    const homePlayers = getAvailablePlayers(m.home_club_id);
    const awayPlayers = getAvailablePlayers(m.away_club_id);

    // Tactical familiarity
    const homeFam = getTacticalFamiliarity(m.home_club_id, homeClub.formation || '4-3-3');
    const awayFam = getTacticalFamiliarity(m.away_club_id, awayClub.formation || '4-3-3');

    // Effective strength dengan stamina & familiarity
    const homeStr = calcTeamEffectiveStrength(homePlayers, homeFam);
    const awayStr = calcTeamEffectiveStrength(awayPlayers, awayFam);

    let state = {
      homePlayers, awayPlayers, homeScore: 0, awayScore: 0,
      minute: 0, maxMinute: 45,
      homeTactic: homeClub.tactic_style || 'balanced',
      awayTactic: awayClub.tactic_style || 'balanced',
      homeStrength: homeStr, awayStrength: awayStr,
      homeSubsLeft: 5, awaySubsLeft: 5,
      isUserHome: false, isUserAway: false,
    };

    const r1 = simulateUntilDecision(state);
    state = { ...state, homeScore: r1.hScore, awayScore: r1.aScore, minute: 45, maxMinute: 90 };
    const r2 = simulateUntilDecision(state);

    const allEvents = [...(r1.events || []), ...(r2.events || [])];
    const report = formatMatchReport(homeClub, awayClub, r2.hScore, r2.aScore, allEvents, league.current_matchday);

    dbRun(`UPDATE matches SET home_score=?, away_score=?, status='completed', match_log=?, played_at=datetime('now') WHERE id=?`,
      r2.hScore, r2.aScore, JSON.stringify(allEvents), m.id);

    applyStandings(leagueId, m.home_club_id, m.away_club_id, r2.hScore, r2.aScore);
    updatePlayerStats(allEvents, homePlayers, awayPlayers);

    // Apply fatigue ke pemain AI
    applyMatchFatigue(m.home_club_id, buildMinutesMap(homePlayers));
    applyMatchFatigue(m.away_club_id, buildMinutesMap(awayPlayers));

    // Update tactical familiarity
    updateTacticalFamiliarity(m.home_club_id, homeClub.formation || '4-3-3');
    updateTacticalFamiliarity(m.away_club_id, awayClub.formation || '4-3-3');

    aiResults.push({ match: m, hScore: r2.hScore, aScore: r2.aScore, report });
  }

  // Recovery untuk semua pemain
  applyMatchdayRecovery(leagueId);

  // Weekly wages (tiap matchday = 1 minggu game time)
  processWeeklyWages(leagueId);

  // Mid-season development (matchday 17)
  if (league.current_matchday === 17) {
    seasonPlayerDevelopment(leagueId, 'mid');
  }

  // International break (MD 9 & 25)
  let intlBreak = null;
  if (INTL_BREAK_MATCHDAYS.includes(league.current_matchday)) {
    intlBreak = processInternationalBreak(leagueId, league.current_matchday);
  }

  // Update squad harmony untuk semua klub
  const allClubs = dbAll(`SELECT * FROM clubs WHERE league_id = ?`, leagueId);
  for (const ac of allClubs) {
    updateSquadHarmony(ac.id);
    // Board confidence update untuk user clubs
    if (ac.is_user) {
      updateBoardConfidence(ac.id, leagueId);
    }
  }

  // Process scout reports yang sudah selesai
  const userClubs = dbAll(`SELECT * FROM clubs WHERE league_id = ? AND is_user = 1`, leagueId);
  for (const uc of userClubs) {
    processScoutReports(uc.id, league.current_matchday);
  }

  // Cup matchday check
  const cupResults = simulateCupMatchday(0, league.current_matchday);

  return { aiResults, userGames, matchday: league.current_matchday, intlBreak, cupResults };
}

// ─── Start User Match ─────────────────────────────────────────────────────────
export function startUserMatch(matchId, userClubId) {
  const match = dbGet(`SELECT * FROM matches WHERE id = ?`, matchId);
  if (!match) return null;

  const isHome = match.home_club_id === userClubId;
  const homeClub = getClub(match.home_club_id);
  const awayClub = getClub(match.away_club_id);
  const homePlayers = getAvailablePlayers(match.home_club_id);
  const awayPlayers = getAvailablePlayers(match.away_club_id);

  const homeFam = getTacticalFamiliarity(match.home_club_id, homeClub?.formation || '4-3-3');
  const awayFam = getTacticalFamiliarity(match.away_club_id, awayClub?.formation || '4-3-3');
  const homeStr = calcTeamEffectiveStrength(homePlayers, homeFam);
  const awayStr = calcTeamEffectiveStrength(awayPlayers, awayFam);

  // ── Derby Detection ──
  const rivalry = dbGet(`
    SELECT * FROM rivalries
    WHERE (club_id_1 = ? AND club_id_2 = ?) OR (club_id_1 = ? AND club_id_2 = ?)
  `, match.home_club_id, match.away_club_id, match.away_club_id, match.home_club_id);
  const isDerby = !!rivalry;
  const derbyIntensity = rivalry?.intensity || 0;

  // ── Staff Modifiers ──
  const homeStaffMods = getStaffModifiers(match.home_club_id);
  const awayStaffMods = getStaffModifiers(match.away_club_id);

  const state = {
    matchId, leagueId: match.league_id, userClubId, isHome,
    homePlayers, awayPlayers,
    homeScore: 0, awayScore: 0,
    minute: 0, maxMinute: 45, half: 1,
    homeTactic: homeClub?.tactic_style || 'balanced',
    awayTactic: awayClub?.tactic_style || 'balanced',
    homeStrength: homeStr, awayStrength: awayStr,
    homeSubsLeft: 5, awaySubsLeft: 5,
    isUserHome: isHome, isUserAway: !isHome,
    allEvents: [],
    isDerby, derbyIntensity,
    homeStaffMods, awayStaffMods,
  };

  return runMatchSegment(state);
}

function runMatchSegment(state) {
  const result = simulateUntilDecision(state);
  const allEvents = [...(state.allEvents || []), ...(result.events || [])];

  if (result.decisionPoint) {
    const userPlayers = state.isHome ? state.homePlayers : state.awayPlayers;
    const subsLeft = state.isHome ? state.homeSubsLeft : state.awaySubsLeft;
    return {
      done: false,
      state: { ...state, homeScore: result.hScore, awayScore: result.aScore, minute: result.minute, allEvents, pendingDecision: result.decisionPoint },
      events: result.events,
      hScore: result.hScore, aScore: result.aScore,
      decisionPoint: result.decisionPoint,
      userPlayers, subsLeft,
    };
  }

  // Halftime
  if (state.half === 1 && result.state !== 'fulltime') {
    return {
      done: false,
      isHalftime: true,
      state: { ...state, homeScore: result.hScore, awayScore: result.aScore, minute: 45, half: 1.5, allEvents, pendingDecision: { type: 'halftime', minute: 45 } },
      events: result.events,
      hScore: result.hScore, aScore: result.aScore,
      decisionPoint: { type: 'halftime', minute: 45 },
      userPlayers: state.isHome ? state.homePlayers : state.awayPlayers,
      subsLeft: state.isHome ? state.homeSubsLeft : state.awaySubsLeft,
    };
  }

  // Full time
  return finishMatch(state, result, allEvents);
}

function finishMatch(state, result, allEvents) {
  const match = dbGet(`SELECT * FROM matches WHERE id = ?`, state.matchId);
  if (!match) return { done: true, report: `Skor: ${result.hScore}-${result.aScore}`, hScore: result.hScore, aScore: result.aScore, allEvents };

  const homeClub = getClub(match.home_club_id);
  const awayClub = getClub(match.away_club_id);
  const league = getLeague(state.leagueId);

  dbRun(`UPDATE matches SET home_score=?, away_score=?, status='completed', match_log=?, played_at=datetime('now') WHERE id=?`,
    result.hScore, result.aScore, JSON.stringify(allEvents), state.matchId);
  applyStandings(state.leagueId, match.home_club_id, match.away_club_id, result.hScore, result.aScore);

  // Matchday revenue
  applyMatchRevenue(match.home_club_id, true, result.hScore, result.aScore);
  applyMatchRevenue(match.away_club_id, false, result.hScore, result.aScore);
  updatePlayerStats(allEvents, state.homePlayers, state.awayPlayers);

  // Fatigue
  applyMatchFatigue(match.home_club_id, buildMinutesMap(state.homePlayers));
  applyMatchFatigue(match.away_club_id, buildMinutesMap(state.awayPlayers));

  // Tactical familiarity
  updateTacticalFamiliarity(match.home_club_id, homeClub?.formation || '4-3-3');
  updateTacticalFamiliarity(match.away_club_id, awayClub?.formation || '4-3-3');

  const report = homeClub && awayClub
    ? formatMatchReport(homeClub, awayClub, result.hScore, result.aScore, allEvents, league?.current_matchday || 1)
    : `Skor akhir: ${result.hScore}-${result.aScore}`;

  // Sponsor win bonus for user clubs
  const userClubId = state.userClubId;
  if (userClubId) {
    const isWin = (state.isHome && result.hScore > result.aScore) || (!state.isHome && result.aScore > result.hScore);
    const userGoals = state.isHome ? result.hScore : result.aScore;
    if (isWin) {
      processSponsorWinBonus(userClubId, userGoals);
    }
  }

  return { done: true, report, hScore: result.hScore, aScore: result.aScore, allEvents, isDerby: state.isDerby, derbyIntensity: state.derbyIntensity };
}

function buildMinutesMap(players) {
  const map = {};
  for (const p of (players || [])) {
    if (p?.id) map[p.id] = 90;
  }
  return map;
}

// ─── Apply Standings ──────────────────────────────────────────────────────────
export function applyStandings(leagueId, homeClubId, awayClubId, hScore, aScore) {
  if (!homeClubId || !awayClubId) return;
  let hPts = 0, aPts = 0, hW = 0, hD = 0, hL = 0, aW = 0, aD = 0, aL = 0;
  if (hScore > aScore) { hPts = 3; hW = 1; aL = 1; }
  else if (hScore < aScore) { aPts = 3; aW = 1; hL = 1; }
  else { hPts = 1; aPts = 1; hD = 1; aD = 1; }
  dbRun(`UPDATE clubs SET played=played+1, won=won+?, drawn=drawn+?, lost=lost+?, gf=gf+?, ga=ga+?, points=points+? WHERE id=?`,
    hW, hD, hL, hScore, aScore, hPts, homeClubId);
  dbRun(`UPDATE clubs SET played=played+1, won=won+?, drawn=drawn+?, lost=lost+?, gf=gf+?, ga=ga+?, points=points+? WHERE id=?`,
    aW, aD, aL, aScore, hScore, aPts, awayClubId);
}

// ─── Try Advance Matchday ─────────────────────────────────────────────────────
export function tryAdvanceMatchday(leagueId) {
  const league = getLeague(leagueId);
  if (!league) return false;
  const matches = getMatchesByMatchday(leagueId, league.current_matchday);
  const allDone = matches.every(m => m.status === 'completed');
  if (!allDone) return false;

  if (league.current_matchday >= league.total_matchdays) {
    // End of season
    endOfSeason(leagueId, league);
    return 'finished';
  }

  updateLeague(leagueId, { current_matchday: league.current_matchday + 1 });
  return 'advanced';
}

// ─── End of Season ────────────────────────────────────────────────────────────
function endOfSeason(leagueId, league) {
  updateLeague(leagueId, { status: 'finished' });

  // End of season player development
  const devResult = seasonPlayerDevelopment(leagueId, 'end');

  // Distribute prize money
  const prizes = distributeSeasonPrizes(leagueId);

  // Retire old players & generate newgens
  const retired = retireOldPlayers(leagueId);
  if (retired.length > 0) generateNewgens(leagueId, retired.length);

  // AI transfer window
  const aiTransfers = runAITransferWindow(leagueId);

  // Refresh AI budgets for new season
  refreshAIBudgets(leagueId);

  // Youth intake
  const userClubs = dbAll(`SELECT * FROM clubs WHERE league_id = ? AND is_user = 1`, leagueId);
  for (const uc of userClubs) {
    generateYouthIntake(uc.id, league.season || 1);
    assignCaptain(uc.id);
    assignSetPieceSpecialists(uc.id);

    // Board season bonus/penalty
    const clubs2 = getLeagueClubs(leagueId);
    const finalRank = clubs2.findIndex(c => c.id === uc.id) + 1;
    applySeasonBonus(uc.id, finalRank, leagueId);

    // Generate board targets for next season
    generateBoardTargets(uc.id, leagueId);
  }

  // Trophy for champion
  const clubs = getLeagueClubs(leagueId);
  const champion = clubs[0];
  if (champion) {
    dbRun(`INSERT INTO trophies (club_id, name, season) VALUES (?, ?, ?)`,
      champion.id, league.name + ' Champion', league.season || 1);
  }

  return { devResult, retired, champion, prizes, aiTransfers };
}

// ─── Formatters ───────────────────────────────────────────────────────────────
export function formatStandings(leagueId) {
  const clubs = getLeagueClubs(leagueId);
  const league = getLeague(leagueId);
  let t = `🏆 *${league?.name || 'KLASEMEN'}*\n_MD ${(league?.current_matchday || 1) - 1}_\n`;
  t += `${'─'.repeat(40)}\n`;
  t += `   #  Tim              M  W  D  L  Pts\n`;
  t += `${'─'.repeat(40)}\n`;
  clubs.forEach((c, i) => {
    const u = c.is_user ? '👤' : '  ';
    const pos = String(i + 1).padStart(2);
    const nm = (c.name || '').substring(0, 12).padEnd(12);
    t += `${pos}${u} ${nm}  ${String(c.played).padStart(2)} ${String(c.won).padStart(2)} ${String(c.drawn).padStart(2)} ${String(c.lost).padStart(2)}  *${String(c.points).padStart(3)}*\n`;
  });
  t += `${'─'.repeat(40)}\n👤 = Tim kamu`;
  return t;
}

export function formatSchedule(leagueId, matchday) {
  const matches = getMatchesByMatchday(leagueId, matchday);
  let t = `📅 *MATCHDAY ${matchday}*\n\n`;
  for (const m of matches) {
    const u1 = m.home_is_user ? '👤' : '';
    const u2 = m.away_is_user ? '👤' : '';
    if (m.status === 'completed') {
      t += `${m.home_color || ''}${u1} ${m.home_short || m.home_name} *${m.home_score}-${m.away_score}* ${m.away_short || m.away_name} ${u2}${m.away_color || ''}\n`;
    } else {
      t += `${m.home_color || ''}${u1} ${m.home_short || m.home_name} vs ${m.away_short || m.away_name} ${u2}${m.away_color || ''}\n`;
    }
  }
  return t;
}