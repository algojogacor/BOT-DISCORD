// ╔══════════════════════════════════════════════════════════════╗
// ║   LEVEL XP DISCORD — commands/discord/levelxp.js             ║
// ║   XP dari chat Discord, naik level → auto role               ║
// ╚══════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');

// XP per pesan (acak antara min-max)
const XP_PER_MSG = { min: 15, max: 25 };
// Cooldown antar XP (detik) — cegah spam farming XP
const XP_COOLDOWN_SEC = 60;
// Channel yang tidak memberi XP
const NO_XP_CHANNELS = ['bot-command', 'spam', 'mod-log', 'laporan', 'mod-chat'];

// XP disimpan di global.db.discordXP (persistent MongoDB)
const getXP = () => {
    if (!global.db.discordXP) global.db.discordXP = {};
    return global.db.discordXP;
};
// Cooldown cache: Set of "guildId_userId"
const xpCooldown = new Set();

// Rumus XP untuk naik level: level * 100
const xpToLevel = (lvl) => lvl * 100;

// Role yang diberikan otomatis per milestone level
// Key = level yang harus dicapai, value = nama role
const LEVEL_ROLES = {
    5:  '🌟 Member',
    10: '🎖️ Level 10+',
    25: '💎 VIP',
    50: '🏆 Legend',
};

module.exports = function registerLevelXP(client) {

    // ── XP saat pesan dikirim ──────────────────────────────────────
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.guild) return;
        if (message.content.length < 3) return; // abaikan pesan sangat pendek

        const channelName = message.channel.name || '';
        if (NO_XP_CHANNELS.some(n => channelName.includes(n))) return;

        const userId   = message.author.id;
        const guildId  = message.guild.id;
        const key      = `${guildId}_${userId}`;

        // Cek cooldown
        if (xpCooldown.has(key)) return;
        xpCooldown.add(key);
        setTimeout(() => xpCooldown.delete(key), XP_COOLDOWN_SEC * 1000);

        // Init data jika belum ada
        const xpData = getXP();
        if (!xpData[key]) xpData[key] = { xp: 0, level: 0 };
        const data = xpData[key];

        // Tambah XP acak
        const earned = Math.floor(Math.random() * (XP_PER_MSG.max - XP_PER_MSG.min + 1)) + XP_PER_MSG.min;
        data.xp += earned;

        // Cek level up
        const needed = xpToLevel(data.level + 1);
        if (data.xp >= needed) {
            data.xp    -= needed;
            data.level += 1;

            // Kirim notif level up
            const embed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('🎊 LEVEL UP — Discord!')
                .setDescription(
                    `${message.author} sekarang **Level ${data.level}** di Discord!\n` +
                    `XP berikutnya: **${xpToLevel(data.level + 1)} XP**`
                )
                .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
                .setTimestamp();

            await message.channel.send({ embeds: [embed] });

            // Auto-assign role berdasarkan level
            const roleName = LEVEL_ROLES[data.level];
            if (roleName) {
                const role = message.guild.roles.cache.find(r => r.name === roleName);
                if (role) {
                    await message.member.roles.add(role).catch(() => {});
                    await message.channel.send(
                        `🎉 ${message.author} mendapat role **${roleName}** karena mencapai Level ${data.level}!`
                    );
                }
            }
        }
    });

    // ── Command !rank ──────────────────────────────────────────────
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.content.toLowerCase().startsWith('!rank')) return;

        const args   = message.content.slice(1).trim().split(/ +/);
        const cmd    = args.shift().toLowerCase();
        if (cmd !== 'rank') return;

        const target = message.mentions.members?.first() || message.member;
        const key    = `${message.guild.id}_${target.id}`;
        const xpDb  = getXP();
        const data   = xpDb[key] || { xp: 0, level: 0 };

        const needed  = xpToLevel(data.level + 1);
        const percent = Math.min(Math.round((data.xp / needed) * 100), 100);
        const bar     = '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10));

        // Ranking di server
        const sorted = [...Object.entries(getXP())]
            .filter(([k]) => k.startsWith(message.guild.id))
            .sort(([, a], [, b]) => (b.level * 10000 + b.xp) - (a.level * 10000 + a.xp));
        const rank = sorted.findIndex(([k]) => k === key) + 1;

        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle(`📊 Rank Discord — ${target.user.username}`)
            .setThumbnail(target.user.displayAvatarURL({ dynamic: true }))
            .addFields(
                { name: '🎖️ Level',    value: `${data.level}`,       inline: true },
                { name: '⭐ XP',       value: `${data.xp} / ${needed}`, inline: true },
                { name: '🏆 Rank',     value: `#${rank}`,            inline: true },
                { name: '📊 Progress', value: `[${bar}] ${percent}%` }
            )
            .setFooter({ text: `XP Discord — terpisah dari level bot WA` })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    });

    // ── Command !toprank ───────────────────────────────────────────
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.content.toLowerCase() !== '!toprank') return;

        const guildId = message.guild.id;
        const sorted  = [...Object.entries(getXP())]
            .filter(([k]) => k.startsWith(guildId))
            .sort(([, a], [, b]) => (b.level * 10000 + b.xp) - (a.level * 10000 + a.xp))
            .slice(0, 10);

        if (!sorted.length) return message.reply('Belum ada data XP.');

        const medals = ['🥇', '🥈', '🥉'];
        const lines  = await Promise.all(sorted.map(async ([key, data], i) => {
            const uid    = key.split('_')[1];
            const member = await message.guild.members.fetch(uid).catch(() => null);
            const name   = member?.user.username || `User-${uid}`;
            return `${medals[i] || `**${i + 1}.**`} **${name}** — Level ${data.level} (${data.xp} XP)`;
        }));

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🏆 Top Rank Discord')
            .setDescription(lines.join('\n'))
            .setFooter({ text: 'Berdasarkan aktivitas chat di Discord' })
            .setTimestamp();

        await message.reply({ embeds: [embed] });
    });

    console.log('✅ [LevelXP] Handler terdaftar');
};