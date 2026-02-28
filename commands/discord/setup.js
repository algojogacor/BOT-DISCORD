// ╔══════════════════════════════════════════════════════════════╗
// ║   SETUP — commands/discord/setup.js                          ║
// ║   Auto-buat semua channel, kategori, dan role yang dibutuhkan║
// ╚══════════════════════════════════════════════════════════════╝

const { ChannelType, PermissionFlagsBits } = require('discord.js');

module.exports = async function setupCmd(command, args, msg, user, db, client) {
    if (command !== 'setup') return;

    // Hanya owner server yang boleh jalankan !setup
    const guild = msg._discordMessage.guild;
    if (!guild) return msg.reply('❌ Command ini hanya bisa dipakai di server!');

    const member = msg._discordMessage.member;
    if (guild.ownerId !== member.id) {
        return msg.reply('❌ Hanya **owner server** yang bisa menjalankan `!setup`!');
    }

    await msg.reply('⚙️ Memulai setup server... Mohon tunggu!');

    try {
        // ══════════════════════════════════════════════════════
        // 1. BUAT ROLES
        // ══════════════════════════════════════════════════════
        const rolesConfig = [
            { name: '👑 Owner',      color: '#FFD700', hoist: true, position: 10 },
            { name: '⚔️ Admin',      color: '#FF4444', hoist: true, position: 9  },
            { name: '🛡️ Moderator', color: '#FF8C00', hoist: true, position: 8  },
            { name: '💎 VIP',        color: '#9B59B6', hoist: true, position: 7  },
            { name: '🎖️ Level 10+', color: '#3498DB', hoist: true, position: 6  },
            { name: '🌟 Member',     color: '#2ECC71', hoist: true, position: 5  },
        ];

        const createdRoles = {};
        for (const r of rolesConfig) {
            // Cek kalau role sudah ada
            const existing = guild.roles.cache.find(role => role.name === r.name);
            if (existing) {
                createdRoles[r.name] = existing;
                continue;
            }
            const role = await guild.roles.create({
                name: r.name,
                color: r.color,
                hoist: r.hoist,
                reason: 'Algojo Bot Setup',
            });
            createdRoles[r.name] = role;
        }

        // ══════════════════════════════════════════════════════
        // 2. BUAT KATEGORI & CHANNEL
        // ══════════════════════════════════════════════════════
        const structure = [
            {
                category: '📢 INFORMASI',
                channels: [
                    { name: '📜│aturan',        type: ChannelType.GuildText, topic: 'Peraturan server' },
                    { name: '📣│pengumuman',     type: ChannelType.GuildText, topic: 'Pengumuman resmi' },
                    { name: '👋│perkenalan',     type: ChannelType.GuildText, topic: 'Perkenalkan dirimu!' },
                    { name: '🔗│link-penting',  type: ChannelType.GuildText, topic: 'Link & resource penting' },
                ],
            },
            {
                category: '💬 CHAT UMUM',
                channels: [
                    { name: '💬│obrolan',        type: ChannelType.GuildText, topic: 'Chat bebas & santai' },
                    { name: '😂│meme',           type: ChannelType.GuildText, topic: 'Kirim meme lucu' },
                    { name: '🖼️│media',         type: ChannelType.GuildText, topic: 'Share foto & video' },
                    { name: '🔗│share-link',    type: ChannelType.GuildText, topic: 'Share link menarik' },
                ],
            },
            {
                category: '🤖 ALGOJO BOT',
                channels: [
                    { name: '🤖│bot-command',   type: ChannelType.GuildText, topic: 'Ketik command bot di sini | !menu !menufull' },
                    { name: '💰│ekonomi',       type: ChannelType.GuildText, topic: 'Bank, transfer, investasi | !bank !dompet' },
                    { name: '🎮│game-casino',   type: ChannelType.GuildText, topic: 'Casino, slot, roulette | !casino !slot !rolet' },
                    { name: '🌾│farming',       type: ChannelType.GuildText, topic: 'Farming & ternak | !tanam !kandang' },
                    { name: '⛏️│mining',        type: ChannelType.GuildText, topic: 'Mining BTC & crypto | !mining !claimmining' },
                    { name: '⚽│sportsbook',    type: ChannelType.GuildText, topic: 'Taruhan bola | !bola !bet !parlay' },
                    { name: '🤖│ai-chat',       type: ChannelType.GuildText, topic: 'Chat dengan AI | !ai !ai1 !ai2' },
                    { name: '📊│leaderboard',   type: ChannelType.GuildText, topic: 'Ranking & statistik | !top !topminer' },
                ],
            },
            {
                category: '🎭 HIBURAN',
                channels: [
                    { name: '🎵│musik',         type: ChannelType.GuildText, topic: 'Request & diskusi musik' },
                    { name: '🎮│gaming',        type: ChannelType.GuildText, topic: 'Diskusi game' },
                    { name: '📺│anime-manga',   type: ChannelType.GuildText, topic: 'Diskusi anime & manga' },
                    { name: '⚽│olahraga',      type: ChannelType.GuildText, topic: 'Diskusi olahraga & bola' },
                ],
            },
            {
                category: '🔊 VOICE',
                channels: [
                    { name: '🔊 Lounge',         type: ChannelType.GuildVoice },
                    { name: '🎮 Gaming Room',    type: ChannelType.GuildVoice },
                    { name: '🎵 Music Room',     type: ChannelType.GuildVoice },
                    { name: '📚 Study Room',     type: ChannelType.GuildVoice },
                ],
            },
            {
                category: '🛡️ MODERASI',
                channels: [
                    { name: '📋│mod-log',       type: ChannelType.GuildText, topic: 'Log moderasi', adminOnly: true },
                    { name: '⚠️│laporan',       type: ChannelType.GuildText, topic: 'Laporan pelanggaran', adminOnly: true },
                    { name: '🔧│mod-chat',      type: ChannelType.GuildText, topic: 'Chat internal mod', adminOnly: true },
                ],
            },
        ];

        const botRole   = guild.roles.cache.find(r => r.managed); // role bot
        const adminRole = createdRoles['⚔️ Admin'];

        for (const cat of structure) {
            // Cek apakah kategori sudah ada
            let category = guild.channels.cache.find(
                c => c.name === cat.category && c.type === ChannelType.GuildCategory
            );

            if (!category) {
                category = await guild.channels.create({
                    name: cat.category,
                    type: ChannelType.GuildCategory,
                    reason: 'Algojo Bot Setup',
                });
            }

            for (const ch of cat.channels) {
                // Cek apakah channel sudah ada
                const existing = guild.channels.cache.find(
                    c => c.name === ch.name.replace(/[│|]/g, '').trim().toLowerCase().replace(/\s+/g, '-') ||
                         c.name === ch.name
                );
                if (existing) continue;

                const permissionOverwrites = [];

                // Channel admin only
                if (ch.adminOnly) {
                    permissionOverwrites.push(
                        {
                            id: guild.roles.everyone,
                            deny: [PermissionFlagsBits.ViewChannel],
                        },
                        ...(adminRole ? [{
                            id: adminRole.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        }] : []),
                        ...(botRole ? [{
                            id: botRole.id,
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        }] : []),
                    );
                }

                await guild.channels.create({
                    name: ch.name,
                    type: ch.type,
                    parent: category.id,
                    topic: ch.topic || '',
                    permissionOverwrites,
                    reason: 'Algojo Bot Setup',
                });
            }
        }

        // ══════════════════════════════════════════════════════
        // 3. SET CHANNEL BOT-COMMAND SEBAGAI DEFAULT
        // ══════════════════════════════════════════════════════
        const botChannel = guild.channels.cache.find(c => c.name.includes('bot-command'));

        // ══════════════════════════════════════════════════════
        // 4. KIRIM PESAN SELAMAT DATANG KE CHANNEL PENGUMUMAN
        // ══════════════════════════════════════════════════════
        const announcementChannel = guild.channels.cache.find(c => c.name.includes('pengumuman'));
        if (announcementChannel) {
            await announcementChannel.send(
`🎉 **Algojo Bot v2.0 telah disetup!**

Halo @everyone! Server ini telah dikonfigurasi dengan Algojo Bot.

**🤖 Cara mulai:**
> Pergi ke <#${botChannel?.id || 'channel bot-command'}> dan ketik \`!menu\` atau \`!menufull\`

**💰 Fitur utama:**
> Ekonomi • Farming • Mining • Casino • AI Chat • Sportsbook • dan masih banyak lagi!

**🔗 Link Akun WA:**
> Ketik \`!link 628xxxxxxxxxx\` untuk hubungkan akun WA kamu

Selamat bermain! ⚔️`
            );
        }

        // ══════════════════════════════════════════════════════
        // 5. LAPORAN SETUP SELESAI
        // ══════════════════════════════════════════════════════
        const totalChannels = structure.reduce((acc, cat) => acc + cat.channels.length, 0);
        await msg.reply(
`✅ **Setup selesai!**

📁 **Kategori dibuat:** ${structure.length}
📝 **Channel dibuat:** ${totalChannels}
🎭 **Role dibuat:** ${rolesConfig.length}

**Channel bot utama:** ${botChannel ? `<#${botChannel.id}>` : '#bot-command'}

Semua channel dan role sudah siap digunakan! 🚀`
        );

    } catch (err) {
        console.error('[Setup]', err);
        await msg.reply(`❌ Setup gagal: ${err.message}`);
    }
};