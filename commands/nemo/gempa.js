const axios = require('axios');

module.exports = async (command, args, msg, user, db, sock) => {
    if (command !== 'gempa') return;

    try {
        const response = await axios.get('https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json');
        const data = response.data.Infogempa.gempa;

        if (!data || data.length === 0) {
            return msg.reply('❌ Tidak ada data gempa yang ditemukan.');
        }

        const gempa = data[0];

        const reply = 
            `🌍 *INFO GEMPA TERBARU*\n\n` +
            `📍 *Wilayah:* ${gempa.Wilayah}\n` +
            `📅 *Tanggal:* ${gempa.Tanggal}\n` +
            `🕐 *Waktu:* ${gempa.Jam}\n` +
            `📊 *Magnitude:* ${gempa.Magnitude}\n` +
            `📐 *Kedalaman:* ${gempa.Kedalaman}\n` +
            `📍 *Koordinat:* ${gempa.Coordinates}\n` +
            `🧭 *Lintang/Bujur:* ${gempa.Lintang} / ${gempa.Bujur}\n` +
            `👀 *Dirasakan:* ${gempa.Dirasakan}\n\n` +
            `_Data: BMKG_`;

        return msg.reply(reply);
    } catch (error) {
        console.error('Error fetching gempa data:', error);
        return msg.reply(
            `❌ Gagal mengambil data gempa.\n` +
            `Pastikan koneksi internet stabil dan coba lagi.`
        );
    }
};