// src/engine/match.js — Match Engine v2
// Sistem random event: match berjalan sampai ketemu "decision point",
// lalu bot nanya ke user → user respons → match lanjut

import { getDB, getClub, getClubPlayers, updatePlayer, updateClub, updateMatch, dbRun, dbGet } from '../db/database.js';
import { getStaffModifiers } from './staff.js';

// ─── Tipe Events ──────────────────────────────────────────────────────────────
export const EVENT = {
  GOAL: 'goal',
  OWN_GOAL: 'own_goal',
  MISS: 'miss',
  SAVE: 'save',
  CHANCE: 'chance',
  YELLOW: 'yellow',
  RED: 'red',
  INJURY: 'injury',
  PENALTY: 'penalty',
  PENALTY_MISS: 'penalty_miss',
  VAR: 'var',
  CORNER: 'corner',
  FREEKICK: 'freekick',
  SUB: 'sub',
  HALFTIME: 'halftime',
  FULLTIME: 'fulltime',
  COMEBACK: 'comeback',
  MOMENTUM: 'momentum',
};

// ─── Decision Point Types (butuh respons user) ────────────────────────────────
export const DECISION = {
  HALFTIME: 'halftime',     // team talk + subs
  INJURY_SUB: 'injury_sub',   // pemain cedera, paksa sub
  LOSING_BADLY: 'losing_badly', // kalah 2+ gol, tawarkan taktik
  WINNING_HOLD: 'winning_hold', // menang tipis, tahan atau serang?
  RED_CARD: 'red_card',     // kartu merah, ubah taktik?
  PENALTY: 'penalty',      // tendangan penalti
  LAST_CHANCE: 'last_chance',  // menit 80+, masih kalah
};

// ─── Markov Transition Matrix ─────────────────────────────────────────────────
function buildMatrix(homeStr, awayStr, homeTactic, awayTactic, minute, score) {
  const homeAdv = 1.07;
  const total = homeStr + awayStr;
  let hRatio = (homeStr / total) * homeAdv;
  let aRatio = 1 - hRatio;

  // Taktik modifier
  const tactics = {
    attacking: { att: 1.2, def: 0.85 },
    pressing: { att: 1.15, def: 0.90 },
    balanced: { att: 1.0, def: 1.0 },
    counter: { att: 0.85, def: 1.2 },
    defensive: { att: 0.75, def: 1.3 },
  };
  const hT = tactics[homeTactic] || tactics.balanced;
  const aT = tactics[awayTactic] || tactics.balanced;

  // Situational: kalau kalah, tim lebih agresif
  const [hScore, aScore] = score;
  if (hScore < aScore) { hRatio *= 1.1; } // home kalah → lebih push
  if (aScore < hScore) { aRatio *= 1.1; } // away kalah → lebih push

  // Menit akhir: lebih dramatis
  const lateFactor = minute >= 80 ? 1.15 : 1.0;

  return {
    midfield: {
      home_attack: hRatio * hT.att * 0.35 * lateFactor,
      away_attack: aRatio * aT.att * 0.35 * lateFactor,
      foul: 0.08,
      midfield: 0.22,
    },
    home_attack: {
      home_chance: hRatio * hT.att * 0.40,
      away_attack: aRatio * aT.def * 0.20,
      foul: 0.10,
      corner: 0.15,
      offside: 0.08,
      midfield: 0.07,
    },
    away_attack: {
      away_chance: aRatio * aT.att * 0.40,
      home_attack: hRatio * hT.def * 0.20,
      foul: 0.10,
      corner: 0.15,
      offside: 0.08,
      midfield: 0.07,
    },
    home_chance: {
      goal: hRatio * hT.att * 0.28,
      save: aRatio * aT.def * 0.40,
      corner: 0.18,
      miss: 0.14,
    },
    away_chance: {
      goal: aRatio * aT.att * 0.28,
      save: hRatio * hT.def * 0.40,
      corner: 0.18,
      miss: 0.14,
    },
    goal: { kickoff: 1.0 },
    save: { midfield: 0.65, corner: 0.35 },
    corner: {
      home_chance: hRatio * 0.28,
      away_chance: aRatio * 0.28,
      midfield: 0.44,
    },
    foul: {
      midfield: 0.60,
      home_chance: hRatio * 0.20,
      away_chance: aRatio * 0.20,
    },
    offside: { midfield: 1.0 },
    miss: { midfield: 0.7, corner: 0.3 },
    kickoff: { midfield: 1.0 },
  };
}

