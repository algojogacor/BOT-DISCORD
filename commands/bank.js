const { saveDB } = require('../helpers/database');
const { tambahWindfall } = require('./pajak');
const { updateLife, KONFIG_LIFE } = require('./life');

const fmt = (n) => Math.floor(Number(n)).toLocaleString('id-ID');

// =================================================================
// KONFIGURASI EKONOMI
// =================================================================
const KONFIG_ECO = {
    BANK_COOLDOWN:    10 * 60 * 1000,
    LIMIT_HARIAN:     10_000_000_000,
    TRANSFER_TAX:     0.05,
    ROB_COOLDOWN:     30 * 60 * 1000,
    ROB_SUCCESS_RATE: 0.4,
    ROB_STEAL_PCT:    0.2,
    ROB_FINE_PCT:     0.10,
    ROB_HP_PENALTY:   20,
    ROB_ENERGY_COST:  10,
    ROB_MIN_TARGET:   1_000_000,
};

// =================================================================
// KONFIGURASI PINJAMAN (Mirip KTA Bank Sungguhan)
// =================================================================
const KONFIG_PINJAM = {
    // Maksimal pinjaman = % dari total aset bersih
    MAX_RASIO_ASET:   0.5,    // Boleh pinjam max 50% dari total aset

    // Plafon tertinggi yang bisa dipinjam (hardcap)
    PLAFON_MAX:       50_000_000_000,  // 50 Miliar

    // Plafon minimum (agar tidak pinjam recehan)
    PLAFON_MIN:       500_000,         // 500 Ribu

    // Bunga berdasarkan tenor
    TENOR: {
        7:  { bunga: 0.05,  label: "7 hari"   },   // 5%
        14: { bunga: 0.08,  label: "14 hari"  },   // 8%
        30: { bunga: 0.12,  label: "30 hari"  },   // 12%
        60: { bunga: 0.18,  label: "60 hari"  },   // 18%
    },

    // Denda keterlambatan per hari setelah jatuh tempo
    DENDA_TELAT:      0.02,   // 2% dari sisa pokok per hari

    // Maksimal berapa pinjaman aktif bersamaan
    MAX_PINJAMAN:     3,
};

// =================================================================
// HELPER: Hitung Total Aset User (untuk menentukan plafon)
// =================================================================
const hitungTotalAset = (user, db) => {
    let total = (user.balance || 0) + (user.bank || 0);

    // Nilai properti
    try {
        const { PROPERTIES } = require('./property');
        if (user.business?.owned) {
            for (let [key, qty] of Object.entries(user.business.owned)) {
                if (qty > 0 && PROPERTIES[key]) {
                    total += PROPERTIES[key].price * qty * 0.7; // Nilai likuidasi 70%
                }
            }
        }
    } catch(e) {}

    // Nilai crypto
    if (user.crypto && db.market?.prices) {
        for (let [k, v] of Object.entries(user.crypto)) {
            if (v > 0 && db.market.prices[k]) {
                total += v * db.market.prices[k].price * 0.8; // Diskon 20% untuk likuidasi
            }
        }
    }

    // Nilai saham
    if (user.portfolio && db.stockMarket?.prices) {
        for (let [ticker, data] of Object.entries(user.portfolio)) {
            if (data.qty > 0 && db.stockMarket.prices[ticker]) {
                total += data.qty * db.stockMarket.prices[ticker].price * 0.8;
            }
        }
    }

    return Math.floor(total);
};

