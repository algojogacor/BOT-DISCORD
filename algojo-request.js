// ╔══════════════════════════════════════════════════════════════╗
// ║        ALGOJO REQUEST — WA Bridge ke OpenCode               ║
// ║  Siapapun ketik: !algojo buatkan fitur gempa                ║
// ╚══════════════════════════════════════════════════════════════╝

const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');

const BOT_DIR = path.join(__dirname, '..');
const NEMO_DIR = path.join(BOT_DIR, 'commands', 'nemo');

// Cooldown agar tidak spam request
const cooldowns = new Map();
const COOLDOWN_MS = 5 * 60 * 1000; // 5 menit per user

// Jalankan OpenCode dengan prompt
function runOpenCode(prompt) {
    return new Promise((resolve, reject) => {
        const safePrompt = prompt.replace(/'/g, "'\\''");
        const cmd = `cd '${BOT_DIR}' && opencode run '${safePrompt}'`;
        console.log(`[AlgojoRequest] Menjalankan OpenCode: ${prompt}`);
        exec(cmd, { timeout: 180000 }, (error, stdout, stderr) => {
            if (error) { reject(error); } 
            else { resolve(stdout); }
        });
    });
}

// Deteksi file baru di /commands/nemo/
function detectNewFiles(before) {
    const after = new Set(fs.readdirSync(NEMO_DIR).filter(f => f.endsWith('.js')));
    return [...after].filter(f => !before.has(f));
}

// Ambil semua command yang tersedia di /commands/nemo/
function getAllNemoCommands() {
    if (!fs.existsSync(NEMO_DIR)) return [];
    return fs.readdirSync(NEMO_DIR)
        .filter(f => f.endsWith('.js'))
        .map(f => `!${f.replace('.js', '')}`);
}

module.exports = async (command, args, msg, user, db, sock, m) => {
    if (command !== 'algojo') return;

    const subCommand = args[0]?.toLowerCase();

    // ── !algojo list — tampilkan semua fitur buatan Algojo ──
    if (subCommand === 'list') {
        const cmds = getAllNemoCommands();
        if (cmds.length === 0) {
            return msg.reply(`🤖 *ALGOJO AI*\n\nBelum ada fitur yang dibuat Algojo.\nKetik *!algojo <request>* untuk minta fitur baru!`);
        }
        return msg.reply(
            `🤖 *FITUR BUATAN ALGOJO*\n\n` +
            cmds.map((c, i) => `${i + 1}. ${c}`).join('\n') +
            `\n\n_Total: ${cmds.length} fitur_\n` +
            `_Minta fitur baru: !algojo <deskripsi>_`
        );
    }

    // ── !algojo <request> — request fitur baru ──
    const prompt = args.join(' ').trim();
    if (!prompt) {
        const cmds = getAllNemoCommands();
        return msg.reply(
            `🤖 *ALGOJO AI DEVELOPER*\n\n` +
            `Halo! Saya bisa membuatkan fitur baru untuk bot ini.\n\n` +
            `*Cara request:*\n` +
            `• \`!algojo buatkan fitur cuaca\`\n` +
            `• \`!algojo buatkan fitur kalkulator\`\n` +
            `• \`!algojo buatkan fitur jadwal kereta\`\n\n` +
            `*Lihat fitur yang ada:*\n` +
            `• \`!algojo list\`\n\n` +
            `${cmds.length > 0 ? `*Fitur tersedia (${cmds.length}):*\n${cmds.join(', ')}` : `_Belum ada fitur buatan Algojo_`}`
        );
    }

    // Cek cooldown
    const cooldownKey = `${msg.author}_algojo`;
    const lastRequest = cooldowns.get(cooldownKey);
    if (lastRequest && Date.now() - lastRequest < COOLDOWN_MS) {
        const sisaDetik = Math.ceil((COOLDOWN_MS - (Date.now() - lastRequest)) / 1000);
        const sisaMenit = Math.ceil(sisaDetik / 60);
        return msg.reply(`⏳ Sabar ya! Tunggu ${sisaMenit} menit lagi sebelum request berikutnya.`);
    }

    // Set cooldown
    cooldowns.set(cooldownKey, Date.now());

    // Snapshot file sebelum
    if (!fs.existsSync(NEMO_DIR)) fs.mkdirSync(NEMO_DIR, { recursive: true });
    const filesBefore = new Set(fs.readdirSync(NEMO_DIR).filter(f => f.endsWith('.js')));

    await msg.reply(
        `🤖 *Algojo mulai bekerja...*\n\n` +
        `📝 *Request:* _${prompt}_\n\n` +
        `⏳ Mohon tunggu 1-2 menit...\n` +
        `_Algojo sedang: Menulis kode → Audit keamanan → Push ke server_`
    );

    try {
        const fullPrompt = `${prompt}. Simpan file baru di commands/nemo/. Format modul wajib: module.exports = async (command, args, msg, user, db, sock, m) => { if (command !== 'namacommand') return; ... await msg.reply(hasil); }`;
        await runOpenCode(fullPrompt);

        // Deteksi file baru
        const newFiles = detectNewFiles(filesBefore);

        if (newFiles.length === 0) {
            cooldowns.delete(cooldownKey);
            return msg.reply(
                `⚠️ *Algojo selesai tapi tidak ada file baru.*\n\n` +
                `Coba request dengan deskripsi lebih detail.\n` +
                `Contoh: _"buatkan fitur info gempa terbaru dari BMKG"_`
            );
        }

        const namaFitur = newFiles[0].replace('.js', '');
        const semuaFitur = getAllNemoCommands();

        // Konfirmasi ke requester
        await msg.reply(
            `✅ *Algojo selesai!*\n\n` +
            `🆕 Fitur baru: *!${namaFitur}*\n` +
            `👤 Direquest oleh: @${msg.author.split('@')[0]}\n\n` +
            `⏳ Bot sedang update, tunggu 1-2 menit ya!`
        );

        // Broadcast ke semua grup
        const groups = Object.keys(db.groups || {});
        const broadcastMsg =
            `🎉 *FITUR BARU TERSEDIA!*\n` +
            `${'─'.repeat(30)}\n\n` +
            `✨ *Perintah:* !${namaFitur}\n` +
            `👤 *Direquest oleh:* ${msg.pushName || 'Member'}\n\n` +
            `Ketik *!${namaFitur}* untuk mencoba!\n\n` +
            `${'─'.repeat(30)}\n` +
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
            `❌ *Algojo gagal membuat fitur.*\n\n` +
            `Error: ${error.message}\n\n` +
            `Coba lagi dengan deskripsi berbeda!`
        );
    }
};