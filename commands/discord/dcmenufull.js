// ╔══════════════════════════════════════════════════════════════╗
// ║   DC MENU FULL — commands/discord/dcmenufull.js              ║
// ║   Port penuh dari menu.js WA → Discord                      ║
// ╚══════════════════════════════════════════════════════════════╝

// Auto-split pesan panjang agar tidak error di Discord (limit 2000 char)
async function sendLong(msg, text) {
    // Convert WA formatting → Discord formatting
    const formatted = text
        .replace(/\*([^*\n]+)\*/g, '**$1**')   // *bold* → **bold**
        .replace(/_([^_\n]+)_/g, '*$1*')        // _italic_ → *italic*
        .replace(/~([^~\n]+)~/g, '~~$1~~');     // ~strike~ → ~~strike~~

    if (formatted.length <= 1900) {
        return msg.reply(formatted);
    }

    // Split per baris, gabungkan sampai hampir 1900 char
    const lines = formatted.split('\n');
    let chunk = '';
    for (const line of lines) {
        if ((chunk + '\n' + line).length > 1900) {
            await msg.reply(chunk);
            chunk = line;
        } else {
            chunk += (chunk ? '\n' : '') + line;
        }
    }
    if (chunk) await msg.reply(chunk);
}

const bar = (val, len = 10) => {
    const v = Math.min(Math.max(val || 0, 0), 100);
    const fill = Math.round((v / 100) * len);
    return '█'.repeat(fill) + '░'.repeat(len - fill);
};
const fmt = n => Math.floor(n || 0).toLocaleString('id-ID');

