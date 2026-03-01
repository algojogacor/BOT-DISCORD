// ╔══════════════════════════════════════════════════════════════════╗
// ║              SISTEM PAJAK INDONESIA — pajak.js                  ║
// ║   PPh | PBB | Capital Gains | Denda Keterlambatan              ║
// ╚══════════════════════════════════════════════════════════════════╝

const { saveDB } = require('../helpers/database');

// ─── HELPER ──────────────────────────────────────────────────────────
const fmt  = (n) => Math.floor(Number(n)).toLocaleString('id-ID');
const fmtP = (n) => (Number(n) * 100).toFixed(1) + '%';

// ════════════════════════════════════════════════════════════════════
// ⚙️  KONFIGURASI PAJAK
// ════════════════════════════════════════════════════════════════════
const PAJAK_CFG = {
    // Periode tagih pajak (dalam ms) — 7 hari
    PERIODE_TAGIH: 7 * 24 * 60 * 60 * 1000,

    // Denda keterlambatan per hari (2%)
    DENDA_PER_HARI: 0.02,
    DENDA_MAX:      0.24, // Max 48% (24 hari)

    // ── PPh Penghasilan (Progressive) ──────────────────────────────
    // Dihitung dari total pendapatan 7 hari terakhir
    PPH_BRACKET: [
        { min: 0,             max: 7_000_000,      rate: 0.05,  label: 'Tier 1 (5%)'  },
        { min: 7_000_000,     max: 35_000_000,     rate: 0.10,  label: 'Tier 2 (10%)' },
        { min: 35_000_000,    max: 140_000_000,    rate: 0.15,  label: 'Tier 3 (15%)' },
        { min: 140_000_000,   max: 700_000_000,    rate: 0.25,  label: 'Tier 4 (25%)' },
        { min: 700_000_000,   max: Infinity,        rate: 0.30,  label: 'Tier 5 (30%)' },
    ],

    // ── PBB (Pajak Bumi & Bangunan) ─────────────────────────────────
    // 0.5% per tahun dari nilai properti → per periode 7 hari
    PBB_RATE_TAHUNAN: 0.005,
    // Per periode 7 hari = 0.5% / 52 minggu
    get PBB_RATE_PERIODE() {
        return this.PBB_RATE_TAHUNAN / 52;
    },

    // ── Capital Gains Tax ───────────────────────────────────────────
    CAPITAL_GAINS_RATE: 0.10, // 10% dari profit investasi

    // ── Hadiah / Windfall (game reward, rob) ────────────────────────
    WINDFALL_RATE: 0.05, // 5% dari penerimaan tidak terduga
};

// ════════════════════════════════════════════════════════════════════
// 🧮  FUNGSI HITUNG PPH PROGRESIF
// ════════════════════════════════════════════════════════════════════
function hitungPPH(income) {
    let pajak = 0;
    let detail = [];
    let sisa = income;

    for (const bracket of PAJAK_CFG.PPH_BRACKET) {
        if (sisa <= 0) break;
        const kenaIncome = Math.min(sisa, bracket.max - bracket.min);
        if (kenaIncome <= 0) continue;
        const pajakBracket = Math.floor(kenaIncome * bracket.rate);
        pajak += pajakBracket;
        detail.push({ label: bracket.label, income: kenaIncome, pajak: pajakBracket });
        sisa -= kenaIncome;
    }
    return { total: pajak, detail };
}

// ════════════════════════════════════════════════════════════════════
// 🏦  FUNGSI INIT DATA PAJAK USER
// ════════════════════════════════════════════════════════════════════
function initPajak(user) {
    if (!user.pajak) {
        user.pajak = {
            // Tagihan aktif
            pph:           0,   // PPh yang harus dibayar periode ini
            pbb:           0,   // PBB yang harus dibayar periode ini
            capitalGains:  0,   // Capital Gains terhutang
            windfall:      0,   // Pajak windfall terhutang

            // Denda
            denda:         0,

            // Akumulasi income untuk dihitung PPh
            incomeAkumulasi: 0,

            // Tanggal penagihan
            lastBilled:    Date.now(),
            billDeadline:  Date.now() + PAJAK_CFG.PERIODE_TAGIH,
            hariTelat:     0,

            // Statistik lifetime
            totalDibayar:  0,
            totalDenda:    0,
        };
    }
    // Tambah field baru jika belum ada
    if (typeof user.pajak.windfall      === 'undefined') user.pajak.windfall      = 0;
    if (typeof user.pajak.incomeAkumulasi === 'undefined') user.pajak.incomeAkumulasi = 0;
    if (typeof user.pajak.hariTelat     === 'undefined') user.pajak.hariTelat     = 0;
    if (typeof user.pajak.totalDenda    === 'undefined') user.pajak.totalDenda    = 0;
}