function weightedRandom(obj) {
  const keys = Object.keys(obj);
  const vals = Object.values(obj);
  const total = vals.reduce((s, v) => s + v, 0);
  let r = Math.random() * total;
  for (let i = 0; i < keys.length; i++) {
    r -= vals[i];
    if (r <= 0) return keys[i];
  }
  return keys[keys.length - 1];
}

// ─── Player Selector (with Playstyle Trait weighting) ─────────────────────────
function pickPlayer(players, type = 'scorer') {
  if (!players || players.length === 0) return { name: 'Pemain', id: null };
  let pool = players;
  if (type === 'scorer') {
    pool = players.filter(p => ['ST', 'CF', 'LW', 'RW', 'CAM'].includes(p.position)) || players;
  } else if (type === 'assist') {
    pool = players.filter(p => ['CAM', 'CM', 'LW', 'RW', 'LB', 'RB'].includes(p.position)) || players;
  } else if (type === 'defender') {
    pool = players.filter(p => ['CB', 'LB', 'RB'].includes(p.position)) || players;
  }
  if (pool.length === 0) pool = players;

  // Playstyle trait weighting
  const getWeight = (p) => {
    let w = p.overall || 65;
    if (type === 'scorer' && p.playstyle_trait === 'Poacher') w *= 1.4;
    if (type === 'assist' && p.playstyle_trait === 'Playmaker') w *= 1.3;
    if (type === 'assist' && p.playstyle_trait === 'Dribbler') w *= 1.15;
    return w;
  };

  const total = pool.reduce((s, p) => s + getWeight(p), 0);
  let r = Math.random() * total;
  for (const p of pool) {
    r -= getWeight(p);
    if (r <= 0) return p;
  }
  return pool[0];
}

// ─── Injury Roll ──────────────────────────────────────────────────────────────
function rollInjury() {
  const types = [
    { type: 'Kram otot', weeks: 1, severity: 'minor' },
    { type: 'Keseleo', weeks: 2, severity: 'minor' },
    { type: 'Cedera hamstring', weeks: 4, severity: 'moderate' },
    { type: 'Cedera lutut', weeks: 6, severity: 'moderate' },
    { type: 'Patah tulang', weeks: 12, severity: 'major' },
  ];
  const r = Math.random();
  if (r < 0.45) return types[0];
  if (r < 0.75) return types[1];
  if (r < 0.90) return types[2];
  if (r < 0.97) return types[3];
  return types[4];
}

