/**
 * SUMMARIZE DOC v1.0 — Ringkas otomatis file PDF & Word (.docx)
 * Mendukung: Discord (attachment) & WhatsApp (document message)
 *
 * Commands:
 *   !ringkasdoc   — Kirim file PDF/DOCX lalu ketik !ringkasdoc
 *   !summarizedoc — Alias bahasa Inggris
 *   !analisisdok  — Mode analisis mendalam
 *
 * Cara pakai:
 *   Discord  : Upload file PDF/DOCX, lalu ketik !ringkasdoc di pesan yang sama
 *              ATAU reply pesan yang berisi file + ketik !ringkasdoc
 *   WhatsApp : Kirim dokumen PDF/DOCX, lalu reply + !ringkasdoc
 */

require('dotenv').config();
const axios  = require('axios');
const OpenAI = require('openai');

// ─── AI Client ────────────────────────────────────────────────────────────────
const client = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    defaultHeaders: {
        'HTTP-Referer': 'https://wa-bot.com',
        'X-Title': 'Algojo Bot Document Summarizer',
    },
});

// ─── Helper: Tanya AI ─────────────────────────────────────────────────────────
async function tanyaAI(userMsg, sysMsg = '') {
    const msgs = [];
    if (sysMsg) msgs.push({ role: 'system', content: sysMsg });
    msgs.push({ role: 'user', content: userMsg });

    const res = await client.chat.completions.create({
        model: 'google/gemini-2.5-flash',
        messages: msgs,
        max_tokens: 3000,
    });
    return res.choices[0]?.message?.content || 'Tidak ada respons AI.';
}

// ─── Helper: Download file dari URL ──────────────────────────────────────────
async function downloadFileBuffer(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    return Buffer.from(res.data);
}

// ─── Helper: Ekstrak teks dari PDF ────────────────────────────────────────────
async function extractPdfText(buffer) {
    try {
        const pdfParse = require('pdf-parse');
        const data = await pdfParse(buffer);
        return data.text?.trim() || null;
    } catch (e) {
        throw new Error('Gagal membaca PDF: ' + e.message);
    }
}

// ─── Helper: Ekstrak teks dari DOCX ───────────────────────────────────────────
async function extractDocxText(buffer) {
    try {
        const mammoth = require('mammoth');
        const result  = await mammoth.extractRawText({ buffer });
        return result.value?.trim() || null;
    } catch (e) {
        throw new Error('Gagal membaca DOCX: ' + e.message);
    }
}

// ─── Helper: Deteksi tipe file ────────────────────────────────────────────────
function detectFileType(filename = '', contentType = '') {
    const name = filename.toLowerCase();
    const mime = contentType.toLowerCase();

    if (name.endsWith('.pdf') || mime.includes('pdf'))                      return 'pdf';
    if (name.endsWith('.docx') || mime.includes('wordprocessingml'))        return 'docx';
    if (name.endsWith('.doc')  || mime.includes('msword'))                  return 'doc';
    return null;
}

// ─── Helper: Ambil attachment Discord ────────────────────────────────────────
function getDiscordAttachment(discordMessage) {
    if (!discordMessage) return null;

    // Cek attachment di pesan saat ini
    const att = discordMessage.attachments?.first?.();
    if (att) return att;

    // Cek attachment di pesan yang di-reply
    const ref = discordMessage.reference;
    // (akan di-fetch di main handler)
    return null;
}

// ─── Helper: Download WA document ────────────────────────────────────────────
async function getWADocument(m) {
    try {
        const { downloadMediaMessage } = require('@whiskeysockets/baileys');
        const SL = {
            level: 'silent', info: () => {}, error: () => {}, warn: () => {},
            debug: () => {}, trace: () => {}, fatal: () => {},
            child: function () { return this; },
        };

        const msgType = Object.keys(m?.message || {})[0];
        const quoted  = m?.message?.extendedTextMessage?.contextInfo?.quotedMessage;

        if (msgType === 'documentMessage') {
            return {
                buffer:   await downloadMediaMessage(m, 'buffer', {}, { logger: SL }),
                filename: m.message.documentMessage?.fileName || 'document',
                mime:     m.message.documentMessage?.mimetype || '',
            };
        }

        if (quoted?.documentMessage) {
            return {
                buffer:   await downloadMediaMessage(
                    {
                        key:     m.message.extendedTextMessage.contextInfo.stanzaId,
                        message: quoted,
                    },
                    'buffer', {}, { logger: SL }
                ),
                filename: quoted.documentMessage?.fileName || 'document',
                mime:     quoted.documentMessage?.mimetype || '',
            };
        }
    } catch (e) { /* ignore */ }
    return null;
}

