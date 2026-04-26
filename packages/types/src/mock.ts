import type {
  Badge,
  LeaderboardEntry,
  NearbyQuestFeed,
  ProfileSummary,
  Place,
  QuestCategory,
  QuestCandidate,
  QuestProgress,
  QuestReview,
  QuestWithRelations,
  SponsorBusiness,
  StateRecord,
  Title,
} from "./entities";
import { toStateRecords } from "./us-states";

const now = "2026-04-18T16:00:00.000Z";

export const demoStates: StateRecord[] = toStateRecords("demo-state");
const chicagoState = stateByCode("IL");

export const demoQuestCategories: QuestCategory[] = [
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    slug: "coffee",
    name: "Coffee Run",
    color_token: "amber",
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    slug: "landmark",
    name: "Landmark Hunt",
    color_token: "sky",
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
    slug: "food",
    name: "Flavor Mission",
    color_token: "rose",
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa4",
    slug: "art",
    name: "Art Trail",
    color_token: "violet",
  },
  {
    id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaa5",
    slug: "outdoors",
    name: "Fresh Air",
    color_token: "emerald",
  },
];

export const demoSponsors: SponsorBusiness[] = [
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb1",
    name: "North Star Roasters",
    description:
      "A design-forward neighborhood coffee bar supporting city explorers with sponsor-backed XP boosts.",
    website: "https://northstarroasters.example",
    logo_url:
      "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=800&q=80",
    email: "partners@northstarroasters.example",
    phone: "312-555-0142",
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbb2",
    name: "Skyline Arcade Hall",
    description:
      "Retro meets neon with weekly sponsor missions, collectible drops, and leaderboard tie-ins.",
    website: "https://skylinearcade.example",
    logo_url:
      "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
    email: "hello@skylinearcade.example",
    phone: "773-555-0193",
    is_active: true,
    created_at: now,
    updated_at: now,
  },
];

