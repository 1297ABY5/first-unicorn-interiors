import https from 'node:https';
import http from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { API, SYSTEM_CONTEXT } from '../config.js';

/**
 * Make an HTTPS request and return the response body as a string.
 */
function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const req = proto.request(url, options, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return request(res.headers.location, options, body).then(resolve).catch(reject);
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const contentType = res.headers['content-type'] || '';
        if (contentType.includes('image') || contentType.includes('octet-stream')) {
          resolve({ status: res.statusCode, buffer, isImage: true });
        } else {
          resolve({ status: res.statusCode, body: buffer.toString('utf-8'), isImage: false });
        }
      });
    });
    req.on('error', reject);
    req.setTimeout(90000, () => { req.destroy(); reject(new Error('Request timeout')); });
    if (body) req.write(body);
    req.end();
  });
}

/**
 * Download an image from a URL and save to disk.
 */
export async function downloadImage(url, outputPath) {
  await mkdir(dirname(outputPath), { recursive: true });

  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const fetch = (targetUrl) => {
      proto.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetch(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`Download failed: HTTP ${res.statusCode}`));
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', async () => {
          await writeFile(outputPath, Buffer.concat(chunks));
          resolve(outputPath);
        });
        res.on('error', reject);
      }).on('error', reject);
    };
    fetch(url);
  });
}

/**
 * Convert an image file to a base64 data URL.
 */
