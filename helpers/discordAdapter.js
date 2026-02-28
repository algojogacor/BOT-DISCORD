// ╔══════════════════════════════════════════════════════════════╗
// ║           DISCORD ADAPTER — helpers/discordAdapter.js        ║
// ║  Normalize format pesan Discord agar kompatibel dengan       ║
// ║  command WA yang sudah ada (msg.reply, msg.react, dll)       ║
// ╚══════════════════════════════════════════════════════════════╝

const { EmbedBuilder } = require('discord.js');

/**
 * Buat object `msg` yang interface-nya sama dengan WA
 * sehingga semua command bisa langsung dipanggil tanpa diubah
 */
function createDiscordMsg(message, body, sender, pushName, guildId) {
    const isGroup = !!message.guild;

    // chat object (mirip WA)
    const chat = {
        id: { _serialized: guildId },
        isGroup,
        sendMessage: async (content) => {
            if (typeof content === 'string') {
                await message.channel.send(content);
            } else if (content?.text) {
                await message.channel.send(content.text);
            } else if (content?.image) {
                // WA image → Discord attachment
                await message.channel.send({ files: [content.image] });
            }
        },
    };

    const msg = {
        body,
        from:     guildId,
        author:   sender,
        pushName,
        hasMedia: false,
        isGroup,
        type:     'text',
        platform: 'discord', // identifier platform

        // ── reply: balas pesan ──────────────────────────────────────
        reply: async (text) => {
            const str = String(text);

            // Kalau teksnya panjang atau mengandung format bot, bungkus dalam code block
            if (str.length > 1800) {
                const chunks = str.match(/[\s\S]{1,1800}/g) || [str];
                for (const chunk of chunks) {
                    await message.reply(chunk);
                }
                return;
            }

            // Format bold *teks* WA → **teks** Discord
            const formatted = convertWAtoDiscord(str);
            await message.reply(formatted);
        },

        // ── react: kirim emoji reaction ────────────────────────────
        react: async (emoji) => {
            try { await message.react(emoji); }
            catch(e) { /* ignore invalid emoji */ }
        },

        // ── sendEmbed: khusus Discord (opsional dipakai command) ───
        sendEmbed: async (embedData) => {
            const embed = new EmbedBuilder()
                .setColor(embedData.color || '#7289DA')
                .setTitle(embedData.title || '')
                .setDescription(embedData.description || '')
                .setFooter({ text: 'Algojo Bot v2.0 | Discord' })
                .setTimestamp();

            if (embedData.fields) embed.addFields(embedData.fields);
            if (embedData.thumbnail) embed.setThumbnail(embedData.thumbnail);

            await message.channel.send({ embeds: [embed] });
        },

        // ── getChat: return chat object ────────────────────────────
        getChat: async () => chat,

        // ── key & raw message (untuk fitur yang butuh ini) ─────────
        key:     { id: message.id, remoteJid: guildId },
        message: { conversation: body },
        extendedTextMessage: null,
        _discordMessage: message, // referensi asli kalau dibutuhkan
    };

    return msg;
}

/**
 * Convert formatting WA ke Discord:
 * *bold* → **bold**
 * _italic_ → *italic*
 * ~strikethrough~ → ~~strikethrough~~
 * ```code``` → ```code```
 */
function convertWAtoDiscord(text) {
    return text
        .replace(/\*([^*]+)\*/g, '**$1**')   // bold
        .replace(/_([^_]+)_/g, '*$1*')        // italic
        .replace(/~([^~]+)~/g, '~~$1~~');     // strikethrough
}

/**
 * Buat embed standar untuk response bergaya Discord
 */
function makeEmbed(title, description, color = '#7289DA') {
    return new EmbedBuilder()
        .setColor(color)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'Algojo Bot v2.0' })
        .setTimestamp();
}

module.exports = { createDiscordMsg, convertWAtoDiscord, makeEmbed };