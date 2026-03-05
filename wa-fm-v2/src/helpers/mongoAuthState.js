// wa-fm-v2/src/helpers/mongoAuthState.js
// Versi ESM dari mongoAuthState — untuk FM Bot

import { MongoClient } from 'mongodb';
import { BufferJSON, initAuthCreds } from '@whiskeysockets/baileys';

const MONGO_URI = process.env.MONGODB_URI || '';
const DB_NAME   = 'algojo_bot'; // pakai DB yang sama dengan Algojo

let client = null;

async function getCollection(sessionName) {
  if (!client) {
    client = new MongoClient(MONGO_URI);
    await client.connect();
  }
  return client.db(DB_NAME).collection(`wa_sessions_${sessionName}`);
}

export async function useMongoDBAuthState(sessionName) {
  const col = await getCollection(sessionName);

  async function readData(id) {
    const doc = await col.findOne({ _id: id });
    if (!doc?.data) return null;
    return JSON.parse(doc.data, BufferJSON.reviver);
  }

  async function writeData(id, data) {
    await col.updateOne(
      { _id: id },
      { $set: { data: JSON.stringify(data, BufferJSON.replacer) } },
      { upsert: true }
    );
  }

  async function removeData(id) {
    await col.deleteOne({ _id: id });
  }

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
            for (const [id, val] of Object.entries(ids || {})) {
              if (val) await writeData(`${type}-${id}`, val);
              else     await removeData(`${type}-${id}`);
            }
          }
        },
      },
    },
    saveCreds: () => writeData('creds', creds),
  };
}