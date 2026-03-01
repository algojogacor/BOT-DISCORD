// ╔══════════════════════════════════════════════════════════════╗
// ║   POLL SYSTEM — commands/discord/poll.js                     ║
// ║   !poll buat | !poll tutup | !poll hasil                     ║
// ║   Data tersimpan permanen di MongoDB via global.db           ║
// ╚══════════════════════════════════════════════════════════════╝

const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require('discord.js');

// Emoji angka untuk pilihan
const NUM_EMOJI = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

// ── Helper: pastikan polls ada di db ──────────────────────────
function ensurePolls() {
    if (!global.db.polls) global.db.polls = {};
}

// ── Helper: buat bar progress visual ──────────────────────────
function makeBar(count, total, len = 12) {
    if (total === 0) return '░'.repeat(len) + ' 0%';
    const fill = Math.round((count / total) * len);
    const pct  = Math.round((count / total) * 100);
    return '█'.repeat(fill) + '░'.repeat(len - fill) + ` ${pct}%`;
}

// ── Helper: build embed dari data poll ───────────────────────
function buildPollEmbed(poll, ended = false) {
    const total = Object.values(poll.votes).flat().length;

    const optionLines = poll.options.map((opt, i) => {
        const votes = poll.votes[i]?.length || 0;
        return `${NUM_EMOJI[i]} **${opt}**\n> ${makeBar(votes, total)} — **${votes} vote**`;
    }).join('\n\n');

    const color  = ended ? '#95A5A6' : '#3498DB';
    const status = ended ? '🔒 POLL DITUTUP' : '📊 POLL AKTIF';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${status} — ${poll.question}`)
        .setDescription(optionLines)
        .addFields(
            { name: '👥 Total Vote', value: `${total} orang`, inline: true },
            { name: '👤 Dibuat',     value: poll.author,       inline: true },
            ...(poll.endTime
                ? [{ name: '⏰ Berakhir', value: `<t:${Math.floor(poll.endTime / 1000)}:R>`, inline: true }]
                : []
            ),
            ...(poll.multiVote
                ? [{ name: '✅ Mode', value: 'Multi-pilihan (boleh pilih lebih dari 1)' }]
                : []
            ),
        )
        .setFooter({ text: `Poll ID: ${poll.id}` })
        .setTimestamp();

    return embed;
}

// ── Helper: build tombol pilihan ──────────────────────────────
function buildButtons(poll) {
    const rows = [];
    let row = new ActionRowBuilder();
    let count = 0;

    for (let i = 0; i < poll.options.length; i++) {
        if (count === 5) {
            rows.push(row);
            row = new ActionRowBuilder();
            count = 0;
        }
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`poll_vote_${poll.id}_${i}`)
                .setLabel(`${i + 1}. ${poll.options[i].slice(0, 50)}`)
                .setEmoji(NUM_EMOJI[i])
                .setStyle(ButtonStyle.Primary)
        );
        count++;
    }
    rows.push(row);

    // Tombol lihat hasil
    const resultRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`poll_result_${poll.id}`)
            .setLabel('📊 Hasil')
            .setStyle(ButtonStyle.Secondary),
    );
    rows.push(resultRow);

    return rows;
}

module.exports = function registerPoll(client) {

    // ══════════════════════════════════════════════════════════════
    // COMMAND HANDLER
    // ══════════════════════════════════════════════════════════════
    client.on('messageCreate', async (message) => {
        if (message.author.bot) return;
        if (!message.content.toLowerCase().startsWith('!poll')) return;

        const rawArgs = message.content.slice('!poll'.length).trim();
        const parts   = rawArgs.split(' ');
        const sub     = (parts[0] || '').toLowerCase();

        const isAdmin = message.member?.permissions?.has('Administrator');
        ensurePolls();

        // ── !poll atau !poll help ──────────────────────────────────
        if (!sub || sub === 'help') {
            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('📊 Panduan Poll System')
                    .addFields(
                        {
                            name: '📝 Buat Poll',
                            value:
                                '`!poll buat <pertanyaan> | <opsi1> | <opsi2> | ...`\n' +
                                'Contoh: `!poll buat Game favorit? | Mobile Legends | PUBG | Free Fire`\n\n' +
                                'Dengan durasi: tambah `--waktu 1h` di akhir (30m/1h/6h/1d/7d)\n' +
                                'Multi-pilihan: tambah `--multi` di akhir'
                        },
                        {
                            name: '🔧 Kelola Poll (Admin)',
                            value:
                                '`!poll tutup <id>` — Tutup poll\n' +
                                '`!poll hapus <id>` — Hapus poll\n' +
                                '`!poll list` — Lihat semua poll aktif'
                        },
                        {
                            name: '📊 Lihat Hasil',
                            value: '`!poll hasil <id>` — Lihat hasil detail poll'
                        },
                    )
                ]
            });
        }

        // ── !poll list ─────────────────────────────────────────────
        if (sub === 'list') {
            const active = Object.values(global.db.polls)
                .filter(p => !p.ended && p.guildId === message.guild.id);

            if (!active.length) return message.reply('📊 Tidak ada poll aktif saat ini.');

            const lines = active.map(p => {
                const total = Object.values(p.votes).flat().length;
                const end   = p.endTime ? `— berakhir <t:${Math.floor(p.endTime / 1000)}:R>` : '';
                return `**[${p.id}]** ${p.question} — ${total} vote ${end}`;
            }).join('\n');

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor('#3498DB')
                    .setTitle('📊 Poll Aktif')
                    .setDescription(lines)
                    .setFooter({ text: 'Gunakan !poll hasil <id> untuk detail' })
                ]
            });
        }

        // ── !poll buat ─────────────────────────────────────────────
        if (sub === 'buat') {
            const rest = parts.slice(1).join(' ');

            // Parse flags
            let text      = rest;
            let duration  = null;
            let multiVote = false;

            // Cek --multi
            if (text.includes('--multi')) {
                multiVote = true;
                text = text.replace('--multi', '').trim();
            }

            // Cek --waktu
            const waktuMatch = text.match(/--waktu\s+(\d+[mhd])/i);
            if (waktuMatch) {
                const raw = waktuMatch[1];
                const val = parseInt(raw);
                const mul = { m: 60000, h: 3600000, d: 86400000 };
                duration  = val * (mul[raw.slice(-1)] || 0);
                text = text.replace(waktuMatch[0], '').trim();
            }

            // Split pertanyaan & opsi
            const segments = text.split('|').map(s => s.trim()).filter(Boolean);
            if (segments.length < 3) {
                return message.reply(
                    '❌ Format salah! Minimal 2 pilihan.\n' +
                    'Contoh: `!poll buat Pilih game? | ML | PUBG | FF`'
                );
            }
            if (segments.length > 11) {
                return message.reply('❌ Maksimal 10 pilihan!');
            }

            const question = segments[0];
            const options  = segments.slice(1);
            const pollId   = `${message.guild.id}_${Date.now()}`;
            const endTime  = duration ? Date.now() + duration : null;

            // Buat struktur votes: { 0: [], 1: [], ... }
            const votes = {};
            options.forEach((_, i) => { votes[i] = []; });

            const poll = {
                id:        pollId,
                guildId:   message.guild.id,
                channelId: message.channel.id,
                question,
                options,
                votes,
                multiVote,
                endTime,
                author:    message.author.tag,
                ended:     false,
                createdAt: Date.now(),
            };

            global.db.polls[pollId] = poll;

            const embed   = buildPollEmbed(poll);
            const buttons = buildButtons(poll);

            const pollMsg = await message.channel.send({ embeds: [embed], components: buttons });
            poll.messageId = pollMsg.id;

            await message.delete().catch(() => {});

            // Auto-tutup jika ada durasi
            if (duration) {
                setTimeout(async () => {
                    await closePoll(client, pollId);
                }, duration);
            }

            return;
        }

        // ── !poll tutup <id> ───────────────────────────────────────
        if (sub === 'tutup') {
            if (!isAdmin) return message.reply('❌ Hanya admin!');
            const id = parts[1];
            if (!id || !global.db.polls[id]) return message.reply('❌ Poll ID tidak ditemukan!');
            await closePoll(client, id);
            return message.reply(`✅ Poll **${global.db.polls[id]?.question}** ditutup.`);
        }

        // ── !poll hapus <id> ───────────────────────────────────────
        if (sub === 'hapus') {
            if (!isAdmin) return message.reply('❌ Hanya admin!');
            const id = parts[1];
            if (!id || !global.db.polls[id]) return message.reply('❌ Poll ID tidak ditemukan!');
            const name = global.db.polls[id].question;
            delete global.db.polls[id];
            return message.reply(`🗑️ Poll **${name}** dihapus.`);
        }

        // ── !poll hasil <id> ───────────────────────────────────────
        if (sub === 'hasil') {
            const id   = parts[1];
            const poll = global.db.polls[id];
            if (!poll) return message.reply('❌ Poll ID tidak ditemukan!');

            const total   = Object.values(poll.votes).flat().length;
            const sorted  = poll.options
                .map((opt, i) => ({ opt, i, count: poll.votes[i]?.length || 0 }))
                .sort((a, b) => b.count - a.count);

            const lines = sorted.map((item, rank) => {
                const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
                const crown = rank === 0 && item.count > 0 ? ' 👑' : '';
                return `${NUM_EMOJI[item.i]} **${item.opt}**${crown}\n> ${makeBar(item.count, total)} — ${item.count} vote (${pct}%)`;
            }).join('\n\n');

            return message.reply({
                embeds: [new EmbedBuilder()
                    .setColor(poll.ended ? '#95A5A6' : '#2ECC71')
                    .setTitle(`📊 Hasil Poll — ${poll.question}`)
                    .setDescription(lines)
                    .addFields(
                        { name: '👥 Total Vote', value: `${total}`, inline: true },
                        { name: '📌 Status',     value: poll.ended ? 'Ditutup' : 'Aktif', inline: true },
                    )
                    .setFooter({ text: `Poll ID: ${id}` })
                ]
            });
        }
    });

    // ══════════════════════════════════════════════════════════════
    // BUTTON INTERACTION
    // ══════════════════════════════════════════════════════════════
    client.on('interactionCreate', async (interaction) => {
        if (!interaction.isButton()) return;

        const { customId, user } = interaction;

        // ── Tombol Vote ────────────────────────────────────────────
        if (customId.startsWith('poll_vote_')) {
            await interaction.deferReply({ ephemeral: true });

            ensurePolls();
            // Format: poll_vote_<pollId>_<optionIndex>
            const parts    = customId.replace('poll_vote_', '').split('_');
            const optIndex = parseInt(parts.pop());
            const pollId   = parts.join('_');
            const poll     = global.db.polls[pollId];

            if (!poll) return interaction.editReply('❌ Poll tidak ditemukan!');
            if (poll.ended) return interaction.editReply('❌ Poll sudah ditutup!');

            const userId = user.id;

            if (!poll.multiVote) {
                // Single vote — cek apakah sudah vote di opsi manapun
                const alreadyVotedIdx = poll.options.findIndex((_, i) =>
                    poll.votes[i]?.includes(userId)
                );

                if (alreadyVotedIdx !== -1) {
                    if (alreadyVotedIdx === optIndex) {
                        // Cabut vote (toggle)
                        poll.votes[optIndex] = poll.votes[optIndex].filter(id => id !== userId);
                        await updatePollMessage(interaction.client, poll);
                        return interaction.editReply(`❌ Vote kamu untuk **${poll.options[optIndex]}** dicabut.`);
                    } else {
                        // Pindah vote
                        poll.votes[alreadyVotedIdx] = poll.votes[alreadyVotedIdx].filter(id => id !== userId);
                        poll.votes[optIndex].push(userId);
                        await updatePollMessage(interaction.client, poll);
                        return interaction.editReply(`🔄 Vote dipindah ke **${poll.options[optIndex]}**.`);
                    }
                }

                poll.votes[optIndex].push(userId);

            } else {
                // Multi vote — toggle per opsi
                const idx = poll.votes[optIndex].indexOf(userId);
                if (idx !== -1) {
                    poll.votes[optIndex].splice(idx, 1);
                    await updatePollMessage(interaction.client, poll);
                    return interaction.editReply(`❌ Pilihan **${poll.options[optIndex]}** dicabut.`);
                }
                poll.votes[optIndex].push(userId);
            }

            await updatePollMessage(interaction.client, poll);
            return interaction.editReply(`✅ Kamu memilih **${poll.options[optIndex]}**!`);
        }

        // ── Tombol Hasil ───────────────────────────────────────────
        if (customId.startsWith('poll_result_')) {
            await interaction.deferReply({ ephemeral: true });

            ensurePolls();
            const pollId = customId.replace('poll_result_', '');
            const poll   = global.db.polls[pollId];
            if (!poll) return interaction.editReply('❌ Poll tidak ditemukan!');

            const total  = Object.values(poll.votes).flat().length;
            const lines  = poll.options.map((opt, i) => {
                const count = poll.votes[i]?.length || 0;
                return `${NUM_EMOJI[i]} **${opt}** — ${count} vote (${total > 0 ? Math.round(count/total*100) : 0}%)`;
            }).join('\n');

            return interaction.editReply({
                embeds: [new EmbedBuilder()
                    .setColor('#9B59B6')
                    .setTitle(`📊 ${poll.question}`)
                    .setDescription(lines)
                    .setFooter({ text: `Total: ${total} vote` })
                ]
            });
        }
    });

    // ── Fungsi update embed poll di Discord ───────────────────────
    async function updatePollMessage(client, poll) {
        try {
            const guild   = client.guilds.cache.get(poll.guildId);
            const channel = guild?.channels.cache.get(poll.channelId);
            if (!channel) return;
            const msg = await channel.messages.fetch(poll.messageId).catch(() => null);
            if (!msg) return;
            await msg.edit({ embeds: [buildPollEmbed(poll, poll.ended)] });
        } catch (e) {
            console.error('[Poll] updatePollMessage:', e.message);
        }
    }

    // ── Fungsi tutup poll ─────────────────────────────────────────
    async function closePoll(client, pollId) {
        ensurePolls();
        const poll = global.db.polls[pollId];
        if (!poll || poll.ended) return;

        poll.ended = true;

        // Cari pemenang
        const winner = poll.options
            .map((opt, i) => ({ opt, count: poll.votes[i]?.length || 0 }))
            .sort((a, b) => b.count - a.count)[0];

        // Update embed di Discord
        try {
            const guild   = client.guilds.cache.get(poll.guildId);
            const channel = guild?.channels.cache.get(poll.channelId);
            if (channel) {
                const msg = await channel.messages.fetch(poll.messageId).catch(() => null);
                if (msg) {
                    await msg.edit({ embeds: [buildPollEmbed(poll, true)], components: [] });
                }
                if (winner && winner.count > 0) {
                    await channel.send(
                        `🏆 **Poll selesai!** "${poll.question}"\n` +
                        `Pemenang: **${winner.opt}** dengan **${winner.count} vote**!`
                    );
                }
            }
        } catch (e) {
            console.error('[Poll] closePoll error:', e.message);
        }
    }

    // ── Saat bot ready: restore timer untuk poll yang belum tutup ──
    client.once('clientReady', () => {
        ensurePolls();
        const now = Date.now();
        for (const poll of Object.values(global.db.polls)) {
            if (!poll.ended && poll.endTime) {
                const remaining = poll.endTime - now;
                if (remaining <= 0) {
                    closePoll(client, poll.id);
                } else {
                    setTimeout(() => closePoll(client, poll.id), remaining);
                }
            }
        }
        console.log('✅ [Poll] Handler terdaftar & timer poll restored dari MongoDB');
    });
};