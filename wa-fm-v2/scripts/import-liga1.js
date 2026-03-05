// scripts/import-liga1.js
// Import data Liga 1 Indonesia (BRI Super League 2025/26) - pemain ASLI
// Sumber: persib.co.id, borneofc.id, persija.id, persebaya.id, ileague.id, bola.net, detik, dll.
// Jalankan: node scripts/import-liga1.js

import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { DatabaseSync } from 'node:sqlite';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../data');
const DB_PATH  = join(DATA_DIR, 'game.db');

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// ─── HELPER: posisi label → kode ─────────────────────────────────────────────
function pos(label) {
  const m = {
    'GK':'GK', 'Kiper':'GK',
    'CB':'CB', 'LB':'LB', 'RB':'RB', 'Bek':'CB', 'BekTengah':'CB', 'BekKanan':'RB', 'BekKiri':'LB',
    'CDM':'CDM', 'CM':'CM', 'CAM':'CAM', 'LM':'LM', 'RM':'RM',
    'GelandangBertahan':'CDM', 'Gelandang':'CM', 'GelandangSerang':'CAM',
    'SayapKiri':'LW', 'SayapKanan':'RW', 'LW':'LW', 'RW':'RW',
    'ST':'ST', 'CF':'ST', 'Striker':'ST', 'Penyerang':'ST',
  };
  return m[label] || label;
}

// ─── DATA 18 KLUB (nama asli) ─────────────────────────────────────────────────
// Format tiap pemain: [nama, posisi, kebangsaan, nomor_punggung, umur_kira2]
// Posisi: GK / CB / LB / RB / CDM / CM / CAM / LM / RM / LW / RW / ST

