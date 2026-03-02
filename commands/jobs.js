const { tambahIncome } = require('./pajak');
const { saveDB } = require('../helpers/database');

const fmt = (num) => Math.floor(Number(num)).toLocaleString('id-ID');

// ============================================================
// 📚 BANK SOAL — 20 Soal per Tier
// ============================================================
const SOAL = {

    // ── TIER 1 — Entry Level (Mudah, seputar pertanian/bangunan/nelayan) ───
    1: [
        { q: "Apa kepanjangan NPK dalam pupuk pertanian?", a: "A", opt: { A: "Nitrogen, Fosfor, Kalium", B: "Natrium, Protein, Karbon", C: "Nitrat, Pupuk, Kapur", D: "Nitrogen, Pupuk, Kalium" } },
        { q: "Berapa kali musim tanam padi di Indonesia umumnya dalam setahun?", a: "B", opt: { A: "1 kali", B: "2-3 kali", C: "4 kali", D: "5 kali" } },
        { q: "Alat apa yang dipakai kuli bangunan untuk mengaduk semen?", a: "C", opt: { A: "Cangkul", B: "Linggis", C: "Molen/Mixer", D: "Gergaji" } },
        { q: "Baju APD wajib yang harus dipakai kuli bangunan adalah?", a: "D", opt: { A: "Jas hujan", B: "Baju renang", C: "Seragam kantor", D: "Helm & sepatu safety" } },
        { q: "Padi yang sudah dipanen disimpan dalam bentuk apa sebelum digiling?", a: "B", opt: { A: "Tepung", B: "Gabah", C: "Beras merah", D: "Dedak" } },
        { q: "Berapa kg beras yang dihasilkan dari 1 kg gabah?", a: "C", opt: { A: "1 kg", B: "0.3 kg", C: "0.6-0.65 kg", D: "2 kg" } },
        { q: "Tanah paling cocok untuk menanam jagung adalah?", a: "A", opt: { A: "Tanah lempung berpasir", B: "Tanah liat murni", C: "Tanah pasir murni", D: "Tanah kapur" } },
        { q: "Hama utama tanaman padi yang paling merugikan petani adalah?", a: "B", opt: { A: "Kupu-kupu", B: "Wereng batang coklat", C: "Lebah madu", D: "Jangkrik" } },
        { q: "Apa yang dimaksud 'musim paceklik' bagi nelayan?", a: "A", opt: { A: "Musim sulit dapat ikan karena cuaca buruk", B: "Musim panen ikan melimpah", C: "Musim beli kapal baru", D: "Libur melaut" } },
        { q: "Alat pancing yang paling umum digunakan nelayan tradisional adalah?", a: "D", opt: { A: "Senapan bawah air", B: "Bom ikan", C: "Drone", D: "Joran dan kenur" } },
        { q: "Jenis ikan air tawar yang paling mudah dibudidayakan pemula adalah?", a: "C", opt: { A: "Arwana", B: "Arapaima", C: "Lele & Nila", D: "Koi" } },
        { q: "Pupuk organik paling mudah dibuat dari limbah rumah tangga adalah?", a: "A", opt: { A: "Kompos", B: "Urea", C: "ZA", D: "KCL" } },
        { q: "Bahan baku utama pembuatan bata merah adalah?", a: "B", opt: { A: "Pasir", B: "Tanah liat", C: "Batu kapur", D: "Semen" } },
        { q: "Semen Portland Type I digunakan untuk?", a: "D", opt: { A: "Konstruksi laut", B: "Kondisi panas ekstrem", C: "Tambang bawah tanah", D: "Konstruksi umum biasa" } },
        { q: "Apa fungsi waterpass pada pekerjaan bangunan?", a: "A", opt: { A: "Mengukur kerataan bidang", B: "Mengukur panjang", C: "Mengukur sudut miring", D: "Menghitung volume" } },
        { q: "Waktu optimal menyiram tanaman padi per hari adalah?", a: "C", opt: { A: "30 menit", B: "8 jam", C: "2-3 jam", D: "Tidak perlu disiram" } },
        { q: "Apa itu 'sistem bagi hasil' maro antara petani dan pemilik lahan?", a: "B", opt: { A: "Petani tidak bayar apapun", B: "Hasil panen dibagi dua sama rata", C: "Petani bayar sewa tetap", D: "Pemilik lahan yang kerja" } },
        { q: "Berapa standar UMR minimum di Indonesia (2024) per bulan?", a: "D", opt: { A: "Rp 200.000", B: "Rp 500.000", C: "Tidak ada standar", D: "Rp 2.000.000 ke atas" } },
        { q: "Kedalaman berapa yang baik untuk mancing ikan laut dalam?", a: "A", opt: { A: "50-200 meter", B: "1-5 meter", C: "5-10 meter", D: "500 meter ke atas" } },
        { q: "Jenis ikan yang paling banyak dikonsumsi masyarakat Indonesia adalah?", a: "C", opt: { A: "Salmon & Trout", B: "Cod & Haddock", C: "Tuna & Bandeng", D: "Patin & Mujair" } },
    ],

    // ── TIER 2 — Menengah (Peternakan, Ojol, Kuliner) ──────────
    2: [
        { q: "Suhu ideal kandang ayam broiler yang baru menetas adalah?", a: "B", opt: { A: "20°C", B: "33-35°C", C: "40°C", D: "15°C" } },
        { q: "Vaksin wajib diberikan pada sapi sebelum dijual adalah?", a: "C", opt: { A: "Vaksin Covid", B: "Vaksin Rabies", C: "Vaksin Anthrax & PMK", D: "Vaksin Malaria" } },
        { q: "SIM apa yang diperlukan pengemudi ojek online?", a: "A", opt: { A: "SIM C", B: "SIM A", C: "SIM B1", D: "SIM D" } },
        { q: "Teknik memasak menggunakan uap panas disebut?", a: "D", opt: { A: "Sautéing", B: "Grilling", C: "Braising", D: "Steaming" } },
        { q: "FCR (Feed Conversion Ratio) dalam peternakan berarti?", a: "A", opt: { A: "Pakan yang dibutuhkan untuk naik 1 kg berat badan", B: "Jumlah kandang yang dibutuhkan", C: "Harga pakan per kg", D: "Frekuensi pemberian makan" } },
        { q: "Chef yang bertanggung jawab atas dapur secara keseluruhan disebut?", a: "B", opt: { A: "Sous Chef", B: "Head Chef / Executive Chef", C: "Pastry Chef", D: "Line Cook" } },
        { q: "Berapa lama masa inkubasi telur ayam kampung?", a: "C", opt: { A: "7 hari", B: "14 hari", C: "21 hari", D: "30 hari" } },
        { q: "Suhu berapa yang aman untuk menyimpan daging segar?", a: "A", opt: { A: "0-4°C", B: "15°C", C: "25°C", D: "-20°C wajib" } },
        { q: "HACCP dalam industri makanan singkatan dari?", a: "D", opt: { A: "Hot And Cold Cooking Process", B: "Healthy Affordable Culinary Chef Program", C: "High Accuracy Catering Control Plan", D: "Hazard Analysis Critical Control Point" } },
        { q: "Antibiotik hewan tidak boleh diberikan berapa hari sebelum pemotongan?", a: "B", opt: { A: "1 hari", B: "7-14 hari (withdrawal period)", C: "1 jam", D: "Boleh kapan saja" } },
        { q: "Penyakit Mulut dan Kuku (PMK) menyerang hewan?", a: "A", opt: { A: "Sapi, kambing, babi, domba", B: "Ayam & unggas", C: "Ikan & reptil", D: "Kucing & anjing" } },
        { q: "Teknik knife yang benar untuk memotong sayur julienne adalah?", a: "C", opt: { A: "Dipotong dadu besar", B: "Dihancurkan", C: "Dipotong korek api tipis panjang", D: "Diparut" } },
        { q: "Rating driver ojol turun jika?", a: "D", opt: { A: "Cuaca hujan", B: "Macet parah", C: "HP low battery", D: "Pelanggan memberi nilai rendah" } },
        { q: "Minyak paling sehat untuk memasak suhu tinggi adalah?", a: "B", opt: { A: "Minyak zaitun extra virgin", B: "Minyak kelapa/sawit refined", C: "Mentega", D: "Margarin" } },
        { q: "Hewan ternak dengan masa bunting terpanjang adalah?", a: "A", opt: { A: "Gajah (22 bulan)", B: "Sapi (9 bulan)", C: "Kambing (5 bulan)", D: "Babi (4 bulan)" } },
        { q: "Sertifikasi chef profesional internasional dikeluarkan oleh?", a: "C", opt: { A: "WHO", B: "ISO", C: "ACF (American Culinary Federation) / WACS", D: "UNESCO" } },
        { q: "Batas maksimal berat muatan motor ojol sesuai aturan adalah?", a: "D", opt: { A: "500 kg", B: "200 kg", C: "Tidak ada batas", D: "150 kg" } },
        { q: "Tarif dasar ojol dihitung berdasarkan?", a: "A", opt: { A: "Jarak (km) + waktu + zona", B: "Waktu perjalanan saja", C: "Berat penumpang", D: "Merek motor" } },
        { q: "Aplikasi wajib driver Gojek adalah?", a: "B", opt: { A: "Grab Driver", B: "Gojek Driver App", C: "Maxim", D: "InDriver" } },
        { q: "Apa itu 'blanching' dalam teknik memasak?", a: "C", opt: { A: "Memanggang di oven", B: "Menggoreng dalam minyak banyak", C: "Merebus singkat lalu langsung didinginkan di air es", D: "Mengukus selama 1 jam" } },
    ],

    // ── TIER 3 — Profesional (Hukum, Medis, Pendidikan, Kepolisian) ───
    3: [
        { q: "UU Pendidikan Nasional Indonesia diatur dalam UU nomor berapa?", a: "C", opt: { A: "UU No. 8 Tahun 1974", B: "UU No. 13 Tahun 2003", C: "UU No. 20 Tahun 2003", D: "UU No. 5 Tahun 2014" } },
        { q: "Pasal berapa KUHP yang mengatur tentang pencurian biasa?", a: "B", opt: { A: "Pasal 263", B: "Pasal 362", C: "Pasal 378", D: "Pasal 310" } },
        { q: "Dokter spesialis jantung disebut?", a: "D", opt: { A: "Neurolog", B: "Ortopedi", C: "Urolog", D: "Kardiolog" } },
        { q: "Apa yang dimaksud 'golden hour' dalam dunia medis?", a: "A", opt: { A: "1 jam pertama setelah cedera/serangan jantung yang kritis", B: "Jam operasional RS terbaik", C: "Waktu istirahat dokter", D: "Waktu terbaik untuk operasi" } },
        { q: "Polisi dengan pangkat bintang satu disebut?", a: "B", opt: { A: "Kombes Pol", B: "Brigjen Pol", C: "Irjen Pol", D: "Kompol" } },
        { q: "Alat ukur tekanan darah disebut?", a: "D", opt: { A: "Termometer", B: "Stetoskop", C: "Oximeter", D: "Sphygmomanometer" } },
        { q: "Kurikulum terbaru pendidikan Indonesia (2022) disebut?", a: "A", opt: { A: "Kurikulum Merdeka", B: "Kurikulum 2013", C: "KTSP", D: "KBK" } },
        { q: "SKCK singkatan dari?", a: "C", opt: { A: "Surat Keterangan Catatan Keamanan", B: "Surat Keterangan Catatan Keluarga", C: "Surat Keterangan Catatan Kepolisian", D: "Surat Keterangan Catatan Kriminal" } },
        { q: "Tindakan pertolongan pertama pada pasien tidak sadar yang tidak bernapas adalah?", a: "B", opt: { A: "Diberi minum air putih", B: "CPR (Cardiopulmonary Resuscitation)", C: "Ditepuk punggungnya", D: "Ditunggu sadar sendiri" } },
        { q: "RPP dalam dunia pendidikan singkatan dari?", a: "A", opt: { A: "Rencana Pelaksanaan Pembelajaran", B: "Rancangan Program Pendidikan", C: "Rekap Penilaian Peserta", D: "Rapat Panitia Pengajar" } },
        { q: "Laporan polisi Model A berarti?", a: "D", opt: { A: "Laporan dari saksi", B: "Laporan dari jaksa", C: "Laporan anonim", D: "Melapor atas kemauan sendiri" } },
        { q: "Obat golongan narkotika diatur dalam UU nomor?", a: "C", opt: { A: "UU No. 5 Tahun 1997", B: "UU No. 36 Tahun 2009", C: "UU No. 35 Tahun 2009", D: "UU No. 44 Tahun 2009" } },
        { q: "Evaluasi pembelajaran yang dilakukan saat proses belajar berlangsung disebut?", a: "B", opt: { A: "Evaluasi sumatif", B: "Evaluasi formatif", C: "Evaluasi diagnostik", D: "Evaluasi akhir" } },
        { q: "Sumpah dokter Indonesia mengacu pada sumpah?", a: "A", opt: { A: "Sumpah Hippocrates", B: "Sumpah Pancasila", C: "Sumpah Jabatan", D: "Sumpah Pemuda" } },
        { q: "Dalam hukum pidana, delik aduan artinya?", a: "D", opt: { A: "Pelaku mengaku sendiri", B: "Polisi bertindak tanpa laporan", C: "Jaksa langsung menuntut", D: "Hanya bisa diproses jika ada laporan dari korban" } },
        { q: "Berapa SKS minimal meraih gelar Sarjana (S1) di Indonesia?", a: "A", opt: { A: "144 SKS", B: "80 SKS", C: "200 SKS", D: "120 SKS" } },
        { q: "Triage dalam UGD rumah sakit bertujuan untuk?", a: "C", opt: { A: "Mendaftarkan pasien baru", B: "Menghitung tagihan RS", C: "Menentukan prioritas penanganan pasien", D: "Mengisi rekam medis" } },
        { q: "Polisi berpangkat AKBP setara dengan golongan?", a: "B", opt: { A: "Perwira Pertama", B: "Perwira Menengah", C: "Perwira Tinggi", D: "Bintara" } },
        { q: "Rekam medis pasien wajib disimpan minimal berapa tahun?", a: "A", opt: { A: "5 tahun sejak kunjungan terakhir", B: "1 tahun", C: "10 tahun", D: "Selamanya" } },
        { q: "Metode pembelajaran yang berpusat pada siswa disebut?", a: "D", opt: { A: "Teacher-centered learning", B: "Ceramah klasikal", C: "Hafalan", D: "Student-centered learning" } },
    ],

    // ── TIER 4 — Elite (Hukum lanjutan, IT, Penerbangan) ───────
    4: [
        { q: "Dalam hukum perdata, daluarsa gugatan umum berapa tahun?", a: "C", opt: { A: "1 tahun", B: "5 tahun", C: "30 tahun (Pasal 1967 KUHPerdata)", D: "10 tahun" } },
        { q: "Protokol jaringan untuk komunikasi web aman adalah?", a: "B", opt: { A: "HTTP", B: "HTTPS (TLS/SSL)", C: "FTP", D: "SMTP" } },
        { q: "Batas ketinggian jelajah pesawat komersial umumnya adalah?", a: "D", opt: { A: "5.000 kaki", B: "15.000 kaki", C: "25.000 kaki", D: "35.000-42.000 kaki" } },
        { q: "Big O notation O(n²) menggambarkan kompleksitas?", a: "A", opt: { A: "Quadratic — waktu tumbuh kuadrat seiring input", B: "Linear", C: "Konstan", D: "Logaritmik" } },
        { q: "VOR dalam penerbangan singkatan dari?", a: "C", opt: { A: "Very Old Radar", B: "Vertical Observation Range", C: "VHF Omnidirectional Range", D: "Visual Operation Report" } },
        { q: "Asas 'presumption of innocence' berarti?", a: "B", opt: { A: "Terdakwa pasti bersalah", B: "Seseorang tidak bersalah sampai terbukti sebaliknya", C: "Hakim tidak perlu bukti", D: "Jaksa selalu benar" } },
        { q: "Pola arsitektur software MVC singkatan dari?", a: "D", opt: { A: "Multiple Virtual Components", B: "Modern Variable Control", C: "Main View Container", D: "Model View Controller" } },
        { q: "Lisensi pilot komersial (CPL) dikeluarkan oleh?", a: "A", opt: { A: "ICAO & DGCA (Ditjen Perhubungan Udara)", B: "Kepolisian", C: "Kementerian Pendidikan", D: "BPOM" } },
        { q: "Dalam kontrak hukum, force majeure berarti?", a: "C", opt: { A: "Kontrak dibatalkan sepihak", B: "Harga berubah sewaktu-waktu", C: "Kejadian di luar kendali para pihak (bencana, perang)", D: "Denda keterlambatan" } },
        { q: "Struktur data yang menggunakan prinsip LIFO adalah?", a: "B", opt: { A: "Queue", B: "Stack", C: "Linked List", D: "Tree" } },
        { q: "MAYDAY dalam penerbangan diucapkan berapa kali saat darurat?", a: "D", opt: { A: "1 kali", B: "2 kali", C: "4 kali", D: "3 kali" } },
        { q: "Perbuatan melawan hukum dalam perdata diatur pasal?", a: "A", opt: { A: "Pasal 1365 KUHPerdata", B: "Pasal 362 KUHP", C: "Pasal 1313 KUHPerdata", D: "Pasal 1234 KUHPerdata" } },
        { q: "Dalam database, ACID singkatan dari?", a: "C", opt: { A: "Array, Class, Index, Data", B: "Access, Create, Insert, Delete", C: "Atomicity, Consistency, Isolation, Durability", D: "Authentication, Control, Integrity, Data" } },
        { q: "Transponder pada pesawat berfungsi untuk?", a: "B", opt: { A: "Menyalakan lampu kabin", B: "Mengirim sinyal identifikasi ke radar ATC", C: "Mengatur tekanan kabin", D: "Autopilot" } },
        { q: "Legal standing dalam hukum berarti?", a: "D", opt: { A: "Posisi duduk di pengadilan", B: "Biaya perkara", C: "Lamanya persidangan", D: "Hak untuk mengajukan gugatan" } },
        { q: "Enkripsi asimetris menggunakan?", a: "A", opt: { A: "Public key & Private key", B: "Satu kunci yang sama", C: "Password pengguna", D: "Token sementara" } },
        { q: "ILS dalam penerbangan adalah sistem untuk?", a: "C", opt: { A: "Komunikasi antar pilot", B: "Pengisian bahan bakar udara", C: "Panduan mendarat saat visibilitas rendah", D: "Sistem hiburan penumpang" } },
        { q: "Prinsip OOP 'encapsulation' berarti?", a: "B", opt: { A: "Satu class bisa inherit class lain", B: "Data dan method dibungkus dalam satu unit, akses dikontrol", C: "Satu method bisa dipanggil berbeda", D: "Class tidak bisa diubah" } },
        { q: "Dalam hukum, 'in absentia' berarti?", a: "D", opt: { A: "Terdakwa hadir di sidang", B: "Hakim tidak hadir", C: "Saksi tidak ditemukan", D: "Persidangan tanpa kehadiran terdakwa" } },
        { q: "Runway 27 di bandara berarti arah?", a: "A", opt: { A: "270 derajat (arah Barat)", B: "27 derajat (arah Timur Laut)", C: "Panjang runway 27 km", D: "Kapasitas 27 pesawat" } },
    ],

    // ── TIER 5 — Crazy Rich (Korporasi, Ekonomi Makro, Politik) ─
    5: [
        { q: "ROE (Return on Equity) dihitung dengan rumus?", a: "C", opt: { A: "Aset / Hutang", B: "Pendapatan / Aset", C: "Laba Bersih / Ekuitas × 100%", D: "Modal / Penjualan" } },
        { q: "RUPS dalam UU No. 40/2007 singkatan dari?", a: "B", opt: { A: "Rapat Umum Pekerja Sipil", B: "Rapat Umum Pemegang Saham", C: "Rapat Utama Pengurus Swasta", D: "Rapat Umum Perseroan Sipil" } },
        { q: "Indeks saham utama Indonesia adalah?", a: "D", opt: { A: "Dow Jones", B: "NASDAQ", C: "Nikkei", D: "IHSG (Indeks Harga Saham Gabungan)" } },
        { q: "Pasal UUD 1945 yang mengatur tentang DPR/MPR adalah?", a: "A", opt: { A: "Pasal 19-22D", B: "Pasal 1-5", C: "Pasal 30-34", D: "Pasal 7-10" } },
        { q: "Strategi bisnis Blue Ocean berarti?", a: "C", opt: { A: "Bersaing habis-habisan di pasar yang ada", B: "Meniru kompetitor terkuat", C: "Menciptakan pasar baru tanpa kompetitor", D: "Menjual produk murah massal" } },
        { q: "Stagflasi dalam ekonomi makro adalah kondisi?", a: "B", opt: { A: "Pertumbuhan tinggi + inflasi rendah", B: "Pertumbuhan stagnan + inflasi tinggi bersamaan", C: "Deflasi + pengangguran rendah", D: "Surplus APBN" } },
        { q: "Oligopoli dalam ekonomi berarti pasar dikuasai oleh?", a: "D", opt: { A: "Satu produsen", B: "Banyak produsen kecil", C: "Pemerintah sepenuhnya", D: "Segelintir perusahaan besar" } },
        { q: "EBITDA singkatan dari?", a: "A", opt: { A: "Earnings Before Interest, Tax, Depreciation, Amortization", B: "Estimated Business Income Total Daily Average", C: "Equity Balance Income Tax Deduction Allowance", D: "Enterprise Budget Including Tax, Dividend, Assets" } },
        { q: "Quorum rapat DPR umumnya membutuhkan kehadiran?", a: "C", opt: { A: "25% anggota", B: "40% anggota", C: "Lebih dari 50% anggota", D: "100% anggota" } },
        { q: "Due diligence dalam proses M&A berarti?", a: "B", opt: { A: "Penandatanganan kontrak", B: "Investigasi menyeluruh kondisi keuangan & hukum target", C: "Negosiasi harga awal", D: "Pengumuman ke publik" } },
        { q: "Teori trickle-down economics menyatakan bahwa?", a: "D", opt: { A: "Orang miskin harus dibantu langsung", B: "Pajak harus dinaikkan untuk orang kaya", C: "Semua kekayaan harus diratakan", D: "Keuntungan kelompok kaya akan mengalir ke bawah secara alami" } },
        { q: "IPO (Initial Public Offering) adalah?", a: "A", opt: { A: "Penawaran saham perdana perusahaan ke publik", B: "Penarikan saham dari bursa", C: "Laporan keuangan tahunan", D: "Rapat direksi pertama" } },
        { q: "Hak recall anggota DPR dimiliki oleh?", a: "C", opt: { A: "Presiden", B: "Mahkamah Agung", C: "Partai politik yang mengusung", D: "Rakyat melalui referendum" } },
        { q: "Porter's Five Forces: 'bargaining power of buyers' mengukur?", a: "B", opt: { A: "Kekuatan supplier", B: "Kemampuan pembeli menekan harga & syarat", C: "Ancaman produk substitusi", D: "Persaingan antar kompetitor" } },
        { q: "Debt-to-Equity Ratio ideal untuk perusahaan sehat adalah?", a: "D", opt: { A: "Di atas 5.0", B: "Tepat 3.0", C: "Tidak relevan", D: "Di bawah 1.0-2.0" } },
        { q: "Sovereign Wealth Fund (SWF) Indonesia bernama?", a: "A", opt: { A: "INA (Indonesia Investment Authority)", B: "BPJS Ketenagakerjaan", C: "Temasek", D: "GIC" } },
        { q: "Koalisi mayoritas di DPR membutuhkan minimal berapa persen kursi?", a: "C", opt: { A: "25%", B: "40%", C: "50% + 1 kursi", D: "75%" } },
        { q: "Hostile takeover dalam bisnis berarti?", a: "B", opt: { A: "Akuisisi dengan persetujuan manajemen", B: "Pengambilalihan tanpa persetujuan manajemen/direksi", C: "Merger sukarela", D: "IPO baru" } },
        { q: "UU Cipta Kerja (Omnibus Law) Indonesia disahkan tahun?", a: "D", opt: { A: "2018", B: "2019", C: "2021", D: "2020" } },
        { q: "Dalam laporan keuangan, 'goodwill' adalah?", a: "A", opt: { A: "Aset tak berwujud dari kelebihan harga beli atas nilai wajar aset target", B: "Donasi perusahaan", C: "Gaji direksi", D: "Cadangan kas darurat" } },
    ],
};

