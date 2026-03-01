// ╔══════════════════════════════════════════════════════════════╗
// ║           ALGOJO BOT DISCORD v2.0 — discord-index.js        ║
// ║           Shared DB dengan Bot WA (MongoDB Atlas)            ║
// ╚══════════════════════════════════════════════════════════════╝

const { Client, GatewayIntentBits, Partials, EmbedBuilder, ActivityType } = require('discord.js');
const { connectToCloud, loadDB, saveDB, addQuestProgress } = require('./helpers/database');
const { createDiscordMsg } = require('./helpers/discordAdapter');

// ─── DISCORD SPECIFIC COMMANDS ────────────────────────────────────────────
const setupCmd    = require('./commands/discord/setup');
const linkCmd     = require('./commands/discord/link');
const dcMenuCmd   = require('./commands/discord/dcmenu');
const dcMenuFullCmd = require('./commands/discord/dcmenufull');

// ─── IMPORT COMMANDS (sama persis dengan WA) ──────────────────────────────
const bankCmd        = require('./commands/bank');
const lifeCmd        = require('./commands/life');
const profileCmd     = require('./commands/profile');
const economyCmd     = require('./commands/economy');
const farmingCmd     = require('./commands/farming');
const ternakCmd      = require('./commands/ternak');
const miningCmd      = require('./commands/mining');
const cryptoCmd      = require('./commands/crypto');
const stocksCmd      = require('./commands/stocks');
const valasCmd       = require('./commands/valas');
const jobsCmd        = require('./commands/jobs');
const minesCmd       = require('./commands/mines');
const rouletteCmd    = require('./commands/roulette');
const battleCmd      = require('./commands/battle');
const duelCmd        = require('./commands/duel');
const bolaCmd        = require('./commands/bola');
const aiCmd          = require('./commands/ai');
const triviaCmd      = require('./commands/trivia');
const wordleCmd      = require('./commands/wordle');
const zodiakCmd      = require('./commands/zodiak');
const gameTebakCmd   = require('./commands/gameTebak');
const menuCmd        = require('./commands/menu');

// ─── FITUR DISCORD BARU (v2.0) ────────────────────────────────────────────
const registerWelcome        = require('./commands/discord/welcome');
const registerReactionRoles  = require('./commands/discord/reactionroles');
const registerStatsChannel   = require('./commands/discord/statschannel');
const registerAutoPost       = require('./commands/discord/autopost');
const registerAutoMod        = require('./commands/discord/automod');
const registerModeration     = require('./commands/discord/moderation');
const registerTicket         = require('./commands/discord/ticket');
const registerLevelXP        = require('./commands/discord/levelxp');
const registerGiveaway       = require('./commands/discord/giveaway');
const registerEventScheduler = require('./commands/discord/eventscheduler');
const registerShop           = require('./commands/discord/shop');
const registerTipNetworth    = require('./commands/discord/tipnetworth');
const registerPersistence    = require('./commands/discord/persistence');
const registerPoll           = require('./commands/discord/poll');

// ══════════════════════════════════════════════════════════════════════
// DISCORD CLIENT SETUP
// ══════════════════════════════════════════════════════════════════════
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember],
});

// ── Daftarkan semua fitur (HARUS setelah client dibuat, SEBELUM login) ────
registerPersistence(client);  // ← HARUS PERTAMA agar db siap
registerPoll(client);
registerWelcome(client);
registerReactionRoles(client);
registerStatsChannel(client);
registerAutoPost(client);
registerAutoMod(client);
registerModeration(client);
registerTicket(client);
registerLevelXP(client);
registerGiveaway(client);
registerEventScheduler(client);
registerShop(client);
registerTipNetworth(client);

// ══════════════════════════════════════════════════════════════════════
// BOT READY
// ══════════════════════════════════════════════════════════════════════
client.once('clientReady', async () => {
    console.log('\n' + '═'.repeat(50));
    console.log(`✅ ALGOJO DISCORD BOT v2.0 SIAP! Login sebagai: ${client.user.tag}`);
    console.log('═'.repeat(50) + '\n');
    console.log('📦 Fitur aktif:');
    console.log('   ✅ Welcome & Leave');
    console.log('   ✅ Reaction Roles');
    console.log('   ✅ Stats Channel');
    console.log('   ✅ Auto Post Harian');
    console.log('   ✅ Auto Mod');
    console.log('   ✅ Moderation (warn/mute/kick/ban)');
    console.log('   ✅ Ticket System');
    console.log('   ✅ Level & XP Discord');
    console.log('   ✅ Giveaway System');
    console.log('   ✅ Event Scheduler');
    console.log('   ✅ Discord Shop');
    console.log('   ✅ Tip & Net Worth Board');
    console.log('   ✅ Poll System (MongoDB)');
    console.log('   ✅ Persistence (semua data tersimpan MongoDB)');
    console.log('');

    client.user.setActivity('!menu | Algojo v2.0', { type: ActivityType.Playing });
});

