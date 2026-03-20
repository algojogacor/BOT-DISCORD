/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║         JADWAL SHOLAT — Fitur nemo                           ║
 * ║  !jadwalsholat <kota>                                        ║
 * ╚══════════════════════════════════════════════════════════════╝
 * 
 *  API: aladhan.com (gratis, no key)
 */

const axios = require('axios');

async function getJadwalSholat(kota) {
    const today = new Date();
    const dateStr = `${today.getDate()}-${today.getMonth() + 1}-${today.getFullYear()}`;
    
    try {
        const url = `http://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(kota)}&country=indonesia&method=3`;
        const res = await axios.get(url, { timeout: 10000 });
        
        if (res.data && res.data.code === 200) {
            return {
                timings: res.data.data.timings,
                date: res.data.data.date,
                meta: res.data.data.meta
            };
        }
        return null;
    } catch (e) {
        console.error('Jadwal Sholat Error:', e.message);
        return null;
    }
}

function formatWaktu(waktu) {
    return waktu || '-';
}

module.exports = async (command, args, msg, user, db) => {
    if (command !== 'jadwalsholat') return;

    const kota = args.join(' ').trim();

    if (!kota) {
        return msg.reply(
            `🕌 *JADWAL SHOLAT*\n\n` +
            `Cara pakai:\n` +
            `• \`!jadwalsholat Jakarta\`\n` +
            `• \`!jadwalsholat Surabaya\`\n\n` +
            `Contoh: \`!jadwalsholat Bandung\``
        );
    }

    await msg.reply(`🕌 _Mencari jadwal sholat untuk "${kota}"..._`);

    try {
        const data = await getJadwalSholat(kota);
        
        if (!data) {
            return msg.reply(`❌ Kota "${kota}" tidak ditemukan atau gagal mengambil data.`);
        }

        const { timings, date } = data;
        const t = timings;

        return msg.reply(
            `🕌 *JADWAL SHOLAT — ${kota.toUpperCase()}*\n` +
            `${'─'.repeat(32)}\n` +
            `📅 ${date.readable}\n\n` +
            `🌅 *Subuh*    : ${formatWaktu(t.Fajr)}\n` +
            `🌄 *Syuruq*   : ${formatWaktu(t.Sunrise)}\n` +
            `☀️  *Zuhur*    : ${formatWaktu(t.Dhuhr)}\n` +
            `🌤️ *Ashar*    : ${formatWaktu(t.Asr)}\n` +
            `🌆 *Maghrib*  : ${formatWaktu(t.Maghrib)}\n` +
            `🌙 *Isya*     : ${formatWaktu(t.Isha)}\n` +
            `${'─'.repeat(32)}\n` +
            `_Metode: Indonesian Ministry of Religious Affairs_\n` +
            `_Data: aladhan.com • ${new Date().toLocaleString('id-ID')}_`
        );
    } catch (e) {
        console.error('Jadwal Sholat Error:', e.message);
        return msg.reply('❌ Gagal mengambil jadwal sholat. Coba lagi nanti.');
    }
};
