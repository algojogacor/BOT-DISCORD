// index.js — WhatsApp Football Manager Bot v2

import {
  makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { existsSync } from 'fs';
import { useMongoDBAuthState } from './src/helpers/mongoAuthState.js';
import { initDB } from './src/db/database.js';
import { handleMessage } from './src/bot/commands.js';

// ─── Load .env ────────────────────────────────────────────────────────────────
function loadEnv() {
  if (!existsSync('./.env')) return;
  for (const line of readFileSync('./.env', 'utf-8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const [k, ...v] = t.split('=');
    if (k) process.env[k.trim()] = v.join('=').trim();
  }
}
loadEnv();

const GROUP_ID    = process.env.GROUP_ID || '';
const LEAGUE_NAME = process.env.LEAGUE_NAME || 'Liga Nusantara';

// ─── Logger ───────────────────────────────────────────────────────────────────
const logger = pino({
  transport: { target: 'pino-pretty', options: { colorize: true } },
  level: 'info',
});

// ─── Init DB ──────────────────────────────────────────────────────────────────
initDB();
logger.info('Database initialized');

if (!GROUP_ID) logger.warn('GROUP_ID belum diset di .env! Bot akan log semua grup ID.');

// ─── Start Bot ────────────────────────────────────────────────────────────────
async function startBot() {
const { state, saveCreds } = await useMongoDBAuthState('wa-fm-session');
  const { version }          = await fetchLatestBaileysVersion();
  logger.info(`Baileys v${version.join('.')}`);

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'silent' })),
    },
    printQRInTerminal: false,
    browser: ['FM Bot v2', 'Chrome', '2.0.0'],
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
  });

  sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      logger.info('Scan QR ini dengan WhatsApp:');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const code          = new Boom(lastDisconnect?.error)?.output?.statusCode;
      const shouldReconn  = code !== DisconnectReason.loggedOut;
      logger.warn(`Koneksi terputus (${code}). Reconnect: ${shouldReconn}`);
      if (shouldReconn) setTimeout(startBot, 3000);
      else { logger.error('Logged out. Hapus session wa-fm-session di MongoDB dan scan ulang.'); process.exit(1); }
    }
    if (connection === 'open') {
      logger.info('FM Bot v2 terhubung!');
      if (GROUP_ID) logger.info(`Grup aktif: ${GROUP_ID}`);
    }
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      try {
        const chatJid = msg.key.remoteJid;
        if (!chatJid || chatJid === 'status@broadcast') continue;
        if (msg.key.fromMe) continue;

        const isGroup = chatJid.endsWith('@g.us');

        // Tolak pesan non-grup
        if (!isGroup) {
          const t = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
          if (t) await sock.sendMessage(chatJid, { text: '⚽ Bot ini hanya aktif di grup!' });
          continue;
        }

        // Filter by GROUP_ID
        if (GROUP_ID && chatJid !== GROUP_ID) {
          if (!GROUP_ID) logger.info(`Grup tidak dikonfigurasi: ${chatJid}`);
          continue;
        }

        if (!GROUP_ID) {
          logger.info(`[SETUP] Copy ID grup ini ke .env: ${chatJid}`);
          continue;
        }

        const textContent =
          msg.message?.conversation ||
          msg.message?.extendedTextMessage?.text ||
          msg.message?.ephemeralMessage?.message?.conversation || '';

        if (!textContent?.trim()) continue;

        const senderJid = msg.key.participant || chatJid;
        logger.info(`[${chatJid.split('@')[0]}] ${senderJid.split('@')[0]}: "${textContent}"`);

        await sock.readMessages([msg.key]);
        await handleMessage(sock, chatJid, senderJid, textContent, LEAGUE_NAME);

      } catch (err) {
        logger.error('Error: ' + err.message);
        logger.error(err.stack);
        try { await sock.sendMessage(msg.key.remoteJid, { text: '❌ Error. Coba lagi.' }); } catch {}
      }
    }
  });

  return sock;
}

process.on('SIGINT', () => { logger.info('Bot dihentikan.'); process.exit(0); });

startBot().catch(err => { logger.error('Fatal: ' + err.message); process.exit(1); });