// ══════════════════════════════════════════════════════════════════════
// MESSAGE HANDLER
// ══════════════════════════════════════════════════════════════════════
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!')) return;

    const db = global.db;
    if (!db) return message.reply('⚠️ Database belum siap, coba lagi sebentar.');

    const discordId = message.author.id;
    const guildId   = message.guild?.id || 'dm';
    const pushName  = message.author.username;

    // ── Resolve sender ─────────────────────────────────────────────
    const linkedWA = db.discordLinks?.[discordId];
    const sender   = linkedWA || `dc_${discordId}`;

    // ── Register user baru ─────────────────────────────────────────
    const today = new Date().toISOString().split('T')[0];
    const defaultQuest = {
        daily: [
            { id: 'chat',    name: 'Ngobrol Aktif', progress: 0, target: 10, reward: 200,  claimed: false },
            { id: 'game',    name: 'Main Casino',   progress: 0, target: 3,  reward: 300,  claimed: false },
            { id: 'sticker', name: 'Kirim Pesan',   progress: 0, target: 2,  reward: 150,  claimed: false },
        ],
        weekly: { id: 'weekly', name: 'Weekly Warrior', progress: 0, target: 100, reward: 2000, claimed: false },
        lastReset: today,
    };

    if (!db.users[sender]) {
        const totalUsers = Object.keys(db.users).length;
        db.users[sender] = {
            id: totalUsers + 1, name: pushName,
            balance: 15000000, bank: 0, debt: 0, xp: 0, level: 1,
            hp: 100, hunger: 100, energy: 100,
            lastLifeUpdate: Date.now(), isDead: false,
            isSleeping: false, sleepEndTime: 0,
            inv: [], buffs: {}, lastDaily: 0,
            bolaWin: 0, bolaTotal: 0, bolaProfit: 0,
            crypto: {}, quest: JSON.parse(JSON.stringify(defaultQuest)),
            forex: { usd: 0, eur: 0, jpy: 0, emas: 0 },
            ternak: [], ternak_inv: { dedak: 0, pelet: 0, premium: 0, obat: 0 },
            farm: { plants: [], inventory: {}, machines: [], processing: [] },
            mining: { racks: [], lastClaim: 0, totalHash: 0 },
            job: null, lastWork: 0, lastSkill: 0,
            dailyIncome: 0, dailyUsage: 0,
            aiMemory: [], aiFullHistory: [], aiPersona: 'default',
            aiStats: { totalMessages: 0, totalChars: 0, firstChatDate: null },
            badges: [], discordBoosts: {},
            platform: 'discord',
        };
        console.log(`[NEW DISCORD USER] ${pushName} (${discordId}) registered`);
    }

    const user = db.users[sender];
    user.lastSeen = Date.now();
    user.name     = pushName || user.name;

    // ── Auto-fix field ─────────────────────────────────────────────
    if (!user.crypto)        user.crypto        = {};
    if (!user.quest)         user.quest         = JSON.parse(JSON.stringify(defaultQuest));
    if (!user.forex)         user.forex         = { usd: 0, eur: 0, jpy: 0, emas: 0 };
    if (!user.farm)          user.farm          = { plants: [], inventory: {}, machines: [], processing: [] };
    if (!user.mining)        user.mining        = { racks: [], lastClaim: 0, totalHash: 0 };
    if (!user.aiMemory)      user.aiMemory      = [];
    if (!user.aiPersona)     user.aiPersona     = 'default';
    if (!user.aiStats)       user.aiStats       = { totalMessages: 0, totalChars: 0, firstChatDate: null };
    if (!user.badges)        user.badges        = [];
    if (!user.discordBoosts) user.discordBoosts = {};

    // Daily reset
    if (user.quest?.lastReset !== today) {
        user.quest.daily.forEach(q => { q.progress = 0; q.claimed = false; });
        user.quest.lastReset = today;
        user.dailyIncome = 0;
        user.dailyUsage  = 0;
    }

    // XP & Leveling (dari WA/game system, bukan Discord XP)
    user.xp += user.buffs?.xp?.active ? 5 : 2;
    if (user.quest?.weekly && !user.quest.weekly.claimed) user.quest.weekly.progress++;
    const nextLvl = Math.floor(user.xp / 100) + 1;
    if (nextLvl > user.level) {
        user.level = nextLvl;
        message.reply(`🎊 **LEVEL UP!** Sekarang Level **${user.level}**`);
    }
    if (typeof addQuestProgress === 'function') addQuestProgress(user, 'chat');

    // Analytics
    if (db.analytics) {
        db.analytics.totalMessages = (db.analytics.totalMessages || 0) + 1;
    }

    // ── Parse command ──────────────────────────────────────────────
    const args    = message.content.slice(1).trim().split(/ +/);
    const command = args.shift().toLowerCase();
    const body    = message.content;

    console.log(`📨 [Discord] ${pushName}: ${body.slice(0, 50)}`);

    const msg = createDiscordMsg(message, body, sender, pushName, guildId);

    if (db.analytics) {
        if (!db.analytics.commands) db.analytics.commands = {};
        db.analytics.commands[command] = (db.analytics.commands[command] || 0) + 1;
    }

    // ══════════════════════════════════════════════════════════════
    // DISPATCH COMMANDS
    // ══════════════════════════════════════════════════════════════

    // Discord-specific
    await linkCmd(command, args, msg, user, db, discordId)
        .catch(e => console.error('[Link]', e.message));
    await dcMenuCmd(command, args, msg, user, db)
        .catch(e => console.error('[DCMenu]', e.message));
    await dcMenuFullCmd(command, args, msg, user, db)
        .catch(e => console.error('[DCMenuFull]', e.message));
    await setupCmd(command, args, msg, user, db, client)
        .catch(e => console.error('[Setup]', e.message));

    // Shared commands (sama dengan WA)
    await bankCmd(command, args, msg, user, db, null)
        .catch(e => console.error('[Bank]', e.message));
    await lifeCmd(command, args, msg, user, db, null)
        .catch(e => console.error('[Life]', e.message));
    await profileCmd(command, args, msg, user, db, null, null)
        .catch(e => console.error('[Profile]', e.message));
    await farmingCmd(command, args, msg, user, db)
        .catch(e => console.error('[Farming]', e.message));
    await ternakCmd(command, args, msg, user, db)
        .catch(e => console.error('[Ternak]', e.message));
    await miningCmd(command, args, msg, user, db, null)
        .catch(e => console.error('[Mining]', e.message));
    await cryptoCmd(command, args, msg, user, db)
        .catch(e => console.error('[Crypto]', e.message));
    await stocksCmd(command, args, msg, user, db, null)
        .catch(e => console.error('[Stocks]', e.message));
    await valasCmd(command, args, msg, user, db)
        .catch(e => console.error('[Valas]', e.message));
    await jobsCmd(command, args, msg, user, db)
        .catch(e => console.error('[Jobs]', e.message));
    await minesCmd(command, args, msg, user, db)
        .catch(e => console.error('[Mines]', e.message));
    await rouletteCmd(command, args, msg, user, db)
        .catch(e => console.error('[Roulette]', e.message));
    await battleCmd(command, args, msg, user, db)
        .catch(e => console.error('[Battle]', e.message));
    await duelCmd(command, args, msg, user, db)
        .catch(e => console.error('[Duel]', e.message));
    await bolaCmd(command, args, msg, user, db, sender)
        .catch(e => console.error('[Bola]', e.message));
    await aiCmd(command, args, msg, user, db)
        .catch(e => console.error('[AI]', e.message));
    await triviaCmd(command, args, msg, user, db, body)
        .catch(e => console.error('[Trivia]', e.message));
    await wordleCmd(command, args, msg, user, db)
        .catch(e => console.error('[Wordle]', e.message));
    await zodiakCmd(command, args, msg, user, db)
        .catch(e => console.error('[Zodiak]', e.message));
    await gameTebakCmd(command, args, msg, user, db, body)
        .catch(e => console.error('[GameTebak]', e.message));
});

