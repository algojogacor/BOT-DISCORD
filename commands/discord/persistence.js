// ╔══════════════════════════════════════════════════════════════╗
// ║   PERSISTENCE PATCH — commands/discord/persistence.js        ║
// ║   Pastikan semua data fitur Discord tersimpan di MongoDB     ║
// ║   Panggil registerPersistence(client) sebelum register lain  ║
// ╚══════════════════════════════════════════════════════════════╝

module.exports = function registerPersistence(client) {

    client.once('clientReady', () => {
        const db = global.db;
        if (!db) return;

        // Inisialisasi semua koleksi Discord di global.db
        // agar otomatis tersimpan ke MongoDB saat saveDB dipanggil

        if (!db.polls)         db.polls         = {};  // Poll system
        if (!db.discordWarn)   db.discordWarn   = {};  // Warn per user { guildId_userId: [...] }
        if (!db.discordXP)     db.discordXP     = {};  // XP chat Discord { guildId_userId: { xp, level } }
        if (!db.discordEvents) db.discordEvents = [];  // Event scheduler
        if (!db.giveaways)     db.giveaways     = {};  // Giveaway yang sudah selesai (arsip)
        if (!db.shopPurchases) db.shopPurchases = {};  // Log pembelian shop

        console.log('✅ [Persistence] Koleksi Discord siap di MongoDB:');
        console.log(`   polls: ${Object.keys(db.polls).length}`);
        console.log(`   discordWarn: ${Object.keys(db.discordWarn).length}`);
        console.log(`   discordXP: ${Object.keys(db.discordXP).length}`);
        console.log(`   discordEvents: ${db.discordEvents.length}`);
    });

    console.log('✅ [Persistence] Registered');
};