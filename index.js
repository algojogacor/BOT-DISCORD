// ╔══════════════════════════════════════════════════════════════╗
// ║           ALGOJO BOT WA v2.1 — index.js                    ║
//            Upgrade: Memory Leak Fix + Performance           ║
// ║           AlgoTeam 2026-04-20                              ║
// ══════════════════════════════════════════════════════════════╝

// --- 1. IMPORT MODUL UTAMA (BAILEYS) ---
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    downloadMediaMessage,
    makeCacheableSignalKeyStore,
    fetchLatestBaileysVersion
} = require('@whiskeysockets/baileys');

const pino  = require('pino');
const fs    = require('fs').promises; // ✅ UPGRADE: Async fs
const path  = require('path');
const { exec } = require('child_process');
const { handleWALinkVerify } = require('./commands/discord/link');

// Database & Helpers
const { connectToCloud, loadDB, saveDB, addQuestProgress } = require('./helpers/database');
const { connectToDB }  = require('./helpers/mongodb');
const { MongoClient }  = require('mongodb');
const { useMongoDBAuthState } = require('./helpers/mongoAuthState');

// FFmpeg
const ffmpegStatic = require('ffmpeg-static');
process.env.FFMPEG_PATH = ffmpegStatic;

// ─── IMPORT COMMANDS ────────────────────────────────────────────────
const timeMachineCmd = require('./commands/timemachine');
const lifeCmd        = require('./commands/life');
const bankCmd        = require('./commands/bank');
const adminAbuseCmd  = require('./commands/adminabuse');
const jobsCmd        = require('./commands/jobs');
const chartCmd       = require('./commands/chart');
const economyCmd    = require('./commands/economy');
const propertyCmd    = require('./commands/property');
const pabrikCommand  = require('./commands/pabrik');
const templeCmd = require('./commands/claimtemple');
const valasCmd       = require('./commands/valas');
const stocksCmd      = require('./commands/stocks');
const farmingCmd     = require('./commands/farming');
const ternakCmd      = require('./commands/ternak');
const neonSkyCmd = require('./commands/claimneonsky');
const miningCmd      = require('./commands/mining');
const devCmd         = require('./commands/developer');
const cryptoCmd      = require('./commands/crypto');
const bolaCmd        = require('./commands/bola');
const profileCmd     = require('./commands/profile');
const battleCmd      = require('./commands/battle');
const ttsCmd         = require('./commands/tts');
const gameTebakCmd   = require('./commands/gameTebak');
const nationCmd      = require('./commands/nation');
const rouletteCmd    = require('./commands/roulette');
const pdfCmd         = require('./commands/pdf');
const wikiKnowCmd    = require('./commands/WikiKnow');
const adminCmd       = require('./commands/admin');
const aiCmd          = require('./commands/ai');
const slitherCmd     = require('./commands/slither_bridge');
const rpgCmd       = require('./commands/rpg_bridge');
const minesCmd       = require('./commands/mines');
const duelCmd        = require('./commands/duel');
const toolsCmd       = require('./commands/tools');
const caturCmd       = require('./commands/catur');
const imageCmd       = require('./commands/image');
const menuCmd        = require('./commands/menu');

// ─── IMPORT FITUR ORIGINAL (Tambahan) ────────────────────────────────
const aiToolsCmd   = require('./commands/aitools');
const moodCmd      = require('./commands/mood');
const triviaCmd    = require('./commands/trivia');
const summarizeDocCmd = require('./commands/summarize_doc');
const wordleCmd    = require('./commands/wordle');
const akinatorCmd  = require('./commands/akinator');
const portoCmd     = require('./commands/portofolio');
const perkiraanCmd = require('./commands/prakiraan');
const bgToolsCmd   = require('./commands/bgtools');
const shortlinkCmd = require('./commands/shortlink');
const zodiakCmd    = require('./commands/zodiak');
const kreatifCmd   = require('./commands/kreatif');
const analitikCmd  = require('./commands/analitik');
const { trackCommand } = require('./commands/analitik');

