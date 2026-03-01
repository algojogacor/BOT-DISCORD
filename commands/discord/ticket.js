// ╔══════════════════════════════════════════════════════════════╗
// ║   TICKET SYSTEM — commands/discord/ticket.js                 ║
// ║   Tiket privat member ↔ admin, tombol buka & tutup           ║
// ╚══════════════════════════════════════════════════════════════╝

const {
    EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
    ChannelType, PermissionFlagsBits,
} = require('discord.js');

const TICKET_CATEGORY  = '🎫 TIKET';
const SUPPORT_CHANNEL  = '📋│laporan';   // channel untuk post panel tiket
const MOD_LOG_CHANNEL  = '📋│mod-log';
const ADMIN_ROLE_NAME  = '⚔️ Admin';
const MOD_ROLE_NAME    = '🛡️ Moderator';

// Simpan tiket aktif: { guildId_userId: channelId }
const activeTickets = new Map();

module.exports = function registerTicket(client) {

    // ── Command !ticketmenu (admin) — posting panel tiket ─────────
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.content.toLowerCase() !== '!ticketmenu') return;

        const isAdmin = message.member?.permissions?.has(PermissionFlagsBits.Administrator);
        if (!isAdmin) return message.reply('❌ Hanya admin!');

        const channel = message.guild.channels.cache.find(c => c.name === SUPPORT_CHANNEL)
            || message.channel;

        const embed = new EmbedBuilder()
            .setColor('#3498DB')
            .setTitle('🎫 Sistem Dukungan & Laporan')
            .setDescription(
                'Butuh bantuan atau ingin melaporkan sesuatu?\n' +
                'Klik tombol di bawah untuk membuka tiket privat.\n\n' +
                '> Tim admin akan merespons secepatnya.\n' +
                '> Satu user hanya boleh memiliki **1 tiket aktif** sekaligus.'
            )
            .addFields(
                { name: '📋 Laporan Member',    value: 'Laporkan pelanggaran member lain',   inline: true },
                { name: '🐛 Bug Bot',            value: 'Laporkan bug atau error bot',        inline: true },
                { name: '❓ Pertanyaan',         value: 'Tanya langsung ke admin',            inline: true },
            )
            .setFooter({ text: 'Jangan spam tiket — gunakan dengan bijak' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('ticket_open').setLabel('📩 Buka Tiket').setStyle(ButtonStyle.Primary),
        );

        await channel.send({ embeds: [embed], components: [row] });
        if (channel.id !== message.channel.id) await message.reply(`✅ Panel tiket dikirim ke <#${channel.id}>!`);
    });

    // ── Handler interaksi tombol ───────────────────────────────────
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const { customId, guild, member, user } = interaction;

        // ── Buka Tiket ─────────────────────────────────────────────
        if (customId === 'ticket_open') {
            await interaction.deferReply({ ephemeral: true });

            const ticketKey = `${guild.id}_${user.id}`;
            const existing  = activeTickets.get(ticketKey);
            if (existing) {
                const existCh = guild.channels.cache.get(existing);
                if (existCh) {
                    return interaction.editReply(
                        `❌ Kamu sudah punya tiket aktif: <#${existing}>\nTutup tiket itu dulu sebelum membuat yang baru.`
                    );
                }
                activeTickets.delete(ticketKey);
            }

            // Buat atau cari kategori tiket
            let category = guild.channels.cache.find(
                c => c.name === TICKET_CATEGORY && c.type === ChannelType.GuildCategory
            );
            if (!category) {
                category = await guild.channels.create({
                    name: TICKET_CATEGORY,
                    type: ChannelType.GuildCategory,
                    reason: 'Ticket System',
                });
            }

            const adminRole = guild.roles.cache.find(r => r.name === ADMIN_ROLE_NAME);
            const modRole   = guild.roles.cache.find(r => r.name === MOD_ROLE_NAME);

            // Buat channel tiket privat
            const ticketChannel = await guild.channels.create({
                name: `tiket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
                type: ChannelType.GuildText,
                parent: category.id,
                topic: `Tiket milik ${user.tag} | ID: ${user.id}`,
                permissionOverwrites: [
                    { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    ...(adminRole ? [{ id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] }] : []),
                    ...(modRole   ? [{ id: modRole.id,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
                ],
                reason: `Tiket dibuka oleh ${user.tag}`,
            });

            activeTickets.set(ticketKey, ticketChannel.id);

            // Kirim pesan pembuka di channel tiket
            const ticketEmbed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🎫 Tiket Dibuka')
                .setDescription(
                    `Halo ${user}! Selamat datang di tiket dukunganmu.\n\n` +
                    `Jelaskan masalah atau laporanmu secara **detail** di sini.\n` +
                    `Tim admin/mod akan segera merespons.\n\n` +
                    `> Klik tombol **Tutup Tiket** jika masalah sudah selesai.`
                )
                .addFields({ name: '🕐 Dibuka', value: `<t:${Math.floor(Date.now() / 1000)}:F>` })
                .setFooter({ text: `User ID: ${user.id}` });

            const closeRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('ticket_close')
                    .setLabel('🔒 Tutup Tiket')
                    .setStyle(ButtonStyle.Danger),
            );

            await ticketChannel.send({
                content: `${user} ${adminRole ? `<@&${adminRole.id}>` : ''}`,
                embeds: [ticketEmbed],
                components: [closeRow],
            });

            await interaction.editReply(`✅ Tiketmu sudah dibuat: <#${ticketChannel.id}>`);

            // Log
            const logCh = guild.channels.cache.find(c => c.name === MOD_LOG_CHANNEL);
            if (logCh) await logCh.send({
                embeds: [new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('🎫 Tiket Baru Dibuka')
                    .setDescription(`${user.tag} membuka tiket: <#${ticketChannel.id}>`)
                    .setTimestamp()
                ]
            });
        }

        // ── Tutup Tiket ────────────────────────────────────────────
        if (customId === 'ticket_close') {
            await interaction.deferReply({ ephemeral: true });

            const isMod = member.permissions?.has(PermissionFlagsBits.ModerateMembers);
            const channel = interaction.channel;

            // Cek apakah ini channel tiket (berdasarkan topic)
            const ownerId = channel.topic?.match(/ID: (\d+)/)?.[1];
            if (!ownerId) return interaction.editReply('❌ Ini bukan channel tiket!');

            // Hanya pemilik tiket atau mod yang bisa tutup
            if (user.id !== ownerId && !isMod) {
                return interaction.editReply('❌ Hanya pemilik tiket atau moderator yang bisa menutup tiket ini!');
            }

            await interaction.editReply('🔒 Menutup tiket...');

            // Konfirmasi penutupan
            await channel.send({
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('🔒 Tiket Ditutup')
                    .setDescription(`Tiket ditutup oleh **${user.tag}**.\nChannel akan dihapus dalam 5 detik.`)
                    .setTimestamp()
                ]
            });

            // Hapus dari active tickets
            for (const [key, chId] of activeTickets.entries()) {
                if (chId === channel.id) { activeTickets.delete(key); break; }
            }

            // Log
            const logCh = guild.channels.cache.find(c => c.name === MOD_LOG_CHANNEL);
            if (logCh) await logCh.send({
                embeds: [new EmbedBuilder()
                    .setColor('#E74C3C')
                    .setTitle('🔒 Tiket Ditutup')
                    .setDescription(`Tiket <#${channel.id}> ditutup oleh ${user.tag}`)
                    .setTimestamp()
                ]
            });

            // Hapus channel setelah 5 detik
            setTimeout(() => channel.delete('Tiket ditutup').catch(() => {}), 5000);
        }
    });

    console.log('✅ [Ticket] Handler terdaftar');
};