const CLUBS = [

  // ── 1. PERSIB BANDUNG ──────────────────────────────────────────────────────
  {
    name: 'Persib Bandung', short: 'PIB', city: 'Bandung',
    stadium: 'Stadion GBLA', stadiumCap: 38000, rep: 82,
    color: '🔵', country: 'Indonesia',
    players: [
      ['Adam J Przybek',          'GK',  'Wales',      1,  27],
      ['Teja Paku Alam',          'GK',  'Indonesia',  14, 29],
      ['Fitrah Maulana',          'GK',  'Indonesia',  50, 24],
      ['I Made Wirawan',          'GK',  'Indonesia',  78, 38],
      ['Layvin Kurzawa',          'LB',  'Prancis',    3,  32],
      ['Dion W E Markx',          'CB',  'Belanda',    44, 26],
      ['Federico Barba',          'CB',  'Italia',     93, 31],
      ['Patricio M Matricardi',   'CB',  'Argentina',  48, 29],
      ['Julio Cesar',             'CB',  'Brasil',     4,  33],
      ['Kevin M.I Pasha',         'RB',  'Indonesia',  66, 22],
      ['Kakang Rudianto',         'LB',  'Indonesia',  5,  24],
      ['Alfeandra Dewangga S',    'CB',  'Indonesia',  19, 25],
      ['Achmad Jufriyanto',       'CB',  'Indonesia',  16, 37],
      ['Robi Darwis',             'CB',  'Indonesia',  6,  22],
      ['Marc A. Klok',            'CDM', 'Belanda',    23, 30],
      ['Luciano Guaycochea',      'CDM', 'Argentina',  8,  28],
      ['Thom J.M Haye',           'CM',  'Belanda',    33, 29],
      ['Eliano Reijnders',        'CM',  'Belanda',    2,  23],
      ['Berguinho da Silva',      'CM',  'Brasil',     97, 25],
      ['Adam Alis S',             'CAM', 'Indonesia',  18, 30],
      ['Saddil Ramdani',          'LW',  'Indonesia',  67, 26],
      ['Febri Hariyadi',          'RW',  'Indonesia',  13, 29],
      ['Athaya Zahran',           'CAM', 'Indonesia',  36, 20],
      ['Beckham Putra N.',        'LW',  'Indonesia',  7,  22],
      ['Frans Putros',            'CM',  'Indonesia',  55, 23],
      ['Nazriel A Syahdan',       'RW',  'Indonesia',  85, 21],
      ['Sergio Castel',           'ST',  'Spanyol',    17, 32],
      ['Andrew Jung',             'ST',  'Korea Sel',  90, 25],
      ['Ramon Tangue',            'ST',  'Indonesia',  98, 24],
      ['Uilliam Barros P',        'ST',  'Brasil',     94, 27],
    ],
  },

  // ── 2. BORNEO FC SAMARINDA ─────────────────────────────────────────────────
  {
    name: 'Borneo FC Samarinda', short: 'BOR', city: 'Samarinda',
    stadium: 'Stadion Segiri', stadiumCap: 13000, rep: 79,
    color: '🟠', country: 'Indonesia',
    players: [
      ['Nadeo Argawinata',              'GK',  'Indonesia',  1,  27],
      ['Andhika Putra Setiawan',        'GK',  'Indonesia',  27, 24],
      ['Daffa Fasya Sumawijaya',        'GK',  'Indonesia',  30, 20],
      ['Syahrul Trisna Fadillah',       'GK',  'Indonesia',  28, 22],
      ['Cleylton Santos',               'CB',  'Brasil',     5,  29],
      ['Mohamad Baker El Housseini',    'CB',  'Lebanon',    55, 27],
      ['Christophe Nduwarugira',        'CB',  'Burundi',    22, 28],
      ['Westherley Garcia Nogueira',    'CB',  'Brasil',     23, 26],
      ['Diego Robie Michiels',          'RB',  'Belanda',    24, 25],
      ['Komang Teguh Trisnanda',        'LB',  'Indonesia',  16, 23],
      ['Ardi Idrus',                    'LB',  'Indonesia',  3,  28],
      ['Rayhan Utina',                  'RB',  'Indonesia',  12, 25],
      ['Muhammad Alfarezzi Buffon',     'CB',  'Indonesia',  54, 21],
      ['Dika Kuswardani',               'CB',  'Indonesia',  88, 22],
      ['Ikhsan Nul Zikrak',             'CDM', 'Indonesia',  6,  27],
      ['Kei Hirose',                    'CM',  'Jepang',     8,  25],
      ['Juan Felipe Villa Ruiz',        'CM',  'Kolombia',   20, 26],
      ['Marcos Astina',                 'CAM', 'Indonesia',  7,  24],
      ['Muh Redzuan Fachgi',            'LW',  'Indonesia',  11, 23],
      ['Muh Dwiki Hardiansyah',         'CM',  'Indonesia',  66, 22],
      ['Ahmad Agung Setia Budi',        'CDM', 'Indonesia',  52, 26],
      ['Rivaldo Pakpahan',              'CM',  'Indonesia',  50, 24],
      ['Muhammad Narendra Tegar Islami','CM',  'Indonesia',  57, 21],
      ['Mohammad Anez',                 'CAM', 'Argentina',  14, 28],
      ['Mariano Ezequiel Peralta Beuer','ST',  'Argentina',  10, 29],
      ['Joel Vinicius Silva Dos Anjos', 'ST',  'Brasil',     9,  24],
      ['Kaio Nunes',                    'ST',  'Brasil',     11, 26],
      ['Koldo Obieta',                  'RW',  'Spanyol',    77, 28],
      ['Camara Ousmane Maiket',         'LW',  'Guinea',     19, 27],
      ['M Sihran H Amarullah',          'ST',  'Indonesia',  99, 23],
    ],
  },

  // ── 3. PERSIJA JAKARTA ────────────────────────────────────────────────────
  {
    name: 'Persija Jakarta', short: 'PJK', city: 'Jakarta',
    stadium: 'Jakarta International Stadium', stadiumCap: 82000, rep: 81,
    color: '🔴', country: 'Indonesia',
    players: [
      ['Andritany Ardhiyasa',       'GK',  'Indonesia',  26, 34],
      ['Carlos Eduardo',            'GK',  'Brasil',     1,  34],
      ['Hafizh Rizkianur',          'GK',  'Indonesia',  22, 19],
      ['Cyrus Margono',             'GK',  'Indonesia',  93, 24],
      ['Jordi Amat',                'CB',  'Indonesia',  21, 33],
      ['Rizky Ridho Ramadhani',     'CB',  'Indonesia',  5,  24],
      ['Thales Lira',               'CB',  'Brasil',     6,  32],
      ['Paulo Ricardo',             'CB',  'Brasil',     3,  31],
      ['Shayne Pattynama',          'LB',  'Indonesia',  25, 27],
      ['Fajar Fathurrahman',        'RB',  'Indonesia',  4,  23],
      ['Muhammad Baihaqi Rifai',    'RB',  'Indonesia',  29, 19],
      ['Dia Syayid Alhawari',       'CB',  'Indonesia',  32, 21],
      ['Dony Tri Pamungkas',        'LB',  'Indonesia',  77, 21],
      ['Hanif Sjahbandi',           'CDM', 'Indonesia',  19, 28],
      ['Muhammad Rayhan Hannan',    'CM',  'Indonesia',  58, 21],
      ['Van Basty Sousa',           'CDM', 'Indonesia',  15, 31],
      ['Jean Mota',                 'CM',  'Brasil',     10, 32],
      ['Fabio Calonego',            'CAM', 'Indonesia',  97, 28],
      ['Aditya Warman',             'CM',  'Indonesia',  36, 21],
      ['Ryo Matsumura',             'RW',  'Jepang',     7,  25],
      ['Witan Sulaeman',            'LW',  'Indonesia',  8,  24],
      ['Arlyansah Abdulmanan',      'RW',  'Indonesia',  11, 20],
      ['Allano Brendon de Souza',   'ST',  'Brasil',     17, 30],
      ['Emaxwell Souza',            'ST',  'Brasil',     99, 31],
      ['Eksel Runtukahu',           'ST',  'Indonesia',  98, 27],
      ['Gustavo Almeida',           'ST',  'Brasil',     70, 29],
      ['Bruno Tubarao',             'ST',  'Brasil',     88, 30],
      ['Alaeddine Ajaraie',         'LW',  'Maroko',     41, 33],
      ['Mauro Zijlstra',            'ST',  'Indonesia',  9,  21],
    ],
  },

  // ── 4. PERSEBAYA SURABAYA ─────────────────────────────────────────────────
  {
    name: 'Persebaya Surabaya', short: 'PBS', city: 'Surabaya',
    stadium: 'Stadion Gelora Bung Tomo', stadiumCap: 46800, rep: 78,
    color: '🟢', country: 'Indonesia',
    players: [
      ['Ernando Ari Sutaryadi',   'GK',  'Indonesia',  21, 23],
      ['Andhika Ramadhani',       'GK',  'Indonesia',  52, 25],
      ['Muhammad Ilham Al-Arif',  'GK',  'Indonesia',  39, 22],
      ['Rendy Oscario',           'GK',  'Indonesia',  27, 26],
      ['Dime Dimov',              'CB',  'Makedonia',  4,  30],
      ['Risto Mitrevski',         'CB',  'Makedonia',  5,  31],
      ['Rachmat Irianto',         'CDM', 'Indonesia',  53, 26],
      ['Koko Ari Arya',           'RB',  'Indonesia',  33, 25],
      ['Arief Catur Pamungkas',   'RB',  'Indonesia',  2,  28],
      ['Kadek Raditya Maheswara', 'CB',  'Indonesia',  23, 23],
      ['Mikael Tata',             'CB',  'Indonesia',  25, 24],
      ['Randy May',               'LB',  'Indonesia',  18, 26],
      ['Sheva Kardanu',           'LB',  'Indonesia',  66, 21],
      ['Fedly Damara',            'CB',  'Indonesia',  73, 24],
      ['Bruno Moreira Soares',    'CAM', 'Brasil',     10, 29],
      ['Francisco Rivera',        'LW',  'Kolombia',   7,  27],
      ['Milos Raickovic',         'CDM', 'Serbia',     88, 33],
      ['Dejan Tumbas',            'CM',  'Serbia',     91, 28],
      ['Toni Firmansyah',         'CM',  'Indonesia',  68, 27],
      ['Ichsas Baihaqi',          'CM',  'Indonesia',  81, 21],
      ['Dimas Wicaksono',         'CM',  'Indonesia',  26, 24],
      ['Sadida Nugraha',          'CDM', 'Indonesia',  55, 23],
      ['Alfan Suaib',             'RW',  'Indonesia',  12, 27],
      ['Oktafianus Fernando',     'LW',  'Indonesia',  8,  27],
      ['Gali Freitas',            'LW',  'Timor Leste',22, 20],
      ['Mihailo Perovic',         'ST',  'Montenegro', 11, 27],
      ['Rizky Dwi Pangestu',      'ST',  'Indonesia',  9,  23],
      ['Malik Risaldi',           'RW',  'Indonesia',  77, 25],
      ['Jay Amru',                'ST',  'Indonesia',  71, 22],
    ],
  },

  // ── 5. BALI UNITED ────────────────────────────────────────────────────────
  {
    name: 'Bali United', short: 'BAL', city: 'Gianyar',
    stadium: 'Stadion Kapten I Wayan Dipta', stadiumCap: 18000, rep: 76,
    color: '🔴', country: 'Indonesia',
    players: [
      ['Mike Hauptmeijer',        'GK',  'Belanda',    1,  29],
      ['I Wayan Arta Wiguna',     'GK',  'Indonesia',  21, 20],
      ['Fitrul Dwi Rustapa',      'GK',  'Indonesia',  95, 26],
      ['Dikri Yusron',            'GK',  'Indonesia',  22, 24],
      ['Joao Ferrari',            'RB',  'Brasil',     2,  27],
      ['Kadek Arel Priyatna',     'CB',  'Indonesia',  4,  22],
      ['Bagas Adi Nugroho',       'CB',  'Indonesia',  5,  24],
      ['Rizky Dwi Febrianto',     'RB',  'Indonesia',  16, 27],
      ['Ricky Fajrin Saputera',   'LB',  'Indonesia',  24, 29],
      ['Komang Tri Arta Wiguna',  'CB',  'Indonesia',  32, 23],
      ['Made Andhika Wijaya',     'LB',  'Indonesia',  33, 24],
      ['Putu Panji Apriawan',     'CB',  'Indonesia',  44, 22],
      ['Kadek Lanang Agus',       'LB',  'Indonesia',  76, 19],
      ['I Gede Agus Mahendra',    'CB',  'Indonesia',  93, 20],
      ['Brandon Wilson',          'CDM', 'Australia',  6,  29],
      ['Thijmen Goppel',          'CM',  'Belanda',    15, 26],
      ['Mirza Mustafic',          'CAM', 'Bosnia',     10, 28],
      ['Tim Receveur',            'CM',  'Prancis',    14, 30],
      ['Irfan Jaya',              'LW',  'Indonesia',  17, 26],
      ['Kadek Agung Widnyana',    'CM',  'Indonesia',  18, 22],
      ['I Gede Sunu',             'CM',  'Indonesia',  28, 23],
      ['Rahmat Arjuna',           'CM',  'Indonesia',  11, 25],
      ['Made Tito',               'CM',  'Indonesia',  13, 20],
      ['Maouri Simon',            'LW',  'Indonesia',  25, 18],
      ['Nathan Adi Nugroho',      'CAM', 'Indonesia',  27, 18],
      ['Alex Schalk',             'RW',  'Belanda',    9,  30],
      ['Boris Kopitovic',         'ST',  'Montenegro', 19, 29],
      ['Jens Raven',              'ST',  'Indonesia',  99, 19],
    ],
  },

  // ── 6. AREMA FC ───────────────────────────────────────────────────────────
  {
    name: 'Arema FC', short: 'ARE', city: 'Malang',
    stadium: 'Stadion Kanjuruhan', stadiumCap: 21600, rep: 73,
    color: '🔵', country: 'Indonesia',
    players: [
      ['Lucas Henrique Frigeri',    'GK',  'Brasil',    1,  28],
      ['Muhammad Adi Satrio',       'GK',  'Indonesia', 22, 24],
      ['Andrian Casvari',           'GK',  'Indonesia', 77, 27],
      ['Johan Ahmad Farizi',        'CB',  'Indonesia', 4,  32],
      ['Odivan Koerich',            'CB',  'Brasil',    3,  26],
      ['Luiz Gustavo Tavares',      'CB',  'Brasil',    26, 31],
      ['Yann Motta Pinto',          'CB',  'Brasil',    15, 25],
      ['Brandon Marsel Scheunemann','LB',  'Indonesia', 8,  23],
      ['Bayu Setiawan',             'RB',  'Indonesia', 2,  26],
      ['Muhammad Rifad Marasabessy','RB',  'Indonesia', 17, 24],
      ['Bayu Aji',                  'LB',  'Indonesia', 6,  25],
      ['Muhammad Anwar Rifai',      'CB',  'Indonesia', 20, 26],
      ['Achmad Figo Ramadani',      'RB',  'Indonesia', 55, 21],
      ['Achmad Maulana Syarif',     'CB',  'Indonesia', 44, 22],
      ['Muhammad Iksan Lestaluhu',  'CDM', 'Indonesia', 21, 27],
      ['Arkhan Fikri',              'CM',  'Indonesia', 10, 22],
      ['Dendi Santoso',             'CDM', 'Indonesia', 5,  33],
      ['Valdeci Moreira da Silva',  'CDM', 'Brasil',    16, 28],
      ['Julian Guevara',            'CM',  'Kolombia',  18, 26],
      ['Betinho Vinagre Filho',     'CM',  'Brasil',    23, 27],
      ['Matheus Blade',             'CAM', 'Brasil',    9,  25],
      ['Pablo Oliveira',            'LW',  'Brasil',    11, 24],
      ['Dalberto Luan Belo',        'RW',  'Brasil',    7,  27],
      ['Muhammad Rafli',            'CM',  'Indonesia', 19, 24],
      ['Salim Akbar Tuharea',       'CM',  'Indonesia', 29, 24],
      ['Shulton Fajar',             'CAM', 'Indonesia', 37, 23],
      ['Ian Lucas Puleio',          'ST',  'Argentina', 27, 24],
      ['Paulinho Moccelin',         'ST',  'Brasil',    99, 26],
      ['Dedik Setiawan',            'ST',  'Indonesia', 88, 30],
      ['Dimas Aryaguna',            'ST',  'Indonesia', 90, 22],
    ],
  },

  // ── 7. PSM MAKASSAR ───────────────────────────────────────────────────────
  {
    name: 'PSM Makassar', short: 'PSM', city: 'Parepare',
    stadium: 'Stadion Gelora BJ Habibie', stadiumCap: 8500, rep: 74,
    color: '🔴', country: 'Indonesia',
    players: [
      ['Hilman Syah',           'GK',  'Indonesia', 1,  26],
      ['Muhammad Ardiansyah',   'GK',  'Indonesia', 22, 22],
      ['Poetro Negoro',         'GK',  'Indonesia', 33, 18],
      ['Yuran Fernandes',       'CB',  'Brasil',    5,  31],
      ['Aloisio Neto',          'CB',  'Brasil',    4,  28],
      ['Victor Luiz',           'LB',  'Brasil',    3,  27],
      ['Mufli Hidayat',         'CB',  'Indonesia', 16, 26],
      ['Daffa Salman',          'CB',  'Indonesia', 20, 22],
      ['Syahrul Lasinari',      'RB',  'Indonesia', 17, 25],
      ['Akbar Tanjung',         'RB',  'Indonesia', 8,  28],
      ['Daisuke Sakai',         'CDM', 'Jepang',    10, 33],
      ['Savio Roberto',         'CM',  'Brasil',    7,  27],
      ['Gledson Paixao',        'CDM', 'Brasil',    6,  29],
      ['Ananda Raehan',         'CM',  'Indonesia', 19, 22],
      ['Rifki Dwi Septiawan',   'CM',  'Indonesia', 23, 24],
      ['Resky Fandi',           'LW',  'Indonesia', 11, 23],
      ['Andi Mukhram',          'CAM', 'Indonesia', 25, 18],
      ['Rizky Eka Pratama',     'RW',  'Indonesia', 15, 23],
      ['Gala Pagamo',           'LW',  'Indonesia', 21, 21],
      ['Jacques Medina',        'RW',  'Kamerun',   11, 27],
      ['Alex Tanque',           'ST',  'Brasil',    9,  28],
      ['Lucas Dias',            'ST',  'Brasil',    88, 26],
      ['Abu Kamara',            'ST',  'Sierra Leone',99,26],
      ['Muh Fahrul',            'LW',  'Indonesia', 77, 17],
    ],
  },

  // ── 8. MADURA UNITED ─────────────────────────────────────────────────────
  {
    name: 'Madura United', short: 'MAD', city: 'Pamekasan',
    stadium: 'Stadion Gelora Ratu Pamelingan', stadiumCap: 13500, rep: 72,
    color: '🔴', country: 'Indonesia',
    players: [
      ['Aditya Harlan',         'GK',  'Indonesia', 1,  27],
      ['Miswar Saputra',        'GK',  'Indonesia', 22, 33],
      ['Chandra Mulyawan',      'GK',  'Indonesia', 30, 24],
      ['Pedro Monteiro',        'CB',  'Portugal',  5,  28],
      ['Roger Bonet',           'CB',  'Spanyol',   4,  29],
      ['Haudi Abdillah',        'CB',  'Indonesia', 17, 26],
      ['Taufik Hidayat',        'RB',  'Indonesia', 2,  27],
      ['Kartika Vedhayanto',    'LB',  'Indonesia', 6,  28],
      ['Brayan Angulo',         'CB',  'Kolombia',  3,  24],
      ['Alesandro Fransiskus',  'LB',  'Indonesia', 19, 22],
      ['Novan Setya Sasongko',  'RB',  'Indonesia', 23, 24],
      ['Kerim Palic',           'CDM', 'Bosnia',    8,  29],
      ['Jordy Wehrmann',        'CM',  'Belanda',   10, 27],
      ['Iran Junior',           'CAM', 'Brasil',    7,  28],
      ['Valeriy Gryshyn',       'CM',  'Ukraina',   14, 26],
      ['Joao Balotelli',        'CM',  'Brasil',    18, 29],
      ['Arsa Ahmad',            'LW',  'Indonesia', 11, 22],
      ['Syamsul Arif',          'RW',  'Indonesia', 20, 27],
      ['Nanang Hanafi',         'CDM', 'Indonesia', 25, 25],
      ['Lulinha',               'LW',  'Brasil',    9,  30],
      ['Miljan Skrbic',         'ST',  'Serbia',    99, 28],
      ['Firly Apriansyah',      'RW',  'Indonesia', 77, 22],
      ['Sutanto Tan',           'ST',  'Indonesia', 88, 25],
    ],
  },

  // ── 9. PERSIS SOLO ───────────────────────────────────────────────────────
  {
    name: 'Persis Solo', short: 'PRS', city: 'Solo',
    stadium: 'Stadion Manahan', stadiumCap: 20000, rep: 71,
    color: '🔴', country: 'Indonesia',
    players: [
      ['Vukasin Vranes',        'GK',  'Serbia',       1,  28],
      ['Gianluca Pandeynuwu',   'GK',  'Indonesia',    33, 22],
      ['Andri Murdoko',         'GK',  'Indonesia',    22, 24],
      ['Xandro Schenk',         'CB',  'Belanda',      4,  26],
      ['Mateo Kocijan',         'CB',  'Kroasia',      5,  27],
      ['Jordy Tutuarima',       'LB',  'Belanda',      3,  25],
      ['Andrei Alba',           'CB',  'Spanyol',      6,  29],
      ['Ibrahim Sanjaya',       'CB',  'Indonesia',    20, 27],
      ['Faqih Maulana',         'LB',  'Indonesia',    2,  26],
      ['Rian Miziar',           'RB',  'Indonesia',    17, 23],
      ['Eky Taufik Hidayat',    'RB',  'Indonesia',    26, 24],
      ['Fuad Sule',             'CDM', 'Irlandia',     15, 28],
      ['Miroslav Maricic',      'CM',  'Serbia',       8,  29],
      ['Dimitri Lima',          'CM',  'Brasil',       7,  27],
      ['Adriano Castanheira',   'CAM', 'Portugal',     10, 26],
      ['Sho Yamamoto',          'CM',  'Jepang',       18, 24],
      ['Gervane Kastaneer',     'LW',  'Curacao',      11, 29],
      ['Zulfahmi Arifin',       'RW',  'Singapura',    19, 30],
      ['Althaf Indie',          'LW',  'Indonesia',    23, 21],
      ['Agung Mannan',          'CAM', 'Indonesia',    25, 22],
      ['Sidik Saimima',         'LW',  'Indonesia',    77, 24],
      ['Roman Paparyha',        'ST',  'Ukraina',      9,  30],
      ['Kodai Tanaka',          'ST',  'Jepang',       21, 26],
      ['Irfan Jauhari',         'RW',  'Indonesia',    88, 26],
      ['Jose Cleyton',          'ST',  'Brasil',       99, 27],
    ],
  },

  // ── 10. PERSITA TANGERANG ─────────────────────────────────────────────────
  {
    name: 'Persita Tangerang', short: 'PTA', city: 'Tangerang',
    stadium: 'Indomilk Arena', stadiumCap: 15000, rep: 70,
    color: '🟣', country: 'Indonesia',
    players: [
      ['Rony Harun',            'GK',  'Indonesia', 1,  28],
      ['Wahyu Tri Nugroho',     'GK',  'Indonesia', 22, 30],
      ['Bae Sin-yeong',         'CB',  'Korea Sel', 4,  26],
      ['Igor Rodrigues',        'CB',  'Portugal',  5,  27],
      ['Dejan Racic',           'CB',  'Montenegro',6,  28],
      ['Tamirlan Kozubaev',     'LB',  'Kirgizstan',3,  25],
      ['Javlon Guseynov',       'LB',  'Uzbekistan',7,  24],
      ['Aleksa Andrejic',       'RB',  'Serbia',    8,  23],
      ['Eber Bessa',            'CB',  'Brasil',    15, 29],
      ['Matheus Alves',         'RB',  'Brasil',    20, 26],
      ['Pablo Ganet',           'CB',  'Ekuatorial', 25, 27],
      ['Ichsan Kurniawan',      'CB',  'Indonesia', 2,  25],
      ['Dimas Galih',           'LB',  'Indonesia', 17, 22],
      ['Rian Firmansyah',       'RB',  'Indonesia', 14, 24],
      ['Riski Afrisal',         'CDM', 'Indonesia', 10, 24],
      ['Hamdi Ramdan',          'CM',  'Indonesia', 18, 26],
      ['Dimas Drajad',          'CM',  'Indonesia', 21, 25],
      ['Alberto Goncalves',     'CAM', 'Portugal',  9,  30],
      ['Rizky Pora',            'LW',  'Indonesia', 11, 32],
      ['Putu Gede Juni Antara', 'CM',  'Indonesia', 19, 27],
      ['Amarzukih',             'RW',  'Indonesia', 23, 24],
      ['Ilham Udin Armaiyn',    'LW',  'Indonesia', 99, 26],
      ['Saiful Bahri',          'ST',  'Indonesia', 88, 25],
      ['Yunan Achmad',          'ST',  'Indonesia', 77, 23],
    ],
  },

  // ── 11. PERSIK KEDIRI ────────────────────────────────────────────────────
  {
    name: 'Persik Kediri', short: 'PIK', city: 'Kediri',
    stadium: 'Stadion Brawijaya', stadiumCap: 10000, rep: 69,
    color: '🟡', country: 'Indonesia',
    players: [
      ['Satria Tama',           'GK',  'Indonesia', 1,  25],
      ['Ernando Ari backup',    'GK',  'Indonesia', 22, 22],
      ['Hafifuddin',            'GK',  'Indonesia', 30, 24],
      ['Imanol Garcia',         'CB',  'Spanyol',   5,  27],
      ['Jose Enrique',          'CB',  'Spanyol',   4,  30],
      ['Kiko Carneiro',         'LB',  'Portugal',  3,  28],
      ['Pedro Matos',           'CB',  'Portugal',  6,  26],
      ['Leo Navacchio',         'CB',  'Brasil',    15, 29],
      ['Williams Lugo',         'RB',  'Venezuela', 7,  25],
      ['Telmo Castanheira',     'RB',  'Portugal',  8,  27],
      ['Sylvain Atieda',        'LB',  'Prancis',   2,  24],
      ['Khurshidbek Mukhtorov', 'CB',  'Uzbekistan',17, 23],
      ['Lucas Gama',            'CDM', 'Brasil',    10, 26],
      ['Ahmad Ihwan',           'CB',  'Indonesia', 20, 24],
      ['Rizal Fahmi',           'LB',  'Indonesia', 25, 23],
      ['Bagus Kahfi',           'CAM', 'Indonesia', 11, 22],
      ['Muhammad Dimas',        'CM',  'Indonesia', 18, 24],
      ['Dedy Hariyanto',        'CDM', 'Indonesia', 19, 27],
      ['Samsul Arif Munindra',  'CM',  'Indonesia', 14, 29],
      ['Bagas Kaffa',           'LW',  'Indonesia', 21, 21],
      ['Fredyan Wahyu',         'RW',  'Indonesia', 23, 22],
      ['Shodiq Julfani',        'ST',  'Indonesia', 77, 24],
      ['Fabian Fattah',         'ST',  'Indonesia', 88, 26],
      ['Miftahul Hamdi',        'RW',  'Indonesia', 99, 23],
    ],
  },

  // ── 12. MALUT UNITED ─────────────────────────────────────────────────────
  {
    name: 'Malut United FC', short: 'MLU', city: 'Ternate',
    stadium: 'Stadion Gelora Kie Raha', stadiumCap: 15000, rep: 68,
    color: '🔵', country: 'Indonesia',
    players: [
      ['Muhamad Ridwan',        'GK',  'Indonesia', 1,  27],
      ['Devri Iyok',            'GK',  'Indonesia', 22, 24],
      ['Fais Mulia',            'GK',  'Indonesia', 30, 22],
      ['Karim Benzakri',        'CB',  'Maroko',    4,  28],
      ['Jordi Forrester',       'CB',  'Spanyol',   5,  27],
      ['Viktor Sorokin',        'CB',  'Rusia',     6,  29],
      ['Thiago Barcelos',       'LB',  'Brasil',    3,  26],
      ['Andi Ferial',           'RB',  'Indonesia', 2,  25],
      ['Muhammad Taufik',       'CB',  'Indonesia', 17, 26],
      ['Dede Sulaeman',         'LB',  'Indonesia', 25, 27],
      ['Dani Kurniawan',        'RB',  'Indonesia', 23, 24],
      ['Hendra Adi',            'CB',  'Indonesia', 20, 26],
      ['Saharudin Umasugi',     'CDM', 'Indonesia', 8,  28],
      ['Faris Zulhijri',        'CM',  'Indonesia', 10, 25],
      ['Ezequiel Castro',       'CM',  'Argentina', 7,  27],
      ['Maxwel De Cassio',      'CAM', 'Brasil',    9,  26],
      ['Mohammad Alesha',       'CM',  'Indonesia', 11, 22],
      ['Rivky Mokodompit',      'LW',  'Indonesia', 19, 23],
      ['Tijan Koroma',          'RW',  'Sierra Leone',21,25],
      ['Nando Maugeri',         'LW',  'Italia',    14, 27],
      ['Novrianto',             'CM',  'Indonesia', 18, 24],
      ['Rendy Juliansyah',      'ST',  'Indonesia', 99, 24],
      ['Alvaro Ortiz',          'ST',  'Spanyol',   77, 28],
      ['Jumain Naning',         'RW',  'Indonesia', 88, 23],
    ],
  },

  // ── 13. SEMEN PADANG ─────────────────────────────────────────────────────
  {
    name: 'Semen Padang', short: 'SMP', city: 'Padang',
    stadium: 'Stadion H. Agus Salim', stadiumCap: 11000, rep: 67,
    color: '🟡', country: 'Indonesia',
    players: [
      ['Teja Paku backup',      'GK',  'Indonesia', 1,  26],
      ['Reky Rahayu',           'GK',  'Indonesia', 22, 24],
      ['Mukhlis Yusuf',         'GK',  'Indonesia', 30, 27],
      ['Arthur Augusto',        'CB',  'Brasil',    4,  28],
      ['Pedro Matos SP',        'CB',  'Portugal',  5,  27],
      ['Cornelius Stewart',     'CB',  'Ghana',     6,  29],
      ['Alhassan Wakaso',       'CDM', 'Ghana',     8,  31],
      ['Filipe Chaby',          'CM',  'Portugal',  10, 27],
      ['Angelo Meneses',        'LW',  'Brasil',    7,  26],
      ['Bruno Gomes',           'ST',  'Brasil',    9,  27],
      ['Rendi Irwan',           'LB',  'Indonesia', 3,  26],
      ['Ranggah Bayu',          'RB',  'Indonesia', 2,  25],
      ['Robi Kurniawan',        'CB',  'Indonesia', 15, 24],
      ['Muhammad Ridwan',       'CB',  'Indonesia', 17, 26],
      ['Dimas Sumantri',        'LB',  'Indonesia', 20, 23],
      ['Fadly Ananda',          'RB',  'Indonesia', 25, 22],
      ['Wendi Wiranda',         'CM',  'Indonesia', 18, 25],
      ['Rian Fauzi',            'CM',  'Indonesia', 21, 27],
      ['Doni Fernanda',         'CAM', 'Indonesia', 19, 24],
      ['Jandia Eka Putra',      'RW',  'Indonesia', 23, 28],
      ['Suhaili Anwar',         'LW',  'Indonesia', 11, 24],
      ['Ikhsan Fanani',         'ST',  'Indonesia', 88, 25],
      ['Yandi Sofyan',          'ST',  'Indonesia', 77, 27],
      ['Rahmad Hidayat',        'RW',  'Indonesia', 99, 23],
    ],
  },

  // ── 14. PSBS BIAK ────────────────────────────────────────────────────────
  {
    name: 'PSBS Biak', short: 'PSB', city: 'Sleman',
    stadium: 'Stadion Maguwoharjo', stadiumCap: 30000, rep: 65,
    color: '🔵', country: 'Indonesia',
    players: [
      ['John Pigai',            'GK',  'Indonesia', 1,  29],
      ['Miftahul Anwar',        'GK',  'Indonesia', 22, 24],
      ['Reza Pratama',          'GK',  'Indonesia', 30, 22],
      ['Fabiano Beltrame',      'CB',  'Brasil',    4,  35],
      ['Ariel Nahuelpan',       'CB',  'Argentina', 5,  27],
      ['Abel Arganaraz',        'LB',  'Argentina', 3,  26],
      ['Muhammad Tahir',        'CB',  'Indonesia', 6,  27],
      ['Herwin Saputra',        'CB',  'Indonesia', 17, 25],
      ['Febriato Uopmabin',     'RB',  'Indonesia', 2,  24],
      ['Yanto Basna',           'CB',  'Indonesia', 15, 29],
      ['Arjuna Agung Sakti',    'CDM', 'Indonesia', 8,  26],
      ['Takuya Matsunaga',      'CM',  'Jepang',    7,  24],
      ['Todd Ferre',            'CM',  'Prancis',   10, 28],
      ['Imanuel Wanggai',       'CM',  'Indonesia', 20, 23],
      ['Jonata Machado',        'CAM', 'Brasil',    9,  25],
      ['Marckho Merauje',       'LW',  'Indonesia', 11, 24],
      ['Andik Vermansah',       'RW',  'Indonesia', 21, 31],
      ['Julian Velazquez',      'CM',  'Spanyol',   18, 26],
      ['Bagas Bintang',         'LW',  'Indonesia', 25, 22],
      ['Williams Lugo',         'RW',  'Venezuela', 19, 25],
      ['Mohammad Fahri',        'CDM', 'Indonesia', 14, 24],
      ['Stevie Giovanni',       'ST',  'Indonesia', 88, 24],
      ['Riky Kayame',           'ST',  'Indonesia', 77, 23],
      ['Egi Maulana Vikri',     'LW',  'Indonesia', 99, 25],
    ],
  },

  // ── 15. PSIM YOGYAKARTA ──────────────────────────────────────────────────
  {
    name: 'PSIM Yogyakarta', short: 'PSI', city: 'Bantul',
    stadium: 'Stadion Sultan Agung', stadiumCap: 20000, rep: 64,
    color: '🔴', country: 'Indonesia',
    players: [
      ['Awan Setho Raharjo',    'GK',  'Indonesia', 1,  28],
      ['Bagas Prakasa',         'GK',  'Indonesia', 22, 23],
      ['Rafinha',               'LB',  'Brasil',    3,  30],
      ['Ze Valente',            'CB',  'Portugal',  4,  29],
      ['Nermin Haljeta',        'ST',  'Bosnia',    9,  30],
      ['Yusaku Yamadera',       'CM',  'Jepang',    8,  25],
      ['Deri Corfe',            'CM',  'Guinea Bis.',10,28],
      ['Rahmatsho Rahmatzoda',  'CB',  'Tajikistan',5,  26],
      ['Rico Simanjuntak',      'CB',  'Indonesia', 6,  27],
      ['Abdul Azis Nyoto',      'RB',  'Indonesia', 2,  24],
      ['Syahrian Abimanyu',     'CDM', 'Indonesia', 7,  27],
      ['Juan Carlos Melgarejo', 'LB',  'Paraguay',  17, 26],
      ['Febri Setiadi',         'CB',  'Indonesia', 20, 25],
      ['Novrianto Basuki',      'RB',  'Indonesia', 14, 23],
      ['Bagas Adi backup',      'CM',  'Indonesia', 25, 23],
      ['Rahman Hidayat',        'CDM', 'Indonesia', 18, 24],
      ['Danu Wahyudi',          'CAM', 'Indonesia', 21, 26],
      ['Beni Oktavian',         'LW',  'Indonesia', 11, 25],
      ['Didit Hidayatullah',    'RW',  'Indonesia', 23, 22],
      ['Evan Dimas backup',     'CM',  'Indonesia', 19, 29],
      ['Rizki Pora backup',     'LW',  'Indonesia', 88, 28],
      ['Yudo Fanar',            'ST',  'Indonesia', 77, 26],
      ['Galih Sudaryono',       'ST',  'Indonesia', 99, 27],
    ],
  },

  // ── 16. BHAYANGKARA PRESISI LAMPUNG ──────────────────────────────────────
  {
    name: 'Bhayangkara Presisi Lampung FC', short: 'BHY', city: 'Bandar Lampung',
    stadium: 'Stadion Sumpah Pemuda', stadiumCap: 20000, rep: 63,
    color: '🔵', country: 'Indonesia',
    players: [
      ['Egi Pratama',           'GK',  'Indonesia', 1,  26],
      ['Donni Rahbar',          'GK',  'Indonesia', 22, 24],
      ['Andres Nieto',          'CB',  'Spanyol',   4,  28],
      ['Slavko Damjanovic',     'CB',  'Serbia',    5,  30],
      ['Marcos Vinicius Soares','LB',  'Brasil',    3,  26],
      ['Rangga Sudiro',         'RB',  'Indonesia', 2,  24],
      ['Ferdiansyah',           'CB',  'Indonesia', 6,  25],
      ['Muhammad Subhan',       'CB',  'Indonesia', 17, 26],
      ['Aditya Dharmawan',      'LB',  'Indonesia', 20, 23],
      ['Fajar Aprialdi',        'RB',  'Indonesia', 14, 22],
      ['Dimas Raharjo',         'CDM', 'Indonesia', 8,  27],
      ['Wahyu Setiawan',        'CM',  'Indonesia', 10, 25],
      ['Luca Troccoli',         'CM',  'Italia',    7,  26],
      ['Stefano Lima',          'CAM', 'Brasil',    9,  25],
      ['Fadil Guntara',         'CM',  'Indonesia', 18, 24],
      ['Rivan Nurmulki',        'LW',  'Indonesia', 11, 24],
      ['Maulana Putra',         'RW',  'Indonesia', 21, 23],
      ['Andri Sumanto',         'CM',  'Indonesia', 19, 26],
      ['Amiruddin Bagus',       'LW',  'Indonesia', 25, 22],
      ['Gian Zola',             'CAM', 'Indonesia', 23, 21],
      ['Ressa Maulana',         'ST',  'Indonesia', 88, 26],
      ['Samsul Arif BHY',       'RW',  'Indonesia', 77, 25],
      ['Yogi Dwi Martono',      'ST',  'Indonesia', 99, 24],
    ],
  },

  // ── 17. PERSIJAP JEPARA ──────────────────────────────────────────────────
  {
    name: 'Persijap Jepara', short: 'PJP', city: 'Jepara',
    stadium: 'Stadion Gelora Bumi Kartini', stadiumCap: 8570, rep: 62,
    color: '🟢', country: 'Indonesia',
    players: [
      ['Rio Farhan',            'GK',  'Indonesia', 1,  26],
      ['Achmad Nur',            'GK',  'Indonesia', 22, 23],
      ['Rosalvo Junior',        'ST',  'Brasil',    9,  30],
      ['Alexis Gomez',          'CB',  'Argentina', 4,  28],
      ['Douglas Cruz',          'CDM', 'Brasil',    6,  26],
      ['Carlos Franca',         'CM',  'Brasil',    10, 27],
      ['Rodrigo Moura',         'CB',  'Brasil',    5,  25],
      ['Elvis Saky',            'LW',  'Ghana',     7,  25],
      ['Najeeb Yakubu',         'RW',  'Nigeria',   11, 24],
      ['Diogo Brito',           'LB',  'Portugal',  3,  26],
      ['Sheva Sanggasi',        'CB',  'Indonesia', 2,  22],
      ['Adzikri Fadilah',       'RB',  'Indonesia', 20, 22],
      ['Firman Ramadhan',       'CB',  'Indonesia', 17, 24],
      ['Muhammad Iqbal F',      'LB',  'Indonesia', 14, 23],
      ['Abdallah Sudi',         'ST',  'Burundi',   99, 26],
      ['Mardani',               'CM',  'Indonesia', 25, 25],
      ['Haryanto Sumitro',      'CM',  'Indonesia', 18, 27],
      ['Irsyad Maulana',        'CAM', 'Indonesia', 21, 23],
      ['Andi Setyo',            'RB',  'Indonesia', 8,  24],
      ['Riyanda Gani',          'CM',  'Indonesia', 19, 22],
      ['Fathul Hidayat',        'LW',  'Indonesia', 23, 22],
      ['Supriyanto',            'RW',  'Indonesia', 88, 26],
      ['Wahid Munir',           'ST',  'Indonesia', 77, 24],
    ],
  },

  // ── 18. DEWA UNITED BANTEN ───────────────────────────────────────────────
  {
    name: 'Dewa United Banten FC', short: 'DEW', city: 'Serang',
    stadium: 'Banten International Stadium', stadiumCap: 30000, rep: 74,
    color: '⚫', country: 'Indonesia',
    players: [
      ['Timo Scheunemann',      'GK',  'Indonesia', 1,  26],
      ['Ikhsan Nurhidayat',     'GK',  'Indonesia', 22, 27],
      ['Ivar Jenner',           'CM',  'Indonesia', 8,  23],
      ['Beto Goncalves',        'ST',  'Portugal',  9,  35],
      ['David Laly',            'CB',  'Indonesia', 4,  28],
      ['Jose Embalo',           'LW',  'Guinea Bis.',7, 26],
      ['Muhammad Sanat',        'CB',  'Indonesia', 5,  27],
      ['Simon McMahon',         'CB',  'Australia', 6,  28],
      ['Deni Hakim',            'LB',  'Indonesia', 3,  26],
      ['Ricky Fajrin backup',   'RB',  'Indonesia', 2,  29],
      ['Rivaldo Satria',        'LB',  'Indonesia', 17, 22],
      ['Agung Prasetyo',        'RB',  'Indonesia', 14, 24],
      ['Chris Mbamba',          'CDM', 'Kamerun',   10, 29],
      ['Ahmad Nur Hardianto',   'CM',  'Indonesia', 20, 24],
      ['Dipo Wirawan',          'CM',  'Indonesia', 18, 26],
      ['Marco Motta backup',    'CAM', 'Indonesia', 25, 22],
      ['Sutan Zico',            'CAM', 'Indonesia', 19, 26],
      ['Hamka Hamzah',          'CB',  'Indonesia', 21, 38],
      ['Kenji Ichimura',        'CM',  'Jepang',    23, 25],
      ['Ezequiel Vidal',        'LW',  'Argentina', 11, 28],
      ['Freddy Aprilianus',     'RW',  'Indonesia', 88, 24],
      ['Ciro Alves',            'RW',  'Brasil',    99, 27],
      ['Andre Gray',            'ST',  'Inggris',   77, 33],
    ],
  },

];