// ─── Sistem Prompt AI ─────────────────────────────────────────────────────────
const SYSTEM_RINGKAS = `Kamu adalah asisten ahli meringkas dokumen. 
Tugas: Buat ringkasan komprehensif dokumen yang diberikan dalam Bahasa Indonesia.

Format output WAJIB:
📋 *RINGKASAN DOKUMEN*

📌 *Judul/Topik:* [identifikasi topik utama]
📊 *Jenis Dokumen:* [laporan/artikel/skripsi/proposal/kontrak/dll]
📏 *Panjang Konten:* [perkiraan]

━━━━━━━━━━━━━━━━
🎯 *IDE POKOK:*
[2-3 kalimat inti dari dokumen]

📝 *POIN-POIN UTAMA:*
• [poin 1]
• [poin 2]
• [poin 3 dst...]

💡 *KESIMPULAN:*
[kesimpulan singkat dan padat]
━━━━━━━━━━━━━━━━`;

const SYSTEM_ANALISIS = `Kamu adalah analis dokumen profesional. 
Lakukan analisis mendalam dokumen dalam Bahasa Indonesia.

Format output WAJIB:
🔍 *ANALISIS DOKUMEN*

📌 *Identitas:* [judul/topik/jenis]
👤 *Target Pembaca:* [perkiraan audiens]

━━━━━━━━━━━━━━━━
📖 *RINGKASAN EKSEKUTIF:*
[3-4 kalimat inti]

🔑 *TEMUAN KUNCI:*
• [temuan 1]
• [temuan 2 dst]

⚠️ *ISU/MASALAH DIBAHAS:*
[jika ada]

📊 *DATA/FAKTA PENTING:*
[angka, statistik, atau fakta utama]

🏁 *KESIMPULAN & REKOMENDASI:*
[kesimpulan + saran tindak lanjut]

🔠 *KATA KUNCI:*
[5-8 kata kunci dokumen]
━━━━━━━━━━━━━━━━`;