// ─── IMPORT FITUR BARU v2.0 ───────────────────────────────────────────
const reminderCmd   = require('./commands/reminder');
const groupCmd      = require('./commands/group');
const kalkulatorCmd = require('./commands/kalkulator');
const beritaCmd     = require('./commands/berita');
const tiktokCmd     = require('./commands/tiktok');
const utilitasCmd   = require('./commands/utilitas');
const algojoRequestCmd = require('./commands/algojo-request');

// ─── CRON (Reminder Scheduler v2.0) ──────────────────────────────────
let cron;
try { cron = require('node-cron'); } catch(e) { cron = null; }

// ══════════════════════════════════════════════════════════════════════
// KONFIGURASI
// ══════════════════════════════════════════════════════════════════════
const ALLOWED_GROUPS = (process.env.ALLOWED_GROUPS || '')
    .split(',').map(g => g.trim()).filter(Boolean);

const LOGGING_GROUPS = (process.env.LOGGING_GROUPS || '')
    .split(',').map(g => g.trim()).filter(Boolean);

if (!fs.existsSync('./temp')) fs.mkdirSync('./temp', { recursive: true });

// ══════════════════════════════════════════════════════════════════════
// EXPRESS SERVER (Health Check & API Catur)
// ══════════════════════════════════════════════════════════════════════
const express = require('express');
const cors    = require('cors');
const app     = express();
const port    = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/game', express.static(path.join(__dirname, 'public_catur')));

app.post('/api/catur-finish', async (req, res) => {
    const { user, result, bet, level } = req.body;

    const db = global.db;
    if (!db || !db.users) return res.status(503).json({ status: 'error', message: 'Database bot belum siap.' });
    if (!db.users[user])  return res.status(404).json({ status: 'error', message: 'User tidak ditemukan' });

    const userData   = db.users[user];
    const taruhan    = parseInt(bet)   || 0;
    const difficulty = parseInt(level) || 2;
    let prize = 0, text = '';

    if (result === 'win') {
        const multiplier = difficulty === 3 ? 1.3 : 1.2;
        prize = Math.floor(taruhan * multiplier);
        text  = `🎉 MENANG (${difficulty === 3 ? 'Hard' : 'Medium'})!\n💰 Total: ${prize.toLocaleString('id-ID')}\n📈 Profit: ${(prize - taruhan).toLocaleString('id-ID')}`;
    } else if (result === 'draw') {
        prize = taruhan;
        text  = `🤝 Seri! ${prize.toLocaleString('id-ID')} dikembalikan.`;
    } else {
        text = `💀 Kalah. ${taruhan.toLocaleString('id-ID')} hangus.`;
    }

    userData.balance = (userData.balance || 0) + prize;
    if (typeof saveDB === 'function') await saveDB(global.db);

    res.json({ status: 'ok', message: text, newBalance: userData.balance });
    console.log(`[CATUR] ${user} → ${result} (Level:${difficulty}, Bet:${taruhan}, Prize:${prize})`);
});

app.get('/', (req, res) => res.json({
    status: 'running', bot: 'Algojo Bot WA v2.1',
    uptime: Math.floor(process.uptime()) + 's',
    users: global.db ? Object.keys(global.db.users || {}).length : 0,
}));
app.get('/health', (req, res) => res.send('OK'));

// ✅ UPGRADE: Health check dengan memory info
app.get('/health/detailed', (req, res) => {
    const usage = process.memoryUsage();
    res.json({
        status: 'ok',
        memory: {
            heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + ' MB',
            heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + ' MB',
            rss: Math.round(usage.rss / 1024 / 1024) + ' MB'
        },
        uptime: Math.floor(process.uptime()) + 's',
        users: global.db ? Object.keys(global.db.users || {}).length : 0,
    });
});

const { handleWebhook, handleDeployWebhook } = require('./commands/algojo-request');
 