export const demoPlaces: Place[] = [
  {
    id: "aaaaaaa0-aaaa-aaaa-aaaa-aaaaaaaaaaa1",
    external_source: "internal_seed",
    external_id: "cloud-gate",
    name: "Cloud Gate",
    description: "An iconic public landmark that works well for sunrise or skyline quests.",
    place_type: "landmark",
    latitude: 41.882657,
    longitude: -87.623304,
    address: "201 E Randolph St",
    city: "Chicago",
    state_id: chicagoState.id,
    state_code: chicagoState.code,
    rating: 4.8,
    review_count: 18000,
    website: "https://www.choosechicago.com",
    phone: null,
    image_url:
      "https://images.unsplash.com/photo-1477414348463-c0eb7f1359b6?auto=format&fit=crop&w=900&q=80",
    price_level: null,
    is_publicly_visitable: true,
    is_active: true,
    source_metadata: { seed: true, placeType: "landmark" },
    created_at: now,
    updated_at: now,
  },
  {
    id: "aaaaaaa0-aaaa-aaaa-aaaa-aaaaaaaaaaa2",
    external_source: "internal_seed",
    external_id: "north-star-roasters",
    name: "North Star Roasters",
    description: "A neighborhood coffee stop with a design-forward interior and sponsor energy.",
    place_type: "cafe",
    latitude: 41.8894,
    longitude: -87.6276,
    address: "24 W Madison St",
    city: "Chicago",
    state_id: chicagoState.id,
    state_code: chicagoState.code,
    rating: 4.7,
    review_count: 920,
    website: "https://northstarroasters.example",
    phone: "312-555-0142",
    image_url:
      "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80",
    price_level: 2,
    is_publicly_visitable: true,
    is_active: true,
    source_metadata: { seed: true, sponsorBacked: true },
    created_at: now,
    updated_at: now,
  },
  {
    id: "aaaaaaa0-aaaa-aaaa-aaaa-aaaaaaaaaaa3",
    external_source: "internal_seed",
    external_id: "wabash-wall-art",
    name: "Wabash Wall Art",
    description: "A colorful mural stretch that rewards slow wandering and photo mode.",
    place_type: "mural",
    latitude: 41.8748,
    longitude: -87.6252,
    address: "Wabash Ave",
    city: "Chicago",
    state_id: chicagoState.id,
    state_code: chicagoState.code,
    rating: 4.6,
    review_count: 410,
    website: null,
    phone: null,
    image_url:
      "https://images.unsplash.com/photo-1529429617124-aee711a5ac1c?auto=format&fit=crop&w=900&q=80",
    price_level: null,
    is_publicly_visitable: true,
    is_active: true,
    source_metadata: { seed: true, placeType: "art" },
    created_at: now,
    updated_at: now,
  },
  {
    id: "aaaaaaa0-aaaa-aaaa-aaaa-aaaaaaaaaaa4",
    external_source: "internal_seed",
    external_id: "grant-park",
    name: "Grant Park",
    description: "A public green space that works for outdoor loops and easy discovery missions.",
    place_type: "park",
    latitude: 41.8758,
    longitude: -87.6195,
    address: "337 E Randolph St",
    city: "Chicago",
    state_id: chicagoState.id,
    state_code: chicagoState.code,
    rating: 4.9,
    review_count: 22000,
    website: "https://www.choosechicago.com",
    phone: null,
    image_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    price_level: null,
    is_publicly_visitable: true,
    is_active: true,
    source_metadata: { seed: true, placeType: "outdoors" },
    created_at: now,
    updated_at: now,
  },
  {
    id: "aaaaaaa0-aaaa-aaaa-aaaa-aaaaaaaaaaa5",
    external_source: "internal_seed",
    external_id: "chicago-theatre",
    name: "Chicago Theatre",
    description: "A marquee landmark that feels best as an evening route stop.",
    place_type: "theatre",
    latitude: 41.8855,
    longitude: -87.6272,
    address: "175 N State St",
    city: "Chicago",
    state_id: chicagoState.id,
    state_code: chicagoState.code,
    rating: 4.8,
    review_count: 15000,
    website: "https://www.chicago-theatre.com",
    phone: "312-462-6300",
    image_url:
      "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&w=900&q=80",
    price_level: 3,
    is_publicly_visitable: true,
    is_active: true,
    source_metadata: { seed: true, placeType: "landmark" },
    created_at: now,
    updated_at: now,
  },
  {
    id: "aaaaaaa0-aaaa-aaaa-aaaa-aaaaaaaaaaa6",
    external_source: "internal_seed",
    external_id: "navy-pier",
    name: "Navy Pier",
    description: "A big public attraction for long-form exploration and photo-heavy routes.",
    place_type: "attraction",
    latitude: 41.8917,
    longitude: -87.6078,
    address: "600 E Grand Ave",
    city: "Chicago",
    state_id: chicagoState.id,
    state_code: chicagoState.code,
    rating: 4.7,
    review_count: 30000,
    website: "https://navypier.org",
    phone: "312-595-7437",
    image_url:
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=80",
    price_level: 2,
    is_publicly_visitable: true,
    is_active: true,
    source_metadata: { seed: true, placeType: "entertainment" },
    created_at: now,
    updated_at: now,
  },
];

function placeByName(name: Place["name"]) {
  const place = demoPlaces.find((item) => item.name === name);

  if (!place) {
    throw new Error(`Missing place for name ${name}`);
  }

  return place;
}

