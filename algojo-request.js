// ╔══════════════════════════════════════════════════════════════╗
// ║        ALGOJO REQUEST — WA Bridge ke OpenCode Railway       ║
// ║  Siapapun ketik: !algojo buatkan fitur gempa                ║
// ╚══════════════════════════════════════════════════════════════╝

const https = require('https');
const path = require('path');
const fs = require('fs');

const OPENCODE_SERVER = process.env.OPENCODE_SERVER_URL || 'https://algojo-opencode-server-production.up.railway.app';
const OPENCODE_API_KEY = process.env.OPENCODE_API_KEY || 'rahasia123';
const NEMO_DIR = path.join(__dirname, 'nemo');

// Cooldown 5 menit per user
const cooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000;

// HTTP request ke Railway server
function requestBuild(prompt) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ prompt });
        const url = new URL(`${OPENCODE_SERVER}/build`);

        const options = {
            hostname: url.hostname,
            path: url.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
                'x-api-key': OPENCODE_API_KEY
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Invalid response from server')); }
            });
        });

        req.on('error', reject);
        req.setTimeout(300000, () => {
            req.destroy();
            reject(new Error('Request timeout (5 menit)'));
        });
        req.write(body);
        req.end();
    });
}

// Ambil semua fitur dari /commands/nemo/
function getAllNemoCommands() {
    if (!fs.existsSync(NEMO_DIR)) return [];
    return fs.readdirSync(NEMO_DIR)
        .filter(f => f.endsWith('.js'))
        .map(f => `!${f.replace('.js', '')}`);
}

module.exports = async (command, args, msg, user, db, sock, m) => {
    if (command !== 'algojo') return;

    const subCommand = args[0]?.toLowerCase();

    // ── !algojo list ──────────────────────────────────────────
    if (subCommand === 'list') {
        const cmds = getAllNemoCommands();
        if (cmds.length === 0) {
            return msg.reply(`🤖 *ALGOJO AI*\n\nBelum ada fitur buatan Algojo.\nKetik *!algojo <request>* untuk minta fitur baru!`);
        }
        return msg.reply(
            `🤖 *FITUR BUATAN ALGOJO (${cmds.length})*\n\n` +
            cmds.map((c, i) => `${i + 1}. ${c}`).join('\n') +
            `\n\n_Minta fitur baru: !algojo <deskripsi>_`
        );
    }

    // ── !algojo status ────────────────────────────────────────
    if (subCommand === 'status') {
        return msg.reply(
            `🤖 *ALGOJO AI STATUS*\n\n` +
            `🌐 Server: ${OPENCODE_SERVER}\n` +
            `📁 Fitur tersedia: ${getAllNemoCommands().length}\n\n` +
            `_Ketik !algojo list untuk lihat semua fitur_`
        );
    }

    // ── !algojo <request> ─────────────────────────────────────
    const prompt = args.join(' ').trim();
    if (!prompt) {
        const cmds = getAllNemoCommands();
        return msg.reply(
            `🤖 *ALGOJO AI DEVELOPER*\n\n` +
            `Halo! Saya bisa membuatkan fitur baru.\n\n` +
            `*Cara request:*\n` +
            `• \`!algojo buatkan fitur cuaca\`\n` +
            `• \`!algojo buatkan fitur kalkulator\`\n` +
            `• \`!algojo buatkan fitur info gempa\`\n\n` +
            `*Command lain:*\n` +
            `• \`!algojo list\` — lihat semua fitur\n` +
            `• \`!algojo status\` — cek status server\n\n` +
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
        `⏳ Mohon tunggu 2-3 menit...\n` +
        `_Menulis kode → Push ke GitHub → Deploy otomatis_`
    );

    try {
        const result = await requestBuild(prompt);

        if (!result.success) {
            cooldowns.delete(cooldownKey);
            return msg.reply(
                `⚠️ *Algojo selesai tapi tidak ada file baru.*\n\n` +
                `Coba request lebih detail.\n` +
                `Contoh: _"buatkan fitur info gempa terbaru dari BMKG"_`
            );
        }

        const namaFitur = result.feature;
        const semuaFitur = getAllNemoCommands();

        await msg.reply(
            `✅ *Berhasil!*\n\n` +
            `🆕 *Fitur baru:* !${namaFitur}\n` +
            `👤 *Request:* ${msg.pushName || 'Member'}\n\n` +
            `⏳ Bot update dalam 1-2 menit...`
        );

        // Broadcast ke semua grup
        const groups = Object.keys(db.groups || {});
        const broadcastMsg =
            `🎉 *FITUR BARU TERSEDIA!*\n` +
            `${'─'.repeat(28)}\n\n` +
            `✨ *Perintah:* !${namaFitur}\n` +
            `👤 *Request oleh:* ${msg.pushName || 'Member'}\n\n` +
            `Ketik *!${namaFitur}* untuk mencoba!\n\n` +
            `${'─'.repeat(28)}\n` +
            `📋 *Semua fitur Algojo (${semuaFitur.length}):*\n` +
            `${semuaFitur.join(' • ')}\n\n` +
            `_Minta fitur baru: !algojo <deskripsi>_ 🤖`;

        for (const groupId of groups) {
            try {
                await sock.sendMessage(groupId, { text: broadcastMsg });
                await new Promise(r => setTimeout(r, 1500));
            } catch(e) {
                console.error(`[AlgojoRequest] Gagal broadcast ke ${groupId}:`, e.message);
            }
        }

    } catch (error) {
        console.error('[AlgojoRequest] Error:', error);
        cooldowns.delete(cooldownKey);
        await msg.reply(
            `❌ *Algojo gagal.*\n\n` +
            `Error: ${error.message}\n\n` +
            `Coba lagi beberapa saat kemudian!`
        );
    }
};