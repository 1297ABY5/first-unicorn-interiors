import { readdir, readFile, writeFile, stat, mkdir } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { PATHS, MEDIA_BASE_URL, SCHEDULE } from './config.js';
import { publishSingle } from './publish-single.js';
import { publishCarousel } from './publish-carousel.js';
import { appendErrorLog } from './logger.js';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

// ─── LOAD / SAVE QUEUE ──────────────────────────────────

async function loadQueue() {
  try {
    return JSON.parse(await readFile(PATHS.queue, 'utf-8'));
  } catch {
    return { queue: [], published: [] };
  }
}

async function saveQueue(data) {
  await mkdir(PATHS.logs, { recursive: true });
  await writeFile(PATHS.queue, JSON.stringify(data, null, 2), 'utf-8');
}

// ─── NEXT AVAILABLE SLOTS ────────────────────────────────

export function getNextSlots(count = 10) {
  const slots = [];
  const now = new Date();

  // Start from current time in Dubai
  const dubaiNow = new Date(now.toLocaleString('en-US', { timeZone: SCHEDULE.timezone }));
  let day = new Date(dubaiNow);
  day.setSeconds(0, 0);

  // Walk forward finding 7am/7pm GST slots
  for (let d = 0; slots.length < count && d < 60; d++) {
    for (const slot of SCHEDULE.slots) {
      const [h, m] = slot.split(':').map(Number);
      const candidate = new Date(day);
      candidate.setHours(h, m, 0, 0);

      // Convert back to UTC for comparison
      // Dubai is UTC+4
      const utcCandidate = new Date(candidate.getTime() - 4 * 60 * 60 * 1000);

      if (utcCandidate > now) {
        slots.push({
          local: `${candidate.toISOString().slice(0, 10)} ${slot} GST`,
          utc: utcCandidate.toISOString(),
        });
      }

      if (slots.length >= count) break;
    }
    day.setDate(day.getDate() + 1);
    day.setHours(0, 0, 0, 0);
  }

  return slots;
}

// ─── SCAN & QUEUE ────────────────────────────────────────

export async function scanAndQueue() {
  await mkdir(PATHS.readyToPublish, { recursive: true });

  const data = loadQueue instanceof Function ? await loadQueue() : { queue: [], published: [] };
  const queuedDirs = new Set([
    ...data.queue.map(p => p.sourceDir),
    ...data.published.map(p => p.sourceDir),
  ]);

  // Scan ready-to-publish directories
  let dirs;
  try {
    dirs = await readdir(PATHS.readyToPublish);
  } catch {
    console.log('[publisher] No ready-to-publish directory found');
    return data;
  }

  const newPosts = [];
  for (const dir of dirs) {
    if (queuedDirs.has(dir)) continue;

    const dirPath = join(PATHS.readyToPublish, dir);
    const dirStat = await stat(dirPath).catch(() => null);
    if (!dirStat?.isDirectory()) continue;

    // Find images in directory
    const files = await readdir(dirPath);
    const images = files.filter(f => IMAGE_EXTS.has(extname(f).toLowerCase()));
    if (images.length === 0) continue;

    // Build public URLs
    const imageUrls = images.map(f => `${MEDIA_BASE_URL}/${dir}/${f}`);

    // Load caption if exists
    let caption = '';
    try {
      caption = await readFile(join(dirPath, 'caption.txt'), 'utf-8');
      caption = caption.trim();
    } catch { /* no caption file */ }

    newPosts.push({
      id: `pub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: images.length >= 2 ? 'carousel' : 'single',
      images,
      imageUrls,
      sourceDir: dir,
      caption,
      status: 'pending',
    });
  }

  if (newPosts.length === 0) {
    console.log('[publisher] No new content to queue');
    return data;
  }

  // Assign schedule slots
  const slots = getNextSlots(newPosts.length);
  for (let i = 0; i < newPosts.length; i++) {
    newPosts[i].scheduledFor = slots[i]?.utc || new Date().toISOString();
    newPosts[i].scheduledDisplay = slots[i]?.local || 'immediate';
    data.queue.push(newPosts[i]);
    console.log(`[publisher] Queued: ${newPosts[i].sourceDir} (${newPosts[i].type}, ${newPosts[i].images.length} images) → ${newPosts[i].scheduledDisplay}`);
  }

  await saveQueue(data);
  console.log(`[publisher] ${newPosts.length} new posts queued`);
  return data;
}

// ─── PROCESS QUEUE ───────────────────────────────────────

export async function processQueue() {
  const data = await loadQueue();
  const now = new Date().toISOString();

  const due = data.queue.filter(p => p.status === 'pending' && p.scheduledFor <= now);
  if (due.length === 0) {
    console.log('[publisher] No posts due for publishing');
    return data;
  }

  console.log(`[publisher] ${due.length} post(s) due for publishing`);

  for (const post of due) {
    console.log(`\n[publisher] Publishing: ${post.sourceDir} (${post.type})`);
    try {
      let result;
      if (post.type === 'carousel' && post.imageUrls.length >= 2) {
        result = await publishCarousel(post.imageUrls, post.caption);
      } else {
        result = await publishSingle(post.imageUrls[0], post.caption);
      }

      post.status = 'published';
      post.publishedAt = new Date().toISOString();
      post.mediaId = result.mediaId;
      post.permalink = result.permalink;

      // Move to published array
      data.published.push(post);
      data.queue = data.queue.filter(p => p.id !== post.id);

      console.log(`[publisher] Published successfully: ${result.permalink || result.mediaId}`);

    } catch (err) {
      post.status = 'failed';
      post.lastError = err.message;
      post.failedAt = new Date().toISOString();
      await appendErrorLog(`queue-process:${post.sourceDir}`, err);
      console.error(`[publisher] Failed: ${err.message}`);
    }
  }

  await saveQueue(data);
  return data;
}

// ─── ADD TO QUEUE ────────────────────────────────────────

export async function addToQueue(post) {
  const data = await loadQueue();
  if (!post.id) post.id = `pub-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  if (!post.status) post.status = 'pending';
  if (!post.scheduledFor) {
    const slots = getNextSlots(1);
    post.scheduledFor = slots[0]?.utc || new Date().toISOString();
  }
  data.queue.push(post);
  await saveQueue(data);
  return post;
}

// ─── QUEUE STATUS ────────────────────────────────────────

export async function getQueueStatus() {
  const data = await loadQueue();
  return {
    pending: data.queue.filter(p => p.status === 'pending').length,
    failed: data.queue.filter(p => p.status === 'failed').length,
    published: data.published.length,
    nextUp: data.queue.find(p => p.status === 'pending') || null,
  };
}