export const demoQuestCandidates: QuestCandidate[] = [
  {
    id: "abababab-abab-abab-abab-ababababab01",
    place_id: placeByName("Cloud Gate").id,
    title: "Sunrise at the Bean",
    description:
      "Catch the early light at Cloud Gate, snap the skyline, and start your route with a landmark check-in.",
    suggested_category_id: categoryBySlug("landmark").id,
    suggested_rarity: "rare",
    suggested_xp_reward: 180,
    suggested_radius_meters: 120,
    discovery_type: "popular",
    sponsor_business_id: null,
    generation_method: "rules",
    generation_notes: {
      keywords: ["landmark", "skyline", "photo"],
      place_id: placeByName("Cloud Gate").id,
    },
    status: "approved",
    reviewed_by: null,
    reviewed_at: now,
    published_quest_id: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "abababab-abab-abab-abab-ababababab02",
    place_id: placeByName("North Star Roasters").id,
    title: "North Star Signature Sip",
    description:
      "Claim the sponsor quest, walk into North Star Roasters, and complete a featured drink mission for bonus XP.",
    suggested_category_id: categoryBySlug("coffee").id,
    suggested_rarity: "epic",
    suggested_xp_reward: 240,
    suggested_radius_meters: 90,
    discovery_type: "featured_route",
    sponsor_business_id: demoSponsors[0]!.id,
    generation_method: "rules",
    generation_notes: {
      keywords: ["coffee", "sponsor", "indoor"],
      place_id: placeByName("North Star Roasters").id,
    },
    status: "draft",
    reviewed_by: null,
    reviewed_at: null,
    published_quest_id: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "abababab-abab-abab-abab-ababababab03",
    place_id: placeByName("Grant Park").id,
    title: "Grant Park Loop",
    description:
      "Hit the park loop, check in near Buckingham Fountain, and bank a clean outdoor XP burst.",
    suggested_category_id: categoryBySlug("outdoors").id,
    suggested_rarity: "common",
    suggested_xp_reward: 110,
    suggested_radius_meters: 150,
    discovery_type: "popular",
    sponsor_business_id: null,
    generation_method: "rules",
    generation_notes: {
      keywords: ["park", "outdoors", "public"],
      place_id: placeByName("Grant Park").id,
    },
    status: "rejected",
    reviewed_by: null,
    reviewed_at: now,
    published_quest_id: null,
    created_at: now,
    updated_at: now,
  },
  {
    id: "abababab-abab-abab-abab-ababababab04",
    place_id: placeByName("Chicago Theatre").id,
    title: "Marquee After Dark",
    description:
      "Check in under the marquee, finish the mission, and log why this stop deserves a return visit.",
    suggested_category_id: categoryBySlug("art").id,
    suggested_rarity: "legendary",
    suggested_xp_reward: 320,
    suggested_radius_meters: 110,
    discovery_type: "featured_route",
    sponsor_business_id: null,
    generation_method: "rules",
    generation_notes: {
      keywords: ["theatre", "landmark", "night"],
      place_id: placeByName("Chicago Theatre").id,
    },
    status: "published",
    reviewed_by: null,
    reviewed_at: now,
    published_quest_id: "cccccccc-cccc-cccc-cccc-ccccccccccc9",
    created_at: now,
    updated_at: now,
  },
];

function categoryBySlug(slug: QuestCategory["slug"]) {
  const category = demoQuestCategories.find((item) => item.slug === slug);

  if (!category) {
    throw new Error(`Missing category for slug ${slug}`);
  }

  return category;
}

function stateByCode(code: StateRecord["code"]) {
  const state = demoStates.find((item) => item.code === code);

  if (!state) {
    throw new Error(`Missing state for code ${code}`);
  }

  return state;
}

function sponsorById(id: SponsorBusiness["id"]) {
  return demoSponsors.find((item) => item.id === id) ?? null;
}

function titleByName(name: Title["name"]) {
  const title = demoTitles.find((item) => item.name === name);

  if (!title) {
    throw new Error(`Missing title for name ${name}`);
  }

  return title;
}

