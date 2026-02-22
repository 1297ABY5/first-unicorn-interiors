import 'dotenv/config';
import { join } from 'node:path';

const ROOT = '/root/unicorn-sovereign';

export const CONFIG = {
  // AI Vision provider — uses Anthropic Claude by default (key already in .env)
  // Set CURATOR_VISION_PROVIDER=openai + OPENAI_API_KEY to use GPT-4o instead
  vision: {
    provider: process.env.CURATOR_VISION_PROVIDER || (process.env.OPENAI_API_KEY ? 'openai' : 'anthropic'),
    openaiKey: process.env.OPENAI_API_KEY,
    anthropicKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CURATOR_VISION_MODEL || (process.env.OPENAI_API_KEY ? 'gpt-4o' : 'claude-sonnet-4-20250514'),
    maxTokens: 500,
  },

  paths: {
    root: ROOT,
    originals: join(ROOT, 'vault/originals'),
    curated: join(ROOT, 'vault/curated'),
    heroShots: join(ROOT, 'vault/curated/hero-shots'),
    skip: join(ROOT, 'vault/curated/skip'),
    needsReview: join(ROOT, 'vault/curated/needs-review'),
    forgeOriginals: join(ROOT, 'vault/originals'),
    readyToPublish: join(ROOT, 'vault/ready-to-publish'),
    logs: join(ROOT, 'logs'),
    curatorLog: join(ROOT, 'logs/curator.log'),
    analysisCache: join(ROOT, 'logs/curator-analysis.json'),
    manifest: join(ROOT, 'vault/curated/manifest.json'),
    websiteRepo: '/home/openclaw/sites/unicorn-renovations',
    deployScript: '/home/openclaw/deploy-site.sh',
  },

  categories: {
    rooms: ['kitchen', 'bathroom', 'living-room', 'bedroom', 'pool', 'exterior', 'full-villa', 'glass-aluminium', 'joinery', 'flooring', 'painting'],
    stages: ['before', 'during', 'after'],
    communities: ['palm-jumeirah', 'emirates-hills', 'arabian-ranches', 'dubai-hills', 'al-barari', 'jvc', 'al-barsha', 'mirdif', 'springs', 'meadows', 'jumeirah-golf-estates', 'tilal-al-ghaf'],
  },

  heroThreshold: 8,
  skipThreshold: 3,

  websitePages: {
    'kitchen': 'services/kitchen-renovation-dubai.html',
    'bathroom': 'services/bathroom-renovation-dubai.html',
    'pool': 'services/swimming-pool-renovation.html',
    'glass-aluminium': 'services/glass-aluminium-works.html',
    'joinery': 'services/joinery-cabinetry.html',
    'full-villa': 'services/villa-renovations.html',
    'palm-jumeirah': 'areas/villa-renovation-palm-jumeirah.html',
    'emirates-hills': 'areas/villa-renovation-emirates-hills.html',
    'arabian-ranches': 'areas/villa-renovation-arabian-ranches.html',
    'dubai-hills': 'areas/villa-renovation-dubai-hills.html',
    'al-barari': 'areas/villa-renovation-al-barari.html',
  },

  batchSize: 10,
  delayBetweenCalls: 1000,
};

export const VISION_PROMPT = `You are a photo analyst for a luxury villa renovation company in Dubai called Unicorn Renovations.

Analyse this photo and return ONLY valid JSON with these fields:

- room_type: one of [kitchen, bathroom, living-room, bedroom, pool, exterior, full-villa, glass-aluminium, joinery, flooring, painting, team, site-progress, other]
- stage: one of [before, during, after, not-applicable]
- community: if identifiable from any text/signage in the photo or filename context, one of [palm-jumeirah, emirates-hills, arabian-ranches, dubai-hills, al-barari, jvc, al-barsha, mirdif, springs, meadows, jumeirah-golf-estates, tilal-al-ghaf, unknown]
- quality_score: 1-10 (10 = professional photography, perfect lighting, great composition; 1 = blurry, dark, unusable)
- description: one sentence describing what you see
- is_before_after_pair: true if the image contains a side-by-side before/after comparison
- notable_features: array of 2-5 notable design/material features visible
- suggested_caption: a short Instagram-worthy caption for this photo (brand voice: confident, premium but accessible, warm)
- website_placement: array of where this photo should go on the website. Options: services/kitchen, services/bathroom, services/pool, services/glass, services/joinery, services/villa, areas/palm-jumeirah, areas/emirates-hills, areas/arabian-ranches, areas/dubai-hills, areas/al-barari, portfolio, homepage-gallery

Also consider the filename for context clues. If the filename contains community names or room types, factor that in.

Return ONLY the JSON object. No markdown, no explanation.`;
