const { tambahIncome } = require('./pajak');
const { saveDB } = require('../helpers/database');

const fmt = (num) => Math.floor(Number(num)).toLocaleString('id-ID');

// ============================================================
// 📚 BANK SOAL — 40+ Soal per Tier
// ============================================================
const SOAL = {

    // ── TIER 1 ─────────────────────────────────────────────────
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
        { q: "Alat tradisional untuk menuai padi yang hanya memotong tangkainya disebut?", a: "B", opt: { A: "Sabit", B: "Ani-ani", C: "Cangkul", D: "Parang" } },
        { q: "Cairan pelarut yang sering digunakan untuk mengencerkan cat minyak/sintetis adalah?", a: "C", opt: { A: "Air raksa", B: "Oli bekas", C: "Thinner / Afdeener", D: "Solar" } },
        { q: "Jaring tangkap ikan berskala besar yang dilarang karena merusak ekosistem dasar laut disebut?", a: "A", opt: { A: "Pukat Harimau (Trawl)", B: "Jala lempar", C: "Bubu", D: "Pancing rawe" } },
        { q: "Pupuk Urea sangat dibutuhkan tanaman karena mengandung unsur?", a: "D", opt: { A: "Kalsium", B: "Besi", C: "Fosfor", D: "Nitrogen" } },
        { q: "Kayu yang paling sering digunakan untuk bekisting (cetakan cor) dalam proyek bangunan adalah?", a: "B", opt: { A: "Kayu Jati", B: "Triplek dan Kayu Kaso (Sengon/Meranti)", C: "Kayu Cendana", D: "Kayu Ulin" } },
        { q: "Penyakit 'Tungro' pada tanaman padi ditularkan oleh hama?", a: "C", opt: { A: "Tikus", B: "Keong mas", C: "Wereng hijau", D: "Burung pipit" } },
        { q: "Berapa ukuran standar satu lembar multiplek / triplek di pasaran Indonesia?", a: "A", opt: { A: "122 cm x 244 cm", B: "100 cm x 200 cm", C: "150 cm x 300 cm", D: "50 cm x 100 cm" } },
        { q: "Alat bantu pernapasan ilegal namun sering dipakai nelayan tradisional untuk menyelam adalah?", a: "B", opt: { A: "Tabung Scuba", B: "Kompresor ban/angin", C: "Snorkel", D: "Oksigen medis" } },
        { q: "Bagian perahu nelayan yang berfungsi sebagai penyeimbang di sisi kanan dan kiri disebut?", a: "D", opt: { A: "Jangkar", B: "Layar", C: "Kemudi", D: "Cadik" } },
        { q: "Ukuran paku reng yang umum dipakai untuk memasang kayu atap adalah?", a: "A", opt: { A: "2 - 3 inci (5 - 7 cm)", B: "10 inci", C: "0.5 inci", D: "12 inci" } },
        { q: "Fungsi pupuk KCL bagi tanaman adalah?", a: "B", opt: { A: "Menambah nitrogen", B: "Memperkuat batang & meningkatkan kualitas buah", C: "Membunuh hama", D: "Mempercepat pertumbuhan daun" } },
        { q: "Perkakas apa yang dipakai tukang batu untuk meratakan adukan semen di dinding?", a: "C", opt: { A: "Parang", B: "Palu", C: "Roskam / Jidar", D: "Gergaji" } },
        { q: "Benih padi yang baik untuk ditanam seharusnya tenggelam atau mengapung saat direndam air?", a: "A", opt: { A: "Tenggelam (benih berisi)", B: "Mengapung (benih ringan)", C: "Setengah tenggelam", D: "Tidak perlu direndam" } },
        { q: "Jarak tanam ideal untuk padi sawah sistem jajar legowo 2:1 adalah?", a: "D", opt: { A: "5 cm x 5 cm", B: "50 cm x 50 cm", C: "10 cm x 10 cm", D: "25 cm x 12,5 cm x 50 cm" } },
        { q: "Bahan pengikat pada campuran beton/cor adalah?", a: "B", opt: { A: "Pasir", B: "Semen", C: "Kerikil", D: "Air saja" } },
        { q: "Apa yang dimaksud pasang surut air laut bagi nelayan?", a: "A", opt: { A: "Naik turunnya permukaan laut akibat gaya tarik bulan/matahari", B: "Cuaca badai mendadak", C: "Ombak besar di lautan", D: "Perubahan warna air laut" } },
        { q: "Cara paling efektif membasmi keong mas di sawah secara alami adalah?", a: "C", opt: { A: "Diberi pestisida kimia", B: "Sawah dikeringkan total", C: "Diambil manual & dipelihara bebek di sawah", D: "Dibiarkan saja" } },
        { q: "Kapur pertanian (Dolomit) berfungsi untuk?", a: "B", opt: { A: "Membunuh gulma", B: "Menaikkan pH tanah yang terlalu asam", C: "Mengusir tikus", D: "Menambah pupuk nitrogen" } },
        { q: "Proses penggilingan gabah menjadi beras dan mengeluarkan dedak disebut?", a: "A", opt: { A: "Penggilingan / Penyosohan", B: "Fermentasi", C: "Pengomposan", D: "Penyulingan" } },
        { q: "Apa fungsi 'anco' dalam kegiatan budidaya ikan tambak?", a: "C", opt: { A: "Memberi oksigen ke air", B: "Menyaring air masuk", C: "Tempat pengecekan nafsu makan ikan/udang", D: "Memasang jaring" } },
    ],

    // ── TIER 2 ─────────────────────────────────────────────────
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
        { q: "Bumbu dasar putih pada masakan Indonesia umumnya terdiri dari?", a: "D", opt: { A: "Cabai, tomat, terasi", B: "Kunyit, jahe, lengkuas", C: "Kecap, saus tiram, minyak wijen", D: "Bawang merah, bawang putih, kemiri, ketumbar" } },
        { q: "Pakan ternak alternatif yang dibuat dari hijauan yang difermentasi disebut?", a: "B", opt: { A: "Pelet", B: "Silase", C: "Dedak", D: "Konsentrat" } },
        { q: "Penyakit mematikan pada unggas yang sering disebut Flu Burung disebabkan oleh virus?", a: "C", opt: { A: "Covid-19", B: "Rabies", C: "H5N1", D: "Ebola" } },
        { q: "Teknik memasak dengan api kecil, suhu air tepat di bawah titik didih (~85-95°C) disebut?", a: "A", opt: { A: "Simmering", B: "Boiling", C: "Deep frying", D: "Roasting" } },
        { q: "Istilah populer di kalangan driver ojol untuk pelanggan yang memesan makanan lalu kabur disebut?", a: "B", opt: { A: "Customer Prioritas", B: "Order Fiktif / Opik", C: "Order Ganda", D: "Super Customer" } },
        { q: "Susu pertama yang dihasilkan sapi perah setelah melahirkan, kaya antibodi disebut?", a: "C", opt: { A: "Susu Pasteurisasi", B: "Susu UHT", C: "Kolostrum", D: "Susu Kental Manis" } },
        { q: "Cara memotong daging sapi agar tidak alot saat dimasak adalah?", a: "D", opt: { A: "Searah serat daging", B: "Dihancurkan dengan blender", C: "Mengikuti garis lemak", D: "Berlawanan arah (memotong) serat daging" } },
        { q: "Layanan ojek online khusus mengirimkan barang atau dokumen secara instan disebut?", a: "A", opt: { A: "GoSend / GrabExpress", B: "GoFood / GrabFood", C: "GoRide / GrabBike", D: "GoClean" } },
        { q: "Potongan sayuran berbentuk kubus/dadu kecil (~5-6 mm) dalam dunia kuliner disebut?", a: "B", opt: { A: "Chiffonade", B: "Macedoine / Small Dice", C: "Batonnet", D: "Mince" } },
        { q: "Syarat umum kelayakan kendaraan motor untuk ojek online maksimal berusia?", a: "C", opt: { A: "1 tahun", B: "3 tahun", C: "8-10 tahun (tergantung kebijakan aplikator)", D: "Tidak ada batasan tahun" } },
        { q: "Kebutuhan protein kasar pada pakan ayam petelur dewasa adalah?", a: "A", opt: { A: "15-17%", B: "30-40%", C: "5-8%", D: "50% lebih" } },
        { q: "Tanda ayam broiler siap panen secara umum adalah berat badan mencapai?", a: "C", opt: { A: "200 gram", B: "500 gram", C: "1,5 - 2 kg (umur 30-35 hari)", D: "5 kg lebih" } },
        { q: "Sistem kerja driver ojol dengan target poin/misi per hari disebut?", a: "B", opt: { A: "Rating System", B: "Gamifikasi / Quest System", C: "Penalti system", D: "Bonus tahunan" } },
        { q: "Teknik memasak sous-vide menggunakan?", a: "D", opt: { A: "Api besar langsung", B: "Microwave", C: "Pengasapan", D: "Vakum & perendaman air suhu presisi rendah" } },
        { q: "Dalam peternakan, istilah 'afkir' pada ayam berarti?", a: "A", opt: { A: "Ayam sudah tidak produktif dan akan disingkirkan", B: "Ayam sakit yang diobati", C: "Ayam baru datang", D: "Ayam paling produktif" } },
        { q: "Fermentasi pakan ternak menggunakan bakteri lactobacillus menghasilkan produk bernama?", a: "B", opt: { A: "Kompos", B: "Probiotik / Fermented Feed", C: "Pestisida organik", D: "Pupuk nitrogen" } },
        { q: "Kode FIFO dalam penyimpanan bahan makanan di dapur berarti?", a: "D", opt: { A: "Barang mahal masuk duluan", B: "Bahan beku diutamakan", C: "Semua bahan sama prioritasnya", D: "First In First Out — bahan pertama masuk harus keluar duluan" } },
        { q: "Masa karantina sapi impor di Indonesia minimal berapa hari?", a: "A", opt: { A: "14-30 hari", B: "1 hari", C: "6 bulan", D: "Tidak ada karantina" } },
        { q: "Tanda bahaya 'zona bahaya suhu' untuk bahan makanan (temperature danger zone) adalah?", a: "C", opt: { A: "0°C - 4°C", B: "Di bawah 0°C", C: "5°C - 60°C", D: "Di atas 100°C" } },
        { q: "Regulasi wajib pengemudi ojol sebelum menerima order makanan jarak jauh adalah?", a: "C", opt: { A: "Tidak ada regulasi", B: "Harus punya SIM A", C: "Motor harus memiliki box pengiriman & terdaftar di aplikator", D: "Harus lulus kursus memasak" } },
    ],

    // ── TIER 3 ─────────────────────────────────────────────────
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
        { q: "Pangkat tertinggi golongan Perwira Pertama (Pama) Polri dengan tanda tiga balok emas adalah?", a: "B", opt: { A: "Ipda", B: "AKP (Ajun Komisaris Polisi)", C: "Iptu", D: "Kompol" } },
        { q: "Komponen darah yang berfungsi utama sebagai sistem imun untuk melawan infeksi adalah?", a: "A", opt: { A: "Leukosit (Sel darah putih)", B: "Eritrosit (Sel darah merah)", C: "Trombosit", D: "Plasma darah" } },
        { q: "Simbol R/ pada resep dokter berasal dari bahasa Latin 'Recipe', artinya?", a: "D", opt: { A: "Sembuhlah", B: "Raciklah", C: "Diminum rutin", D: "Ambillah" } },
        { q: "Alat medis untuk memacu detak jantung menggunakan kejut listrik disebut?", a: "C", opt: { A: "Elektrokardiogram (EKG)", B: "Ventilator", C: "Defibrillator", D: "Inkubator" } },
        { q: "Kapolri diangkat dan diberhentikan oleh?", a: "A", opt: { A: "Presiden dengan persetujuan DPR", B: "Mahkamah Agung", C: "Menko Polhukam", D: "Panglima TNI" } },
        { q: "Hukum acara pidana di Indonesia diatur dalam kitab undang-undang yang disingkat?", a: "B", opt: { A: "KUHP", B: "KUHAP", C: "KUHPerdata", D: "KUHD" } },
        { q: "Asas hukum 'Lex specialis derogat legi generali' berarti?", a: "D", opt: { A: "Hukum tidak berlaku surut", B: "Semua orang sama di mata hukum", C: "Hukum baru mengesampingkan hukum lama", D: "Aturan hukum khusus mengesampingkan aturan umum" } },
        { q: "Gelar akademik untuk lulusan program Strata 2 (S2) di Indonesia adalah?", a: "C", opt: { A: "Sarjana", B: "Doktor", C: "Magister", D: "Diploma" } },
        { q: "Sistem evaluasi pendidikan pengganti Ujian Nasional (UN) saat ini adalah?", a: "B", opt: { A: "Ebtanas", B: "Asesmen Nasional (AN)", C: "Ujian Mandiri", D: "SNBT" } },
        { q: "Satuan kewilayahan Polri yang berkedudukan di tingkat Kecamatan disebut?", a: "A", opt: { A: "Polsek (Kepolisian Sektor)", B: "Polres", C: "Polda", D: "Mabes" } },
        { q: "Obat penghilang rasa sakit golongan NSAID yang paling umum adalah?", a: "C", opt: { A: "Amoxicillin", B: "Metformin", C: "Ibuprofen & Paracetamol", D: "Amlodipine" } },
        { q: "Asas pembuktian dalam hukum pidana Indonesia membutuhkan minimal berapa alat bukti sah?", a: "B", opt: { A: "1 alat bukti", B: "2 alat bukti (Pasal 183 KUHAP)", C: "5 alat bukti", D: "Tidak ada batas minimum" } },
        { q: "Perbedaan UGD dan Poli Umum di rumah sakit adalah?", a: "D", opt: { A: "UGD hanya untuk pasien BPJS", B: "Poli Umum buka 24 jam", C: "UGD lebih mahal", D: "UGD menangani kondisi darurat 24 jam, Poli Umum untuk pasien non-darurat" } },
        { q: "Dalam Kurikulum Merdeka, P5 singkatan dari?", a: "A", opt: { A: "Projek Penguatan Profil Pelajar Pancasila", B: "Program Pendidikan Praktis Penuh Potensi", C: "Penilaian Prestasi Peserta Didik Per-Periode", D: "Panduan Pengembangan Pedagogik Profesional" } },
        { q: "Pasal 170 KUHP mengatur tentang?", a: "C", opt: { A: "Pencurian dengan kekerasan", B: "Penggelapan", C: "Pengeroyokan/penganiayaan bersama-sama", D: "Pemalsuan surat" } },
        { q: "Istilah 'visum et repertum' dalam hukum pidana adalah?", a: "C", opt: { A: "Surat dakwaan jaksa", B: "Surat izin operasi bedah", C: "Laporan tertulis dokter atas pemeriksaan korban/mayat untuk kepentingan peradilan", D: "Resep obat darurat" } },
        { q: "Prinsip etika kedokteran 'non-maleficence' berarti?", a: "B", opt: { A: "Menghormati hak pasien", B: "Tidak menyebabkan bahaya/kerugian pada pasien", C: "Berlaku adil pada semua pasien", D: "Menjaga kerahasiaan pasien" } },
        { q: "Metode investigasi digital forensik yang dilakukan polisi siber pertama kali disebut?", a: "D", opt: { A: "Penangkapan langsung", B: "Penyadapan real-time", C: "Penggeledahan fisik kantor", D: "Identifikasi & preservasi barang bukti digital" } },
        { q: "Program perlindungan guru dari kekerasan fisik/verbal diatur dalam?", a: "A", opt: { A: "UU Perlindungan Guru (Permendikbud 10/2017)", B: "KUHP Pasal 351", C: "UU ASN", D: "Tidak ada regulasi khusus" } },
        { q: "Sistem residu nol pada penanganan obat keras di apotek bertujuan untuk?", a: "B", opt: { A: "Mengurangi biaya operasional", B: "Mencegah penyalahgunaan & memastikan traceability obat", C: "Mempercepat pelayanan pasien", D: "Meningkatkan profit apotek" } },
    ],

    // ── TIER 4 ─────────────────────────────────────────────────
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
        { q: "Jenis serangan siber di mana peretas menyisipkan kode berbahaya ke dalam query database disebut?", a: "A", opt: { A: "SQL Injection", B: "DDoS Attack", C: "Phishing", D: "Ransomware" } },
        { q: "Bahasa pemrograman modern dari Apple untuk pengembangan iOS dan macOS adalah?", a: "B", opt: { A: "Kotlin", B: "Swift", C: "Ruby", D: "C#" } },
        { q: "Selain FDR, kotak hitam pesawat juga memiliki perekam suara kokpit disebut?", a: "C", opt: { A: "TCAS", B: "GPWS", C: "CVR (Cockpit Voice Recorder)", D: "APU" } },
        { q: "Satuan kecepatan pesawat diukur relatif terhadap kecepatan suara disebut?", a: "A", opt: { A: "Mach", B: "Knots", C: "Nautical Miles", D: "G-Force" } },
        { q: "Asas hukum pidana 'Ne Bis In Idem' mengandung makna?", a: "D", opt: { A: "Hukum tumpul ke atas tajam ke bawah", B: "Setiap orang dianggap tahu hukum", C: "Hukuman seumur hidup", D: "Seseorang tidak boleh dituntut dua kali untuk perkara yang sama" } },
        { q: "Source code sebuah perangkat lunak dilindungi HKI berupa?", a: "B", opt: { A: "Hak Paten", B: "Hak Cipta (Copyright)", C: "Merek Dagang", D: "Rahasia Dagang" } },
        { q: "Perintah Git untuk menggabungkan perubahan dari satu branch ke branch lain adalah?", a: "C", opt: { A: "git commit", B: "git push", C: "git merge", D: "git clone" } },
        { q: "Frasa standar ATC saat memberi izin pesawat untuk lepas landas adalah?", a: "A", opt: { A: "Cleared for takeoff", B: "Go ahead and fly", C: "Ready for departure", D: "Runway is yours" } },
        { q: "Fungsi utama Flaps (bagian belakang sayap pesawat) saat mendarat adalah?", a: "D", opt: { A: "Mendinginkan mesin", B: "Mengurangi berat pesawat", C: "Membelokkan pesawat di darat", D: "Menambah gaya angkat (lift) pada kecepatan rendah" } },
        { q: "Arsitektur REST API umumnya mentransmisikan data antara klien dan server menggunakan format?", a: "B", opt: { A: "HTML", B: "JSON", C: "CSV", D: "PDF" } },
        { q: "Konsep hukum 'ultra vires' dalam hukum korporasi berarti?", a: "C", opt: { A: "Direksi bertindak jujur", B: "Perusahaan dinyatakan pailit", C: "Tindakan korporasi di luar batas kewenangan yang ditetapkan anggaran dasar", D: "Kontrak sah di pengadilan" } },
        { q: "Dalam dunia penerbangan, VMC singkatan dari?", a: "A", opt: { A: "Visual Meteorological Conditions (kondisi terbang dengan pandangan visual)", B: "Very Modern Cockpit", C: "Vertical Maximum Climb", D: "Variable Mode Controller" } },
        { q: "Prinsip keamanan siber 'zero trust' berarti?", a: "D", opt: { A: "Tidak ada sistem keamanan sama sekali", B: "Percayai semua pengguna internal", C: "Sistem hanya bisa diakses offline", D: "Tidak mempercayai siapapun secara default, verifikasi selalu diperlukan" } },
        { q: "Hukum kontrak perdata mensyaratkan perjanjian sah harus memenuhi?", a: "B", opt: { A: "Minimal 5 syarat khusus", B: "4 syarat sah (sepakat, cakap, hal tertentu, sebab halal) sesuai Pasal 1320 KUHPerdata", C: "Tanda tangan notaris wajib", D: "Hanya syarat tertulis saja" } },
        { q: "Dalam pemrograman, prinsip DRY singkatan dari?", a: "A", opt: { A: "Don't Repeat Yourself", B: "Dynamic Runtime Yield", C: "Data Reduction Yield", D: "Distributed Routing Yes" } },
        { q: "Mode penerbangan IFR berbeda dengan VFR karena IFR?", a: "C", opt: { A: "Hanya untuk pesawat kecil", B: "Tidak butuh ATC", C: "Menggunakan instrumen navigasi saat visibilitas buruk/cuaca tertutup", D: "Tidak diizinkan di bandara besar" } },
        { q: "Dalam hukum pidana internasional, ICC berkedudukan di?", a: "B", opt: { A: "Jenewa, Swiss", B: "Den Haag, Belanda", C: "New York, AS", D: "Brussels, Belgia" } },
        { q: "Konsep microservices dalam arsitektur software berarti?", a: "A", opt: { A: "Aplikasi dipecah menjadi layanan-layanan kecil independen yang berkomunikasi via API", B: "Satu aplikasi monolitik besar", C: "Database terpusat tunggal", D: "Kode ditulis dalam satu file" } },
        { q: "Angka Mach 1 setara dengan kecepatan suara sekitar?", a: "C", opt: { A: "300 km/jam", B: "500 km/jam", C: "1.235 km/jam (di permukaan laut, 15°C)", D: "3.000 km/jam" } },
        { q: "Kerentanan keamanan siber di mana data yang masuk tidak divalidasi disebut?", a: "D", opt: { A: "Buffer Overflow", B: "Social Engineering", C: "Man in the Middle", D: "Input Validation Attack / Injection" } },
    ],

    // ── TIER 5 ─────────────────────────────────────────────────
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
        { q: "Kebijakan bank sentral untuk mengendalikan ekonomi melalui pengaturan jumlah uang beredar dan suku bunga disebut?", a: "C", opt: { A: "Kebijakan Fiskal", B: "Kebijakan Proteksionisme", C: "Kebijakan Moneter", D: "Kebijakan Kartel" } },
        { q: "Kondisi ekonomi di mana inflasi melonjak sangat tajam hingga mata uang kehilangan nilainya drastis disebut?", a: "B", opt: { A: "Deflasi", B: "Hiperinflasi", C: "Apresiasi", D: "Resesi" } },
        { q: "Pemegang saham yang memiliki porsi mayoritas sehingga punya hak prerogatif pengambilan keputusan disebut?", a: "A", opt: { A: "Controlling Shareholder", B: "Minority Shareholder", C: "Retail Investor", D: "Angel Investor" } },
        { q: "Peraturan Giro Wajib Minimum (GWM) bagi perbankan ditetapkan oleh?", a: "D", opt: { A: "OJK", B: "Kementerian Keuangan", C: "LPS", D: "Bank Indonesia (BI)" } },
        { q: "UU yang mengatur larangan praktik monopoli dan persaingan usaha tidak sehat di Indonesia adalah?", a: "C", opt: { A: "UU No. 8 Tahun 1999", B: "UU No. 40 Tahun 2007", C: "UU No. 5 Tahun 1999", D: "UU No. 13 Tahun 2003" } },
        { q: "Aksi korporasi membagikan dividen dalam bentuk saham tambahan disebut?", a: "A", opt: { A: "Stock Dividend / Saham Bonus", B: "Stock Split", C: "Right Issue", D: "Buyback Saham" } },
        { q: "Penggabungan dua perusahaan yang keduanya bubar dan membentuk entitas baru disebut?", a: "B", opt: { A: "Akuisisi", B: "Konsolidasi / Amalgamasi", C: "Joint Venture", D: "Divestasi" } },
        { q: "Kementerian Keuangan RI memiliki wewenang penuh di bidang?", a: "C", opt: { A: "Moneter", B: "Yudikatif", C: "Fiskal (APBN)", D: "Diplomatik" } },
        { q: "Rasio yang membandingkan total kas terhadap total kewajiban lancar perusahaan disebut?", a: "D", opt: { A: "Debt to Equity Ratio", B: "Return on Assets", C: "Gross Profit Margin", D: "Cash Ratio" } },
        { q: "Hak Veto di Dewan Keamanan PBB hanya dimiliki oleh berapa negara tetap?", a: "A", opt: { A: "5 Negara (AS, Inggris, Prancis, Rusia, Tiongkok)", B: "10 Negara", C: "3 Negara", D: "Seluruh anggota PBB" } },
        { q: "Konsep 'regulatory arbitrage' dalam dunia keuangan berarti?", a: "C", opt: { A: "Pelanggaran hukum pasar modal", B: "Manipulasi harga saham", C: "Memanfaatkan perbedaan regulasi antar yurisdiksi untuk keuntungan", D: "Penghindaran pajak ilegal" } },
        { q: "Dalam M&A, 'earnout' adalah mekanisme di mana?", a: "B", opt: { A: "Pembeli membayar penuh di muka", B: "Sebagian harga dibayar berdasarkan kinerja target di masa depan", C: "Penjual menerima saham saja", D: "Kontrak dibatalkan bila target tidak tercapai" } },
        { q: "Istilah 'fiscal cliff' dalam ekonomi makro merujuk pada?", a: "D", opt: { A: "Resesi berkepanjangan", B: "Utang negara yang tak terbayar", C: "Penurunan nilai tukar mendadak", D: "Berakhirnya stimulus fiskal secara tiba-tiba yang bisa menyebabkan kontraksi ekonomi" } },
        { q: "Keputusan MK yang bersifat erga omnes berarti?", a: "A", opt: { A: "Berlaku untuk semua pihak, mengikat seluruh warga negara", B: "Hanya berlaku bagi pemohon", C: "Bisa digugat kembali dalam 30 hari", D: "Berlaku sementara sampai DPR merevisi" } },
        { q: "Dalam analisis saham, P/E Ratio digunakan untuk?", a: "C", opt: { A: "Menghitung dividen tahunan", B: "Mengukur total utang perusahaan", C: "Mengukur harga saham relatif terhadap laba per saham", D: "Menghitung arus kas operasional" } },
        { q: "Konsep 'too big to fail' dalam kebijakan ekonomi berarti?", a: "B", opt: { A: "Perusahaan tidak bisa diakuisisi", B: "Entitas keuangan yang begitu besar sehingga keruntuhannya akan merusak seluruh sistem ekonomi", C: "Monopoli yang dilindungi pemerintah", D: "Perusahaan yang terlalu besar untuk go public" } },
        { q: "Instrumen keuangan derivatif 'credit default swap (CDS)' berfungsi sebagai?", a: "D", opt: { A: "Saham biasa", B: "Obligasi pemerintah", C: "Reksa dana campuran", D: "Asuransi terhadap risiko gagal bayar (default) suatu penerbit utang" } },
        { q: "Mekanisme 'judicial review' di Indonesia dilakukan oleh?", a: "A", opt: { A: "MK untuk UU vs UUD; MA untuk peraturan di bawah UU", B: "DPR saja", C: "Presiden dan Wapres", D: "Jaksa Agung" } },
        { q: "Dalam kebijakan fiskal, 'automatic stabilizer' adalah?", a: "C", opt: { A: "Kebijakan moneter BI", B: "Intervensi pemerintah melalui BUMN", C: "Mekanisme seperti pajak progresif & tunjangan pengangguran yang secara otomatis menstabilkan ekonomi", D: "Subsidi langsung tunai" } },
        { q: "Prinsip 'arm's length transaction' dalam hukum pajak korporasi berarti?", a: "B", opt: { A: "Transaksi antar anak perusahaan dibebaskan pajak", B: "Transaksi antar pihak berelasi harus dilakukan seolah pihak independen (harga pasar wajar)", C: "Semua transaksi ekspor bebas pajak", D: "Dividen tidak dikenakan pajak berganda" } },
    ],
};