// ════════════════════════════════════════════════════════════════════
// ⏰  FUNGSI PROSES DENDA (dipanggil tiap hari)
// ════════════════════════════════════════════════════════════════════
function prosesDenda(user, now) {
    initPajak(user);
    const p = user.pajak;

    const totalTagihan = p.pph + p.pbb + p.capitalGains + p.windfall;
    if (totalTagihan <= 0) return; // Tidak ada tagihan

    // Cek apakah sudah lewat deadline
    if (now > p.billDeadline) {
        const hariTelat = Math.floor((now - p.billDeadline) / (24 * 60 * 60 * 1000));
        if (hariTelat > p.hariTelat) {
            // Hari baru yang telat
            const hariBaruTelat = hariTelat - p.hariTelat;
            const dendaBaru = Math.floor(totalTagihan * PAJAK_CFG.DENDA_PER_HARI * hariBaruTelat);

            p.denda = Math.min(
                Math.floor(totalTagihan * PAJAK_CFG.DENDA_MAX),
                p.denda + dendaBaru
            );
            p.hariTelat = hariTelat;
            p.totalDenda += dendaBaru;
        }
    }
}

// ════════════════════════════════════════════════════════════════════
// 📅  FUNGSI GENERATE TAGIHAN BARU (setiap 7 hari)
// ════════════════════════════════════════════════════════════════════
function generateTagihan(user, db, now) {
    initPajak(user);
    const p = user.pajak;

    if (now < p.billDeadline + PAJAK_CFG.PERIODE_TAGIH) return; // Belum waktunya tagih lagi

    // Hitung PPh dari akumulasi income periode ini
    const { total: pph } = hitungPPH(p.incomeAkumulasi);

    // Hitung PBB dari kepemilikan properti
    let nilaiProperti = 0;
    if (user.business?.owned) {
        const { PROPERTIES } = require('./property'); // Ambil data properti
        for (const [key, qty] of Object.entries(user.business.owned)) {
            if (qty > 0 && PROPERTIES?.[key]) {
                nilaiProperti += PROPERTIES[key].price * qty;
            }
        }
    }
    const pbb = Math.floor(nilaiProperti * PAJAK_CFG.PBB_RATE_PERIODE);

    // Set tagihan baru
    p.pph           = pph;
    p.pbb           = pbb;
    p.denda         = 0;
    p.hariTelat     = 0;
    p.incomeAkumulasi = 0;
    p.lastBilled    = now;
    p.billDeadline  = now + PAJAK_CFG.PERIODE_TAGIH;
}

// ════════════════════════════════════════════════════════════════════
// 📊  FUNGSI TAMBAH PAJAK (dipanggil dari modul lain)
// ════════════════════════════════════════════════════════════════════

/**
 * Tambah capital gains tax (dipanggil saat jual saham/crypto profit)
 * @param {Object} user 
 * @param {number} profit - keuntungan bersih
 */
function tambahCapitalGains(user, profit) {
    if (profit <= 0) return 0;
    initPajak(user);
    const pajak = Math.floor(profit * PAJAK_CFG.CAPITAL_GAINS_RATE);
    user.pajak.capitalGains += pajak;
    return pajak;
}

/**
 * Tambah pajak windfall (dipanggil saat terima reward game/rob)
 * @param {Object} user
 * @param {number} amount - jumlah yang diterima
 */
function tambahWindfall(user, amount) {
    if (amount <= 0) return 0;
    initPajak(user);
    const pajak = Math.floor(amount * PAJAK_CFG.WINDFALL_RATE);
    user.pajak.windfall += pajak;
    return pajak;
}

/**
 * Tambah ke akumulasi income untuk PPh
 * @param {Object} user
 * @param {number} income
 */