export const demoQuests: QuestWithRelations[] = [
  {
    id: "cccccccc-cccc-cccc-cccc-ccccccccccc1",
    title: "Sunrise at the Bean",
    description:
      "Catch the early light at Cloud Gate, snap the skyline, and start your route with a landmark check-in.",
    category_id: categoryBySlug("landmark").id,
    category: categoryBySlug("landmark"),
    rarity: "rare",
    state_id: chicagoState.id,
    state: chicagoState,
    latitude: 41.882657,
    longitude: -87.623304,
    radius_meters: 120,
    xp_reward: 180,
    image_url:
      "https://images.unsplash.com/photo-1477414348463-c0eb7f1359b6?auto=format&fit=crop&w=900&q=80",
    is_active: true,
    is_sponsored: false,
    sponsor_business_id: null,
    sponsor_business: null,
    discovery_type: "popular",
    is_featured: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "cccccccc-cccc-cccc-cccc-ccccccccccc2",
    title: "North Star Signature Sip",
    description:
      "Claim the sponsor quest, walk into North Star Roasters, and complete a featured drink mission for bonus XP.",
    category_id: categoryBySlug("coffee").id,
    category: categoryBySlug("coffee"),
    rarity: "epic",
    state_id: chicagoState.id,
    state: chicagoState,
    latitude: 41.8894,
    longitude: -87.6276,
    radius_meters: 90,
    xp_reward: 240,
    image_url:
      "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=900&q=80",
    is_active: true,
    is_sponsored: true,
    sponsor_business_id: demoSponsors[0]!.id,
    sponsor_business: sponsorById(demoSponsors[0]!.id),
    discovery_type: "featured_route",
    is_featured: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "cccccccc-cccc-cccc-cccc-ccccccccccc3",
    title: "Riverwalk Flavor Loop",
    description:
      "Follow the Chicago Riverwalk, check in near the food hall, and log your favorite bite from the route.",
    category_id: categoryBySlug("food").id,
    category: categoryBySlug("food"),
    rarity: "common",
    state_id: chicagoState.id,
    state: chicagoState,
    latitude: 41.8881,
    longitude: -87.6255,
    radius_meters: 140,
    xp_reward: 120,
    image_url:
      "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80",
    is_active: true,
    is_sponsored: false,
    sponsor_business_id: null,
    sponsor_business: null,
    discovery_type: "popular",
    is_featured: false,
    created_at: now,
    updated_at: now,
  },
  {
    id: "cccccccc-cccc-cccc-cccc-ccccccccccc4",
    title: "Murals of Wabash",
    description:
      "Explore the South Loop wall art stretch, check in by the mural district, and leave a quick field review.",
    category_id: categoryBySlug("art").id,
    category: categoryBySlug("art"),
    rarity: "rare",
    state_id: chicagoState.id,
    state: chicagoState,
    latitude: 41.8748,
    longitude: -87.6252,
    radius_meters: 130,
    xp_reward: 190,
    image_url:
      "https://images.unsplash.com/photo-1529429617124-aee711a5ac1c?auto=format&fit=crop&w=900&q=80",
    is_active: true,
    is_sponsored: false,
    sponsor_business_id: null,
    sponsor_business: null,
    discovery_type: "hidden_gem",
    is_featured: false,
    created_at: now,
    updated_at: now,
  },
  {
    id: "cccccccc-cccc-cccc-cccc-ccccccccccc5",
    title: "Grant Park Lap",
    description:
      "Hit the park loop, check in near Buckingham Fountain, and bank a clean outdoor XP burst.",
    category_id: categoryBySlug("outdoors").id,
    category: categoryBySlug("outdoors"),
    rarity: "common",
    state_id: chicagoState.id,
    state: chicagoState,
    latitude: 41.8758,
    longitude: -87.6195,
    radius_meters: 160,
    xp_reward: 110,
    image_url:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80",
    is_active: true,
    is_sponsored: false,
    sponsor_business_id: null,
    sponsor_business: null,
    discovery_type: "popular",
    is_featured: false,
    created_at: now,
    updated_at: now,
  },
  {
    id: "cccccccc-cccc-cccc-cccc-ccccccccccc6",
    title: "Skyline Arcade Combo Run",
    description:
      "A sponsor-backed evening mission with an arcade stop, score chase energy, and a collectible badge teaser.",
    category_id: categoryBySlug("landmark").id,
    category: categoryBySlug("landmark"),
    rarity: "legendary",
    state_id: chicagoState.id,
    state: chicagoState,
    latitude: 41.8924,
    longitude: -87.6341,
    radius_meters: 100,
    xp_reward: 320,
    image_url:
      "https://images.unsplash.com/photo-1511882150382-421056c89033?auto=format&fit=crop&w=900&q=80",
    is_active: true,
    is_sponsored: true,
    sponsor_business_id: demoSponsors[1]!.id,
    sponsor_business: sponsorById(demoSponsors[1]!.id),
    discovery_type: "featured_route",
    is_featured: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "cccccccc-cccc-cccc-cccc-ccccccccccc7",
    title: "Old Water Tower Snap",
    description:
      "Visit the historic tower, check in close enough for the radius gate, and add it to your discovery streak.",
    category_id: categoryBySlug("landmark").id,
    category: categoryBySlug("landmark"),
    rarity: "common",
    state_id: chicagoState.id,
    state: chicagoState,
    latitude: 41.8971,
    longitude: -87.6241,
    radius_meters: 110,
    xp_reward: 95,
    image_url:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
    is_active: true,
    is_sponsored: false,
    sponsor_business_id: null,
    sponsor_business: null,
    discovery_type: "popular",
    is_featured: false,
    created_at: now,
    updated_at: now,
  },
  {
    id: "cccccccc-cccc-cccc-cccc-ccccccccccc8",
    title: "Lincoln Park Chill Route",
    description:
      "Walk the edge of the park, earn steady XP, and complete an easy outdoor loop with a scenic review prompt.",
    category_id: categoryBySlug("outdoors").id,
    category: categoryBySlug("outdoors"),
    rarity: "rare",
    state_id: chicagoState.id,
    state: chicagoState,
    latitude: 41.9214,
    longitude: -87.6336,
    radius_meters: 180,
    xp_reward: 170,
    image_url:
      "https://images.unsplash.com/photo-1465156799763-2c087c332922?auto=format&fit=crop&w=900&q=80",
    is_active: true,
    is_sponsored: false,
    sponsor_business_id: null,
    sponsor_business: null,
    discovery_type: "hidden_gem",
    is_featured: false,
    created_at: now,
    updated_at: now,
  },
  {
    id: "cccccccc-cccc-cccc-cccc-ccccccccccc9",
    title: "Chicago Theatre Marquee",
    description:
      "Check in under the marquee, finish the mission, and log why this stop deserves a return visit.",
    category_id: categoryBySlug("art").id,
    category: categoryBySlug("art"),
    rarity: "epic",
    state_id: chicagoState.id,
    state: chicagoState,
    latitude: 41.8855,
    longitude: -87.6272,
    radius_meters: 105,
    xp_reward: 230,
    image_url:
      "https://images.unsplash.com/photo-1514924013411-cbf25faa35bb?auto=format&fit=crop&w=900&q=80",
    is_active: true,
    is_sponsored: false,
    sponsor_business_id: null,
    sponsor_business: null,
    discovery_type: "featured_route",
    is_featured: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "cccccccc-cccc-cccc-cccc-cccccccccc10",
    title: "Navy Pier Night Pulse",
    description:
      "Close out the route at the pier with a check-in challenge and a high-visibility city lights completion.",
    category_id: categoryBySlug("food").id,
    category: categoryBySlug("food"),
    rarity: "legendary",
    state_id: chicagoState.id,
    state: chicagoState,
    latitude: 41.8917,
    longitude: -87.6078,
    radius_meters: 130,
    xp_reward: 340,
    image_url:
      "https://images.unsplash.com/photo-1508057198894-247b23fe5ade?auto=format&fit=crop&w=900&q=80",
    is_active: true,
    is_sponsored: false,
    sponsor_business_id: null,
    sponsor_business: null,
    discovery_type: "featured_route",
    is_featured: true,
    created_at: now,
    updated_at: now,
  },
];

