import { join } from 'node:path';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');

// ─── INSTAGRAM API CONFIG ────────────────────────────────
export const INSTAGRAM = {
  get accountId()    { return process.env.INSTAGRAM_ACCOUNT_ID; },
  get accessToken()  { return process.env.INSTAGRAM_ACCESS_TOKEN; },
  get appId()        { return process.env.META_APP_ID; },
  get appSecret()    { return process.env.META_APP_SECRET; },
  apiVersion: 'v24.0',
  baseUrl: 'https://graph.instagram.com',
  oauthUrl: 'https://graph.facebook.com',
};

// ─── MEDIA URL ───────────────────────────────────────────
// Caddy serves vault/ready-to-publish/ at /media/
export const MEDIA_BASE_URL = process.env.PUBLISHER_MEDIA_BASE_URL || 'https://64.227.186.234/media';

// ─── PATHS ───────────────────────────────────────────────
export const PATHS = {
  root: ROOT,
  readyToPublish: join(ROOT, 'vault', 'ready-to-publish'),
  logs: join(import.meta.dirname, 'logs'),
  publishLog: join(import.meta.dirname, 'logs', 'publish-log.json'),
  queue: join(import.meta.dirname, 'logs', 'queue.json'),
  globalLog: join(ROOT, 'logs', 'publisher.log'),
};

// ─── SCHEDULE ────────────────────────────────────────────
// GST (UTC+4) posting slots
export const SCHEDULE = {
  slots: ['07:00', '19:00'],
  timezone: 'Asia/Dubai',
};