// ─── Narasi ───────────────────────────────────────────────────────────────────
const NARASI = {
  goal: [
    '⚽ GOL! {scorer} menjebol gawang! Indah sekali!',
    '⚽ GOL! Tendangan keras {scorer} tak terbendung!',
    '⚽ GOL! {scorer} tenang mengeksekusi satu lawan satu dengan kiper!',
    '⚽ GOL! Assist cantik dari {assist} diakhiri {scorer} dengan sentuhan kelas!',
    '⚽ GOL SPEKTAKULER! {scorer} mencetak gol dari luar kotak penalti!',
    '⚽ GOL! Sundulan maut {scorer} di tiang jauh!',
  ],
  own_goal: [
    '⚽ GOL BUNUH DIRI! {scorer} sial mencocor bola ke gawang sendiri!',
    '⚽ GOL BUNUH DIRI! Defleksi dari {scorer} mengecoh kiper!',
  ],
  miss: [
    '😤 Peluang emas terbuang! Tendangan melambung di atas mistar!',
    '😤 {scorer} gagal! Bola menyentuh tiang!',
    '😤 Sundulan {scorer} melebar tipis!',
  ],
  save: [
    '🧤 Penyelamatan luar biasa dari kiper!',
    '🧤 Tiang menyelamatkan! Bola membentur tiang dan keluar!',
    '🧤 Ganda penyelamatan! Kiper tampil heroik!',
  ],
  yellow: [
    '🟡 Kartu kuning untuk {player}! Tekel kasar berbahaya!',
    '🟡 {player} protes berlebihan, kartu kuning untuknya!',
    '🟡 Pelanggaran taktis {player} dihukum kartu kuning!',
  ],
  red: [
    '🟥 KARTU MERAH! {player} diusir keluar lapangan! Tekel dari belakang yang brutal!',
    '🟥 KARTU MERAH LANGSUNG! {player} menerima hukuman setimpal setelah tackle berbahaya!',
    '🟥 KARTU MERAH KEDUA! {player} sudah dapat dua kuning, harus meninggalkan lapangan!',
  ],
  injury: [
    '🚑 CEDERA! {player} terjatuh dan terlihat menahan sakit! Butuh pergantian?',
    '🚑 {player} mengalami benturan keras dan tidak bisa melanjutkan permainan!',
    '🚑 {player} meminta pergantian karena cedera!',
  ],
  penalty: [
    '🎯 PENALTI! Pelanggaran di dalam kotak! Siapa yang akan mengeksekusi?',
    '🎯 VAR memeriksa... PENALTI dikonfirmasi! Kesempatan emas!',
  ],
  penalty_goal: [
    '⚽ GOL PENALTI! {scorer} tenang mengecoh kiper! 1-0 dari titik putih!',
    '⚽ {scorer} eksekusi sempurna! Kiper salah arah!',
  ],
  penalty_miss: [
    '😱 PENALTI GAGAL! {scorer} tidak bisa memanfaatkan!',
    '😱 Kiper menyelamatkan penalti! Dramatis!',
  ],
  corner: [
    '📐 Tendangan sudut...',
  ],
  momentum: [
    '⚡ Momentum tim berubah! Tekanan semakin intens!',
    '🔥 Tim semakin percaya diri setelah gol tersebut!',
  ],
};

function narasi(type, vars = {}) {
  const list = NARASI[type] || [''];
  let text = list[Math.floor(Math.random() * list.length)];
  for (const [k, v] of Object.entries(vars)) {
    text = text.replace(`{${k}}`, v);
  }
  return text;
}

