import axios from 'axios';
import { INSTAGRAM } from './config.js';
import { waitForContainer, publishMediaContainer, getPermalink } from './instagram-api.js';
import { appendLog, appendErrorLog } from './logger.js';

function apiUrl(path) {
  return `${INSTAGRAM.baseUrl}/${INSTAGRAM.apiVersion}${path}`;
}

// ─── PUBLISH SINGLE IMAGE ────────────────────────────────

export async function publishSingle(imageUrl, caption) {
  console.log(`[publisher] Publishing single image...`);
  console.log(`  [ig] Image URL: ${imageUrl}`);

  try {
    // 1. Create media container
    const { data: container } = await axios.post(apiUrl(`/${INSTAGRAM.accountId}/media`), null, {
      params: {
        image_url: imageUrl,
        caption,
        access_token: INSTAGRAM.accessToken,
      },
    });
    console.log(`  [ig] Container created: ${container.id}`);

    // 2. Wait for processing
    await waitForContainer(container.id);
    console.log(`  [ig] Container ready`);

    // 3. Publish
    const published = await publishMediaContainer(container.id);
    console.log(`  [ig] Published! Media ID: ${published.id}`);

    // 4. Get permalink
    const permalink = await getPermalink(published.id);
    if (permalink) console.log(`  [ig] Permalink: ${permalink}`);

    const result = {
      type: 'single',
      containerId: container.id,
      mediaId: published.id,
      permalink,
      imageUrl,
      caption: caption?.slice(0, 100),
    };

    await appendLog(result);
    return result;

  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    await appendErrorLog('publish-single', new Error(msg));
    throw new Error(`Single publish failed: ${msg}`);
  }
}
