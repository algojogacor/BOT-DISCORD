const { saveDB } = require('../helpers/database');
const crypto = require('crypto');

const fmt = (num) => Math.floor(Number(num)).toLocaleString('id-ID');

// 🔑 HARUS SAMA DENGAN DI index.html GAME
const SECRET_KEY = "TEMPLE_DASH_KEY_2026";

module.exports = async (command, args, msg, user, db) => {
    const validCommands = ['temple', 'claimtemple'];
    if (!validCommands.includes(command)) return;

    const now = Date.now();

    // 1. LINK GAME
    if (command === 'temple') {
        const GAME_LINK = "https://ISI_LINK_GAME_KAMU.netlify.app/";
        let txt = `🏛️ *TEMPLE DASH* 🏛️\n\n`;
        txt += `Mode: *Endless Runner*\n`;
        txt += `Lari, lompat, hindari jebakan!\n`;
        txt += `🪙 Kumpulkan koin, naikkan score!\n\n`;
        txt += `👉 *MAIN SEKARANG:*\n${GAME_LINK}\n\n`;
        txt += `_Game Over? Salin kode & ketik:_\n\`!claimtemple <kode>\``;
        return msg.reply(txt);
    }

    // 2. CLAIM REWARD
    if (command === 'claimtemple') {
        const code = args[0];
        if (!code) return msg.reply("❌ Mana kodenya? Contoh: !claimtemple TMPL-xxx-xxx-xxx");

        // Format: TMPL-[TIMESTAMP]-[SCORE]-[SIGNATURE]
        const parts = code.split('-');
        if (parts.length !== 4 || parts[0] !== 'TMPL') {
            return msg.reply("❌ Format kode tidak valid.\nPastikan copy dari game ya, bukan diketik manual.");
        }

        const timestamp = parseInt(parts[1]);
        const score     = parseInt(parts[2]);
        const signature = parts[3];

        if (isNaN(timestamp) || isNaN(score)) return msg.reply("❌ Kode tidak valid.");

        // Validasi waktu (max 5 menit)
        if (now - timestamp > 5 * 60 * 1000) {
            return msg.reply("❌ Kode kadaluarsa (Maks 5 menit).\nMainkan lagi dan langsung claim!");
        }

        // ✅ Anti-Replay GLOBAL
        if (!db.usedGameCodes) db.usedGameCodes = {};
        for (const k in db.usedGameCodes) {
            if (now - db.usedGameCodes[k].claimedAt > 10 * 60 * 1000) delete db.usedGameCodes[k];
        }
        if (db.usedGameCodes[code]) {
            const claimedBy = db.usedGameCodes[code].sender;
            const name = db.usedGameCodes[code].name || 'orang lain';
            if (claimedBy === msg.author) return msg.reply("❌ Kode ini sudah kamu klaim sebelumnya.");
            return msg.reply(`❌ Kode sudah diklaim duluan oleh *${name}*.\nJangan share kode kamu! 😅`);
        }

        // ✅ Anti-Cheat (SHA256)
        const checkString = `${timestamp}-${score}-${SECRET_KEY}`;
        const expectedSig = crypto.createHash('sha256').update(checkString).digest('hex').substring(0, 10).toUpperCase();
        if (signature !== expectedSig) return msg.reply("❌ *KODE PALSU!* Jangan edit skornya bos 😏");

        if (score <= 0) return msg.reply("❌ Skor 0 tidak bisa di-claim!");

        // ─── SISTEM REWARD ─────────────────────────────────────
        let basePrice, tier;
        if (score >= 1000)     { basePrice = 3_000; tier = "LEGENDARY 👑"; }
        else if (score >= 500) { basePrice = 2_000; tier = "ELITE 🔥";     }
        else if (score >= 200) { basePrice = 1_500; tier = "HARD 💪";      }
        else if (score >= 100) { basePrice = 1_000; tier = "MEDIUM ⚔️";   }
        else                   { basePrice = 500;   tier = "NORMAL 🏃";   }

        const reward = score * basePrice;
        // ───────────────────────────────────────────────────────

        // Simpan ke global registry
        db.usedGameCodes[code] = {
            sender: msg.author, name: user.name || 'User',
            score, reward, claimedAt: now, game: 'temple'
        };

        user.balance          = (user.balance || 0) + reward;
        user.dailyIncome      = (user.dailyIncome || 0) + reward;
        user.templePlays      = (user.templePlays || 0) + 1;
        user.templeBestScore  = Math.max(user.templeBestScore || 0, score);

        saveDB(db);

        return msg.reply(
            `🏛️ *TEMPLE DASH — REWARD CAIR!* 🏛️\n\n` +
            `🎯 Score   : ${score.toLocaleString('id-ID')} poin\n` +
            `🏆 Tier    : ${tier}\n` +
            `💵 Rate    : Rp ${fmt(basePrice)}/poin\n` +
            `─────────────────────\n` +
            `💰 *+Rp ${fmt(reward)}*\n` +
            `🏦 Saldo   : Rp ${fmt(user.balance)}\n\n` +
            `📊 Best Score-mu: ${user.templeBestScore.toLocaleString('id-ID')}`
        );
    }
};