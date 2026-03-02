const axios = require('axios'); 
const { saveDB } = require('../helpers/database');
const { tambahCapitalGains } = require('./pajak'); 

// HELPER FORMAT ANGKA
const fmt = (num) => {
    if (num < 100) return Number(num).toFixed(2); 
    return Math.floor(Number(num)).toLocaleString('id-ID');
};

// DAFTAR KOIN (Ticker: CoinGecko_ID)
const COIN_IDS = {
    btc: 'bitcoin',
    eth: 'ethereum',
    sol: 'solana',
    bnb: 'binancecoin',
    doge: 'dogecoin',
    pepe: 'pepe',
    shib: 'shiba-inu',
    xrp: 'ripple',
    ada: 'cardano',
    trx: 'tron'
};

module.exports = async (command, args, msg, user, db) => {
    // Init User Database
    if (typeof user.balance === 'undefined') user.balance = 0;
    if (typeof user.crypto === 'undefined') user.crypto = {};
    if (typeof user.debt === 'undefined') user.debt = 0;

    // Init Market Database
    if (!db.market) db.market = { prices: {}, lastUpdate: 0 };
    
    const market = db.market;
    const now = Date.now();
    const CACHE_TIME = 60 * 1000; // Update Tiap 1 Menit

    // ============================================================
    // 📡 FETCH REAL DATA & LIQUIDATION ENGINE
    // ============================================================
    if (now - market.lastUpdate > CACHE_TIME) {
        try {
            // 1. Ambil Data Real-Time
            const ids = Object.values(COIN_IDS).join(',');
            const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=idr&include_24hr_change=true`;
            
            const response = await axios.get(url);
            const data = response.data;

            // 2. Simpan ke Database Bot
            for (let [ticker, id] of Object.entries(COIN_IDS)) {
                if (data[id]) {
                    market.prices[ticker] = {
                        price: data[id].idr,
                        change: data[id].idr_24h_change || 0
                    };
                }
            }
            
            market.lastUpdate = now;

            // 3. CEK LIKUIDASI MARGIN
            // Kalau harga asli anjlok, user yang nge-margin di bot bakal bangkrut
            Object.keys(db.users).forEach(userId => {
                let u = db.users[userId];
                if (u.debt > 0) {
                    let totalAssetValue = 0;
                    
                    // Hitung nilai aset crypto dia berdasarkan harga REAL saat ini
                    if (u.crypto) {
                        for (let [k, v] of Object.entries(u.crypto)) {
                            if (market.prices[k]) {
                                totalAssetValue += v * market.prices[k].price;
                            }
                        }
                    }

                    const totalCollateral = totalAssetValue + (u.balance || 0);
                    
                    // ATURAN MARGIN CALL:
                    // Jika Hutang > 85% dari Total Kekayaan (Aset + Tunai), maka LIKUIDASI.
                    if (totalCollateral === 0 || u.debt > (totalCollateral * 0.85)) {
                        console.log(`💀 LIQUIDATION: User ${u.name || userId} bangkrut karena harga pasar turun.`);
                        u.crypto = {}; // Sita semua koin
                        u.balance = 0; // Sita semua uang
                        u.debt = 0;    // Hutang dianggap lunas (tapi miskin)
                    }
                }
            });

            saveDB(db);
            // console.log("✅ Market Data Updated & Margin Checked");

        } catch (error) {
            console.error("❌ Gagal update crypto:", error.message);
            // Jika error, bot akan menggunakan harga terakhir yang tersimpan di DB
        }
    }

    // ============================================================
    // COMMANDS
    // ============================================================

    // 1. CEK MARKET (UI PERUBAHAN HARGA)
    if (command === 'market' || command === 'crypto') {
        let txt = `📡 *REAL-TIME CRYPTO MARKET*\n`;
        txt += `_Powered by CoinGecko API_\n`;
        txt += `--------------------------\n`;

        let naik = 0; let turun = 0;

        for (let ticker in COIN_IDS) {
            const data = market.prices[ticker];
            if (data) {
                const isGreen = data.change >= 0;
                const icon = isGreen ? '🟢' : '🔴';
                const sign = isGreen ? '+' : '';
                
                txt += `${icon} *${ticker.toUpperCase()}*: Rp ${fmt(data.price)} (${sign}${data.change.toFixed(2)}%)\n`;
                
                if(isGreen) naik++; else turun++;
            }
        }
        
        txt += `--------------------------\n`;
        txt += `📊 Status: ${naik} Naik, ${turun} Turun\n`;
        txt += `💰 Saldo: Rp ${fmt(user.balance)}`;
        if (user.debt > 0) txt += `\n⚠️ Hutang Margin: Rp ${fmt(user.debt)}`;
        
        return msg.reply(txt);
    }

    // 2. BELI (REAL PRICE)
if (command === 'buycrypto') {
    const koin = args[0]?.toLowerCase();
    const nominal = parseInt(args[1]);

    if (!COIN_IDS[koin]) return msg.reply(`❌ Koin tidak ada. List: ${Object.keys(COIN_IDS).join(', ')}`);
    if (!market.prices[koin]) return msg.reply("❌ Data harga sedang loading... coba lagi.");
    if (isNaN(nominal) || nominal < 10000) return msg.reply("❌ Min beli Rp 10.000");
    if (user.balance < nominal) return msg.reply(`❌ Uang kurang. Saldo: Rp ${fmt(user.balance)}`);

    const currentPrice = market.prices[koin].price;
    const fee = nominal * 0.001;
    const bersih = nominal - fee;
    const amount = bersih / currentPrice;

    // Simpan rata-rata harga beli SEBELUM update qty
    if (!user.cryptoAvg) user.cryptoAvg = {};
    const oldQty = user.crypto[koin] || 0;
    const oldAvg = user.cryptoAvg[koin] || currentPrice;
    user.cryptoAvg[koin] = Math.floor(
        (oldQty * oldAvg + bersih) / (oldQty + amount)
    );

    user.balance -= nominal;
    user.crypto[koin] = oldQty + amount;
    saveDB(db);

    return msg.reply(
        `✅ *BELI SUKSES*\n` +
        `Koin: ${koin.toUpperCase()}\n` +
        `Harga Real: Rp ${fmt(currentPrice)}\n` +
        `Bayar: Rp ${fmt(nominal)}\n` +
        `📦 *Dapat: ${amount.toFixed(8)} ${koin.toUpperCase()}*`
    );
}

    // 3. JUAL (REAL PRICE + PAJAK SULTAN)
    if (command === 'sellcrypto') {
        const koin = args[0]?.toLowerCase();
        let amountStr = args[1];

        if (!user.crypto[koin] || user.crypto[koin] <= 0) return msg.reply("❌ Dompet kosong.");
        
        let amount = parseFloat(amountStr);
        if (amountStr === 'all') amount = user.crypto[koin];
        if (isNaN(amount) || amount <= 0) return msg.reply("❌ Jumlah salah.");
        if (amount > user.crypto[koin]) amount = user.crypto[koin];

        const currentPrice = market.prices[koin].price;
        const gross = Math.floor(amount * currentPrice);

        // PAJAK PROGRESIF
        let taxRate = 0.002; // 0.2% Standard
        if (user.balance > 100_000_000_000_000) taxRate = 0.05; // 5%

        const fee = Math.floor(gross * 0.01);
        const tax = Math.floor(gross * taxRate);
        const net = Math.floor(gross - fee - tax);
        
        user.crypto[koin] -= amount;
        if (user.crypto[koin] <= 0) delete user.crypto[koin];
        
        // Hitung modal beli (estimasi dari harga rata-rata)
const modalBeli = Math.floor(amount * (user.cryptoAvg?.[koin] || currentPrice));
const profit = net - modalBeli;

user.balance += net;
user.dailyIncome = (user.dailyIncome || 0) + net;

let pajakCG = 0;
if (profit > 0) {
    pajakCG = tambahCapitalGains(user, profit); // ← Hanya dari profit
}

saveDB(db);

return msg.reply(
    `✅ *JUAL SUKSES*\n` +
    `Koin: ${koin.toUpperCase()}\n` +
    `Harga Real: Rp ${fmt(currentPrice)}\n` +
    `Jual: ${amount.toFixed(8)}\n\n` +
    `💰 Gross: Rp ${fmt(gross)}\n` +
    `💸 Tax (${taxRate*100}%): Rp ${fmt(tax)}\n` +
    `💵 *Terima: Rp ${fmt(net)}*\n` +
    (pajakCG > 0 ? `🧾 Capital Gains Tax: Rp ${fmt(pajakCG)} (10%)\n_Bayar via !bayarpajak_` : '')
);
    }

    // 4. MARGIN (LEVERAGE DI DATA REAL)
    // Fitur: Pinjam uang untuk beli koin di harga REAL.
    // Risiko: Jika harga REAL turun, aset disita (cek logika likuidasi di atas).
    if (command === 'margin') {
        const koin = args[0]?.toLowerCase();
        const nominal = parseInt(args[1]);

        if (!COIN_IDS[koin]) return msg.reply("❌ Koin salah.");
        if (isNaN(nominal) || nominal < 100000) return msg.reply("❌ Min margin Rp 100.000");

        // Limit Margin: 3x Saldo
        const maxLoan = user.balance * 3;
        if ((user.debt + nominal) > maxLoan) return msg.reply(`❌ Limit Margin Mentok! Sisa limit: Rp ${fmt(maxLoan - user.debt)}`);

        const currentPrice = market.prices[koin].price;
        const dapatKoin = nominal / currentPrice;

        user.debt += nominal;
        user.crypto[koin] = (user.crypto[koin] || 0) + dapatKoin;
        saveDB(db);

        return msg.reply(`⚠️ *MARGIN BUY (REAL MARKET)*\nBerhutang Rp ${fmt(nominal)}\nBeli: ${dapatKoin.toFixed(8)} ${koin.toUpperCase()}\nHarga Entry: Rp ${fmt(currentPrice)}\n\n_Hati-hati! Jika harga ${koin.toUpperCase()} di dunia nyata turun drastis, asetmu otomatis hangus._`);
    }

    // 5. PAY DEBT
    if (command === 'paydebt') {
        const amt = parseInt(args[0]);
        const bayar = amt ? Math.min(amt, user.debt) : user.debt;

        if (bayar <= 0) return msg.reply("❌ Tidak ada hutang.");
        if (user.balance < bayar) return msg.reply("❌ Uang tidak cukup.");

        user.balance -= bayar;
        user.debt -= bayar;
        saveDB(db);
        return msg.reply(`✅ Hutang lunas Rp ${fmt(bayar)}. Sisa hutang: Rp ${fmt(user.debt)}`);
    }

    // 6. PORTO
    if (command === 'pf' || command === 'porto') {
         let txt = `💼 *PORTOFOLIO CRYPTO*\n`;
         let totalAsset = 0;
         let hasAsset = false;

         for (let [k, v] of Object.entries(user.crypto)) {
             if (v > 0 && market.prices[k]) {
                 const val = Math.floor(v * market.prices[k].price);
                 totalAsset += val;
                 txt += `🔹 ${k.toUpperCase()}: ${v.toFixed(6)} (≈Rp ${fmt(val)})\n`;
                 hasAsset = true;
             }
         }

         if (!hasAsset) txt += "_Kosong_\n";
         
         const netWorth = totalAsset + user.balance - user.debt;
         
         txt += `--------------------------\n`;
         txt += `💰 Aset Crypto: Rp ${fmt(totalAsset)}\n`;
         txt += `💵 Tunai: Rp ${fmt(user.balance)}\n`;
         if (user.debt > 0) txt += `⚠️ Margin: Rp ${fmt(user.debt)}\n`;
         txt += `📊 *Net Worth: Rp ${fmt(netWorth)}*`;
         
         return msg.reply(txt);
    }
};



