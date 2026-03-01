// ╔══════════════════════════════════════════════════════════════╗
// ║   GIVEAWAY — commands/discord/giveaway.js                    ║
// ║   !giveaway <durasi> <jumlah pemenang> <hadiah>              ║
// ╚══════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Simpan giveaway aktif: { messageId: { channelId, guildId, endTime, winners, prize, participants: Set } }
const activeGiveaways = new Map();

// ── Helper: parse durasi ─────────────────────────────────────
function parseDuration(str) {
    const match = str?.match(/^(\d+)(m|h|d)$/i);
    if (!match) return null;
    const val = parseInt(match[1]);
    const mul = { m: 60000, h: 3600000, d: 86400000 };
    return val * (mul[match[2].toLowerCase()] || 0);
}

function formatDuration(ms) {
    if (ms >= 86400000) return `${Math.floor(ms / 86400000)} hari`;
    if (ms >= 3600000)  return `${Math.floor(ms / 3600000)} jam`;
    return `${Math.floor(ms / 60000)} menit`;
}

// ── Helper: akhiri giveaway ───────────────────────────────────
async function endGiveaway(client, messageId) {
    const gw = activeGiveaways.get(messageId);
    if (!gw) return;
    activeGiveaways.delete(messageId);

    const guild   = client.guilds.cache.get(gw.guildId);
    const channel = guild?.channels.cache.get(gw.channelId);
    if (!channel) return;

    const message = await channel.messages.fetch(messageId).catch(() => null);
    if (!message) return;

    const participants = [...gw.participants];

    if (participants.length === 0) {
        await channel.send('😢 Tidak ada peserta — giveaway berakhir tanpa pemenang.');
        await message.edit({
            embeds: [message.embeds[0]
                ? EmbedBuilder.from(message.embeds[0])
                    .setColor('#95A5A6')
                    .setTitle('🎁 GIVEAWAY BERAKHIR — Tidak Ada Pemenang')
                : new EmbedBuilder().setTitle('Giveaway Berakhir')
            ],
            components: [],
        });
        return;
    }

    // Pilih pemenang acak
    const shuffled = participants.sort(() => Math.random() - 0.5);
    const winners  = shuffled.slice(0, Math.min(gw.numWinners, participants.length));
    const mentions = winners.map(id => `<@${id}>`).join(', ');

    // Update embed
    await message.edit({
        embeds: [new EmbedBuilder()
            .setColor('#95A5A6')
            .setTitle('🎉 GIVEAWAY BERAKHIR!')
            .setDescription(
                `**Hadiah:** ${gw.prize}\n\n` +
                `🏆 **Pemenang:** ${mentions}\n\n` +
                `Total peserta: ${participants.length}`
            )
            .setTimestamp()
        ],
        components: [],
    });

    // Umumkan pemenang
    await channel.send({
        content: `🎉 Selamat kepada ${mentions}! Kamu memenangkan **${gw.prize}**!\nHubungi admin untuk klaim hadiahmu.`,
    });
}

module.exports = function registerGiveaway(client) {

    // ── Command !giveaway ─────────────────────────────────────────
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.content.toLowerCase().startsWith('!giveaway')) return;

        const isAdmin = message.member?.permissions?.has('Administrator');
        if (!isAdmin) return message.reply('❌ Hanya admin yang bisa membuat giveaway!');

        const args = message.content.slice(1).trim().split(/ +/);
        args.shift(); // hapus 'giveaway'

        // Format: !giveaway <durasi> <jumlah_pemenang> <hadiah...>
        // Contoh: !giveaway 24h 1 Rp10.000.000
        if (args.length < 3) {
            return message.reply(
                '❌ Format salah!\nGunakan: `!giveaway <durasi> <pemenang> <hadiah>`\n' +
                'Contoh: `!giveaway 24h 1 Rp10.000.000`\n' +
                'Durasi: `30m`, `2h`, `1d`'
            );
        }

        const duration   = parseDuration(args[0]);
        const numWinners = parseInt(args[1]);
        const prize      = args.slice(2).join(' ');

        if (!duration)        return message.reply('❌ Format durasi salah! Gunakan: `30m`, `2h`, `1d`');
        if (isNaN(numWinners) || numWinners < 1) return message.reply('❌ Jumlah pemenang minimal 1!');
        if (!prize)           return message.reply('❌ Masukkan nama hadiah!');

        const endTime = Date.now() + duration;

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('🎁 GIVEAWAY!')
            .setDescription(
                `**Hadiah:** ${prize}\n\n` +
                `🏆 Jumlah Pemenang: **${numWinners}**\n` +
                `⏰ Berakhir: <t:${Math.floor(endTime / 1000)}:R>\n` +
                `👤 Diselenggarakan oleh: ${message.author}\n\n` +
                `Klik tombol **Ikut Giveaway** untuk berpartisipasi!`
            )
            .setFooter({ text: `Berakhir pada` })
            .setTimestamp(endTime);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_join')
                .setLabel('🎉 Ikut Giveaway')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('giveaway_count')
                .setLabel('👥 0 Peserta')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
        );

        const gwMsg = await message.channel.send({ embeds: [embed], components: [row] });
        await message.delete().catch(() => {});

        // Simpan giveaway
        activeGiveaways.set(gwMsg.id, {
            channelId:   message.channel.id,
            guildId:     message.guild.id,
            endTime,
            numWinners,
            prize,
            host:        message.author.id,
            participants: new Set(),
        });

        // Set timer untuk akhiri giveaway
        setTimeout(() => endGiveaway(client, gwMsg.id), duration);
    });

    // ── Command !reroll <messageId> ───────────────────────────────
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.content.toLowerCase().startsWith('!reroll')) return;

        const isAdmin = message.member?.permissions?.has('Administrator');
        if (!isAdmin) return message.reply('❌ Hanya admin!');

        await message.reply('🔄 Mengundi ulang pemenang...');
        const msgId = message.content.split(' ')[1];
        if (msgId) await endGiveaway(client, msgId);
    });

    // ── Handler tombol ikut giveaway ──────────────────────────────
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;
        if (interaction.customId !== 'giveaway_join') return;

        await interaction.deferReply({ ephemeral: true });

        const gw = activeGiveaways.get(interaction.message.id);
        if (!gw) return interaction.editReply('❌ Giveaway ini sudah berakhir!');

        const userId = interaction.user.id;

        if (gw.participants.has(userId)) {
            // Toggle — keluar dari giveaway
            gw.participants.delete(userId);
            await interaction.editReply('❌ Kamu telah **keluar** dari giveaway ini.');
        } else {
            gw.participants.add(userId);
            await interaction.editReply(`✅ Kamu sudah **terdaftar** di giveaway! Total peserta: **${gw.participants.size}**`);
        }

        // Update tombol counter
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('giveaway_join')
                .setLabel('🎉 Ikut Giveaway')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('giveaway_count')
                .setLabel(`👥 ${gw.participants.size} Peserta`)
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
        );

        await interaction.message.edit({ components: [row] }).catch(() => {});
    });

    console.log('✅ [Giveaway] Handler terdaftar');
};