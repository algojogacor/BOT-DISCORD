// start-all.js — Entry point untuk Koyeb
// Menjalankan 3 bot sekaligus dalam 1 proses Node.js

const { spawn } = require('child_process');
const path = require('path');

const bots = [
  {
    name: 'ALGOJO-WA',
    command: 'node',
    args: ['index.js'],
    cwd: __dirname,
  },
  {
    name: 'ALGOJO-DISCORD',
    command: 'node',
    args: ['discord-index.js'],
    cwd: __dirname,
  },
  {
    name: 'WA-FM',
    command: 'node',
    // FM pakai ESM (type: module di package.json-nya)
    args: ['--experimental-vm-modules', 'index.js'],
    cwd: path.join(__dirname, 'wa-fm-v2'),
  },
];

function startBot(bot) {
  console.log(`\n🚀 Starting ${bot.name}...`);

  const proc = spawn(bot.command, bot.args, {
    cwd: bot.cwd,
    stdio: 'pipe',
    env: { ...process.env },
  });

  // Pipe log ke console dengan label nama bot
  proc.stdout.on('data', (data) => {
    String(data).trim().split('\n').forEach(line => {
      console.log(`[${bot.name}] ${line}`);
    });
  });

  proc.stderr.on('data', (data) => {
    String(data).trim().split('\n').forEach(line => {
      console.error(`[${bot.name}][ERR] ${line}`);
    });
  });

  // Auto-restart jika crash
  proc.on('close', (code) => {
    console.log(`⚠️  ${bot.name} mati (code ${code}). Restart dalam 5 detik...`);
    setTimeout(() => startBot(bot), 5000);
  });

  proc.on('error', (err) => {
    console.error(`❌ ${bot.name} error: ${err.message}`);
  });

  return proc;
}

// Jalankan semua
bots.forEach(startBot);

// Graceful shutdown — matikan semua child saat proses utama mati
const procs = [];
process.on('SIGINT',  () => { procs.forEach(p => p.kill()); process.exit(0); });
process.on('SIGTERM', () => { procs.forEach(p => p.kill()); process.exit(0); });

console.log('✅ start-all.js berjalan — 3 bot aktif');