// =================================================================
// MODULE EXPORT
// =================================================================
module.exports = async (command, args, msg, user, db, sock) => {
    const now = Date.now();

    // Init Data User
    if (typeof user.bank        === 'undefined' || isNaN(user.bank))      user.bank      = 0;
    if (typeof user.balance     === 'undefined' || isNaN(user.balance))   user.balance   = 0;
    if (typeof user.debt        === 'undefined' || isNaN(user.debt))      user.debt      = 0; // KHUSUS margin crypto
    if (typeof user.dailyUsage  === 'undefined' || isNaN(user.dailyUsage))user.dailyUsage= 0;
    if (typeof user.dailyIncome === 'undefined') user.dailyIncome = 0;

    // ⚠️ PENTING: user.pinjaman = array pinjaman bank (TERPISAH dari user.debt crypto)
    if (!Array.isArray(user.pinjaman)) user.pinjaman = [];

    if (!db.settings) db.settings = { lifeSystem: true };
    updateLife(user, db, now);

    // Reset limit harian
    const todayStr = new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' });
    if (user.lastLimitDate !== todayStr) {
        user.dailyUsage  = 0;
        user.dailyIncome = 0;
        user.lastLimitDate = todayStr;
    }

    // Proses denda keterlambatan pinjaman yang jatuh tempo
    const nowDay = Math.floor(now / (1000 * 60 * 60 * 24));
    for (let p of user.pinjaman) {
        if (!p.lunas && now > p.jatuhTempo) {
            const hariTelat = Math.floor((now - p.jatuhTempo) / (1000 * 60 * 60 * 24));
            if (hariTelat > p.haриTelatTerakhir) {
                const dendaHariIni = Math.floor(p.sisaPokok * KONFIG_PINJAM.DENDA_TELAT);
                p.totalDenda       = (p.totalDenda || 0) + dendaHariIni;
                p.hariTelatTerakhir = hariTelat;
            }
        }
    }

    saveDB(db);

    // Guard: user mati
    if (user.isDead) {
        return msg.reply(
            `💀 *KAMU PINGSAN/MATI!*\n\n` +
            `Tidak bisa bertransaksi.\n` +
            `Ketik \`!revive\` untuk ke RS (Biaya 💰${fmt(KONFIG_LIFE.BIAYA_RS)}).`
        );
    }

    // =================================================================
    // !bank / !atm / !dompet
    // =================================================================
    if (['bank', 'atm', 'dompet'].includes(command)) {
        const sisaLimit = KONFIG_ECO.LIMIT_HARIAN - user.dailyUsage;

        // Cek pinjaman aktif
        const pinjamanAktif = user.pinjaman.filter(p => !p.lunas);
        let pinjamanInfo = '';
        if (pinjamanAktif.length > 0) {
            pinjamanInfo = `\n📋 *Pinjaman Aktif: ${pinjamanAktif.length}*\n`;
            for (let p of pinjamanAktif) {
                const telat = now > p.jatuhTempo;
                const sisaHari = Math.ceil((p.jatuhTempo - now) / (1000 * 60 * 60 * 24));
                const status = telat
                    ? `⚠️ TELAT ${Math.abs(sisaHari)} hari`
                    : `${sisaHari} hari lagi`;
                pinjamanInfo += `   #${p.id} Rp ${fmt(p.sisaPokok + (p.totalDenda||0))} (${status})\n`;
            }
        }

        let txt =
            `🏦 *BANK ARYA* 🏦\n\n` +
            `👤 Nasabah : @${(msg.author||'').split('@')[0]}\n` +
            `💳 Saldo Bank : Rp ${fmt(user.bank)}\n` +
            `👛 Dompet     : Rp ${fmt(user.balance)}\n` +
            `💰 Total Aset : Rp ${fmt(hitungTotalAset(user, db))}\n` +
            pinjamanInfo +
            `\n📊 *Limit Transfer Harian:*\n` +
            `Terpakai: Rp ${fmt(user.dailyUsage)} / ${fmt(KONFIG_ECO.LIMIT_HARIAN)}\n` +
            `Sisa    : Rp ${fmt(sisaLimit)}\n` +
            `\n❤️ ${Math.floor(user.hp)}% | 🍗 ${Math.floor(user.hunger)}% | ⚡ ${Math.floor(user.energy)}%`;

        return msg.reply(txt, null, { mentions: [msg.author] });
    }

    // =================================================================
    // !depo / !deposit
    // =================================================================
    if (command === 'depo' || command === 'deposit') {
        const lastBank = user.lastBank || 0;
        if (now - lastBank < KONFIG_ECO.BANK_COOLDOWN) {
            const sisa = Math.ceil((KONFIG_ECO.BANK_COOLDOWN - (now - lastBank)) / 60000);
            return msg.reply(`⏳ Tunggu *${sisa} menit* lagi.`);
        }
        if (!args[0]) return msg.reply("❌ Contoh: `!depo 1000000` atau `!depo all`");

        let amount = args[0].toLowerCase() === 'all'
            ? Math.floor(user.balance)
            : parseInt(args[0].replace(/[^0-9]/g, ''));

        if (isNaN(amount) || amount <= 0) return msg.reply("❌ Nominal tidak valid.");
        if (user.balance < amount)        return msg.reply("❌ Saldo dompet kurang!");

        user.balance -= amount;
        user.bank    += amount;
        user.lastBank = now;
        saveDB(db);
        return msg.reply(`✅ *DEPOSIT SUKSES*\n💳 Setor Rp ${fmt(amount)}\nSaldo Bank: Rp ${fmt(user.bank)}`);
    }

    // =================================================================
    // !tarik / !withdraw
    // =================================================================
    if (command === 'tarik' || command === 'withdraw') {
        const lastBank = user.lastBank || 0;
        if (now - lastBank < KONFIG_ECO.BANK_COOLDOWN) {
            const sisa = Math.ceil((KONFIG_ECO.BANK_COOLDOWN - (now - lastBank)) / 60000);
            return msg.reply(`⏳ Tunggu *${sisa} menit* lagi.`);
        }
        if (!args[0]) return msg.reply("❌ Contoh: `!tarik 1000000` atau `!tarik all`");

        let amount = args[0].toLowerCase() === 'all'
            ? Math.floor(user.bank)
            : parseInt(args[0].replace(/[^0-9]/g, ''));

        if (isNaN(amount) || amount <= 0) return msg.reply("❌ Nominal tidak valid.");
        if (user.bank < amount)           return msg.reply("❌ Saldo Bank kurang!");

        user.bank    -= amount;
        user.balance += amount;
        user.lastBank = now;
        saveDB(db);
        return msg.reply(`✅ *TARIK SUKSES*\n💵 Tarik Rp ${fmt(amount)}\nDompet: Rp ${fmt(user.balance)}`);
    }

    // =================================================================
    // !transfer / !tf
    // =================================================================
    if (command === 'transfer' || command === 'tf') {
        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || msg.mentionedIds || [];
        const targetId = mentions[0];

        if (!targetId || !args[1]) return msg.reply("❌ Format: `!transfer @user 1000000`");
        if (targetId === msg.author) return msg.reply("❌ Tidak bisa transfer ke diri sendiri.");

        let amount = parseInt(args[1].replace(/[^0-9]/g, ''));
        if (isNaN(amount) || amount <= 0) return msg.reply("❌ Nominal tidak valid.");

        if ((user.dailyUsage + amount) > KONFIG_ECO.LIMIT_HARIAN) {
            const sisa = KONFIG_ECO.LIMIT_HARIAN - user.dailyUsage;
            return msg.reply(`❌ *LIMIT HABIS!*\nSisa limit: Rp ${fmt(sisa)}`);
        }

        const tax   = Math.floor(amount * KONFIG_ECO.TRANSFER_TAX);
        const total = amount + tax;
        if (user.balance < total)
            return msg.reply(`❌ Kurang! Butuh Rp ${fmt(total)} (termasuk pajak 5%).`);

        if (!db.users[targetId]) db.users[targetId] = { balance: 0, bank: 0, debt: 0, xp: 0, level: 1 };

        user.balance                -= total;
        user.dailyUsage             += amount;
        db.users[targetId].balance   = (db.users[targetId].balance || 0) + amount;
        saveDB(db);

        return msg.reply(
            `✅ *TRANSFER SUKSES*\n💰 Kirim: Rp ${fmt(amount)}\n💸 Pajak: Rp ${fmt(tax)} (5%)\n` +
            `📉 Sisa Limit: Rp ${fmt(KONFIG_ECO.LIMIT_HARIAN - user.dailyUsage)}`,
            null, { mentions: [targetId] }
        );
    }

    // =================================================================
    // !pinjam — Info Plafon & Tenor
    // =================================================================
    if (command === 'pinjam' || command === 'loan') {
        // Jika tidak ada argumen → tampilkan info plafon
        if (!args[0]) {
            const totalAset = hitungTotalAset(user, db);
            const plafon    = Math.min(
                Math.floor(totalAset * KONFIG_PINJAM.MAX_RASIO_ASET),
                KONFIG_PINJAM.PLAFON_MAX
            );
            const aktif     = user.pinjaman.filter(p => !p.lunas);
            const sisaSlot  = KONFIG_PINJAM.MAX_PINJAMAN - aktif.length;

            let txt = `🏦 *INFORMASI PINJAMAN KTA BANK ARYA*\n\n`;
            txt += `💰 Total Aset Kamu : Rp ${fmt(totalAset)}\n`;
            txt += `📊 Plafon Maksimal : Rp ${fmt(plafon)}\n`;
            txt += `   _(50% dari total aset, maks Rp ${fmt(KONFIG_PINJAM.PLAFON_MAX)})_\n`;
            txt += `📋 Pinjaman Aktif  : ${aktif.length}/${KONFIG_PINJAM.MAX_PINJAMAN}\n\n`;
            txt += `📅 *PILIHAN TENOR & BUNGA:*\n`;
            for (let [hari, t] of Object.entries(KONFIG_PINJAM.TENOR)) {
                const contoh = Math.floor(plafon * t.bunga);
                txt += `▪️ *${t.label}* — Bunga ${t.bunga * 100}%\n`;
                txt += `   Contoh: Pinjam Rp ${fmt(plafon)} → Bunga Rp ${fmt(contoh)}\n`;
            }
            txt += `\n💡 Cara pinjam:\n`;
            txt += `\`!pinjam <nominal> <tenor>\`\n`;
            txt += `Contoh: \`!pinjam 10000000 30\`\n\n`;
            txt += `💡 Cara bayar: \`!bayar <id> <nominal>\`\n`;
            txt += `💡 Cek tagihan: \`!tagihan\``;
            return msg.reply(txt);
        }

        // Proses pengajuan pinjaman
        const nominalRaw = args[0].replace(/[^0-9]/g, '');
        const tenorInput = parseInt(args[1]);
        const nominal    = parseInt(nominalRaw);

        if (isNaN(nominal) || nominal <= 0)
            return msg.reply("❌ Nominal tidak valid.\nContoh: `!pinjam 10000000 30`");

        if (!KONFIG_PINJAM.TENOR[tenorInput])
            return msg.reply(`❌ Tenor tidak valid.\nPilihan: ${Object.keys(KONFIG_PINJAM.TENOR).join(', ')} (hari)`);

        if (nominal < KONFIG_PINJAM.PLAFON_MIN)
            return msg.reply(`❌ Minimal pinjaman Rp ${fmt(KONFIG_PINJAM.PLAFON_MIN)}.`);

        const totalAset = hitungTotalAset(user, db);
        const plafonMax = Math.min(
            Math.floor(totalAset * KONFIG_PINJAM.MAX_RASIO_ASET),
            KONFIG_PINJAM.PLAFON_MAX
        );

        if (plafonMax < KONFIG_PINJAM.PLAFON_MIN)
            return msg.reply(
                `❌ *Aset kamu terlalu kecil untuk mengajukan pinjaman.*\n` +
                `Total aset: Rp ${fmt(totalAset)}\n` +
                `Minimal aset: Rp ${fmt(KONFIG_PINJAM.PLAFON_MIN * 2)}`
            );

        if (nominal > plafonMax)
            return msg.reply(
                `❌ *Melebihi plafon!*\n` +
                `Plafon kamu: Rp ${fmt(plafonMax)}\n` +
                `_(50% dari total aset Rp ${fmt(totalAset)})_`
            );

        const aktif = user.pinjaman.filter(p => !p.lunas);
        if (aktif.length >= KONFIG_PINJAM.MAX_PINJAMAN)
            return msg.reply(
                `❌ *Sudah ${KONFIG_PINJAM.MAX_PINJAMAN} pinjaman aktif!*\n` +
                `Lunasi dulu sebelum mengajukan yang baru.\n` +
                `Cek tagihan: \`!tagihan\``
            );

        // Cek pinjaman telat yang belum lunas
        const adaTelat = aktif.some(p => now > p.jatuhTempo);
        if (adaTelat)
            return msg.reply(
                `❌ *Ada pinjaman yang sudah JATUH TEMPO dan belum lunas!*\n` +
                `Bayar dulu sebelum mengajukan pinjaman baru.\n` +
                `Cek: \`!tagihan\``
            );

        const tenor      = KONFIG_PINJAM.TENOR[tenorInput];
        const bunga      = Math.floor(nominal * tenor.bunga);
        const totalBayar = nominal + bunga;
        const jatuhTempo = now + (tenorInput * 24 * 60 * 60 * 1000);

        // Buat ID pinjaman unik
        const idPinjaman = `P${Date.now().toString().slice(-6)}`;

        const pinjBaru = {
            id:               idPinjaman,
            nominal:          nominal,
            bunga:            bunga,
            totalBayar:       totalBayar,
            sisaPokok:        totalBayar,
            tenor:            tenorInput,
            tenorLabel:       tenor.label,
            jatuhTempo:       jatuhTempo,
            totalDenda:       0,
            hariTelatTerakhir: 0,
            lunas:            false,
            createdAt:        now,
        };

        user.pinjaman.push(pinjBaru);
        user.balance += nominal;
        saveDB(db);

        return msg.reply(
            `✅ *PINJAMAN DISETUJUI!* 🎉\n\n` +
            `🆔 ID Pinjaman  : #${idPinjaman}\n` +
            `💰 Cair ke Dompet: Rp ${fmt(nominal)}\n` +
            `📅 Tenor         : ${tenor.label}\n` +
            `💸 Bunga (${tenor.bunga * 100}%)  : Rp ${fmt(bunga)}\n` +
            `📊 Total Bayar   : Rp ${fmt(totalBayar)}\n` +
            `⏰ Jatuh Tempo   : ${new Date(jatuhTempo).toLocaleDateString('id-ID')}\n\n` +
            `⚠️ Keterlambatan dikenakan denda 2%/hari dari sisa pokok.\n` +
            `💡 Bayar: \`!bayar ${idPinjaman} <nominal>\` atau \`!bayar ${idPinjaman} all\``
        );
    }

    // =================================================================
    // !tagihan — Lihat semua tagihan pinjaman
    // =================================================================
    if (command === 'tagihan') {
        const semuaPinjaman = user.pinjaman;
        if (semuaPinjaman.length === 0)
            return msg.reply("✅ Kamu tidak punya pinjaman apapun.");

        const aktif  = semuaPinjaman.filter(p => !p.lunas);
        const lunas  = semuaPinjaman.filter(p => p.lunas);

        let txt = `📋 *TAGIHAN PINJAMAN* 📋\n\n`;

        if (aktif.length > 0) {
            txt += `*🔴 AKTIF (${aktif.length}):*\n`;
            for (let p of aktif) {
                const telat     = now > p.jatuhTempo;
                const sisaHari  = Math.ceil((p.jatuhTempo - now) / (1000 * 60 * 60 * 24));
                const totalTagih = p.sisaPokok + (p.totalDenda || 0);

                txt += `${'─'.repeat(28)}\n`;
                txt += `🆔 *#${p.id}*\n`;
                txt += `   Pokok   : Rp ${fmt(p.sisaPokok)}\n`;
                if (p.totalDenda > 0)
                    txt += `   Denda   : Rp ${fmt(p.totalDenda)} ⚠️\n`;
                txt += `   *Total  : Rp ${fmt(totalTagih)}*\n`;
                txt += `   Tenor   : ${p.tenorLabel}\n`;
                txt += `   Tempo   : ${new Date(p.jatuhTempo).toLocaleDateString('id-ID')}\n`;
                txt += `   Status  : ${telat ? `⚠️ TELAT ${Math.abs(sisaHari)} hari` : `✅ ${sisaHari} hari lagi`}\n`;
                txt += `   Bayar   : \`!bayar ${p.id} all\`\n`;
            }
        }

        if (lunas.length > 0) {
            txt += `\n*✅ LUNAS (${lunas.length}):*\n`;
            for (let p of lunas.slice(-3)) { // Tampilkan 3 terakhir
                txt += `   #${p.id} — Rp ${fmt(p.nominal)} (${p.tenorLabel})\n`;
            }
        }

        const totalTagihanAktif = aktif.reduce((s, p) => s + p.sisaPokok + (p.totalDenda||0), 0);
        if (aktif.length > 0)
            txt += `${'─'.repeat(28)}\n💰 *Total Tagihan: Rp ${fmt(totalTagihanAktif)}*`;

        return msg.reply(txt);
    }

    // =================================================================
    // !bayar — Bayar pinjaman berdasarkan ID
    // =================================================================
    if (command === 'bayar' || command === 'pay') {
        // Format: !bayar <ID> <nominal/all>
        if (!args[0])
            return msg.reply("❌ Format: `!bayar <ID> <nominal>` atau `!bayar <ID> all`\nCek ID di `!tagihan`");

        const idTarget  = args[0].toUpperCase();
        const pinjaman  = user.pinjaman.find(p => p.id === idTarget && !p.lunas);

        if (!pinjaman)
            return msg.reply(`❌ Pinjaman *#${idTarget}* tidak ditemukan atau sudah lunas.\nCek: \`!tagihan\``);

        const totalTagih = pinjaman.sisaPokok + (pinjaman.totalDenda || 0);

        let amount = args[1]?.toLowerCase() === 'all'
            ? totalTagih
            : parseInt((args[1] || '').replace(/[^0-9]/g, ''));

        if (isNaN(amount) || amount <= 0)
            return msg.reply(
                `❌ Nominal tidak valid.\n` +
                `Total tagihan #${idTarget}: Rp ${fmt(totalTagih)}\n` +
                `Contoh: \`!bayar ${idTarget} all\``
            );

        // Gabungkan saldo wallet + bank
        const totalSaldo = (user.balance || 0) + (user.bank || 0);
        if (totalSaldo < amount)
            return msg.reply(
                `❌ Saldo gabungan tidak cukup!\n` +
                `Dompet: Rp ${fmt(user.balance)}\n` +
                `Bank  : Rp ${fmt(user.bank)}\n` +
                `Total : Rp ${fmt(totalSaldo)}\n` +
                `Tagihan: Rp ${fmt(amount)}`
            );

        if (amount > totalTagih) amount = totalTagih;

        // Potong dari dompet dulu, sisanya dari bank
        let potongWallet = Math.min(amount, user.balance);
        let potongBank   = amount - potongWallet;

        user.balance -= potongWallet;
        user.bank    -= potongBank;

        // Kurangi denda dulu, sisanya pokok
        const bayarDenda = Math.min(amount, pinjaman.totalDenda || 0);
        const bayarPokok = amount - bayarDenda;

        pinjaman.totalDenda  = Math.max(0, (pinjaman.totalDenda || 0) - bayarDenda);
        pinjaman.sisaPokok   = Math.max(0, pinjaman.sisaPokok - bayarPokok);

        const sisaTagihan = pinjaman.sisaPokok + pinjaman.totalDenda;

        if (sisaTagihan <= 0) {
            pinjaman.lunas   = true;
            pinjaman.lunasPadа = now;
        }

        saveDB(db);

        return msg.reply(
            `💸 *PEMBAYARAN BERHASIL*\n\n` +
            `🆔 ID Pinjaman : #${idTarget}\n` +
            `💰 Dibayar     : Rp ${fmt(amount)}\n` +
            (bayarDenda > 0 ? `   └ Denda: Rp ${fmt(bayarDenda)}\n` : '') +
            `   └ Pokok: Rp ${fmt(bayarPokok)}\n` +
            (pinjaman.lunas
                ? `\n🎉 *PINJAMAN LUNAS!* Selamat bebas utang! ✅`
                : `\n📊 Sisa Tagihan: Rp ${fmt(sisaTagihan)}\n💡 Bayar lagi: \`!bayar ${idTarget} all\``)
        );
    }

    // =================================================================
    // !top / !leaderboard
    // =================================================================
    if (['top', 'leaderboard', 'dailyrank'].includes(command)) {
        const chatId = msg.from || msg.key.remoteJid;
        if (!chatId.endsWith('@g.us'))
            return msg.reply("❌ Fitur ini hanya untuk Grup!");

        let groupMetadata;
        try { groupMetadata = await sock.groupMetadata(chatId); }
        catch (e) { return msg.reply("⚠️ Gagal mengambil data grup."); }

        const memberIds = groupMetadata.participants.map(p => p.id);
        const getJobIcon = (job = '') => {
            const j = job.toLowerCase();
            if (j.includes('petani')) return '🌾';
            if (j.includes('polisi')) return '👮';
            if (j.includes('dokter')) return '👨‍⚕️';
            if (j.includes('maling')) return '🥷';
            if (j.includes('tambang') || j.includes('miner')) return '⛏️';
            return '💼';
        };

        const sorted = Object.entries(db.users)
            .filter(([id]) => memberIds.includes(id))
            .map(([id, data]) => ({ id, name: data.name || id.split('@')[0], job: data.job || 'Pengangguran', dailyIncome: data.dailyIncome || 0 }))
            .filter(u => u.dailyIncome > 0)
            .sort((a, b) => b.dailyIncome - a.dailyIncome)
            .slice(0, 10);

        const medals = ['🥇', '🥈', '🥉'];
        let txt = `🏆 *TOP PENDAPATAN HARI INI* 🏆\n(Reset tiap 00:00 WIB)\n${'―'.repeat(28)}\n\n`;

        if (!sorted.length) {
            txt += '💤 Belum ada yang berpenghasilan hari ini.';
        } else {
            sorted.forEach((u, i) => {
                txt += `${medals[i] || `${i+1}.`} @${u.name}\n`;
                txt += `   └ ${getJobIcon(u.job)} ${u.job} | 💸 +Rp ${fmt(u.dailyIncome)}\n`;
            });
        }

        const myId     = msg.author || msg.key.participant;
        const myRank   = sorted.findIndex(x => x.id === myId);
        txt += `\n${'―'.repeat(28)}\n`;
        txt += `👤 Posisi Kamu: #${myRank >= 0 ? myRank + 1 : 'Belum masuk'}\n`;
        txt += `💰 Cuan Hari Ini: Rp ${fmt(user.dailyIncome || 0)}`;
        return msg.reply(txt);
    }

    // =================================================================
    // !rob / !maling
    // =================================================================
    if (command === 'rob' || command === 'maling') {
        if (user.energy < 10)
            return msg.reply("⚠️ *TERLALU LELAH*\nEnergimu kurang dari 10%. Tidur dulu (`!tidur`)!");

        const lastRob = user.lastRob || 0;
        if (now - lastRob < KONFIG_ECO.ROB_COOLDOWN) {
            const sisa = Math.ceil((KONFIG_ECO.ROB_COOLDOWN - (now - lastRob)) / 60000);
            return msg.reply(`👮 Polisi lagi patroli! Tunggu *${sisa} menit* lagi.`);
        }

        const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || msg.mentionedIds || [];
        const targetId = mentions[0];

        if (!targetId || targetId === msg.author)
            return msg.reply("❌ Tag korban yang valid!");

        const targetUser = db.users[targetId];
        if (!targetUser) return msg.reply("❌ Target belum terdaftar.");

        // Cek target punya shield pengacara
        if (targetUser.job === 'polisi')
            return msg.reply("❌ Target adalah *Polisi*! Kamu tidak berani merampoknya.");

        const targetWallet = Math.floor(targetUser.balance || 0);
        if (targetWallet < KONFIG_ECO.ROB_MIN_TARGET)
            return msg.reply(`❌ Target terlalu miskin (Saldo < Rp ${fmt(KONFIG_ECO.ROB_MIN_TARGET)}).`);

        user.energy  -= KONFIG_ECO.ROB_ENERGY_COST;
        user.lastRob  = now;

        if (Math.random() < KONFIG_ECO.ROB_SUCCESS_RATE) {
            // BERHASIL
            const stolen = Math.floor(targetWallet * KONFIG_ECO.ROB_STEAL_PCT);
            targetUser.balance  -= stolen;
            user.balance        += stolen;
            user.dailyIncome     = (user.dailyIncome || 0) + stolen;
            saveDB(db);

            return msg.reply(
    `🥷 *SUKSES ROB!*\n` +
    `💰 Dapat Rp ${fmt(stolen)} dari @${targetId.split('@')[0]}\n` +
    `⚡ Energi -${KONFIG_ECO.ROB_ENERGY_COST}`,
    null, { mentions: [targetId] }
);
        } else {
            // GAGAL
            // Cek apakah punya shield pengacara
            let fine = Math.floor(user.balance * KONFIG_ECO.ROB_FINE_PCT);
            if (user.pengacaraShield && now < user.pengacaraShield) {
                user.pengacaraShield = 0;
                fine = 0;
                saveDB(db);
                return msg.reply(
                    `👮 *TERTANGKAP!* Tapi pengacaramu berhasil membebaskanmu!\n` +
                    `🛡️ *Denda dibatalkan oleh Pengacara!*\n` +
                    `🤕 HP -${KONFIG_ECO.ROB_HP_PENALTY}\n` +
                    `⚡ Energi -${KONFIG_ECO.ROB_ENERGY_COST}`
                );
            }

            user.balance -= fine;
            user.hp      -= KONFIG_ECO.ROB_HP_PENALTY;
            if (user.balance < 0) user.balance = 0;
            saveDB(db);

            return msg.reply(
                `👮 *TERTANGKAP!*\n` +
                `💸 Denda: Rp ${fmt(fine)}\n` +
                `🤕 HP -${KONFIG_ECO.ROB_HP_PENALTY}\n` +
                `⚡ Energi -${KONFIG_ECO.ROB_ENERGY_COST}`
            );
        }
    }
};