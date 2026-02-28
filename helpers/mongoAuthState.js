// ╔══════════════════════════════════════════════════════════════╗
// ║   MONGODB AUTH STATE — helpers/mongoAuthState.js             ║
// ║   Simpan session Baileys ke MongoDB agar tidak scan QR ulang ║
// ╚══════════════════════════════════════════════════════════════╝

const { MongoClient } = require('mongodb');
const { BufferJSON, initAuthCreds } = require('@whiskeysockets/baileys');

let client = null;
let db     = null;
let col    = null;

async function connectMongo() {
    if (col) return col; // sudah konek, reuse
    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    db  = client.db('wabot');
    col = db.collection('baileys_auth');
    console.log('✅ MongoDB Auth State terhubung!');
    return col;
}

/**
 * useMongoDBAuthState — pengganti useMultiFileAuthState
 * Simpan & load session Baileys dari MongoDB
 */
async function useMongoDBAuthState(sessionId = 'algojo-wa-session') {
    const collection = await connectMongo();

    // Helper: baca dari MongoDB
    const readData = async (key) => {
        const doc = await collection.findOne({ _id: `${sessionId}:${key}` });
        return doc ? JSON.parse(doc.value, BufferJSON.reviver) : null;
    };

    // Helper: tulis ke MongoDB
    const writeData = async (key, value) => {
        await collection.updateOne(
            { _id: `${sessionId}:${key}` },
            { $set: { value: JSON.stringify(value, BufferJSON.replacer) } },
            { upsert: true }
        );
    };

    // Helper: hapus dari MongoDB
    const removeData = async (key) => {
        await collection.deleteOne({ _id: `${sessionId}:${key}` });
    };

    // Load credentials atau buat baru
    const creds = (await readData('creds')) || initAuthCreds();

    return {
        state: {
            creds,
            keys: {
                get: async (type, ids) => {
                    const data = {};
                    for (const id of ids) {
                        const val = await readData(`${type}-${id}`);
                        if (val) data[id] = val;
                    }
                    return data;
                },
                set: async (data) => {
                    for (const [type, ids] of Object.entries(data)) {
                        for (const [id, value] of Object.entries(ids)) {
                            if (value) {
                                await writeData(`${type}-${id}`, value);
                            } else {
                                await removeData(`${type}-${id}`);
                            }
                        }
                    }
                },
            },
        },
        saveCreds: async () => {
            await writeData('creds', creds);
        },
    };
}

/**
 * Hapus session dari MongoDB (untuk logout / reset)
 */
async function deleteSession(sessionId = 'algojo-wa-session') {
    const collection = await connectMongo();
    const result = await collection.deleteMany({
        _id: { $regex: `^${sessionId}:` }
    });
    console.log(`🗑️ Session "${sessionId}" dihapus (${result.deletedCount} dokumen)`);
}

module.exports = { useMongoDBAuthState, deleteSession };