// ============================================================
// 💼 KONFIGURASI PROFESI
// ============================================================
const JOBS = {
    // ── TIER 1: ENTRY LEVEL ─────────────────────────────────────
    'kuli':     { role: "⛏️ Kuli Bangunan",      cost: 0,               salary: 150_000,       cooldown: 30,  tier: 1, desc: "Tidak butuh modal. Bonus: Lembur dapat uang tambahan." },
    'petani':   { role: "🌾 Petani Modern",       cost: 10_000_000,      salary: 400_000,       cooldown: 30,  tier: 1, desc: "Skill: Percepat panen semua tanaman 3 jam." },
    'nelayan':  { role: "🎣 Nelayan Andal",       cost: 15_000_000,      salary: 500_000,       cooldown: 30,  tier: 1, desc: "Skill: Dapat bonus ikan langka untuk dijual." },
    // ── TIER 2: MENENGAH ────────────────────────────────────────
    'peternak': { role: "🤠 Juragan Ternak",      cost: 25_000_000,      salary: 600_000,       cooldown: 30,  tier: 2, desc: "Skill: Bikin semua hewan lapar & bisa makan lagi." },
    'driver':   { role: "🚗 Driver Ojol",         cost: 30_000_000,      salary: 700_000,       cooldown: 30,  tier: 2, desc: "Skill: Dapat tip gede dari pelanggan." },
    'chef':     { role: "👨‍🍳 Chef Restoran",       cost: 50_000_000,      salary: 1_500_000,     cooldown: 60,  tier: 2, desc: "Skill: Menu spesial, profit 5-15 juta." },
    // ── TIER 3: PROFESIONAL ─────────────────────────────────────
    'guru':     { role: "📚 Guru Honorer",        cost: 75_000_000,      salary: 2_000_000,     cooldown: 60,  tier: 3, desc: "Skill: Boost XP diri sendiri +200." },
    'polisi':   { role: "👮 Polisi Siber",        cost: 100_000_000,     salary: 4_000_000,     cooldown: 60,  tier: 3, desc: "Pasif: Kebal rob. Skill: Razia dapat uang sitaan." },
    'dokter':   { role: "👨‍⚕️ Dokter Umum",         cost: 200_000_000,     salary: 8_000_000,     cooldown: 120, tier: 3, desc: "Skill: Sembuhkan diri sendiri (HP +50)." },
    // ── TIER 4: ELITE ───────────────────────────────────────────
    'pengacara':{ role: "⚖️ Pengacara",           cost: 500_000_000,     salary: 20_000_000,    cooldown: 120, tier: 4, desc: "Skill: Batalkan denda rob sekali per 12 jam." },
    'insinyur': { role: "👷 Insinyur IT",         cost: 750_000_000,     salary: 30_000_000,    cooldown: 120, tier: 4, desc: "Skill: Boost hashrate mining +20% selama 1 jam." },
    'pilot':    { role: "✈️ Pilot Komersial",     cost: 1_000_000_000,   salary: 50_000_000,    cooldown: 180, tier: 4, desc: "Skill: Bonus penerbangan random 10-50 juta." },
    // ── TIER 5: CRAZY RICH ──────────────────────────────────────
    'direktur': { role: "💼 Direktur Perusahaan", cost: 5_000_000_000,   salary: 200_000_000,   cooldown: 240, tier: 5, desc: "Skill: Semua properti 2x income selama 2 jam." },
    'senator':  { role: "🏛️ Senator",             cost: 20_000_000_000,  salary: 750_000_000,   cooldown: 360, tier: 5, desc: "Skill: Dana aspirasi 100-500 juta cair." },
    'oligarki': { role: "🤑 Oligarki",            cost: 100_000_000_000, salary: 3_000_000_000, cooldown: 720, tier: 5, desc: "Skill: Monopoli pasar, semua penjualan +50% selama 1 jam." },
};