// ─── Simulate Half ────────────────────────────────────────────────────────────
// Simulate sampai "decision point" atau akhir babak
// Returns: { events, score, decisoinPoint, nextMinute, state }
export function simulateUntilDecision(matchState) {
  const {
    homePlayers, awayPlayers,
    homeScore, awayScore,
    minute: startMin, maxMinute,
    homeTactic, awayTactic,
    homeStrength, awayStrength,
    homeSubsLeft, awaySubsLeft,
    isUserHome, isUserAway,
  } = matchState;

  let hScore = homeScore;
  let aScore = awayScore;
  let minute = startMin;
  const events = [];
  let state = 'midfield';
  let lastChanceFor = null;

  // ── Derby Detection ─────────────────────────────────────────────────────
  const isDerby = matchState.isDerby || false;
  const derbyIntensity = matchState.derbyIntensity || 0;
  const derbyCardMod = isDerby ? 1 + (derbyIntensity / 100) : 1.0; // max 2x cards
  const derbyMod = isDerby ? 1.05 : 1.0; // slightly higher energy in derbies

  // ── Staff Modifiers ─────────────────────────────────────────────────────
  const homeStaff = matchState.homeStaffMods || { injuryReduction: 0, attackBoost: 0, defenseBoost: 0 };
  const awayStaff = matchState.awayStaffMods || { injuryReduction: 0, attackBoost: 0, defenseBoost: 0 };

  // Realism additions
  const weatherMod = matchState.weather?.passMod || 1.0;
  let hSt = Math.round(homeStrength * weatherMod * derbyMod);
  let aSt = Math.round(awayStrength * weatherMod * derbyMod);

  // Apply staff coach boosts
  hSt = Math.round(hSt * (1 + homeStaff.attackBoost) * (1 + homeStaff.defenseBoost * 0.5));
  aSt = Math.round(aSt * (1 + awayStaff.attackBoost) * (1 + awayStaff.defenseBoost * 0.5));

  // Random event probability per tick - Adjusted based on pitch/weather/derby
  const homeInjMod = 1 - homeStaff.injuryReduction;
  const awayInjMod = 1 - awayStaff.injuryReduction;
  const BASE_INJURY_PROB = 0.003 * (matchState.weather?.id === 'heavy_rain' ? 1.5 : 1.0);
  const YELLOW_PROB = 0.008 * (matchState.weather?.id === 'heavy_rain' ? 1.3 : 1.0) * derbyCardMod;
  const RED_PROB = 0.001 * derbyCardMod;
  const PENALTY_PROB = 0.004;

  // New generic injury logic that considers Injury Proneness
  function calculateInjurySeverity(player) {
    const proneness = player.injury_proneness || 50;
    // Higher proneness = higher chance of severe injury
    const baseSeverityRoll = Math.random() * 100;
    const adjustedRoll = baseSeverityRoll + (proneness - 50) * 0.3; // modifier

    const types = [
      { type: 'Kram otot', weeks: 1, severity: 'minor' },
      { type: 'Keseleo', weeks: 2, severity: 'minor' },
      { type: 'Cedera hamstring', weeks: 4, severity: 'moderate' },
      { type: 'Cedera lutut', weeks: 6, severity: 'moderate' },
      { type: 'ACL Tear / Patah tulang', weeks: 12, severity: 'major' },
    ];
    if (adjustedRoll < 45) return types[0];
    if (adjustedRoll < 75) return types[1];
    if (adjustedRoll < 90) return types[2];
    if (adjustedRoll < 97) return types[3];
    return types[4];
  }

  while (minute < maxMinute) {
    // using modified strength based on weather
    const matrix = buildMatrix(hSt, aSt, homeTactic, awayTactic, minute, [hScore, aScore]);
    const trans = matrix[state];
    if (!trans) { state = 'midfield'; continue; }

    const next = weightedRandom(trans);

    // Time advance
    const timeAdv = {
      midfield: Math.floor(Math.random() * 3) + 1,
      home_attack: Math.floor(Math.random() * 2) + 1,
      away_attack: Math.floor(Math.random() * 2) + 1,
      home_chance: 1, away_chance: 1,
      goal: 1, save: 1, corner: 1, foul: 1,
      offside: 1, miss: 1, kickoff: 0,
    }[next] || 1;

    minute = Math.min(minute + timeAdv, maxMinute + 5);

    // ── Random Events ──────────────────────────────────────────────────────
    // INJURY (staff physio reduces probability)
    const INJURY_PROB = BASE_INJURY_PROB * (Math.random() < 0.5 ? homeInjMod : awayInjMod);
    if (Math.random() < INJURY_PROB && minute > 10) {
      const isHomeInj = Math.random() < 0.5;
      const injuredPlayers = isHomeInj ? homePlayers : awayPlayers;
      const subsLeft = isHomeInj ? homeSubsLeft : awaySubsLeft;
      if (injuredPlayers.length > 1) {
        const injured = injuredPlayers[Math.floor(Math.random() * injuredPlayers.length)];
        const injInfo = calculateInjurySeverity(injured);
        events.push({
          minute, type: EVENT.INJURY, team: isHomeInj ? 'home' : 'away',
          player: injured, injuryInfo: injInfo,
          text: narasi('injury', { player: injured.name })
        });
        // Decision point jika ini adalah tim user dan masih punya sub
        const isUserTeam = (isHomeInj && isUserHome) || (!isHomeInj && isUserAway);
        if (isUserTeam && subsLeft > 0) {
          return {
            events, hScore, aScore, minute, state: next,
            decisionPoint: { type: DECISION.INJURY_SUB, minute, team: isHomeInj ? 'home' : 'away', injuredPlayer: injured, injuryInfo: injInfo }
          };
        }
      }
    }

    // YELLOW CARD
    if (Math.random() < YELLOW_PROB) {
      const isHomeY = Math.random() < 0.5;
      const yPlayers = isHomeY ? homePlayers : awayPlayers;
      if (yPlayers.length > 0) {
        const p = yPlayers[Math.floor(Math.random() * yPlayers.length)];
        events.push({
          minute, type: EVENT.YELLOW, team: isHomeY ? 'home' : 'away',
          player: p, text: narasi('yellow', { player: p.name })
        });
      }
    }

    // RED CARD
    if (Math.random() < RED_PROB && minute > 20) {
      const isHomeR = Math.random() < 0.5;
      const rPlayers = isHomeR ? homePlayers : awayPlayers;
      if (rPlayers.length > 1) {
        const p = rPlayers[Math.floor(Math.random() * rPlayers.length)];
        events.push({
          minute, type: EVENT.RED, team: isHomeR ? 'home' : 'away',
          player: p, text: narasi('red', { player: p.name })
        });
        // Decision point setelah kartu merah
        const isUserTeam = (isHomeR && isUserHome) || (!isHomeR && isUserAway);
        if (isUserTeam) {
          return {
            events, hScore, aScore, minute, state: next,
            decisionPoint: { type: DECISION.RED_CARD, minute, team: isHomeR ? 'home' : 'away', redCardPlayer: p }
          };
        }
      }
    }

    // ── Process State ──────────────────────────────────────────────────────
    if (next === 'goal' || next === 'away_chance' || next === 'home_chance') {
      lastChanceFor = next === 'home_chance' ? 'home' : next === 'away_chance' ? 'away' : lastChanceFor;
    }

    if (next === 'goal') {
      const isHomeGoal = lastChanceFor === 'home';
      const scoringPlayers = isHomeGoal ? homePlayers : awayPlayers;
      const assistPlayers = isHomeGoal ? homePlayers : awayPlayers;

      // Own goal chance (3%)
      const isOwnGoal = Math.random() < 0.03;
      const ownGoalTeamPlayers = isHomeGoal ? awayPlayers : homePlayers;

      let scorer, assistPlayer, text;
      if (isOwnGoal && ownGoalTeamPlayers.length > 0) {
        scorer = pickPlayer(ownGoalTeamPlayers, 'defender');
        text = narasi('own_goal', { scorer: scorer?.name || 'Bek' });
        isHomeGoal ? aScore++ : hScore++;
      } else {
        scorer = pickPlayer(scoringPlayers, 'scorer');
        // Playstyle trait bonus: Poacher gets extra goal probability (already scored if here)
        // Playmaker gets higher assist rate
        const assistChance = assistPlayers.some(p => p.playstyle_trait === 'Playmaker') ? 0.85 : 0.7;
        assistPlayer = Math.random() < assistChance ? pickPlayer(assistPlayers, 'assist') : null;
        text = narasi('goal', { scorer: scorer?.name || 'Pemain', assist: assistPlayer?.name || '' });
        isHomeGoal ? hScore++ : aScore++;
      }

      events.push({
        minute, type: isOwnGoal ? EVENT.OWN_GOAL : EVENT.GOAL,
        team: isHomeGoal ? 'home' : 'away', isOwnGoal,
        scorer, assistPlayer, text,
        scoreAfter: `${hScore}-${aScore}`,
      });

      // Decision points situasional
      const diff = hScore - aScore;
      const userIsLosingBadly = (isUserHome && diff <= -2) || (isUserAway && diff >= 2);
      const userIsWinningTight = (isUserHome && diff === 1) || (isUserAway && diff === -1);
      const isLateGame = minute >= 70;

      if (userIsLosingBadly && isLateGame && (isUserHome || isUserAway)) {
        return {
          events, hScore, aScore, minute, state: 'kickoff',
          decisionPoint: { type: DECISION.LOSING_BADLY, minute, diff }
        };
      }
      if (userIsWinningTight && isLateGame && minute >= 80 && (isUserHome || isUserAway)) {
        return {
          events, hScore, aScore, minute, state: 'kickoff',
          decisionPoint: { type: DECISION.WINNING_HOLD, minute, diff }
        };
      }

    } else if (next === 'miss') {
      const isMissHome = lastChanceFor === 'home';
      const missPlayer = pickPlayer(isMissHome ? homePlayers : awayPlayers, 'scorer');
      events.push({
        minute, type: EVENT.MISS, team: isMissHome ? 'home' : 'away',
        player: missPlayer, text: narasi('miss', { scorer: missPlayer?.name || 'Pemain' })
      });
    } else if (next === 'save') {
      events.push({ minute, type: EVENT.SAVE, text: narasi('save') });
    } else if (next === 'home_chance') {
      lastChanceFor = 'home';
    } else if (next === 'away_chance') {
      lastChanceFor = 'away';
    }

    state = next;
    if (minute >= maxMinute && next !== 'goal') break;
  }

  // Last chance decision: menit 80+ masih kalah
  if (minute >= 80) {
    const diff = hScore - aScore;
    const isUserLosing = (isUserHome && diff < 0) || (isUserAway && diff > 0);
    if (isUserLosing && (isUserHome || isUserAway)) {
      return {
        events, hScore, aScore, minute: maxMinute, state: 'fulltime',
        decisionPoint: { type: DECISION.LAST_CHANCE, minute: maxMinute, diff }
      };
    }
  }

  return { events, hScore, aScore, minute: maxMinute, state: 'fulltime', decisionPoint: null };
}

