import { readFile } from 'node:fs/promises';
import { basename, extname } from 'node:path';
import axios from 'axios';
import Anthropic from '@anthropic-ai/sdk';
import { CONFIG, VISION_PROMPT } from './config.js';
import { getAnalysis, appendAnalysis, appendLog } from './logger.js';

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp']);

function mimeType(filePath) {
  const ext = extname(filePath).toLowerCase();
  const map = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };
  return map[ext] || 'image/jpeg';
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

  // Read image as base64
  const buffer = await readFile(filePath);
  const base64 = buffer.toString('base64');
  const mime = mimeType(filePath);

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
      await appendLog(`ANALYSE_ERROR ${basename(filePath)} — ${err.message}`);
      results.push({ filePath, filename: basename(filePath), error: err.message, success: false });
    }

    // Rate limit delay
    if (i < filePaths.length - 1) {
      await new Promise(r => setTimeout(r, CONFIG.delayBetweenCalls));
    }
  }

  return results;
}

export function isImage(filename) {
  return IMAGE_EXTS.has(extname(filename).toLowerCase());
}