const TIER_LABEL = { 1: "🟢 TIER 1 — Entry Level", 2: "🟡 TIER 2 — Menengah", 3: "🟠 TIER 3 — Profesional", 4: "🔴 TIER 4 — Elite", 5: "💎 TIER 5 — Crazy Rich" };

// Jumlah soal per sesi & nilai lulus
const SESI_SOAL   = { 1: 5, 2: 5, 3: 6, 4: 7, 5: 8 };
const NILAI_LULUS = { 1: 3, 2: 4, 3: 5, 4: 6, 5: 7 };

const MATERI = {
    1: "• Pertanian & bercocok tanam\n• Konstruksi bangunan & K3\n• Perikanan & budidaya ikan\n• Ekonomi dasar & UMR",
    2: "• Peternakan & kesehatan hewan\n• Regulasi kendaraan & SIM\n• Teknik memasak & food safety\n• Manajemen UMKM kuliner",
    3: "• Hukum pidana & perdata dasar\n• Kurikulum & pedagogik\n• Ilmu kedokteran & farmakologi dasar\n• Prosedur kepolisian & KUHP",
    4: "• Hukum acara perdata & pidana lanjutan\n• Algoritma & struktur data\n• Prosedur penerbangan & ATC\n• Keamanan siber & jaringan",
    5: "• Analisis laporan keuangan (EBITDA, ROE)\n• Hukum korporasi & UU PT\n• Strategi bisnis & M&A\n• Ekonomi makro & politik",
};