// ══════════════════════════════════════════════════════════════════════
// STARTUP
// ══════════════════════════════════════════════════════════════════════
async function startDiscordBot() {
    try {
        console.log('🔄 Menghubungkan ke MongoDB Atlas...');
        await connectToCloud();
        global.db = await loadDB();
        if (!global.db.users)        global.db.users        = {};
        if (!global.db.groups)       global.db.groups       = {};
        if (!global.db.market)       global.db.market       = { commodities: {} };
        if (!global.db.settings)     global.db.settings     = {};
        if (!global.db.reminders)    global.db.reminders    = {};
        if (!global.db.analytics)    global.db.analytics    = { commands: {}, totalMessages: 0 };
        if (!global.db.discordLinks) global.db.discordLinks = {};
        console.log('✅ Database Terhubung!');
    } catch(err) {
        console.error('⚠️ GAGAL KONEK DB:', err.message);
        global.db = {
            users: {}, groups: {}, market: {}, settings: {},
            reminders: {}, analytics: { commands: {}, totalMessages: 0 },
            discordLinks: {},
        };
    }

    setInterval(() => { if (global.db) saveDB(global.db); }, 60000);
    await client.login(process.env.DISCORD_TOKEN);
}

startDiscordBot();

// Graceful shutdown
async function handleExit(signal) {
    console.log(`\n🛑 Sinyal ${signal}. Mematikan Discord bot...`);
    if (global.db && typeof saveDB === 'function') await saveDB(global.db);
    console.log('✅ Shutdown selesai. Bye!');
    process.exit(0);
}
process.on('SIGINT',  () => handleExit('SIGINT'));
process.on('SIGTERM', () => handleExit('SIGTERM'));
process.on('uncaughtException',  (e) => console.error('[uncaughtException]',  e.message));
process.on('unhandledRejection', (e) => console.error('[unhandledRejection]', e));