# ⚽ WA Football Manager v2

Bot WhatsApp Football Manager lengkap — transfer market, press conference, random events, pengembangan pemain.

---

## 🚀 Setup

### 1. Install dependencies
```powershell
cd wa-fm-v2
npm install
```

### 2. Import data pemain (Kaggle FIFA 25)

Download dataset dari:
👉 **https://www.kaggle.com/datasets/stefanoleone992/fifa-25-complete-player-dataset**

Letakkan file-file ini di folder `data/`:
```
data/
├── players_25.csv   ← WAJIB
└── clubs_25.csv     ← Opsional
```

Lalu jalankan import:
```powershell
npm run import-players
```

Ini akan import **Premier League + La Liga + Liga 1 Indonesia** secara otomatis.

### 3. Setup .env
```powershell
copy .env.example .env
```
Edit `.env`, isi `GROUP_ID` (jalankan bot dulu tanpa GROUP_ID untuk dapat ID grup).

### 4. Jalankan bot
```powershell
npm start
```

---

## 🎮 Cara Main

### Alur Permainan
```
!daftar          → Pilih tim yang mau dikontrol
!mulai           → Mulai musim liga
!main            → Main pertandingan hari ini
                    ↓
              [Press conference pra-match]
                    ↓
              [Babak 1 berjalan...]
                    ↓
           [Random events muncul tiba-tiba:]
           "⚡ Pemainmu cedera! Mau sub siapa?"
           "🟥 Kartu merah! Ubah taktik?"
           "😰 Tertinggal 2 gol! Strategi?"
                    ↓
              [Halftime team talk]
                    ↓
              [Babak 2 berjalan...]
                    ↓
              [Post-match interview]
!next            → Lanjut matchday berikutnya
```

---

## 📋 Daftar Perintah Lengkap

### Pertandingan
| Perintah | Fungsi |
|---|---|
| `!main` | Main pertandingan hari ini |
| `!next` | Lanjut ke matchday berikutnya |

### Info
| Perintah | Fungsi |
|---|---|
| `!klasemen` | Klasemen liga |
| `!jadwal` | Jadwal matchday ini |
| `!timku` | Info tim & statistik |
| `!pemain` | Skuad lengkap |
| `!topscorer` | Top scorer liga |
| `!cedera` | Laporan cedera |
| `!kontrak` | Kontrak hampir habis |

### Transfer
| Perintah | Fungsi |
|---|---|
| `!cari [nama/posisi]` | Cari pemain di pasar |
| `!beli [nama]` | Beli pemain |
| `!jual [nama]` | Jual pemain |
| `!pinjam [nama]` | Pinjamkan pemain |
| `!freeagent` | Daftar free agent |
| `!keuangan` | Ringkasan keuangan |

### Taktik
| Perintah | Fungsi |
|---|---|
| `!formasi [f]` | Ubah formasi (4-3-3, 4-4-2, dll) |
| `!style [s]` | Gaya bermain (attacking/defensive/dll) |

### Interaksi
| Perintah | Fungsi |
|---|---|
| `!bicara [nama]` | Bicara dengan pemain |

---

## ⚡ Sistem Random Events

Selama pertandingan, bot bisa tiba-tiba kirim pesan seperti:

```
🚑 MENIT 34 — CEDERA!
Bruno Fernandes mengalami Cedera hamstring!

Pemain yang bisa masuk:
1. Marcus Rashford (ST) ⭐82
2. Antony (RW) ⭐79
3. Alejandro Garnacho (LW) ⭐78

Balas nomor atau "skip"
```

```
🟥 MENIT 67 — KARTU MERAH!
Casemiro diusir! 10 vs 11!

Ubah taktik?
1. Bertahan ketat
2. Tetap balanced
3. Tetap menyerang
```

```
😰 MENIT 78 — TERTINGGAL 2 GOL!
Strategi darurat?
1. All out attack
2. Ganti pemain menyerang
3. Minta kerja lebih keras
...
```

---

## 📁 Struktur Project

```
wa-fm-v2/
├── index.js
├── package.json
├── .env.example
├── data/
│   ├── players_25.csv    ← Download dari Kaggle
│   └── game.db           ← Auto-created
├── scripts/
│   └── import-players.js ← Jalankan sekali
└── src/
    ├── engine/
    │   ├── match.js       ← Markov Chain + random events
    │   ├── league.js      ← Liga manager
    │   ├── transfer.js    ← Transfer market & finance
    │   └── press.js       ← Press conf, team talk
    ├── bot/
    │   └── commands.js    ← Command handlers
    └── db/
        └── database.js    ← SQLite schema
```

---

## Liga yang Diimport
- 🏴󠁧󠁢󠁥󠁮󠁧󠁿 **Premier League** (England)
- 🇪🇸 **La Liga** (Spain)
- 🇮🇩 **Liga 1** (Indonesia)

Liga bisa ditambah dengan edit `LEAGUES_TO_IMPORT` di `scripts/import-players.js`