async function imageToBase64(filePath) {
  const buffer = await readFile(filePath);
  const ext = filePath.toLowerCase().split('.').pop();
  const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${buffer.toString('base64')}`;
}

/**
 * Generate a variation using fal.ai Grok Imagine (image-to-image).
 * Cost: ~$0.022 per image.
 */
export async function generateWithGrok(sourcePath, prompt, outputPath) {
  const apiKey = API.fal.key();
  if (!apiKey || apiKey.startsWith('placeholder')) {
    throw new Error('FAL_API_KEY not configured');
  }

  const imageDataUrl = await imageToBase64(sourcePath);
  const fullPrompt = `${SYSTEM_CONTEXT}\n\n${prompt}`;

  // Submit to queue
  const submitBody = JSON.stringify({
    image_url: imageDataUrl,
    prompt: fullPrompt,
    image_size: 'landscape_16_9',
    num_images: 1,
    output_format: 'jpeg',
  });

  const submitUrl = new URL(API.fal.endpoint);
  const submitRes = await request(API.fal.endpoint, {
    method: 'POST',
    hostname: submitUrl.hostname,
    path: submitUrl.pathname,
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(submitBody),
    },
  }, submitBody);

  if (submitRes.status !== 200) {
    const error = submitRes.body ? JSON.parse(submitRes.body) : {};
    throw new Error(`Grok submit failed (${submitRes.status}): ${error.detail || error.message || submitRes.body}`);
  }

  const submitData = JSON.parse(submitRes.body);

  // If we got images directly (synchronous response)
  if (submitData.images?.[0]?.url) {
    await downloadImage(submitData.images[0].url, outputPath);
    return { provider: 'grok', cost: API.fal.costPerImage, path: outputPath };
  }

  // Poll for result
  const requestId = submitData.request_id;
  if (!requestId) {
    throw new Error('Grok: no request_id in response');
  }

  const statusUrl = `${API.fal.statusBase}/${requestId}/status`;
  const resultUrl = `${API.fal.statusBase}/${requestId}`;
  const statusUrlObj = new URL(statusUrl);
  const resultUrlObj = new URL(resultUrl);
  const startTime = Date.now();

  while (Date.now() - startTime < API.fal.pollTimeoutMs) {
    await new Promise(r => setTimeout(r, API.fal.pollIntervalMs));

    const pollRes = await request(statusUrl, {
      method: 'GET',
      hostname: statusUrlObj.hostname,
      path: statusUrlObj.pathname,
      headers: { 'Authorization': `Key ${apiKey}` },
    });

    if (pollRes.status !== 200) continue;
    const status = JSON.parse(pollRes.body);

    if (status.status === 'COMPLETED') {
      // Fetch the result
      const resultRes = await request(resultUrl, {
        method: 'GET',
        hostname: resultUrlObj.hostname,
        path: resultUrlObj.pathname,
        headers: { 'Authorization': `Key ${apiKey}` },
      });

      const result = JSON.parse(resultRes.body);
      const imageUrl = result.images?.[0]?.url;
      if (!imageUrl) throw new Error('Grok: no image URL in result');

      await downloadImage(imageUrl, outputPath);
      return { provider: 'grok', cost: API.fal.costPerImage, path: outputPath };
    }

    if (status.status === 'FAILED') {
      throw new Error(`Grok generation failed: ${status.error || 'unknown error'}`);
    }

    // Still processing — continue polling
  }

  throw new Error('Grok: polling timeout exceeded');
}

/**
 * Generate a variation using OpenAI GPT Image API (fallback).
 * Cost: ~$0.04 per image at medium quality.
 */
export async function generateWithGPT(sourcePath, prompt, outputPath) {
  const apiKey = API.openai.key();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY not configured');
  }

  const imageDataUrl = await imageToBase64(sourcePath);
  const fullPrompt = `${SYSTEM_CONTEXT}\n\n${prompt}\n\nUse the attached reference image as the base room layout. Create a completely new photorealistic variation.`;

  const body = JSON.stringify({
    model: API.openai.model,
    prompt: fullPrompt,
    n: 1,
    size: API.openai.size,
    quality: API.openai.quality,
  });

  const url = new URL(API.openai.endpoint);
  const res = await request(API.openai.endpoint, {
    method: 'POST',
    hostname: url.hostname,
    path: url.pathname,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  }, body);

  if (res.status !== 200) {
    const error = res.body ? JSON.parse(res.body) : {};
    throw new Error(`GPT Image failed (${res.status}): ${error.error?.message || res.body?.slice(0, 200)}`);
  }

  const data = JSON.parse(res.body);
  const imageUrl = data.data?.[0]?.url;
  const b64 = data.data?.[0]?.b64_json;

  if (b64) {
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, Buffer.from(b64, 'base64'));
    return { provider: 'gpt', cost: API.openai.costPerImage, path: outputPath };
  }

  if (imageUrl) {
    await downloadImage(imageUrl, outputPath);
    return { provider: 'gpt', cost: API.openai.costPerImage, path: outputPath };
  }

  throw new Error('GPT Image: no image in response');
}

/**
 * Generate a variation — tries Grok first, falls back to GPT.
 */
export async function generateVariation(sourcePath, prompt, outputPath) {
  // Try Grok first
  try {
    if (API.fal.key() && !API.fal.key().startsWith('placeholder')) {
      return await generateWithGrok(sourcePath, prompt, outputPath);
    }
  } catch (err) {
    console.warn(`  [forge] Grok failed: ${err.message} — trying GPT fallback`);
  }

  // Fallback to GPT
  try {
    if (API.openai.key()) {
      return await generateWithGPT(sourcePath, prompt, outputPath);
    }
  } catch (err) {
    console.error(`  [forge] GPT fallback also failed: ${err.message}`);
  }

  throw new Error('All image generation APIs failed — check FAL_API_KEY and/or OPENAI_API_KEY');
}

/**
 * Test API connectivity without generating an image.
 */
export async function testConnections() {
  const results = { grok: false, gpt: false };

  // Test Grok
  const falKey = API.fal.key();
  if (falKey && !falKey.startsWith('placeholder')) {
    try {
      const url = new URL('https://queue.fal.run/fal-ai/grok-2-aurora');
      const res = await request('https://queue.fal.run/fal-ai/grok-2-aurora', {
        method: 'GET',
        hostname: url.hostname,
        path: url.pathname,
        headers: { 'Authorization': `Key ${falKey}` },
      });
      // Any response means we reached the API (even 405/422 = authenticated)
      results.grok = res.status < 500;
    } catch { /* connection failed */ }
  }

  // Test GPT
  const openaiKey = API.openai.key();
  if (openaiKey) {
    try {
      const url = new URL('https://api.openai.com/v1/models');
      const res = await request('https://api.openai.com/v1/models', {
        method: 'GET',
        hostname: url.hostname,
        path: url.pathname,
        headers: { 'Authorization': `Bearer ${openaiKey}` },
      });
      results.gpt = res.status === 200;
    } catch { /* connection failed */ }
  }

  return results;
}