function tambahIncome(user, income) {
    if (income <= 0) return;
    initPajak(user);
    user.pajak.incomeAkumulasi += income;
}

// ════════════════════════════════════════════════════════════════════
// 💬  MODULE COMMAND
// ════════════════════════════════════════════════════════════════════
module.exports = async (command, args, msg, user, db) => {
    const validCommands = [
        'pajak', 'tagihpajak', 'cekpajak',
        'bayarpajak', 'pajakinfo', 'riwayatpajak'
    ];
    if (!validCommands.includes(command)) return;

    const now = Date.now();
    initPajak(user);
    prosesDenda(user, now);
    saveDB(db);

    const p = user.pajak;

    // ================================================================
    // !pajak / !cekpajak — Lihat tagihan
    // ================================================================
    if (['pajak', 'cekpajak', 'tagihpajak'].includes(command)) {
        const totalTagihan = p.pph + p.pbb + p.capitalGains + p.windfall;
        const totalBayar   = totalTagihan + p.denda;

        const deadline = new Date(p.billDeadline).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
        const sisaHari = Math.max(0, Math.ceil((p.billDeadline - now) / (24 * 60 * 60 * 1000)));

        let txt = `📋 *SURAT PEMBERITAHUAN PAJAK* 📋\n`;
        txt += `👤 Wajib Pajak: ${user.name || 'User'}\n`;
        txt += `${'─'.repeat(32)}\n\n`;

        // Status
        if (totalTagihan <= 0) {
            txt += `✅ *TIDAK ADA TUNGGAKAN!*\n`;
            txt += `Kamu adalah wajib pajak teladan 🎉\n\n`;
        } else {
            txt += `🗓️ *Jatuh Tempo:* ${deadline}\n`;
            if (now > p.billDeadline) {
                txt += `⚠️ *TELAT ${p.hariTelat} HARI!*\n`;
            } else {
                txt += `⏳ *Sisa Waktu:* ${sisaHari} hari lagi\n`;
            }
            txt += `\n`;

            // Rincian tagihan
            txt += `📌 *RINCIAN TAGIHAN:*\n`;
            if (p.pph > 0) {
                const rate = hitungPPH(p.incomeAkumulasi + p.pph); // Untuk tampilan
                txt += `💼 PPh Penghasilan : Rp ${fmt(p.pph)}\n`;
            }
            if (p.pbb > 0)          txt += `🏠 PBB Properti    : Rp ${fmt(p.pbb)}\n`;
            if (p.capitalGains > 0) txt += `📈 Capital Gains   : Rp ${fmt(p.capitalGains)}\n`;
            if (p.windfall > 0)     txt += `🎁 Pajak Hadiah    : Rp ${fmt(p.windfall)}\n`;

            txt += `${'─'.repeat(32)}\n`;
            txt += `💰 *Subtotal       : Rp ${fmt(totalTagihan)}*\n`;

            if (p.denda > 0) {
                txt += `🚨 *Denda Telat     : Rp ${fmt(p.denda)}* (${p.hariTelat} hari × 2%)\n`;
                txt += `${'─'.repeat(32)}\n`;
                txt += `🔴 *TOTAL BAYAR     : Rp ${fmt(totalBayar)}*\n`;
            } else {
                txt += `🟢 *TOTAL BAYAR     : Rp ${fmt(totalBayar)}*\n`;
            }

            txt += `\n`;
        }

        // Pendapatan akumulasi periode ini
        txt += `📊 *Pendapatan Periode Ini:*\n`;
        txt += `Rp ${fmt(p.incomeAkumulasi)}\n\n`;

        // Statistik
        txt += `📈 *Statistik Pajak:*\n`;
        txt += `Total Dibayar  : Rp ${fmt(p.totalDibayar)}\n`;
        txt += `Total Denda    : Rp ${fmt(p.totalDenda)}\n\n`;

        if (totalTagihan > 0) {
            txt += `💡 Bayar: \`!bayarpajak\`\n`;
            txt += `💡 Bayar sebagian: \`!bayarpajak 1000000\`\n`;
        }

        txt += `\n_"Membayar pajak adalah kewajiban warga negara yang baik."_`;

        return msg.reply(txt);
    }

    // ================================================================
    // !pajakinfo — Info & edukasi sistem pajak
    // ================================================================
    if (command === 'pajakinfo') {
        let txt = `📚 *SISTEM PAJAK — PANDUAN LENGKAP* 📚\n\n`;

        txt += `*1️⃣ PPh PENGHASILAN (Progressive)*\n`;
        txt += `Dihitung dari total income per 7 hari:\n`;
        for (const b of PAJAK_CFG.PPH_BRACKET) {
            const minFmt = fmt(b.min);
            const maxFmt = b.max === Infinity ? '∞' : fmt(b.max);
            txt += `  • Rp ${minFmt} – ${maxFmt}: *${(b.rate * 100).toFixed(0)}%*\n`;
        }
        txt += `\n*2️⃣ PBB (Pajak Bumi & Bangunan)*\n`;
        txt += `0.5%/tahun dari nilai properti yang kamu miliki.\n`;
        txt += `Ditagih setiap 7 hari.\n`;
        txt += `\n*3️⃣ Capital Gains Tax*\n`;
        txt += `10% dari profit jual saham/crypto.\n`;
        txt += `Otomatis ditambahkan saat transaksi.\n`;
        txt += `\n*4️⃣ Pajak Hadiah/Windfall*\n`;
        txt += `5% dari reward game & hasil merampok.\n`;
        txt += `\n*5️⃣ Pajak Transfer*\n`;
        txt += `5% saat transfer ke user lain (sudah aktif).\n`;
        txt += `\n*⚠️ DENDA KETERLAMBATAN*\n`;
        txt += `+2%/hari dari total tagihan.\n`;
        txt += `Maksimal denda: 48% (setelah 24 hari).\n`;
        txt += `\n*📅 Periode Tagih: Setiap 7 hari*\n`;
        txt += `\n💡 Cek tagihan: \`!pajak\`\n`;
        txt += `💡 Bayar pajak: \`!bayarpajak\``;

        return msg.reply(txt);
    }

    // ================================================================
    // !bayarpajak — Bayar tagihan pajak
    // ================================================================
    if (command === 'bayarpajak') {
        const totalTagihan  = p.pph + p.pbb + p.capitalGains + p.windfall;
        const totalBayar    = totalTagihan + p.denda;

        if (totalTagihan <= 0) {
            return msg.reply(`✅ *TIDAK ADA TAGIHAN PAJAK!*\nKamu sudah lunas. Terima kasih telah taat pajak 🎉`);
        }

        // Tentukan jumlah yang dibayar
        let bayar;
        if (!args[0] || args[0].toLowerCase() === 'all') {
            bayar = totalBayar;
        } else {
            bayar = parseInt(args[0].replace(/[^0-9]/g, ''));
        }

        if (isNaN(bayar) || bayar <= 0) {
            return msg.reply(`❌ Nominal tidak valid.\nContoh: \`!bayarpajak\` atau \`!bayarpajak 5000000\``);
        }

        // Cek saldo (cari dari wallet + bank)
        const totalAset = (user.balance || 0) + (user.bank || 0);
        if (totalAset < bayar) {
            return msg.reply(
                `❌ *SALDO TIDAK CUKUP!*\n` +
                `Total Tagihan  : Rp ${fmt(totalBayar)}\n` +
                `Saldo Dompet   : Rp ${fmt(user.balance || 0)}\n` +
                `Saldo Bank     : Rp ${fmt(user.bank || 0)}\n` +
                `Total Aset     : Rp ${fmt(totalAset)}\n\n` +
                `_Kerja dulu bos, baru bayar pajak!_`
            );
        }

        if (bayar > totalBayar) bayar = totalBayar;

        // Kurangi dari wallet dulu, sisanya dari bank
        let sisaBayar = bayar;
        let dariWallet = 0, dariBank = 0;

        if (user.balance >= sisaBayar) {
            user.balance -= sisaBayar;
            dariWallet = sisaBayar;
            sisaBayar = 0;
        } else {
            dariWallet = user.balance;
            sisaBayar -= user.balance;
            user.balance = 0;
            user.bank -= sisaBayar;
            dariBank = sisaBayar;
            sisaBayar = 0;
        }

        // Kurangi denda dulu, lalu tagihan
        let sisaLunasi = bayar;
        const dendaDibayar = Math.min(sisaLunasi, p.denda);
        p.denda    -= dendaDibayar;
        sisaLunasi -= dendaDibayar;

        // Bayar tagihan sesuai proporsi
        const proportions = [
            { key: 'pph',          label: 'PPh' },
            { key: 'pbb',          label: 'PBB' },
            { key: 'capitalGains', label: 'Capital Gains' },
            { key: 'windfall',     label: 'Windfall' },
        ];

        let detail = '';
        for (const prop of proportions) {
            if (sisaLunasi <= 0) break;
            const lunas = Math.min(sisaLunasi, p[prop.key]);
            p[prop.key] -= lunas;
            sisaLunasi  -= lunas;
            if (lunas > 0) detail += `  ✅ ${prop.label}: Rp ${fmt(lunas)}\n`;
        }

        p.totalDibayar += bayar;
        if (p.hariTelat > 0 && (p.pph + p.pbb + p.capitalGains + p.windfall) <= 0) {
            p.hariTelat = 0;
        }

        saveDB(db);

        const sisaTagihan = p.pph + p.pbb + p.capitalGains + p.windfall + p.denda;

        let res = `✅ *PEMBAYARAN PAJAK BERHASIL!* 🎉\n\n`;
        res += `💸 Total Dibayar  : Rp ${fmt(bayar)}\n`;
        if (dariWallet > 0) res += `  └ dari Dompet : Rp ${fmt(dariWallet)}\n`;
        if (dariBank > 0)   res += `  └ dari Bank   : Rp ${fmt(dariBank)}\n`;
        if (dendaDibayar > 0) res += `  └ incl. Denda : Rp ${fmt(dendaDibayar)}\n`;
        res += `\n📌 Rincian:\n${detail}`;
        if (sisaTagihan > 0) {
            res += `\n⚠️ *Sisa Tagihan: Rp ${fmt(sisaTagihan)}*\n`;
            res += `Ketik \`!bayarpajak\` untuk lunasi semua.`;
        } else {
            res += `\n🌟 *SEMUA TAGIHAN LUNAS!*\n`;
            res += `_Terima kasih telah menjadi wajib pajak teladan!_ 🇮🇩`;
        }

        return msg.reply(res);
    }

    // ================================================================
    // !riwayatpajak — Riwayat pembayaran
    // ================================================================
    if (command === 'riwayatpajak') {
        let txt = `📜 *RIWAYAT PAJAK*\n`;
        txt += `👤 ${user.name || 'User'}\n`;
        txt += `${'─'.repeat(28)}\n\n`;
        txt += `💰 Total Pajak Dibayar   : Rp ${fmt(p.totalDibayar)}\n`;
        txt += `🚨 Total Denda Pernah Kena: Rp ${fmt(p.totalDenda)}\n`;
        txt += `📊 Income Akumulasi Saat Ini: Rp ${fmt(p.incomeAkumulasi)}\n\n`;

        const { total: estimasiPPH } = hitungPPH(p.incomeAkumulasi);
        txt += `🔮 *Estimasi PPh Periode Ini:*\n`;
        txt += `Income: Rp ${fmt(p.incomeAkumulasi)}\n`;
        txt += `Estimasi Pajak: Rp ${fmt(estimasiPPH)}\n\n`;

        // Breakdown bracket
        const { detail } = hitungPPH(p.incomeAkumulasi);
        if (detail.length > 0) {
            txt += `📐 *Rincian Bracket PPh:*\n`;
            for (const d of detail) {
                txt += `  ${d.label}: Rp ${fmt(d.pajak)}\n`;
            }
        }

        return msg.reply(txt);
    }
};

// ════════════════════════════════════════════════════════════════════
// 📦  EXPORTS HELPER (untuk dipakai modul lain)
// ════════════════════════════════════════════════════════════════════
module.exports.initPajak        = initPajak;
module.exports.prosesDenda      = prosesDenda;
module.exports.generateTagihan  = generateTagihan;
module.exports.tambahCapitalGains = tambahCapitalGains;
module.exports.tambahWindfall   = tambahWindfall;
module.exports.tambahIncome     = tambahIncome;
module.exports.PAJAK_CFG        = PAJAK_CFG;