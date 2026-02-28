// ╔══════════════════════════════════════════════════════════════╗
// ║   LINK ACCOUNT — commands/discord/link.js (FIXED v2)        ║
// ╚══════════════════════════════════════════════════════════════╝

const { saveDB } = require('../../helpers/database');

module.exports = async function linkCmd(command, args, msg, user, db, discordId) {

    if (command === 'link') {
        const waNumber = args[0];
        if (!waNumber) {
            return msg.reply(
                '📱 **Cara Link Akun WA ↔ Discord:**\n\n' +
                '1️⃣ Ketik `!link 628xxxxxxxxxx`\n' +
                '2️⃣ Dapat **kode OTP 6 digit**\n' +
                '3️⃣ Di WA ketik `!linkdc KODE`\n' +
                '4️⃣ Akun terhubung otomatis!'
            );
        }

        const normalizedNum = waNumber.replace(/^\+/, '').replace(/^0/, '62');
        const waJid = `${normalizedNum}@s.whatsapp.net`;

        if (!db.users[waJid]) {
            return msg.reply(`❌ Nomor WA \`${normalizedNum}\` belum terdaftar di bot WA.`);
        }

        if (db.discordLinks?.[discordId]) {
            const existingJid = db.discordLinks[discordId];
            return msg.reply(`⚠️ Sudah terhubung ke \`${existingJid.replace('@s.whatsapp.net', '')}\`. Ketik \`!unlink\` dulu.`);
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000;

        if (!db.pendingLinks) db.pendingLinks = {};
        db.pendingLinks[otp] = { discordId, waJid, discordUsername: msg.pushName, expiresAt };
        await saveDB(db);

        return msg.reply(`✅ **Kode OTP: \`${otp}\`**\n\nKirim di WA:\n\`\`\`!linkdc ${otp}\`\`\`\n⏳ Berlaku 5 menit`);
    }

    if (command === 'unlink') {
        if (!db.discordLinks?.[discordId]) return msg.reply('❌ Belum terhubung ke WA manapun.');
        const oldJid = db.discordLinks[discordId];
        delete db.discordLinks[discordId];
        if (db.users[oldJid]?.linkedDiscord === discordId) delete db.users[oldJid].linkedDiscord;
        await saveDB(db);
        return msg.reply(`✅ Berhasil di-unlink dari \`${oldJid.replace('@s.whatsapp.net', '')}\`.`);
    }

    if (command === 'linkstatus') {
        const linkedJid = db.discordLinks?.[discordId];
        if (linkedJid) {
            return msg.reply(`🔗 **Terhubung ke WA:** \`+${linkedJid.replace('@s.whatsapp.net', '')}\``);
        } else {
            return msg.reply(`❌ Belum terhubung. Ketik \`!link 628xxxxxxxxxx\``);
        }
    }
};

// ── Handler WA (!linkdc KODE) ──────────────────────────────────────────
// Baca langsung dari MongoDB agar sinkron dengan proses Discord bot
async function handleWALinkVerify(command, args, msg, db) {
    if (command !== 'linkdc') return;

    const otp = args[0];
    if (!otp) return msg.reply('❌ Format: !linkdc KODE_OTP');

    try {
        const { MongoClient } = require('mongodb');
        const mongoClient = new MongoClient(process.env.MONGODB_URI);
        await mongoClient.connect();

        // Sesuai database.js: db='bot_data', collection='bot_data', _id='main_data', field='data'
        const mongoDb  = mongoClient.db('bot_data');
        const col      = mongoDb.collection('bot_data');
        const doc      = await col.findOne({ _id: 'main_data' });
        const data     = doc?.data;

        if (!data?.pendingLinks?.[otp]) {
            await mongoClient.close();
            return msg.reply('❌ Kode OTP tidak valid atau sudah kedaluwarsa.');
        }

        const pending = data.pendingLinks[otp];

        if (Date.now() > pending.expiresAt) {
            await col.updateOne(
                { _id: 'main_data' },
                { $unset: { [`data.pendingLinks.${otp}`]: '' } }
            );
            await mongoClient.close();
            return msg.reply('⏰ Kode OTP sudah kedaluwarsa. Minta kode baru dari Discord.');
        }

        const waJid     = msg.author;
        const discordId = pending.discordId;
        const dcKey     = `dc_${discordId}`;

        const setFields = {};
        setFields[`data.discordLinks.${discordId}`]    = waJid;
        setFields[`data.users.${waJid}.linkedDiscord`] = discordId;

        // Merge akun Discord lama jika ada
        const unsetFields = { [`data.pendingLinks.${otp}`]: '' };
        if (data.users?.[dcKey]) {
            const dcUser = data.users[dcKey];
            const waUser = data.users[waJid] || {};
            setFields[`data.users.${waJid}.balance`] = (waUser.balance || 0) + (dcUser.balance || 0);
            setFields[`data.users.${waJid}.bank`]    = (waUser.bank    || 0) + (dcUser.bank    || 0);
            setFields[`data.users.${waJid}.xp`]      = (waUser.xp      || 0) + (dcUser.xp     || 0);
            unsetFields[`data.users.${dcKey}`]        = '';
            console.log(`[LINK] Merged dc_${discordId} → ${waJid}`);
        }

        await col.updateOne(
            { _id: 'main_data' },
            { $set: setFields, $unset: unsetFields }
        );
        await mongoClient.close();

        // Sinkron ke global.db di memori WA
        if (!db.discordLinks) db.discordLinks = {};
        db.discordLinks[discordId] = waJid;
        if (db.users[waJid]) db.users[waJid].linkedDiscord = discordId;
        if (db.pendingLinks) delete db.pendingLinks[otp];

        return msg.reply(
            `🎉 *Berhasil!* Akun Discord \`${pending.discordUsername}\` terhubung ke WA kamu!\n\n` +
            `✅ Data sinkron antara WA & Discord.\n` +
            `💰 *Bonus:* Saldo & XP dari akun Discord digabungkan!`
        );

    } catch (err) {
        console.error('[LinkDC Error]', err.message);
        return msg.reply(`❌ Error: ${err.message}`);
    }
}

module.exports.handleWALinkVerify = handleWALinkVerify;
