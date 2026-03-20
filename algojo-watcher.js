// ╔══════════════════════════════════════════════════════════════╗
// ║           ALGOJO WATCHER — Auto Git Push                    ║
// ║  Detect file baru di /commands/nemo/ → auto commit & push  ║
// ╚══════════════════════════════════════════════════════════════╝

const fs   = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const NEMO_DIR = path.join(__dirname, 'commands', 'nemo');
const CHECK_INTERVAL = 60000; // cek setiap 5 detik

// Pastikan folder nemo ada
if (!fs.existsSync(NEMO_DIR)) {
    fs.mkdirSync(NEMO_DIR, { recursive: true });
    console.log('📁 Folder commands/nemo dibuat');
}

// Simpan list file yang sudah ada
let knownFiles = new Set(fs.readdirSync(NEMO_DIR).filter(f => f.endsWith('.js')));
console.log(`🚀 Algojo Watcher aktif!`);
console.log(`📂 Memantau: ${NEMO_DIR}`);
console.log(`📋 File yang sudah ada: ${[...knownFiles].join(', ') || 'kosong'}\n`);

// Fungsi git push
function autoPush(filename) {
    try {
        console.log(`\n🆕 File baru terdeteksi: ${filename}`);
        console.log(`🔒 Mengaudit keamanan...`);

        // Baca isi file
        const content = fs.readFileSync(path.join(NEMO_DIR, filename), 'utf8');

        // Security check sederhana
        const dangers = [];
        if (content.includes('eval('))        dangers.push('eval()');
        if (content.includes('process.exit')) dangers.push('process.exit()');
        if (content.includes('require("fs")') && content.includes('unlink')) dangers.push('fs.unlink');
        if (content.includes('require("child_process")')) dangers.push('child_process');

        if (dangers.length > 0) {
            console.log(`❌ SECURITY FAILED! Ditemukan: ${dangers.join(', ')}`);
            console.log(`🚫 File TIDAK di-push. Tolong perbaiki dulu.`);
            return;
        }

        console.log(`✅ Security OK!`);
        console.log(`📤 Pushing ke GitHub...`);

        // Git add, commit, push
        const cmdName = filename.replace('.js', '');
        execSync(`git add commands/nemo/${filename}`, { cwd: __dirname });
        execSync(`git commit -m "feat: tambah fitur ${cmdName} by Algojo"`, { cwd: __dirname });
        execSync(`git push origin main`, { cwd: __dirname });

        console.log(`🎉 Berhasil! Fitur !${cmdName} sudah live di GitHub!`);
        console.log(`⏳ Koyeb akan auto-deploy dalam 1-2 menit...\n`);

    } catch (err) {
        console.error(`❌ Error:`, err.message);
    }
}

// Watcher loop
setInterval(() => {
    const currentFiles = new Set(
        fs.readdirSync(NEMO_DIR).filter(f => f.endsWith('.js'))
    );

    // Cek file baru
    for (const file of currentFiles) {
        if (!knownFiles.has(file)) {
            knownFiles.add(file);
            // Tunggu 2 detik biar file selesai ditulis
            setTimeout(() => autoPush(file), 2000);
        }
    }
}, CHECK_INTERVAL);