// ─── Format Event Log ──────────────────────────────────────────────────────────
export function formatEventLog(events, homeName, awayName) {
  if (!events || events.length === 0) return '';
  const goalEvents = events.filter(e => [EVENT.GOAL, EVENT.OWN_GOAL, EVENT.PENALTY].includes(e.type));
  const keyEvents = events.filter(e => [EVENT.RED, EVENT.INJURY, EVENT.MISS].includes(e.type)).slice(0, 3);
  const all = [...goalEvents, ...keyEvents].sort((a, b) => a.minute - b.minute);

  return all.map(e => `  ${e.minute}' ${e.text}`).join('\n');
}

// ─── Format Match Report ──────────────────────────────────────────────────────
export function formatMatchReport(homeClub, awayClub, hScore, aScore, events, matchday) {
  const goals = events.filter(e => [EVENT.GOAL, EVENT.OWN_GOAL].includes(e.type));
  const homeGoals = goals.filter(e => (e.team === 'home' && !e.isOwnGoal) || (e.team === 'away' && e.isOwnGoal));
  const awayGoals = goals.filter(e => (e.team === 'away' && !e.isOwnGoal) || (e.team === 'home' && e.isOwnGoal));

  let report = `╔══════════════════════════════╗\n`;
  report += `║  ⚽ MATCHDAY ${String(matchday).padStart(2)} — FULL TIME   ║\n`;
  report += `╚══════════════════════════════╝\n\n`;
  report += `${homeClub.color} *${homeClub.name}*\n`;
  report += `        *${hScore} — ${aScore}*\n`;
  report += `${awayClub.color} *${awayClub.name}*\n\n`;

  if (homeGoals.length > 0) {
    report += homeGoals.map(e => `⚽ ${e.minute}' ${e.scorer?.name || '?'} (${homeClub.short_name || homeClub.name})`).join('\n') + '\n';
  }
  if (awayGoals.length > 0) {
    report += awayGoals.map(e => `⚽ ${e.minute}' ${e.scorer?.name || '?'} (${awayClub.short_name || awayClub.name})`).join('\n') + '\n';
  }

  const redCards = events.filter(e => e.type === EVENT.RED);
  const injuries = events.filter(e => e.type === EVENT.INJURY);
  if (redCards.length > 0 || injuries.length > 0) {
    report += '\n📋 *Insiden:*\n';
    for (const r of redCards) report += `  🟥 ${r.minute}' ${r.player?.name} diusir\n`;
    for (const i of injuries) report += `  🚑 ${i.minute}' ${i.player?.name} cedera\n`;
  }

  return report;
}

