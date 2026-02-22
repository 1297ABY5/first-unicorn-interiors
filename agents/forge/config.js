import { join } from 'node:path';

const ROOT = process.env.SOVEREIGN_DATA_DIR || join(import.meta.dirname, '..', '..');

// ─── API CONFIG ───────────────────────────────────────────
export const API = {
  fal: {
    key: () => process.env.FAL_API_KEY || null,
    endpoint: 'https://queue.fal.run/fal-ai/grok-2-aurora/image-to-image',
    statusBase: 'https://queue.fal.run/fal-ai/grok-2-aurora/requests',
    costPerImage: 0.022,
    pollIntervalMs: 2000,
    pollTimeoutMs: 60000,
  },
  openai: {
    key: () => process.env.OPENAI_API_KEY || null,
    endpoint: 'https://api.openai.com/v1/images/generations',
    costPerImage: 0.04,
    model: 'gpt-image-1',
    quality: 'medium',
    size: '1024x1024',
  },
};

// ─── BRAND IDENTITY ───────────────────────────────────────
export const BRAND = {
  name: 'Unicorn Renovations',
  tagline: 'Dubai\'s Premier Villa Renovation Specialists',
  phone: '+971 52 645 5121',
  whatsapp: 'https://wa.me/971526455121',
  website: 'unicornrenovations.com',
  colors: {
    primary: '#1a1a2e',    // navy
    secondary: '#c9a84c',  // gold
    accent: '#e8d5a3',     // light gold
    text: '#ffffff',
    textDark: '#1a1a2e',
    overlay: 'rgba(26, 26, 46, 0.85)',
  },
  fonts: {
    heading: 'Playfair Display',
    body: 'Inter',
    googleImport: '@import url("https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap");',
  },
  trustSignals: [
    '800+ Villas Completed',
    '100% In-House Team',
    '15+ Years UAE Experience',
    '98% Within Quote',
    '1-Year Warranty',
  ],
};

// ─── PATHS ────────────────────────────────────────────────
export const PATHS = {
  root: ROOT,
  vault: join(ROOT, 'vault'),
  originals: join(ROOT, 'vault', 'originals'),
  variations: join(ROOT, 'vault', 'variations'),
  branded: join(ROOT, 'vault', 'branded'),
  readyToPublish: join(ROOT, 'vault', 'ready-to-publish'),
  assets: join(ROOT, 'assets'),
  logs: join(import.meta.dirname, 'logs'),
  processed: join(import.meta.dirname, 'logs', 'processed.json'),
};

// ─── SYSTEM CONTEXT ───────────────────────────────────────
export const SYSTEM_CONTEXT = `You are a luxury interior design photographer and virtual stager for a Dubai villa renovation company. Your job is to take a reference photo and create a photorealistic variation that looks like a completely different professional photograph of the same space. Never reproduce the original — always reimagine it.

Key principles:
- Photorealistic quality — the result must look like a real photograph taken by a professional
- Maintain the same room layout and architecture but change everything else
- Different lighting, different furniture/decor styling, different colour palette
- Dubai luxury aesthetic — think premium materials, clean lines, warm tones
- The photo must look publishable on a luxury renovation company's Instagram`;

