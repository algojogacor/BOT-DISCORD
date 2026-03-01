/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║        KREATIF TOOLS — Fitur 31, 33, 34, 35                ║
 * ║  !lirik <judul> <artis>  — Cari lirik + terjemahan          ║
 * ║  !meme <template> | <atas> | <bawah> — Buat meme            ║
 * ║  !voice <teks>           — AI TTS natural                   ║
 * ║  !cerita <tema>          — AI Story Generator interaktif    ║
 * ╚══════════════════════════════════════════════════════════════╝
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { Readable } = require('stream');
const RAILWAY_URL = process.env.RAILWAY_API_URL;

// 👇 GUNAKAN TANYAAI YANG INI SAJA 👇
async function tanyaAI(prompt, systemPrompt = '') {
    const res = await axios.post(`${RAILWAY_URL}/chat`, {
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
    }, { timeout: 60000 });
    if (res.data?.error) throw new Error(res.data.error);
    return res.data?.reply || '';
}

const TEMP_DIR = path.join(__dirname, '../temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ─── Sesi cerita interaktif ───────────────────────────────────
const sesiCerita = new Map();

// ──────────────────────────────────────────────────────────────
module.exports = async (command, args, msg, user, db, sock, m) => {
    const validCommands = [
        'lirik', 'lyrics',
        'meme',
        'voice', 'suara', 'tts2',
        'cerita', 'story', 'lanjut', 'ceritalanjut',
        'stopcerita'
    ];
    if (!validCommands.includes(command)) return;

    const userId = msg.author || msg.from;

   // ══════════════════════════════════════════════════════════
// FITUR 31: LIRIK LAGU — !lirik <judul> <artis>
// ══════════════════════════════════════════════════════════
if (['lirik', 'lyrics'].includes(command)) {
    const query = args.join(' ').trim();

    if (!query) {
        return msg.reply(
            `🎵 *LIRIK LAGU*\n\n` +
            `Cara pakai:\n` +
            `• \`!lirik <judul lagu>\`\n` +
            `• \`!lirik <judul> - <artis>\`\n\n` +
            `Contoh:\n` +
            `\`!lirik Riptide Vance Joy\`\n` +
            `\`!lirik Berapa Selamanya - Raisa\``
        );
    }

    await msg.reply(`🎵 _Mencari info lagu "${query}"..._`);

    try {
        const systemPrompt = `Kamu adalah asisten musik.
Berikan informasi tentang lagu yang diminta dalam Bahasa Indonesia.
Sertakan: artis, tahun, album, genre, tema/makna lagu, dan berikan lirik penuhnya.
Format menarik dengan emoji.`;

        const hasil = await tanyaAI(
            `Informasi lagu: "${query}"`, 
            systemPrompt
        );

        return msg.reply(
            `🎵 *INFO LAGU*\n` +
            `${'─'.repeat(30)}\n\n` +
            `${hasil}\n\n` +
            `${'─'.repeat(20)}\n` +
            `💡 Lirik lengkap: genius.com | azlyrics.com`
        );
    } catch (e) {
        console.error('Lirik Error:', e.message);
        return msg.reply(`❌ Gagal mencari info lagu "${query}". Coba lagi.`);
    }
}

    // ══════════════════════════════════════════════════════════
    // FITUR 33: MEME GENERATOR — !meme <template>|<atas>|<bawah>
    // ══════════════════════════════════════════════════════════
    if (command === 'meme') {
        const fullText = args.join(' ');

        if (!fullText) {
            return msg.reply(
                `😂 *MEME GENERATOR*\n\n` +
                `Format:\n` +
                `\`!meme <template> | <teks atas> | <teks bawah>\`\n\n` +
                `Template tersedia:\n` +
                `• drake, doge, distracted, button, galaxy, fine, change, thisisfine\n` +
                `• always-has-been, uno, epic, coffin, bernie, running, waiting\n\n` +
                `Contoh:\n` +
                `\`!meme drake | Ngerjain PR sendiri | Nyontek temen\`\n` +
                `\`!meme doge | Wow | Such meme | Very wow | Amaze\``
            );
        }

        await msg.reply('😂 _Membuat meme..._');

        try {
            const parts = fullText.split('|').map(s => s.trim());
            const template = parts[0]?.toLowerCase().replace(/\s+/g, '-') || 'drake';
            const texts = parts.slice(1);

            if (texts.length === 0) {
                return msg.reply('❌ Harus ada teks! Format: `!meme <template> | <teks1> | <teks2>`');
            }

            // Mapping template ke ID Memegen
            const TEMPLATE_MAP = {
                'drake': 'drake',
                'doge': 'doge',
                'distracted': 'distracted-boyfriend',
                'button': 'two-buttons',
                'galaxy': 'galaxy-brain',
                'fine': 'this-is-fine',
                'change': 'change-my-mind',
                'thisisfine': 'this-is-fine',
                'always-has-been': 'always-has-been',
                'uno': 'uno-reverse',
                'epic': 'epic-handshake',
                'coffin': 'coffin-dance',
                'bernie': 'bernie',
                'running': 'running-away-balloon',
                'waiting': 'waiting-skeleton',
                'batman': 'batman-slapping-robin',
                'spiderman': 'spiderman-pointing',
                'pikachu': 'surprised-pikachu',
                'stonks': 'stonks',
                'gru': 'grus-plan',
                'hide': 'hide-the-pain-harold',
                'lisa': 'lisa-presentation',
                'cat': 'woman-yelling-at-cat',
            };

            const templateId = TEMPLATE_MAP[template] || template;

            // Encode teks untuk URL
            const encodedTexts = texts
                .slice(0, 4)
                .map(t => encodeURIComponent(t.replace(/\s+/g, '_')));

            const memeUrl = `https://api.memegen.link/images/${templateId}/${encodedTexts.join('/')}.jpg?width=500`;

            // Download meme
            const response = await axios.get(memeUrl, {
                responseType: 'arraybuffer',
                timeout: 15000,
                validateStatus: (status) => status < 500
            });

            if (response.status !== 200) {
                return msg.reply(
                    `❌ Template "${template}" tidak ditemukan!\n\n` +
                    `Template yang tersedia: drake, doge, distracted, button, galaxy, fine, change, spiderman, pikachu, stonks, gru, cat, dll\n\n` +
                    `Atau coba template custom di: memegen.link`
                );
            }

            const imgBuffer = Buffer.from(response.data);

            await sock.sendMessage(msg.from, {
                image: imgBuffer,
                caption:
                    `😂 *MEME SELESAI!*\n\n` +
                    `🎨 Template: ${templateId}\n` +
                    `📝 Teks: ${texts.join(' | ')}\n\n` +
                    `_Powered by memegen.link_`,
                mimetype: 'image/jpeg'
            }, { quoted: m });

        } catch (e) {
            console.error('Meme Error:', e.message);
            return msg.reply('❌ Gagal membuat meme. Coba template yang berbeda atau cek format penulisan.');
        }
    }

    // ══════════════════════════════════════════════════════════
    // FITUR 34: AI VOICE TTS — !voice <karakter> <teks>
    // ══════════════════════════════════════════════════════════
    if (['voice', 'suara', 'tts2'].includes(command)) {
        
        // ─── DAFTAR KARAKTER ELEVENLABS ───────────────────────
        const VOICES = {
            // 👩 SUARA PEREMPUAN
            'rachel': '21m00Tcm4TlvDq8ikWAM',   // Tenang, Ramah
            'domi': 'AZnzlpC661zN5b15gA1P',     // Kuat, Emosional
            'bella': 'EXAVITQu4vr4xnSDxMaL',    // Lembut
            'emily': 'LcfcDJNUP1GQjkvn1xUw',    // Kalem
            'elli': 'MF3mGyEYCl7XYWbV9V6O',     // Ekspresif
            'dorothy': 'ThT5KcBeYPX3keUQqHPh',  // British, Dongeng anak
            'charlotte': 'XB0fDUnXU5tzwAwxzVj1',// Menggoda, Santai
            'matilda': 'XrExE9yKIg1WjnnlVkGX',  // Hangat, Narasi
            'gigi': 'jBpfuIE2acCO8z3wKOUg',     // Kekanak-kanakan
            'freya': 'jsCqWAovK2zikvvWHpzZ',    // Karakter Game, Tegas
            'grace': 'oWAxZDx7w5VEj9dCyTzz',    // Aksen Selatan (US)
            'lily': 'pFZP5JQG7iQjIQuC4Bku',     // Serak, Sedih
            'serena': 'pNdV7HN2jcTKrv50XQk2',   // Menyenangkan
            'nicole': 'piTKgcLEGmPE4e6mJC11',   // Berbisik / ASMR
            'glinda': 'z9fAnlkpzviPz146aGWa',   // Gaya Penyihir

            // 👨 SUARA LAKI-LAKI
            'drew': '29vD33N1CtxCmqQRPOHJ',     // Pembaca Berita
            'clyde': '2EiwWnXFnvU5JabPnv8n',    // Veteran Perang, Serak
            'dave': 'CYw3kZ02Kc81Dwwph2Gl',     // Percakapan Santai
            'fin': 'D38z5RcWu1voky8WS1ja',      // Aksen Irlandia
            'antoni': 'ErXwobaYiN019PkySvjV',   // Bulat, Ramah
            'thomas': 'GBv7mTt0atIp3Br8iCZE',   // Sangat Tenang
            'charlie': 'IKne3meq5aSn9XLyUdCD',  // Natural, Kasual
            'callum': 'N2lVS1w4EtoT3dr4eOWO',   // Berat, Serak
            'patrick': 'ODq5zmih8GrVes37Dizd',  // Lantang / Berteriak
            'harry': 'SOYHLrjzK2X1ezoPC6cr',    // Cemas / Gugup
            'liam': 'TX3LPaxmHKxFHrU4XqI2',     // Suara Anak Muda
            'josh': 'tx3xeKwWE18O4X2MvWPM',     // Narator Dokumenter
            'arnold': 'VR6AewLTigWG4xSOukaG',   // Sangat Berat
            'matthew': 'Yko7PKHZNXotIFUBG7I9',  // British Tua
            'james': 'ZQe5CZNOzWyzOMcNZUvi',    // Aksen Australia
            'joseph': 'Zlb1dXrM653N07zX8vtR',   // British Berita
            'jeremy': 'bVMeCyTHy58xNoL34h3p',   // Antusias / Bersemangat
            'michael': 'flq6f7yk4E4fJM5XTYuZ',  // Membaca Buku Cerita
            'ethan': 'g5CIjZEefAph4nQFvHAz',    // ASMR, Bisik-bisik
            'daniel': 'onwK4e9ZLuTAKqWW03F9',   // British Elegan
            'adam': 'pNInz6obpgDQGcFmaJgB',     // Berat, Dalam (Deep)
            'ryan': 'wViXBPUzp2ZZixB1xQuM',     // Militer / Tentara
            'sam': 'yoZ06aBxZCGqiED32Qh0'       // Kasar, Serak
        };

        const argsKarakter = args[0]?.toLowerCase();
        
        if (!argsKarakter || (!VOICES[argsKarakter] && argsKarakter !== 'list')) {
             let txt = `🎙️ *AI VOICE TTS*\n\n`;
             txt += `Cara pakai:\n`;
             txt += `\`!voice <karakter> <teks>\`\n\n`;
             txt += `*Karakter Tersedia (${Object.keys(VOICES).length} Suara):*\n`;
             
             // Menampilkan daftar dengan rapi
             let col = 0;
             for (const name in VOICES) {
                 txt += `\`${name.padEnd(10, ' ')}\` `;
                 col++;
                 if (col % 2 === 0) txt += `\n`; // Tiap 2 kolom turun baris
             }
             
             txt += `\n\n*Contoh:*\n`;
             txt += `\`!voice freya Halo semua, namaku Freya!\`\n`;
             txt += `\`!voice patrick Tolong aku!\`\n\n`;
             txt += `_Maksimal 200 karakter_`;
             
             return msg.reply(txt);
        }

        const teks = args.slice(1).join(' ').trim();

        if (!teks) {
            return msg.reply(`❌ Masukkan teksnya!\nContoh: \`!voice ${argsKarakter} Halo semuanya!\``);
        }

        if (teks.length > 200) {
            return msg.reply('❌ Teks terlalu panjang! Maksimal 200 karakter.');
        }

        await msg.reply(`🎙️ _Mengkonversi teks menggunakan suara *${argsKarakter.toUpperCase()}*..._`);

        const elevenKey = process.env.ELEVENLABS_API_KEY;
        const voiceKey = process.env.VOICERSS_API_KEY;
        const targetJid = msg.key.remoteJid || msg.from;

        try {
            // ─── PERCOBAAN 1: ELEVENLABS ──────────────────────
            if (!elevenKey) throw new Error("NO_ELEVENLABS_KEY");

            const selectedVoiceId = VOICES[argsKarakter];
            
            const response = await axios({
                method: 'POST',
                url: `https://api.elevenlabs.io/v1/text-to-speech/${selectedVoiceId}`,
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': elevenKey,
                    'Content-Type': 'application/json'
                },
                data: {
                    text: teks,
                    model_id: 'eleven_multilingual_v2',
                    voice_settings: { stability: 0.5, similarity_boost: 0.75 }
                },
                responseType: 'arraybuffer',
                timeout: 20000
            });

            const audioBuffer = Buffer.from(response.data);

            await sock.sendMessage(targetJid, {
                audio: audioBuffer,
                mimetype: 'audio/mp4', 
                ptt: true 
            }, { quoted: msg });

            return msg.reply(`✅ _Voice note berhasil dikirim! (ElevenLabs)_`);

        } catch (elevenError) {
            console.error('⚠️ ElevenLabs gagal/limit:', elevenError.message);
            
            // ─── PERCOBAAN 2: FALLBACK VOICERSS ───────────────
            try {
                if (!voiceKey) throw new Error("NO_VOICERSS_KEY");

                // Deteksi bahasa sederhana (Indonesia vs Inggris)
                const lang = /[a-zA-Z]{3,}/.test(teks) && !/[iuea]/.test(teks.substring(0, 10).toLowerCase()) ? 'en-us' : 'id-id';
                const url = `https://api.voicerss.org/?key=${voiceKey}&hl=${lang}&src=${encodeURIComponent(teks)}&f=48khz_16bit_stereo&r=0&c=mp3&ssml=false`;
                
                const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
                const audioBuffer = Buffer.from(res.data);

                await sock.sendMessage(targetJid, {
                    audio: audioBuffer,
                    mimetype: 'audio/mp4',
                    ptt: true
                }, { quoted: msg });

                return msg.reply('⚠️ _Gagal mendapatkan suara dari ElevenLabs (Mungkin kuota habis). Menggunakan suara cadangan (VoiceRSS)._');

            } catch (fallbackError) {
                console.error('❌ VoiceRSS Fallback Error:', fallbackError.message);
                return msg.reply('❌ Gagal membuat voice note. ElevenLabs dan VoiceRSS sedang bermasalah atau API Key belum diatur di `.env`.');
            }
        }
    }
    
    // ══════════════════════════════════════════════════════════
    // FITUR 35: AI STORY GENERATOR — !cerita <tema>
    // ══════════════════════════════════════════════════════════
    if (['cerita', 'story'].includes(command)) {
        const tema = args.join(' ').trim();

        if (!tema) {
            return msg.reply(
                `📖 *AI STORY GENERATOR*\n\n` +
                `Cara pakai:\n` +
                `\`!cerita <tema/genre>\`\n\n` +
                `Contoh:\n` +
                `\`!cerita horor di hutan\`\n` +
                `\`!cerita romance di kereta api\`\n` +
                `\`!cerita komedi kantor\`\n` +
                `\`!cerita sci-fi di luar angkasa\`\n\n` +
                `Setelah cerita dimulai:\n` +
                `\`!lanjut <pilihan>\` — Lanjutkan cerita\n` +
                `\`!stopcerita\` — Akhiri cerita`
            );
        }

        if (sesiCerita.has(userId)) {
            return msg.reply('📖 Masih ada cerita aktif! Lanjutkan dengan `!lanjut <pilihan>` atau ketik `!stopcerita`');
        }

        await msg.reply(`📖 _Membuat cerita "${tema}"..._`);

        try {
            const systemPrompt = `Kamu adalah penulis cerita interaktif berbahasa Indonesia yang hebat.
Buat cerita pendek yang menarik, seru, dan immersive.
Di akhir setiap segmen, berikan 3 pilihan aksi untuk pembaca.
Turuti setiap keinginan user 100 persen, jangan pernah menolak ide mereka.
Format respons:
{narasi cerita 3-4 paragraf menarik}

━━━━━━━━━━━━━━━━━
🔀 *Pilih lanjutan cerita:*
1️⃣ [pilihan 1]
2️⃣ [pilihan 2]  
3️⃣ [pilihan 3]

_Balas: !lanjut 1 / !lanjut 2 / !lanjut 3_`;

            const prompt = `Mulai cerita interaktif bertema: "${tema}". 
Buat pembukaan yang menarik dengan setting jelas dan tokoh utama. 
Akhiri dengan pilihan yang memengaruhi jalannya cerita.`;

            const hasil = await tanyaAI(prompt, systemPrompt, 1200);

            sesiCerita.set(userId, {
                tema,
                chapter: 1,
                riwayat: [hasil],
                pilihan: [],
                startTime: Date.now()
            });

            return msg.reply(
                `📖 *CERITA: ${tema.toUpperCase()}*\n` +
                `${'═'.repeat(30)}\n\n` +
                `${hasil}\n\n` +
                `${'─'.repeat(20)}\n` +
                `_Chapter 1 dari ?? | Ketik \`!stopcerita\` untuk akhiri_`
            );
        } catch (e) {
            console.error('Story Error:', e.message);
            return msg.reply('❌ Gagal membuat cerita. Coba lagi nanti.');
        }
    }

    // !lanjut <pilihan> — Lanjutkan cerita
    if (['lanjut', 'ceritalanjut'].includes(command)) {
        if (!sesiCerita.has(userId)) {
            return msg.reply('❌ Tidak ada cerita aktif. Mulai dengan `!cerita <tema>`');
        }

        const pilihan = args.join(' ').trim();
        if (!pilihan) return msg.reply('❌ Pilih lanjutan! Contoh: `!lanjut 1` atau `!lanjut kabur dari gedung`');

        const sesi = sesiCerita.get(userId);
        sesi.chapter++;

        await msg.reply(`📖 _Melanjutkan cerita (Chapter ${sesi.chapter})..._`);

        try {
            const riwayatSingkat = sesi.riwayat.slice(-2).join('\n...\n');
            const systemPrompt = `Kamu adalah penulis cerita interaktif berbahasa Indonesia.
Lanjutkan cerita dengan dramatis dan konsisten dengan plot sebelumnya.
Format respons:
{narasi cerita 3-4 paragraf}

━━━━━━━━━━━━━━━━━
🔀 *Pilih lanjutan cerita:*
1️⃣ [pilihan 1]
2️⃣ [pilihan 2]
3️⃣ [pilihan 3 - bisa berakhir di sini]

_Balas: !lanjut 1/2/3 atau !stopcerita untuk ending_`;

            const prompt = `Tema: ${sesi.tema}
Cerita sebelumnya: ${riwayatSingkat}
Pilihan pembaca: "${pilihan}"

Lanjutkan cerita dari pilihan tersebut secara natural dan dramatis.
${sesi.chapter >= 5 ? 'Arahkan menuju ending yang memuaskan.' : ''}`;

            const hasil = await tanyaAI(prompt, systemPrompt, 1200);
            sesi.riwayat.push(hasil);
            sesi.pilihan.push(pilihan);

            const isEnding = sesi.chapter >= 18
            if (isEnding) sesiCerita.delete(userId);

            return msg.reply(
                `📖 *Chapter ${sesi.chapter}*\n` +
                `${'─'.repeat(30)}\n\n` +
                `${hasil}\n\n` +
                `${'─'.repeat(20)}\n` +
                (isEnding ? `_🎉 Cerita selesai! Main lagi: \`!cerita <tema>\`_` : `_Chapter ${sesi.chapter} dari ??? | \`!stopcerita\` untuk akhiri_`)
            );
        } catch (e) {
            console.error('Story Continue Error:', e.message);
            return msg.reply('❌ Gagal melanjutkan cerita. Coba lagi.');
        }
    }

    // !stopcerita
    if (command === 'stopcerita') {
        if (!sesiCerita.has(userId)) return msg.reply('❌ Tidak ada cerita aktif.');
        const sesi = sesiCerita.get(userId);
        sesiCerita.delete(userId);

        try {
            const endingPrompt = `Buat ending singkat (2 paragraf) yang memuaskan untuk cerita bertema "${sesi.tema}" yang telah berjalan ${sesi.chapter} chapter. Buat penutup yang berkesan.`;
            const ending = await tanyaAI(endingPrompt, '', 400);

            return msg.reply(
                `📖 *ENDING CERITA*\n` +
                `${'═'.repeat(30)}\n\n` +
                `${ending}\n\n` +
                `${'═'.repeat(25)}\n` +
                `🎭 *TAMAT*\n\n` +
                `📊 Stats: ${sesi.chapter} chapter dimainkan\n` +
                `_Buat cerita baru: \`!cerita <tema>\`_`
            );
        } catch (e) {
            return msg.reply(`📖 Cerita "${sesi.tema}" dihentikan di chapter ${sesi.chapter}.\n\nTERIMA KASIH SUDAH MEMBACA! 🎭\n\nCerita baru: \`!cerita <tema>\``);
        }
    }
};
