// ╔══════════════════════════════════════════════════════════════╗
// ║        ALGOJO REQUEST v3 — WA Bridge                        ║
// ║  Queue aware, anti-double, multi-file, perbaiki             ║
// ╚══════════════════════════════════════════════════════════════╝

const https = require('https');
const path = require('path');
const fs = require('fs');

const OPENCODE_SERVER = process.env.OPENCODE_SERVER_URL || 'https://algojo-opencode-server-production.up.railway.app';
const OPENCODE_API_KEY = process.env.OPENCODE_API_KEY || 'rahasia123';
const NEMO_DIR = path.join(__dirname, 'nemo');

const cooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000;

// ── HTTP request helper ──────────────────────────────────────
function apiRequest(endpoint, method, body) {
    return new Promise((resolve, reject) => {
        const bodyStr = JSON.stringify(body);
        const url = new URL(`${OPENCODE_SERVER}${endpoint}`);
        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method,
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(bodyStr),
                'x-api-key': OPENCODE_API_KEY
            }
        };
        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch(e) { reject(new Error('Invalid response')); }
            });
        });
        req.on('error', reject);
        req.setTimeout(360000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(bodyStr);
        req.end();
    });
}

function getAllNemoCommands() {
    if (!fs.existsSync(NEMO_DIR)) return [];
    return fs.readdirSync(NEMO_DIR)
        .filter(f => f.endsWith('.js'))
        .map(f => `!${f.replace('.js', '')}`);
}

async function broadcast(sock, db, text) {
    const groups = Object.keys(db.groups || {});
    for (const groupId of groups) {
        try {
            await sock.sendMessage(groupId, { text });
            await new Promise(r => setTimeout(r, 1500));
        } catch(e) {}
    }
}