// ============================================================
// 💼 KONFIGURASI PROFESI
// ============================================================
const JOBS = {
    'kuli':     { role: "⛏️ Kuli Bangunan",      cost: 0,               salary: 150_000,       cooldown: 30,  tier: 1, desc: "Tidak butuh modal. Skill: Lembur dapat bonus." },
    'petani':   { role: "🌾 Petani Modern",       cost: 10_000_000,      salary: 400_000,       cooldown: 30,  tier: 1, desc: "Skill: Percepat panen semua tanaman 3 jam." },
    'nelayan':  { role: "🎣 Nelayan Andal",       cost: 15_000_000,      salary: 500_000,       cooldown: 30,  tier: 1, desc: "Skill: Dapat bonus ikan langka untuk dijual." },
    'peternak': { role: "🤠 Juragan Ternak",      cost: 25_000_000,      salary: 600_000,       cooldown: 30,  tier: 2, desc: "Skill: Bikin semua hewan lapar & siap makan lagi." },
    'driver':   { role: "🚗 Driver Ojol",         cost: 30_000_000,      salary: 700_000,       cooldown: 30,  tier: 2, desc: "Skill: Dapat tip gede dari pelanggan." },
    'chef':     { role: "👨‍🍳 Chef Restoran",       cost: 50_000_000,      salary: 1_500_000,     cooldown: 60,  tier: 2, desc: "Skill: Menu spesial, profit 5-15 juta." },
    'guru':     { role: "📚 Guru Honorer",        cost: 75_000_000,      salary: 2_000_000,     cooldown: 60,  tier: 3, desc: "Skill: Boost XP diri sendiri +200." },
    'polisi':   { role: "👮 Polisi Siber",        cost: 100_000_000,     salary: 4_000_000,     cooldown: 60,  tier: 3, desc: "Pasif: Kebal rob. Skill: Razia dapat uang sitaan." },
    'dokter':   { role: "👨‍⚕️ Dokter Umum",         cost: 200_000_000,     salary: 8_000_000,     cooldown: 120, tier: 3, desc: "Skill: Sembuhkan diri sendiri (HP +50)." },
    'pengacara':{ role: "⚖️ Pengacara",           cost: 500_000_000,     salary: 20_000_000,    cooldown: 120, tier: 4, desc: "Skill: Batalkan denda rob sekali per 12 jam." },
    'insinyur': { role: "👷 Insinyur IT",         cost: 750_000_000,     salary: 30_000_000,    cooldown: 120, tier: 4, desc: "Skill: Boost hashrate mining +20% selama 1 jam." },
    'pilot':    { role: "✈️ Pilot Komersial",     cost: 1_000_000_000,   salary: 50_000_000,    cooldown: 180, tier: 4, desc: "Skill: Bonus penerbangan random 10-50 juta." },
    'direktur': { role: "💼 Direktur Perusahaan", cost: 5_000_000_000,   salary: 200_000_000,   cooldown: 240, tier: 5, desc: "Skill: Semua properti 2x income selama 2 jam." },
    'senator':  { role: "🏛️ Senator",             cost: 20_000_000_000,  salary: 750_000_000,   cooldown: 360, tier: 5, desc: "Skill: Dana aspirasi 100-500 juta cair." },
    'oligarki': { role: "🤑 Oligarki",            cost: 100_000_000_000, salary: 3_000_000_000, cooldown: 720, tier: 5, desc: "Skill: Monopoli pasar, semua penjualan +50% 1 jam." },
};