export const demoRewards = [
  {
    id: "dddddddd-dddd-dddd-dddd-ddddddddddd1",
    name: "Scout Sticker Pack",
    description: "A collectible sticker drop redeemable after your first 500 XP.",
    reward_type: "collectible",
    rule_json: { xpRequired: 500 },
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "dddddddd-dddd-dddd-dddd-ddddddddddd2",
    name: "Sponsor Drink Upgrade",
    description: "Redeemable partner perk for a featured sponsor quest completion streak.",
    reward_type: "perk",
    rule_json: { sponsoredQuestStreak: 3 },
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "dddddddd-dddd-dddd-dddd-ddddddddddd3",
    name: "Weekend XP Booster",
    description: "Temporary 1.25x XP multiplier for one exploration session.",
    reward_type: "experience_boost",
    rule_json: { durationHours: 6 },
    is_active: true,
    created_at: now,
    updated_at: now,
  },
] as const;

export const demoTitles: Title[] = [
  {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee1",
    name: "Block Runner",
    description: "Awarded for knocking out your first handful of local quests.",
    unlock_key: "quests_completed_5",
    metadata: { frame: "bronze" },
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee2",
    name: "Skyline Scout",
    description: "A polished city title for explorers who complete landmark missions.",
    unlock_key: "landmark_quests_10",
    metadata: { frame: "silver" },
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeee3",
    name: "Sponsor Circuit",
    description: "Granted after consistent sponsor-backed quest completions.",
    unlock_key: "sponsored_quests_5",
    metadata: { frame: "neon" },
    is_active: true,
    created_at: now,
    updated_at: now,
  },
];

export const demoBadges: Badge[] = [
  {
    id: "ffffffff-ffff-ffff-ffff-fffffffffff1",
    name: "First Check-In",
    description: "Earned by completing your first successful on-site check-in.",
    icon_key: "pin-spark",
    criteria_key: "first_checkin",
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "ffffffff-ffff-ffff-ffff-fffffffffff2",
    name: "Loop Legend",
    description: "Earned after finishing three outdoor loops in one week.",
    icon_key: "trail-ring",
    criteria_key: "outdoors_three_week",
    is_active: true,
    created_at: now,
    updated_at: now,
  },
  {
    id: "ffffffff-ffff-ffff-ffff-fffffffffff3",
    name: "Review Ranger",
    description: "Awarded for leaving thoughtful quest reviews after completion.",
    icon_key: "review-star",
    criteria_key: "reviews_5",
    is_active: true,
    created_at: now,
    updated_at: now,
  },
];

