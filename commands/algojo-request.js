// ╔══════════════════════════════════════════════════════════════╗
// ║        ALGOJO REQUEST v4 — WA Bridge                        ║
// ║  Log thinking, webhook handler, broadcast setelah deploy    ║
// ╚══════════════════════════════════════════════════════════════╝

const https = require('https');
const path = require('path');
const fs = require('fs');

const OPENCODE_SERVER = process.env.OPENCODE_SERVER_URL || 'https://algojo-opencode-server-production.up.railway.app';
const OPENCODE_API_KEY = process.env.OPENCODE_API_KEY || 'rahasia123';
const WEBHOOK_KEY = process.env.BOT_WEBHOOK_KEY || 'rahasia123';
const NEMO_DIR = path.join(__dirname, 'nemo');

const cooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000;

// ── HTTP helper ──────────────────────────────────────────────
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
    return fs.readdirSync(NEMO_DIR).filter(f => f.endsWith('.js')).map(f => `!${f.replace('.js','')}`);
}

async function broadcastAll(sock, db, text) {
    const groups = Object.keys(db.groups || {});
    for (const groupId of groups) {
        try {
            await sock.sendMessage(groupId, { text });
            await new Promise(r => setTimeout(r, 1500));
        } catch(e) {}
    }
}

// ══════════════════════════════════════════════════════════════
// WEBHOOK HANDLER — dipanggil dari index.js
// Menerima notif dari Railway: build_start, build_log, fix_log
// ══════════════════════════════════════════════════════════════
async function handleWebhook(payload, sock, db) {
    const { type, groupId } = payload;
    if (!groupId || !sock) return;

    if (type === 'build_start') {
        // Notif mulai ke grup yang request
        await sock.sendMessage(groupId, {
            text:
                `⚙️ *Algojo mulai membangun fitur...*\n\n` +
                `📝 Request: _${payload.prompt}_\n` +
                `👤 Oleh: ${payload.requester || 'Member'}\n\n` +
                `_Akan ada update progress disini_ 🔄`
        });

    } else if (type === 'build_progress') {
        // Update progress per iterasi
        await sock.sendMessage(groupId, {
            text:
                `🔄 *Iterasi ${payload.iteration}...*\n\n` +
                `💭 *Algojo berpikir:*\n_${payload.thinking}_`
        });

    } else if (type === 'build_log') {
        if (payload.success) {
            // Kirim log thinking ke grup yang request
            const features = payload.features || [];
            const logMsg =
                `✅ *Algojo selesai! (${payload.iterations} iterasi)*\n\n` +
                `🆕 *Fitur dibuat:*\n${features.map(f => `• !${f}`).join('\n')}\n\n` +
                `${'─'.repeat(28)}\n` +
                `💭 *Log pembuatan:*\n\n${payload.thinking}\n\n` +
                `${'─'.repeat(28)}\n` +
                `📖 *Cara penggunaan:*\n${payload.usage}\n\n` +
                `⏳ _Broadcast ke semua grup setelah deploy selesai..._`;

            await sock.sendMessage(groupId, { text: logMsg });

            // Simpan pending broadcast untuk setelah deploy
            if (!global.pendingBroadcast) global.pendingBroadcast = {};
            features.forEach(f => {
                global.pendingBroadcast[f] = {
                    features,
                    usage: payload.usage,
                    requester: payload.requester,
                    groupId,
                    timestamp: Date.now()
                };
            });

        } else {
            // Build gagal — kirim log ke grup
            await sock.sendMessage(groupId, {
                text:
                    `❌ *Algojo gagal membuat fitur*\n\n` +
                    `Iterasi: ${payload.iterations}x\n\n` +
                    `💭 *Log:*\n_${payload.thinking}_\n\n` +
                    `Coba request ulang dengan deskripsi lebih detail!`
            });
        }

    } else if (type === 'fix_log') {
        // Log perbaikan ke grup yang request
        await sock.sendMessage(groupId, {
            text:
                `🔧 *Log perbaikan !${payload.feature}:*\n\n` +
                `💭 *Proses fix:*\n_${payload.thinking}_\n\n` +
                `⏳ _Broadcast setelah deploy selesai..._`
        });

        // Simpan pending broadcast fix
        if (!global.pendingBroadcast) global.pendingBroadcast = {};
        global.pendingBroadcast[`fix_${payload.feature}`] = {
            isFix: true,
            feature: payload.feature,
            groupId,
            timestamp: Date.now()
        };
    }
}

