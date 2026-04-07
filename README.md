# 🤖 Algojo Bot WA v2.0

Bot WhatsApp tercanggih berbasis [@whiskeysockets/baileys](https://github.com/WhiskeySockets/Baileys) dengan AI multi-model, fitur ekonomi lengkap, dan manajemen grup.

---

## 🚀 Cara Menjalankan

### 1. Install Dependencies
```bash
cd commands
npm install
npm install node-cron   # untuk fitur Reminder
```

### 2. Konfigurasi
```bash
cp .env.example .env
# Edit .env, isi minimal:
# OWNER_NUMBER=628xxx
# OPENROUTER_API_KEY=sk-or-v1-xxx
```

### 3. Jalankan
```bash
# Dari root folder:
node index.js

# Atau dari folder commands/:
npm start
```

### 4. Scan QR Code
Buka WhatsApp > Perangkat Tertaut > Tautkan Perangkat > Scan QR

---

## 📂 Struktur File

```
/
├── index.js              ← ENTRY POINT UTAMA
├── .env                  ← Konfigurasi (buat dari .env.example)
├── .env.example
├── Dockerfile
├── README.md
│
├── helpers/
│   └── database.js       ← Sistem database JSON
│
├── commands/
│   ├── package.json      ← Dependencies
│   ├── database.json     ← Data bot (auto-generated)
│   │
│   ├── ai.js             ← AI Chat + 10 Persona + Vision
│   ├── aitools.js        ← Summarize, Translate, OCR, dll
│   ├── image.js          ← AI Image Generator
│   ├── utilitas.js       ← QR, Password, UUID, Ping, dll
│   ├── kalkulator.js     ← Kalkulator, BMI, Cicilan, Zakat
│   ├── berita.js         ← Berita, Kurs, Crypto
│   ├── reminder.js       ← Sistem Reminder Otomatis
│   ├── group.js          ← Manajemen Grup
│   ├── tiktok.js         ← TikTok Downloader
│   ├── menu.js           ← Sistem Menu
│   │
│   ├── economy.js        ← Casino, Daily, Balance, dll
│   ├── profile.js        ← Profil & Net Worth
│   ├── [... dan lainnya]
│
└── temp/                 ← File temporary (auto-created)
```

---

## 📋 Daftar Perintah Lengkap

### 🤖 AI System
| Perintah | Fungsi |
|----------|--------|
| `!ai <tanya>` | Chat dengan AI |
| `!ai0/1/2/3` | Tier model AI (0=premium, 3=cepat) |
| `!persona` | Lihat & ganti karakter AI (10 persona) |
| `!aianalysis` | Analisis gambar dengan AI Vision |
| `!aistat` | Statistik penggunaan AI |
| `!resetai` | Reset memori AI |
| `!sharechat` | Share riwayat chat ke link |

### 🎭 Persona AI Tersedia
`default` `english` `coder` `motivator` `chef` `dokter` `lawyer` `psikolog` `penulis` `bisnis`

### 🛠️ AI Tools
| Perintah | Fungsi |
|----------|--------|
| `!summarize <link/teks>` | Ringkas artikel/teks |
| `!translate [lang] <teks>` | Terjemah (15+ bahasa) |
| `!ocr` | Baca teks dari gambar |
| `!codereview <kode>` | Review & debug kode |
| `!improve <teks>` | Perbaiki tulisan |
| `!grammar <teks>` | Cek grammar |
| `!sentiment <teks>` | Analisis sentimen |
| `!explain <topik>` | Penjelasan sederhana |
| `!keywords <teks>` | Ekstrak kata kunci |
| `!fakta <pernyataan>` | Fact-check |

### 🎨 Image Generator
| Perintah | Fungsi |
|----------|--------|
| `!img <deskripsi>` | Generate gambar AI |
| `!imgstyle <style> <deskripsi>` | Generate dengan style |
| `!imgvariasi <deskripsi>` | 3 variasi gambar |
| `!imghelp` | Bantuan & daftar style |

### ⏰ Reminder
| Perintah | Fungsi |
|----------|--------|
| `!remind 30m Minum obat` | Reminder 30 menit lagi |
| `!remind 08:00 Meeting` | Reminder jam 08:00 |
| `!remind 1d Bayar tagihan` | Reminder 1 hari lagi |
| `!remind 25/12 HUT RI` | Reminder tanggal tertentu |
| `!remindlist` | Lihat semua reminder |
| `!reminddel <ID>` | Hapus reminder |

### 👥 Group Management (khusus admin)
| Perintah | Fungsi |
|----------|--------|
| `!tagall [pesan]` | Tag semua anggota |
| `!hidetag [pesan]` | Tag tersembunyi |
| `!kick` | Keluarkan anggota (reply/mention) |
| `!add <nomor>` | Tambahkan anggota |
| `!promote` | Jadikan admin |
| `!demote` | Turunkan dari admin |
| `!groupinfo` | Info grup detail |
| `!antilink` | Toggle anti-link |
| `!antispam` | Toggle anti-spam |
| `!welcome <pesan>` | Set welcome message |
| `!goodbye <pesan>` | Set goodbye message |
| `!mute` / `!unmute` | Bisukan/buka grup |
| `!setrules <aturan>` | Set peraturan grup |
| `!rules` | Lihat peraturan grup |
| `!listadmin` | Daftar admin grup |
| `!idgrup` | Melihat ID dari grup saat ini |

### 🔢 Kalkulator & Konversi
| Perintah | Fungsi |
|----------|--------|
| `!kalk <ekspresi>` | Kalkulator matematika |
| `!persen 20 dari 500000` | Hitung persen/diskon |
| `!bmi <berat> <tinggi>` | Hitung BMI |
| `!cicilan <pokok> <bunga> <tenor>` | Simulasi kredit |
| `!zakat <penghasilan>` | Kalkulator zakat |
| `!konversi 5 km ke mile` | Konversi satuan |

### 🔧 Utilitas
| Perintah | Fungsi |
|----------|--------|
| `!qr <teks/link>` | Buat QR Code |
| `!password [panjang] [type]` | Generate password |
| `!uuid` | Generate UUID |
| `!base64 encode/decode <teks>` | Base64 |
| `!md5 <teks>` | Hash MD5/SHA |
| `!ip [alamat]` | Info IP address |
| `!ping <url>` | Ping website |
| `!waktu` | Waktu kota dunia |
| `!countdown <DD/MM/YYYY>` | Countdown ke tanggal |

### 📰 Info & Berita
| Perintah | Fungsi |
|----------|--------|
| `!berita [kategori]` | Berita terkini |
| `!kurs` | Kurs mata uang |
| `!dollar` | Kurs USD/IDR |
| `!btc` | Harga crypto |
| `!cuaca <kota>` | Cuaca hari ini |
| `!prakiraan <kota>` | Prakiraan 5 hari |

### 📥 Download
| Perintah | Fungsi |
|----------|--------|
| `!tiktok <link>` | Download TikTok tanpa watermark |
| `!s` / `!sticker` | Buat stiker dari gambar/video |
| `!tts <teks>` | Text-to-Speech |

### 💰 Ekonomi
| Perintah | Fungsi |
|----------|--------|
| `!daily` | Klaim harian |
| `!balance` / `!coin` | Cek saldo |
| `!casino <bet>` | Casino |
| `!transfer @user <jumlah>` | Transfer koin |
| `!bank` | Banking |
| `!profile` | Profil & net worth |
| `!leaderboard` | Peringkat kekayaan |

### 📋 Menu
```
!menu              — Menu utama
!menu ai           — AI & Persona
!menu aitools      — AI Tools
!menu image        — Image Generator
!menu kalk         — Kalkulator
!menu tools        — Utilitas
!menu info         — Berita & Info
!menu reminder     — Reminder
!menu group        — Manajemen Grup
!menu ekonomi      — Ekonomi & Game
!menu download     — Downloader
```

---

## ⚙️ Environment Variables

| Variabel | Wajib | Keterangan |
|----------|-------|------------|
| `OWNER_NUMBER` | ✅ | Nomor HP owner (628xxx) |
| `OPENROUTER_API_KEY` | ✅ | API key dari openrouter.ai |
| `BOT_NAME` | ❌ | Nama bot (default: Algojo Bot) |
| `PREFIX` | ❌ | Prefix command (default: !) |
| `ADMIN_NUMBERS` | ❌ | Nomor admin tambahan |
| `PORT` | ❌ | Port server (default: 3000) |
| `REMOVE_BG_API_KEY` | ❌ | Untuk fitur !bg |
| `NODE_ENV` | ❌ | development/production |
| `ALLOWED_GROUPS` | ❌ | ID grup yang diizinkan, dipisah koma |

---

## 🐳 Deploy ke Koyeb/Railway

```bash
# Build & push
docker build -t algojo-bot .
docker run -d --env-file .env algojo-bot
```

---

## 🔑 Cara Dapat API Key

1. **OpenRouter** (AI — WAJIB): https://openrouter.ai
   - Register → Dashboard → API Keys → Create Key
   - Ada model gratis tersedia!

2. **Remove.bg** (optional): https://www.remove.bg/api
   - 50 gambar/bulan gratis

---

## ❓ Troubleshooting

**Bot tidak connect?**
→ Hapus folder `session/` dan scan QR ulang.

**AI tidak response?**
→ Cek `OPENROUTER_API_KEY` di `.env`. Pastikan punya kredit.

**Reminder tidak terkirim?**
→ Pastikan `node-cron` terinstall: `npm install node-cron`

**Error "Cannot find module"?**
→ Jalankan `npm install` di folder `commands/`
