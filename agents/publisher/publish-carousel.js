import axios from 'axios';
import { INSTAGRAM } from './config.js';
import { waitForContainer, publishMediaContainer, getPermalink } from './instagram-api.js';
import { appendLog, appendErrorLog } from './logger.js';

function apiUrl(path) {
  return `${INSTAGRAM.baseUrl}/${INSTAGRAM.apiVersion}${path}`;
}

// ─── PUBLISH CAROUSEL ────────────────────────────────────

export async function publishCarousel(imageUrls, caption) {
  if (!Array.isArray(imageUrls) || imageUrls.length < 2 || imageUrls.length > 10) {
    throw new Error(`Carousel requires 2-10 images, got ${imageUrls?.length || 0}`);
  }

  console.log(`[publisher] Publishing carousel (${imageUrls.length} images)...`);

  try {
    // 1. Create child containers
    const childIds = [];
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      console.log(`  [ig] Creating child ${i + 1}/${imageUrls.length}: ${url}`);

      const { data: child } = await axios.post(apiUrl(`/${INSTAGRAM.accountId}/media`), null, {
        params: {
          image_url: url,
          is_carousel_item: true,
          access_token: INSTAGRAM.accessToken,
        },
      });
      childIds.push(child.id);
      console.log(`  [ig] Child ${i + 1} created: ${child.id}`);

      // 1s delay between children
      if (i < imageUrls.length - 1) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // 2. Wait for all children
    console.log(`  [ig] Waiting for ${childIds.length} children to process...`);
    for (const childId of childIds) {
      await waitForContainer(childId);
    }
    console.log(`  [ig] All children ready`);

    // 3. Create carousel container
    const { data: carousel } = await axios.post(apiUrl(`/${INSTAGRAM.accountId}/media`), null, {
      params: {
        media_type: 'CAROUSEL',
        children: childIds.join(','),
        caption,
        access_token: INSTAGRAM.accessToken,
      },
    });
    console.log(`  [ig] Carousel container: ${carousel.id}`);

    // 4. Wait for carousel
    await waitForContainer(carousel.id);
    console.log(`  [ig] Carousel ready`);

    // 5. Publish
    const published = await publishMediaContainer(carousel.id);
    console.log(`  [ig] Published! Media ID: ${published.id}`);

    // 6. Get permalink
    const permalink = await getPermalink(published.id);
    if (permalink) console.log(`  [ig] Permalink: ${permalink}`);

    const result = {
      type: 'carousel',
      childIds,
      containerId: carousel.id,
      mediaId: published.id,
      permalink,
      imageCount: imageUrls.length,
      caption: caption?.slice(0, 100),
    };

    await appendLog(result);
    return result;

  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    await appendErrorLog('publish-carousel', new Error(msg));
    throw new Error(`Carousel publish failed: ${msg}`);
  }
}