// ─── Format Decision Prompt ───────────────────────────────────────────────────
export function formatDecisionPrompt(decision, clubPlayers, subsLeft, currentTactic) {
  const { type, minute } = decision;

  if (type === DECISION.HALFTIME) {
    return `⏱ *TURUN MINUM!*\n\nKamu punya ${subsLeft} pergantian tersisa.\n\n*Apa yang ingin kamu lakukan?*\n1. 💬 Berikan motivasi (morale +10)\n2. 😤 Kritik keras (effort +15, morale -5)\n3. 🧊 Tenang & analisis (presisi +10)\n4. 🔄 Lakukan substitusi\n5. ⚙️ Ubah taktik\n6. ▶️ Lanjutkan saja\n\n_Balas dengan nomor pilihan_`;
  }

  if (type === DECISION.INJURY_SUB) {
    const inj = decision.injuredPlayer;
    const injInfo = decision.injuryInfo;
    const available = clubPlayers.filter(p => p.id !== inj?.id).slice(0, 5);
    let msg = `🚑 *MENIT ${minute} — CEDERA!*\n\n*${inj?.name || 'Pemain'}* mengalami *${injInfo?.type || 'cedera'}*!\n\nPemain yang bisa masuk:\n`;
    available.forEach((p, i) => msg += `${i + 1}. ${p.name} (${p.position}) ⭐${p.overall}\n`);
    msg += `\n_Balas nomor pemain yang masuk, atau "skip" untuk lanjutkan_`;
    return msg;
  }

  if (type === DECISION.RED_CARD) {
    const p = decision.redCardPlayer;
    return `🟥 *MENIT ${minute} — KARTU MERAH!*\n\n*${p?.name || 'Pemain'}* diusir! Sekarang 10 vs 11!\n\n*Ubah taktik?*\n1. 🛡️ Bertahan ketat (defensive)\n2. ⚖️ Tetap balanced\n3. ⚔️ Tetap menyerang\n\n_Balas nomor pilihan_`;
  }

  if (type === DECISION.LOSING_BADLY) {
    return `😰 *MENIT ${minute} — TERTINGGAL JAUH!*\n\nTimmu tertinggal ${Math.abs(decision.diff)} gol!\n\n*Strategi darurat?*\n1. ⚔️ All out attack\n2. 🔄 Ganti pemain menyerang\n3. 💬 Minta pemain lebih kerja keras\n4. 📐 Ubah formasi\n5. 🎯 Fokus per-babak\n\n_Balas nomor pilihan_`;
  }

  if (type === DECISION.WINNING_HOLD) {
    return `😤 *MENIT ${minute} — UNGGUL TIPIS!*\n\nSisa waktu sangat sedikit, kamu unggul 1 gol!\n\n*Apa keputusanmu?*\n1. 🛡️ Bertahan & jaga skor\n2. ⚔️ Terus serang, cari gol kedua\n3. ⏱️ Buang waktu (time wasting)\n\n_Balas nomor pilihan_`;
  }

  if (type === DECISION.LAST_CHANCE) {
    return `⏰ *MENIT AKHIR — KEJAR KETERTINGGALAN!*\n\nTimmu masih tertinggal! Satu keputusan terakhir:\n\n1. 🎰 Kirim semua pemain ke depan (all or nothing)\n2. 🏃 Terus bermain normal\n3. 🥅 Kirim kiper ke depan saat corner!\n\n_Balas nomor pilihan_`;
  }

  return `❓ *Keputusan dibutuhkan!* Balas dengan pilihan kamu.`;
}

