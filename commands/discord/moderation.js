// ╔══════════════════════════════════════════════════════════════╗
// ║   MODERATION — commands/discord/moderation.js                ║
// ║   !warn !mute !unmute !kick !ban + log + auto-eskalasi       ║
// ╚══════════════════════════════════════════════════════════════╝

const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');

const MOD_LOG_CHANNEL = '📋│mod-log';

// Warn disimpan di global.db.discordWarn (persistent MongoDB)
const getWarnDB = () => {
    if (!global.db.discordWarn) global.db.discordWarn = {};
    return global.db.discordWarn;
};

// Auto-eskalasi berdasarkan jumlah warn
// warn ke-3 → timeout 1 jam, warn ke-5 → kick, warn ke-7 → ban
const ESCALATION = {
    3: { action: 'timeout', duration: 60 * 60 * 1000, label: 'Timeout 1 jam' },
    5: { action: 'kick',    duration: null,            label: 'Kick otomatis' },
    7: { action: 'ban',     duration: null,            label: 'Ban otomatis'  },
};

// ── Helper: cek apakah pemanggil adalah mod/admin ──────────────
function isMod(member) {
    return member?.permissions?.has(PermissionFlagsBits.ModerateMembers);
}

// ── Helper: kirim log ke mod-log ───────────────────────────────
async function sendLog(guild, embed) {
    const ch = guild.channels.cache.find(c => c.name === MOD_LOG_CHANNEL);
    if (ch) await ch.send({ embeds: [embed] }).catch(() => {});
}

// ── Helper: parse mention atau ID ──────────────────────────────
async function resolveMember(guild, mention) {
    const id = mention.replace(/[<@!>]/g, '');
    return guild.members.fetch(id).catch(() => null);
}

// ── Helper: parse durasi string ke ms ─────────────────────────
// Contoh: "30m" → 1800000, "2h" → 7200000, "1d" → 86400000
function parseDuration(str) {
    const match = str?.match(/^(\d+)(m|h|d)$/i);
    if (!match) return null;
    const val  = parseInt(match[1]);
    const unit = match[2].toLowerCase();
    const mul  = { m: 60000, h: 3600000, d: 86400000 };
    return val * mul[unit];
}

