// ╔══════════════════════════════════════════════════════════════╗
// ║   DISCORD SHOP — commands/discord/shop.js                    ║
// ║   Beli role/badge spesial menggunakan saldo bot              ║
// ╚══════════════════════════════════════════════════════════════╝

const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');

// Katalog item yang bisa dibeli
// type: 'role' → beri role Discord | 'badge' → simpan di DB | 'boost' → efek ke game
const SHOP_ITEMS = [
    {
        id:    'role_vip',
        name:  '💎 Role VIP',
        desc:  'Dapatkan role VIP eksklusif + akses VIP Lounge!',
        price: 50_000_000,
        type:  'role',
        roleName: '💎 VIP',
        duration: null, // null = permanent
    },
    {
        id:    'role_color_red',
        name:  '🔴 Nama Merah',
        desc:  'Role warna nama merah custom!',
        price: 5_000_000,
        type:  'role',
        roleName: '🔴 Red Name',
        duration: null,
    },
    {
        id:    'role_color_blue',
        name:  '🔵 Nama Biru',
        desc:  'Role warna nama biru custom!',
        price: 5_000_000,
        type:  'role',
        roleName: '🔵 Blue Name',
        duration: null,
    },
    {
        id:    'role_color_green',
        name:  '🟢 Nama Hijau',
        desc:  'Role warna nama hijau custom!',
        price: 5_000_000,
        type:  'role',
        roleName: '🟢 Green Name',
        duration: null,
    },
    {
        id:    'xp_boost',
        name:  '⚡ XP Booster 7 Hari',
        desc:  'XP Discord 2x selama 7 hari!',
        price: 10_000_000,
        type:  'boost',
        boostKey: 'xp_discord',
        duration: 7 * 24 * 60 * 60 * 1000,
    },
    {
        id:    'badge_rich',
        name:  '💰 Badge Sultan',
        desc:  'Badge eksklusif menandakan kamu sudah kaya!',
        price: 100_000_000,
        type:  'badge',
        badgeName: '💰 Sultan',
    },
    {
        id:    'badge_miner',
        name:  '⛏️ Badge Master Miner',
        desc:  'Badge untuk para miner sejati!',
        price: 75_000_000,
        type:  'badge',
        badgeName: '⛏️ Master Miner',
    },
];

const fmt = (n) => Math.floor(n || 0).toLocaleString('id-ID');