export const demoQuestProgress: Record<string, QuestProgress> = {
  "cccccccc-cccc-cccc-cccc-ccccccccccc2": {
    quest_id: "cccccccc-cccc-cccc-cccc-ccccccccccc2",
    status: "accepted",
    accepted_id: "99999999-9999-9999-9999-999999999991",
    accepted_at: "2026-04-18T13:20:00.000Z",
    checkin_id: null,
    checked_in_at: null,
    completion_id: null,
    completed_at: null,
    review_id: null,
  },
};

export const demoProfileSummary: ProfileSummary = {
  profile: {
    id: "12345678-1234-1234-1234-123456789012",
    username: "citystride",
    display_name: "Morgan Lane",
    friend_code: "RV-CITYSTR",
    avatar_url: null,
    home_state_id: chicagoState.id,
    created_at: now,
    updated_at: now,
  },
  settings: {
    user_id: "12345678-1234-1234-1234-123456789012",
    preferred_radius_miles: 8,
    allow_location: true,
    allow_camera: true,
    notifications_enabled: true,
    category_preferences: [],
    rarity_preferences: [],
    sponsor_filter: "all",
    discovery_preferences: [],
    updated_at: now,
  },
  home_state: chicagoState,
  equipped_title: titleByName("Skyline Scout"),
  featured_badges: demoBadges.slice(0, 2),
  overall_stats: {
    user_id: "12345678-1234-1234-1234-123456789012",
    xp_total: 1340,
    quests_completed: 8,
    hidden_gems_completed: 2,
    reviews_count: 5,
  },
  state_stat: {
    id: "abababab-abab-abab-abab-abababababab",
    user_id: "12345678-1234-1234-1234-123456789012",
    state_id: chicagoState.id,
    xp_total: 1340,
    quests_completed: 8,
    hidden_gems_completed: 2,
    reviews_count: 5,
    updated_at: now,
  },
};

export const demoLeaderboard: LeaderboardEntry[] = [
  {
    rank: 1,
    user_id: "user-lead-1",
    state_id: chicagoState.id,
    state_code: chicagoState.code,
    state_name: chicagoState.name,
    username: "riley_chen",
    display_name: "Riley Chen",
    avatar_url: null,
    xp_total: 2780,
    quests_completed: 17,
    hidden_gems_completed: 4,
    reviews_count: 12,
    title_name: "Skyline Scout",
    is_self: false,
  },
  {
    rank: 2,
    user_id: "user-lead-2",
    state_id: chicagoState.id,
    state_code: chicagoState.code,
    state_name: chicagoState.name,
    username: "citystride",
    display_name: "Morgan Lane",
    avatar_url: null,
    xp_total: 2240,
    quests_completed: 15,
    hidden_gems_completed: 3,
    reviews_count: 10,
    title_name: "Block Runner",
    is_self: true,
  },
  {
    rank: 3,
    user_id: "user-lead-3",
    state_id: chicagoState.id,
    state_code: chicagoState.code,
    state_name: chicagoState.name,
    username: "tess_alvarez",
    display_name: "Tess Alvarez",
    avatar_url: null,
    xp_total: 1980,
    quests_completed: 13,
    hidden_gems_completed: 2,
    reviews_count: 7,
    title_name: null,
    is_self: false,
  },
];

export const demoQuestReviews: Record<string, QuestReview[]> = {
  "cccccccc-cccc-cccc-cccc-ccccccccccc1": [
    {
      review_id: "review-demo-1",
      user_id: "user-lead-1",
      username: "riley_chen",
      display_name: "Riley Chen",
      avatar_url: null,
      rating: 5,
      comment: "Perfect early route. The skyline reflection hits hard before the crowd shows up.",
      created_at: now,
      status: "visible",
      photo_paths: [],
      photo_urls: [],
    },
  ],
  "cccccccc-cccc-cccc-cccc-ccccccccccc4": [
    {
      review_id: "review-demo-2",
      user_id: "user-lead-3",
      username: "tess_alvarez",
      display_name: "Tess Alvarez",
      avatar_url: null,
      rating: 4,
      comment: "Great hidden mural stop. Worth giving yourself time to wander one block farther than the pin.",
      created_at: now,
      status: "visible",
      photo_paths: [],
      photo_urls: [],
    },
  ],
};

export function buildDemoQuestFeed(limit = 5): NearbyQuestFeed {
  const sponsored = demoQuests.filter((quest) => quest.is_sponsored).slice(0, 2);
  const nearby = demoQuests.filter((quest) => !quest.is_sponsored).slice(0, limit);

  return {
    sponsored,
    nearby,
  };
}
