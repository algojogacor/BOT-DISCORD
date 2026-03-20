const axios = require('axios');

module.exports = async (command, args, msg, user, db, sock) => {
    if (command !== 'jadwalsholat' && command !== 'jadwal' && command !== 'sholat') return;

    const kota = args[0];
    if (!kota) {
        return msg.reply(
            `🕋 *JADWAL SHOLAT*\n\n` +
            `*Format:*\n` +
            \`!jadwalsholat <kota>\`\n\n*Contoh:*\n` +
            \`!jadwalsholat Jakarta\`\n` +
            \`!jadwalsholat Makassar\`\n\n` +
            `*Catatan:* Gunakan nama kota dalam bahasa Inggris atau setempat yang dikenali oleh API Aladhan.`
        );
    }

    try {
        const response = await axios.get('http://api.aladhan.com/v1/timingsByCity', {
            params: {
                city: kota,
                country: '', // bisa diisi jika diperlukan, tapi biarkan kosong untuk pencarian luas
                method: 2 // Metode ISNA, umum digunakan di Indonesia
            }
        });

        if (response.data.code !== 200) {
            throw new Error('API returned non-200 code');
        }

        const data = response.data.data;
        const timings = data.timings;
        const date = data.date.gregorian; // Actually date.gregorian

        // Ambil waktu sholat yang kita butuhkan
        const fajr = timings.Fajr;
        const dhuhr = timings.Dhuhr;
        const asr = timings.Asr;
        const maghrib = timings.Maghrib;
        const isha = timings.Isha;

        // Format tanggal
        const tanggal = `${date.day}/${date.month}/${date.year}`;

        const reply = 
            `🕋 *Jadwal Sholat untuk ${data.city}, ${data.country} (${tanggal})*\n\n` +
            `🌅 *Fajr (Subuh)*: ${fajr}\n` +
            `🌞 *Dhuhr (Zuhur)*: ${dhuhr}\n` +
            `🌇 *Asr*: ${asr}\n` +
            `🌆 *Maghrib*: ${maghrib}\n` +
            `🌙 *Isha*: ${isha}\n\n` +
            `_Catatan: Waktu berdasarkan metode ISNA (method 2)._`;

        return msg.reply(reply);
    } catch (error) {
        console.error('Error fetching jadwal sholat:', error);
        return msg.reply(
            `❌ Gagal mengambil jadwal sholat untuk kota "${kota}".\n` +
            `Pastikan nama kota benar dan koneksi internet stabil.\n` +
            `Jika masalah berlanjut, coba lagi beberapa saat kemudian.`
        );
    }
};