// src/engine/press.js — Press Conference, Team Talk, Player Interaction

import { getClub, updateClub, dbRun, dbGet } from '../db/database.js';

// ─── Pre-Match Press Conference ───────────────────────────────────────────────
export function preMatchPress(userClub, opponentClub) {
  const rep   = userClub.reputation || 50;
  const oppRep= opponentClub.reputation || 50;
  const isFav = rep >= oppRep;

  return {
    prompt: `🎙️ *KONFERENSI PERS PRA-PERTANDINGAN*\n\n` +
      `Wartawan: "Bagaimana persiapan timmu menghadapi ${opponentClub.name}?"\n\n` +
      `1. 💪 "Kami siap 100% dan akan memenangkan ini!"\n   _(Morale +8, tapi kalau kalah -15)_\n\n` +
      `2. 😤 "Kami menghormati lawan, tapi tidak takut!"\n   _(Morale +5, balanced)_\n\n` +
      `3. 🙏 "Pertandingan sulit, mereka tim bagus."\n   _(Efek minimal, aman)_\n\n` +
      `4. 🎯 "Fokus pertandingan demi pertandingan."\n   _(Konsentrasi +10)_\n\n` +
      `_Ketik nomor pilihanmu atau skip_`,
    choices: ['1','2','3','4'],
  };
}

export function applyPreMatchPress(choice, userClub) {
  const effects = {
    '1': { morale: 8,  concentration: 0,  msg: `💪 Tim termotivasi dengan pernyataan percaya dirimu! Morale naik!` },
    '2': { morale: 5,  concentration: 5,  msg: `⚖️ Tim siap dengan mental yang tepat.` },
    '3': { morale: 2,  concentration: 2,  msg: `🙏 Tim tetap rendah hati. Efek minimal.` },
    '4': { morale: 3,  concentration: 10, msg: `🎯 Tim sangat fokus untuk pertandingan ini!` },
  };
  const e = effects[choice] || effects['3'];
  updateClub(userClub.id, { morale: Math.min(100, (userClub.morale || 70) + e.morale) });
  return e.msg;
}

// ─── Half-Time Team Talk ───────────────────────────────────────────────────────
export function halftimeTeamTalk(userClub, hScore, aScore, isHome) {
  const myScore  = isHome ? hScore : aScore;
  const oppScore = isHome ? aScore : hScore;
  const diff     = myScore - oppScore;

  let situation;
  if (diff > 0)      situation = `Kamu *unggul ${diff} gol*! 🟢`;
  else if (diff < 0) situation = `Kamu *tertinggal ${Math.abs(diff)} gol*. 🔴`;
  else               situation = `Skor *imbang*. 🟡`;

  return `⏱️ *TURUN MINUM!*\n\n${situation}\n\nApa yang ingin kamu sampaikan ke pemain?\n\n` +
    `1. 😤 *Keras & Motivasi* — "Kerja lebih keras! Kita bisa!"\n   _(Effort +15, Morale bisa ±)_\n\n` +
    `2. 😌 *Tenang & Analitis* — "Tetap tenang, jalankan rencana"\n   _(Akurasi +10, Effort stabil)_\n\n` +
    `3. 🔥 *Emosional* — "Untuk fans kita! Untuk kebanggaan!"\n   _(Morale +15, Random boost)_\n\n` +
    `4. 📊 *Taktis* — "Perhatikan ruang di sisi kanan mereka"\n   _(Serangan terarah +12)_\n\n` +
    `5. 🔄 *Minta Substitusi* — Ganti pemain\n\n` +
    `6. ▶️ *Lanjut saja*\n\n_Ketik nomornya_`;
}

export function applyHalftimeTeamTalk(choice, userClub, hScore, aScore, isHome) {
  const myScore  = isHome ? hScore : aScore;
  const oppScore = isHome ? aScore : hScore;
  const isWinning = myScore > oppScore;
  const isLosing  = myScore < oppScore;

  const effects = {
    '1': {
      effort: 15, morale: isLosing ? 8 : 3,
      msg: `😤 Tim termbakar semangatnya! Babak kedua dimulai dengan intensitas tinggi!`
    },
    '2': {
      effort: 5, accuracy: 10, morale: 2,
      msg: `😌 Tim lebih terstruktur. Babak kedua akan lebih disiplin.`
    },
    '3': {
      effort: 8, morale: 15,
      msg: `🔥 Emosi meluap! Tim sangat termotivasi!${isLosing ? ' Bisa jadi momentum pembalik!' : ''}`
    },
    '4': {
      effort: 5, attack_boost: 12,
      msg: `📊 Tim paham instruksi taktis. Serangan akan lebih terarah di babak dua!`
    },
    '6': {
      effort: 0, morale: 0,
      msg: `▶️ Tidak ada perubahan. Tim kembali ke lapangan.`
    },
  };

  const e = effects[choice] || effects['6'];
  updateClub(userClub.id, { morale: Math.min(100, (userClub.morale || 70) + (e.morale || 0)) });
  return e.msg;
}