module.exports = function registerModeration(client) {

    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.guild) return;
        if (!message.content.startsWith('!')) return;

        const args    = message.content.slice(1).trim().split(/ +/);
        const command = args.shift().toLowerCase();
        const guild   = message.guild;
        const caller  = message.member;

        // ── !warn @user [alasan] ───────────────────────────────
        if (command === 'warn') {
            if (!isMod(caller)) return message.reply('❌ Kamu tidak punya izin moderasi!');
            const target = await resolveMember(guild, args[0] || '');
            if (!target) return message.reply('❌ User tidak ditemukan!');
            if (target.user.bot) return message.reply('❌ Tidak bisa warn bot!');

            const reason = args.slice(1).join(' ') || 'Tidak ada alasan';
            const key    = `${guild.id}_${target.id}`;

            const warnDB = getWarnDB();
            if (!warnDB[key]) warnDB[key] = [];
            warnDB[key].push({ reason, mod: message.author.tag, time: Date.now() });
            const warnCount = warnDB[key].length;

            const embed = new EmbedBuilder()
                .setColor('#E67E22')
                .setTitle(`⚠️ Peringatan #${warnCount}`)
                .addFields(
                    { name: '👤 User',    value: `${target.user.tag}`, inline: true },
                    { name: '🔨 Mod',     value: message.author.tag,   inline: true },
                    { name: '📝 Alasan',  value: reason },
                    { name: '📊 Total',   value: `${warnCount} peringatan` }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });

            // Coba DM user
            await target.send(
                `⚠️ Kamu mendapat peringatan di **${guild.name}**.\n` +
                `Alasan: ${reason}\nTotal warn: **${warnCount}**`
            ).catch(() => {});

            // Auto-eskalasi
            const esc = ESCALATION[warnCount];
            if (esc) {
                if (esc.action === 'timeout') {
                    await target.timeout(esc.duration, `Auto: ${warnCount} peringatan`).catch(() => {});
                } else if (esc.action === 'kick') {
                    await target.kick(`Auto-kick: ${warnCount} peringatan`).catch(() => {});
                } else if (esc.action === 'ban') {
                    await guild.members.ban(target, { reason: `Auto-ban: ${warnCount} peringatan` }).catch(() => {});
                }
                embed.addFields({ name: '⚡ Eskalasi Otomatis', value: esc.label });
                await message.channel.send({ embeds: [embed] }).catch(() => {});
            }

            embed.setTitle(`⚠️ [MOD LOG] Warn #${warnCount} — ${target.user.tag}`);
            await sendLog(guild, embed);
        }

        // ── !warns @user ───────────────────────────────────────
        if (command === 'warns') {
            if (!isMod(caller)) return message.reply('❌ Tidak ada izin!');
            const target = await resolveMember(guild, args[0] || '');
            if (!target) return message.reply('❌ User tidak ditemukan!');

            const key   = `${guild.id}_${target.id}`;
            const warnDB2 = getWarnDB();
            const warns = warnDB2[key] || [];

            if (warns.length === 0) return message.reply(`✅ ${target.user.tag} tidak memiliki peringatan.`);

            const list = warns.map((w, i) =>
                `**${i + 1}.** ${w.reason} — oleh ${w.mod} — <t:${Math.floor(w.time / 1000)}:R>`
            ).join('\n');

            const embed = new EmbedBuilder()
                .setColor('#9B59B6')
                .setTitle(`📋 Daftar Warn — ${target.user.tag}`)
                .setDescription(list)
                .setFooter({ text: `Total: ${warns.length} peringatan` });

            await message.reply({ embeds: [embed] });
        }

        // ── !clearwarn @user ───────────────────────────────────
        if (command === 'clearwarn') {
            if (!isMod(caller)) return message.reply('❌ Tidak ada izin!');
            const target = await resolveMember(guild, args[0] || '');
            if (!target) return message.reply('❌ User tidak ditemukan!');

            const key = `${guild.id}_${target.id}`;
            warnDB.delete(key);
            await message.reply(`✅ Semua warn **${target.user.tag}** telah dihapus.`);
            await sendLog(guild, new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🧹 Warn Dihapus')
                .setDescription(`Semua warn ${target.user.tag} dihapus oleh ${message.author.tag}`)
                .setTimestamp()
            );
        }

        // ── !mute @user [durasi] [alasan] ─────────────────────
        if (command === 'mute') {
            if (!isMod(caller)) return message.reply('❌ Tidak ada izin!');
            const target = await resolveMember(guild, args[0] || '');
            if (!target) return message.reply('❌ User tidak ditemukan!');

            const duration = parseDuration(args[1]) || 10 * 60 * 1000; // default 10 menit
            const reason   = args.slice(2).join(' ') || 'Tidak ada alasan';

            await target.timeout(duration, reason);
            const durLabel = args[1] || '10m';

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('🔇 Member Di-mute')
                .addFields(
                    { name: '👤 User',     value: target.user.tag,      inline: true },
                    { name: '⏱️ Durasi',   value: durLabel,             inline: true },
                    { name: '🔨 Mod',      value: message.author.tag,   inline: true },
                    { name: '📝 Alasan',   value: reason }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });
            await sendLog(guild, embed);
        }

        // ── !unmute @user ──────────────────────────────────────
        if (command === 'unmute') {
            if (!isMod(caller)) return message.reply('❌ Tidak ada izin!');
            const target = await resolveMember(guild, args[0] || '');
            if (!target) return message.reply('❌ User tidak ditemukan!');

            await target.timeout(null);
            await message.reply(`✅ **${target.user.tag}** sudah di-unmute.`);
            await sendLog(guild, new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🔊 Member Di-unmute')
                .setDescription(`${target.user.tag} di-unmute oleh ${message.author.tag}`)
                .setTimestamp()
            );
        }

        // ── !kick @user [alasan] ───────────────────────────────
        if (command === 'kick') {
            if (!caller?.permissions?.has(PermissionFlagsBits.KickMembers))
                return message.reply('❌ Tidak ada izin kick!');
            const target = await resolveMember(guild, args[0] || '');
            if (!target) return message.reply('❌ User tidak ditemukan!');
            if (!target.kickable) return message.reply('❌ User tidak bisa di-kick!');

            const reason = args.slice(1).join(' ') || 'Tidak ada alasan';
            await target.send(`👢 Kamu telah di-kick dari **${guild.name}**.\nAlasan: ${reason}`).catch(() => {});
            await target.kick(reason);

            const embed = new EmbedBuilder()
                .setColor('#E67E22')
                .setTitle('👢 Member Di-kick')
                .addFields(
                    { name: '👤 User',   value: target.user.tag,    inline: true },
                    { name: '🔨 Mod',    value: message.author.tag, inline: true },
                    { name: '📝 Alasan', value: reason }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });
            await sendLog(guild, embed);
        }

        // ── !ban @user [alasan] ────────────────────────────────
        if (command === 'ban') {
            if (!caller?.permissions?.has(PermissionFlagsBits.BanMembers))
                return message.reply('❌ Tidak ada izin ban!');
            const target = await resolveMember(guild, args[0] || '');
            if (!target) return message.reply('❌ User tidak ditemukan!');
            if (!target.bannable) return message.reply('❌ User tidak bisa di-ban!');

            const reason = args.slice(1).join(' ') || 'Tidak ada alasan';
            await target.send(`🔨 Kamu telah di-ban dari **${guild.name}**.\nAlasan: ${reason}`).catch(() => {});
            await guild.members.ban(target, { reason });

            const embed = new EmbedBuilder()
                .setColor('#C0392B')
                .setTitle('🔨 Member Di-ban')
                .addFields(
                    { name: '👤 User',   value: target.user.tag,    inline: true },
                    { name: '🔨 Mod',    value: message.author.tag, inline: true },
                    { name: '📝 Alasan', value: reason }
                )
                .setTimestamp();

            await message.reply({ embeds: [embed] });
            await sendLog(guild, embed);
        }

        // ── !unban <userId> ────────────────────────────────────
        if (command === 'unban') {
            if (!caller?.permissions?.has(PermissionFlagsBits.BanMembers))
                return message.reply('❌ Tidak ada izin!');
            const userId = args[0];
            if (!userId) return message.reply('❌ Masukkan User ID!');

            await guild.members.unban(userId).catch(() => {});
            await message.reply(`✅ User \`${userId}\` telah di-unban.`);
        }
    });

    console.log('✅ [Moderation] Handler terdaftar');
};