module.exports = async (command, args, msg, user, db) => {
    const validCommands = ['jobs', 'kerja', 'work', 'lamar', 'resign', 'skill', 'kursus', 'ujian', 'jawab'];
    if (!validCommands.includes(command)) return;

    if (!user.job)        user.job        = null;
    if (!user.lastWork)   user.lastWork   = 0;
    if (!user.lastSkill)  user.lastSkill  = 0;
    if (!user.xp)         user.xp         = 0;
    if (!user.sertifikat) user.sertifikat = [];
    if (!user.ujianAktif) user.ujianAktif = null;

    const now = Date.now();

    // ============================================================
    // 📋 !jobs
    // ============================================================
    if (command === 'jobs') {
        let txt = `💼 *BURSA KERJA & PROFESI* 💼\n`;
        txt += `_Kursus → Ujian → Sertifikat → Lamar!_\n\n`;

        if (user.job) {
            const cur = JOBS[user.job];
            const gphj = Math.floor(cur.salary / (cur.cooldown / 60));
            txt += `🆔 *Profesi Kamu:* ${cur.role}\n`;
            txt += `💰 Gaji: Rp ${fmt(cur.salary)} / ${cur.cooldown} mnt (≈Rp ${fmt(gphj)}/jam)\n`;
            txt += `🌟 ${cur.desc}\n\n_!kerja · !skill · !resign_\n`;
            txt += `${'─'.repeat(28)}\n\n`;
        } else {
            txt += `❌ *Kamu masih PENGANGGURAN.*\n${'─'.repeat(28)}\n\n`;
        }

        let lastTier = 0;
        for (let [code, job] of Object.entries(JOBS)) {
            if (job.tier !== lastTier) { txt += `\n${TIER_LABEL[job.tier]}\n`; lastTier = job.tier; }
            const gphj  = Math.floor(job.salary / (job.cooldown / 60));
            const lulus  = user.sertifikat.includes(code) ? ' 🎓' : '';
            const aktif  = user.job === code ? ' ✅' : '';
            txt += `▪️ *${job.role}*${aktif}${lulus} \`${code}\`\n`;
            txt += `   💸 Modal: ${job.cost === 0 ? 'GRATIS' : 'Rp ' + fmt(job.cost)} | 💵 Rp ${fmt(job.salary)}/${job.cooldown}mnt (Rp ${fmt(gphj)}/jam)\n`;
        }

        txt += `\n${'─'.repeat(28)}\n`;
        txt += `📚 \`!kursus <kode>\` — Lihat materi\n`;
        txt += `✍️ \`!ujian <kode>\` — Mulai ujian\n`;
        txt += `💼 \`!lamar <kode>\` — Lamar kerja\n`;
        txt += `🎓 = Sudah lulus ujian`;
        return msg.reply(txt);
    }

    // ============================================================
    // 📚 !kursus
    // ============================================================
    if (command === 'kursus') {
        const target = args[0]?.toLowerCase();
        if (!target || !JOBS[target]) return msg.reply("❌ Profesi tidak ditemukan. Cek `!jobs`.");

        const job      = JOBS[target];
        const tier     = job.tier;
        const jmlSoal  = SESI_SOAL[tier];
        const lulus    = NILAI_LULUS[tier];
        const sdLulus  = user.sertifikat.includes(target);

        let txt = `📚 *KURSUS: ${job.role}*\n\n`;
        txt += `🏷️ Tier    : ${TIER_LABEL[tier]}\n`;
        txt += `📝 Ujian   : ${jmlSoal} soal pilihan ganda\n`;
        txt += `✅ Lulus   : ${lulus}/${jmlSoal} benar\n`;
        txt += `⏳ Timeout : 30 menit\n`;
        txt += `⏸️ Cooldown: 30 menit jika gagal\n`;
        txt += `💰 Modal   : ${job.cost === 0 ? 'GRATIS' : 'Rp ' + fmt(job.cost)}\n\n`;
        txt += `📖 *MATERI UJIAN:*\n${MATERI[tier]}\n\n`;

        if (sdLulus) {
            txt += `🎓 *Kamu sudah LULUS ujian ini!*\n`;
            txt += `Ketik \`!lamar ${target}\` untuk melamar.`;
        } else {
            txt += `💡 Siap ujian? Ketik \`!ujian ${target}\``;
        }
        return msg.reply(txt);
    }

    // ============================================================
    // ✍️ !ujian
    // ============================================================
    if (command === 'ujian') {
        const target = args[0]?.toLowerCase();
        if (!target || !JOBS[target]) return msg.reply("❌ Profesi tidak ditemukan. Cek `!jobs`.");

        if (user.sertifikat.includes(target))
            return msg.reply(`🎓 Kamu sudah lulus ujian *${JOBS[target].role}*!\nLangsung \`!lamar ${target}\`.`);

        if (user.ujianCooldown && now < user.ujianCooldown) {
            const sisa = Math.ceil((user.ujianCooldown - now) / 60000);
            return msg.reply(`⏳ Gagal ujian tadi. Belajar dulu!\nBisa ujian lagi dalam *${sisa} menit*.`);
        }

        const job      = JOBS[target];
        const tier     = job.tier;
        const jmlSoal  = SESI_SOAL[tier];

        // Acak soal dari bank
        const bank     = [...SOAL[tier]];
        const terpilih = [];
        for (let i = 0; i < jmlSoal; i++) {
            const idx = Math.floor(Math.random() * bank.length);
            terpilih.push(bank.splice(idx, 1)[0]);
        }

        user.ujianAktif = {
            job: target, tier,
            soal: terpilih,
            kunci: terpilih.map(s => s.a),
            jawaban: [],
            idx: 0,
            startedAt: now,
        };
        saveDB(db);

        const s1  = terpilih[0];
        let txt   = `📝 *UJIAN: ${job.role}*\n`;
        txt += `Tier ${tier} | ${jmlSoal} soal | Lulus: ${NILAI_LULUS[tier]} benar\n`;
        txt += `${'─'.repeat(28)}\n\n`;
        txt += `*Soal 1/${jmlSoal}:*\n${s1.q}\n\n`;
        txt += `🅰️ ${s1.opt.A}\n🅱️ ${s1.opt.B}\n🇨 ${s1.opt.C}\n🇩 ${s1.opt.D}\n\n`;
        txt += `💡 \`!jawab A\` / \`!jawab B\` / dll`;
        return msg.reply(txt);
    }

    // ============================================================
    // 💬 !jawab
    // ============================================================
    if (command === 'jawab') {
        if (!user.ujianAktif)
            return msg.reply("❌ Kamu tidak sedang ujian.\nMulai dengan `!ujian <kode>`.");

        const sesi    = user.ujianAktif;
        const jawaban = args[0]?.toUpperCase();

        if (!['A', 'B', 'C', 'D'].includes(jawaban))
            return msg.reply("❌ Pilih: A, B, C, atau D.");

        // Cek timeout 30 menit
        if (now - sesi.startedAt > 30 * 60 * 1000) {
            user.ujianAktif  = null;
            user.ujianCooldown = now + (30 * 60 * 1000);
            saveDB(db);
            return msg.reply("⏰ *Waktu ujian habis!* (30 menit)\nCooldown 30 menit. Pelajari materinya dulu.");
        }

        sesi.jawaban.push(jawaban);
        const benar = jawaban === sesi.kunci[sesi.idx];
        sesi.idx++;

        const selesai = sesi.idx >= sesi.soal.length;

        if (!selesai) {
            const soalBaru = sesi.soal[sesi.idx];
            const nomer    = sesi.idx + 1;
            let txt  = benar ? `✅ *Benar!*\n\n` : `❌ *Salah!* (Jawaban: ${sesi.kunci[sesi.idx - 1]})\n\n`;
            txt += `*Soal ${nomer}/${sesi.soal.length}:*\n${soalBaru.q}\n\n`;
            txt += `🅰️ ${soalBaru.opt.A}\n🅱️ ${soalBaru.opt.B}\n🇨 ${soalBaru.opt.C}\n🇩 ${soalBaru.opt.D}\n\n`;
            txt += `💡 \`!jawab A/B/C/D\``;
            user.ujianAktif = sesi;
            saveDB(db);
            return msg.reply(txt);
        }

        // ── Hitung nilai ──────────────────────────────────────
        user.ujianAktif = null;
        let nilaiBenar  = 0;
        for (let i = 0; i < sesi.jawaban.length; i++) {
            if (sesi.jawaban[i] === sesi.kunci[i]) nilaiBenar++;
        }

        const job    = JOBS[sesi.job];
        const lulus  = nilaiBenar >= NILAI_LULUS[sesi.tier];
        const hasil  = benar ? '✅ Benar!' : `❌ Salah! (Jawaban: ${sesi.kunci[sesi.idx - 1]})`;

        let txt  = `${hasil}\n\n`;
        txt += `📊 *HASIL UJIAN: ${job.role}*\n`;
        txt += `${'─'.repeat(28)}\n`;
        txt += `Benar : ${nilaiBenar}/${sesi.soal.length}\n`;
        txt += `Lulus : ${NILAI_LULUS[sesi.tier]}/${sesi.soal.length}\n\n`;

        if (lulus) {
            if (!user.sertifikat.includes(sesi.job)) user.sertifikat.push(sesi.job);
            txt += `🎓 *SELAMAT! KAMU LULUS!* 🎉\n`;
            txt += `Sertifikat *${job.role}* berhasil diraih!\n\n`;
            txt += `💼 Ketik \`!lamar ${sesi.job}\` untuk melamar.`;
        } else {
            user.ujianCooldown = now + (30 * 60 * 1000);
            txt += `❌ *TIDAK LULUS.*\n`;
            txt += `Kurang ${NILAI_LULUS[sesi.tier] - nilaiBenar} jawaban benar.\n`;
            txt += `Pelajari: \`!kursus ${sesi.job}\`\n`;
            txt += `⏳ Ujian ulang bisa dalam 30 menit.`;
        }

        saveDB(db);
        return msg.reply(txt);
    }

    // ============================================================
    // ✍️ !lamar
    // ============================================================
    if (command === 'lamar') {
        const target = args[0]?.toLowerCase();

        if (user.job) return msg.reply(`❌ Kamu sudah jadi *${JOBS[user.job].role}*.\nKetik \`!resign\` dulu.`);
        if (!target || !JOBS[target]) return msg.reply("❌ Profesi tidak ditemukan. Cek `!jobs`.");

        const job = JOBS[target];

        if (!user.sertifikat.includes(target)) {
            return msg.reply(
                `❌ *Belum punya sertifikat ${job.role}!*\n\n` +
                `Urutan:\n1️⃣ \`!kursus ${target}\` — Pelajari materi\n` +
                `2️⃣ \`!ujian ${target}\` — Ikuti ujian\n` +
                `3️⃣ \`!lamar ${target}\` — Lamar setelah lulus`
            );
        }

        if (user.balance < job.cost) return msg.reply(
            `❌ Modal kurang!\nButuh: Rp ${fmt(job.cost)}\nSaldo: Rp ${fmt(user.balance)}`
        );

        user.balance  -= job.cost;
        user.job       = target;
        user.lastWork  = 0;
        user.lastSkill = 0;
        saveDB(db);

        return msg.reply(
            `🎉 *SELAMAT BERGABUNG!*\n` +
            `Kamu resmi jadi *${job.role}*! 🎓\n` +
            `💰 Gaji: Rp ${fmt(job.salary)} / ${job.cooldown} menit\n\n` +
            `Ketik \`!kerja\` untuk mulai!`
        );
    }

    // ============================================================
    // 🚪 !resign
    // ============================================================
    if (command === 'resign') {
        if (!user.job) return msg.reply("❌ Kamu sudah pengangguran.");
        const old = JOBS[user.job].role;
        user.job  = null;
        saveDB(db);
        return msg.reply(`👋 Resign dari *${old}*.\n_Sertifikat tetap tersimpan, bisa lamar lagi kapan saja._`);
    }

    // ============================================================
    // 🔨 !kerja
    // ============================================================
    if (command === 'kerja' || command === 'work') {
        if (!user.job) return msg.reply("❌ Pengangguran! `!lamar` dulu.");

        const job        = JOBS[user.job];
        const cooldownMs = job.cooldown * 60 * 1000;
        const diff       = now - user.lastWork;

        if (diff < cooldownMs) {
            const sisa = Math.ceil((cooldownMs - diff) / 60000);
            return msg.reply(`⏳ Capek! Kerja lagi dalam *${sisa} menit*.`);
        }

        user.balance     += job.salary;
        user.dailyIncome  = (user.dailyIncome || 0) + job.salary;
        tambahIncome(user, job.salary);
        user.lastWork     = now;
        user.xp          += 50;
        saveDB(db);

        return msg.reply(
            `⚒️ *KERJA KERAS BAGAI KUDA*\n` +
            `Profesi: ${job.role}\n` +
            `💰 Gaji: *Rp ${fmt(job.salary)}*\n` +
            `🧾 Est. PPh: ~Rp ${fmt(Math.floor(job.salary * 0.05))}\n` +
            `_Bayar pajak via !bayarpajak_`
        );
    }

    // ============================================================
    // 🌟 !skill
    // ============================================================
    if (command === 'skill') {
        if (!user.job) return msg.reply("❌ Pengangguran gak punya skill.");

        const SKILL_CD = 5 * 60 * 60 * 1000;
        const diff     = now - user.lastSkill;
        if (diff < SKILL_CD) {
            const hoursLeft = Math.ceil((SKILL_CD - diff) / (60 * 60 * 1000));
            return msg.reply(`⏳ Skill cooldown! Tunggu *${hoursLeft} jam* lagi.`);
        }

        const save = () => { user.lastSkill = now; saveDB(db); };

        if (user.job === 'kuli') {
            const b = 100_000 + Math.floor(Math.random() * 300_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b; tambahIncome(user, b); save();
            return msg.reply(`⛏️ *SKILL KULI!*\nLembur bayaran!\n💰 Bonus: Rp ${fmt(b)}`);
        }
        if (user.job === 'petani') {
            if (!user.farm?.plants?.length) return msg.reply("❌ Ladang kosong. Tanam dulu!");
            user.farm.plants.forEach(p => p.readyAt -= (3 * 60 * 60 * 1000)); save();
            return msg.reply(`🌾 *SKILL PETANI!*\nSemua tanaman dipercepat 3 jam!`);
        }
        if (user.job === 'nelayan') {
            const b = 1_000_000 + Math.floor(Math.random() * 4_000_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b; tambahIncome(user, b); save();
            return msg.reply(`🎣 *SKILL NELAYAN!*\nTangkap ikan langka!\n💰 Bonus: Rp ${fmt(b)}`);
        }
        if (user.job === 'peternak') {
            if (!user.ternak?.length) return msg.reply("❌ Kandang kosong.");
            user.ternak.forEach(a => a.lastFeed -= (6 * 60 * 60 * 1000)); save();
            return msg.reply(`🤠 *SKILL PETERNAK!*\nSemua hewan lapar & siap makan!`);
        }
        if (user.job === 'driver') {
            const b = 500_000 + Math.floor(Math.random() * 2_000_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b; tambahIncome(user, b); save();
            return msg.reply(`🚗 *SKILL DRIVER!*\nPelanggan royal kasih tip!\n💰 Tip: Rp ${fmt(b)}`);
        }
        if (user.job === 'chef') {
            const b = 5_000_000 + Math.floor(Math.random() * 10_000_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b; tambahIncome(user, b); save();
            return msg.reply(`👨‍🍳 *SKILL CHEF!*\nMenu spesial terjual habis!\n💰 Profit: Rp ${fmt(b)}`);
        }
        if (user.job === 'guru') {
            user.xp += 200; save();
            return msg.reply(`📚 *SKILL GURU!*\nMembagikan ilmu!\n✨ XP +200`);
        }
        if (user.job === 'polisi') {
            const b = 5_000_000 + Math.floor(Math.random() * 10_000_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b; tambahIncome(user, b); save();
            return msg.reply(`👮 *SKILL POLISI!*\nRazia berhasil!\n💰 Sitaan: Rp ${fmt(b)}`);
        }
        if (user.job === 'dokter') {
            const heal = Math.min(50, 100 - (user.hp || 100));
            user.hp    = Math.min(100, (user.hp || 100) + 50); save();
            return msg.reply(`👨‍⚕️ *SKILL DOKTER!*\nDiri disembuhkan!\n❤️ HP +${heal} → ${user.hp}%`);
        }
        if (user.job === 'pengacara') {
            user.pengacaraShield = now + (12 * 60 * 60 * 1000); save();
            return msg.reply(`⚖️ *SKILL PENGACARA!*\nDenda rob berikutnya dibatalkan!\n🛡️ Berlaku 12 jam.`);
        }
        if (user.job === 'insinyur') {
            if (!user.mining?.totalHash) return msg.reply("❌ Belum punya alat mining!");
            user.mining.boostUntil = now + (60 * 60 * 1000); save();
            return msg.reply(`👷 *SKILL INSINYUR!*\nHashrate +20% selama 1 jam!`);
        }
        if (user.job === 'pilot') {
            const b = 10_000_000 + Math.floor(Math.random() * 40_000_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b; tambahIncome(user, b); save();
            return msg.reply(`✈️ *SKILL PILOT!*\nBonus penerbangan!\n💰 Bonus: Rp ${fmt(b)}`);
        }
        if (user.job === 'direktur') {
            if (!user.business?.owned || !Object.keys(user.business.owned).length)
                return msg.reply("❌ Belum punya properti!");
            user.business.boostUntil = now + (2 * 60 * 60 * 1000); save();
            return msg.reply(`💼 *SKILL DIREKTUR!*\nSemua properti 2x income selama 2 jam!`);
        }
        if (user.job === 'senator') {
            const b = 100_000_000 + Math.floor(Math.random() * 400_000_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b; tambahIncome(user, b); save();
            return msg.reply(`🏛️ *SKILL SENATOR!*\nDana aspirasi cair!\n💰 Dana: Rp ${fmt(b)}`);
        }
        if (user.job === 'oligarki') {
            user.oligarkiBoostUntil = now + (60 * 60 * 1000); save();
            return msg.reply(`🤑 *SKILL OLIGARKI!*\nMonopoli pasar! Penjualan +50% selama 1 jam!`);
        }

        return msg.reply("❌ Skill belum tersedia untuk profesi ini.");
    }
};