// ═══════════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════════
module.exports = async (command, args, msg, user, db, sock, m) => {
    const VALID = ['ringkasdoc', 'summarizedoc', 'analisisdok', 'analysisdoc'];
    if (!VALID.includes(command)) return;

    const isAnalisis = command === 'analisisdok' || command === 'analysisdoc';
    const emoji      = isAnalisis ? '🔍' : '📄';
    const label      = isAnalisis ? 'ANALISIS DOK' : 'RINGKAS DOK';
    const sysPrompt  = isAnalisis ? SYSTEM_ANALISIS : SYSTEM_RINGKAS;

    let fileBuffer = null;
    let filename   = 'document';
    let mimeType   = '';

    // ── 1. Coba ambil dari Discord attachment ──────────────────────────────
    const discordRaw = msg?._discordMessage;
    if (discordRaw) {
        // Attachment di pesan saat ini
        let att = discordRaw.attachments?.first?.();

        // Attachment dari pesan yang di-reply
        if (!att && discordRaw.reference?.messageId) {
            try {
                const refMsg = await discordRaw.channel.messages.fetch(discordRaw.reference.messageId);
                att = refMsg.attachments?.first?.();
            } catch (_) {}
        }

        if (att) {
            const ftype = detectFileType(att.name, att.contentType || '');
            if (!ftype) {
                return msg.reply(
                    `${emoji} *${label}*\n\n` +
                    '❌ Format tidak didukung.\n' +
                    '✅ File yang bisa dibaca: **PDF** (.pdf) dan **Word** (.docx)\n\n' +
                    '📌 Cara pakai:\n' +
                    '• Upload file → ketik `!ringkasdoc`\n' +
                    '• Atau reply file lama + ketik `!ringkasdoc`'
                );
            }

            await msg.react('⏳');
            await msg.reply(`${emoji} *Mengunduh & membaca file...*`);

            try {
                fileBuffer = await downloadFileBuffer(att.url);
                filename   = att.name || 'document';
                mimeType   = att.contentType || '';
            } catch (e) {
                return msg.reply('❌ Gagal mengunduh file: ' + e.message);
            }
        }
    }

    // ── 2. Coba ambil dari WhatsApp document ──────────────────────────────
    if (!fileBuffer && m) {
        const waDoc = await getWADocument(m);
        if (waDoc) {
            fileBuffer = waDoc.buffer;
            filename   = waDoc.filename;
            mimeType   = waDoc.mime;

            await msg.react('⏳');
            await msg.reply(`${emoji} *Membaca dokumen...*`);
        }
    }

    // ── 3. Tidak ada file → tampilkan bantuan ──────────────────────────────
    if (!fileBuffer) {
        return msg.reply(
            `${emoji} *${label}*\n\n` +
            '📂 Cara menggunakan fitur ini:\n\n' +
            '▶️ *Discord:*\n' +
            '1. Upload file PDF/DOCX\n' +
            '2. Ketik `!ringkasdoc` di pesan yang sama\n' +
            '3. Atau reply file yang sudah ada + `!ringkasdoc`\n\n' +
            '▶️ *WhatsApp:*\n' +
            '1. Kirim file dokumen (PDF/DOCX)\n' +
            '2. Reply dokumennya + ketik `!ringkasdoc`\n\n' +
            '📋 *Format didukung:* PDF, DOCX\n' +
            '🔍 *Mode analisis:* `!analisisdok` (lebih detail)'
        );
    }

    // ── 4. Ekstrak teks dari file ──────────────────────────────────────────
    const ftype = detectFileType(filename, mimeType);
    let extractedText = '';

    try {
        if (ftype === 'pdf') {
            extractedText = await extractPdfText(fileBuffer);
        } else if (ftype === 'docx') {
            extractedText = await extractDocxText(fileBuffer);
        } else if (ftype === 'doc') {
            return msg.reply('⚠️ Format `.doc` (lama) belum didukung. Simpan ulang sebagai `.docx` lalu coba lagi.');
        } else {
            return msg.reply('❌ Format file tidak dikenali. Gunakan PDF atau DOCX.');
        }
    } catch (e) {
        await msg.react('❌');
        return msg.reply('❌ ' + e.message);
    }

    if (!extractedText || extractedText.length < 50) {
        await msg.react('❌');
        return msg.reply(
            '❌ *Teks tidak berhasil diekstrak.*\n\n' +
            'Kemungkinan penyebab:\n' +
            '• PDF berupa scan/gambar (bukan teks)\n' +
            '• File terproteksi password\n' +
            '• Dokumen kosong\n\n' +
            '💡 Untuk PDF hasil scan, gunakan `!ocr` dengan kirim sebagai gambar.'
        );
    }

    // ── 5. Potong teks jika terlalu panjang (max ~12.000 karakter) ────────
    const MAX_CHARS = 12000;
    let textToProcess = extractedText;
    let truncated = false;
    if (extractedText.length > MAX_CHARS) {
        textToProcess = extractedText.substring(0, MAX_CHARS);
        truncated = true;
    }

    // ── 6. Kirim ke AI untuk diringkas ────────────────────────────────────
    try {
        const wordCount  = extractedText.split(/\s+/).length;
        const charCount  = extractedText.length;
        const truncNote  = truncated ? '\n\n⚠️ _Dokumen sangat panjang. Hanya 12.000 karakter pertama yang diproses._' : '';

        await msg.reply(`${emoji} *Menganalisis ${wordCount.toLocaleString()} kata...*`);

        const aiResult = await tanyaAI(
            `Dokumen (${wordCount} kata, ${charCount} karakter):\n\n${textToProcess}`,
            sysPrompt
        );

        const finalReply =
            `📁 *File:* ${filename}\n` +
            `📊 *Statistik:* ${wordCount.toLocaleString()} kata | ${charCount.toLocaleString()} karakter\n` +
            truncNote + '\n\n' +
            aiResult;

        await msg.reply(finalReply);
        await msg.react('✅');
    } catch (e) {
        await msg.react('❌');
        await msg.reply('❌ Gagal meringkas: ' + e.message);
    }
};