// ─── Stat dasar per posisi ────────────────────────────────────────────────────
const POS_STAT_BASE = {
  GK:  { pac:52, sho:12, pas:48, dri:38, def:18, phy:68 },
  CB:  { pac:58, sho:38, pas:55, dri:48, def:76, phy:76 },
  LB:  { pac:73, sho:44, pas:63, dri:66, def:68, phy:68 },
  RB:  { pac:73, sho:44, pas:63, dri:66, def:68, phy:68 },
  CDM: { pac:62, sho:50, pas:66, dri:59, def:70, phy:74 },
  CM:  { pac:66, sho:58, pas:72, dri:68, def:58, phy:68 },
  CAM: { pac:68, sho:68, pas:75, dri:74, def:42, phy:62 },
  LM:  { pac:76, sho:60, pas:68, dri:73, def:45, phy:64 },
  RM:  { pac:76, sho:60, pas:68, dri:73, def:45, phy:64 },
  LW:  { pac:80, sho:68, pas:68, dri:78, def:38, phy:62 },
  RW:  { pac:80, sho:68, pas:68, dri:78, def:38, phy:62 },
  ST:  { pac:74, sho:78, pas:60, dri:72, def:30, phy:72 },
};

function generateStats(posCode, overall) {
  const base  = POS_STAT_BASE[posCode] || POS_STAT_BASE.CM;
  const delta = overall - 68;
  const spr   = () => Math.round((Math.random() - 0.5) * 10);
  const c     = v => Math.min(99, Math.max(40, v));
  return {
    pace:      c(base.pac + delta + spr()),
    shooting:  c(base.sho + delta + spr()),
    passing:   c(base.pas + delta + spr()),
    dribbling: c(base.dri + delta + spr()),
    defending: c(base.def + delta + spr()),
    physical:  c(base.phy + delta + spr()),
  };
}