const TIER_LABEL = {
    1: "🟢 TIER 1 — Entry Level",
    2: "🟡 TIER 2 — Menengah",
    3: "🟠 TIER 3 — Profesional",
    4: "🔴 TIER 4 — Elite",
    5: "💎 TIER 5 — Crazy Rich",
};

// ============================================================
// 📋 KONFIGURASI UJIAN & KUIS HARIAN
// ============================================================
const UJIAN_SOAL    = 15;                        // Ujian masuk: 15 soal
const UJIAN_LULUS   = 12;                        // Lulus minimal 12/15 (80%)
const HARIAN_SOAL   = 5;                         // Kuis harian: 5 soal
const HARIAN_LULUS  = 4;                         // Lulus minimal 4/5 (80%)
const MAX_STRIKES   = 3;                         // Maks gagal sebelum dipecat
const HARIAN_CD_MS  = 24 * 60 * 60 * 1000;      // Reset kuis tiap 24 jam
const HARIAN_RETRY  = 60 * 60 * 1000;           // Cooldown retry gagal: 1 jam

const STREAK_BONUS = { 3: 0.10, 7: 0.20, 14: 0.35, 30: 0.50 };

const MATERI = {
    1: "• Pertanian & bercocok tanam\n• Konstruksi bangunan & K3\n• Perikanan & budidaya ikan\n• Ekonomi dasar & UMR",
    2: "• Peternakan & kesehatan hewan\n• Regulasi kendaraan & SIM\n• Teknik memasak & food safety\n• Manajemen UMKM kuliner",
    3: "• Hukum pidana & perdata dasar\n• Kurikulum & pedagogik\n• Ilmu kedokteran & farmakologi dasar\n• Prosedur kepolisian & KUHP",
    4: "• Hukum acara perdata & pidana lanjutan\n• Algoritma & struktur data\n• Prosedur penerbangan & ATC\n• Keamanan siber & jaringan",
    5: "• Analisis laporan keuangan (EBITDA, ROE)\n• Hukum korporasi & UU PT\n• Strategi bisnis & M&A\n• Ekonomi makro & politik",
};

