import 'dotenv/config';
import TelegramBot from 'node-telegram-bot-api';
import { writeFileSync, readdirSync, appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const UPLOAD_DIR = '/root/unicorn-sovereign/vault/originals';
const LOG_FILE = '/root/unicorn-sovereign/logs/telegram-photos.log';

if (!BOT_TOKEN) {
  console.error('[telegram-photos] TELEGRAM_BOT_TOKEN not set');
  process.exit(1);
}

// Ensure directories exist
mkdirSync(UPLOAD_DIR, { recursive: true });
mkdirSync(join(LOG_FILE, '..'), { recursive: true });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  console.log(msg);
  appendFileSync(LOG_FILE, line, 'utf-8');
}

function countQueueImages() {
  try {
    return readdirSync(UPLOAD_DIR).filter(f => /\.(jpg|jpeg|png|webp)$/i.test(f)).length;
  } catch {
    return 0;
  }
}

// Start bot in polling mode
const bot = new TelegramBot(BOT_TOKEN, { polling: true });
log('[telegram-photos] Bot started — listening for photos');

// ─── PHOTO HANDLER ───────────────────────────────────────
// Photos sent as images (compressed by Telegram)

bot.on('photo', async (msg) => {
  // Optional: restrict to authorized chat
  if (CHAT_ID && String(msg.chat.id) !== String(CHAT_ID)) return;

  try {
    // Get highest resolution version
    const photo = msg.photo[msg.photo.length - 1];
    const file = await bot.getFile(photo.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    // Download the file
    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    // Save to vault/originals/
    const timestamp = Date.now();
    const filename = `${timestamp}-telegram-${photo.file_unique_id}.jpg`;
    const savePath = join(UPLOAD_DIR, filename);
    writeFileSync(savePath, buffer);

    // Save metadata if caption exists
    if (msg.caption) {
      const metaPath = savePath.replace('.jpg', '-meta.json');
      writeFileSync(metaPath, JSON.stringify({
        filename,
        source: 'telegram',
        caption: msg.caption,
        sender: msg.from?.first_name || 'Unknown',
        timestamp: new Date().toISOString(),
      }, null, 2));
    }

    const queueCount = countQueueImages();
    log(`PHOTO saved: ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);

    await bot.sendMessage(msg.chat.id,
      `\u{1F4F8} Photo saved! Curator will process it shortly.\n` +
      `\u{1F4CA} ${queueCount} photos in queue.\n` +
      (msg.caption
        ? `\u{1F4DD} Note: "${msg.caption}"`
        : `\u{1F4A1} Tip: Add a caption for context (e.g., "kitchen after - Arabian Ranches")`)
    );
  } catch (err) {
    log(`PHOTO_ERROR: ${err.message}`);
    await bot.sendMessage(msg.chat.id, '\u274C Failed to save photo. Try again.').catch(() => {});
  }
});

// ─── DOCUMENT HANDLER ────────────────────────────────────
// Full-res photos sent as files (preserves quality)

bot.on('document', async (msg) => {
  if (!msg.document?.mime_type?.startsWith('image/')) return;
  if (CHAT_ID && String(msg.chat.id) !== String(CHAT_ID)) return;

  try {
    const file = await bot.getFile(msg.document.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;

    const response = await fetch(fileUrl);
    const buffer = Buffer.from(await response.arrayBuffer());

    const timestamp = Date.now();
    const ext = msg.document.file_name?.split('.').pop() || 'jpg';
    const filename = `${timestamp}-telegram-${msg.document.file_unique_id}.${ext}`;
    const savePath = join(UPLOAD_DIR, filename);
    writeFileSync(savePath, buffer);

    if (msg.caption) {
      const metaPath = savePath.replace(/\.\w+$/, '-meta.json');
      writeFileSync(metaPath, JSON.stringify({
        filename,
        source: 'telegram',
        caption: msg.caption,
        sender: msg.from?.first_name || 'Unknown',
        timestamp: new Date().toISOString(),
      }, null, 2));
    }

    const queueCount = countQueueImages();
    log(`DOCUMENT saved: ${filename} (${(buffer.length / 1024).toFixed(0)} KB)`);

    await bot.sendMessage(msg.chat.id,
      `\u{1F4F8} Full-res photo saved! Curator will process it shortly.\n` +
      `\u{1F4CA} ${queueCount} photos in queue.`
    );
  } catch (err) {
    log(`DOCUMENT_ERROR: ${err.message}`);
    await bot.sendMessage(msg.chat.id, '\u274C Failed to save photo. Try again.').catch(() => {});
  }
});

// ─── GRACEFUL SHUTDOWN ───────────────────────────────────

process.on('SIGTERM', () => {
  log('Shutting down...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGINT', () => {
  log('Shutting down...');
  bot.stopPolling();
  process.exit(0);
});