module.exports = async (command, args, msg, user, db, sock, m) => {
    if (command !== 'algojo' && command !== 'perbaiki') return;

    // ══════════════════════════════════════════════════════════
    // !perbaiki <namafitur> [error manual]
    // ══════════════════════════════════════════════════════════
    if (command === 'perbaiki') {
        const feature = args[0]?.toLowerCase();
        if (!feature) {
            return msg.reply(
                `🔧 *PERBAIKI FITUR*\n\n` +
                `Format:\n` +
                `• \`!perbaiki catur\` — auto fix\n` +
                `• \`!perbaiki catur TypeError: x is not a function\` — manual\n\n` +
                `Fitur tersedia: ${getAllNemoCommands().join(', ') || 'belum ada'}`
            );
        }

        const manualLog = args.slice(1).join(' ') || null;
        const autoLog = global.nemoErrors?.[feature]
            ? global.nemoErrors[feature].slice(-3).map(e => `[${e.time}] ${e.msg}`).join('\n')
            : null;

        if (!autoLog && !manualLog) {
            return msg.reply(
                `⚠️ Tidak ada error log untuk !${feature}.\n\n` +
                `Kirim error manual:\n` +
                `\`!perbaiki ${feature} <pesan error>\``
            );
        }

        await msg.reply(
            `🔧 *Memperbaiki !${feature}...*\n\n` +
            `📋 Log: _${(autoLog || manualLog).slice(0, 100)}_\n\n` +
            `⏳ Tunggu 2-3 menit...`
        );

        try {
            const result = await apiRequest('/fix', 'POST', { feature, errorLog: autoLog, manualLog });

            if (!result.success) {
                return msg.reply(`❌ Gagal perbaiki !${feature}\n\n${result.message || result.error}`);
            }

            if (global.nemoErrors?.[feature]) delete global.nemoErrors[feature];

            await msg.reply(`✅ *!${feature} berhasil diperbaiki!*\n\n⏳ Deploy dalam 1-2 menit...`);
            await broadcast(sock, db,
                `🔧 *FITUR DIPERBAIKI!*\n${'─'.repeat(28)}\n\n` +
                `✅ *Perintah:* !${feature}\n` +
                `👤 *Fix oleh:* Algojo AI\n\n` +
                `Coba lagi sekarang! 🎉`
            );
        } catch(e) {
            await msg.reply(`❌ Error: ${e.message}`);
        }
        return;
    }

    // ══════════════════════════════════════════════════════════
    // !algojo commands
    // ══════════════════════════════════════════════════════════
    const subCommand = args[0]?.toLowerCase();

    if (subCommand === 'list') {
        const cmds = getAllNemoCommands();
        return msg.reply(
            `🤖 *FITUR BUATAN ALGOJO (${cmds.length})*\n\n` +
            (cmds.length > 0 ? cmds.map((c,i) => `${i+1}. ${c}`).join('\n') : '_Belum ada_') +
            `\n\n_Request: !algojo buatkan fitur <nama>_`
        );
    }

    if (subCommand === 'status') {
        let queueInfo = '';
        try {
            const q = await apiRequest('/queue', 'GET', {});
            queueInfo = `📬 Antrian: ${q.total} request\n`;
        } catch(e) {}

        const errors = global.nemoErrors || {};
        return msg.reply(
            `🤖 *ALGOJO STATUS*\n\n` +
            `📁 Fitur: ${getAllNemoCommands().length}\n` +
            queueInfo +
            `🔴 Error: ${Object.keys(errors).length} fitur\n\n` +
            `_!algojo errors untuk detail_`
        );
    }

    if (subCommand === 'errors') {
        const errors = global.nemoErrors || {};
        if (Object.keys(errors).length === 0) return msg.reply(`✅ Tidak ada error tercatat.`);
        const list = Object.entries(errors)
            .map(([f, logs]) => `🔴 *!${f}*\n${logs.slice(-2).map(e => `  ${e.time}: ${e.msg.slice(0,80)}`).join('\n')}`)
            .join('\n\n');
        return msg.reply(`🔴 *ERROR LOG*\n\n${list}\n\n_!perbaiki <nama> untuk fix_`);
    }

    // ── !algojo <prompt> ──────────────────────────────────────
    const prompt = args.join(' ').trim();
    if (!prompt) {
        const cmds = getAllNemoCommands();
        return msg.reply(
            `🤖 *ALGOJO AI DEVELOPER*\n\n` +
            `Saya bisa buatkan fitur baru!\n\n` +
            `*Contoh request:*\n` +
            `• \`!algojo buatkan fitur cuaca\`\n` +
            `• \`!algojo buatkan game tebak angka\`\n` +
            `• \`!algojo buatkan game catur sederhana\`\n\n` +
            `*Command lain:*\n` +
            `• \`!algojo list\` — lihat semua fitur\n` +
            `• \`!algojo status\` — antrian & status\n` +
            `• \`!algojo errors\` — error log\n` +
            `• \`!perbaiki <nama>\` — fix fitur error\n\n` +
            `${cmds.length > 0 ? `📋 *Fitur (${cmds.length}):* ${cmds.join(', ')}` : '_Belum ada fitur_'}`
        );
    }

    // Cek cooldown
    const cooldownKey = `${msg.author}_algojo`;
    const lastReq = cooldowns.get(cooldownKey);
    if (lastReq && Date.now() - lastReq < COOLDOWN_MS) {
        const sisaMenit = Math.ceil((COOLDOWN_MS - (Date.now() - lastReq)) / 60000);
        return msg.reply(`⏳ Tunggu ${sisaMenit} menit lagi ya!`);
    }
    cooldowns.set(cooldownKey, Date.now());

    await msg.reply(
        `🤖 *Algojo mulai bekerja...*\n\n` +
        `📝 *Request:* _${prompt}_\n\n` +
        `⏳ Mohon tunggu, bisa 2-5 menit...\n` +
        `_Algojo akan iterasi sampai fitur sempurna_ 🔄`
    );

    try {
        const result = await apiRequest('/build', 'POST', {
            prompt,
            requester: msg.pushName || 'Member'
        });

        // ── Request masuk antrian ─────────────────────────
        if (result.queued) {
            return msg.reply(
                `📬 *Request masuk antrian ke-${result.position}*\n\n` +
                `Estimasi: ~${result.position * 3} menit\n` +
                `Kamu akan dapat notif setelah selesai!\n\n` +
                `_!algojo status untuk cek antrian_`
            );
        }

        // ── Fitur sudah ada (anti-double) ─────────────────
        if (result.duplicate) {
            return msg.reply(
                `⚠️ *Fitur !${result.existingFeature} sudah ada!*\n\n` +
                `Mau update/replace fitur ini?\n\n` +
                `Ketik: \`!algojo update ${result.existingFeature} ${prompt}\``
            );
        }

        // ── Build gagal ───────────────────────────────────
        if (!result.success) {
            cooldowns.delete(cooldownKey);
            return msg.reply(
                `⚠️ *Algojo tidak berhasil buat fitur.*\n\n` +
                `Iterasi: ${result.iterations || 1}x\n\n` +
                `Coba lebih spesifik!\n` +
                `Contoh: _"buatkan game tebak angka 1-100 dengan hint panas/dingin"_`
            );
        }

        // ── Berhasil! ─────────────────────────────────────
        const features = result.features || [result.feature];
        const iterasi = result.iterations || 1;
        const semuaFitur = getAllNemoCommands();

        await msg.reply(
            `✅ *Berhasil! ${features.length} fitur dibuat!*\n\n` +
            `🆕 *Fitur baru:*\n${features.map(f => `• !${f}`).join('\n')}\n\n` +
            `🔄 *Iterasi:* ${iterasi}x\n` +
            `👤 *Request:* ${msg.pushName || 'Member'}\n\n` +
            `⏳ Bot update dalam 1-2 menit...`
        );

        await broadcast(sock, db,
            `🎉 *FITUR BARU TERSEDIA!*\n` +
            `${'─'.repeat(28)}\n\n` +
            `✨ *Fitur baru (${features.length}):*\n` +
            `${features.map(f => `• !${f}`).join('\n')}\n\n` +
            `👤 *Request oleh:* ${msg.pushName || 'Member'}\n` +
            `🔄 *Dibuat dalam:* ${iterasi} iterasi\n\n` +
            `${'─'.repeat(28)}\n` +
            `📋 *Semua fitur Algojo (${semuaFitur.length}):*\n` +
            `${semuaFitur.join(' • ')}\n\n` +
            `_Minta fitur: !algojo <deskripsi>_ 🤖`
        );

    } catch(error) {
        cooldowns.delete(cooldownKey);
        await msg.reply(`❌ *Error:* ${error.message}\n\nCoba lagi nanti!`);
    }
};