// ╔══════════════════════════════════════════════════════════════╗
// ║        ALGOJO REQUEST v2 — WA Bridge                        ║
// ║  Support: build, fix, list, status                          ║
// ╚══════════════════════════════════════════════════════════════╝

const https = require('https');
const path = require('path');
const fs = require('fs');

const OPENCODE_SERVER = process.env.OPENCODE_SERVER_URL || 'https://algojo-opencode-server-production.up.railway.app';
const OPENCODE_API_KEY = process.env.OPENCODE_API_KEY || 'rahasia123';
const NEMO_DIR = path.join(__dirname, 'nemo');

// Cooldown per user
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
            method: method,
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
                catch (e) { reject(new Error('Invalid response')); }
            });
        });
        req.on('error', reject);
        req.setTimeout(360000, () => { req.destroy(); reject(new Error('Timeout')); });
        req.write(bodyStr);
        req.end();
    });
}

// ── Ambil semua fitur ────────────────────────────────────────
function getAllNemoCommands() {
    if (!fs.existsSync(NEMO_DIR)) return [];
    return fs.readdirSync(NEMO_DIR)
        .filter(f => f.endsWith('.js'))
        .map(f => `!${f.replace('.js', '')}`);
}

// ── Broadcast ke semua grup ──────────────────────────────────
async function broadcast(sock, db, msg) {
    const groups = Object.keys(db.groups || {});
    for (const groupId of groups) {
        try {
            await sock.sendMessage(groupId, { text: msg });
            await new Promise(r => setTimeout(r, 1500));
        } catch(e) {}
    }
}

