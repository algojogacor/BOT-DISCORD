// ╔══════════════════════════════════════════════════════════════╗
// ║   AUTO-MOD — commands/discord/automod.js                     ║
// ║   Anti-spam, anti-link, filter kata kasar otomatis           ║
// ╚══════════════════════════════════════════════════════════════╝

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

// ── Konfigurasi ────────────────────────────────────────────────
const SPAM_THRESHOLD  = 5;      // pesan dalam...
const SPAM_WINDOW_MS  = 4000;   // ...4 detik = spam
const MUTE_DURATION   = 5 * 60 * 1000; // timeout 5 menit jika spam

const MOD_LOG_CHANNEL = '📋│mod-log';

// Whitelist channel yang boleh share link (misal share-link)
const LINK_ALLOWED_CHANNELS = ['share-link', 'bot-command', 'link-penting', 'link-akun'];

// Kata kasar yang difilter (tambah sesuai kebutuhan)
const BAD_WORDS = [
    'anjing', 'babi', 'bangsat', 'kontol', 'memek', 'goblok', 'tolol',
    'bajingan', 'asu', 'jancuk', 'ngentot', 'kampret',
];

// Pola link Discord invite
const INVITE_PATTERN = /(discord\.gg|discord\.com\/invite)\/[a-zA-Z0-9]+/i;
// Pola URL umum
const URL_PATTERN = /https?:\/\/[^\s]+/i;

// Cache pesan per user untuk deteksi spam
// Format: { userId: [timestamp, timestamp, ...] }
const msgCache = new Map();

// Cache user yang sedang kena warn automod (untuk hindari double action)
const recentlyActioned = new Set();

module.exports = function registerAutoMod(client) {

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.guild) return;

        // Admin & moderator dibebaskan dari automod
        const member = message.member;
        if (member?.permissions?.has(PermissionFlagsBits.ManageMessages)) return;

        const content   = message.content;
        const userId    = message.author.id;
        const channelName = message.channel.name || '';
        let violated    = null;
        let reason      = '';

        // ── 1. CEK KATA KASAR ───────────────────────────────────
        const lower = content.toLowerCase();
        for (const word of BAD_WORDS) {
            if (lower.includes(word)) {
                violated = 'bad_word';
                reason   = `Menggunakan kata tidak pantas: \`${word}\``;
                break;
            }
        }

        // ── 2. CEK DISCORD INVITE LINK ─────────────────────────
        if (!violated && INVITE_PATTERN.test(content)) {
            const allowed = LINK_ALLOWED_CHANNELS.some(n => channelName.includes(n));
            if (!allowed) {
                violated = 'invite_link';
                reason   = 'Mengirim link invite Discord tanpa izin';
            }
        }

        // ── 3. CEK URL UMUM di channel yg tidak boleh ──────────
        if (!violated && URL_PATTERN.test(content)) {
            const noLinkChannels = ['obrolan', 'meme', 'gaming', 'musik', 'anime'];
            const isNoLink = noLinkChannels.some(n => channelName.includes(n));
            if (isNoLink) {
                violated = 'url';
                reason   = 'Mengirim link di channel yang tidak diperbolehkan';
            }
        }

        // ── 4. CEK SPAM ─────────────────────────────────────────
        if (!violated) {
            const now = Date.now();
            if (!msgCache.has(userId)) msgCache.set(userId, []);
            const times = msgCache.get(userId).filter(t => now - t < SPAM_WINDOW_MS);
            times.push(now);
            msgCache.set(userId, times);

            if (times.length >= SPAM_THRESHOLD) {
                violated = 'spam';
                reason   = `Spam terdeteksi (${times.length} pesan dalam ${SPAM_WINDOW_MS / 1000} detik)`;
                msgCache.delete(userId); // reset cache
            }
        }

        // ── Ambil tindakan jika ada pelanggaran ────────────────
        if (!violated) return;
        if (recentlyActioned.has(userId)) return;

        recentlyActioned.add(userId);
        setTimeout(() => recentlyActioned.delete(userId), 5000);

        try {
            // Hapus pesan
            await message.delete().catch(() => {});

            // Beri peringatan di channel (auto-hapus 8 detik)
            const warn = await message.channel.send(
                `⚠️ ${message.author} **Pesan dihapus otomatis.** ${reason}.`
            );
            setTimeout(() => warn.delete().catch(() => {}), 8000);

            // Timeout jika spam
            if (violated === 'spam') {
                await member.timeout(MUTE_DURATION, reason).catch(() => {});
            }

            // Log ke mod-log
            const logCh = message.guild.channels.cache.find(c => c.name === MOD_LOG_CHANNEL);
            if (logCh) {
                const embed = new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('🤖 AutoMod — Pelanggaran Terdeteksi')
                    .addFields(
                        { name: '👤 User',      value: `${message.author.tag} (${userId})`, inline: true },
                        { name: '📍 Channel',   value: `<#${message.channel.id}>`,          inline: true },
                        { name: '🚨 Jenis',     value: violated,                            inline: true },
                        { name: '📝 Alasan',    value: reason },
                        { name: '💬 Konten',    value: `\`\`\`${content.slice(0, 300)}\`\`\`` },
                        { name: '⚡ Aksi',      value: violated === 'spam' ? `Pesan dihapus + Timeout ${MUTE_DURATION / 60000} menit` : 'Pesan dihapus' }
                    )
                    .setTimestamp();
                await logCh.send({ embeds: [embed] });
            }

        } catch (err) {
            console.error('[AutoMod] Error:', err.message);
        }
    });

    // Bersihkan cache spam setiap 1 menit
    setInterval(() => {
        const now = Date.now();
        for (const [uid, times] of msgCache.entries()) {
            const fresh = times.filter(t => now - t < SPAM_WINDOW_MS);
            if (fresh.length === 0) msgCache.delete(uid);
            else msgCache.set(uid, fresh);
        }
    }, 60000);

    console.log('✅ [AutoMod] Handler terdaftar');
};