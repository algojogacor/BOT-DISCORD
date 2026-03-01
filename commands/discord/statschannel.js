// ╔══════════════════════════════════════════════════════════════╗
// ║   STATS CHANNEL — commands/discord/statschannel.js           ║
// ║   Voice channel yang namanya update otomatis tiap 10 menit   ║
// ╚══════════════════════════════════════════════════════════════╝

const { ChannelType, PermissionFlagsBits } = require('discord.js');

// Interval update (ms) — Discord rate limit: min 10 menit per channel rename
const UPDATE_INTERVAL = 10 * 60 * 1000; // 10 menit

// Kategori tempat stats channels dibuat
const STATS_CATEGORY = '📊 SERVER STATS';

// Definisi stats yang ditampilkan
const STATS_CHANNELS = [
    {
        key:  'members',
        name: (guild) => `👥 Member: ${guild.memberCount}`,
        desc: 'Total semua member server',
    },
    {
        key:  'online',
        name: (guild) => {
            const online = guild.members.cache.filter(
                m => m.presence?.status && m.presence.status !== 'offline' && !m.user.bot
            ).size;
            return `🟢 Online: ${online}`;
        },
        desc: 'Member yang sedang online',
    },
    {
        key:  'bots',
        name: (guild) => {
            const bots = guild.members.cache.filter(m => m.user.bot).size;
            return `🤖 Bot: ${bots}`;
        },
        desc: 'Jumlah bot di server',
    },
    {
        key:  'channels',
        name: (guild) => {
            const count = guild.channels.cache.filter(
                c => c.type === ChannelType.GuildText
            ).size;
            return `📝 Channel: ${count}`;
        },
        desc: 'Total text channel aktif',
    },
];

// Simpan ID channel stats agar tidak dibuat ulang
// Format: { guildId: { members: channelId, online: channelId, ... } }
const statsChannelIds = {};

module.exports = function registerStatsChannel(client) {

    // ── Fungsi update nama channel ─────────────────────────────────
    async function updateStats(guild) {
        try {
            // Fetch fresh member data untuk status online
            await guild.members.fetch();

            const guildStats = statsChannelIds[guild.id];
            if (!guildStats) return;

            for (const stat of STATS_CHANNELS) {
                const channelId = guildStats[stat.key];
                if (!channelId) continue;

                const channel = guild.channels.cache.get(channelId);
                if (!channel) continue;

                const newName = stat.name(guild);
                if (channel.name !== newName) {
                    await channel.setName(newName).catch(() => {}); // ignore rate limit error
                }
            }
        } catch (err) {
            console.error('[StatsChannel] Update error:', err.message);
        }
    }

    // ── Command !statsmenu (admin only) — buat stats channel ──────
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.content.toLowerCase() !== '!statsmenu') return;

        const isAdmin = message.member?.permissions?.has('Administrator');
        if (!isAdmin) {
            return message.reply('❌ Hanya admin yang bisa menjalankan `!statsmenu`!');
        }

        const guild = message.guild;
        await message.reply('📊 Membuat stats channels...');

        try {
            // Buat atau cari kategori
            let category = guild.channels.cache.find(
                c => c.name === STATS_CATEGORY && c.type === ChannelType.GuildCategory
            );
            if (!category) {
                category = await guild.channels.create({
                    name: STATS_CATEGORY,
                    type: ChannelType.GuildCategory,
                    // Urutkan di atas semua kategori lain
                    position: 0,
                    reason: 'Algojo Bot — Stats Channel',
                });
            }

            if (!statsChannelIds[guild.id]) statsChannelIds[guild.id] = {};

            for (const stat of STATS_CHANNELS) {
                // Cek apakah sudah ada
                let ch = guild.channels.cache.get(statsChannelIds[guild.id][stat.key]);
                if (!ch) {
                    ch = await guild.channels.create({
                        name: stat.name(guild),
                        type: ChannelType.GuildVoice,
                        parent: category.id,
                        permissionOverwrites: [
                            // Semua orang bisa lihat tapi tidak bisa join/bicara
                            {
                                id: guild.roles.everyone,
                                allow: [PermissionFlagsBits.ViewChannel],
                                deny:  [PermissionFlagsBits.Connect],
                            },
                        ],
                        reason: 'Algojo Bot — Stats Channel',
                    });
                }
                statsChannelIds[guild.id][stat.key] = ch.id;
            }

            await message.reply(
                `✅ **Stats channels siap!**\n` +
                `Kategori **${STATS_CATEGORY}** sudah dibuat di atas server.\n` +
                `Data akan diperbarui otomatis setiap **10 menit**.`
            );

            // Update langsung
            await updateStats(guild);

        } catch (err) {
            console.error('[StatsChannel] Setup error:', err.message);
            await message.reply(`❌ Gagal membuat stats channel: ${err.message}`);
        }
    });

    // ── Auto-update saat bot ready ─────────────────────────────────
    client.once('clientReady', () => {
        setInterval(async () => {
            for (const guild of client.guilds.cache.values()) {
                if (statsChannelIds[guild.id]) {
                    await updateStats(guild);
                }
            }
        }, UPDATE_INTERVAL);

        console.log('✅ [StatsChannel] Auto-update interval aktif (10 menit)');
    });

    // ── Update juga saat ada member join/leave ─────────────────────
    client.on('guildMemberAdd',    async (member) => updateStats(member.guild));
    client.on('guildMemberRemove', async (member) => updateStats(member.guild));

    console.log('✅ [StatsChannel] Event handler terdaftar');
};