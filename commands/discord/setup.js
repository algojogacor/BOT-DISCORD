// ╔══════════════════════════════════════════════════════════════╗
// ║   SETUP — commands/discord/setup.js                          ║
// ║   Auto-buat semua channel, kategori, role + isi konten       ║
// ║   Versi: 3.1 — Full Auto Content + Auto Cleanup              ║
// ╚══════════════════════════════════════════════════════════════╝

const { ChannelType, PermissionFlagsBits } = require('discord.js');

// ── Helper: kirim pesan panjang (auto-split 1900 char) ──────────
async function sendLong(channel, text) {
    if (text.length <= 1900) return channel.send(text);
    const lines = text.split('\n');
    let chunk = '';
    for (const line of lines) {
        if ((chunk + '\n' + line).length > 1900) {
            await channel.send(chunk);
            chunk = line;
        } else {
            chunk += (chunk ? '\n' : '') + line;
        }
    }
    if (chunk) await channel.send(chunk);
}

// ── Helper: delay (hindari rate limit Discord) ──────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// ══════════════════════════════════════════════════════════════
// FUNGSI CLEANUP — Hapus semua channel, kategori & role lama
// ══════════════════════════════════════════════════════════════
async function cleanupServer(guild, statusMsg) {
    // Role yang TIDAK boleh dihapus
    const protectedRoleNames = ['@everyone'];
    // Role yang dibuat bot (managed) juga otomatis dilewati

    // ── Hapus semua TEXT & VOICE channel (kecuali channel tempat command) ──
    await statusMsg.edit('🧹 **[1/3]** Menghapus semua channel lama...');
    const allChannels = [...guild.channels.cache.values()];
    for (const ch of allChannels) {
        try {
            // Jangan hapus channel yang sedang dipakai untuk status message
            if (ch.id === statusMsg.channel?.id) continue;
            await ch.delete('Algojo Bot Setup — Cleanup');
            await sleep(300); // delay agar tidak kena rate limit
        } catch (e) {
            // Lewati channel yang tidak bisa dihapus
        }
    }

    // ── Hapus semua Role buatan (kecuali @everyone & managed) ──
    await statusMsg.edit('🧹 **[2/3]** Menghapus semua role lama...');
    const allRoles = [...guild.roles.cache.values()];
    for (const role of allRoles) {
        if (role.managed) continue;                          // role bot, skip
        if (protectedRoleNames.includes(role.name)) continue; // @everyone, skip
        if (role.id === guild.id) continue;                  // @everyone by id
        try {
            await role.delete('Algojo Bot Setup — Cleanup');
            await sleep(300);
        } catch (e) {
            // Role mungkin punya permission lebih tinggi, lewati
        }
    }

    await statusMsg.edit('🧹 **[3/3]** Cleanup selesai! Mulai membangun server baru...');
    await sleep(1000);
}