// ─── INTERIOR VARIATIONS ──────────────────────────────────
export const INTERIOR_VARIATIONS = [
  {
    id: 'warm-luxury',
    name: 'Warm Luxury',
    prompt: 'Reimagine this interior with warm golden-hour lighting streaming through large windows. Replace all furniture with high-end contemporary pieces in rich caramel leather, warm walnut wood, and brushed brass accents. Add soft ambient lighting from recessed fixtures and a statement chandelier. Thick cream wool rug on the floor. Fresh eucalyptus arrangement on the coffee table. The overall mood should feel like a luxury boutique hotel suite in the evening — intimate, sophisticated, and inviting. Photorealistic, shot on a Sony A7R IV with a 24mm lens.',
  },
  {
    id: 'cool-modern',
    name: 'Cool Modern',
    prompt: 'Reimagine this interior with cool, bright natural light from a north-facing window. Replace all furniture with minimalist Scandinavian-Japanese pieces — clean oak frames, light grey linen upholstery, matte black hardware. White marble surfaces with subtle grey veining. A single large abstract artwork in navy and silver on the main wall. Polished concrete or light stone flooring. The space should feel calm, spacious, and gallery-like. Photorealistic, shot on a Hasselblad X2D with a 45mm lens in bright daylight.',
  },
  {
    id: 'dramatic-editorial',
    name: 'Dramatic Editorial',
    prompt: 'Reimagine this interior as a moody editorial photograph. Single dramatic light source from one direction creating deep shadows and highlights. Replace furniture with dark, sculptural designer pieces — deep charcoal velvet, blackened steel, dark oak. One bold accent piece in deep emerald or burgundy. Dramatic contrast between light and shadow. The mood should feel like an Architectural Digest cover shoot — bold, intentional, and magazine-worthy. Photorealistic, shot on a Phase One IQ4 with controlled studio-style lighting.',
  },
  {
    id: 'bright-lifestyle',
    name: 'Bright Lifestyle',
    prompt: 'Reimagine this interior flooded with bright, airy morning light. Replace furniture with fresh coastal-luxury pieces — white linen sofas, rattan accents, light bleached wood, touches of soft sage green and ocean blue. Fresh flowers on every surface. Open sliding doors suggesting an outdoor terrace beyond. The space should feel like a luxury Dubai beach villa on a Saturday morning — relaxed, aspirational, and full of life. Photorealistic, natural light photography style with slight lens flare.',
  },
  {
    id: 'detail-enhanced',
    name: 'Detail Enhanced',
    prompt: 'Reimagine this interior as a tight detail shot from a different angle. Focus on the most impressive material or craftsmanship element — the stone countertop edge, the joinery detail, the tile pattern, the hardware finish. Shallow depth of field with creamy bokeh in the background. Warm side lighting that catches the texture and grain of materials. A small styled vignette — a coffee cup, a book, fresh herbs — adds life. Photorealistic macro-style interior photography, shot at f/2.8.',
  },
  {
    id: 'evening-ambience',
    name: 'Evening Ambience',
    prompt: 'Reimagine this interior at dusk with the city lights of Dubai visible through the windows. All artificial lighting activated — warm recessed downlights, under-cabinet LEDs in warm white, a statement floor lamp casting a golden pool of light. Replace furniture with plush, layered luxury pieces — deep cushions, cashmere throws, polished stone surfaces catching the light. Wine glasses and a book on the side table. The mood should feel like coming home to a beautifully renovated Dubai villa in the evening. Photorealistic, shot with long exposure to capture light trails.',
  },
];

// ─── EXTERIOR VARIATIONS ──────────────────────────────────
export const EXTERIOR_VARIATIONS = [
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    prompt: 'Reimagine this exterior during golden hour — the sun low on the horizon casting long warm shadows and bathing everything in rich amber light. Lush green landscaping with mature palms and flowering bougainvillea. The pool water reflecting golden sky. Outdoor furniture arranged for entertaining — teak loungers with white cushions, a dining table set for dinner. Warm path lighting just beginning to glow. Photorealistic, shot on a Canon R5 at golden hour with warm colour grading.',
  },
  {
    id: 'bright-morning',
    name: 'Bright Morning',
    prompt: 'Reimagine this exterior on a bright Dubai morning. Crystal blue sky, sharp shadows, vivid green landscaping freshly watered. The pool is perfectly still, reflecting the sky like glass. Clean contemporary outdoor furniture in white and teak. Fresh towels rolled on loungers. The architecture looks crisp and modern against the blue sky. Photorealistic, bright editorial style with high dynamic range — like a Robb Report real estate feature.',
  },
  {
    id: 'twilight-dramatic',
    name: 'Twilight Dramatic',
    prompt: 'Reimagine this exterior at blue hour — the sky a deep indigo-to-violet gradient, all exterior and pool lights activated creating dramatic illumination. The architecture glows from within, every window warm and inviting. Pool lit from beneath in cool blue-white. Landscape uplighting on palms and feature walls. The scene should feel cinematic and aspirational — like the hero shot of a luxury property listing. Photorealistic, long exposure twilight architecture photography.',
  },
  {
    id: 'lush-landscape',
    name: 'Lush Landscape',
    prompt: 'Reimagine this exterior with dramatically enhanced landscaping. Mature palm trees, dense tropical hedging, flowering plants in whites and purples, a manicured lawn that looks like velvet. A water feature or fountain adds movement. Stone pathways with integrated ground lighting. The garden should look like it was designed by a top landscape architect — layered, textured, and lush despite the Dubai climate. Photorealistic garden and landscape photography.',
  },
  {
    id: 'aerial-perspective',
    name: 'Aerial Perspective',
    prompt: 'Reimagine this property from a low drone angle — approximately 15 metres above, looking down at 45 degrees. Show the full plot including pool, garden, outdoor living areas, and the villa roofline. Neighbouring villas visible but slightly blurred. The property should stand out as the most impressive on the street — pristine landscaping, perfect pool, clean architecture. Photorealistic aerial real estate photography, shot on a DJI Mavic 3 Pro in bright daylight.',
  },
  {
    id: 'night-luxe',
    name: 'Night Luxe',
    prompt: 'Reimagine this exterior at night with luxury entertaining in mind. The pool is lit with colour-changing LEDs in warm amber. Outdoor kitchen/BBQ area glowing with pendant lights. Fire pit or fireplace feature as a focal point. Comfortable deep-seated outdoor sofas with throws. String lights or festoon lighting overhead. The scene should feel like a private Dubai villa hosting an intimate dinner party. Photorealistic night photography with warm, inviting tones.',
  },
];
