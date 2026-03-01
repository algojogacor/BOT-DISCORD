const { saveDB } = require('../helpers/database');
const crypto = require('crypto');

// HELPER
const fmt = (num) => Math.floor(Number(num)).toLocaleString('id-ID');

// 🔑 KUNCI RAHASIA (WAJIB SAMA DENGAN DI FILE gameover.js GAME)
const SECRET_KEY = "NEON_SKY_OMEGA_KEY_2026";

module.exports = async (command, args, msg, user, db) => {
    const validCommands = ['neonsky', 'claimneonsky'];
    if (!validCommands.includes(command)) return;

    const now = Date.now();

    // 1. LINK GAME
    if (command === 'neonsky') {
        const GAME_LINK = "https://neonskywa.netlify.app/";

        let txt = `🚀 *NEON SKY SHOOTER* 🚀\n\n`;
        txt += `Mode: *Hardcore Survive*\n`;
        txt += `Tembak semua musuh, kumpulkan XP, level up!\n`;
        txt += `💥 Makin banyak kill = makin besar reward!\n\n`;
        txt += `👉 *MAIN SEKARANG:*\n${GAME_LINK}\n\n`;
        txt += `_Game Over? Salin kode & ketik:_\n\`!claimneonsky <kode>\``;

        return msg.reply(txt);
    }

    // 2. CLAIM REWARD
    if (command === 'claimneonsky') {
        const code = args[0];
        if (!code) return msg.reply("❌ Mana kodenya? Contoh: !claimneonsky NSKY-xxx-xxx-xxx");

        // Format: NSKY-[TIMESTAMP]-[SCORE]-[SIGNATURE]
        const parts = code.split('-');
        if (parts.length !== 4 || parts[0] !== 'NSKY') {
            return msg.reply("❌ Format kode tidak valid.\nPastikan copy dari game ya, bukan diketik manual.");
        }

        const timestamp = parseInt(parts[1]);
        const score     = parseInt(parts[2]);
        const signature = parts[3];

        // Validasi timestamp & score harus angka
        if (isNaN(timestamp) || isNaN(score)) {
            return msg.reply("❌ Kode tidak valid.");
        }

        // Validasi Waktu (max 5 menit)
        if (now - timestamp > 5 * 60 * 1000) {
            return msg.reply("❌ Kode kadaluarsa (Maksimal 5 menit setelah game over).\nMainkan lagi dan langsung claim!");
        }

        // Validasi Anti-Replay
        if (user.lastNeonSkyCode === code) {
            return msg.reply("❌ Kode ini sudah pernah dipakai sebelumnya.");
        }

        // Validasi Anti-Cheat (SHA256)
        const checkString = `${timestamp}-${score}-${SECRET_KEY}`;
        const expectedSig = crypto.createHash('sha256').update(checkString).digest('hex').substring(0, 10).toUpperCase();

        if (signature !== expectedSig) {
            return msg.reply("❌ *KODE PALSU TERDETEKSI!*\nJangan coba edit skornya ya bos 😏");
        }

        // Validasi skor minimal
        if (score <= 0) {
            return msg.reply("❌ Skor 0 tidak bisa di-claim. Tembak musuhnya dulu! 😄");
        }

        // ─── SISTEM REWARD ───────────────────────────────────────────────
        // Setiap enemy kill = +10 skor
        // Tier berdasarkan jumlah kill (score / 10)
        const kills = Math.floor(score / 10);

        let basePrice, tier;

        if (score >= 500) {
            // 50+ kills
            basePrice = 2_000;
            tier = "LEGENDARY 🌟";
        } else if (score >= 200) {
            // 20-49 kills
            basePrice = 1_500;
            tier = "ELITE 🔥";
        } else if (score >= 100) {
            // 10-19 kills
            basePrice = 1_000;
            tier = "HARD 💪";
        } else {
            // 0-9 kills
            basePrice = 500;
            tier = "NORMAL ⚔️";
        }

        const reward = score * basePrice;
        // ─────────────────────────────────────────────────────────────────

        // Update user
        user.balance = (user.balance || 0) + reward;
        user.dailyIncome = (user.dailyIncome || 0) + reward;
        user.lastNeonSkyCode = code;
        user.neonSkyPlays = (user.neonSkyPlays || 0) + 1;
        user.neonSkyBestScore = Math.max(user.neonSkyBestScore || 0, score);

        saveDB(db);

        return msg.reply(
            `🚀 *NEON SKY — REWARD CAIR!* 🚀\n\n` +
            `🎯 Score  : ${score} poin\n` +
            `💀 Kills  : ${kills} musuh\n` +
            `🏆 Tier   : ${tier}\n` +
            `💵 Rate   : Rp ${fmt(basePrice)}/poin\n` +
            `─────────────────────\n` +
            `💰 *+Rp ${fmt(reward)}*\n` +
            `🏦 Saldo  : Rp ${fmt(user.balance)}\n\n` +
            `📊 Best Score-mu: ${user.neonSkyBestScore}`
        );
    }
};