// ══════════════════════════════════════════════════════════════
// DEPLOY WEBHOOK HANDLER
// Dipanggil dari Koyeb setelah deploy selesai
// ══════════════════════════════════════════════════════════════
async function handleDeployWebhook(sock, db) {
    if (!global.pendingBroadcast) return;

    const pending = global.pendingBroadcast;
    const processed = new Set();

    for (const [key, data] of Object.entries(pending)) {
        // Skip kalau sudah lebih dari 30 menit (kadaluarsa)
        if (Date.now() - data.timestamp > 30 * 60 * 1000) {
            delete pending[key];
            continue;
        }

        if (data.isFix) {
            if (processed.has(`fix_${data.feature}`)) continue;
            processed.add(`fix_${data.feature}`);

            await broadcastAll(sock, db,
                `🔧 *FITUR DIPERBAIKI & SUDAH AKTIF!*\n` +
                `${'─'.repeat(28)}\n\n` +
                `✅ *Perintah:* !${data.feature}\n` +
                `🤖 *Diperbaiki oleh:* Algojo AI\n\n` +
                `Coba gunakan sekarang!`
            );

        } else {
            const features = data.features || [];
            if (features.some(f => processed.has(f))) continue;
            features.forEach(f => processed.add(f));

            const semuaFitur = getAllNemoCommands();

            await broadcastAll(sock, db,
                `🎉 *FITUR BARU SUDAH AKTIF!*\n` +
                `${'─'.repeat(28)}\n\n` +
                `✨ *Fitur baru:*\n${features.map(f => `• !${f}`).join('\n')}\n\n` +
                `👤 *Request oleh:* ${data.requester || 'Member'}\n\n` +
                `${'─'.repeat(28)}\n` +
                `📖 *Cara penggunaan:*\n${data.usage}\n\n` +
                `${'─'.repeat(28)}\n` +
                `📋 *Semua fitur Algojo (${semuaFitur.length}):*\n` +
                `${semuaFitur.join(' • ')}\n\n` +
                `_Minta fitur: !algojo <deskripsi>_ 🤖`
            );
        }

        delete pending[key];
    }
}

