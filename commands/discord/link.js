// ╔══════════════════════════════════════════════════════════════╗
// ║   LINK ACCOUNT — commands/discord/link.js                    ║
// ║   Hubungkan akun Discord dengan nomor WA                     ║
// ╚══════════════════════════════════════════════════════════════╝

const { saveDB } = require('../../helpers/database');

/**
 * Flow linking:
 * 1. User Discord ketik !link 628xxxx → bot generate kode OTP
 * 2. User WA ketik !linkdc KODE → bot WA verifikasi & simpan mapping
 * 3. Setelah linked, user Discord pakai data WA yang sama
 */

const pendingLinks = new Map(); // discordId → { waNumber, code, expiresAt }

module.exports = async function linkCmd(command, args, msg, user, db, discordId) {

    // ── !link <nomor_wa> ──────────────────────────────────────────────
    if (command === 'link') {
        const waNumber = args[0];

        if (!waNumber) {
            return msg.reply(
                '📱 **Cara Link Akun WA ↔ Discord:**\n\n' +
                '1️⃣ Ketik `!link 628xxxxxxxxxx` (nomor WA kamu)\n' +
                '2️⃣ Kamu akan dapat **kode OTP 6 digit**\n' +
                '3️⃣ Pergi ke WA, ketik `!linkdc KODE`\n' +
                '4️⃣ Akun kamu akan terhubung otomatis!\n\n' +
                '✅ Setelah linked, saldo & progress WA kamu bisa diakses di Discord'
            );
        }

        // Normalkan nomor (hapus + atau 0 di depan)
        const normalizedNum = waNumber.replace(/^\+/, '').replace(/^0/, '62');
        const waJid = `${normalizedNum}@s.whatsapp.net`;

        // Cek apakah nomor WA ini ada di DB
        if (!db.users[waJid]) {
            return msg.reply(
                `❌ Nomor WA \`${normalizedNum}\` belum terdaftar di bot WA.\n` +
                `Pastikan kamu sudah pernah chat dengan bot WA terlebih dahulu!`
            );
        }

        // Cek apakah Discord ID ini sudah pernah link
        if (db.discordLinks?.[discordId]) {
            const existingJid = db.discordLinks[discordId];
            return msg.reply(
                `⚠️ Akun Discord kamu sudah terhubung ke nomor \`${existingJid.replace('@s.whatsapp.net', '')}\`.\n` +
                `Ketik \`!unlink\` dulu jika ingin ganti.`
            );
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000; // 5 menit

        // Simpan pending link
        if (!db.pendingLinks) db.pendingLinks = {};
        db.pendingLinks[otp] = {
            discordId,
            waJid,
            discordUsername: msg.pushName,
            expiresAt,
        };
        await saveDB(db);

        return msg.reply(
            `✅ **Kode OTP kamu: \`${otp}\`**\n\n` +
            `📱 Sekarang pergi ke WhatsApp dan kirim:\n` +
            `\`\`\`!linkdc ${otp}\`\`\`\n` +
            `⏳ Kode berlaku **5 menit**`
        );
    }

    // ── !unlink ───────────────────────────────────────────────────────
    if (command === 'unlink') {
        if (!db.discordLinks?.[discordId]) {
            return msg.reply('❌ Akun kamu belum terhubung ke WA manapun.');
        }

        const oldJid = db.discordLinks[discordId];
        delete db.discordLinks[discordId];

        // Hapus juga referensi balik dari user WA
        if (db.users[oldJid]?.linkedDiscord === discordId) {
            delete db.users[oldJid].linkedDiscord;
        }

        await saveDB(db);
        return msg.reply(
            `✅ Akun Discord kamu berhasil di-unlink dari \`${oldJid.replace('@s.whatsapp.net', '')}\`.\n` +
            `Data Discord kamu (dc_${discordId}) tetap ada dan bisa dipakai.`
        );
    }

    // ── !linkstatus ───────────────────────────────────────────────────
    if (command === 'linkstatus') {
        const linkedJid = db.discordLinks?.[discordId];
        if (linkedJid) {
            const waNum = linkedJid.replace('@s.whatsapp.net', '');
            return msg.reply(
                `🔗 **Status Link Akun:**\n\n` +
                `Discord: \`${msg.pushName}\`\n` +
                `WA: \`+${waNum}\`\n` +
                `✅ **Terhubung** — kamu menggunakan data akun WA kamu di Discord`
            );
        } else {
            return msg.reply(
                `❌ **Belum terhubung ke WA**\n\n` +
                `Ketik \`!link 628xxxxxxxxxx\` untuk menghubungkan akun.\n` +
                `Saat ini kamu menggunakan akun Discord tersendiri (dc_${discordId})`
            );
        }
    }
};

// ── Handler untuk sisi WA (!linkdc KODE) ──────────────────────────────
// Ini dipanggil dari index.js WA, bukan dari discord-index.js
async function handleWALinkVerify(command, args, msg, db) {
    if (command !== 'linkdc') return;

    const otp = args[0];
    if (!otp) return msg.reply('❌ Format: `!linkdc KODE_OTP`');

    const pending = db.pendingLinks?.[otp];
    if (!pending) return msg.reply('❌ Kode OTP tidak valid atau sudah kedaluwarsa.');
    if (Date.now() > pending.expiresAt) {
        delete db.pendingLinks[otp];
        await saveDB(db);
        return msg.reply('⏰ Kode OTP sudah kedaluwarsa. Minta kode baru dari Discord.');
    }

    const waJid      = msg.author;
    const discordId  = pending.discordId;

    // Simpan mapping dua arah
    if (!db.discordLinks) db.discordLinks = {};
    db.discordLinks[discordId] = waJid;
    db.users[waJid].linkedDiscord = discordId;

    // Hapus data Discord lama (dc_discordId) jika ada, merge balance dll
    const dcKey = `dc_${discordId}`;
    if (db.users[dcKey]) {
        const dcUser  = db.users[dcKey];
        const waUser  = db.users[waJid];

        // Merge balance & bank (ambil yang lebih besar sebagai bonus linking)
        waUser.balance = (waUser.balance || 0) + (dcUser.balance || 0);
        waUser.bank    = (waUser.bank    || 0) + (dcUser.bank    || 0);
        waUser.xp      = (waUser.xp      || 0) + (dcUser.xp     || 0);

        // Hapus akun Discord lama
        delete db.users[dcKey];
        console.log(`[LINK] Merged dc_${discordId} → ${waJid}`);
    }

    // Hapus OTP
    delete db.pendingLinks[otp];
    await saveDB(db);

    return msg.reply(
        `🎉 *Berhasil!* Akun Discord \`${pending.discordUsername}\` sekarang terhubung ke nomor WA kamu!\n\n` +
        `✅ Semua data (saldo, farm, mining, dll) akan sinkron antara WA & Discord.\n` +
        `💰 *Bonus:* Saldo & XP dari akun Discord kamu sudah digabungkan!`
    );
}

module.exports.handleWALinkVerify = handleWALinkVerify;