// ─── Post-Match Interview ─────────────────────────────────────────────────────
export function postMatchInterview(userClub, hScore, aScore, isHome, opponentClub) {
  const myScore  = isHome ? hScore : aScore;
  const oppScore = isHome ? aScore : hScore;

  let result, context;
  if (myScore > oppScore) {
    result = `menang ${myScore}-${oppScore}`;
    context = `"Luar biasa! Kemenangan yang deserved. Bagaimana reaksimu?"`;
  } else if (myScore < oppScore) {
    result = `kalah ${myScore}-${oppScore}`;
    context = `"Kekalahan yang menyakitkan. Apa yang salah?"`;
  } else {
    result = `imbang ${myScore}-${oppScore}`;
    context = `"Seri tipis. Puas dengan hasilnya?"`;
  }

  return `🎙️ *INTERVIEW PASCA-PERTANDINGAN*\n\n` +
    `Wartawan: ${context}\n\n` +
    `1. 🏆 Puji pemain & akui kualitas lawan\n   _(Morale tim +5)_\n\n` +
    `2. 💪 Motivasi untuk pertandingan berikutnya\n   _(Form +3 matchday depan)_\n\n` +
    `3. 😤 Kritik penampilan tim\n   _(Effort +10, Morale -5)_\n\n` +
    `4. 🤐 Jawaban singkat & profesional\n   _(Efek minimal)_\n\n` +
    `_Ketik nomor atau skip_`;
}

export function applyPostMatchInterview(choice, userClub, isWin) {
  const effects = {
    '1': { morale: 5,  form: 0,  msg: `🏆 Pemain senang dipuji. Hubungan manajer-pemain membaik!` },
    '2': { morale: 2,  form: 3,  msg: `💪 Tim siap fokus ke pertandingan berikutnya!` },
    '3': { morale: -5, effort: 10, msg: `😤 Kritik pedas. Tim termotivasi tapi moral sedikit turun.` },
    '4': { morale: 1,  msg: `🤐 Profesional. Tidak ada efek signifikan.` },
  };
  const e = effects[choice] || effects['4'];
  updateClub(userClub.id, { morale: Math.min(100, Math.max(20, (userClub.morale || 70) + (e.morale || 0))) });
  return e.msg;
}

// ─── Player Talk ──────────────────────────────────────────────────────────────
export function formatPlayerTalkMenu(player) {
  return `💬 *BICARA DENGAN ${player.name.toUpperCase()}*\n\n` +
    `Morale pemain: ${'⭐'.repeat(Math.ceil((player.morale || 70) / 20))}\n\n` +
    `1. 🌟 Puji penampilan  _(Morale +10)_\n` +
    `2. 💰 Janjikan kenaikan gaji  _(Morale +8, tapi ekspektasi tinggi)_\n` +
    `3. 📋 Jelaskan rencana main  _(Fokus +8)_\n` +
    `4. ⚠️ Tegur performa buruk  _(Effort +12, Morale -8)_\n` +
    `5. 🤝 Tawarkan perpanjangan kontrak\n\n` +
    `_Ketik nomor pilihan_`;
}

export function applyPlayerTalk(choice, playerId) {
  const { updatePlayer, getPlayer } = require('../db/database.js');
  const player = getPlayer(playerId);
  if (!player) return '❌ Pemain tidak ditemukan.';

  const effects = {
    '1': { morale: 10,  msg: `🌟 ${player.name} senang dipuji! Morale meningkat.` },
    '2': { morale: 8,   msg: `💰 ${player.name} termotivasi oleh janji kenaikan gaji.` },
    '3': { morale: 5,   msg: `📋 ${player.name} paham peran dan tugasnya di tim.` },
    '4': { morale: -8,  msg: `⚠️ ${player.name} tidak senang tapi termotivasi untuk buktikan diri.` },
    '5': { morale: 12,  msg: `🤝 ${player.name} merasa dihargai! Perpanjangan kontrak sedang diproses.` },
  };

  const e = effects[choice] || { morale: 0, msg: `💬 Pembicaraan selesai.` };
  const newMorale = Math.min(100, Math.max(10, (player.morale || 70) + e.morale));
  dbRun(`UPDATE players SET morale = ? WHERE id = ?`, newMorale, playerId);
  return e.msg;
}

// ─── Training ─────────────────────────────────────────────────────────────────
export function weeklyTraining(clubId) {
  const { dbAll } = require('../db/database.js');
  const players = dbAll(`SELECT * FROM players WHERE club_id = ?`, clubId);
  const results = [];

  for (const p of players) {
    if (p.injury_until) continue; // Tidak latihan kalau cedera

    // Random development dari latihan (lebih kecil dari match experience)
    const trainBoost = Math.random() < 0.15 ? 1 : 0;
    if (trainBoost) {
      dbRun(`UPDATE players SET overall = MIN(potential, overall + 1) WHERE id = ?`, p.id);
      results.push(p.name);
    }
  }

  return results;
}

export function formatTrainingReport(improvedPlayers) {
  if (improvedPlayers.length === 0) return `🏋️ Sesi latihan selesai. Tidak ada pemain yang meningkat minggu ini.`;
  return `🏋️ *HASIL LATIHAN MINGGUAN*\n\n✨ Pemain yang berkembang:\n${improvedPlayers.map(n => `  📈 ${n} +1 overall`).join('\n')}`;
}