// ============================================================
// 🔧 HELPERS
// ============================================================
function ambilSoal(tier, jumlah) {
    const bank = [...SOAL[tier]];
    const hasil = [];
    const n = Math.min(jumlah, bank.length);
    for (let i = 0; i < n; i++) {
        const idx = Math.floor(Math.random() * bank.length);
        hasil.push(bank.splice(idx, 1)[0]);
    }
    return hasil;
}

function getStreakBonus(streak) {
    if (streak >= 30) return STREAK_BONUS[30];
    if (streak >= 14) return STREAK_BONUS[14];
    if (streak >= 7)  return STREAK_BONUS[7];
    if (streak >= 3)  return STREAK_BONUS[3];
    return 0;
}

function strikeBar(strikes) {
    return ['🟩','🟩','🟩'].map((v, i) => i < strikes ? '🟥' : '🟩').join('');
}

// ============================================================
// 🎮 MAIN MODULE
// ============================================================
module.exports = async (command, args, msg, user, db) => {
    const validCommands = ['jobs','kerja','work','lamar','resign','skill','kursus','ujian','jawab','statkerja'];
    if (!validCommands.includes(command)) return;

    if (!user.job)           user.job           = null;
    if (!user.lastWork)      user.lastWork       = 0;
    if (!user.lastSkill)     user.lastSkill      = 0;
    if (!user.xp)            user.xp             = 0;
    if (!user.sertifikat)    user.sertifikat     = [];
    if (!user.ujianAktif)    user.ujianAktif     = null;
    if (!user.harianAktif)   user.harianAktif    = null;
    if (!user.harianStrikes) user.harianStrikes  = 0;
    if (!user.harianStreak)  user.harianStreak   = 0;
    if (!user.lastHarian)    user.lastHarian     = 0;
    if (!user.harianRetryCd) user.harianRetryCd  = 0;
    if (!user.harianDoneAt)  user.harianDoneAt   = 0;

    const now = Date.now();

    // ============================================================
    // !jobs
    // ============================================================
    if (command === 'jobs') {
        let txt = `💼 *BURSA KERJA & PROFESI* 💼\n_Kursus → Ujian → Sertifikat → Lamar!_\n\n`;

        if (user.job) {
            const cur      = JOBS[user.job];
            const gphj     = Math.floor(cur.salary / (cur.cooldown / 60));
            const bonusPct = getStreakBonus(user.harianStreak);
            const kuisDone = user.harianDoneAt > now - HARIAN_CD_MS;
            txt += `🆔 *Profesi Kamu:* ${cur.role}\n`;
            txt += `💰 Rp ${fmt(cur.salary)} / ${cur.cooldown} mnt (≈Rp ${fmt(gphj)}/jam)\n`;
            if (bonusPct > 0) txt += `🔥 Streak Bonus: *+${bonusPct * 100}%* gaji (${user.harianStreak} hari)\n`;
            txt += `⚠️ Peringatan: ${strikeBar(user.harianStrikes)} (${user.harianStrikes}/${MAX_STRIKES})\n`;
            txt += `📅 Kuis Harian: ${kuisDone ? '✅ Sudah lulus' : '❌ Belum — wajib sebelum !kerja'}\n`;
            txt += `🌟 ${cur.desc}\n_!kerja · !skill · !resign · !statkerja_\n${'─'.repeat(28)}\n\n`;
        } else {
            txt += `❌ *Kamu masih PENGANGGURAN.*\n${'─'.repeat(28)}\n\n`;
        }

        let lastTier = 0;
        for (const [code, job] of Object.entries(JOBS)) {
            if (job.tier !== lastTier) { txt += `\n${TIER_LABEL[job.tier]}\n`; lastTier = job.tier; }
            const gphj  = Math.floor(job.salary / (job.cooldown / 60));
            const lulus = user.sertifikat.includes(code) ? ' 🎓' : '';
            const aktif = user.job === code ? ' ✅' : '';
            txt += `▪️ *${job.role}*${aktif}${lulus} \`${code}\`\n`;
            txt += `   💸 ${job.cost === 0 ? 'GRATIS' : 'Rp ' + fmt(job.cost)} | 💵 Rp ${fmt(job.salary)}/${job.cooldown}mnt (Rp ${fmt(gphj)}/jam)\n`;
        }
        txt += `\n${'─'.repeat(28)}\n📚 \`!kursus <kode>\` · ✍️ \`!ujian <kode>\` · 💼 \`!lamar <kode>\`\n🎓 = Sudah lulus ujian`;
        return msg.reply(txt);
    }

    // ============================================================
    // !statkerja
    // ============================================================
    if (command === 'statkerja') {
        if (!user.job) return msg.reply("❌ Belum bekerja. `!lamar` dulu!");
        const job      = JOBS[user.job];
        const bonusPct = getStreakBonus(user.harianStreak);
        const kuisDone = user.harianDoneAt > now - HARIAN_CD_MS;

        let kuisStatus;
        if (kuisDone) kuisStatus = `✅ Sudah lulus hari ini`;
        else if (user.harianRetryCd > now) kuisStatus = `⏳ Gagal tadi — retry dalam ${Math.ceil((user.harianRetryCd - now) / 60000)} mnt`;
        else kuisStatus = `❌ Belum dikerjakan (wajib sebelum !kerja)`;

        let txt = `📊 *STATUS KERJA — ${job.role}*\n${'─'.repeat(30)}\n\n`;
        txt += `🔥 Streak  : *${user.harianStreak} hari berturut* ${bonusPct > 0 ? `(+${bonusPct * 100}% gaji!)` : ''}\n`;
        txt += `⚠️ Strikes : ${strikeBar(user.harianStrikes)} (${user.harianStrikes}/${MAX_STRIKES})\n`;
        txt += `🛡️ Sisa    : ${MAX_STRIKES - user.harianStrikes}x lagi gagal sebelum dipecat\n\n`;
        txt += `📅 *Kuis Harian:* ${kuisStatus}\n\n`;
        txt += `🏆 *Streak Bonus Gaji:*\n`;
        txt += `  ▸ 3 hari  → +10%\n  ▸ 7 hari  → +20%\n  ▸ 14 hari → +35%\n  ▸ 30 hari → +50%\n\n`;
        txt += `💡 Lulus kuis harian = streak++ & strike--\n`;
        txt += `💡 Gagal kuis = strike++ & streak reset & cooldown 1 jam`;
        return msg.reply(txt);
    }

    // ============================================================
    // !kursus
    // ============================================================
    if (command === 'kursus') {
        const target = args[0]?.toLowerCase();
        if (!target || !JOBS[target]) return msg.reply("❌ Profesi tidak ditemukan. Cek `!jobs`.");
        const job     = JOBS[target];
        const tier    = job.tier;
        const sdLulus = user.sertifikat.includes(target);

        let txt = `📚 *KURSUS: ${job.role}*\n\n`;
        txt += `🏷️ Tier      : ${TIER_LABEL[tier]}\n`;
        txt += `📝 Ujian     : ${UJIAN_SOAL} soal (dari bank ${SOAL[tier].length} soal)\n`;
        txt += `✅ Lulus     : ${UJIAN_LULUS}/${UJIAN_SOAL} benar (80%)\n`;
        txt += `⏳ Timeout   : 30 menit | Gagal: cooldown 30 menit\n`;
        txt += `💰 Modal     : ${job.cost === 0 ? 'GRATIS' : 'Rp ' + fmt(job.cost)}\n\n`;
        txt += `📖 *MATERI UJIAN:*\n${MATERI[tier]}\n\n`;
        txt += `🔄 *Sistem Kuis Harian (setelah direkrut):*\n`;
        txt += `  ▸ 5 soal wajib sebelum !kerja tiap 24 jam\n`;
        txt += `  ▸ Minimal 4/5 benar untuk lolos (timeout 10 menit)\n`;
        txt += `  ▸ Gagal → strike +1, streak reset, retry 1 jam\n`;
        txt += `  ▸ Gagal 3x kumulatif → *DIPECAT OTOMATIS*\n`;
        txt += `  ▸ Lulus → strike--, streak++, bonus gaji s/d +50%\n\n`;
        txt += sdLulus
            ? `🎓 *Sudah LULUS!* Ketik \`!lamar ${target}\` untuk melamar.`
            : `💡 Siap ujian? Ketik \`!ujian ${target}\``;
        return msg.reply(txt);
    }

    // ============================================================
    // !ujian
    // ============================================================
    if (command === 'ujian') {
        const target = args[0]?.toLowerCase();
        if (!target || !JOBS[target]) return msg.reply("❌ Profesi tidak ditemukan. Cek `!jobs`.");

        if (user.sertifikat.includes(target))
            return msg.reply(`🎓 Sudah lulus ujian *${JOBS[target].role}*!\nLangsung \`!lamar ${target}\`.`);

        if (user.ujianCooldown && now < user.ujianCooldown) {
            const sisa = Math.ceil((user.ujianCooldown - now) / 60000);
            return msg.reply(`⏳ Gagal tadi. Belajar dulu!\nUjian lagi dalam *${sisa} menit*.`);
        }

        if (user.harianAktif)
            return msg.reply("❌ Selesaikan *kuis harian* dulu!\nKetik `!jawab A/B/C/D`.");

        const job      = JOBS[target];
        const terpilih = ambilSoal(job.tier, UJIAN_SOAL);

        user.ujianAktif = {
            mode: 'sertifikasi', job: target, tier: job.tier,
            soal: terpilih, kunci: terpilih.map(s => s.a),
            jawaban: [], idx: 0, startedAt: now,
        };
        saveDB(db);

        const s1 = terpilih[0];
        let txt  = `📝 *UJIAN SERTIFIKASI: ${job.role}*\n`;
        txt += `${UJIAN_SOAL} soal | Lulus: ${UJIAN_LULUS} benar (80%) | Timeout: 30 menit\n${'─'.repeat(28)}\n\n`;
        txt += `*Soal 1/${UJIAN_SOAL}:*\n${s1.q}\n\n`;
        txt += `🅰️ ${s1.opt.A}\n🅱️ ${s1.opt.B}\n🇨 ${s1.opt.C}\n🇩 ${s1.opt.D}\n\n💡 \`!jawab A/B/C/D\``;
        return msg.reply(txt);
    }

    // ============================================================
    // !jawab — menangani sertifikasi & kuis harian
    // ============================================================
    if (command === 'jawab') {
        if (!user.harianAktif && !user.ujianAktif)
            return msg.reply("❌ Tidak sedang ujian/kuis. Ketik `!kerja` atau `!ujian <kode>`.");

        const jawaban = args[0]?.toUpperCase();
        if (!['A','B','C','D'].includes(jawaban))
            return msg.reply("❌ Pilih: A, B, C, atau D.");

        // ── KUIS HARIAN ──────────────────────────────────────────
        if (user.harianAktif) {
            const sesi = user.harianAktif;

            // Timeout 10 menit
            if (now - sesi.startedAt > 10 * 60 * 1000) {
                user.harianAktif   = null;
                user.harianStrikes = (user.harianStrikes || 0) + 1;
                user.harianStreak  = 0;
                user.harianRetryCd = now + HARIAN_RETRY;

                if (user.harianStrikes >= MAX_STRIKES) {
                    const oldJob = JOBS[user.job]?.role;
                    user.job = null; user.lastWork = 0;
                    saveDB(db);
                    return msg.reply(
                        `⏰ *Waktu kuis habis!*\n\n💥 *DIPECAT!*\nSudah gagal ${user.harianStrikes}x kuis harian!\n` +
                        `Profesi *${oldJob}* dicabut.\n_Sertifikat masih tersimpan._`
                    );
                }
                saveDB(db);
                return msg.reply(
                    `⏰ Waktu kuis habis! (10 menit)\n` +
                    `⚠️ *Strike ${user.harianStrikes}/${MAX_STRIKES}* ${strikeBar(user.harianStrikes)}\n` +
                    `_${MAX_STRIKES - user.harianStrikes}x lagi = DIPECAT_\n⏳ Retry dalam 1 jam.`
                );
            }

            sesi.jawaban.push(jawaban);
            const benar   = jawaban === sesi.kunci[sesi.idx];
            sesi.idx++;
            const selesai = sesi.idx >= sesi.soal.length;

            if (!selesai) {
                const next = sesi.soal[sesi.idx];
                let txt = benar ? `✅ *Benar!*\n\n` : `❌ *Salah!* (Jawaban: ${sesi.kunci[sesi.idx - 1]})\n\n`;
                txt += `*Soal Harian ${sesi.idx + 1}/${HARIAN_SOAL}:*\n${next.q}\n\n`;
                txt += `🅰️ ${next.opt.A}\n🅱️ ${next.opt.B}\n🇨 ${next.opt.C}\n🇩 ${next.opt.D}\n\n💡 \`!jawab A/B/C/D\``;
                user.harianAktif = sesi;
                saveDB(db);
                return msg.reply(txt);
            }

            // Hitung hasil kuis harian
            user.harianAktif = null;
            let benarCount = sesi.jawaban.filter((j, i) => j === sesi.kunci[i]).length;
            // Tambah hasil soal terakhir
            const job      = JOBS[user.job];
            const lulusHarian = benarCount >= HARIAN_LULUS;
            const hasilTxt = benar ? '✅ Benar!' : `❌ Salah! (Jawaban: ${sesi.kunci[sesi.idx - 1]})`;

            let txt = `${hasilTxt}\n\n📊 *HASIL KUIS HARIAN — ${job.role}*\n${'─'.repeat(28)}\n`;
            txt += `Benar : ${benarCount}/${HARIAN_SOAL}\nTarget: ${HARIAN_LULUS}/${HARIAN_SOAL}\n\n`;

            if (lulusHarian) {
                if (user.harianStrikes > 0) user.harianStrikes--;
                user.harianStreak = (user.harianStreak || 0) + 1;
                user.harianDoneAt  = now;
                user.harianRetryCd = 0;

                const streak    = user.harianStreak;
                const bonusPct  = getStreakBonus(streak);

                // Perfect score bonus (5/5)
                let perfectBonus = 0;
                if (benarCount === HARIAN_SOAL) {
                    perfectBonus = Math.floor(job.salary * 0.15);
                    user.balance     += perfectBonus;
                    user.dailyIncome  = (user.dailyIncome || 0) + perfectBonus;
                    tambahIncome(user, perfectBonus);
                }

                txt += `🎉 *LULUS!*\n`;
                txt += `🔥 Streak: *${streak} hari* ${bonusPct > 0 ? `(+${bonusPct * 100}% gaji saat !kerja!)` : ''}\n`;
                txt += `💚 Strike: ${strikeBar(user.harianStrikes)} (${user.harianStrikes}/${MAX_STRIKES})\n`;
                if (perfectBonus > 0) txt += `⭐ *PERFECT SCORE!* Bonus instan: *Rp ${fmt(perfectBonus)}*\n`;
                txt += `\n✅ Ketik \`!kerja\` untuk mulai bekerja!`;
            } else {
                user.harianStrikes = (user.harianStrikes || 0) + 1;
                user.harianStreak  = 0;
                user.harianRetryCd = now + HARIAN_RETRY;

                if (user.harianStrikes >= MAX_STRIKES) {
                    const oldJob = job.role;
                    user.job = null; user.lastWork = 0;
                    txt += `❌ *TIDAK LULUS.*\n\n💥 *=== DIPECAT! ===*\n`;
                    txt += `Sudah gagal kuis harian *${user.harianStrikes}x*!\n`;
                    txt += `Profesi *${oldJob}* dicabut.\n\n`;
                    txt += `_Sertifikat tetap tersimpan. Lamar lagi: \`!lamar\`_`;
                } else {
                    txt += `❌ *TIDAK LULUS.* Kurang ${HARIAN_LULUS - benarCount} benar.\n`;
                    txt += `⚠️ *Strike ${user.harianStrikes}/${MAX_STRIKES}* ${strikeBar(user.harianStrikes)}\n`;
                    txt += `_${MAX_STRIKES - user.harianStrikes}x lagi = DIPECAT!_\n`;
                    txt += `🔄 Streak direset ke 0.\n⏳ Retry dalam *1 jam*.`;
                }
            }

            saveDB(db);
            return msg.reply(txt);
        }

        // ── UJIAN SERTIFIKASI ─────────────────────────────────────
        const sesi = user.ujianAktif;

        if (now - sesi.startedAt > 30 * 60 * 1000) {
            user.ujianAktif    = null;
            user.ujianCooldown = now + (30 * 60 * 1000);
            saveDB(db);
            return msg.reply("⏰ *Waktu habis!* (30 menit)\nCooldown 30 menit. Pelajari materinya dulu.");
        }

        sesi.jawaban.push(jawaban);
        const benar   = jawaban === sesi.kunci[sesi.idx];
        sesi.idx++;
        const selesai = sesi.idx >= sesi.soal.length;

        if (!selesai) {
            const next  = sesi.soal[sesi.idx];
            let txt = benar ? `✅ *Benar!*\n\n` : `❌ *Salah!* (Jawaban: ${sesi.kunci[sesi.idx - 1]})\n\n`;
            txt += `*Soal ${sesi.idx + 1}/${UJIAN_SOAL}:*\n${next.q}\n\n`;
            txt += `🅰️ ${next.opt.A}\n🅱️ ${next.opt.B}\n🇨 ${next.opt.C}\n🇩 ${next.opt.D}\n\n💡 \`!jawab A/B/C/D\``;
            user.ujianAktif = sesi;
            saveDB(db);
            return msg.reply(txt);
        }

        user.ujianAktif = null;
        const benarCount = sesi.jawaban.filter((j, i) => j === sesi.kunci[i]).length;
        const job        = JOBS[sesi.job];
        const lulus      = benarCount >= UJIAN_LULUS;
        const pct        = Math.round((benarCount / UJIAN_SOAL) * 100);
        const hasilTxt   = benar ? '✅ Benar!' : `❌ Salah! (Jawaban: ${sesi.kunci[sesi.idx - 1]})`;

        let txt = `${hasilTxt}\n\n📊 *HASIL UJIAN SERTIFIKASI: ${job.role}*\n${'─'.repeat(28)}\n`;
        txt += `Benar : ${benarCount}/${UJIAN_SOAL} (${pct}%)\nTarget: ${UJIAN_LULUS}/${UJIAN_SOAL} (80%)\n\n`;

        if (lulus) {
            if (!user.sertifikat.includes(sesi.job)) user.sertifikat.push(sesi.job);
            txt += `🎓 *SELAMAT! KAMU LULUS!* 🎉\nSertifikat *${job.role}* diraih!\n\n`;
            txt += `💼 Ketik \`!lamar ${sesi.job}\`\n\n`;
            txt += `📌 *Info Kuis Harian setelah rekrut:*\n`;
            txt += `5 soal wajib sebelum !kerja tiap hari. Gagal 3x = dipecat!`;
        } else {
            user.ujianCooldown = now + (30 * 60 * 1000);
            txt += `❌ *TIDAK LULUS.* Kurang ${UJIAN_LULUS - benarCount} benar lagi.\n`;
            txt += `Pelajari: \`!kursus ${sesi.job}\`\n⏳ Ujian ulang 30 menit lagi.`;
        }

        saveDB(db);
        return msg.reply(txt);
    }

    // ============================================================
    // !lamar
    // ============================================================
    if (command === 'lamar') {
        const target = args[0]?.toLowerCase();
        if (user.job) return msg.reply(`❌ Sudah jadi *${JOBS[user.job].role}*.\nKetik \`!resign\` dulu.`);
        if (!target || !JOBS[target]) return msg.reply("❌ Profesi tidak ditemukan. Cek `!jobs`.");

        const job = JOBS[target];

        if (!user.sertifikat.includes(target)) {
            return msg.reply(
                `❌ *Belum punya sertifikat ${job.role}!*\n\n` +
                `1️⃣ \`!kursus ${target}\` — Pelajari materi\n` +
                `2️⃣ \`!ujian ${target}\` — Ikuti ujian (15 soal, 80% lulus)\n` +
                `3️⃣ \`!lamar ${target}\` — Lamar setelah lulus`
            );
        }

        if (user.balance < job.cost) return msg.reply(
            `❌ Modal kurang!\nButuh: Rp ${fmt(job.cost)}\nSaldo: Rp ${fmt(user.balance)}`
        );

        user.balance      -= job.cost;
        user.job           = target;
        user.lastWork      = 0;
        user.lastSkill     = 0;
        user.harianStrikes = 0;
        user.harianStreak  = 0;
        user.harianDoneAt  = 0;
        user.harianRetryCd = 0;
        user.harianAktif   = null;
        saveDB(db);

        return msg.reply(
            `🎉 *SELAMAT BERGABUNG!*\nKamu resmi jadi *${job.role}*! 🎓\n` +
            `💰 Gaji: Rp ${fmt(job.salary)} / ${job.cooldown} menit\n\n` +
            `📌 *Aturan Kerja:*\n` +
            `▸ Kuis harian 5 soal wajib sebelum \`!kerja\`\n` +
            `▸ Minimal 4/5 benar | timeout 10 menit\n` +
            `▸ Gagal 3x = *DIPECAT OTOMATIS*\n` +
            `▸ Streak lulus = bonus gaji hingga +50%!\n\n` +
            `Ketik \`!kerja\` untuk mulai!`
        );
    }

    // ============================================================
    // !resign
    // ============================================================
    if (command === 'resign') {
        if (!user.job) return msg.reply("❌ Kamu sudah pengangguran.");
        const old          = JOBS[user.job].role;
        user.job           = null;
        user.harianStrikes = 0;
        user.harianStreak  = 0;
        user.harianAktif   = null;
        saveDB(db);
        return msg.reply(`👋 Resign dari *${old}*.\n_Sertifikat tetap tersimpan._`);
    }

    // ============================================================
    // !kerja / !work
    // ============================================================
    if (command === 'kerja' || command === 'work') {
        if (!user.job) return msg.reply("❌ Pengangguran! `!lamar` dulu.");

        const job = JOBS[user.job];

        // Kuis harian sedang berlangsung → tampilkan soal aktif
        if (user.harianAktif) {
            const sesi    = user.harianAktif;
            const soalNow = sesi.soal[sesi.idx];
            return msg.reply(
                `📋 *Selesaikan kuis harian dulu!*\n\n` +
                `*Soal Harian ${sesi.idx + 1}/${HARIAN_SOAL}:*\n${soalNow.q}\n\n` +
                `🅰️ ${soalNow.opt.A}\n🅱️ ${soalNow.opt.B}\n🇨 ${soalNow.opt.C}\n🇩 ${soalNow.opt.D}\n\n` +
                `💡 \`!jawab A/B/C/D\``
            );
        }

        const kuisDone = user.harianDoneAt > now - HARIAN_CD_MS;

        if (!kuisDone) {
            // Masih cooldown retry setelah gagal?
            if (user.harianRetryCd > now) {
                const mnt = Math.ceil((user.harianRetryCd - now) / 60000);
                return msg.reply(
                    `⏳ *Kuis harian gagal tadi.*\n` +
                    `Tunggu *${mnt} menit* sebelum retry.\n\n` +
                    `⚠️ Strike: ${strikeBar(user.harianStrikes)} (${user.harianStrikes}/${MAX_STRIKES})\n` +
                    `_Pelajari dulu: \`!kursus ${user.job}\`_`
                );
            }

            // Mulai kuis harian
            const soalHari = ambilSoal(job.tier, HARIAN_SOAL);
            user.harianAktif = {
                soal: soalHari, kunci: soalHari.map(s => s.a),
                jawaban: [], idx: 0, startedAt: now,
            };
            saveDB(db);

            const s1  = soalHari[0];
            let txt   = `📋 *KUIS HARIAN — ${job.role}*\n`;
            txt += `${HARIAN_SOAL} soal | Lulus: ${HARIAN_LULUS}/${HARIAN_SOAL} | Timeout: 10 menit\n`;
            txt += `⚠️ Strike: ${strikeBar(user.harianStrikes)} (${user.harianStrikes}/${MAX_STRIKES}) | 🔥 Streak: ${user.harianStreak} hari\n`;
            txt += `${'─'.repeat(28)}\n\n`;
            txt += `*Soal Harian 1/${HARIAN_SOAL}:*\n${s1.q}\n\n`;
            txt += `🅰️ ${s1.opt.A}\n🅱️ ${s1.opt.B}\n🇨 ${s1.opt.C}\n🇩 ${s1.opt.D}\n\n`;
            txt += `💡 \`!jawab A/B/C/D\``;
            return msg.reply(txt);
        }

        // Kuis harian lulus → cek cooldown kerja lalu gaji
        const cooldownMs = job.cooldown * 60 * 1000;
        const diff       = now - user.lastWork;

        if (diff < cooldownMs) {
            const sisa = Math.ceil((cooldownMs - diff) / 60000);
            return msg.reply(`⏳ Capek! Kerja lagi dalam *${sisa} menit*.`);
        }

        const bonusPct  = getStreakBonus(user.harianStreak);
        const bonusGaji = Math.floor(job.salary * bonusPct);
        const totalGaji = job.salary + bonusGaji;

        user.balance     += totalGaji;
        user.dailyIncome  = (user.dailyIncome || 0) + totalGaji;
        tambahIncome(user, totalGaji);
        user.lastWork     = now;
        user.xp          += 50;
        saveDB(db);

        let txt = `⚒️ *KERJA KERAS BAGAI KUDA*\nProfesi: ${job.role}\n`;
        txt += `💰 Gaji Dasar: Rp ${fmt(job.salary)}\n`;
        if (bonusGaji > 0) txt += `🔥 Streak Bonus (+${bonusPct * 100}%): *+Rp ${fmt(bonusGaji)}*\n`;
        txt += `💵 Total: *Rp ${fmt(totalGaji)}*\n`;
        txt += `🧾 Est. PPh: ~Rp ${fmt(Math.floor(totalGaji * 0.05))}\n`;
        if (user.harianStreak > 0) txt += `🏅 Streak: ${user.harianStreak} hari berturut\n`;
        txt += `_Bayar pajak via !bayarpajak_`;
        return msg.reply(txt);
    }

    // ============================================================
    // !skill
    // ============================================================
    if (command === 'skill') {
        if (!user.job) return msg.reply("❌ Pengangguran gak punya skill.");

        const SKILL_CD = 5 * 60 * 60 * 1000;
        const diff     = now - user.lastSkill;
        if (diff < SKILL_CD) {
            const h = Math.ceil((SKILL_CD - diff) / (60 * 60 * 1000));
            return msg.reply(`⏳ Skill cooldown! Tunggu *${h} jam* lagi.`);
        }

        const save = () => { user.lastSkill = now; saveDB(db); };

        if (user.job === 'kuli') {
            const b = 100_000 + Math.floor(Math.random() * 300_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b;
            tambahIncome(user, b); save();
            return msg.reply(`⛏️ *SKILL KULI!*\nLembur bayaran!\n💰 Bonus: Rp ${fmt(b)}`);
        }
        if (user.job === 'petani') {
            if (!user.farm?.plants?.length) return msg.reply("❌ Ladang kosong. Tanam dulu!");
            user.farm.plants.forEach(p => p.readyAt -= (3 * 60 * 60 * 1000)); save();
            return msg.reply(`🌾 *SKILL PETANI!*\nSemua tanaman dipercepat 3 jam!`);
        }
        if (user.job === 'nelayan') {
            const b = 1_000_000 + Math.floor(Math.random() * 4_000_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b;
            tambahIncome(user, b); save();
            return msg.reply(`🎣 *SKILL NELAYAN!*\nTangkap ikan langka!\n💰 Bonus: Rp ${fmt(b)}`);
        }
        if (user.job === 'peternak') {
            if (!user.ternak?.length) return msg.reply("❌ Kandang kosong.");
            user.ternak.forEach(a => a.lastFeed -= (6 * 60 * 60 * 1000)); save();
            return msg.reply(`🤠 *SKILL PETERNAK!*\nSemua hewan lapar & siap makan!`);
        }
        if (user.job === 'driver') {
            const b = 500_000 + Math.floor(Math.random() * 2_000_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b;
            tambahIncome(user, b); save();
            return msg.reply(`🚗 *SKILL DRIVER!*\nPelanggan royal kasih tip!\n💰 Tip: Rp ${fmt(b)}`);
        }
        if (user.job === 'chef') {
            const b = 5_000_000 + Math.floor(Math.random() * 10_000_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b;
            tambahIncome(user, b); save();
            return msg.reply(`👨‍🍳 *SKILL CHEF!*\nMenu spesial terjual habis!\n💰 Profit: Rp ${fmt(b)}`);
        }
        if (user.job === 'guru') {
            user.xp += 200; save();
            return msg.reply(`📚 *SKILL GURU!*\nMembagikan ilmu!\n✨ XP +200`);
        }
        if (user.job === 'polisi') {
            const b = 5_000_000 + Math.floor(Math.random() * 10_000_000);
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b;
            tambahIncome(user, b); save();
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
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b;
            tambahIncome(user, b); save();
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
            user.balance += b; user.dailyIncome = (user.dailyIncome || 0) + b;
            tambahIncome(user, b); save();
            return msg.reply(`🏛️ *SKILL SENATOR!*\nDana aspirasi cair!\n💰 Dana: Rp ${fmt(b)}`);
        }
        if (user.job === 'oligarki') {
            user.oligarkiBoostUntil = now + (60 * 60 * 1000); save();
            return msg.reply(`🤑 *SKILL OLIGARKI!*\nMonopoli pasar! Penjualan +50% selama 1 jam!`);
        }

        return msg.reply("❌ Skill belum tersedia untuk profesi ini.");
    }
};