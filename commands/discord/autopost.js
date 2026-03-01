// ╔══════════════════════════════════════════════════════════════╗
// ║   AUTO POST HARIAN — commands/discord/autopost.js            ║
// ║   Bot otomatis posting reminder pagi + recap malam           ║
// ╚══════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');

// ── Konfigurasi waktu (format 24 jam, WIB = UTC+7) ─────────────
const MORNING_HOUR = 8;   // 08:00 WIB — reminder pagi
const EVENING_HOUR = 20;  // 20:00 WIB — recap malam

// ── Channel tujuan ─────────────────────────────────────────────
const BOT_CHANNEL    = '🤖│bot-command';
const BOARD_CHANNEL  = '🏆│leaderboard';

// ── Cek apakah sudah diposting hari ini (prevent double post) ──
const postedToday = { morning: null, evening: null };

// ── Quote motivasi acak untuk pagi ─────────────────────────────
const MORNING_QUOTES = [
    '"Hari baru, cuan baru. Jangan lupa !daily!"',
    '"Petani sukses selalu siram tanamannya pagi-pagi. !siram yuk!"',
    '"Miner yang rajin klaim BTC setiap hari. Kamu sudah !claimmining?"',
    '"Investor hebat dimulai dari kebiasaan kecil — cek !saham harianmu."',
    '"Server hidup, cuan terus. Semangat main hari ini! ⚔️"',
    '"Jangan biarkan mining-mu nganggur. !claimmining sekarang!"',
];

// ── Helper: ambil top users dari db ────────────────────────────
function getTopUsers(db, key, n = 5) {
    if (!db?.users) return [];
    return Object.values(db.users)
        .filter(u => u && u.name)
        .sort((a, b) => (b[key] || 0) - (a[key] || 0))
        .slice(0, n);
}

function fmt(n) {
    return Math.floor(n || 0).toLocaleString('id-ID');
}

function medal(i) {
    return ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][i] || `${i + 1}.`;
}

