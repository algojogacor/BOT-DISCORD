const axios = require('axios');
const { tambahCapitalGains, tambahIncome } = require('./pajak');
const { saveDB } = require('../helpers/database');

// HELPER FORMAT ANGKA
const fmt = (num) => Math.floor(Number(num)).toLocaleString('id-ID');

// DAFTAR SAHAM (Tetap pakai format .JK)
const STOCK_MAPPING = {
    'BBCA': 'BBCA.JK',
    'BBRI': 'BBRI.JK',
    'BMRI': 'BMRI.JK',
    'TLKM': 'TLKM.JK',
    'ASII': 'ASII.JK',
    'UNTR': 'UNTR.JK',
    'GOTO': 'GOTO.JK',
    'ANTM': 'ANTM.JK',
    'ADRO': 'ADRO.JK',
    'BREN': 'BREN.JK'
};

module.exports = async (command, args, msg, user, db, sock) => {
    // Init Database
    if (typeof user.balance === 'undefined') user.balance = 0;
    if (typeof user.portfolio === 'undefined') user.portfolio = {};
    if (!db.stockMarket) db.stockMarket = { prices: {}, lastUpdate: 0 };
    
    const market = db.stockMarket;
    const now = Date.now();
    
    // Update data setiap 1 menit
    const CACHE_TIME = 60 * 1000; 

    // ============================================================
    // 📡 FETCH REAL DATA (PAKAI JALUR BELAKANG JSON)
    // ============================================================
    if (now - market.lastUpdate > CACHE_TIME) {
        try {
            const headers = {
                'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
            };

            for (const [ticker, symbol] of Object.entries(STOCK_MAPPING)) {
                try {
                    // URL RAIT (Hidden API) - Mengembalikan JSON Ringan
                    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1d`;
                    const { data } = await axios.get(url, { headers });
                    const result = data.chart.result[0];
                    const meta = result.meta;
                    
                    if (meta) {
                        const currentPrice = meta.regularMarketPrice;
                        const prevClose = meta.chartPreviousClose;
                        const changePct = ((currentPrice - prevClose) / prevClose) * 100;

                        market.prices[ticker] = {
                            price: currentPrice,
                            change: changePct || 0,
                            name: ticker
                        };
                    } 
                } catch (err) {
                    console.error(`⚠️ Gagal fetch ${ticker}: ${err.message}`);
                }
            }

            market.lastUpdate = now;
            saveDB(db);

        } catch (error) {
            console.error("❌ Stock API Error:", error.message);
        }
    }

    const validCommands = ['saham', 'stock', 'market', 'belisaham', 'buystock', 'jualsaham', 'sellstock', 'porto', 'dividen', 'claim', 'chart'];
    if (!validCommands.includes(command)) return;

    // ============================================================
    // 📊 FITUR CHART / GRAFIK (FIXED ERROR 'fromMe')
    // ============================================================
    if (command === 'chart') {
        const ticker = args[0]?.toUpperCase();
        
        if (!ticker || !STOCK_MAPPING[ticker]) {
            return msg.reply(`❌ Masukkan kode saham yang valid.\nContoh: \`!chart bbca\`\nList: ${Object.keys(STOCK_MAPPING).join(', ')}`);
        }

        await msg.reply("⏳ _Mengambil data grafik 1 bulan..._");

        try {
            const symbol = STOCK_MAPPING[ticker];
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=1mo`;
            const headers = { 'User-Agent': 'Mozilla/5.0' };
            
            const { data } = await axios.get(url, { headers });
            const result = data.chart.result[0];
            
            const timestamps = result.timestamp;
            const prices = result.indicators.quote[0].close;

            const labels = [];
            const dataPoints = [];

            timestamps.forEach((ts, i) => {
                if (prices[i]) {
                    const date = new Date(ts * 1000);
                    const dateStr = `${date.getDate()}/${date.getMonth()+1}`;
                    labels.push(dateStr);
                    dataPoints.push(prices[i]);
                }
            });

            const startPrice = dataPoints[0];
            const endPrice = dataPoints[dataPoints.length - 1];
            const isGreen = endPrice >= startPrice;
            const color = isGreen ? 'rgb(0, 200, 0)' : 'rgb(255, 50, 50)';
            const bgColor = isGreen ? 'rgba(0, 200, 0, 0.1)' : 'rgba(255, 50, 50, 0.1)';

            const chartConfig = {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `${ticker} (IDR)`,
                        data: dataPoints,
                        borderColor: color,
                        backgroundColor: bgColor,
                        borderWidth: 2,
                        fill: true,
                        pointRadius: 0
                    }]
                },
                options: {
                    title: { display: true, text: `Grafik ${ticker} - 30 Hari Terakhir` },
                    scales: {
                        yAxes: [{ 
                            ticks: { callback: (val) => val.toLocaleString('id-ID') } 
                        }]
                    }
                }
            };

            const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=500&h=300`;

            // 🔥 PERBAIKAN DI SINI (Membuat objek quoted lengkap) 🔥
            const quotedMsg = {
                key: msg.key,
                message: msg.message
            };

            await sock.sendMessage(msg.from, { 
                image: { url: chartUrl }, 
                caption: `📈 *Grafik Saham ${ticker}*\n💵 Harga Sekarang: Rp ${fmt(endPrice)}\n📅 Rentang: 1 Bulan`
            }, { quoted: quotedMsg }); // Gunakan quotedMsg yang lengkap

        } catch (e) {
            console.error(e);
            return msg.reply("❌ Gagal membuat grafik saham.");
        }
        return;
    }

    // ============================================================
    // COMMANDS LAINNYA
    // ============================================================

    // 1. MARKET UI
    if (command === 'saham' || command === 'stock' || command === 'market') {
        const date = new Date();
        const hour = date.getHours() + 7;
        const day = date.getDay();
        const isMarketOpen = (day >= 1 && day <= 5) && (hour >= 9 && hour < 16);
        let statusPasar = isMarketOpen ? '🟢 BUKA' : '🔴 TUTUP';

        let txt = `📈 *BURSA EFEK INDONESIA (IDX)*\n`;
        txt += `Status: ${statusPasar} _(Real-Time JSON)_\n`;
        txt += `------------------\n`;

        let naik = 0; let turun = 0;

        for (const ticker of Object.keys(STOCK_MAPPING)) {
            const data = market.prices[ticker];
            if (data) {
                const isGreen = data.change >= 0;
                const icon = isGreen ? '🟢' : '🔴';
                const sign = isGreen ? '+' : '';
                
                txt += `${icon} *${ticker}*: Rp ${fmt(data.price)} (${sign}${data.change.toFixed(2)}%) \n`;

                if(isGreen) naik++; else turun++;
            } else {
                txt += `⚪ *${ticker}*: _Loading..._\n`;
            }
        }
        
        txt += `------------------\n`;
        txt += `📊 ${naik} Naik, ${turun} Turun\n`;
        txt += `💰 Saldo: Rp ${fmt(user.balance)}\n`;
        txt += `💡 \`!belisaham <kode> <lembar>\``;
        return msg.reply(txt);
    }

    // 2. BELI SAHAM
    if (command === 'belisaham' || command === 'buystock') {
        const ticker = args[0]?.toUpperCase();
        let qtyRaw = args[1];

        if (!STOCK_MAPPING[ticker]) return msg.reply(`❌ Saham tidak terdaftar.\nList: ${Object.keys(STOCK_MAPPING).join(', ')}`);
        if (!market.prices[ticker] || !market.prices[ticker].price) return msg.reply("⏳ Sedang mengambil data pasar... Coba 5 detik lagi.");
        
        const price = market.prices[ticker].price;
        let qty = parseInt(qtyRaw);

        if (qtyRaw === 'max' || qtyRaw === 'all') {
            const maxBuy = Math.floor(user.balance / (price * 1.003)); 
            qty = maxBuy;
        }

        if (isNaN(qty) || qty < 1) return msg.reply("❌ Jumlah lembar salah.");

        const rawCost = price * qty;
        const fee = Math.floor(rawCost * 0.0015);
        const total = rawCost + fee;

        if (user.balance < total) return msg.reply(`❌ Uang kurang! Butuh Rp ${fmt(total)}`);

        user.balance -= total;

        if (!user.portfolio[ticker]) user.portfolio[ticker] = { qty: 0, avg: 0 };
        const p = user.portfolio[ticker];
        
        const oldVal = p.qty * p.avg;
        p.avg = Math.floor((oldVal + rawCost) / (p.qty + qty));
        p.qty += qty;

        saveDB(db);
        return msg.reply(`✅ *ORDER MATCHED*\nEmiten: ${ticker}\nVol: ${fmt(qty)} Lembar\nHarga: Rp ${fmt(price)}\nFee: Rp ${fmt(fee)}\n📉 Total Bayar: Rp ${fmt(total)}`);
    }

    // 3. JUAL SAHAM
    if (command === 'jualsaham' || command === 'sellstock') {
        const ticker = args[0]?.toUpperCase();
        let qty = args[1];

        if (!user.portfolio[ticker] || user.portfolio[ticker].qty <= 0) return msg.reply("❌ Gak punya saham ini.");
        
        const p = user.portfolio[ticker];
        if (qty === 'all') qty = p.qty;
        qty = parseInt(qty);

        if (isNaN(qty) || qty < 1 || qty > p.qty) return msg.reply("❌ Jumlah salah.");
        if (!market.prices[ticker]) return msg.reply("❌ Data pasar belum siap.");

        const price = market.prices[ticker].price;
        const gross = price * qty;

        let taxRate = user.balance > 100_000_000_000_000 ? 0.05 : 0.003; 
        const tax = Math.floor(gross * taxRate);
        const net = gross - tax;

        const modal = p.avg * qty;
        const profit = net - modal;
        const pct = ((profit / modal) * 100).toFixed(2);
        const status = profit >= 0 ? '🟢 Cuan' : '🔴 Boncos';

        user.balance += net;
user.dailyIncome = (user.dailyIncome || 0) + net;

// Pajak Capital Gains dari profit
let pajakCG = 0;
if (profit > 0) {
    pajakCG = tambahCapitalGains(user, profit); // ← TAMBAH INI
}

p.qty -= qty;
if (p.qty === 0) delete user.portfolio[ticker];

saveDB(db);
return msg.reply(
    `✅ *SELL ORDER DONE*\n` +
    `Emiten: ${ticker}\n` +
    `Vol: ${fmt(qty)} Lembar\n` +
    `Harga: Rp ${fmt(price)}\n\n` +
    `💰 Gross: Rp ${fmt(gross)}\n` +
    `💸 Tax: Rp ${fmt(tax)}\n` +
    `💵 *Net: Rp ${fmt(net)}*\n\n` +
    `📊 P/L: ${status} Rp ${fmt(profit)} (${pct}%)\n` +
    (pajakCG > 0 ? `🧾 Capital Gains Tax: Rp ${fmt(pajakCG)} (10%)\n_Bayar via !bayarpajak_` : '')
);
    }

    // 4. PORTO
    if (command === 'porto' || command === 'pf') {
        let txt = `💼 *PORTOFOLIO SAHAM*\n`;
        let totalVal = 0;
        let totalGain = 0;
        let hasStock = false;
        let rate = user.balance > 100_000_000_000_000 ? 0.30 : 0.003;

        for (let [ticker, data] of Object.entries(user.portfolio)) {
            if (data.qty > 0) {
                const currentData = market.prices[ticker];
                const price = currentData ? currentData.price : data.avg;
                
                const gross = price * data.qty;
                const net = gross - (gross * rate); 
                const gain = net - (data.avg * data.qty);
                const pct = ((gain / (data.avg * data.qty)) * 100).toFixed(1);
                
                txt += `📜 *${ticker}* (${fmt(data.qty)})\n`;
                txt += `   Avg: Rp ${fmt(data.avg)} | Now: Rp ${fmt(price)}\n`;
                txt += `   ${gain >= 0 ? '🟢' : '🔴'} P/L: Rp ${fmt(gain)} (${pct}%)\n\n`;

                totalVal += net;
                totalGain += gain;
                hasStock = true;
            }
        }

        if (!hasStock) return msg.reply("💼 Portofolio kosong.");

        txt += `━━━━━━━━━━\n`;
        txt += `💰 Aset Bersih: Rp ${fmt(totalVal)}\n`;
        txt += `${totalGain >= 0 ? '📈' : '📉'} Floating P/L: Rp ${fmt(totalGain)}`;
        
        return msg.reply(txt);
    }

    // 5. DIVIDEN
    if (command === 'dividen' || command === 'claim') {
        const COOLDOWN = 3600000; 
        const diff = now - (user.lastDividend || 0);
        if (diff < COOLDOWN) return msg.reply(`⏳ Tunggu ${Math.ceil((COOLDOWN - diff)/60000)} menit.`);

        let totalAsset = 0;
        for (let [ticker, data] of Object.entries(user.portfolio)) {
            if (data.qty > 0 && market.prices[ticker]) {
                totalAsset += market.prices[ticker].price * data.qty;
            }
        }

        if (totalAsset === 0) return msg.reply("❌ Gak punya saham.");

        const amount = Math.floor(totalAsset * 0.01);
        user.balance += amount;
        user.dailyIncome = (user.dailyIncome || 0) + amount;
        tambahIncome(user, amount);
        user.lastDividend = now;
        saveDB(db);

        return msg.reply(
    `💸 *DIVIDEN CAIR*\n` +
    `Total Aset: Rp ${fmt(totalAsset)}\n` +
    `Yield: 1%\n` +
    `💵 *Diterima: Rp ${fmt(amount)}*\n` +
    `🧾 Masuk akumulasi PPh` // ← TAMBAH INI
);
    }
};