module.exports = async function dcMenuFullCmd(command, args, msg, user, db) {
    if (command !== 'menufull' && command !== 'helpfull') return;

    const sub = (args[0] || '').toLowerCase();

    const bal = fmt(user?.balance || 0);
    const hp  = Math.floor(user?.hp     ?? 100);
    const nrg = Math.floor(user?.energy ?? 100);
    const hng = Math.floor(user?.hunger ?? 100);
    const lvl = user?.level ?? 1;
    const xp  = fmt(user?.xp || 0);
    const job = user?.job ? `💼 ${user.job}` : '😴 Pengangguran';

    // ══════════════════════════════════════════════════════════════
    //  MENU UTAMA
    // ══════════════════════════════════════════════════════════════
    if (!sub) {
        return sendLong(msg,
`╔══════════════════════════════╗
║  ⚔️  *ALGOJO BOT v2.0*  ⚔️   ║
║   _Wiki Panduan Interaktif_   ║
╚══════════════════════════════╝

❤️ HP     : [${bar(hp)}] ${hp}%
🍗 Lapar  : [${bar(hng)}] ${hng}%
⚡ Energi : [${bar(nrg)}] ${nrg}%
💰 Saldo  : Rp ${bal}
🎖️ Level  : ${lvl} (${xp} XP) | ${job}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔰 *PANDUAN PEMULA — MULAI DI SINI*
┌─────────────────────────────┐
│ 1. Cek status  → !me        │
│ 2. Ambil daily → !daily     │
│ 3. Lamar kerja → !jobs      │
│ 4. Mulai cuan  → !farming   │
│ 5. Jangan mati → !makan     │
└─────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 *KEHIDUPAN & EKONOMI*
• !menufull nyawa    — Survival: HP, lapar, energi, kematian
• !menufull bank     — Keuangan: transfer, pinjam, limit harian
• !menufull jobs     — Profesi: gaji, skill pasif, sertifikasi

⚔️ *GAMES & HIBURAN*
• !menufull game     — Casino, slot, roulette, mines, duel
• !menufull minigame — Catur, Slither, RPG, Akinator, Trivia
• !menufull bola     — Sportsbook: 1X2, HDP, O/U, Mix Parlay

🏭 *BISNIS & INDUSTRI*
• !menufull farming  — Pertanian, mesin pabrik, industri bersama
• !menufull ternak   — Peternakan, pakan, budidaya hewan
• !menufull mining   — VGA rig, BTC mining, trading crypto

📊 *INVESTASI & ASET*
• !menufull investasi — Saham BEI (real-time), valas, emas
• !menufull properti  — Usaha pasif: gerobak hingga maskapai

🏳️ *NEGARA & PERANG*
• !menufull negara   — Bangun negara, perang, aliansi, spionase

🤖 *AI & KREATIVITAS*
• !menufull ai       — ChatAI multi-tier, tools AI, analisis gambar
• !menufull kreatif  — Image AI, meme, cerita interaktif, lirik lagu

🛠️ *TOOLS & UTILITAS*
• !menufull tools    — Stiker, PDF, TTS, downloader, image editor
• !menufull utilitas — QR, password, enkripsi, IP, countdown

🎭 *LIFESTYLE*
• !menufull mood     — Zodiak, shio, mood tracker, horoskop
• !menufull reminder — Pengingat jadwal & tagihan otomatis

👥 *GRUP & SISTEM*
• !menufull group    — Admin tools, antilink, welcome message
• !menufull event    — Admin Abuse: 10 event acak 30 menit
• !menufull analitik — Statistik penggunaan bot
• !menufull developer — Panel admin/developer bot

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
_Ketik !menufull <kategori> untuk panduan detail_
_Contoh: !menufull farming | !menufull game | !menufull ai_`
        );
    }

    // ══════════════════════════════════════════════════════════════
    //  SEMUA SUB-MENU (diambil langsung dari menu.js WA)
    // ══════════════════════════════════════════════════════════════

    if (['nyawa','survival','life','hp','status'].includes(sub)) {
        return sendLong(msg,
`🩺 *SISTEM KEHIDUPAN — PANDUAN LENGKAP*
${'━'.repeat(30)}

📖 *CARA KERJA (MEKANIK)*
Bot menjalankan sistem survival real-time.
Setiap menit, status karaktermu berubah:

  🍗 Lapar   : -0.1% / menit (habis dlm ~16 jam)
  ⚡ Energi  : -0.09% / menit (habis dlm ~18 jam)
  ❤️ HP      : -0.1% / menit (HANYA jika lapar = 0%)

Jika HP mencapai 0% → 💀 *MATI*
  └ Saldo berkurang *20%* secara otomatis!
  └ Semua command diblokir kecuali !revive

Saat *!tidur* aktif → metabolisme melambat:
  └ Energi +0.6% / menit (isi penuh)
  └ Lapar  -0.02% / menit saja (hemat 5x)
  └ Semua command DIBLOKIR kecuali !bangun

${'─'.repeat(30)}
📊 *STATUS KAMU SEKARANG*
❤️ HP     : [${bar(hp)}] ${hp}%
🍗 Lapar  : [${bar(hng)}] ${hng}%
⚡ Energi : [${bar(nrg)}] ${nrg}%
${hp <= 30 ? '⚠️ PERINGATAN: HP kritis! Segera !makan atau !rs' : hp <= 60 ? '⚡ HP sedang — pertimbangkan !makan' : '✅ Status cukup aman'}

${'─'.repeat(30)}
⌨️ *COMMAND & USAGE*

!me → Cek status lengkap (HP, Lapar, Energi, Saldo)
!makan → Makan hidangan sultan. Lapar → 100%, HP +10% | Biaya: Rp 50.000.000
!tidur <jam> → Tidur 1–10 jam. Energi terisi, lapar melambat | Contoh: !tidur 8
!bangun → Paksa bangun sebelum waktu tidur habis
!rs / !revive → Berobat di RS. HP, Lapar, Energi → 100% | Biaya: Rp 500.000.000
!matistatus → Admin: Bekukan sistem kehidupan semua user
!hidupstatus / !nyalastatus → Admin: Aktifkan kembali sistem kehidupan

${'─'.repeat(30)}
💡 *PRO-TIPS BERTAHAN HIDUP*

• !tidur 8 sebelum tidur malam → Energi full saat bangun, lapar cuma turun ~10%
• Simpan saldo di !depo (bank) — denda mati hanya potong saldo *dompet*, bukan bank!
• Pantau lapar: jika lapar < 20% dan lupa makan, HP mulai turun

↩️ Balik: *!menufull*`
        );
    }

    if (['bank','keuangan','duit','ekonomi'].includes(sub)) {
        return sendLong(msg,
`🏦 *BANK & KEUANGAN — PANDUAN LENGKAP*
${'━'.repeat(30)}

📖 *CARA KERJA (MEKANIK)*
Ada dua jenis kantong uang:
  💳 *Dompet* (balance) — uang siap pakai, bisa di-rob
  🏦 *Bank*   (bank)   — aman dari maling, butuh !depo

Transfer harian dibatasi *Rp 10 Miliar/hari*.
Setiap transfer kena *pajak 5%* (masuk kas bot).
Pinjaman maksimal *Rp 5 Miliar* dengan bunga *20%*.

${'─'.repeat(30)}
⌨️ *COMMAND & USAGE*

!me / !bank / !atm → Lihat saldo dompet + bank + hutang
!depo <jumlah> / !depo all → Setor ke bank
!tarik <jumlah> / !tarik all → Tarik dari bank
!tf @user <jumlah> → Transfer (pajak 5%, batas 10M/hari)
!give @user <jumlah> → Kirim langsung tanpa pajak
!pinjam <jumlah> → Pinjam uang (bunga 20%)
!bayar <jumlah> / !bayar all → Cicil atau lunasi hutang
!rob @user → Rampok 20% dompet target (cooldown 30 menit)
!maling → Curi random tanpa target
!top / !leaderboard / !dailyrank → Top 10 pendapatan

${'─'.repeat(30)}
💡 *PRO-TIPS KEUANGAN*

• Simpan 80–90% saldo di bank — denda mati hanya potong *dompet*!
• Transfer besar? Bagi beberapa hari agar tidak kena limit 10M
• !pinjam untuk modal farming/mining, tapi lunasi sebelum bunga jadi beban

↩️ Balik: *!menufull*`
        );
    }

    if (['jobs','kerja','pekerjaan','job','profesi'].includes(sub)) {
        return sendLong(msg,
`💼 *PROFESI & PEKERJAAN — PANDUAN LENGKAP*
${'━'.repeat(30)}

📖 *CARA KERJA (MEKANIK)*
Pekerjaan memberi *gaji berkala* + *skill aktif/pasif*.
Kamu hanya bisa punya SATU pekerjaan.
Sertifikasi perlu biaya sekali bayar (tidak berulang).

${'─'.repeat(30)}
📋 *DAFTAR PROFESI*
┌────────────────────────────────────────┐
│ 🌾 PETANI MODERN                       │
│   Sertifikasi : Rp 10.000.000         │
│   Gaji        : Rp 1.000.000 / 60 mnt │
│   Skill       : Percepat panen -3 jam  │
├────────────────────────────────────────┤
│ 🤠 JURAGAN TERNAK                      │
│   Sertifikasi : Rp 25.000.000         │
│   Gaji        : Rp 2.500.000 / 2 jam  │
│   Skill       : Hewan langsung lapar   │
├────────────────────────────────────────┤
│ 👮 POLISI SIBER                        │
│   Sertifikasi : Rp 50.000.000         │
│   Gaji        : Rp 7.500.000 / 4 jam  │
│   Pasif       : KEBAL dari !rob        │
│   Skill       : Gerebek → Bonus 5-10jt │
└────────────────────────────────────────┘

⌨️ *COMMAND & USAGE*
!jobs → Lihat semua lowongan
!lamar <profesi> → Daftar pekerjaan | Contoh: !lamar polisi
!kerja / !work → Ambil gaji
!skill → Aktifkan kemampuan khusus profesi
!resign → Keluar kerja

${'─'.repeat(30)}
💡 *PRO-TIPS*
• Main farming → ambil 🌾 PETANI (skill percepat panen)
• Main ternak  → ambil 🤠 PETERNAK (skill hewan lapar lagi)
• Sering di-rob → ambil 👮 POLISI (kebal maling + bonus gerebek)
• Polisi paling cuan per jam: Rp 1.875.000/jam

↩️ Balik: *!menufull*`
        );
    }

    if (['game','games','judi','hiburan','casino'].includes(sub)) {
        return sendLong(msg,
`🎮 *GAMES & JUDI — PANDUAN LENGKAP*
${'━'.repeat(30)}

📖 *MEKANIK UMUM*
Semua game casino dipengaruhi Event Winrate Gila.
Saat event aktif: winrate semua casino naik ke *85%*!
Tanpa event/buff: winrate casino dasar = *35%*.

${'─'.repeat(30)}
🎰 *CASINO SOLO*
!casino <jumlah> → Tebak kartu. Menang: +100% taruhan
!slot <jumlah> → Pool 10 simbol. Jackpot 3 sama → 75x taruhan!
!rolet <pilihan> <jumlah> → merah/hitam/ganjil/genap (×2) | angka 0-36 (×15)
!tembok <jumlah> <1/2/3> → Tebak di balik tembok → ×2.5
!gacha → Biaya Rp 200. Reward: random item/koin

${'─'.repeat(30)}
💣 *MINESWEEPER*
12 kotak, 3 bom tersembunyi (event: hanya 1 bom!)
1 kotak=1.3x | 3 kotak=2.0x | 5 kotak=3.2x | 9 kotak=10x | 10+=50x!

!mines / !bom <taruhan> → Mulai sesi
!gali / !open <1-12> → Buka kotak
!stop / !cashout → Ambil kemenangan

${'─'.repeat(30)}
⚔️ *PvP DUEL & BATTLE*
!duel @user <taruhan> → 50:50 murni (pajak 10%)
!pvp / !battle @user → Battle RPG bergantian

${'─'.repeat(30)}
🧠 *TEBAK BERHADIAH*
!tebakgambar → Tebak dari gambar petunjuk
!asahotak → Tebak kata dari kalimat asosiasi
!susunkata → Susun huruf acak jadi kata
!wordle → Tebak kata 5 huruf (gaya NYT)
!trivia → Quiz trivia acak

${'─'.repeat(30)}
💡 *PRO-TIPS*
• Tunggu event *Winrate Gila* sebelum casino besar!
• Mines: cashout di 5–6 kotak adalah sweet spot (3.2x–4x)
• Roulette: tebak angka spesifik = payout 15x (lebih dari merah/hitam)

↩️ Balik: *!menufull*`
        );
    }

    if (['minigame','catur','chess','slither','rpg','akinator'].includes(sub)) {
        return sendLong(msg,
`🕹️ *MINI GAME INTERAKTIF — PANDUAN LENGKAP*
${'━'.repeat(30)}

♟️ *CATUR (CHESS)*
!catur easy / medium / hard → Bermain catur vs AI di browser
Taruhan saldo berlaku — menang atau kalah nyata!

🐍 *SLITHER (ULAR)*
!slither / !snake → Buka link game
!claimslither <kode> → Klaim skor/reward selesai

⚔️ *RPG BROWSER BATTLE*
!rpg / !battle → Buka link RPG
!claim / !redeem <kode> → Klaim reward kemenangan

🧠 *AKINATOR — TEBAK PIKIRAN*
!akinator → Mulai sesi
!ya → Jawab "Ya" | !tidak → Jawab "Tidak"
!akinatorberhenti → Hentikan sesi

⏳ *TIME MACHINE*
!timemachine / !flashback / !dejavu
→ Bot kirim ulang momen chat dari masa lalu!

↩️ Balik: *!menufull*`
        );
    }

    if (['bola','sport','betting','parlay'].includes(sub)) {
        return sendLong(msg,
`⚽ *SPORTSBOOK — PANDUAN LENGKAP*
${'━'.repeat(30)}

📚 *PANDUAN SUB-MENU*
• !menufull bolaajar  → Pengenalan judi bola (pemula)
• !menufull odds      → Cara baca & hitung odds
• !menufull 1x2       → Taruhan Home/Draw/Away
• !menufull hdp       → Asian Handicap (Voor)
• !menufull ou        → Over/Under (jumlah gol)
• !menufull parlayajar→ Mix Parlay step-by-step

${'─'.repeat(30)}
⌨️ *SEMUA COMMAND TARUHAN*
!bola → Lihat semua pertandingan aktif + ID match
!odds <ID> → Detail odds + garis HDP + O/U
!bet <ID> <jenis> <pilihan> <jumlah> → Pasang taruhan tunggal
  Jenis: 1x2 | hdp | ou
  Contoh: !bet AB12 1x2 h 5000000
!parlay <ID> <jenis> <pilihan> → Tambah 1 leg ke slip parlay
!parlaylihat → Cek slip parlay + total odds
!parlaybet <jumlah> → Pasang semua leg parlay
!parlaybatal → Kosongkan slip parlay
!mybets → Riwayat semua taruhan
!topbola → Leaderboard profit betting

↩️ Balik: *!menufull*`
        );
    }

    if (sub === 'bolaajar') {
        return sendLong(msg,
`🔰 *PANDUAN JUDI BOLA — UNTUK PEMULA*
${'━'.repeat(30)}

Taruhan bola = pasang uang untuk menebak hasil pertandingan.
Odds = angka pengali kemenangan.
Rumus: *Kemenangan = Taruhan × Odds*

Contoh: !bet AB12 1x2 h 100000
(Odds home 1.85 → menang dapat Rp 185.000)

3 JENIS TARUHAN:
1️⃣ *1X2* → Tebak Home menang / Seri / Away → !menufull 1x2
2️⃣ *Asian Handicap (HDP)* → Sistem voor → !menufull hdp
3️⃣ *Over/Under (O/U)* → Tebak jumlah gol → !menufull ou
🎰 *Mix Parlay* → Gabung banyak match → !menufull parlayajar

↩️ Balik: *!menufull bola*`
        );
    }

    if (sub === 'odds') {
        return sendLong(msg,
`📊 *CARA BACA ODDS — PANDUAN*
${'━'.repeat(30)}

Odds = angka pengali uangmu jika menang.
💰 Hasil = Taruhan × Odds

Contoh: Man City vs Arsenal
🏠 Man City: *1.75* | 🤝 Seri: *3.50* | ✈️ Arsenal: *4.20*

Bet Rp 200.000 → Man City:
✅ Menang: 200.000 × 1.75 = *Rp 350.000* (+150k)

ARTI NILAI ODDS:
1.10–1.40 → Favorit berat | 1.70–2.10 → Tim kuat
2.50–4.00 → Underdog | 5.00+ → Outsider besar

↩️ Balik: *!menufull bola*`
        );
    }

    if (sub === '1x2') {
        return sendLong(msg,
`🎯 *TARUHAN 1X2 — PANDUAN*
${'━'.repeat(30)}
Pilihan: 1=Home | X=Seri | 2=Away

Contoh: Liverpool (H) vs Chelsea (A)
🏠 Liverpool: *1.85* | 🤝 Seri: *3.40* | ✈️ Chelsea: *4.00*

Bet Rp 500.000:
Liverpool → ✅ ×1.85 = *Rp 925.000*
Seri      → ✅ ×3.40 = *Rp 1.700.000*

!bet LV12 1x2 h 500000  → Home
!bet LV12 1x2 d 500000  → Seri
!bet LV12 1x2 a 500000  → Away

↩️ Balik: *!menufull bola*`
        );
    }

    if (sub === 'hdp') {
        return sendLong(msg,
`⚖️ *ASIAN HANDICAP — PANDUAN*
${'━'.repeat(30)}
HDP 0    → Seri = REFUND
HDP -0.5 → Home harus menang ≥ 1 gol
HDP -1   → Home harus menang ≥ 2 gol (selisih 1 = REFUND)
HDP -1.5 → Home harus menang ≥ 2 gol (no refund)

Contoh: Real Madrid -1 vs Atletico
Madrid menang 3-0 → ✅ MENANG
Madrid menang 1-0 → 🔄 REFUND
Madrid menang 2-1 → ❌ KALAH

!bet LV12 hdp h 200000  → Bet Home
!bet LV12 hdp a 200000  → Bet Away

↩️ Balik: *!menufull bola*`
        );
    }

    if (sub === 'ou') {
        return sendLong(msg,
`📈 *OVER/UNDER — PANDUAN*
${'━'.repeat(30)}
Tebak total gol kedua tim. Tidak perlu tahu siapa yang menang!

Garis 2.5 → Over ≥ 3 gol | Under ≤ 2 gol
Garis 3.0 → Over ≥ 4 gol | Under ≤ 2 gol (tepat 3 = refund)

Contoh: Barcelona vs PSG — O/U 2.5
Skor 2-1 (3 gol) → Over ✅ MENANG → ×1.90
(Bet Over Rp 300k → dapat Rp 570.000)

!bet LV12 ou o 300000  → Bet Over
!bet LV12 ou u 300000  → Bet Under

↩️ Balik: *!menufull bola*`
        );
    }

    if (sub === 'parlayajar') {
        return sendLong(msg,
`🎰 *MIX PARLAY — PANDUAN*
${'━'.repeat(30)}
Gabung banyak taruhan → odds semua leg DIKALI.
✅ Semua harus benar | ❌ Satu salah = semua hangus

Contoh 3 leg:
Match 1: Man City H → odds 1.75
Match 2: Over 2.5   → odds 1.90
Match 3: Real Madrid → odds 1.80
Total odds = 1.75 × 1.90 × 1.80 = *5.985*
Modal Rp 100.000 → dapat *Rp 598.500*!

Step-by-step:
1. !bola → Lihat match
2. !parlay AB12 1x2 h → Tambah leg 1
3. !parlay CD34 ou o  → Tambah leg 2
4. !parlaylihat       → Cek total odds
5. !parlaybet 100000  → Pasang!

Min 2 leg — Maks 8 leg. Tips: 3–4 leg = sweet spot!

↩️ Balik: *!menufull bola*`
        );
    }

    if (['farming','tani','pertanian','pabrik'].includes(sub)) {
        return sendLong(msg,
`🌾 *FARMING & INDUSTRI — PANDUAN LENGKAP*
${'━'.repeat(30)}

📖 *MEKANIK*
Tanaman tumbuh otomatis. Harga jual berfluktuasi tiap saat.
Event *Musim Panen*: harga jual ×3! | Event *Borong Pasar*: diskon beli 50%!

${'─'.repeat(30)}
🌱 *DATA TANAMAN*
PADI   │ Modal: 2jt  │ Waktu: 20 mnt │ Jual mentah: 2.2–2.5jt
JAGUNG │ Modal: 5jt  │ Waktu: 1 jam  │ Jual mentah: 6–7jt
BAWANG │ Modal: 10jt │ Waktu: 2 jam  │ Jual mentah: 13–15jt
KOPI   │ Modal: 25jt │ Waktu: 4 jam  │ Jual mentah: 32–38jt
SAWIT  │ Modal: 50jt │ Waktu: 8 jam  │ Jual mentah: 75–90jt

${'─'.repeat(30)}
🏭 *MESIN PABRIK — NILAI TAMBAH*
gilingan      → Padi → Beras       │ Jual: 6jt (dari 2.5jt)
popcorn_maker → Jagung → Popcorn   │ Jual: 18jt (dari 7jt)
penggorengan  → Bawang Goreng      │ Jual: 40jt (dari 15jt)
roaster       → Kopi Bubuk         │ Jual: 100jt (dari 38jt)
pabrik_minyak → Minyak Goreng      │ Jual: 250jt (dari 90jt)

${'─'.repeat(30)}
⌨️ *COMMAND*
!tanam <nama> | !ladang | !panen | !pasar | !jual <nama> <jml>
!toko | !beli <mesin> | !olah <mesin> <jml> | !pabrik

${'─'.repeat(30)}
💡 *PRO-TIPS*
• Sawit → pabrik_minyak = profit 5x per 10 jam!
• Jual saat event Musim Panen → harga ×3 = 750jt per harvest!
• Beli mesin saat Borong Pasar → diskon 50%

↩️ Balik: *!menufull*`
        );
    }

    if (['ternak','ranch','hewan','kandang'].includes(sub)) {
        return sendLong(msg,
`🐄 *PETERNAKAN — PANDUAN LENGKAP*
${'━'.repeat(30)}

📖 *MEKANIK*
Hewan tumbuh berdasarkan seberapa sering diberi makan.
Hewan tidak makan > 24 jam → MATI!
Jual saat berat MAKSIMAL + kondisi SEHAT → bonus +10%.

${'─'.repeat(30)}
🐾 *DATA HEWAN*
🐔 AYAM   │ Beli: 50rb  │ Max: 3kg  │ Jual: ~180rb │ Lapar tiap 1 jam
🐟 GURAME │ Beli: 200rb │ Max: 5kg  │ Jual: ~750rb │ Lapar tiap 1.5 jam
🐐 KAMBING│ Beli: 3jt   │ Max: 60kg │ Jual: ~6jt   │ Lapar tiap 3 jam
🐄 SAPI   │ Beli: 15jt  │ Max: 700kg│ Jual: ~35jt  │ Lapar tiap 6 jam
🐎 KUDA   │ Beli: 40jt  │ Max: 500kg│ Jual: ~100jt │ Lapar tiap 5 jam
🐫 UNTA   │ Beli: 80jt  │ Max: 1ton │ Jual: ~150jt │ Lapar tiap 8 jam

${'─'.repeat(30)}
🌿 *PAKAN*
🌾 Dedak (2rb) → ×0.3 | 💊 Pelet (10rb) → ×0.6 | 🥩 Premium (40rb) → ×1.2

⌨️ *COMMAND*
!kandang | !belihewan <jenis> | !belipakan <jenis> <jml>
!pakan <no> <jenis> | !obati <no> | !jualhewan <no>

💡 *PRO-TIPS*: SAPI sweet spot (modal 15jt → jual 35jt).
Beli hewan saat Borong Pasar → diskon 50%!

↩️ Balik: *!menufull*`
        );
    }

    if (['mining','tambang','btc','miner'].includes(sub)) {
        return sendLong(msg,
`⛏️ *MINING & CRYPTO — PANDUAN LENGKAP*
${'━'.repeat(30)}

📖 *MEKANIK*
Produksi BTC: *0.000481 BTC per MH/s per jam*
Listrik: *Rp 15.000 per MH/s per jam* (auto-potong)
Event *Rush Tambang*: hasil ×5, cooldown 0, listrik GRATIS!

${'─'.repeat(30)}
🖥️ *HARDWARE MINING*
⚙️ LEGAL:
RTX 4070 Ti  → 160 MH/s  │ Rp 4 Miliar
RTX 4090 OC  → 400 MH/s  │ Rp 9.5 Miliar
Dual 4090    → 640 MH/s  │ Rp 15 Miliar
Antminer S19 → 800 MH/s  │ Rp 18 Miliar

🏴‍☠️ ILLEGAL:
USB Miner Hack  → 100 MH/s  │ Rp 1.5M  │ Risiko 10%
Quantum Rig     → 1500 MH/s │ Rp 25M   │ Risiko 25%

🔧 UPGRADE: PSU (hemat listrik 30%) | Firewall (kebal !hack)

⌨️ *COMMAND*
!mining | !claimmining | !shopminer | !belivga <kode>
!upgrade psu | !hack @user | !topminer

💹 *TRADING CRYPTO*
!market / !crypto | !buycrypto <koin> <Rp> | !sellcrypto <koin> <jml>
!pf / !porto | !margin | !paydebt

💡 *PRO-TIPS*: Beli PSU upgrade PERTAMA → hemat listrik 30%!
RTX 4090 = best legal ratio hashrate/harga.

↩️ Balik: *!menufull*`
        );
    }

    if (['investasi','saham','valas','forex'].includes(sub)) {
        return sendLong(msg,
`📈 *INVESTASI — PANDUAN LENGKAP*
${'━'.repeat(30)}

Saham real-time dari Yahoo Finance. Crypto dari CoinGecko.
Saham: BBCA, BBRI, BMRI, TLKM, ASII, UNTR, GOTO, ANTM, ADRO, BREN
Fee beli crypto: 0.1% | Fee jual: 1% + pajak 0.2%

${'─'.repeat(30)}
⌨️ *COMMAND*

📊 SAHAM BEI:
!saham / !market | !belisaham <kode> <jml> | !jualsaham <kode> <jml>
!chart <kode> | !pf / !porto | !dividen

💱 VALAS & EMAS:
!kurs / !valas | !dollar | !beliemas <gram> | !jualemas <gram>
!beliusd / !belieur / !belijpy <Rp> | !jualusd / !jualeur / !jualjpy

₿ CRYPTO:
!market / !crypto | !btc | !buycrypto <koin> <Rp> | !sellcrypto <koin> <jml>

${'─'.repeat(30)}
💡 *PRO-TIPS*
• BBCA & BBRI lebih stabil vs GOTO yang volatil
• Emas = safe haven saat ekonomi global lesu
• !kurspro untuk lihat tren 7 hari sebelum beli valas

↩️ Balik: *!menufull*`
        );
    }

    if (['properti','property','bisnis','usaha'].includes(sub)) {
        return sendLong(msg,
`🏢 *PROPERTI & BISNIS PASIF — PANDUAN*
${'━'.repeat(30)}

Bisnis menghasilkan pendapatan pasif setiap jam.
Cap penuh = bisnis berhenti! Harus !collect berkala.

${'─'.repeat(30)}
🏪 *DAFTAR BISNIS*
Tier 1: 🍡 Gerobak Cilok (5jt│+25rb/jam) | 📱 Kios Pulsa (20jt│+120rb/jam)
Tier 2: 💻 Warnet Gaming (150jt│+1.2jt/jam) | ☕ Coffee Shop (400jt│+3.5jt/jam)
Tier 3: 🏭 Pabrik Tekstil (2.5M│+25jt/jam) | 🏨 Hotel Bintang 5 (15M│+180jt/jam)
Tier 4: 🏙️ Mall Grand (50M│+650jt/jam) | ✈️ Maskapai (200M│+3M/jam)

⌨️ *COMMAND*
!properti | !beliusaha <id> | !collect / !tagih / !panen

💡 Set !remind untuk !collect tiap beberapa jam!

↩️ Balik: *!menufull*`
        );
    }

    if (['negara','war','perang','nation'].includes(sub)) {
        return sendLong(msg,
`🏳️ *NEGARA & PERANG — PANDUAN LENGKAP*
${'━'.repeat(30)}

!buatnegara <nama> → Buat negara (Biaya: Rp 5 Miliar!)
!negara / !nation | !sensus | !statsnegara | !topnegara

🏗️ *INFRASTRUKTUR* (bangun: !bangun <kode>)
🏦 Bank Sentral | 🏰 Benteng | 🏥 Rumah Sakit | 🕵️ Markas Intelijen
🚀 Silo Rudal | 📡 Radar | ☢️ Lab Nuklir | 🎓 Universitas Riset

🔬 *RISET*
!riset rudal_pintar | !riset agen_elite | !riset ekonomi_maju

⚔️ *MILITER & PERANG*
!rekrut <jml> | !serang @target | !serangangudara @target
!bangunrudal <jml> | !perisai | !blokade @target | !gencatan @target

🤝 *DIPLOMASI*
!aliansi @target | !terimaliansi | !listaliansi

💰 *EKONOMI*
!pajaknegara | !subsidi <jml> | !tarikkas <jml> | !korupsi | !propaganda

🕵️ *SPIONASE* (butuh Markas Intelijen)
!spionase @target | !sabotase @target | !teror @target
!kudeta @target | !suap @target | !curi @target

💡 Bangun Bank + Kilang dulu → naikkan pendapatan pajak!
Jangan korupsi terlalu sering → risiko kudeta!

↩️ Balik: *!menufull*`
        );
    }

    if (['event','abuse','adminabuse'].includes(sub)) {
        return sendLong(msg,
`🎉 *ADMIN ABUSE EVENT — PANDUAN LENGKAP*
${'━'.repeat(30)}

Admin grup aktifkan sesi event 30 menit. Event berganti tiap ~1 menit.

⚡ *KONTROL EVENT (Admin Grup)*
!adminabuseon → Mulai sesi | !adminabuseoff → Matikan | !abuseinfo → Status

${'─'.repeat(30)}
📋 *10 EVENT RANDOM*

1. 🌧️ *Hujan Uang* — Bot kirim koin gratis ke semua user aktif
2. 🎰 *Jackpot Bersama* — Taruh 50rb → 1 orang menang semua
3. 🛒 *Borong Pasar* — Semua item toko diskon 50%!
4. ☄️ *Meteor Langka* — Ketik "KLAIM" pertama = menang reward
5. 🌾 *Musim Panen* — Harga jual pertanian & ternak ×3!
6. ⛏️ *Rush Tambang* — BTC ×5 | Cooldown 0 | Listrik GRATIS
7. 🎲 *Winrate Gila* — Casino winrate naik ke 85%!
8. ⚔️ *Duel Berhadiah* — Menang !duel → bonus +Rp 2 Juta
9. 🧠 *Tebak Berhadiah* — Jawab soal pertama & benar = menang
10. ⚡ *Balapan Klik* — Ketik kata acak pertama = menang

💡 Prioritas: Rush Tambang → spam !claimmining | Winrate Gila → casino besar | Musim Panen → !panen & !jualhewan!

↩️ Balik: *!menufull*`
        );
    }

    if (['ai','chatai','robot','gpt'].includes(sub)) {
        return sendLong(msg,
`🤖 *AI & KECERDASAN BUATAN — PANDUAN LENGKAP*
${'━'.repeat(30)}

💬 *TIER AI*
!ai <pesan>  → General AI (cepat, gratis)
!ai0 <pesan> → Premium (GPT-4/Gemini — terbaik)
!ai1 <pesan> → Smart — jawaban mendalam, analitis
!ai2 <pesan> → Creative — nulis kreatif, ekspresif
!ai3 <pesan> → Fast — singkat padat, cepat

🎭 *PERSONA*
!persona → Lihat semua persona | !persona <nama> → Ganti karakter
Contoh: !persona guru | !persona chef | !persona dokter

📊 *STATISTIK & MEMORI*
!aistat | !resetai / !clearai | !sharechat / !history

🖼️ *ANALISIS GAMBAR*
!aianalysis + kirim/reply gambar → AI analisis isi gambar

${'─'.repeat(30)}
🔧 *AI TOOLS LENGKAP*
!summarize <link/teks> → Ringkas artikel panjang
!translate <lang> <teks> → Terjemah | Contoh: !translate en Halo
!ocr + gambar → Baca teks dari foto/screenshot
!codereview <kode> → Review kode program
!improve <teks> → Perbaiki tulisan/essay
!grammar <teks> → Koreksi grammar
!sentiment <teks> → Analisis sentimen positif/negatif/netral
!explain <topik> → Jelaskan dengan bahasa sederhana
!fakta <topik> → Cek fakta atau dapatkan fakta unik
!wiki <topik> → Cari info dari Wikipedia
!sholat <kota> → Jadwal sholat hari ini

💡 !ai2 untuk konten kreatif | !ai1 untuk analisis teknis | !ai0 untuk tugas paling penting

↩️ Balik: *!menufull*`
        );
    }

    if (['kreatif','gambar','meme','cerita','image'].includes(sub)) {
        return sendLong(msg,
`🎨 *KREATIF — PANDUAN LENGKAP*
${'━'.repeat(30)}

🖼️ *IMAGE GENERATOR (AI)*
!img / !gambar <deskripsi> → Generate gambar AI
!imgstyle <style> <deskripsi> → Style: anime | realistic | cartoon | cyberpunk | watercolor
!imgvariasi <deskripsi> → Generate 3 variasi sekaligus
💡 Gunakan bahasa Inggris untuk hasil terbaik!

😂 *MEME GENERATOR*
!meme <template> | <teks atas> | <teks bawah>
Contoh: !meme drake | Ngerjain PR sendiri | Nyontek

📖 *CERITA INTERAKTIF (AI Story)*
!cerita / !story <tema> → Mulai cerita interaktif
!lanjut / !ceritalanjut → Lanjutkan narasi
!stopcerita → Akhiri sesi

🎵 *LIRIK LAGU*
!lirik / !lyrics <judul lagu> → Cari lirik + terjemahan
Contoh: !lirik Riptide Vance Joy

↩️ Balik: *!menufull*`
        );
    }

    if (['tools','alat','stiker','pdf','tts'].includes(sub)) {
        return sendLong(msg,
`🛠️ *TOOLS MULTIMEDIA — PANDUAN LENGKAP*
${'━'.repeat(30)}

🎨 *STIKER*
!s / !sticker → Gambar/GIF → stiker WhatsApp (reply gambar + ketik !s)
!toimg → Stiker → gambar balik

🔊 *TEXT TO SPEECH*
!tts <teks> → Teks → pesan suara (default: Indonesia)
!tts en <teks> → TTS Inggris

📄 *PDF TOOLS*
!topdf + kirim dokumen → Baca & ekstrak teks dari PDF
!scan + kirim → Mode hitam-putih

🔍 *TOOLS GAMBAR*
!bg / !removebg + gambar → Hapus background foto (AI)
!compress [kualitas] + gambar → Kompres ukuran foto
!enhance + gambar → Auto-perbaiki brightness & sharpness

🎬 *DOWNLOADER*
!tiktok <link> → Download video TikTok tanpa watermark
!ytmp3 <url> → Download audio YouTube sebagai MP3

↩️ Balik: *!menufull*`
        );
    }

    if (['utilitas','utility','qr','password'].includes(sub)) {
        return sendLong(msg,
`📱 *UTILITAS DIGITAL — PANDUAN LENGKAP*
${'━'.repeat(30)}

📱 *QR CODE & LINK*
!qr <teks/link> → Generate QR code
!short <url> → Perpendek URL | !unshort <url> → Lihat URL asli
!mylinks → Lihat semua link pendek kamu

🔐 *PASSWORD & KEAMANAN*
!password 16 strong → Generate password 16 karakter kuat
!password 6 pin → Generate PIN 6 digit
!uuid → Generate UUID unik

🔒 *ENKRIPSI & HASH*
!base64 encode <teks> → Encode ke Base64
!base64 decode <hash> → Decode Base64
!md5 <teks> → Hash MD5

🌐 *JARINGAN & IP*
!ip [alamat IP] → Cek IP publik | !ping <url> → Cek latensi

⏰ *WAKTU & TIMER*
!waktu / !time → Waktu di berbagai zona
!countdown <tanggal> → Hitung mundur | Contoh: !countdown 25/12/2025

💡 Semua utilitas GRATIS, tidak kurangi saldo!

↩️ Balik: *!menufull*`
        );
    }

    if (['mood','zodiak','zodiac','horoscope','ramalan'].includes(sub)) {
        return sendLong(msg,
`🔮 *MOOD, ZODIAK & RAMALAN — PANDUAN*
${'━'.repeat(30)}

😊 *MOOD TRACKER*
!mood → AI analisis mood kamu hari ini
!mood <perasaan> → Set mood manual | Contoh: !mood happy
!moodstat → Statistik tren mood minggu ini
!moodhistory → Riwayat lengkap mood

⭐ *ZODIAK & HOROSKOP*
!zodiak <tanggal> → Dari tanggal lahir → zodiak & horoskop | Contoh: !zodiak 25/03
!zodiak <tanda> → Horoskop zodiak tertentu | Contoh: !zodiak scorpio
!cocokan @user → Cek kecocokan zodiak

12 Zodiak: Aries • Taurus • Gemini • Cancer • Leo • Virgo
           Libra • Scorpio • Sagittarius • Capricorn • Aquarius • Pisces

🐉 *SHIO TIONGHOA*
!shio → Ramalan shio berdasarkan tahun kelahiran

↩️ Balik: *!menufull*`
        );
    }

    if (['reminder','remind','pengingat'].includes(sub)) {
        return sendLong(msg,
`⏰ *REMINDER OTOMATIS — PANDUAN LENGKAP*
${'━'.repeat(30)}

Format: !remind <waktu> <pesan>

Format waktu:
  30m = 30 menit | 2h = 2 jam | 1d = 1 hari | 1w = 1 minggu
  HH:MM = jam spesifik | DD/MM = tanggal bulan ini

Contoh:
  !remind 30m Minum obat
  !remind 2h Meeting online
  !remind 08:30 Ambil gaji !kerja
  !remind 6h Kasih makan sapi !kandang
  !remind 4h Ambil gaji polisi !kerja
  !remind 1h Claim bisnis !collect

📋 *KELOLA REMINDER*
!remindlist → Lihat semua reminder aktif
!reminddel <ID> → Hapus 1 reminder
!remindclear → Hapus semua reminder

⚠️ Waktu berdasarkan WIB (UTC+7)

↩️ Balik: *!menufull*`
        );
    }

    if (['group','grup','manajemen','admin'].includes(sub)) {
        return sendLong(msg,
`👥 *MANAJEMEN GRUP — PANDUAN LENGKAP*
${'━'.repeat(30)}

👑 *TAG & INFO*
!tagall → Tag semua anggota
!hidetag <pesan> → Tag tersembunyi
!listadmin | !groupinfo

🚶 *KELOLA ANGGOTA (Admin Only)*
!kick @user | !add 628xxx | !promote @user | !demote @user

🔒 *KEAMANAN GRUP (Admin Only)*
!antilink on/off → Auto-hapus link dari member
!antispam on/off → Proteksi spam
!mute → Bisukan grup | !unmute → Buka mute

💬 *PESAN OTOMATIS (Admin Only)*
!welcome <pesan> → Set pesan sambutan ({name} untuk sebut nama)
!goodbye <pesan> → Set pesan perpisahan
!setrules <peraturan> | !rules → Tampilkan peraturan
!setdesc <deskripsi> → Ubah deskripsi grup

⚠️ Bot harus jadi admin untuk: kick, add, mute, antilink, welcome, setdesc!

↩️ Balik: *!menufull*`
        );
    }

    if (['kalkulator','kalk','hitung','konversi'].includes(sub)) {
        return sendLong(msg,
`🧮 *KALKULATOR & KONVERSI — PANDUAN LENGKAP*
${'━'.repeat(30)}

🔢 *KALKULATOR*
!kalk / !calc <ekspresi> → Mendukung: +, -, *, /, ^, sqrt, sin, cos, tan, log, %
Contoh: !kalk sqrt(144) → 12 | !kalk 2^10 → 1024 | !kalk 15% * 500000 → 75000

💹 *PERSENTASE*
!persen 20 dari 500000 → 100.000

🏋️ *KESEHATAN*
!bmi <berat_kg> <tinggi_cm> → Contoh: !bmi 70 175

🏦 *KEUANGAN*
!cicilan <pokok> <bunga%> <tenor_bulan> → Simulasi KPR/kredit
!zakat <total_harta> → Hitung zakat maal (2.5%)

📏 *KONVERSI SATUAN*
!konversi <nilai> <dari> ke <ke>
Contoh:
!konversi 5 km ke mile | !konversi 70 kg ke lbs
!konversi 100 c ke f   | !konversi 1 gb ke mb
!konversi 100 usd ke idr (real-time!)

↩️ Balik: *!menufull*`
        );
    }

    if (['info','berita','news','cuaca'].includes(sub)) {
        return sendLong(msg,
`📰 *INFO, BERITA & CUACA — PANDUAN*
${'━'.repeat(30)}

📰 *BERITA*
!berita / !news → Berita terpopuler hari ini
!berita <kategori> → teknologi | ekonomi | olahraga | hiburan | sains

💱 *KURS*
!kurs / !valas | !kurspro → Tren 7 hari | !dollar → USD/IDR

₿ *CRYPTO REAL-TIME*
!btc / !bitcoin | !market / !crypto → 20 kripto teratas

🌤️ *CUACA*
!cuaca <kota> → Cuaca saat ini + AQI | Contoh: !cuaca Surabaya
!prakiraan <kota> → Prakiraan cuaca 5 hari

↩️ Balik: *!menufull*`
        );
    }

    if (['analitik','analytic','statistik','stats'].includes(sub)) {
        return sendLong(msg,
`📊 *ANALITIK BOT — PANDUAN*
${'━'.repeat(30)}

!statbot → Statistik penggunaan bot keseluruhan
!topcmd → Ranking command paling sering digunakan
!topuser → Ranking user paling aktif
!resetanalitik → Reset semua data analitik (admin only)

↩️ Balik: *!menufull*`
        );
    }

    if (['developer','dev','godmode','owner'].includes(sub)) {
        return sendLong(msg,
`🔧 *DEVELOPER & ADMIN TOOLS*
${'━'.repeat(30)}

⚠️ Fitur ini HANYA untuk developer / owner bot!

🛠️ *GOD MODE*
!dev / !godmode | !timeskip <jam>

💰 *MANAJEMEN SALDO*
!addmoney @user <jumlah> | !setmoney @user <jumlah>

🎁 *SPAWN ITEM*
!give <kategori> <item> <jumlah> | !setharga <item> <harga>

📢 *BROADCAST*
!godsay / !bc <pesan> → Kirim pesan ke semua grup

👤 *MANAJEMEN USER*
!resetuser @user | !resetall confirm ⚠️ | !cleandb / !prune

⚠️ Semua aksi developer bersifat PERMANEN. Gunakan dengan bijak!

↩️ Balik: *!menufull*`
        );
    }

    // Kategori tidak ditemukan
    return msg.reply(
`❓ Kategori **"${sub}"** tidak ditemukan.

📋 **Kategori tersedia:**
nyawa • bank • jobs • game • minigame
bola (+ bolaajar, odds, 1x2, hdp, ou, parlayajar)
farming • ternak • mining • investasi • properti
negara • event • ai • kreatif • tools
utilitas • mood • reminder • group
kalkulator • info • analitik • developer

Ketik **!menufull** untuk tampilan lengkap.`
    );
};