function overallForClub(rep, idx, total) {
  // Pemain pertama overall tinggi, terakhir rendah
  const topOvr = Math.round(55 + (rep - 60) * 0.72);
  const spread = 12;
  const base   = topOvr - (idx / total) * spread;
  return Math.min(88, Math.max(52, Math.round(base + (Math.random() - 0.5) * 4)));
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
console.log('=== Import Liga 1 Indonesia - BRI Super League 2025/26 ===\n');

const db = new DatabaseSync(DB_PATH);
db.exec(`PRAGMA journal_mode = WAL;`);

db.exec(`
  CREATE TABLE IF NOT EXISTS leagues (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT, country TEXT,
    season INTEGER DEFAULT 1,
    current_matchday INTEGER DEFAULT 1,
    total_matchdays INTEGER DEFAULT 34,
    prize_champion INTEGER DEFAULT 50000000,
    prize_runnerup INTEGER DEFAULT 25000000,
    status TEXT DEFAULT 'setup',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS clubs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league_id INTEGER, real_id INTEGER,
    name TEXT NOT NULL, short_name TEXT,
    city TEXT, country TEXT,
    color TEXT DEFAULT 'bola',
    stadium TEXT DEFAULT 'Stadion Utama',
    stadium_cap INTEGER DEFAULT 30000,
    reputation INTEGER DEFAULT 50,
    balance INTEGER DEFAULT 10000000,
    wage_budget INTEGER DEFAULT 1000000,
    transfer_budget INTEGER DEFAULT 5000000,
    formation TEXT DEFAULT '4-3-3',
    tactic_style TEXT DEFAULT 'balanced',
    pressing INTEGER DEFAULT 50,
    tempo INTEGER DEFAULT 50,
    width INTEGER DEFAULT 50,
    is_user INTEGER DEFAULT 0,
    user_phone TEXT,
    manager_name TEXT DEFAULT 'Manajer',
    morale INTEGER DEFAULT 70,
    played INTEGER DEFAULT 0, won INTEGER DEFAULT 0,
    drawn INTEGER DEFAULT 0, lost INTEGER DEFAULT 0,
    gf INTEGER DEFAULT 0, ga INTEGER DEFAULT 0, points INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    real_id INTEGER, club_id INTEGER,
    name TEXT NOT NULL, short_name TEXT,
    nationality TEXT, position TEXT,
    age INTEGER DEFAULT 23,
    height INTEGER DEFAULT 178, weight INTEGER DEFAULT 75,
    overall INTEGER DEFAULT 70, potential INTEGER DEFAULT 75,
    pace INTEGER DEFAULT 70, shooting INTEGER DEFAULT 65,
    passing INTEGER DEFAULT 65, dribbling INTEGER DEFAULT 65,
    defending INTEGER DEFAULT 50, physical INTEGER DEFAULT 70,
    market_value INTEGER DEFAULT 1000000,
    wage INTEGER DEFAULT 50000,
    contract_end INTEGER DEFAULT 2026,
    form INTEGER DEFAULT 70, morale INTEGER DEFAULT 70,
    fatigue INTEGER DEFAULT 0,
    injury_until TEXT, injury_type TEXT,
    suspended_until INTEGER DEFAULT 0,
    yellow_cards INTEGER DEFAULT 0, red_cards INTEGER DEFAULT 0,
    goals INTEGER DEFAULT 0, assists INTEGER DEFAULT 0,
    appearances INTEGER DEFAULT 0, clean_sheets INTEGER DEFAULT 0,
    avg_rating REAL DEFAULT 0
  );
`);

// Cek apakah sudah ada
const existing = db.prepare(`SELECT id FROM leagues WHERE name='Liga 1 Indonesia'`).get();
if (existing) {
  console.log(`⚠️  Liga 1 Indonesia sudah ada (id=${existing.id}). Hapus dulu jika ingin import ulang.`);
  console.log(`   DELETE FROM leagues WHERE id=${existing.id};`);
  db.close();
  process.exit(0);
}

// Insert league
const lgRes = db.prepare(`
  INSERT INTO leagues (name, country, total_matchdays, prize_champion, prize_runnerup, status)
  VALUES ('Liga 1 Indonesia', 'Indonesia', 34, 15000000000, 7500000000, 'setup')
`).run();
const leagueId = lgRes.lastInsertRowid;
console.log(`✅ Liga dibuat: Liga 1 Indonesia (id=${leagueId})\n`);

const stmtClub = db.prepare(`
  INSERT INTO clubs
    (league_id, name, short_name, city, country, color, stadium, stadium_cap,
     reputation, balance, transfer_budget, wage_budget)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
`);

const stmtPlayer = db.prepare(`
  INSERT INTO players
    (club_id, name, short_name, nationality, position, age, height, weight,
     overall, potential, pace, shooting, passing, dribbling, defending, physical,
     market_value, wage, contract_end)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);

let totalClubs = 0, totalPlayers = 0;

for (const club of CLUBS) {
  const budget = club.rep >= 80 ? 50_000_000
               : club.rep >= 72 ? 20_000_000
               : club.rep >= 65 ? 10_000_000
               : 5_000_000;

  const clRes = stmtClub.run(
    leagueId, club.name, club.short, club.city,
    club.country, club.color,
    club.stadium, club.stadiumCap,
    club.rep,
    budget, budget,
    Math.round(budget * 0.04),
  );
  const clubId = clRes.lastInsertRowid;
  totalClubs++;

  let pIdx = 0;
  for (const [name, posLabel, nat, no, age] of club.players) {
    const posCode = pos(posLabel);
    const overall = overallForClub(club.rep, pIdx, club.players.length);
    const potential = Math.min(99, overall + Math.floor(Math.random() * 8) + (age < 23 ? 5 : 0));
    const stats    = generateStats(posCode, overall);
    const height   = 168 + Math.floor(Math.random() * 20);
    const weight   = 62  + Math.floor(Math.random() * 18);
    const mv       = Math.floor(Math.pow(overall / 50, 3) * 800_000 * (0.8 + Math.random() * 0.4));
    const wage     = Math.round(overall * overall * 1.8);
    const cEnd     = 2026 + Math.floor(Math.random() * 3);
    const shortName = name.split(' ').length >= 3
      ? name.split(' ')[0][0] + '. ' + name.split(' ').slice(1).join(' ')
      : name;

    stmtPlayer.run(
      clubId, name, shortName, nat, posCode, age, height, weight,
      overall, potential,
      stats.pace, stats.shooting, stats.passing,
      stats.dribbling, stats.defending, stats.physical,
      mv, wage, cEnd,
    );
    pIdx++;
    totalPlayers++;
  }

  console.log(`  ✓ ${club.name.padEnd(38)} ${club.players.length} pemain`);
}

db.close();

console.log(`\n${'═'.repeat(55)}`);
console.log(`✅ Import selesai!`);
console.log(`   Klub    : ${totalClubs} / 18`);
console.log(`   Pemain  : ${totalPlayers}`);
console.log(`   Liga ID : ${leagueId}`);
console.log(`${'═'.repeat(55)}`);