import { basename, extname } from 'node:path';
import sharp from 'sharp';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { CONFIG, VISION_PROMPT } from './config.js';
import { getAnalysis, appendAnalysis, appendLog } from './logger.js';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.tiff', '.tif']);

function formatToMime(format) {
  const map = {
    jpeg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    gif: 'image/gif',
    tiff: 'image/tiff',
    heif: 'image/heif',
  };
  return map[format] || 'image/jpeg';
}

// ─── IMAGE PREPROCESSING ────────────────────────────────

const MAX_DIMENSION = 2048;
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const QUALITY_STEPS = [85, 70, 55, 40];

async function prepareImageForApi(filePath) {
  const meta = await sharp(filePath).metadata();
  const needsResize = (meta.width && meta.width > MAX_DIMENSION) ||
                      (meta.height && meta.height > MAX_DIMENSION);

  let pipeline = sharp(filePath);
  if (needsResize) {
    pipeline = pipeline.resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true });
  }

  // Convert to JPEG — handles HEIC, TIFF, etc. universally
  for (const q of QUALITY_STEPS) {
    const buffer = await pipeline.clone().jpeg({ quality: q, progressive: true }).toBuffer();
    if (buffer.length <= MAX_BYTES) {
      return { buffer, mime: 'image/jpeg' };
    }
  }

  // Last resort: lowest quality result (will still be under most limits)
  const buffer = await pipeline.jpeg({ quality: QUALITY_STEPS[QUALITY_STEPS.length - 1], progressive: true }).toBuffer();
  return { buffer, mime: 'image/jpeg' };
}

// ─── OPENAI VISION ───────────────────────────────────────

async function analyseWithOpenAI(base64, mime, filename) {
  const { data } = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model: CONFIG.vision.model,
      max_tokens: CONFIG.vision.maxTokens,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: `Filename: ${filename}\n\n${VISION_PROMPT}` },
            { type: 'image_url', image_url: { url: `data:${mime};base64,${base64}` } },
          ],
        },
      ],
    },
    {
      headers: {
        Authorization: `Bearer ${CONFIG.vision.openaiKey}`,
        'Content-Type': 'application/json',
      },
    }
  );

  return data.choices[0].message.content;
}

// ─── ANTHROPIC VISION ────────────────────────────────────

async function analyseWithAnthropic(base64, mime, filename) {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: CONFIG.vision.model,
    max_tokens: CONFIG.vision.maxTokens,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mime, data: base64 },
          },
          {
            type: 'text',
            text: `Filename: ${filename}\n\n${VISION_PROMPT}`,
          },
        ],
      },
    ],
  });

  return response.content[0].text;
}

// ─── PARSE RESPONSE ──────────────────────────────────────

function parseAnalysis(raw) {
  // Strip markdown code fences if present
  let cleaned = raw.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  return JSON.parse(cleaned);
}

// ─── ANALYSE SINGLE PHOTO ────────────────────────────────

export async function analysePhoto(filePath, { force = false } = {}) {
  const filename = basename(filePath);

  // Check cache first
  if (!force) {
    const cached = await getAnalysis(filename);
    if (cached) {
      console.log(`  [cache] ${filename} — already analysed`);
      return cached;
    }
  }

  // Preprocess image: resize, convert to JPEG, ensure under 4 MB
  const { buffer, mime } = await prepareImageForApi(filePath);
  const base64 = buffer.toString('base64');

  console.log(`  [vision] Analysing ${filename} via ${CONFIG.vision.provider}...`);

  let rawResponse;
  if (CONFIG.vision.provider === 'openai' && CONFIG.vision.openaiKey) {
    rawResponse = await analyseWithOpenAI(base64, mime, filename);
  } else if (CONFIG.vision.anthropicKey) {
    rawResponse = await analyseWithAnthropic(base64, mime, filename);
  } else {
    throw new Error('No vision API key available. Set OPENAI_API_KEY or ANTHROPIC_API_KEY in .env');
  }

  const analysis = parseAnalysis(rawResponse);

  // Cache it
  await appendAnalysis(filename, analysis);
  await appendLog(`ANALYSE ${filename} → ${analysis.room_type}/${analysis.stage} quality=${analysis.quality_score}`);

  return analysis;
}

// ─── BATCH ANALYSE ───────────────────────────────────────

export async function analyseBatch(filePaths, { force = false } = {}) {
  const results = [];

  for (let i = 0; i < filePaths.length; i++) {
    const filePath = filePaths[i];
    try {
      const analysis = await analysePhoto(filePath, { force });
      results.push({ filePath, filename: basename(filePath), analysis, success: true });
    } catch (err) {
      console.error(`  [vision] Failed: ${basename(filePath)} — ${err.message}`);
      try {
        await appendLog(`ANALYSE_ERROR ${basename(filePath)} — ${err.message}`);
      } catch (logErr) {
        console.error(`  [vision] Could not write log: ${logErr.message}`);
      }
      results.push({ filePath, filename: basename(filePath), error: err.message, success: false });
    }

    // Rate limit delay
    if (i < filePaths.length - 1) {
      await new Promise(r => setTimeout(r, CONFIG.delayBetweenCalls));
    }
  }

  const succeeded = results.filter(r => r.success).length;
  const failed = results.length - succeeded;
  console.log(`\n[curator] Batch complete: ${succeeded} succeeded, ${failed} failed out of ${results.length}`);

  return results;
}

export function isImage(filename) {
  return IMAGE_EXTS.has(extname(filename).toLowerCase());
}
