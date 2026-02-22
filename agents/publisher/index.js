import 'dotenv/config';
import axios from 'axios';
import { INSTAGRAM, PATHS, MEDIA_BASE_URL } from './config.js';
import { publishSingle } from './publish-single.js';
import { publishCarousel } from './publish-carousel.js';
import { scanAndQueue, processQueue, getQueueStatus } from './scheduler.js';
import { refreshToken } from './token-refresh.js';
import { getPublishStats } from './logger.js';

// ─── TEST ────────────────────────────────────────────────

async function runTest() {
  console.log('[publisher] ═══ Connection Test ═══\n');

  // Check env vars
  console.log('[test] Checking credentials...');
  const checks = {
    INSTAGRAM_ACCOUNT_ID: !!INSTAGRAM.accountId,
    INSTAGRAM_ACCESS_TOKEN: !!INSTAGRAM.accessToken,
    META_APP_ID: !!INSTAGRAM.appId,
    META_APP_SECRET: !!INSTAGRAM.appSecret,
  };
  for (const [key, ok] of Object.entries(checks)) {
    console.log(`  ${ok ? '✓' : '✗'} ${key}: ${ok ? 'set' : 'MISSING'}`);
  }

  if (!checks.INSTAGRAM_ACCOUNT_ID || !checks.INSTAGRAM_ACCESS_TOKEN) {
    console.error('\n[test] Cannot continue — missing required credentials');
    process.exit(1);
  }

  // Verify API access
  console.log('\n[test] Verifying Instagram API access...');
  try {
    const { data } = await axios.get(
      `${INSTAGRAM.baseUrl}/${INSTAGRAM.apiVersion}/${INSTAGRAM.accountId}`,
      {
        params: {
          fields: 'id,username',
          access_token: INSTAGRAM.accessToken,
        },
      }
    );
    console.log(`  ✓ Connected as @${data.username} (ID: ${data.id})`);
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error(`  ✗ API error: ${msg}`);
    process.exit(1);
  }

  // Config summary
  console.log('\n[test] Configuration...');
  console.log(`  Media base URL: ${MEDIA_BASE_URL}`);
  console.log(`  Ready-to-publish: ${PATHS.readyToPublish}`);
  console.log(`  Queue file: ${PATHS.queue}`);
  console.log(`  Global log: ${PATHS.globalLog}`);

  // Stats
  console.log('\n[test] Publish stats...');
  const stats = await getPublishStats();
  console.log(`  Month: ${stats.month}`);
  console.log(`  Posts: ${stats.posts} | Carousels: ${stats.carousels}`);
  if (stats.lastPublish) {
    console.log(`  Last publish: ${stats.lastPublish.timestamp}`);
  }

  // Queue status
  const queue = await getQueueStatus();
  console.log(`\n[test] Queue: ${queue.pending} pending, ${queue.published} published`);

  console.log('\n[publisher] Test complete ✓');
}

// ─── STATUS ──────────────────────────────────────────────

async function showStatus() {
  console.log('[publisher] ═══ Status ═══\n');

  const stats = await getPublishStats();
  console.log(`[status] Month: ${stats.month}`);
  console.log(`[status] Posts: ${stats.posts} | Carousels: ${stats.carousels}`);
  console.log(`[status] Total logged: ${stats.totalEntries}`);
  if (stats.lastPublish) {
    console.log(`[status] Last: ${stats.lastPublish.timestamp} — ${stats.lastPublish.permalink || stats.lastPublish.mediaId}`);
  }

  const queue = await getQueueStatus();
  console.log(`\n[queue] Pending: ${queue.pending} | Failed: ${queue.failed} | Published: ${queue.published}`);
  if (queue.nextUp) {
    console.log(`[queue] Next: ${queue.nextUp.sourceDir} → ${queue.nextUp.scheduledFor}`);
  }
}

// ─── CLI ─────────────────────────────────────────────────

const command = process.argv[2];
const arg1 = process.argv[3];
const arg2 = process.argv.slice(4).join(' ');

switch (command) {
  case 'publish': {
    if (!arg1) {
      console.error('Usage: node index.js publish <image-url> [caption]');
      process.exit(1);
    }
    publishSingle(arg1, arg2 || '').then(r => {
      console.log(`\n[publisher] Done — ${r.permalink || r.mediaId}`);
    }).catch(err => {
      console.error(`[publisher] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;
  }

  case 'carousel': {
    if (!arg1) {
      console.error('Usage: node index.js carousel "url1,url2,..." [caption]');
      process.exit(1);
    }
    const urls = arg1.split(',').map(u => u.trim());
    publishCarousel(urls, arg2 || '').then(r => {
      console.log(`\n[publisher] Done — ${r.permalink || r.mediaId}`);
    }).catch(err => {
      console.error(`[publisher] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;
  }

  case 'schedule':
    scanAndQueue().catch(err => {
      console.error(`[publisher] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'run':
    scanAndQueue().then(() => processQueue()).catch(err => {
      console.error(`[publisher] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'status':
    showStatus().catch(err => {
      console.error(`[publisher] Error: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'refresh-token':
    refreshToken().catch(err => {
      console.error(`[publisher] Fatal: ${err.message}`);
      process.exit(1);
    });
    break;

  case 'test':
    runTest().catch(err => {
      console.error(`[publisher] Test error: ${err.message}`);
      process.exit(1);
    });
    break;

  default:
    console.log(`Publisher — Instagram Publishing Agent for Sovereign Marketing System`);
    console.log(`\nUsage:`);
    console.log(`  node agents/publisher/index.js publish <url> [caption]    Publish single image`);
    console.log(`  node agents/publisher/index.js carousel "u1,u2" [caption] Publish carousel`);
    console.log(`  node agents/publisher/index.js schedule                   Scan & queue new content`);
    console.log(`  node agents/publisher/index.js run                        Scan, queue & publish due`);
    console.log(`  node agents/publisher/index.js status                     Show publish stats`);
    console.log(`  node agents/publisher/index.js refresh-token              Refresh Instagram token`);
    console.log(`  node agents/publisher/index.js test                       Verify API connection`);
    break;
}