module.exports = async function setupCmd(command, args, msg, user, db, client) {
    if (command !== 'setup') return;

    const guild = msg._discordMessage?.guild;
    if (!guild) return msg.reply('❌ Command ini hanya bisa dipakai di server!');

    const member = msg._discordMessage.member;
    if (guild.ownerId !== member.id)
        return msg.reply('❌ Hanya **owner server** yang bisa menjalankan `!setup`!');

    // Kirim status message via Discord native agar bisa di-.edit()
    const discordChannel = msg._discordMessage.channel;
    const statusMsg = await discordChannel.send(
        '🗑️ **SETUP v3.1 DIMULAI**\n' +
        'Langkah 1: Membersihkan server lama...\n' +
        '⚠️ Semua channel & role lama akan dihapus!'
    );

    try {
        // ── CLEANUP DULU ────────────────────────────────────────
        await cleanupServer(guild, statusMsg);
        await statusMsg.edit('⚙️ Membangun struktur server baru... Mohon tunggu!');
        // ══════════════════════════════════════════════════════════
        // 1. BUAT ROLES
        // ══════════════════════════════════════════════════════════
        const rolesConfig = [
            { name: '👑 Owner',        color: '#FFD700', hoist: true },
            { name: '⚔️ Admin',        color: '#FF4444', hoist: true },
            { name: '🛡️ Moderator',   color: '#FF8C00', hoist: true },
            { name: '💎 VIP',          color: '#9B59B6', hoist: true },
            { name: '🏆 Legend',       color: '#E74C3C', hoist: true },
            { name: '🎖️ Level 10+',   color: '#3498DB', hoist: true },
            { name: '🌟 Member',       color: '#2ECC71', hoist: true },
            { name: '🎮 Gamer',        color: '#1ABC9C', hoist: false },
            { name: '🎵 Musik Lover',  color: '#E91E63', hoist: false },
            { name: '⚽ Bola Mania',   color: '#4CAF50', hoist: false },
            { name: '🤖 AI Enjoyer',   color: '#607D8B', hoist: false },
            { name: '💰 Trader',       color: '#FF9800', hoist: false },
        ];

        const createdRoles = {};
        for (const r of rolesConfig) {
            const existing = guild.roles.cache.find(role => role.name === r.name);
            createdRoles[r.name] = existing ?? await guild.roles.create({
                name: r.name, color: r.color, hoist: r.hoist, reason: 'Algojo Bot Setup v3',
            });
        }

        const adminRole  = createdRoles['⚔️ Admin'];
        const modRole    = createdRoles['🛡️ Moderator'];
        const botManaged = guild.roles.cache.find(r => r.managed);

        // ── Permission helper ───────────────────────────────────
        const adminOnly = [
            { id: guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
            { id: adminRole.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            { id: modRole.id,   allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
            ...(botManaged ? [{ id: botManaged.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }] : []),
        ];
        const readOnly = [
            { id: guild.roles.everyone, deny: [PermissionFlagsBits.SendMessages] },
            { id: adminRole.id, allow: [PermissionFlagsBits.SendMessages] },
        ];

        // ══════════════════════════════════════════════════════════
        // 2. STRUKTUR CHANNEL
        // ══════════════════════════════════════════════════════════
        const structure = [
            {
                category: '📢 SELAMAT DATANG',
                channels: [
                    { name: '📜│aturan',       topic: 'Peraturan server — baca sebelum chat!',     perms: readOnly },
                    { name: '📣│pengumuman',    topic: 'Pengumuman resmi dari admin',               perms: readOnly },
                    { name: '👋│perkenalan',    topic: 'Perkenalkan dirimu kepada komunitas!' },
                    { name: '🗓️│events',       topic: 'Jadwal event, turnamen & giveaway',         perms: readOnly },
                    { name: '🎫│verifikasi',    topic: 'Klik tombol untuk mendapat role Member',    perms: readOnly },
                    { name: '🔗│link-penting',  topic: 'Invite bot, sosmed & resource penting',    perms: readOnly },
                ],
            },
            {
                category: '💬 CHAT UMUM',
                channels: [
                    { name: '💬│obrolan',      topic: 'Chat bebas & santai — be nice!' },
                    { name: '😂│meme',         topic: 'Kirim meme & konten lucu' },
                    { name: '🖼️│media',        topic: 'Foto, video & karya seni' },
                    { name: '🔗│share-link',   topic: 'Artikel, YouTube, rekomendasi konten' },
                    { name: '🗳️│saran',        topic: 'Saran & masukan untuk server & bot' },
                ],
            },
            {
                category: '🤖 ALGOJO BOT — UTAMA',
                channels: [
                    { name: '🤖│bot-command',  topic: '⚡ Main hub bot | !menu !menufull !me !daily' },
                    { name: '🔗│link-akun',    topic: 'Hubungkan akun WA & Discord | !link !linkstatus !unlink' },
                    { name: '📊│profil',       topic: 'Lihat profil & net worth | !me !profile !networth !portofolio' },
                    { name: '🏆│leaderboard',  topic: 'Ranking server | !top !topminer !topfarmer !topnet' },
                    { name: '📈│analitik',     topic: 'Statistik & analitik bot | !analitik !aistat' },
                ],
            },
            {
                category: '💰 EKONOMI & BISNIS',
                channels: [
                    { name: '🏦│bank',         topic: 'Perbankan & keuangan | !bank !depo !tarik !tf !pinjam !bayar !dompet' },
                    { name: '💼│pekerjaan',    topic: 'Karir & gaji | !jobs !lamar !kerja !resign !sertifikasi' },
                    { name: '📈│saham',        topic: 'Saham BEI real-time | !saham !beli !jual !portofolio' },
                    { name: '🪙│crypto',       topic: 'Crypto & mining | !crypto !btc !eth !buybtc !sellbtc' },
                    { name: '💱│valas',        topic: 'Valas & emas | !valas !emas !buyemas !sellemas' },
                    { name: '🏠│properti',     topic: 'Usaha pasif | !properti !beli !sewa — gerobak hingga maskapai!' },
                ],
            },
            {
                category: '🏭 PRODUKSI & INDUSTRI',
                channels: [
                    { name: '🌾│farming',      topic: 'Pertanian & panen | !tanam !siram !panen !pupuk !lahan' },
                    { name: '🐄│ternak',       topic: 'Peternakan & budidaya | !ternak !pakan !panen !kandang !upgrade' },
                    { name: '⛏️│mining',       topic: 'VGA rig & BTC mining | !mining !claimmining !upgradegpu !jualbtc' },
                    { name: '🏭│pabrik',       topic: 'Mesin industri bersama | !pabrik !produksi !investpabrik' },
                    { name: '🗺️│nation',       topic: 'Bangun negara & perang | !negara !pajak !perang !aliansi !spionase' },
                ],
            },
            {
                category: '🎲 GAME & CASINO',
                channels: [
                    { name: '🎰│casino',       topic: 'Casino & gambling | !roulette !slot !flip !dadu' },
                    { name: '💣│mines',        topic: 'Minesweeper taruhan | !mines <bet> <jumlah_bom>' },
                    { name: '⚔️│duel-battle',  topic: 'PvP & battle system | !duel @user !battle !attack !defend' },
                    { name: '⚽│sportsbook',   topic: 'Taruhan bola | !bola !bet1x2 !bethdp !betou !parlay !history' },
                    { name: '🧩│minigame',     topic: 'Trivia, wordle, tebak | !trivia !wordle !tebakgambar !akinator' },
                    { name: '♟️│catur',        topic: 'Main catur | !catur @lawan — turn-based chess!' },
                    { name: '🐍│slither',      topic: 'Slither.io interaktif | !slither — gerakkan ular di chat!' },
                    { name: '🗡️│rpg',          topic: 'RPG adventure | !rpg !quest !dungeon !inventory !skill' },
                ],
            },
            {
                category: '🤖 AI & KREATIVITAS',
                channels: [
                    { name: '💬│ai-chat',      topic: 'Chat dengan AI | !ai !ai0 !ai1 !ai2 !persona !resetai' },
                    { name: '🛠️│ai-tools',     topic: 'AI Tools | !summarize !translate !ocr !codereview !grammar !sentiment' },
                    { name: '🖼️│ai-image',     topic: 'Generate gambar AI | !image <prompt> !imagestyle' },
                    { name: '✍️│kreatif',       topic: 'Konten kreatif | !cerita !lirik !puisi !meme !caption !roast' },
                    { name: '📄│pdf-tools',     topic: 'PDF & dokumen | !pdf !summarizepdf !ocrpdf' },
                ],
            },
            {
                category: '🛠️ TOOLS & UTILITAS',
                channels: [
                    { name: '🔧│tools-umum',   topic: 'Berbagai tools | !qr !password !uuid !ip !ping !tts !stiker' },
                    { name: '🔗│shortlink',    topic: 'Persingkat URL | !short <url> — powered by TinyURL' },
                    { name: '📱│tiktok-dl',    topic: 'Download TikTok | !tiktok <url> — no watermark!' },
                    { name: '🧮│kalkulator',   topic: 'Hitung-hitungan | !calc !bmi !cicilan !zakat !kurs' },
                    { name: '⏰│reminder',     topic: 'Pengingat otomatis | !remind <waktu> <pesan> !reminderlist' },
                ],
            },
            {
                category: '🎭 LIFESTYLE & INFO',
                channels: [
                    { name: '🎵│musik',        topic: 'Diskusi & request musik' },
                    { name: '🎮│gaming',       topic: 'Diskusi game & tips' },
                    { name: '📺│anime-manga',  topic: 'Diskusi anime & manga' },
                    { name: '⚽│olahraga',     topic: 'Diskusi olahraga, prediksi bola' },
                    { name: '🌤️│cuaca',        topic: 'Info cuaca real-time | !cuaca <kota> !prakiraan <kota>' },
                    { name: '📰│berita',       topic: 'Berita terkini | !berita !headline !topik <kata>' },
                    { name: '🔮│zodiak-mood',  topic: 'Zodiak & mood tracker | !zodiak !shio !horoskop !mood !moodtrack' },
                    { name: '🕰️│timemachine',  topic: 'Fakta sejarah hari ini | !today !onthisday' },
                ],
            },
            {
                category: '🔊 VOICE',
                channels: [
                    { name: '📢 AFK',           type: ChannelType.GuildVoice },
                    { name: '🎙️ Lounge',        type: ChannelType.GuildVoice },
                    { name: '🎮 Gaming Room 1', type: ChannelType.GuildVoice },
                    { name: '🎮 Gaming Room 2', type: ChannelType.GuildVoice },
                    { name: '🎵 Music Room',    type: ChannelType.GuildVoice },
                    { name: '📚 Study Room',    type: ChannelType.GuildVoice },
                    { name: '💎 VIP Lounge',    type: ChannelType.GuildVoice },
                ],
            },
            {
                category: '🛡️ MODERASI',
                channels: [
                    { name: '📋│mod-log',      topic: 'Log semua aksi moderasi otomatis',          perms: adminOnly },
                    { name: '⚠️│laporan',      topic: 'Laporan pelanggaran dari member',            perms: adminOnly },
                    { name: '🔧│mod-chat',     topic: 'Diskusi internal tim moderasi',              perms: adminOnly },
                    { name: '🎪│admin-abuse',  topic: 'Log event Admin Abuse | !adminabuse',        perms: adminOnly },
                    { name: '📊│server-stats', topic: 'Statistik server & bot harian',              perms: adminOnly },
                ],
            },
        ];

        // ── Buat semua kategori & channel ───────────────────────
        const channelMap = {}; // simpan referensi channel by name
        for (const cat of structure) {
            let category = guild.channels.cache.find(
                c => c.name === cat.category && c.type === ChannelType.GuildCategory
            );
            if (!category) {
                category = await guild.channels.create({
                    name: cat.category,
                    type: ChannelType.GuildCategory,
                    reason: 'Algojo Bot Setup v3',
                });
            }

            for (const ch of cat.channels) {
                const chType = ch.type || ChannelType.GuildText;
                const safeName = ch.name.toLowerCase()
                    .replace(/[│|]/g, '')
                    .replace(/[^\w\s-]/gu, '')
                    .trim()
                    .replace(/\s+/g, '-');

                const existing = guild.channels.cache.find(
                    c => c.name === ch.name || c.name === safeName
                );
                if (existing) { channelMap[ch.name] = existing; continue; }

                const created = await guild.channels.create({
                    name: ch.name,
                    type: chType,
                    parent: category.id,
                    topic: ch.topic || '',
                    permissionOverwrites: ch.perms || [],
                    reason: 'Algojo Bot Setup v3',
                });
                channelMap[ch.name] = created;
            }
        }

        // ── Utility: cari channel dari map ──────────────────────
        const ch = (keyword) =>
            channelMap[keyword] ||
            guild.channels.cache.find(c => c.name.includes(keyword.replace(/[│🤖💬📊🏆⚔️💰🏦💼📈🪙💱🏠🏭🌾🐄⛏️🗺️🎲🎰💣⚽🧩♟️🐍🗡️🛠️📄🔧🔗📱🧮⏰🎭🎵🎮📺⚽🌤️📰🔮🕰️🛡️📋⚠️🎪📣👋🗓️🎫]/gu, '').trim()));

        // ══════════════════════════════════════════════════════════
        // 3. ISI KONTEN OTOMATIS KE SETIAP CHANNEL
        // ══════════════════════════════════════════════════════════

        // ── 📜 ATURAN ─────────────────────────────────────────────
        const aturanCh = ch('aturan');
        if (aturanCh) await sendLong(aturanCh,
`📜 **PERATURAN SERVER — BACA DAN PATUHI!**
${'═'.repeat(40)}

**1. UMUM**
▸ Hormati semua member — no SARA, no bullying
▸ Dilarang spam, flood, dan mention @everyone sembarangan
▸ Gunakan channel yang sesuai untuk setiap topik
▸ Konten NSFW dilarang keras di semua channel

**2. EKONOMI & BOT**
▸ Jangan mencurangi sistem ekonomi bot
▸ Bug/exploit wajib dilaporkan ke admin — bukan dimanfaatkan
▸ Multi-akun untuk keuntungan pribadi = banned

**3. PERDAGANGAN**
▸ Transaksi antar member atas risiko sendiri
▸ Scam/penipuan = permanent ban tanpa peringatan

**4. KONTEN**
▸ Dilarang share link berbahaya, phishing, atau malware
▸ Iklan tanpa izin admin = kick/ban

**5. SANKSI**
▸ ⚠️ Peringatan 1 → timeout
▸ ⚠️ Peringatan 2 → kick
▸ ⚠️ Peringatan 3 → permanent ban

Dengan bergabung, kamu setuju mengikuti seluruh aturan ini.`
        );

        // ── 🔗 LINK PENTING ───────────────────────────────────────
        const linkCh = ch('link-penting');
        if (linkCh) await sendLong(linkCh,
`🔗 **LINK PENTING**
${'═'.repeat(40)}

🤖 **Bot WA — Algojo Bot**
▸ Nomor: \`(nomor bot WA kamu)\`
▸ Cara mulai: Kirim \`!menu\` ke WA Bot

🔗 **Hubungkan Akun WA ↔ Discord**
▸ Di channel <#${ch('link-akun')?.id || 'link-akun'}> ketik: \`!link 628xxxxxxxxxx\`
▸ Status: \`!linkstatus\` | Putus: \`!unlink\`

📖 **Panduan Lengkap**
▸ Ketik \`!menufull\` di channel bot
▸ Atau \`!menufull <kategori>\` — contoh: \`!menufull farming\`

📋 **Kategori Panduan**
\`!menufull nyawa\` \`!menufull bank\` \`!menufull jobs\`
\`!menufull game\` \`!menufull farming\` \`!menufull mining\`
\`!menufull ai\` \`!menufull investasi\` \`!menufull negara\``
        );

        // ── 🤖 BOT COMMAND ────────────────────────────────────────
        const botCh = ch('bot-command');
        if (botCh) await sendLong(botCh,
`🤖 **ALGOJO BOT v2.0 — PANDUAN CEPAT**
${'═'.repeat(40)}

**🚀 MULAI DARI SINI:**
\`!menu\` → Menu ringkas
\`!menufull\` → Panduan lengkap semua fitur
\`!me\` atau \`!profile\` → Lihat status karaktermu
\`!daily\` → Ambil reward harian (jangan lupa tiap hari!)

**💡 TIPS PEMULA:**
1️⃣ Ambil \`!daily\` dulu untuk modal awal
2️⃣ Lamar kerja dengan \`!jobs\` lalu \`!lamar <nama_job>\`
3️⃣ Mulai farming dengan \`!tanam\` di channel farming
4️⃣ Pastikan karakter tidak mati → cek \`!me\` secara rutin
5️⃣ Hubungkan akun WA di <#${ch('link-akun')?.id || 'link-akun'}>

**📌 CHANNEL SESUAI FITUR:**
💰 Ekonomi → <#${ch('bank')?.id || 'bank'}>
🌾 Farming → <#${ch('farming')?.id || 'farming'}>
⛏️ Mining → <#${ch('mining')?.id || 'mining'}>
🎰 Casino → <#${ch('casino')?.id || 'casino'}>
🤖 AI Chat → <#${ch('ai-chat')?.id || 'ai-chat'}>
⚽ Sportsbook → <#${ch('sportsbook')?.id || 'sportsbook'}>
🏆 Leaderboard → <#${ch('leaderboard')?.id || 'leaderboard'}>`
        );

        // ── 🔗 LINK AKUN ─────────────────────────────────────────
        const linkAkunCh = ch('link-akun');
        if (linkAkunCh) await sendLong(linkAkunCh,
`🔗 **SISTEM LINK AKUN WA ↔ DISCORD**
${'═'.repeat(40)}

Dengan menghubungkan akun WA dan Discord, data ekonomimu **sinkron di kedua platform**!

**CARA MENGHUBUNGKAN:**
1. Ketik \`!link 628xxxxxxxxxx\` (nomor WA kamu tanpa +)
2. Bot akan konfirmasi → selesai!

**COMMAND TERSEDIA:**
\`!link 628xxx\`   → Hubungkan akun WA ke Discord
\`!linkstatus\`    → Cek status link saat ini
\`!unlink\`        → Putuskan koneksi

**✅ Setelah di-link:**
▸ Saldo, level, item — semua tersinkron
▸ Bisa main dari WA atau Discord sesuka hati
▸ Leaderboard gabungan dari kedua platform`
        );

        // ── 💰 BANK ───────────────────────────────────────────────
        const bankCh = ch('bank');
        if (bankCh) await sendLong(bankCh,
`🏦 **SISTEM BANK & EKONOMI**
${'═'.repeat(40)}

**DOMPET & BANK:**
\`!dompet\`              → Cek saldo dompet
\`!bank\`                → Cek saldo bank
\`!depo <jumlah>\`       → Deposit ke bank
\`!tarik <jumlah>\`      → Tarik dari bank

**TRANSFER:**
\`!tf @user <jumlah>\`   → Transfer ke member lain

**PINJAMAN:**
\`!pinjam <jumlah>\`     → Pinjam uang dari bank
\`!bayar <jumlah>\`      → Bayar cicilan pinjaman

**REWARD:**
\`!daily\`               → Reward harian (ambil tiap hari!)
\`!weekly\`              → Reward mingguan

**LIHAT TOP:**
\`!top\`                 → Leaderboard saldo terkaya`
        );

        // ── 💼 PEKERJAAN ──────────────────────────────────────────
        const jobsCh = ch('pekerjaan');
        if (jobsCh) await sendLong(jobsCh,
`💼 **SISTEM PEKERJAAN & KARIR**
${'═'.repeat(40)}

**MULAI BEKERJA:**
\`!jobs\`                → Lihat semua lowongan pekerjaan
\`!lamar <nama_job>\`    → Melamar pekerjaan
\`!kerja\`               → Masuk kerja & dapat gaji

**PENGEMBANGAN KARIR:**
\`!sertifikasi\`         → Ambil sertifikasi untuk naik jabatan
\`!resign\`              → Keluar dari pekerjaan saat ini
\`!jobinfo\`             → Info detail pekerjaan aktifmu

**💡 Tips:**
▸ Setiap job punya gaji & skill pasif berbeda
▸ Sertifikasi meningkatkan gaji & buka job premium
▸ Kerja rutin untuk kumpulkan pengalaman & level`
        );

        // ── 📈 SAHAM ──────────────────────────────────────────────
        const sahamCh = ch('saham');
        if (sahamCh) await sendLong(sahamCh,
`📈 **PASAR SAHAM — BURSA EFEK INDONESIA (REAL-TIME)**
${'═'.repeat(40)}

**CEK HARGA:**
\`!saham <kode>\`         → Cek harga saham (contoh: \`!saham BBCA\`)
\`!saham list\`           → Daftar saham tersedia

**TRADING:**
\`!beli <kode> <lot>\`    → Beli saham
\`!jual <kode> <lot>\`    → Jual saham
\`!portofolio\`           → Lihat portofolio sahammu

**💡 Tips Investasi:**
▸ Harga saham mengikuti data real-time BEI
▸ Pantau terus portofolio untuk profit maksimal
▸ Diversifikasi — jangan taruh semua di satu saham`
        );

        // ── 🪙 CRYPTO ─────────────────────────────────────────────
        const cryptoCh = ch('crypto');
        if (cryptoCh) await sendLong(cryptoCh,
`🪙 **CRYPTO TRADING**
${'═'.repeat(40)}

**CEK HARGA:**
\`!crypto\`              → Harga semua crypto
\`!btc\` \`!eth\` \`!bnb\`  → Harga spesifik

**TRADING:**
\`!buybtc <jumlah>\`     → Beli Bitcoin
\`!sellbtc <jumlah>\`    → Jual Bitcoin
\`!buyeth <jumlah>\`     → Beli Ethereum
\`!selleth <jumlah>\`    → Jual Ethereum

**MINING CRYPTO:**
▸ Mining via VGA rig di channel <#${ch('mining')?.id || 'mining'}>
▸ BTC hasil mining bisa dijual di sini

**💡 Tips:**
▸ Harga crypto fluktuatif — beli saat turun!
▸ Hold untuk keuntungan jangka panjang`
        );

        // ── 🌾 FARMING ────────────────────────────────────────────
        const farmCh = ch('farming');
        if (farmCh) await sendLong(farmCh,
`🌾 **SISTEM FARMING & PERTANIAN**
${'═'.repeat(40)}

**BERTANI:**
\`!tanam <tanaman>\`     → Tanam tanaman (butuh lahan)
\`!siram\`               → Siram tanaman agar cepat tumbuh
\`!pupuk\`               → Beri pupuk untuk hasil lebih
\`!panen\`               → Panen hasil pertanian

**LAHAN:**
\`!lahan\`               → Lihat status lahan
\`!belilaham\`           → Beli lahan baru
\`!upgradelahan\`        → Upgrade kualitas lahan

**MESIN PABRIK BERSAMA:**
\`!pabrik\`              → Lihat status mesin pabrik
\`!produksi\`            → Proses hasil panen jadi produk
\`!investpabrik <jml>\`  → Investasi ke pabrik komunitas

**💡 Tips:**
▸ Rutin siram tanaman agar tidak layu
▸ Tanaman berbeda = nilai jual berbeda
▸ Mesin pabrik mengolah bahan mentah jadi produk bernilai tinggi`
        );

        // ── 🐄 TERNAK ─────────────────────────────────────────────
        const ternakCh = ch('ternak');
        if (ternakCh) await sendLong(ternakCh,
`🐄 **SISTEM PETERNAKAN**
${'═'.repeat(40)}

**KELOLA TERNAK:**
\`!ternak\`              → Lihat status kandang
\`!beliternak <hewan>\`  → Beli hewan ternak baru
\`!pakan\`               → Beri pakan hewan
\`!panen\`               → Ambil hasil ternak (susu/telur/dll)
\`!kandang\`             → Info detail kandang

**UPGRADE:**
\`!upgradekandang\`      → Upgrade kapasitas kandang

**💡 Tips:**
▸ Hewan lapar = produksi menurun
▸ Upgrade kandang untuk tampung lebih banyak hewan
▸ Hasil ternak bisa dijual atau diolah di pabrik`
        );

        // ── ⛏️ MINING ─────────────────────────────────────────────
        const miningCh = ch('mining');
        if (miningCh) await sendLong(miningCh,
`⛏️ **SISTEM MINING CRYPTO**
${'═'.repeat(40)}

**RIG MINING:**
\`!mining\`              → Lihat status rig & hashrate
\`!claimmining\`         → Klaim BTC hasil mining
\`!upgradegpu\`          → Upgrade GPU untuk hashrate lebih tinggi
\`!buyrig\`              → Beli rig mining baru

**JUAL HASIL:**
\`!jualbtc <jumlah>\`    → Jual BTC ke market
▸ Harga BTC mengikuti market real-time!

**INFO:**
\`!topminer\`            → Leaderboard miner terkaya

**💡 Tips:**
▸ Klaim mining rutin agar tidak meluap (cap storage)
▸ GPU lebih tinggi = hashrate lebih besar = BTC lebih banyak
▸ Pantau harga BTC di channel <#${ch('crypto')?.id || 'crypto'}> sebelum jual`
        );

        // ── 🏠 PROPERTI ───────────────────────────────────────────
        const propCh = ch('properti');
        if (propCh) await sendLong(propCh,
`🏠 **SISTEM PROPERTI & USAHA PASIF**
${'═'.repeat(40)}

**DAFTAR USAHA (dari kecil ke besar):**
▸ 🛒 Gerobak → 🏪 Warung → 🏬 Toko
▸ 🏢 Ruko → 🏨 Hotel → ✈️ Maskapai

**COMMAND:**
\`!properti\`            → Lihat semua properti tersedia
\`!beliproperti <nama>\` → Beli properti
\`!sewaproperti\`        → Cek pendapatan pasif
\`!klaimpasif\`          → Klaim pendapatan pasif harian

**💡 Tips:**
▸ Properti menghasilkan income pasif setiap hari
▸ Upgrade properti untuk pendapatan lebih besar
▸ Diversifikasi properti untuk income stabil`
        );

        // ── 🗺️ NATION ────────────────────────────────────────────
        const nationCh = ch('nation');
        if (nationCh) await sendLong(nationCh,
`🗺️ **SISTEM NEGARA & PERANG**
${'═'.repeat(40)}

**BANGUN NEGARA:**
\`!negara buat <nama>\`  → Dirikan negara baru
\`!negara info\`         → Info negaramu
\`!negara list\`         → Semua negara yang ada

**EKONOMI NEGARA:**
\`!pajak <persen>\`      → Set tarif pajak warga
\`!anggaran\`            → Lihat kas negara
\`!subsidi <jumlah>\`    → Beri subsidi ke warga

**DIPLOMASI & MILITER:**
\`!aliansi @negara\`     → Ajak aliansi
\`!perang @negara\`      → Nyatakan perang
\`!spionase @negara\`    → Kirim mata-mata
\`!pertahanan\`          → Tingkatkan pertahanan

**💡 Tips:**
▸ Bangun ekonomi dulu sebelum perang
▸ Aliansi membuat negaramu lebih kuat`
        );

        // ── 🎰 CASINO ─────────────────────────────────────────────
        const casinoCh = ch('casino');
        if (casinoCh) await sendLong(casinoCh,
`🎰 **CASINO — BERMAIN DI SINI!**
${'═'.repeat(40)}

**GAME TERSEDIA:**
\`!roulette <jumlah> <taruhan>\`  → Roulette (merah/hitam/angka)
\`!slot <jumlah>\`                → Slot machine
\`!flip <jumlah> <heads/tails>\`  → Coin flip
\`!dadu <jumlah> <angka>\`        → Lempar dadu

**TIPS:**
▸ ⚠️ Jangan pernah taruh semua saldo di satu game!
▸ Set batas kalah harianmu sendiri
▸ Saldo minus? Pinjam di channel <#${ch('bank')?.id || 'bank'}>`
        );

        // ── 💣 MINES ─────────────────────────────────────────────
        const minesCh = ch('mines');
        if (minesCh) await sendLong(minesCh,
`💣 **MINESWEEPER — TARUHAN NYAWA!**
${'═'.repeat(40)}

**CARA MAIN:**
\`!mines <bet> <jumlah_bom>\`   → Mulai game
\`!mines pick <kotak>\`         → Pilih kotak (1-25)
\`!mines cashout\`              → Ambil kemenangan sekarang!

**CONTOH:**
\`!mines 1000 3\`   → Taruh 1000, 3 bom di 25 kotak
\`!mines pick 12\`  → Buka kotak nomor 12
\`!mines cashout\`  → Keluar aman dengan profit

**💡 Tips:**
▸ Lebih banyak bom = multiplier lebih tinggi (lebih berisiko!)
▸ Cashout lebih awal untuk aman
▸ Jangan rakus — cashout sebelum kena bom! 💥`
        );

        // ── ⚽ SPORTSBOOK ─────────────────────────────────────────
        const sbCh = ch('sportsbook');
        if (sbCh) await sendLong(sbCh,
`⚽ **SPORTSBOOK — TARUHAN BOLA**
${'═'.repeat(40)}

**CEK PERTANDINGAN:**
\`!bola\`                        → Jadwal & odds hari ini

**JENIS TARUHAN:**
\`!bet1x2 <match_id> <1/X/2> <bet>\`  → Home/Draw/Away
\`!bethdp <match_id> <H/A> <bet>\`    → Handicap
\`!betou <match_id> <O/U> <bet>\`     → Over/Under

**MIX PARLAY:**
\`!parlay add <match_id> <pilihan>\`  → Tambah leg parlay
\`!parlay bet <jumlah>\`             → Pasang parlay
\`!parlay clear\`                    → Hapus semua

**RIWAYAT:**
\`!history\`                → Riwayat taruhan
\`!pending\`                → Taruhan yang belum selesai

**💡 Tips:**
▸ Mix parlay = odds dikali semua → untung besar, risiko besar`
        );

        // ── 🧩 MINIGAME ───────────────────────────────────────────
        const miniCh = ch('minigame');
        if (miniCh) await sendLong(miniCh,
`🧩 **MINI GAME — HIBURAN & KUIS**
${'═'.repeat(40)}

**TRIVIA:**
\`!trivia\`              → Pertanyaan acak (dapat reward jika benar!)
\`!trivia <kategori>\`   → Pilih kategori spesifik

**TEBAK GAMBAR:**
\`!tebakgambar\`         → Tebak gambar (kirim jawaban langsung)
\`!tebaklirik\`          → Tebak judul lagu dari lirik

**WORDLE:**
\`!wordle\`              → Tebak kata 5 huruf (6 kesempatan)

**AKINATOR:**
\`!akinator\`            → Bot menebak yang kamu pikirkan!
\`!ak ya/tidak/mungkin\` → Jawab pertanyaan Akinator

**♟️ CATUR:**
▸ Lanjut ke channel <#${ch('catur')?.id || 'catur'}>
\`!catur @lawan\`        → Tantang member lain bermain catur`
        );

        // ── ⚔️ DUEL BATTLE ────────────────────────────────────────
        const duelCh = ch('duel-battle');
        if (duelCh) await sendLong(duelCh,
`⚔️ **DUEL & BATTLE SYSTEM**
${'═'.repeat(40)}

**DUEL PVP:**
\`!duel @user <bet>\`    → Tantang member lain (taruhan!)
\`!accept\`              → Terima tantangan duel

**BATTLE RPG:**
\`!battle\`              → Battle melawan monster
\`!attack\`              → Serang musuh
\`!defend\`              → Bertahan
\`!skill <nama>\`        → Gunakan skill khusus
\`!flee\`                → Kabur dari battle

**ITEM & EQUIPMENT:**
\`!inventory\`           → Lihat item yang dimiliki
\`!equip <item>\`        → Pasang equipment
\`!shop\`                → Beli item di toko

**💡 Tips:**
▸ Tingkatkan level dulu sebelum tantang member lain
▸ Equipment yang bagus = peluang menang lebih besar`
        );

        // ── 💬 AI CHAT ────────────────────────────────────────────
        const aiCh = ch('ai-chat');
        if (aiCh) await sendLong(aiCh,
`💬 **AI CHAT — MULTI-MODEL & MULTI-PERSONA**
${'═'.repeat(40)}

**CARA CHAT:**
\`!ai <pertanyaan>\`     → Chat dengan AI (model default)
\`!ai0 <pesan>\`         → Model premium (paling canggih)
\`!ai1 <pesan>\`         → Model balanced
\`!ai2 <pesan>\`         → Model cepat & ringan

**PERSONA TERSEDIA:**
\`!persona\`             → Lihat & ganti karakter AI
\`default\` \`english\` \`coder\` \`motivator\` \`chef\`
\`dokter\` \`lawyer\` \`psikolog\` \`penulis\` \`bisnis\`

**ANALISIS GAMBAR:**
\`!aianalysis\`          → Kirim gambar + command → AI analisis

**MANAJEMEN:**
\`!resetai\`             → Reset memori percakapan
\`!aistat\`              → Statistik penggunaan AI-mu
\`!sharechat\`           → Share riwayat chat ke link publik

**💡 Tips:**
▸ Ganti persona sesuai kebutuhanmu
▸ AI ingat konteks percakapan selama sesi aktif
▸ Reset kalau AI mulai "nyasar"`
        );

        // ── 🛠️ AI TOOLS ───────────────────────────────────────────
        const aitoolsCh = ch('ai-tools');
        if (aitoolsCh) await sendLong(aitoolsCh,
`🛠️ **AI TOOLS — ASISTEN PRODUKTIVITASMU**
${'═'.repeat(40)}

**RINGKAS & TERJEMAH:**
\`!summarize <link/teks>\`       → Ringkas artikel atau teks panjang
\`!translate [lang] <teks>\`     → Terjemahkan ke 15+ bahasa

**ANALISIS TEKS:**
\`!sentiment <teks>\`            → Analisis sentimen positif/negatif
\`!grammar <teks>\`              → Cek & koreksi grammar
\`!improve <teks>\`              → Perbaiki kualitas tulisan

**KODING:**
\`!codereview <kode>\`           → Review & debug kode
\`!explain <kode>\`              → Jelaskan fungsi kode

**GAMBAR:**
\`!ocr\` (+ lampir gambar)       → Baca teks dari gambar (OCR)
\`!aianalysis\` (+ gambar)       → AI analisis konten gambar

**CONTOH BAHASA TRANSLATE:**
\`en\` inggris | \`ja\` jepang | \`ko\` korea
\`ar\` arab | \`fr\` prancis | \`de\` jerman`
        );

        // ── 🖼️ AI IMAGE ───────────────────────────────────────────
        const aiImgCh = ch('ai-image');
        if (aiImgCh) await sendLong(aiImgCh,
`🖼️ **AI IMAGE GENERATOR**
${'═'.repeat(40)}

**GENERATE GAMBAR:**
\`!image <deskripsi>\`           → Buat gambar dari teks
\`!imagestyle <style> <desc>\`   → Pilih style spesifik

**STYLE TERSEDIA:**
\`realistic\` \`anime\` \`cartoon\` \`oil-painting\`
\`watercolor\` \`sketch\` \`cyberpunk\` \`fantasy\`

**CONTOH:**
\`!image sunset di Bali dengan langit oranye\`
\`!imagestyle anime gadis dengan rambut biru di taman bunga\`

**💡 Tips:**
▸ Deskripsi lebih detail = hasil lebih bagus
▸ Tambahkan kata kunci kualitas: \`high detail\`, \`4k\`, \`masterpiece\`
▸ Bisa dalam bahasa Indonesia maupun Inggris`
        );

        // ── ✍️ KREATIF ────────────────────────────────────────────
        const kreatifCh = ch('kreatif');
        if (kreatifCh) await sendLong(kreatifCh,
`✍️ **KONTEN KREATIF — EKSPRESIKAN DIRIMU!**
${'═'.repeat(40)}

**TULISAN:**
\`!cerita <tema>\`       → Buat cerita pendek interaktif
\`!puisi <tema>\`        → Buat puisi
\`!lirik <lagu>\`        → Buat lirik lagu original
\`!caption <tema>\`      → Buat caption Instagram/sosmed

**HIBURAN:**
\`!roast @user\`         → Roast member lain (bercanda ya!)
\`!pujian @user\`        → Puji member
\`!jokes\`               → Joke random
\`!meme <template>\`     → Buat meme dengan teks

**UTILITAS KREATIF:**
\`!namebrand <industri>\` → Generate nama brand bisnis
\`!slogan <produk>\`      → Buat slogan
\`!bioig <deskripsi>\`    → Generate bio Instagram`
        );

        // ── 🔧 TOOLS UMUM ─────────────────────────────────────────
        const toolsCh = ch('tools-umum');
        if (toolsCh) await sendLong(toolsCh,
`🔧 **TOOLS & UTILITAS SERBA BISA**
${'═'.repeat(40)}

**QR CODE:**
\`!qr <teks/url>\`       → Buat QR Code dari teks atau link

**KEAMANAN:**
\`!password <panjang>\`  → Generate password acak yang kuat
\`!uuid\`                → Generate UUID unik
\`!enkripsi <teks>\`     → Enkripsi teks
\`!dekripsi <teks>\`     → Dekripsi teks

**JARINGAN:**
\`!ip\`                  → Cek IP publik
\`!ping <domain>\`        → Ping domain/IP

**MEDIA:**
\`!tts <teks>\`          → Text-to-Speech (suara)
\`!stiker\` (+ gambar)   → Konversi gambar jadi stiker WA

**INFO:**
\`!cuaca <kota>\`        → Cuaca sekarang (juga di channel cuaca)`
        );

        // ── 📱 TIKTOK ─────────────────────────────────────────────
        const tiktokCh = ch('tiktok-dl');
        if (tiktokCh) await sendLong(tiktokCh,
`📱 **TIKTOK DOWNLOADER — NO WATERMARK!**
${'═'.repeat(40)}

**DOWNLOAD VIDEO:**
\`!tiktok <url_tiktok>\` → Download video TikTok tanpa watermark

**CARA PAKAI:**
1. Copy link TikTok dari aplikasi (Share → Copy Link)
2. Paste di sini: \`!tiktok https://vt.tiktok.com/xxxxx\`
3. Bot kirim file video langsung!

**💡 Tips:**
▸ Bekerja untuk video publik maupun trending
▸ Ukuran file tergantung resolusi video asli`
        );

        // ── 🧮 KALKULATOR ─────────────────────────────────────────
        const calcCh = ch('kalkulator');
        if (calcCh) await sendLong(calcCh,
`🧮 **KALKULATOR & PERHITUNGAN**
${'═'.repeat(40)}

**MATEMATIKA:**
\`!calc <ekspresi>\`     → Kalkulator serbaguna
Contoh: \`!calc (150*12) + 500000\`

**KESEHATAN:**
\`!bmi <berat> <tinggi>\` → Hitung BMI & kategori

**KEUANGAN:**
\`!cicilan <pokok> <bunga%> <bulan>\`  → Simulasi cicilan KPR/KTA
\`!kurs <jumlah> <dari> <ke>\`         → Konversi mata uang

**ISLAMI:**
\`!zakat <jenis> <jumlah>\`   → Hitung zakat (mal, fitrah, profesi)

**Contoh:**
\`!calc 1000000 * 0.025\`
\`!bmi 65 170\`
\`!cicilan 200000000 9% 120\``
        );

        // ── ⏰ REMINDER ───────────────────────────────────────────
        const reminderCh = ch('reminder');
        if (reminderCh) await sendLong(reminderCh,
`⏰ **SISTEM REMINDER OTOMATIS**
${'═'.repeat(40)}

**SET REMINDER:**
\`!remind 30m Siram tanaman\`     → 30 menit lagi
\`!remind 2h Klaim mining\`       → 2 jam lagi
\`!remind 1d Daily reward\`       → Besok
\`!remind 08:00 Sarapan pagi\`    → Jam 08:00

**KELOLA REMINDER:**
\`!reminderlist\`        → Daftar semua reminder aktif
\`!remindercancel <id>\` → Batalkan reminder

**FORMAT WAKTU:**
\`m\` = menit | \`h\` = jam | \`d\` = hari | \`HH:MM\` = jam spesifik

**💡 Tips Reminder Gaming:**
▸ Set reminder !daily setiap hari
▸ Set reminder !claimmining setiap 4 jam
▸ Set reminder !panen setelah tanam`
        );

        // ── 🌤️ CUACA ─────────────────────────────────────────────
        const cuacaCh = ch('cuaca');
        if (cuacaCh) await sendLong(cuacaCh,
`🌤️ **INFO CUACA REAL-TIME**
${'═'.repeat(40)}

**CUACA SEKARANG:**
\`!cuaca <kota>\`                → Cuaca saat ini
Contoh: \`!cuaca Jakarta\` \`!cuaca Surabaya\`

**PRAKIRAAN:**
\`!prakiraan <kota>\`            → Prakiraan cuaca 7 hari
\`!prakiraan <kota> <hari>\`     → Hari spesifik (1-7)

**INFO YANG DITAMPILKAN:**
▸ 🌡️ Suhu & feels like
▸ 💧 Kelembaban
▸ 🌬️ Kecepatan angin
▸ 🌂 Probabilitas hujan
▸ 🌅 Waktu matahari terbit/terbenam`
        );

        // ── 📰 BERITA ─────────────────────────────────────────────
        const beritaCh = ch('berita');
        if (beritaCh) await sendLong(beritaCh,
`📰 **BERITA TERKINI**
${'═'.repeat(40)}

**COMMAND:**
\`!berita\`              → Headline berita hari ini
\`!headline\`            → Top stories nasional
\`!topik <kata_kunci>\`  → Cari berita by topik

**KATEGORI:**
\`!berita teknologi\`    → Berita tech
\`!berita bisnis\`       → Berita ekonomi & bisnis
\`!berita olahraga\`     → Berita sport
\`!berita hiburan\`      → Berita entertainment`
        );

        // ── 🔮 ZODIAK & MOOD ──────────────────────────────────────
        const zodCh = ch('zodiak-mood');
        if (zodCh) await sendLong(zodCh,
`🔮 **ZODIAK, SHIO & MOOD TRACKER**
${'═'.repeat(40)}

**ZODIAK & RAMALAN:**
\`!zodiak <tanda>\`      → Info zodiak (Aries, Taurus, dll)
\`!horoskop\`            → Horoskop harianmu
\`!shio <tahun>\`        → Info shio berdasarkan tahun lahir

**MOOD TRACKER:**
\`!mood <1-10>\`         → Catat mood hari ini (1=buruk, 10=luar biasa)
\`!moodtrack\`           → Lihat grafik mood minggu ini
\`!moodstreak\`          → Streak pencatatan mood berturut-turut

**TIME MACHINE:**
\`!today\`               → Fakta sejarah yang terjadi hari ini
\`!onthisday <tgl/bln>\` → Fakta sejarah tanggal tertentu`
        );

        // ── 🏆 LEADERBOARD ────────────────────────────────────────
        const lbCh = ch('leaderboard');
        if (lbCh) await sendLong(lbCh,
`🏆 **LEADERBOARD — SIAPA YANG TERKAYA?**
${'═'.repeat(40)}

**RANKING TERSEDIA:**
\`!top\`                 → Top saldo terkaya
\`!topminer\`            → Top miner BTC
\`!topfarmer\`           → Top petani terkaya
\`!topnet\`              → Top net worth (total aset)
\`!toplevel\`            → Top level tertinggi
\`!topinvestor\`         → Top investor saham/crypto

**STATISTIK PRIBADI:**
\`!me\`                  → Status & statistik karaktermu
\`!profile @user\`       → Lihat profil member lain
\`!networth\`            → Total kekayaan bersihmu
\`!portofolio\`          → Rincian semua aset

**🏅 Update leaderboard real-time setiap ada transaksi!**`
        );

        // ── 📊 ANALITIK ───────────────────────────────────────────
        const analitikCh = ch('analitik');
        if (analitikCh) await sendLong(analitikCh,
`📊 **ANALITIK BOT**
${'═'.repeat(40)}

**STATISTIK PENGGUNAAN:**
\`!analitik\`            → Lihat statistik command bot
\`!aistat\`              → Statistik penggunaan AI khususmu

**INFO YANG DITAMPILKAN:**
▸ Command paling sering dipakai
▸ Member paling aktif
▸ Total transaksi ekonomi
▸ Penggunaan AI per model/persona`
        );

        // ── 📣 PENGUMUMAN ─────────────────────────────────────────
        const pengCh = ch('pengumuman');
        if (pengCh) await sendLong(pengCh,
`🎉 **ALGOJO BOT v2.0 — SERVER TELAH DISETUP!**
${'═'.repeat(40)}

Halo @everyone! Server dan bot telah dikonfigurasi lengkap dan siap digunakan!

**🚀 MULAI DARI MANA?**
▸ Baca aturan di <#${aturanCh?.id || 'aturan'}>
▸ Perkenalkan diri di <#${ch('perkenalan')?.id || 'perkenalan'}>
▸ Hubungkan akun WA di <#${linkAkunCh?.id || 'link-akun'}>
▸ Mulai main di <#${botCh?.id || 'bot-command'}>

**💰 LANGKAH AWAL:**
1. \`!daily\` → Ambil reward harian
2. \`!jobs\` → Lamar pekerjaan
3. \`!tanam\` → Mulai farming
4. \`!mining\` → Setup rig mining

**🤖 BUTUH BANTUAN?**
Ketik \`!menu\` atau \`!menufull\` di <#${botCh?.id || 'bot-command'}>

Selamat bermain dan semoga cuan! ⚔️💰`
        );

        // ══════════════════════════════════════════════════════════
        // 4. LAPORAN SELESAI
        // ══════════════════════════════════════════════════════════
        const totalChannels = structure.reduce((a, c) => a + c.channels.length, 0);
        await statusMsg.edit(
`✅ **Setup v3.1 selesai!**

🗑️ Cleanup        : Semua channel & role lama sudah dihapus
📁 Kategori baru  : ${structure.length}
📝 Channel baru   : ${totalChannels}
🎭 Role baru      : ${rolesConfig.length}
📨 Konten         : Semua channel terisi panduan otomatis!

**Channel utama:** ${botCh ? `<#${botCh.id}>` : '#bot-command'}

Server sekarang bersih & terstruktur rapi! 🚀`
        );

    } catch (err) {
        console.error('[Setup v3.1]', err);
        await statusMsg.edit(`❌ Setup gagal: \`${err.message}\`\nCek console untuk detail error.`);
    }
};