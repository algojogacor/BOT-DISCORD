require('dotenv').config();
const { MongoClient } = require('mongodb');

const uri = process.env.MONGODB_URI;

// ✅ UPGRADE v2.1: Optimized connection pooling
const client = new MongoClient(uri, {
    connectTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 50,              // ✅ Increased from 10 to 50
    minPoolSize: 10,              // ✅ NEW: Maintain min connections
    maxIdleTimeMS: 60000,         // ✅ NEW: Close idle after 1 min
    waitQueueTimeoutMS: 5000,     // ✅ NEW: Fail fast if pool full
    serverSelectionTimeoutMS: 5000,
    heartbeatFrequencyMS: 10000,  // ✅ NEW: Faster failure detection
});

let dbCollection = null;

// Struktur Data Default
let localData = { 
    users: {}, 
    groups: {}, 
    chatLogs: {},
    market: { commodities: {} }, 
    settings: {},
    reminders: {},
    analytics: { commands: {}, totalMessages: 0 }
};

// ============================================================
// 1. KONEKSI KE CLOUD
// ============================================================
async function connectToCloud() {
    try {
        if (dbCollection) return dbCollection; 

        console.log("☁️ Menghubungkan ke MongoDB Atlas...");
        await client.connect();
        
        const db = client.db('bot_data'); 
        dbCollection = db.collection('bot_data'); 
        
        console.log("✅ Terhubung ke MongoDB Cloud!");
        
        // Load data segera setelah konek
        await loadFromCloud();
        return dbCollection;
    } catch (err) {
        console.error("❌ Gagal Konek MongoDB:", err.message);
        throw err; 
    }
}

// ============================================================
// 2. LOAD DATA
// ============================================================
async function loadFromCloud() {
    try {
        if (!dbCollection) await connectToCloud();

        const result = await dbCollection.findOne({ _id: 'main_data' }); 
        
        if (result && result.data) {
            localData = { ...localData, ...result.data };
            
            if (!localData.users) localData.users = {};
            if (!localData.groups) localData.groups = {};
            if (!localData.chatLogs) localData.chatLogs = {};
            if (!localData.reminders) localData.reminders = {};
            if (!localData.analytics) localData.analytics = { commands: {}, totalMessages: 0 };
            
            console.log(`📥 Data dimuat: ${Object.keys(localData.users).length} users.`);
        } else {
            console.log("ℹ️ Database Cloud kosong. Menggunakan data lokal baru.");
            await saveDB(localData);
        }
    } catch (err) {
        console.error("⚠️ Gagal Load Data:", err.message);
    }
    return localData;
}

// Wrapper
const loadDB = async () => {
    if (!localData.users || Object.keys(localData.users).length === 0) {
        return await loadFromCloud();
    }
    return localData;
};

// ============================================================
// 3. SAVE DATA (THROTTLING / ANTI-SPAM) - ✅ UPGRADED
// ============================================================
let isSaving = false;
let saveQueue = []; // ✅ NEW: Queue for batch saves
const SAVE_INTERVAL_MS = 3000; // ✅ NEW: Batch every 3 seconds

// ✅ UPGRADE: Process save queue periodically
async function processSaveQueue() {
    if (isSaving || saveQueue.length === 0) return;
    
    isSaving = true;
    const pendingSaves = [...saveQueue];
    saveQueue = [];
    
    try {
        if (!dbCollection) {
            await connectToCloud();
        }

        // Merge all pending saves
        let mergedData = { ...localData };
        for (const update of pendingSaves) {
            mergedData = { ...mergedData, ...update };
        }
        localData = mergedData;

        await dbCollection.updateOne(
            { _id: 'main_data' }, 
            { $set: { data: localData } }, 
            { upsert: true } 
        );
        
    } catch (err) {
        console.error("⚠️ Gagal Save ke MongoDB:", err.message);
        // Re-queue failed saves
        saveQueue = [...pendingSaves, ...saveQueue];
    } finally {
        isSaving = false;
    }
}

// ✅ UPGRADE: Process queue every 3 seconds
setInterval(processSaveQueue, SAVE_INTERVAL_MS);

const saveDB = async (data) => {
    if (data) {
        // ✅ UPGRADE: Queue instead of immediate save
        saveQueue.push(data);
    } else if (!isSaving) {
        // Force immediate save if no data provided
        await processSaveQueue();
    }
};

// ✅ UPGRADE: Force save all pending (for shutdown)
const forceSaveDB = async (data) => {
    if (data) localData = data;
    await processSaveQueue();
};

// ============================================================
// 4. HELPER QUEST
// ============================================================
const addQuestProgress = (user, questId) => {
    if (!user.quest || !user.quest.daily) return null;
    
    const quest = user.quest.daily.find(q => q.id === questId);
    
    if (quest && !quest.claimed && quest.progress < quest.target) {
        quest.progress++;
        
        if (quest.progress >= quest.target) {
            return `🎉 Quest *${quest.name}* Selesai! Ketik !daily klaim.`;
        }
    }
    return null;
};

// ✅ UPGRADE: Export force save for graceful shutdown
module.exports = { connectToCloud, loadDB, saveDB, forceSaveDB, addQuestProgress };