module.exports = async (command, args, msg, user, db, sock, m) => {
    if (command !== 'algojo' && command !== 'perbaiki') return;

    // ══════════════════════════════════════════════════════════
    // ── !perbaiki <namafitur> [error manual] ─────────────────
    // ══════════════════════════════════════════════════════════
    if (command === 'perbaiki') {
        const feature = args[0]?.toLowerCase();
        if (!feature) {
            return msg.reply(
                `🔧 *PERBAIKI FITUR*\n\n` +
                `Format: \`!perbaiki <namafitur>\`\n\n` +
                `*Contoh:*\n` +
                `• \`!perbaiki catur\` — perbaiki otomatis pakai log error\n` +
                `• \`!perbaiki catur TypeError: x is not a function\` — kirim error manual\n\n` +
                `Fitur tersedia: ${getAllNemoCommands().join(', ') || 'belum ada'}`
            );
        }

        // Cek apakah ada error manual dari user
        const manualLog = args.slice(1).join(' ') || null;

        // Ambil error otomatis dari global.nemoErrors
        const autoLog = global.nemoErrors?.[feature]
            ? global.nemoErrors[feature].slice(-3).map(e => e.msg).join('\n')
            : null;

        const errorLog = autoLog || manualLog;

        await msg.reply(
            `🔧 *Algojo mulai perbaiki !${feature}...*\n\n` +
            `${errorLog ? `📋 Log error: _${errorLog.slice(0, 100)}_\n\n` : ''}` +
            `⏳ Mohon tunggu 2-3 menit...`
        );

        try {
            const result = await apiRequest('/fix', 'POST', {
                feature,
                errorLog: autoLog,
                manualLog
            });

            if (!result.success) {
                return msg.reply(`❌ *Gagal perbaiki !${feature}*\n\n${result.message || result.error}`);
            }

            // Hapus error log setelah berhasil diperbaiki
            if (global.nemoErrors?.[feature]) delete global.nemoErrors[feature];

            await msg.reply(`✅ *!${feature} berhasil diperbaiki!*\n\n⏳ Deploy dalam 1-2 menit...`);

            // Broadcast
            await broadcast(sock, db,
                `🔧 *FITUR DIPERBAIKI!*\n` +
                `${'─'.repeat(28)}\n\n` +
                `✅ *Perintah:* !${feature}\n` +
                `👤 *Diperbaiki oleh:* Algojo AI\n\n` +
                `Coba lagi sekarang!\n\n` +
                `_Algojo AI Auto-Fix_ 🤖`
            );

        } catch (error) {
            await msg.reply(`❌ *Error:* ${error.message}`);
        }
        return;
    }

    // ══════════════════════════════════════════════════════════
    // ── !algojo commands ──────────────────────────────────────
    // ══════════════════════════════════════════════════════════
    const subCommand = args[0]?.toLowerCase();

    // !algojo list
    if (subCommand === 'list') {
        const cmds = getAllNemoCommands();
        return msg.reply(
            `🤖 *FITUR BUATAN ALGOJO (${cmds.length})*\n\n` +
            (cmds.length > 0
                ? cmds.map((c, i) => `${i + 1}. ${c}`).join('\n')
                : '_Belum ada fitur_') +
            `\n\n_Minta fitur: !algojo buatkan fitur <nama>_`
        );
    }

    // !algojo status
    if (subCommand === 'status') {
        const errors = global.nemoErrors || {};
        const errorList = Object.entries(errors)
            .map(([f, logs]) => `• !${f}: ${logs.length} error`)
            .join('\n');
        return msg.reply(
            `🤖 *ALGOJO AI STATUS*\n\n` +
            `🌐 Server: aktif\n` +
            `📁 Fitur: ${getAllNemoCommands().length}\n` +
            `🔴 Fitur error: ${Object.keys(errors).length}\n\n` +
            (errorList ? `*Error aktif:*\n${errorList}\n\n` : '') +
            `_!perbaiki <nama> untuk fix fitur error_`
        );
    }

    // !algojo errors — lihat semua error log
    if (subCommand === 'errors') {
        const errors = global.nemoErrors || {};
        if (Object.keys(errors).length === 0) {
            return msg.reply(`✅ Tidak ada error yang tercatat saat ini.`);
        }
        const errorList = Object.entries(errors)
            .map(([f, logs]) => `🔴 *!${f}*\n${logs.slice(-2).map(e => `  ${e.time}: ${e.msg.slice(0, 80)}`).join('\n')}`)
            .join('\n\n');
        return msg.reply(`🔴 *ERROR LOG FITUR ALGOJO*\n\n${errorList}\n\n_Ketik !perbaiki <nama> untuk fix_`);
    }

    // !algojo <request>
    const prompt = args.join(' ').trim();
    if (!prompt) {
        const cmds = getAllNemoCommands();
        return msg.reply(
            `🤖 *ALGOJO AI DEVELOPER*\n\n` +
            `Saya bisa buatkan fitur baru untuk bot ini!\n\n` +
            `*Cara request:*\n` +
            `• \`!algojo buatkan fitur cuaca\`\n` +
            `• \`!algojo buatkan game tebak angka\`\n` +
            `• \`!algojo buatkan game catur sederhana\`\n\n` +
            `*Command lain:*\n` +
            `• \`!algojo list\` — lihat fitur tersedia\n` +
            `• \`!algojo status\` — cek status & error\n` +
            `• \`!algojo errors\` — lihat error log\n` +
            `• \`!perbaiki <nama>\` — perbaiki fitur error\n\n` +
            `${cmds.length > 0 ? `📋 *Fitur ada (${cmds.length}):* ${cmds.join(', ')}` : '_Belum ada fitur_'}`
        );
    }

    // Cek cooldown
    const cooldownKey = `${msg.author}_algojo`;
    const lastRequest = cooldowns.get(cooldownKey);
    if (lastRequest && Date.now() - lastRequest < COOLDOWN_MS) {
        const sisaMenit = Math.ceil((COOLDOWN_MS - (Date.now() - lastRequest)) / 60000);
        return msg.reply(`⏳ Tunggu ${sisaMenit} menit lagi ya!`);
    }
    cooldowns.set(cooldownKey, Date.now());

    await msg.reply(
        `🤖 *Algojo mulai bekerja...*\n\n` +
        `📝 *Request:* _${prompt}_\n\n` +
        `⏳ Mohon tunggu, ini mungkin butuh beberapa menit...\n` +
        `_Algojo akan iterasi sampai fitur sempurna_ 🔄`
    );

    try {
        const result = await apiRequest('/build', 'POST', {
            prompt,
            requester: msg.pushName || 'Member'
        });

        if (!result.success) {
            cooldowns.delete(cooldownKey);
            return msg.reply(
                `⚠️ *Algojo selesai tapi tidak ada file baru.*\n\n` +
                `Iterasi: ${result.iterations || 1}\n\n` +
                `Coba request lebih spesifik!\n` +
                `Contoh: _"buatkan game tebak angka 1-100 dengan hint panas/dingin"_`
            );
        }

        const namaFitur = result.feature;
        const iterasi = result.iterations || 1;
        const semuaFitur = getAllNemoCommands();

        await msg.reply(
            `✅ *Berhasil!*\n\n` +
            `🆕 *Fitur baru:* !${namaFitur}\n` +
            `🔄 *Iterasi:* ${iterasi}x\n` +
            `👤 *Request:* ${msg.pushName || 'Member'}\n\n` +
            `⏳ Bot update dalam 1-2 menit...`
        );

        // Broadcast setelah berhasil
        await broadcast(sock, db,
            `🎉 *FITUR BARU TERSEDIA!*\n` +
            `${'─'.repeat(28)}\n\n` +
            `✨ *Perintah:* !${namaFitur}\n` +
            `👤 *Request oleh:* ${msg.pushName || 'Member'}\n` +
            `🔄 *Dibuat dalam:* ${iterasi} iterasi\n\n` +
            `Ketik *!${namaFitur}* untuk mencoba!\n\n` +
            `${'─'.repeat(28)}\n` +
            `📋 *Semua fitur Algojo (${semuaFitur.length}):*\n` +
            `${semuaFitur.join(' • ')}\n\n` +
            `_Minta fitur baru: !algojo <deskripsi>_ 🤖`
        );

    } catch (error) {
        cooldowns.delete(cooldownKey);
        await msg.reply(`❌ *Algojo gagal.*\n\nError: ${error.message}\n\nCoba lagi nanti!`);
    }
};