import axios from 'axios';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { INSTAGRAM } from './config.js';
import { appendTokenLog } from './logger.js';

const ENV_PATH = join(import.meta.dirname, '..', '..', '.env');

// ─── REFRESH LONG-LIVED TOKEN ────────────────────────────
// Instagram long-lived tokens expire after 60 days.
// This exchanges the current token for a new one.

export async function refreshToken() {
  console.log('[publisher] Refreshing Instagram access token...');

  try {
    const { data } = await axios.get(
      `${INSTAGRAM.oauthUrl}/${INSTAGRAM.apiVersion}/oauth/access_token`,
      {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: INSTAGRAM.appId,
          client_secret: INSTAGRAM.appSecret,
          fb_exchange_token: INSTAGRAM.accessToken,
        },
      }
    );

    if (!data.access_token) {
      throw new Error('No access_token in response');
    }

    // Update .env file in place
    const envContent = await readFile(ENV_PATH, 'utf-8');
    const updated = envContent.replace(
      /INSTAGRAM_ACCESS_TOKEN=.*/,
      `INSTAGRAM_ACCESS_TOKEN=${data.access_token}`
    );
    await writeFile(ENV_PATH, updated, 'utf-8');

    // Update current process env
    process.env.INSTAGRAM_ACCESS_TOKEN = data.access_token;

    const expiresIn = data.expires_in ? `${Math.round(data.expires_in / 86400)} days` : 'unknown';
    console.log(`[publisher] Token refreshed successfully (expires in ${expiresIn})`);

    await appendTokenLog(true, `New token obtained, expires in ${expiresIn}`);
    return { success: true, expiresIn };

  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    console.error(`[publisher] Token refresh failed: ${msg}`);
    await appendTokenLog(false, msg);
    throw new Error(`Token refresh failed: ${msg}`);
  }
}
