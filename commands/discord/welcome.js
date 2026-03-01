// ╔══════════════════════════════════════════════════════════════╗
// ║   WELCOME & LEAVE — commands/discord/welcome.js              ║
// ║   Auto embed saat member join & keluar server                ║
// ╚══════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');

// Nama channel tujuan (harus sama persis dengan yg dibuat setup.js)
const WELCOME_CHANNEL = '👋│perkenalan';
const LEAVE_CHANNEL   = '📋│mod-log';

module.exports = function registerWelcome(client) {

    // ── Member JOIN ───────────────────────────────────────────────
    client.on('guildMemberAdd', async (member) => {
        try {
            const guild   = member.guild;
            const channel = guild.channels.cache.find(c => c.name === WELCOME_CHANNEL);
            if (!channel) return;

            const memberCount = guild.memberCount;
            const joinedAt    = `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`;

            const embed = new EmbedBuilder()
                .setColor('#2ECC71')
                .setTitle('🎉 Member Baru Bergabung!')
                .setDescription(
                    `Selamat datang **${member.user.username}** di **${guild.name}**!\n\n` +
                    `Kamu adalah member ke-**${memberCount}** di server ini. 🎊`
                )
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
                .addFields(
                    { name: '👤 Username',       value: `\`${member.user.tag}\``,  inline: true },
                    { name: '🗓️ Akun dibuat',    value: joinedAt,                  inline: true },
                    { name: '👥 Total Member',   value: `${memberCount} orang`,    inline: true },
                )
                .addFields({
                    name: '📋 Langkah Awal',
                    value:
                        '1. Baca aturan server\n' +
                        '2. Perkenalkan dirimu di channel ini!\n' +
                        '3. Pilih role minatmu di channel verifikasi\n' +
                        '4. Ketik `!daily` di channel bot untuk mulai bermain'
                })
                .setFooter({ text: `ID: ${member.user.id}` })
                .setTimestamp();

            await channel.send({
                content: `👋 Hey ${member}, selamat datang!`,
                embeds: [embed],
            });

            // ── Auto-assign role Member ───────────────────────────
            const memberRole = guild.roles.cache.find(r => r.name === '🌟 Member');
            if (memberRole) {
                await member.roles.add(memberRole).catch(() => {});
            }

        } catch (err) {
            console.error('[Welcome] Error:', err.message);
        }
    });

    // ── Member LEAVE ──────────────────────────────────────────────
    client.on('guildMemberRemove', async (member) => {
        try {
            const guild   = member.guild;
            const channel = guild.channels.cache.find(c => c.name === LEAVE_CHANNEL);
            if (!channel) return;

            const roles = member.roles.cache
                .filter(r => r.name !== '@everyone')
                .map(r => r.name)
                .join(', ') || 'Tidak ada role';

            const embed = new EmbedBuilder()
                .setColor('#E74C3C')
                .setTitle('👋 Member Keluar')
                .setDescription(`**${member.user.tag}** telah meninggalkan server.`)
                .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 128 }))
                .addFields(
                    { name: '👤 Username', value: `\`${member.user.tag}\``,          inline: true },
                    { name: '👥 Sisa Member', value: `${guild.memberCount} orang`,   inline: true },
                    { name: '🎭 Role terakhir', value: roles }
                )
                .setFooter({ text: `ID: ${member.user.id}` })
                .setTimestamp();

            await channel.send({ embeds: [embed] });

        } catch (err) {
            console.error('[Leave] Error:', err.message);
        }
    });

    console.log('✅ [Welcome] Event handler terdaftar');
};