const axios = require('axios');

module.exports = async (command, args, msg, user, db, sock, m) => {
    if (command !== 'jadwalsholat' && command !== 'jadwal' && command !== 'sholat') return;

    const kota = args.join(' ').trim() || 'Jakarta';

    if (!args[0]) {
        return msg.reply(
            '🕋 *JADWAL SHOLAT*\n\n' +
            '*Format:*\n' +
            '!jadwalsholat <kota>\n\n' +
            '*Contoh:*\n' +
            '!jadwalsholat Jakarta\n' +
            '!jadwalsholat Surabaya\n' +
            '!jadwalsholat Makassar\n\n' +
            '*Catatan:* Gunakan nama kota dalam bahasa Indonesia atau Inggris.'
        );
    }

    try {
        const response = await axios.get('http://api.aladhan.com/v1/timingsByCity', {
            params: {
                city: kota,
                country: 'Indonesia',
                method: 20 // Kemenag Indonesia
            },
            timeout: 10000
        });

        if (response.data.code !== 200) {
            throw new Error('Kota tidak ditemukan');
        }

        const data = response.data.data;
        const timings = data.timings;
        const date = data.date.gregorian;
        const tanggal = `${date.day}/${date.month.number}/${date.year}`;

        return msg.reply(
            `🕋 *Jadwal Sholat — ${kota.toUpperCase()}*\n` +
            '─'.repeat(28) + '\n' +
            `📅 ${tanggal}\n\n` +
            `🌅 *Subuh (Fajr)*  : ${timings.Fajr}\n` +
            `🌄 *Syuruq*        : ${timings.Sunrise}\n` +
            `☀️  *Zuhur (Dhuhr)* : ${timings.Dhuhr}\n` +
            `🌤️ *Ashar (Asr)*   : ${timings.Asr}\n` +
            `🌆 *Maghrib*       : ${timings.Maghrib}\n` +
            `🌙 *Isya (Isha)*   : ${timings.Isha}\n` +
            '─'.repeat(28) + '\n' +
            '_Metode: Kemenag Indonesia_\n' +
            '_Data: aladhan.com_'
        );

    } catch (error) {
        console.error('[JadwalSholat]', error.message);
        return msg.reply(
            `❌ Gagal mengambil jadwal sholat untuk "${kota}".\n\n` +
            'Pastikan nama kota benar dan coba lagi.'
        );
    }
};