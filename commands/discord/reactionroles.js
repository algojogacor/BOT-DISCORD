// ╔══════════════════════════════════════════════════════════════╗
// ║   REACTION ROLES — commands/discord/reactionroles.js         ║
// ║   Self-assign hanya untuk role MINAT (interest roles)        ║
// ║   Role admin/mod/vip HANYA bisa ditetapkan oleh admin        ║
// ╚══════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// ── Role yang BOLEH dipilih sendiri oleh member ────────────────
const SELF_ROLES = [
    { id: 'role_gamer',   label: '🎮 Gamer',       desc: 'Suka gaming & esport',      style: ButtonStyle.Primary   },
    { id: 'role_musik',   label: '🎵 Musik Lover',  desc: 'Pecinta musik segala genre', style: ButtonStyle.Secondary },
    { id: 'role_bola',    label: '⚽ Bola Mania',   desc: 'Penggemar sepak bola',       style: ButtonStyle.Success   },
    { id: 'role_ai',      label: '🤖 AI Enjoyer',   desc: 'Antusias teknologi AI',      style: ButtonStyle.Primary   },
    { id: 'role_trader',  label: '💰 Trader',       desc: 'Investor saham & crypto',    style: ButtonStyle.Success   },
];

// ── Role yang HANYA admin yang bisa assign (TIDAK bisa self-assign) ──
const PROTECTED_ROLES = [
    '👑 Owner',
    '⚔️ Admin',
    '🛡️ Moderator',
    '💎 VIP',
    '🏆 Legend',
    '🎖️ Level 10+',
    '🌟 Member',
];

// Mapping button ID → nama role di Discord
const ROLE_MAP = {
    role_gamer:  '🎮 Gamer',
    role_musik:  '🎵 Musik Lover',
    role_bola:   '⚽ Bola Mania',
    role_ai:     '🤖 AI Enjoyer',
    role_trader: '💰 Trader',
};

const VERIFY_CHANNEL = '🎫│verifikasi';

module.exports = function registerReactionRoles(client) {

    // ── Command !rolesmenu (admin only) — posting panel role ───────
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (message.content.toLowerCase() !== '!rolesmenu') return;

        // Hanya admin/owner yang bisa post panel
        const isAdmin = message.member?.permissions?.has('Administrator');
        if (!isAdmin) {
            return message.reply('❌ Hanya admin yang bisa menjalankan `!rolesmenu`!');
        }

        const channel = message.guild.channels.cache.find(c => c.name === VERIFY_CHANNEL);
        if (!channel) {
            return message.reply(`❌ Channel \`${VERIFY_CHANNEL}\` tidak ditemukan. Jalankan \`!setup\` dulu!`);
        }

        // ── Buat embed panel ────────────────────────────────────
        const embed = new EmbedBuilder()
            .setColor('#9B59B6')
            .setTitle('🎭 Pilih Role Minatmu!')
            .setDescription(
                'Klik tombol di bawah untuk mendapatkan atau melepas role minat.\n' +
                'Kamu bisa memilih **lebih dari satu** role!\n\n' +
                '> ⚠️ Role **Member, VIP, Moderator, Admin** hanya diberikan oleh tim admin.'
            )
            .addFields(
                SELF_ROLES.map(r => ({
                    name:   r.label,
                    value:  r.desc,
                    inline: true,
                }))
            )
            .setFooter({ text: 'Klik tombol lagi untuk melepas role' })
            .setTimestamp();

        // ── Buat tombol (max 5 per row) ─────────────────────────
        const row = new ActionRowBuilder().addComponents(
            SELF_ROLES.map(r =>
                new ButtonBuilder()
                    .setCustomId(r.id)
                    .setLabel(r.label)
                    .setStyle(r.style)
            )
        );

        await channel.send({ embeds: [embed], components: [row] });
        await message.reply(`✅ Panel role berhasil dikirim ke <#${channel.id}>!`);
    });

    // ── Handler tombol (interactionCreate) ────────────────────────
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const roleKey = interaction.customId;
        if (!ROLE_MAP[roleKey]) return; // bukan tombol role kita

        await interaction.deferReply({ ephemeral: true }); // hanya dilihat oleh yg klik

        const guild      = interaction.guild;
        const member     = interaction.member;
        const roleName   = ROLE_MAP[roleKey];

        // Double-check: pastikan role ini memang boleh self-assign
        if (PROTECTED_ROLES.includes(roleName)) {
            return interaction.editReply({
                content: '❌ Role ini hanya bisa diberikan oleh admin server.',
            });
        }

        const role = guild.roles.cache.find(r => r.name === roleName);
        if (!role) {
            return interaction.editReply({
                content: `❌ Role **${roleName}** tidak ditemukan. Minta admin jalankan \`!setup\` ulang.`,
            });
        }

        // Toggle: kalau sudah punya → lepas, belum punya → kasih
        const hasRole = member.roles.cache.has(role.id);
        if (hasRole) {
            await member.roles.remove(role);
            return interaction.editReply({
                content: `✅ Role **${roleName}** telah **dilepas** dari akunmu.`,
            });
        } else {
            await member.roles.add(role);
            return interaction.editReply({
                content: `✅ Kamu sekarang mendapat role **${roleName}**! 🎉`,
            });
        }
    });

    console.log('✅ [ReactionRoles] Event handler terdaftar');
};