// ─── Apply Decision ───────────────────────────────────────────────────────────
export function applyDecision(decision, choice, matchState) {
  const changes = { tacticChange: null, moraleBoost: 0, effortBoost: 0, subRequest: null };

  const { type } = decision;

  if (type === DECISION.HALFTIME) {
    if (choice === '1') { changes.moraleBoost = 10; }
    else if (choice === '2') { changes.effortBoost = 15; changes.moraleBoost = -5; }
    else if (choice === '3') { changes.effortBoost = 10; }
    else if (choice === '5') { changes.tacticChange = 'request'; }
  }

  if (type === DECISION.RED_CARD) {
    if (choice === '1') changes.tacticChange = 'defensive';
    else if (choice === '3') changes.tacticChange = 'attacking';
  }

  if (type === DECISION.LOSING_BADLY) {
    if (choice === '1') { changes.tacticChange = 'attacking'; changes.effortBoost = 10; }
    else if (choice === '3') { changes.moraleBoost = 8; }
  }

  if (type === DECISION.WINNING_HOLD) {
    if (choice === '1') changes.tacticChange = 'defensive';
    else if (choice === '2') changes.tacticChange = 'attacking';
    else if (choice === '3') { changes.tacticChange = 'counter'; changes.effortBoost = -5; }
  }

  if (type === DECISION.LAST_CHANCE) {
    if (choice === '1') { changes.tacticChange = 'attacking'; changes.moraleBoost = 5; changes.effortBoost = 20; }
    else if (choice === '3') { changes.tacticChange = 'attacking'; changes.effortBoost = 25; }
  }

  return changes;
}