// ══════════════════════════════════════════════════════════════
// MAIN COMMAND HANDLER
// ══════════════════════════════════════════════════════════════
module.exports = async (command, args, msg, user, db, sock, m) => {
    if (command !== 'algojo' && command !== 'perbaiki') return;

    // ── !perbaiki ─────────────────────────────────────────────
    if (command === 'perbaiki') {
        const feature = args[0]?.toLowerCase();
        if (!feature) {
            return msg.reply(
                `🔧 *PERBAIKI FITUR*\n\n` +
                `• \`!perbaiki catur\` — auto fix\n` +
                `• \`!perbaiki catur TypeError: x\` — manual\n\n` +
                `Fitur: ${getAllNemoCommands().join(', ') || 'belum ada'}`
            );
        }

        const manualLog = args.slice(1).join(' ') || null;
        const autoLog = global.nemoErrors?.[feature]
            ? global.nemoErrors[feature].slice(-3).map(e => `[${e.time}] ${e.msg}`).join('\n')
            : null;

        if (!autoLog && !manualLog) {
            return msg.reply(
                `⚠️ Tidak ada error log untuk !${feature}.\n\n` +
                `Kirim manual:\n\`!perbaiki ${feature} <pesan error>\``
            );
        }

        await msg.reply(`🔧 *Memperbaiki !${feature}...*\n\n⏳ Tunggu 2-3 menit...`);

        try {
            const result = await apiRequest('/fix', 'POST', {
                feature,
                errorLog: autoLog,
                manualLog,
                groupId: msg.from
            });

            if (!result.success) return msg.reply(`❌ Gagal: ${result.message || result.error}`);
            if (global.nemoErrors?.[feature]) delete global.nemoErrors[feature];

        } catch(e) {
            await msg.reply(`❌ Error: ${e.message}`);
        }
        return;
    }

    // ── !algojo ───────────────────────────────────────────────
    const subCommand = args[0]?.toLowerCase();

    if (subCommand === 'list') {
        const cmds = getAllNemoCommands();
        return msg.reply(
            `🤖 *FITUR ALGOJO (${cmds.length})*\n\n` +
            (cmds.length > 0 ? cmds.map((c,i) => `${i+1}. ${c}`).join('\n') : '_Belum ada_') +
            `\n\n_!algojo <request> untuk buat fitur baru_`
        );
    }

    if (subCommand === 'status') {
        let qInfo = '';
        try {
            const q = await apiRequest('/queue', 'GET', {});
            qInfo = `📬 Antrian: ${q.total}\n`;
        } catch(e) {}
        const errors = global.nemoErrors || {};
        return msg.reply(
            `🤖 *ALGOJO STATUS*\n\n` +
            `📁 Fitur: ${getAllNemoCommands().length}\n` +
            qInfo +
            `🔴 Error: ${Object.keys(errors).length}\n\n` +
            `_!algojo errors untuk detail_`
        );
    }

    if (subCommand === 'errors') {
        const errors = global.nemoErrors || {};
        if (!Object.keys(errors).length) return msg.reply(`✅ Tidak ada error.`);
        const list = Object.entries(errors)
            .map(([f, logs]) => `🔴 *!${f}*\n${logs.slice(-2).map(e => `  ${e.time}: ${e.msg.slice(0,80)}`).join('\n')}`)
            .join('\n\n');
        return msg.reply(`🔴 *ERROR LOG*\n\n${list}\n\n_!perbaiki <nama> untuk fix_`);
    }

    // Update/force replace fitur yang sudah ada
    if (subCommand === 'update') {
        const targetFeature = args[1]?.toLowerCase();
        const updatePrompt = args.slice(2).join(' ');
        if (!targetFeature || !updatePrompt) {
            return msg.reply(`Format: \`!algojo update <nama> <deskripsi baru>\``);
        }

        await msg.reply(`🔄 *Update fitur !${targetFeature}...*\n\n⏳ Tunggu...`);

        try {
            const result = await apiRequest('/build', 'POST', {
                prompt: updatePrompt,
                requester: msg.pushName,
                groupId: msg.from,
                forceUpdate: true
            });
            if (result.queued) return msg.reply(`📬 Antrian ke-${result.position}`);
            if (!result.success) return msg.reply(`❌ ${result.message}`);
            await msg.reply(`✅ Fitur !${targetFeature} berhasil diupdate!\n\n⏳ Deploy 1-2 menit...`);
        } catch(e) {
            await msg.reply(`❌ Error: ${e.message}`);
        }
        return;
    }

    // ── !algojo <prompt> ──────────────────────────────────────
    const prompt = args.join(' ').trim();
    if (!prompt) {
        return msg.reply(
            `🤖 *ALGOJO AI DEVELOPER*\n\n` +
            `Saya bisa buatkan fitur baru!\n\n` +
            `*Contoh:*\n` +
            `• \`!algojo buatkan fitur cuaca\`\n` +
            `• \`!algojo buatkan game tebak angka\`\n` +
            `• \`!algojo buatkan game catur sederhana\`\n\n` +
            `*Command lain:*\n` +
            `• \`!algojo list\` — fitur tersedia\n` +
            `• \`!algojo status\` — status & antrian\n` +
            `• \`!algojo errors\` — error log\n` +
            `• \`!algojo update <nama> <deskripsi>\` — update fitur\n` +
            `• \`!perbaiki <nama>\` — fix bug\n\n` +
            `${getAllNemoCommands().length > 0 ? `📋 *Fitur (${getAllNemoCommands().length}):* ${getAllNemoCommands().join(', ')}` : '_Belum ada fitur_'}`
        );
    }

    // Cooldown
    const cooldownKey = `${msg.author}_algojo`;
    const lastReq = cooldowns.get(cooldownKey);
    if (lastReq && Date.now() - lastReq < COOLDOWN_MS) {
        const sisa = Math.ceil((COOLDOWN_MS - (Date.now() - lastReq)) / 60000);
        return msg.reply(`⏳ Tunggu ${sisa} menit lagi!`);
    }
    cooldowns.set(cooldownKey, Date.now());

    await msg.reply(
        `🤖 *Algojo mulai bekerja...*\n\n` +
        `📝 *Request:* _${prompt}_\n\n` +
        `_Kamu akan dapat update progress di grup ini_ 🔄`
    );

    try {
        const result = await apiRequest('/build', 'POST', {
            prompt,
            requester: msg.pushName || 'Member',
            groupId: msg.from  // ← kirim groupId ke Railway
        });

        if (result.queued) {
            return msg.reply(
                `📬 *Antrian ke-${result.position}*\n\n` +
                `Estimasi: ~${result.position * 3} menit\n` +
                `_Update akan dikirim di grup ini_`
            );
        }

        if (result.duplicate) {
            return msg.reply(
                `⚠️ *Fitur !${result.existingFeature} sudah ada!*\n\n` +
                `Mau update?\n` +
                `\`!algojo update ${result.existingFeature} ${prompt}\``
            );
        }

        if (!result.success) {
            cooldowns.delete(cooldownKey);
            return msg.reply(`⚠️ *Gagal:* ${result.message}`);
        }

        // Berhasil — log sudah dikirim via webhook
        // Broadcast setelah deploy ditangani oleh handleDeployWebhook

    } catch(e) {
        cooldowns.delete(cooldownKey);
        await msg.reply(`❌ Error: ${e.message}`);
    }
};

// Export handler untuk dipakai di index.js
module.exports.handleWebhook = handleWebhook;
module.exports.handleDeployWebhook = handleDeployWebhook;