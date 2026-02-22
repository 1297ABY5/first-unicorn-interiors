import { basename, dirname } from 'node:path';

// ─── KEYWORDS ─────────────────────────────────────────────
const INTERIOR_KEYWORDS = [
  'kitchen', 'bathroom', 'bedroom', 'living', 'dining', 'hallway', 'corridor',
  'vanity', 'shower', 'bathtub', 'cabinet', 'wardrobe', 'closet', 'pantry',
  'laundry', 'study', 'office', 'nursery', 'lounge', 'foyer', 'lobby',
  'stairs', 'staircase', 'ceiling', 'floor', 'wall', 'tile', 'marble',
  'countertop', 'island', 'splashback', 'backsplash', 'interior', 'indoor',
  'inside', 'room', 'suite', 'ensuite', 'master', 'guest', 'majlis',
];

const EXTERIOR_KEYWORDS = [
  'garden', 'pool', 'swimming', 'facade', 'entrance', 'driveway', 'gate',
  'balcony', 'terrace', 'patio', 'deck', 'landscape', 'landscaping',
  'outdoor', 'outside', 'exterior', 'roof', 'rooftop', 'courtyard',
  'pergola', 'gazebo', 'bbq', 'barbecue', 'fire-pit', 'firepit',
  'fountain', 'water-feature', 'lawn', 'yard', 'front', 'backyard',
  'carport', 'garage', 'pathway', 'walkway', 'aerial', 'drone',
];

// ─── ROOM TYPE MAPPINGS ───────────────────────────────────
const ROOM_TYPES = {
  // Interior
  kitchen:   ['kitchen', 'pantry', 'island', 'countertop', 'splashback', 'backsplash', 'cabinet'],
  bathroom:  ['bathroom', 'shower', 'bathtub', 'vanity', 'ensuite', 'tile'],
  bedroom:   ['bedroom', 'master', 'guest', 'nursery', 'wardrobe', 'closet'],
  living:    ['living', 'lounge', 'majlis', 'foyer', 'lobby', 'dining', 'study', 'office'],
  // Exterior
  pool:      ['pool', 'swimming'],
  garden:    ['garden', 'landscape', 'landscaping', 'lawn', 'yard', 'backyard', 'courtyard'],
  facade:    ['facade', 'entrance', 'driveway', 'gate', 'front', 'exterior', 'aerial', 'drone'],
};

// ─── ROOM-SPECIFIC PROMPT ENRICHMENTS ─────────────────────
const ROOM_ENRICHMENTS = {
  kitchen: 'This is a kitchen space. Include details like premium stone countertops, handle-less cabinetry, integrated appliances, pendant lighting over the island, and high-end fixtures. Dubai villas typically feature large open-plan kitchens.',
  bathroom: 'This is a bathroom. Include details like large-format porcelain or marble wall tiles, frameless glass shower enclosures, freestanding bathtubs, rain showerheads, backlit mirrors, and warm LED accent lighting. Focus on waterproofing quality and clean grout lines.',
  bedroom: 'This is a bedroom. Include details like upholstered headboards, layered bedding in premium fabrics, bedside pendant lights, custom fitted wardrobes with interior lighting, blackout curtains, and soft ambient lighting. Dubai bedrooms tend to be spacious with high ceilings.',
  living: 'This is a living or reception area. Include details like statement sofas, large-format artwork, custom joinery wall units, feature lighting, premium flooring (marble or engineered wood), and floor-to-ceiling windows. Dubai villas often have double-height living spaces.',
  pool: 'This is a swimming pool area. Include details like infinity edges, mosaic tiling, sun loungers with parasols, outdoor shower, pool lighting, and surrounding deck in natural stone or premium composite. Dubai pools need to look resort-quality.',
  garden: 'This is a garden or landscape area. Include details like mature palm trees, integrated irrigation, pathway lighting, feature plants, artificial grass or premium turf, and architectural planting beds. Dubai gardens need to look lush despite the climate.',
  facade: 'This is a villa exterior or facade. Include details like clean architectural lines, feature cladding, statement entrance doors, landscape lighting, driveway materials, boundary walls, and overall curb appeal. Dubai villa facades range from contemporary to Mediterranean.',
};

/**
 * Classify a photo as interior or exterior, and detect room type.
 * Uses filename, parent folder name, and optional metadata.
 */
export function classifyScene(filePath) {
  const name = basename(filePath).toLowerCase();
  const folder = basename(dirname(filePath)).toLowerCase();
  const searchText = `${name} ${folder}`;

  // Count keyword matches
  let interiorScore = 0;
  let exteriorScore = 0;
  let matchedInterior = [];
  let matchedExterior = [];

  for (const kw of INTERIOR_KEYWORDS) {
    if (searchText.includes(kw)) {
      interiorScore++;
      matchedInterior.push(kw);
    }
  }

  for (const kw of EXTERIOR_KEYWORDS) {
    if (searchText.includes(kw)) {
      exteriorScore++;
      matchedExterior.push(kw);
    }
  }

  // Default bias: interior (most renovation photos are interior)
  const sceneType = exteriorScore > interiorScore ? 'exterior' : 'interior';

  // Detect room type
  let roomType = sceneType === 'interior' ? 'living' : 'facade'; // defaults
  let bestScore = 0;

  for (const [room, keywords] of Object.entries(ROOM_TYPES)) {
    let score = 0;
    for (const kw of keywords) {
      if (searchText.includes(kw)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      roomType = room;
    }
  }

  return {
    sceneType,
    roomType,
    confidence: Math.max(interiorScore, exteriorScore) > 0 ? 'keyword-match' : 'default-bias',
    matchedKeywords: sceneType === 'exterior' ? matchedExterior : matchedInterior,
  };
}

/**
 * Enrich a variation prompt with room-specific details.
 */
export function enrichPrompt(basePrompt, classification) {
  const enrichment = ROOM_ENRICHMENTS[classification.roomType];
  if (!enrichment) return basePrompt;
  return `${basePrompt}\n\nRoom context: ${enrichment}`;
}