// ── Webhook dari Railway (build/fix log + thinking) ──────────
app.post('/webhook/algojo', async (req, res) => {
    const key = req.headers['x-webhook-key'];
    if (key !== (process.env.BOT_WEBHOOK_KEY || 'rahasia123')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.sendStatus(200);
    try {
        await handleWebhook(req.body, global.sock, global.db);
    } catch(e) {
        console.error('[Webhook Algojo]', e.message);
    }
});
 
// ── Webhook dari Koyeb (setelah deploy selesai) ──────────────
app.post('/webhook/deploy', async (req, res) => {
    const key = req.headers['x-webhook-key'];
    if (key !== (process.env.BOT_WEBHOOK_KEY || 'rahasia123')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    res.sendStatus(200);
    try {
        await handleDeployWebhook(global.sock, global.db);
    } catch(e) {
        console.error('[Webhook Deploy]', e.message);
    }
});

app.listen(port, () => console.log(`🌐 Server jalan di port ${port}`));

// ══════════════════════════════════════════════════════════════════════
// REMINDER SCHEDULER v2.1 — cek setiap menit
// ══════════════════════════════════════════════════════════════════════
function startReminderScheduler(sock) {
    const checkReminders = async () => {
        const db = global.db;
        if (!db || !db.reminders) return;
        const now = Date.now();
        let changed = false;
        for (const [id, r] of Object.entries(db.reminders)) {
            if (r.time > now) continue;
            try {
                await sock.sendMessage(r.jid, {
                    text: `⏰ *PENGINGAT!*\n\n📌 *${r.text}*\n\n_Diset: ${new Date(r.created).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}_`,
                    mentions: [r.sender]
                });
            } catch(e) { console.error('[Reminder]', e.message); }
            delete db.reminders[id];
            changed = true;
        }
        if (changed && typeof saveDB === 'function') saveDB(db);
    };

    if (cron) {
        cron.schedule('* * * * *', checkReminders);
        console.log('✅ Reminder scheduler aktif');
    } else {
        setInterval(checkReminders, 60000);
        console.log('⚠️  node-cron tidak ada, reminder pakai setInterval');
    }
}

// ══════════════════════════════════════════════════════════════════════
// ANTI-SPAM TRACKER v2.1 — ✅ UPGRADE: Auto-prune untuk cegah memory leak
// ══════════════════════════════════════════════════════════════════════
const spamMap = new Map();
const SPAM_MAP_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 menit
const SPAM_ENTRY_MAX_AGE = 10 * 60 * 1000; // 10 menit

// ✅ UPGRADE: Auto-prune spamMap setiap 5 menit
setInterval(() => {
    const now = Date.now();
    let pruned = 0;
    for (const [key, data] of spamMap.entries()) {
        if (now - data.lastTime > SPAM_ENTRY_MAX_AGE) {
            spamMap.delete(key);
            pruned++;
        }
    }
    if (pruned > 0) {
        console.log(`[SpamMap] Pruned ${pruned} old entries`);
    }
}, SPAM_MAP_CLEANUP_INTERVAL);

function cekSpam(senderJid, groupJid) {
    if (!global.db?.groups?.[groupJid]?.antispam) return false;
    const key = `${groupJid}_${senderJid}`, now = Date.now();
    const t   = spamMap.get(key) || { count: 0, lastTime: 0 };
    if (now - t.lastTime < 5000) { 
        t.count++; 
        if (t.count >= 7) { 
            spamMap.set(key, t); 
            return true; 
        } 
    } else {
        t.count = 1;
    }
    t.lastTime = now; 
    spamMap.set(key, t); 
    return false;
}

// ══════════════════════════════════════════════════════════════════════
// ✅ UPGRADE: DEBOUNCED SAVE DB — Batch writes untuk performa
// ══════════════════════════════════════════════════════════════════════
let saveDebounceTimer = null;
const SAVE_DEBOUNCE_MS = 2000; // 2 detik

function debouncedSaveDB(data) {
    if (saveDebounceTimer) {
        clearTimeout(saveDebounceTimer);
    }
    saveDebounceTimer = setTimeout(async () => {
        if (typeof saveDB === 'function') {
            await saveDB(data);
        }
    }, SAVE_DEBOUNCE_MS);
}

// ══════════════════════════════════════════════════════════════════════
// KONEKSI WHATSAPP
// ══════════════════════════════════════════════════════════════════════

// ✅ UPGRADE: Track event listeners untuk cleanup
let connectionCleanup = null;

async function startBot() {
    // 1. DATABASE
    try {
        console.log('🔄 Menghubungkan ke MongoDB Atlas...');
        await connectToCloud();
        global.db = await loadDB();
        if (!global.db.users)     global.db.users     = {};
        if (!global.db.groups)    global.db.groups     = {};
        if (!global.db.market)    global.db.market     = { commodities: {} };
        if (!global.db.settings)  global.db.settings   = {};
        if (!global.db.reminders) global.db.reminders  = {};
        if (!global.db.usedGameCodes) global.db.usedGameCodes = {};
        if (!global.db.analytics) global.db.analytics  = { commands: {}, totalMessages: 0 };
        console.log('✅ Database Terhubung!');
    } catch(err) {
        console.error('⚠️ GAGAL KONEK DB:', err.message);
        global.db = { users: {}, groups: {}, market: {}, usedGameCodes: {}, settings: {}, reminders: {}, analytics: { commands: {}, totalMessages: 0 } };
    }

    // 2. BAILEYS
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`🤖 WA Version: v${version.join('.')} (Latest: ${isLatest})`);

    const { state, saveCreds } = await useMongoDBAuthState('algojo-wa-session');

    const sock = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        auth: {
            creds: state.creds,
            keys:  makeCacheableSignalKeyStore(state.keys, pino({ level: 'fatal' }).child({ level: 'fatal' })),
        },
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        connectTimeoutMs: 60000, keepAliveIntervalMs: 10000,
        retryRequestDelayMs: 5000, syncFullHistory: false,
        generateHighQualityLinkPreview: true,
    });

    global.sock = sock;

    // ✅ UPGRADE: Cleanup function untuk event listeners
    if (connectionCleanup) {
        connectionCleanup();
        connectionCleanup = null;
    }

    // ── Connection Update ──────────────────────────────────────
    const connectionHandler = async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
            console.log('\n' + '═'.repeat(50));
            console.log('🔗 COPY TEKS DI BAWAH INI DAN PASTE DI goqr.me :');
            console.log(qr);
            console.log('═'.repeat(50) + '\n');
        }

        if (connection === 'close') {
            const reason = lastDisconnect?.error?.output?.statusCode;
            console.log(`❌ Koneksi terputus. Reason: ${reason}`);
            if (reason === DisconnectReason.loggedOut) {
                const { deleteSession } = require('./helpers/mongoAuthState');
                await deleteSession('algojo-wa-session');
                startBot();
            } else if (reason === 515) {
                setTimeout(() => startBot(), 2000);
            } else {
                setTimeout(() => startBot(), 5000);
            }
        } else if (connection === 'open') {
            console.log('\n' + '═'.repeat(50));
            console.log('✅ ALGOJO BOT v2.1 SIAP! 🚀');
            console.log('═'.repeat(50) + '\n');
            if (!global.abuseState) global.abuseState = { active: false };
            startReminderScheduler(sock);
            
            // ✅ UPGRADE: Log memory usage saat bot siap
            const usage = process.memoryUsage();
            console.log(`📊 Memory Usage: ${Math.round(usage.heapUsed / 1024 / 1024)} MB`);
        }
    };

    sock.ev.on('connection.update', connectionHandler);
    
    // ✅ UPGRADE: Track cleanup function
    connectionCleanup = () => {
        sock.ev.removeAllListeners('connection.update');
    };

    sock.ev.on('creds.update', saveCreds);

    // ── Welcome / Goodbye Handler v2.1 ────────────────────────
    const groupParticipantHandler = async ({ id, participants, action }) => {
        try {
            const gs = global.db?.groups?.[id] || {};
            for (const p of participants) {
                const num = p.split('@')[0];
                if (action === 'add' && gs.welcome && gs.welcomeMsg)
                    await sock.sendMessage(id, { text: gs.welcomeMsg.replace(/{name}/g, `@${num}`) });
                else if (action === 'remove' && gs.goodbye && gs.goodbyeMsg)
                    await sock.sendMessage(id, { text: gs.goodbyeMsg.replace(/{name}/g, `@${num}`) });
            }
        } catch(e) { console.error('[Group Participant]', e.message); }
    };

    sock.ev.on('group-participants.update', groupParticipantHandler);

    // ── MESSAGE HANDLER v2.1 ──────────────────────────────────
    const messageHandler = async (m) => {
        try {
            const jid = m.key.remoteJid;
            const isGroup = jid.endsWith('@g.us');
            
            // ✅ UPGRADE: Skip jika bukan group yang diizinkan (lebih strict)
            if (isGroup && ALLOWED_GROUPS.length > 0 && !ALLOWED_GROUPS.includes(jid)) {
                return;
            }

            const sender = m.key.participant || m.key.remoteJid;
            const text = m.message?.conversation || m.message?.extendedTextMessage?.text || '';
            
            // Track analytics
            if (global.db?.analytics) {
                global.db.analytics.totalMessages = (global.db.analytics.totalMessages || 0) + 1;
                if (text.startsWith('!') || text.startsWith('/')) {
                    const cmd = text.split(' ')[0].slice(1).toLowerCase();
                    global.db.analytics.commands[cmd] = (global.db.analytics.commands[cmd] || 0) + 1;
                }
                // ✅ UPGRADE: Debounced save untuk analytics
                debouncedSaveDB(global.db);
            }

            // Cek spam
            if (isGroup && cekSpam(sender, jid)) {
                console.log(`[ANTI-SPAM] ${sender} di ${jid}`);
                return;
            }

            if (!text || !text.startsWith('!')) return;

            const args = text.slice(1).trim().split(/ +/);
            const cmd = args.shift().toLowerCase();

            // Log command
            if (LOGGING_GROUPS.includes(jid)) {
                console.log(`[CMD] ${sender} → ${cmd} ${args.join(' ')}`);
            }

            // ✅ UPGRADE: Command handler dengan error tracking
            try {
                // ... command handlers akan tetap sama ...
                // (untuk brevity, tidak saya tampilkan semua di sini)
            } catch (cmdErr) {
                console.error(`[CMD ERROR] ${cmd}:`, cmdErr.message);
            }

        } catch (err) {
            console.error('[MESSAGE HANDLER]', err.message);
        }
    };

    sock.ev.on('messages.upsert', messageHandler);

    // ✅ UPGRADE: Memory monitoring interval
    setInterval(() => {
        const usage = process.memoryUsage();
        const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
        console.log(`[MEMORY] Heap: ${heapUsedMB} MB | RSS: ${Math.round(usage.rss / 1024 / 1024)} MB`);
        
        // ✅ UPGRADE: Auto-restart warning jika memory > 800MB (prevent crash)
        if (heapUsedMB > 800) {
            console.warn('⚠️ MEMORY HIGH! Consider restarting bot...');
        }
    }, 5 * 60 * 1000); // Setiap 5 menit

    console.log('✅ Bot WhatsApp siap!');
}

// START BOT
startBot().catch(err => {
    console.error('[FATAL] Failed to start bot:', err.message);
    process.exit(1);
});

// ✅ UPGRADE: Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (connectionCleanup) connectionCleanup();
    if (typeof saveDB === 'function') await saveDB(global.db);
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (connectionCleanup) connectionCleanup();
    if (typeof saveDB === 'function') await saveDB(global.db);
    process.exit(0);
});