module.exports = function registerShop(client) {

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.content.toLowerCase().startsWith('!shop')) return;

        const args    = message.content.slice(1).trim().split(/ +/);
        args.shift();
        const sub     = (args[0] || '').toLowerCase();
        const db      = global.db;
        const discordId = message.author.id;
        const linkedWA  = db?.discordLinks?.[discordId];
        const sender    = linkedWA || `dc_${discordId}`;
        const user      = db?.users?.[sender];

        if (!db || !user) return message.reply('⚠️ Database belum siap!');

        // ── !shop — tampilkan katalog ──────────────────────────────
        if (!sub || sub === 'list') {
            const lines = SHOP_ITEMS.map(item =>
                `**${item.name}** — Rp ${fmt(item.price)}\n` +
                `> ${item.desc}`
            ).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#E67E22')
                .setTitle('🏪 Discord Shop — Beli dengan Saldo Bot!')
                .setDescription(lines)
                .addFields({ name: '💰 Saldo Kamu', value: `Rp ${fmt(user.balance)}` })
                .setFooter({ text: 'Gunakan: !shop beli <id_item>' })
                .setTimestamp();

            // Tambah menu dropdown pembelian
            const select = new StringSelectMenuBuilder()
                .setCustomId('shop_buy')
                .setPlaceholder('Pilih item untuk dibeli...')
                .addOptions(SHOP_ITEMS.map(item => ({
                    label:       item.name,
                    description: `Rp ${fmt(item.price)}`,
                    value:       item.id,
                })));

            const row = new ActionRowBuilder().addComponents(select);
            return message.reply({ embeds: [embed], components: [row] });
        }

        // ── !shop beli <id> ────────────────────────────────────────
        if (sub === 'beli') {
            const itemId = args[1];
            const item   = SHOP_ITEMS.find(i => i.id === itemId);
            if (!item) {
                return message.reply(`❌ Item \`${itemId}\` tidak ditemukan. Ketik \`!shop\` untuk melihat daftar.`);
            }

            if (user.balance < item.price) {
                return message.reply(
                    `❌ Saldo tidak cukup!\n` +
                    `Harga: Rp ${fmt(item.price)} | Saldo: Rp ${fmt(user.balance)}\n` +
                    `Kurang: Rp ${fmt(item.price - user.balance)}`
                );
            }

            // Proses pembelian
            user.balance -= item.price;

            if (item.type === 'role') {
                // Buat role jika belum ada
                let role = message.guild.roles.cache.find(r => r.name === item.roleName);
                if (!role) {
                    const colors = {
                        '🔴 Red Name':   '#FF4444',
                        '🔵 Blue Name':  '#4488FF',
                        '🟢 Green Name': '#44FF88',
                        '💎 VIP':        '#9B59B6',
                    };
                    role = await message.guild.roles.create({
                        name:  item.roleName,
                        color: colors[item.roleName] || '#FFFFFF',
                        reason: 'Discord Shop',
                    }).catch(() => null);
                }
                if (role) await message.member.roles.add(role).catch(() => {});
            }

            if (item.type === 'badge') {
                if (!user.badges) user.badges = [];
                if (!user.badges.includes(item.badgeName)) user.badges.push(item.badgeName);
            }

            if (item.type === 'boost') {
                if (!user.discordBoosts) user.discordBoosts = {};
                user.discordBoosts[item.boostKey] = Date.now() + item.duration;
            }

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🛍️ Pembelian Berhasil!')
                .setDescription(`Kamu berhasil membeli **${item.name}**!`)
                .addFields(
                    { name: '💰 Harga',         value: `Rp ${fmt(item.price)}`,    inline: true },
                    { name: '💳 Saldo Tersisa',  value: `Rp ${fmt(user.balance)}`,  inline: true },
                )
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // ── !shop inventory ────────────────────────────────────────
        if (sub === 'inv' || sub === 'inventory') {
            const badges  = user.badges || [];
            const boosts  = user.discordBoosts || {};
            const activeBoosts = Object.entries(boosts)
                .filter(([, exp]) => exp > Date.now())
                .map(([k, exp]) => `${k}: berakhir <t:${Math.floor(exp / 1000)}:R>`);

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle('🎒 Discord Inventory')
                .addFields(
                    { name: '🏅 Badge',          value: badges.join(', ') || '_Belum ada_' },
                    { name: '⚡ Boost Aktif',    value: activeBoosts.join('\n') || '_Tidak ada_' },
                )
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    });

    // ── Handler dropdown pembelian ─────────────────────────────────
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isStringSelectMenu()) return;
        if (interaction.customId !== 'shop_buy') return;

        await interaction.deferReply({ ephemeral: true });

        const itemId    = interaction.values[0];
        const item      = SHOP_ITEMS.find(i => i.id === itemId);
        const db        = global.db;
        const discordId = interaction.user.id;
        const linkedWA  = db?.discordLinks?.[discordId];
        const sender    = linkedWA || `dc_${discordId}`;
        const user      = db?.users?.[sender];

        if (!item || !user) return interaction.editReply('❌ Terjadi kesalahan!');

        if (user.balance < item.price) {
            return interaction.editReply(
                `❌ Saldo tidak cukup!\nHarga: **Rp ${fmt(item.price)}** | Saldo: **Rp ${fmt(user.balance)}**`
            );
        }

        user.balance -= item.price;

        if (item.type === 'role') {
            let role = interaction.guild.roles.cache.find(r => r.name === item.roleName);
            if (!role) {
                role = await interaction.guild.roles.create({ name: item.roleName, reason: 'Discord Shop' }).catch(() => null);
            }
            if (role) await interaction.member.roles.add(role).catch(() => {});
        }
        if (item.type === 'badge') {
            if (!user.badges) user.badges = [];
            if (!user.badges.includes(item.badgeName)) user.badges.push(item.badgeName);
        }
        if (item.type === 'boost') {
            if (!user.discordBoosts) user.discordBoosts = {};
            user.discordBoosts[item.boostKey] = Date.now() + item.duration;
        }

        await interaction.editReply(
            `✅ Berhasil membeli **${item.name}**!\nSaldo tersisa: **Rp ${fmt(user.balance)}**`
        );
    });

    console.log('✅ [Shop] Handler terdaftar');
};