// ─── Post Match: Update Player Stats ─────────────────────────────────────────
export function updatePlayerStats(events, homePlayers, awayPlayers, matchRating) {
  // Update goals & assists
  for (const e of events) {
    if (e.type === EVENT.GOAL && e.scorer?.id) {
      const p = dbGet(`SELECT * FROM players WHERE id = ?`, e.scorer.id);
      if (p) dbRun(`UPDATE players SET goals = goals + 1, appearances = appearances + 1 WHERE id = ?`, p.id);
    }
    if (e.assistPlayer?.id) {
      dbRun(`UPDATE players SET assists = assists + 1 WHERE id = ?`, e.assistPlayer.id);
    }
    if (e.type === EVENT.INJURY && e.player?.id) {
      // Set injury
      const weeks = e.injuryInfo?.weeks || 1;
      const injUntil = new Date();
      injUntil.setDate(injUntil.getDate() + weeks * 7);
      dbRun(`UPDATE players SET injury_until = ?, injury_type = ? WHERE id = ?`,
        injUntil.toISOString().split('T')[0], e.injuryInfo?.type || 'Cedera', e.player.id);
    }
    if (e.type === EVENT.RED && e.player?.id) {
      const p = dbGet(`SELECT * FROM players WHERE id = ?`, e.player.id);
      const league = dbGet(`SELECT current_matchday FROM leagues WHERE status = 'active' LIMIT 1`);
      if (p && league) {
        dbRun(`UPDATE players SET red_cards = red_cards + 1, suspended_until = ? WHERE id = ?`,
          (league.current_matchday || 1) + 1, p.id);
      }
    }
  }

  // Random form update for all involved players
  const allPlayers = [...(homePlayers || []), ...(awayPlayers || [])];
  for (const p of allPlayers) {
    if (!p.id) continue;
    const formChange = Math.floor(Math.random() * 11) - 5; // -5 to +5
    const newForm = Math.max(40, Math.min(99, (p.form || 70) + formChange));
    dbRun(`UPDATE players SET form = ? WHERE id = ?`, newForm, p.id);
  }
}