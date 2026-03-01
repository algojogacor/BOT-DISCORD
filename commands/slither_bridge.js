const { tambahWindfall } = require('./pajak');
const { saveDB } = require('../helpers/database');
const crypto = require('crypto');

// HELPER
const fmt = (num) => Math.floor(Number(num)).toLocaleString('id-ID');

// 🔑 KUNCI RAHASIA (WAJIB SAMA DENGAN DI FILE HTML GAME)
const SECRET_KEY = "ULTRALISK_OMEGA_KEY_2026";

module.exports = async (command, args, msg, user, db) => {
    const validCommands = ['slither', 'snake', 'claimslither'];
    if (!validCommands.includes(command)) return;

    const now = Date.now();

    // 1. LINK GAME
    if (command === 'slither' || command === 'snake') {
        const GAME_LINK = "https://papaya-unicorn-f3a5a1.netlify.app/";

        let txt = `🐍 *SLITHER SULTAN.IO* 🐍\n\n`;
        txt += `Mode: *Hardcore Economy*\n`;
        txt += `Kumpulkan receh demi receh untuk modal usaha!\n`;
        txt += `👉 *MAIN SEKARANG:* \n${GAME_LINK}\n\n`;
        txt += `_Game Over? Copy kode dan ketik:_ \n\`!claimslither <kode>\``;

        return msg.reply(txt);
    }

    // 2. CLAIM REWARD
    if (command === 'claimslither') {
        const code = args[0];
        if (!code) return msg.reply("❌ Mana kodenya?");

        // Format: SLIT-[TIMESTAMP]-[SCORE]-[SIGNATURE]
        const parts = code.split('-');
        if (parts.length !== 4 || parts[0] !== 'SLIT') return msg.reply("❌ Kode tidak valid.");

        const timestamp = parseInt(parts[1]);
        const score     = parseInt(parts[2]);
        const signature = parts[3];

        if (isNaN(timestamp) || isNaN(score)) return msg.reply("❌ Kode tidak valid.");

        // Validasi Waktu (max 5 menit)
        if (now - timestamp > 5 * 60 * 1000) return msg.reply("❌ Kode kadaluarsa (Max 5 menit).");

        // ✅ Anti-Replay GLOBAL — kode yang sudah diklaim siapapun tidak bisa dipakai lagi
        if (!db.usedGameCodes) db.usedGameCodes = {};

        // Bersihkan kode lama (>10 menit) agar database tidak membengkak
        for (const k in db.usedGameCodes) {
            if (now - db.usedGameCodes[k].claimedAt > 10 * 60 * 1000) {
                delete db.usedGameCodes[k];
            }
        }

        if (db.usedGameCodes[code]) {
            const claimedBy   = db.usedGameCodes[code].sender;
            const claimedName = db.usedGameCodes[code].name || 'orang lain';
            if (claimedBy === msg.author) {
                return msg.reply("❌ Kode ini sudah kamu klaim sendiri sebelumnya.");
            }
            return msg.reply(`❌ Kode ini sudah diklaim duluan oleh *${claimedName}*.\nJangan share kode kamu ke orang lain! 😅`);
        }

        // Validasi Anti-Cheat (SHA256)
        const checkString = `${timestamp}-${score}-${SECRET_KEY}`;
        const expectedSig = crypto.createHash('sha256').update(checkString).digest('hex').substring(0, 10).toUpperCase();

        if (signature !== expectedSig) {
            return msg.reply("❌ *CHEATER!* Jangan edit skornya bos.");
        }

        if (score <= 0) return msg.reply("❌ Skor 0 tidak bisa di-claim.");

        // ─── SISTEM REWARD ────────────────────────────────────────────
        let basePrice = 500;
        let tier = "Medium";

        if (score > 100) {
            basePrice = 1_000;
            tier = "Hard 🔥";
        }

        const reward = score * basePrice;
        // ──────────────────────────────────────────────────────────────

        // ✅ Daftarkan kode ke registry GLOBAL sebelum update saldo
        db.usedGameCodes[code] = {
            sender:    msg.author,
            name:      user.name || 'User',
            score,
            reward,
            claimedAt: now
        };

        user.balance     = (user.balance || 0) + reward;
        user.dailyIncome = (user.dailyIncome || 0) + reward;
        tambahWindfall(user, reward);

        saveDB(db);

        return msg.reply(`🐍 *GAME OVER!* 🐍\nPanjang: ${score} cm\nTier: ${tier} (Rp ${fmt(basePrice)}/cm)\n\n💰 *Cair: Rp ${fmt(reward)}*`);
    }
};