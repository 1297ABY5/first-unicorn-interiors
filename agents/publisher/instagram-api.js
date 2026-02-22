import axios from 'axios';
import { INSTAGRAM } from './config.js';

function apiUrl(path) {
  return `${INSTAGRAM.baseUrl}/${INSTAGRAM.apiVersion}${path}`;
}

// ─── WAIT FOR CONTAINER ──────────────────────────────────
// Polls container status until FINISHED or ERROR (timeout 60s)

export async function waitForContainer(containerId) {
  const maxWait = 60_000;
  const interval = 3_000;
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const { data } = await axios.get(apiUrl(`/${containerId}`), {
      params: {
        fields: 'status_code',
        access_token: INSTAGRAM.accessToken,
      },
    });

    if (data.status_code === 'FINISHED') return data;
    if (data.status_code === 'ERROR') {
      throw new Error(`Container ${containerId} failed with ERROR status`);
    }

    console.log(`  [ig] Container ${containerId} status: ${data.status_code}, waiting...`);
    await new Promise(r => setTimeout(r, interval));
  }

  throw new Error(`Container ${containerId} timed out after ${maxWait / 1000}s`);
}

// ─── PUBLISH MEDIA CONTAINER ─────────────────────────────

export async function publishMediaContainer(creationId) {
  const { data } = await axios.post(apiUrl(`/${INSTAGRAM.accountId}/media_publish`), null, {
    params: {
      creation_id: creationId,
      access_token: INSTAGRAM.accessToken,
    },
  });
  return data; // { id: "media_id" }
}

// ─── GET PERMALINK ───────────────────────────────────────
// Non-fatal — returns null on error

export async function getPermalink(mediaId) {
  try {
    const { data } = await axios.get(apiUrl(`/${mediaId}`), {
      params: {
        fields: 'permalink',
        access_token: INSTAGRAM.accessToken,
      },
    });
    return data.permalink || null;
  } catch {
    return null;
  }
}
