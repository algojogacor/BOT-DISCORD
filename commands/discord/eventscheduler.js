// ╔══════════════════════════════════════════════════════════════╗
// ║   EVENT SCHEDULER — commands/discord/eventscheduler.js       ║
// ║   !event buat/list/hapus + reminder H-1 & H-0 otomatis       ║
// ╚══════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const ANNOUNCE_CHANNEL = '🗓️│events';
const BOT_CHANNEL      = '🤖│bot-command';

// Simpan events: [ { id, name, date (timestamp ms), desc, organizer, interested: Set, channelId, msgId } ]
const events = [];
let eventIdCounter = 1;

module.exports = function registerEventScheduler(client) {

    // ── Command !event ─────────────────────────────────────────────
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.content.toLowerCase().startsWith('!event')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        args.shift(); // hapus 'event'
        const sub = (args.shift() || '').toLowerCase();

        const isAdmin = message.member?.permissions?.has('Administrator');

        // ── !event list ────────────────────────────────────────────
        if (sub === 'list' || sub === '') {
            const upcoming = events
                .filter(e => e.date > Date.now())
                .sort((a, b) => a.date - b.date);

            if (!upcoming.length) return message.reply('📅 Belum ada event yang dijadwalkan.');

            const lines = upcoming.map(e =>
                `**${e.id}. ${e.name}**\n` +
                `📅 <t:${Math.floor(e.date / 1000)}:F> (<t:${Math.floor(e.date / 1000)}:R>)\n` +
                `👥 ${e.interested.size} orang tertarik\n`
            ).join('\n');

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('📅 Event Mendatang')
                    .setDescription(lines)
                    .setFooter({ text: 'Gunakan !event ikut <id> untuk daftar' })
                ]
            });
        }

        // ── !event buat <nama> | <tanggal> | <deskripsi> ──────────
        if (sub === 'buat') {
            if (!isAdmin) return message.reply('❌ Hanya admin yang bisa membuat event!');

            // Format: !event buat Mining Race | 2025-08-01 20:00 | Siapa yang paling banyak mine BTC?
            const rest  = args.join(' ');
            const parts = rest.split('|').map(s => s.trim());
            if (parts.length < 2) {
                return message.reply(
                    '❌ Format salah!\n' +
                    'Gunakan: `!event buat <nama> | <tanggal> | <deskripsi>`\n' +
                    'Contoh: `!event buat Mining Race | 2025-08-01 20:00 | Siapa yang mining paling banyak?`\n' +
                    'Format tanggal: `YYYY-MM-DD HH:MM` (WIB)'
                );
            }

            const name = parts[0];
            const desc = parts[2] || 'Tidak ada deskripsi';

            // Parse tanggal (WIB = UTC+7)
            const dateStr = parts[1];
            const dateMs  = Date.parse(dateStr + '+07:00');
            if (isNaN(dateMs)) return message.reply('❌ Format tanggal salah! Gunakan: `YYYY-MM-DD HH:MM`');
            if (dateMs < Date.now()) return message.reply('❌ Tanggal event sudah lewat!');

            const event = {
                id:        eventIdCounter++,
                name,
                date:      dateMs,
                desc,
                organizer: message.author.tag,
                interested: new Set(),
                guildId:   message.guild.id,
            };
            events.push(event);

            // Post ke channel events
            const eventCh = message.guild.channels.cache.find(c => c.name === ANNOUNCE_CHANNEL)
                || message.channel;

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle(`🗓️ EVENT BARU — ${name}`)
                .setDescription(desc)
                .addFields(
                    { name: '📅 Waktu',        value: `<t:${Math.floor(dateMs / 1000)}:F>`,  inline: true },
                    { name: '⏰ Hitung Mundur', value: `<t:${Math.floor(dateMs / 1000)}:R>`, inline: true },
                    { name: '👤 Organizer',    value: message.author.tag,                    inline: true },
                    { name: '👥 Tertarik',      value: '0 orang' }
                )
                .setFooter({ text: `Event ID: ${event.id}` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`event_join_${event.id}`)
                    .setLabel('✅ Saya Tertarik!')
                    .setStyle(ButtonStyle.Success),
            );

            const evMsg = await eventCh.send({ content: '@everyone', embeds: [embed], components: [row] });
            event.channelId = evMsg.channel.id;
            event.msgId     = evMsg.id;

            await message.reply(`✅ Event **${name}** berhasil dibuat! (ID: ${event.id})`);

            // Set reminder H-1
            const oneDayBefore = dateMs - 86400000;
            if (oneDayBefore > Date.now()) {
                setTimeout(async () => {
                    const ch = message.guild.channels.cache.find(c => c.name === ANNOUNCE_CHANNEL)
                        || message.guild.channels.cache.find(c => c.name === BOT_CHANNEL);
                    if (ch) await ch.send(
                        `📢 **REMINDER H-1** — Event **${name}** berlangsung besok!\n` +
                        `⏰ <t:${Math.floor(dateMs / 1000)}:F>\n` +
                        `${[...event.interested].map(id => `<@${id}>`).join(' ')}`
                    );
                }, oneDayBefore - Date.now());
            }

            // Set reminder H-0 (15 menit sebelum)
            const fifteenBefore = dateMs - 15 * 60000;
            if (fifteenBefore > Date.now()) {
                setTimeout(async () => {
                    const ch = message.guild.channels.cache.find(c => c.name === ANNOUNCE_CHANNEL)
                        || message.guild.channels.cache.find(c => c.name === BOT_CHANNEL);
                    if (ch) await ch.send(
                        `🚨 **EVENT MULAI 15 MENIT LAGI!**\n` +
                        `**${name}** dimulai pada <t:${Math.floor(dateMs / 1000)}:T>!\n` +
                        `${[...event.interested].map(id => `<@${id}>`).join(' ')}`
                    );
                }, fifteenBefore - Date.now());
            }

            return;
        }

        // ── !event hapus <id> ──────────────────────────────────────
        if (sub === 'hapus') {
            if (!isAdmin) return message.reply('❌ Hanya admin!');
            const id  = parseInt(args[0]);
            const idx = events.findIndex(e => e.id === id);
            if (idx === -1) return message.reply(`❌ Event ID ${id} tidak ditemukan!`);
            const removed = events.splice(idx, 1)[0];
            return message.reply(`✅ Event **${removed.name}** dihapus.`);
        }

        // ── !event info <id> ───────────────────────────────────────
        if (sub === 'info') {
            const id = parseInt(args[0]);
            const ev = events.find(e => e.id === id);
            if (!ev) return message.reply(`❌ Event ID ${id} tidak ditemukan!`);

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle(`🗓️ ${ev.name}`)
                    .setDescription(ev.desc)
                    .addFields(
                        { name: '📅 Waktu',      value: `<t:${Math.floor(ev.date / 1000)}:F>`,  inline: true },
                        { name: '⏰ Countdown',  value: `<t:${Math.floor(ev.date / 1000)}:R>`,  inline: true },
                        { name: '👤 Organizer',  value: ev.organizer,                            inline: true },
                        { name: '👥 Tertarik',   value: `${ev.interested.size} orang` }
                    )
                    .setFooter({ text: `Event ID: ${ev.id}` })
                ]
            });
        }
    });

    // ── Handler tombol tertarik ────────────────────────────────────
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;
        if (!interaction.customId.startsWith('event_join_')) return;

        await interaction.deferReply({ ephemeral: true });

        const eventId = parseInt(interaction.customId.replace('event_join_', ''));
        const event   = events.find(e => e.id === eventId);

        if (!event) return interaction.editReply('❌ Event tidak ditemukan!');

        const userId = interaction.user.id;
        if (event.interested.has(userId)) {
            event.interested.delete(userId);
            await interaction.editReply('❌ Kamu telah **membatalkan** ketertarikanmu pada event ini.');
        } else {
            event.interested.add(userId);
            await interaction.editReply(`✅ Kamu **terdaftar** untuk event **${event.name}**! Kamu akan dapat reminder sebelum event mulai.`);
        }

        // Update embed
        const channel = interaction.guild.channels.cache.get(event.channelId);
        if (channel) {
            const msg = await channel.messages.fetch(event.msgId).catch(() => null);
            if (msg && msg.embeds[0]) {
                const updated = EmbedBuilder.from(msg.embeds[0]);
                const fields  = updated.data.fields || [];
                const tertIdx = fields.findIndex(f => f.name === '👥 Tertarik');
                if (tertIdx !== -1) fields[tertIdx].value = `${event.interested.size} orang`;
                await msg.edit({ embeds: [updated] }).catch(() => {});
            }
        }
    });

    console.log('✅ [EventScheduler] Handler terdaftar');
};