module.exports = function registerAutoPost(client) {

    // ── Fungsi kirim reminder pagi ─────────────────────────────────
    async function postMorning(guild) {
        const channel = guild.channels.cache.find(c => c.name === BOT_CHANNEL);
        if (!channel) return;

        const quote = MORNING_QUOTES[Math.floor(Math.random() * MORNING_QUOTES.length)];

        const embed = new EmbedBuilder()
            .setColor('#F39C12')
            .setTitle('☀️ Selamat Pagi! Waktunya Cuan!')
            .setDescription(quote)
            .addFields(
                {
                    name: '📋 Checklist Harian',
                    value:
                        '✅ `!daily` — Ambil reward harian\n' +
                        '✅ `!kerja` — Masuk kerja & gaji\n' +
                        '✅ `!siram` — Siram tanaman\n' +
                        '✅ `!pakan` — Kasih makan ternak\n' +
                        '✅ `!claimmining` — Klaim BTC mining\n' +
                        '✅ `!makan` — Jaga HP karakter!',
                },
                {
                    name: '💡 Tips Hari Ini',
                    value:
                        '• Cek harga saham & crypto sekarang\n' +
                        '• Jangan biarkan HP karakter sampai 0% — bisa mati!\n' +
                        '• Set reminder: `!remind 4h Claim mining`',
                }
            )
            .setFooter({ text: `📅 ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}` })
            .setTimestamp();

        await channel.send({
            content: '@everyone ☀️ **Selamat pagi! Jangan lupa checklist harianmu!**',
            embeds: [embed],
        });

        console.log(`[AutoPost] ☀️ Morning post dikirim ke guild: ${guild.name}`);
    }

    // ── Fungsi kirim recap malam ───────────────────────────────────
    async function postEvening(guild) {
        const channel = guild.channels.cache.find(c => c.name === BOARD_CHANNEL);
        if (!channel) return;

        const db = global.db;

        // Top saldo
        const topSaldo = getTopUsers(db, 'balance');
        const saldoList = topSaldo.length
            ? topSaldo.map((u, i) => `${medal(i)} **${u.name}** — Rp ${fmt(u.balance)}`).join('\n')
            : '_Belum ada data_';

        // Top bank (total kekayaan = balance + bank)
        const topKaya = Object.values(db?.users || {})
            .filter(u => u?.name)
            .sort((a, b) => ((b.balance || 0) + (b.bank || 0)) - ((a.balance || 0) + (a.bank || 0)))
            .slice(0, 5);
        const kayaList = topKaya.length
            ? topKaya.map((u, i) =>
                `${medal(i)} **${u.name}** — Rp ${fmt((u.balance || 0) + (u.bank || 0))}`
              ).join('\n')
            : '_Belum ada data_';

        // Top miner (dari hashrate / total BTC)
        const topMiner = Object.values(db?.users || {})
            .filter(u => u?.name && u?.mining?.totalHash)
            .sort((a, b) => (b.mining?.totalHash || 0) - (a.mining?.totalHash || 0))
            .slice(0, 5);
        const minerList = topMiner.length
            ? topMiner.map((u, i) =>
                `${medal(i)} **${u.name}** — ${fmt(u.mining?.totalHash || 0)} H/s`
              ).join('\n')
            : '_Belum ada data_';

        // Top level
        const topLevel = getTopUsers(db, 'level');
        const levelList = topLevel.length
            ? topLevel.map((u, i) => `${medal(i)} **${u.name}** — Level ${u.level}`).join('\n')
            : '_Belum ada data_';

        // Total stats server
        const totalUsers    = Object.keys(db?.users || {}).length;
        const totalMessages = db?.analytics?.totalMessages || 0;
        const mostUsedCmd   = (() => {
            const cmds = db?.analytics?.commands || {};
            const sorted = Object.entries(cmds).sort(([,a],[,b]) => b - a);
            return sorted[0] ? `\`!${sorted[0][0]}\` (${sorted[0][1]}x)` : '_-_';
        })();

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🌙 Recap Harian Server')
            .setDescription(`Ringkasan aktivitas **${guild.name}** hari ini`)
            .addFields(
                { name: '💰 Top Saldo Dompet', value: saldoList,  inline: true },
                { name: '🏦 Top Total Kekayaan', value: kayaList, inline: true },
                { name: '\u200B', value: '\u200B' }, // spacer
                { name: '⛏️ Top Miner',          value: minerList, inline: true },
                { name: '🎖️ Top Level',          value: levelList, inline: true },
                { name: '\u200B', value: '\u200B' },
                {
                    name: '📊 Statistik Server',
                    value:
                        `👥 Total player: **${totalUsers}**\n` +
                        `💬 Pesan hari ini: **${totalMessages}**\n` +
                        `⚡ Command terpopuler: ${mostUsedCmd}`,
                }
            )
            .setFooter({ text: 'Update setiap malam pukul 20:00 WIB' })
            .setTimestamp();

        await channel.send({
            content: '🌙 **Recap Harian — Siapa yang paling cuan hari ini?**',
            embeds: [embed],
        });

        // Reset counter pesan harian (opsional)
        if (db?.analytics) db.analytics.totalMessages = 0;

        console.log(`[AutoPost] 🌙 Evening recap dikirim ke guild: ${guild.name}`);
    }

    // ── Loop cek waktu setiap menit ────────────────────────────────
    client.once('clientReady', () => {
        setInterval(async () => {
            const now  = new Date();
            // Offset ke WIB (UTC+7)
            const wib  = new Date(now.getTime() + 7 * 60 * 60 * 1000);
            const hour = wib.getUTCHours();
            const min  = wib.getUTCMinutes();
            const today = wib.toISOString().split('T')[0];

            for (const guild of client.guilds.cache.values()) {
                // Pagi 08:00
                if (hour === MORNING_HOUR && min === 0) {
                    if (postedToday.morning !== today) {
                        postedToday.morning = today;
                        await postMorning(guild).catch(e =>
                            console.error('[AutoPost] Morning error:', e.message)
                        );
                    }
                }

                // Malam 20:00
                if (hour === EVENING_HOUR && min === 0) {
                    if (postedToday.evening !== today) {
                        postedToday.evening = today;
                        await postEvening(guild).catch(e =>
                            console.error('[AutoPost] Evening error:', e.message)
                        );
                    }
                }
            }
        }, 60 * 1000); // cek setiap 1 menit

        console.log('✅ [AutoPost] Scheduler aktif — pagi 08:00 & malam 20:00 WIB');
    });

    // ── Command manual (admin) ─────────────────────────────────────
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        const cmd = message.content.toLowerCase();

        const isAdmin = message.member?.permissions?.has('Administrator');
        if (!isAdmin) return;

        // Test post manual
        if (cmd === '!testmorning') {
            await postMorning(message.guild).catch(console.error);
            await message.reply('✅ Morning post dikirim!');
        }
        if (cmd === '!testevening') {
            await postEvening(message.guild).catch(console.error);
            await message.reply('✅ Evening recap dikirim!');
        }
    });

    console.log('✅ [AutoPost] Handler terdaftar');
};