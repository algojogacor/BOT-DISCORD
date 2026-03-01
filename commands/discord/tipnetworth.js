// ╔══════════════════════════════════════════════════════════════╗
// ║   TIP + NETWORTH — commands/discord/tipnetworth.js           ║
// ║   !tip @user <jumlah> + !netboard embed kekayaan member      ║
// ╚══════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');

const fmt  = (n) => Math.floor(n || 0).toLocaleString('id-ID');
const medal = (i) => ['🥇', '🥈', '🥉', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'][i] || `${i + 1}.`;
const bar  = (val, len = 10) => {
    const fill = Math.round(Math.min(Math.max(val, 0), 100) / 100 * len);
    return '█'.repeat(fill) + '░'.repeat(len - fill);
};

// Hitung total kekayaan seorang user
function calcNetWorth(user) {
    let total = (user.balance || 0) + (user.bank || 0);

    // Crypto
    const prices = { btc: 650_000_000, eth: 45_000_000, bnb: 6_000_000 };
    for (const [coin, price] of Object.entries(prices)) {
        total += (user.crypto?.[coin] || 0) * price;
    }

    // Emas
    total += (user.forex?.emas || 0) * 1_500_000;

    // Properti (estimasi)
    const propValues = {
        gerobak: 5_000_000, warung: 20_000_000, toko: 75_000_000,
        ruko: 200_000_000, hotel: 1_000_000_000, maskapai: 10_000_000_000,
    };
    for (const [prop, val] of Object.entries(propValues)) {
        if (user.properties?.includes(prop)) total += val;
    }

    return total;
}

module.exports = function registerTipNetworth(client) {

    // ══════════════════════════════════════════════════════════════
    // TIP SYSTEM — !tip @user <jumlah>
    // ══════════════════════════════════════════════════════════════
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.content.toLowerCase().startsWith('!tip')) return;

        const args = message.content.slice(1).trim().split(/ +/);
        args.shift();

        const db      = global.db;
        const discordId = message.author.id;
        const linkedWA  = db?.discordLinks?.[discordId];
        const sender    = linkedWA || `dc_${discordId}`;
        const giver     = db?.users?.[sender];

        if (!db || !giver) return message.reply('⚠️ Database belum siap!');

        const targetMention = args[0];
        const amountStr     = args[1];

        if (!targetMention || !amountStr) {
            return message.reply(
                '❌ Format salah!\n' +
                'Gunakan: `!tip @user <jumlah>`\n' +
                'Contoh: `!tip @john 500000`'
            );
        }

        const targetId = targetMention.replace(/[<@!>]/g, '');
        if (targetId === discordId) return message.reply('❌ Tidak bisa tip ke diri sendiri!');

        const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
        if (!targetMember) return message.reply('❌ User tidak ditemukan!');
        if (targetMember.user.bot) return message.reply('❌ Tidak bisa tip ke bot!');

        const amount = parseInt(amountStr.replace(/[^0-9]/g, ''));
        if (isNaN(amount) || amount < 1000) return message.reply('❌ Jumlah minimal Rp 1.000!');
        if (amount > giver.balance) {
            return message.reply(
                `❌ Saldo tidak cukup!\n` +
                `Saldo kamu: **Rp ${fmt(giver.balance)}** | Tip: **Rp ${fmt(amount)}**`
            );
        }

        // Cari data penerima
        const targetLinkedWA = db.discordLinks?.[targetId];
        const targetSender   = targetLinkedWA || `dc_${targetId}`;
        const receiver       = db.users?.[targetSender];

        if (!receiver) return message.reply('❌ User belum terdaftar di bot!');

        // Proses transfer
        giver.balance    -= amount;
        receiver.balance += amount;

        const embed = new EmbedBuilder()
            .setColor('#F1C40F')
            .setTitle('💸 Tip Terkirim!')
            .setDescription(
                `${message.author} mengirim tip ke ${targetMember}!`
            )
            .addFields(
                { name: '💰 Jumlah',         value: `Rp ${fmt(amount)}`,          inline: true },
                { name: '📤 Pengirim',       value: `Rp ${fmt(giver.balance)}`,   inline: true },
                { name: '📥 Penerima',       value: `Rp ${fmt(receiver.balance)}`,inline: true },
            )
            .setTimestamp();

        await message.reply({ embeds: [embed] });

        // DM penerima
        await targetMember.send(
            `💸 Kamu mendapat tip **Rp ${fmt(amount)}** dari **${message.author.username}** di server **${message.guild.name}**!\n` +
            `Saldo baru: **Rp ${fmt(receiver.balance)}**`
        ).catch(() => {});
    });

    // ══════════════════════════════════════════════════════════════
    // NET WORTH BOARD — !netboard
    // ══════════════════════════════════════════════════════════════
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;

        const args = message.content.slice(1).trim().split(/ +/);
        const cmd  = args.shift()?.toLowerCase();

        if (cmd !== 'netboard' && cmd !== 'networth') return;

        const db        = global.db;
        const discordId = message.author.id;

        if (!db) return message.reply('⚠️ Database belum siap!');

        // ── !netboard — top 10 terkaya ─────────────────────────────
        if (cmd === 'netboard') {
            const users = Object.entries(db.users || {})
                .filter(([, u]) => u?.name)
                .map(([id, u]) => ({ id, user: u, net: calcNetWorth(u) }))
                .sort((a, b) => b.net - a.net)
                .slice(0, 10);

            if (!users.length) return message.reply('Belum ada data kekayaan.');

            const maxNet = users[0]?.net || 1;
            const lines  = users.map(({ user, net }, i) => {
                const pct = Math.round((net / maxNet) * 100);
                return (
                    `${medal(i)} **${user.name}**\n` +
                    `> Rp ${fmt(net)} [${bar(pct, 8)}] ${pct}%`
                );
            }).join('\n\n');

            const embed = new EmbedBuilder()
                .setColor('#F1C40F')
                .setTitle('💎 Net Worth Leaderboard')
                .setDescription(lines)
                .setFooter({ text: 'Total aset: saldo + bank + crypto + emas + properti' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }

        // ── !networth [@user] — detail kekayaan ────────────────────
        if (cmd === 'networth') {
            const targetId = message.mentions.users.first()?.id || discordId;
            const linkedWA = db.discordLinks?.[targetId];
            const sender   = linkedWA || `dc_${targetId}`;
            const user     = db.users?.[sender];

            if (!user) return message.reply('❌ User belum terdaftar!');

            const targetMember = await message.guild.members.fetch(targetId).catch(() => null);
            const name         = targetMember?.user.username || user.name;

            // Hitung breakdown
            const cash   = user.balance || 0;
            const bank   = user.bank || 0;
            const prices = { btc: 650_000_000, eth: 45_000_000, bnb: 6_000_000 };
            let cryptoVal = 0;
            const cryptoLines = [];
            for (const [coin, price] of Object.entries(prices)) {
                const amount = user.crypto?.[coin] || 0;
                if (amount > 0) {
                    const val = amount * price;
                    cryptoVal += val;
                    cryptoLines.push(`${coin.toUpperCase()}: ${amount.toFixed(6)} ≈ Rp ${fmt(val)}`);
                }
            }

            const emasVal = (user.forex?.emas || 0) * 1_500_000;
            const total   = calcNetWorth(user);

            // Ranking
            const allNets = Object.values(db.users || {})
                .filter(u => u?.name)
                .map(u => calcNetWorth(u))
                .sort((a, b) => b - a);
            const rank = allNets.findIndex(n => n <= total) + 1;

            // Persentase per kategori
            const pctOf = (v) => total > 0 ? Math.round((v / total) * 100) : 0;

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle(`💎 Net Worth — ${name}`)
                .setThumbnail(targetMember?.user.displayAvatarURL({ dynamic: true }) || null)
                .addFields(
                    {
                        name:  '💰 Breakdown Kekayaan',
                        value:
                            `💵 Dompet  : Rp ${fmt(cash)}  [${bar(pctOf(cash))}] ${pctOf(cash)}%\n` +
                            `🏦 Bank    : Rp ${fmt(bank)}  [${bar(pctOf(bank))}] ${pctOf(bank)}%\n` +
                            `🪙 Crypto  : Rp ${fmt(cryptoVal)}  [${bar(pctOf(cryptoVal))}] ${pctOf(cryptoVal)}%\n` +
                            `🥇 Emas    : Rp ${fmt(emasVal)}  [${bar(pctOf(emasVal))}] ${pctOf(emasVal)}%`,
                    },
                    ...(cryptoLines.length ? [{ name: '🪙 Detail Crypto', value: cryptoLines.join('\n') }] : []),
                    {
                        name:  '📊 Total & Ranking',
                        value:
                            `**Rp ${fmt(total)}**\n` +
                            `🏆 Rank #${rank} dari ${allNets.length} player\n` +
                            `🎖️ Level ${user.level}`,
                        inline: false,
                    }
                )
                .setFooter({ text: 'Ketik !netboard untuk lihat top 10' })
                .setTimestamp();

            return message.reply({ embeds: [embed] });
        }
    });

    console.log('✅ [TipNetworth] Handler terdaftar');
};