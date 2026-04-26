import type {
  AdminRole,
  Badge,
  Profile,
  Place,
  PlaceWithRelations,
  QuestCategory,
  QuestCandidateGenerationMethod,
  QuestCandidateStatus,
  QuestCandidateWithRelations,
  QuestDiscoveryType,
  QuestRarity,
  QuestWithRelations,
  ReviewModerationItem,
  ReviewStatus,
  Reward,
  RewardType,
  NearbyGenerationSkippedItem,
  SponsorBusiness,
  StateRecord,
  Title,
  UserDirectoryRow,
  UserStateStat,
  NearbyGenerationSkipReason,
  NearbyGenerationPreviewItem,
  NearbyGenerationSummary,
  NearbyQuestCandidatePreview,
  NearbyPlacesSearchInput,
  QuestCandidateGenerationNotes,
  QuestGenerationVibe,
} from "@rovexp/types";

import { getMockAdminStore } from "./mock-store";
import { derivePublicPlaceDescription, resolvePlaceStateReference } from "./place-content";
import { getSupabaseServerClient, isSupabaseConfigured } from "./supabase";

export interface DashboardSummary {
  activeQuests: number;
  badgeCount: number;
  candidateCount: number;
  flaggedReviews: number;
  liveSponsors: number;
  placeCount: number;
  rewardCount: number;
  reviewedCandidateCount: number;
  sponsoredQuestCount: number;
  titleCount: number;
  userCount: number;
}

export interface SponsorPayload {
  id?: string;
  name: string;
  description: string;
  website: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
}

export interface QuestPayload {
  id?: string;
  title: string;
  description: string;
  category_id: string;
  rarity: QuestRarity;
  state_id: string;
  place_id?: string | null;
  quest_candidate_id?: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  xp_reward: number;
  image_url: string | null;
  is_active: boolean;
  is_sponsored: boolean;
  sponsor_business_id: string | null;
  discovery_type: QuestDiscoveryType;
  is_featured: boolean;
}

export interface PlacePayload {
  id?: string;
  external_source: string | null;
  external_id: string | null;
  name: string;
  description: string | null;
  place_type: string;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  state_id: string | null;
  state_code: string | null;
  rating: number | null;
  review_count: number | null;
  website: string | null;
  phone: string | null;
  image_url: string | null;
  price_level: number | null;
  is_publicly_visitable: boolean;
  is_active: boolean;
  source_metadata: Record<string, unknown> | null;
}

export interface QuestCandidatePayload {
  id?: string;
  place_id: string;
  title: string;
  description: string;
  suggested_category_id: string | null;
  suggested_rarity: QuestRarity;
  suggested_xp_reward: number;
  suggested_radius_meters: number;
  discovery_type: QuestDiscoveryType;
  sponsor_business_id: string | null;
  generation_method: QuestCandidateGenerationMethod;
  generation_notes: QuestCandidateGenerationNotes | Record<string, unknown> | null;
  status: QuestCandidateStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_quest_id: string | null;
}

export interface RewardPayload {
  id?: string;
  name: string;
  description: string;
  reward_type: RewardType;
  rule_json: Record<string, unknown> | null;
  is_active: boolean;
}

export interface TitlePayload {
  id?: string;
  name: string;
  description: string;
  unlock_key: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
}

export interface BadgePayload {
  id?: string;
  name: string;
  description: string;
  icon_key: string;
  criteria_key: string | null;
  is_active: boolean;
}

export interface ReviewModerationPayload {
  moderated_by: string;
  moderation_reason: string | null;
  review_id: string;
  status: ReviewStatus;
}

export interface NearbyGenerationFilters {
  active_only: boolean;
  area_label: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  min_rating: number | null;
  min_review_count: number | null;
  place_types: string;
  public_only: boolean;
  radius_miles: number;
  state_id: string;
}

export interface NearbyGenerationRunResult extends NearbyGenerationSummary {
  created_candidates: QuestCandidateWithRelations[];
}

function nowIso() {
  return new Date().toISOString();
}

type DirectoryProfileRow = Profile & {
  home_state: StateRecord | null;
};

type PlaceSource = Place & {
  state?: StateRecord | null;
};

const publishedQuestSelect =
  "published_quest:quests!quest_candidates_published_quest_id_fkey(id, title)";

interface NearbyGenerationContext {
  categories: QuestCategory[];
  candidates: QuestCandidateWithRelations[];
  places: PlaceWithRelations[];
  quests: QuestWithRelations[];
  sponsors: SponsorBusiness[];
  states: StateRecord[];
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>> | null;
}

export const nearbyGenerationSkipLabels: Record<NearbyGenerationSkipReason, string> = {
  below_rating: "Below minimum rating",
  below_review_count: "Below minimum review count",
  city_mismatch: "Does not match city filter",
  existing_candidate: "Already has a quest candidate",
  existing_quest: "Already linked to a live quest",
  inactive: "Inactive place",
  missing_coordinates: "Missing coordinates",
  outside_radius: "Outside selected radius",
  private: "Not publicly visitable",
  type_mismatch: "Does not match place type filter",
  wrong_state: "Different state",
};

interface NearbySearchResolution {
  latitude: number;
  longitude: number;
  source: "coordinates" | "stored_area";
  matched_places: number;
}

function matchesNearbyBaseFilters(
  place: PlaceWithRelations,
  filters: {
    active_only: boolean;
    area_label: string | null;
    city: string | null;
    min_rating: number | null;
    min_review_count: number | null;
    place_types: string;
    public_only: boolean;
    state_id: string;
  },
  selectedState: StateRecord,
) {
  const placeStateId = place.state?.id ?? place.state_id ?? null;
  const placeStateCode = place.state?.code ?? place.state_code ?? null;

  if (!placeStateId && !placeStateCode) {
    return false;
  }

  if (
    (placeStateId && placeStateId !== selectedState.id) ||
    (placeStateCode && placeStateCode !== selectedState.code)
  ) {
    return false;
  }

  if (filters.active_only && !place.is_active) {
    return false;
  }

  if (filters.public_only && !place.is_publicly_visitable) {
    return false;
  }

  if (!matchesCityFilter(place, filters.city)) {
    return false;
  }

  if (filters.min_rating !== null) {
    const rating = place.rating ?? 0;

    if (rating < filters.min_rating) {
      return false;
    }
  }

  if (filters.min_review_count !== null) {
    const reviewCount = place.review_count ?? 0;

    if (reviewCount < filters.min_review_count) {
      return false;
    }
  }

  if (normalizeTokens(filters.place_types).length && !matchesPlaceTypeFilter(place, filters.place_types)) {
    return false;
  }

  return true;
}

function resolveNearbySearchCenter(
  filters: NearbyPlacesSearchInput,
  context: NearbyGenerationContext,
): NearbySearchResolution {
  const selectedState = context.states.find((state) => state.id === filters.state_id);

  if (!selectedState) {
    throw new Error("The selected state is not available.");
  }

  const hasCoordinates =
    Number.isFinite(filters.latitude ?? NaN) && Number.isFinite(filters.longitude ?? NaN);

  if (
    (filters.search_mode === "coordinates" || filters.search_mode === "combined") &&
    hasCoordinates
  ) {
    return {
      latitude: filters.latitude as number,
      longitude: filters.longitude as number,
      matched_places: context.places.length,
      source: "coordinates",
    };
  }

  const areaMatches = context.places.filter((place) =>
    matchesNearbyBaseFilters(
      place,
      {
        active_only: filters.active_only,
        area_label: filters.area_label ?? null,
        city: filters.city ?? null,
        min_rating: filters.min_rating ?? null,
        min_review_count: filters.min_review_count ?? null,
        place_types: filters.place_types ?? "",
        public_only: filters.public_only,
        state_id: filters.state_id,
      },
      selectedState,
    ),
  );

  const labeledMatches = areaMatches.filter((place) =>
    matchesAreaLabel(place, filters.area_label ?? null),
  );

  const scopedMatches = labeledMatches.filter(
    (place) =>
      Number.isFinite(place.latitude) &&
      Number.isFinite(place.longitude) &&
      !(place.latitude === 0 && place.longitude === 0),
  );

  if (!scopedMatches.length) {
    throw new Error(
      "No stored places matched that area. Add coordinates or widen the state/city filters.",
    );
  }

  const totals = scopedMatches.reduce(
    (accumulator, place) => {
      accumulator.latitude += place.latitude;
      accumulator.longitude += place.longitude;
      return accumulator;
    },
    {
      latitude: 0,
      longitude: 0,
    },
  );

  return {
    latitude: totals.latitude / scopedMatches.length,
    longitude: totals.longitude / scopedMatches.length,
    matched_places: scopedMatches.length,
    source: "stored_area",
  };
}

function normalizeTokens(value: string | null | undefined) {
  return (value ?? "")
    .split(/[\n,]/)
    .map((item) => normalize(item))
    .filter(Boolean);
}

function hashSeed(value: string) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
}

interface QuestGenerationTemplate {
  id: string;
  label: string;
  template: string;
}

function pickTemplate(templates: readonly QuestGenerationTemplate[], seed: string) {
  if (!templates.length) {
    throw new Error("At least one template is required.");
  }

  const selected = templates[hashSeed(seed) % templates.length];

  return selected ?? templates[0]!;
}

function renderTemplate(
  template: string,
  context: Record<string, string | number | null | undefined>,
) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const value = context[key];

    if (value === null || typeof value === "undefined") {
      return "";
    }

    return String(value);
  });
}

function formatLocationLabel(place: PlaceSource) {
  const city = place.city?.trim();
  const state = place.state?.code ?? place.state_code ?? "your area";

  if (city) {
    return `${city}, ${state}`;
  }

  return state;
}

function isTruthyToken(value: string | null | undefined, tokens: readonly string[]) {
  const normalized = normalize(value);

  return tokens.some((token) => normalized.includes(token));
}

function placeTextBlob(place: PlaceSource) {
  return [place.name, place.place_type, place.description ?? "", place.city ?? ""]
    .filter(Boolean)
    .join(" ");
}

const questTitleTemplates = {
  culture: [
    { id: "culture_step_into_local_history", label: "Step Into Local History", template: "Step Into Local History: {place}" },
    { id: "culture_art_stop", label: "Art Stop", template: "Art Stop at {place}" },
    { id: "culture_story_of_place", label: "Story of the Place", template: "Discover the Story of {place}" },
    { id: "culture_gallery_run", label: "Gallery Run", template: "Gallery Run: {place}" },
    { id: "culture_cultural_detour", label: "Cultural Detour", template: "Cultural Detour: {place}" },
  ],
  food: [
    { id: "food_local_favorite", label: "Local Favorite", template: "Local Favorite: {place}" },
    { id: "food_taste_stop", label: "Taste Stop", template: "Taste Stop at {place}" },
    { id: "food_coffee_break", label: "Coffee Break", template: "Coffee Break at {place}" },
    { id: "food_bite_sized", label: "Bite-Sized Quest", template: "Bite-Sized Quest: {place}" },
    { id: "food_quick_stop", label: "Quick Stop", template: "Quick Stop at {place}" },
  ],
  general: [
    { id: "general_local_stop", label: "Local Stop", template: "Local Stop: {place}" },
    { id: "general_explore_place", label: "Explore This Place", template: "Explore {place}" },
    { id: "general_city_detour", label: "City Detour", template: "City Detour: {place}" },
    { id: "general_neighborhood_find", label: "Neighborhood Find", template: "Neighborhood Find: {place}" },
    { id: "general_route_break", label: "Route Break", template: "Route Break at {place}" },
  ],
  landmark: [
    { id: "landmark_capture_the_scene", label: "Capture the Scene", template: "Capture the Scene: {place}" },
    { id: "landmark_iconic_stop", label: "Iconic Stop", template: "Iconic Stop at {place}" },
    { id: "landmark_photo_stop", label: "Photo Stop", template: "Photo Stop: {place}" },
    { id: "landmark_discover_landmark", label: "Discover the Landmark", template: "Discover {place}" },
    { id: "landmark_scene_break", label: "Scene Break", template: "Scene Break at {place}" },
  ],
  nature: [
    { id: "nature_fresh_air", label: "Fresh Air", template: "Fresh Air at {place}" },
    { id: "nature_sunset_run", label: "Sunset Run", template: "Sunset Run at {place}" },
    { id: "nature_outdoor_stop", label: "Outdoor Stop", template: "Outdoor Stop: {place}" },
    { id: "nature_trail_break", label: "Trail Break", template: "Trail Break at {place}" },
    { id: "nature_scenic_detour", label: "Scenic Detour", template: "Scenic Detour: {place}" },
  ],
  urban: [
    { id: "urban_city_loop", label: "City Loop", template: "City Loop: {place}" },
    { id: "urban_downtown_detour", label: "Downtown Detour", template: "Downtown Detour: {place}" },
    { id: "urban_neighborhood_find", label: "Neighborhood Find", template: "Neighborhood Find: {place}" },
    { id: "urban_urban_stop", label: "Urban Stop", template: "Urban Stop: {place}" },
    { id: "urban_local_route", label: "Local Route", template: "Local Route: {place}" },
  ],
  sponsor: [
    { id: "sponsor_spotlight", label: "Sponsored Spotlight", template: "{sponsor} Spotlight: {place}" },
    { id: "sponsor_featured_route", label: "Featured Route", template: "Featured Route: {place}" },
    { id: "sponsor_partner_pick", label: "Partner Pick", template: "Partner Pick: {place}" },
    { id: "sponsor_local_partner", label: "Local Partner", template: "Local Partner: {place}" },
    { id: "sponsor_brand_detour", label: "Brand Detour", template: "Brand Detour: {place}" },
  ],
} as const satisfies Record<QuestGenerationVibe | "sponsor", readonly QuestGenerationTemplate[]>;

const questDescriptionTemplates = {
  culture: [
    {
      id: "culture_story_driven",
      label: "Story-driven",
      template:
        "Step into {place} in {location}. Check in on site, complete the mission in person, and turn a local visit into {xp} XP.",
    },
    {
      id: "culture_local_context",
      label: "Local context",
      template:
        "{place} feels like a natural stop for a culture-forward route in {location}. Visit on site, finish the quest there, and keep your progress moving.",
    },
    {
      id: "culture_quiet_discovery",
      label: "Quiet discovery",
      template:
        "This quest is built around a slower, more intentional visit to {place}. Arrive in person, complete the check-in, and earn a clean win.",
    },
  ],
  food: [
    {
      id: "food_local_stop",
      label: "Local stop",
      template:
        "Add {place} to your next route through {location}. Stop by in person, complete the mission on site, and earn {xp} XP for the detour.",
    },
    {
      id: "food_quick_break",
      label: "Quick break",
      template:
        "This is a quick, easy quest at {place}. Check in while you are there, finish the mission on location, and keep your streak alive.",
    },
    {
      id: "food_bite_sized",
      label: "Bite-sized mission",
      template:
        "Make {place} your next bite-sized stop in {location}. Visit on site, complete the quest, and collect a straightforward XP reward.",
    },
  ],
  general: [
    {
      id: "general_local_stop",
      label: "Local stop",
      template:
        "Use {place} as a clean local stop in {location}. The mission is simple: arrive on site, check in, and complete the quest there.",
    },
    {
      id: "general_quick_route",
      label: "Route builder",
      template:
        "This quest adds a little structure to your route through {location}. Visit {place} in person, complete the mission, and turn the stop into progress.",
    },
    {
      id: "general_simple_visit",
      label: "Simple visit",
      template:
        "Head to {place}, check in on site, and finish the quest before you move on. It is an easy win for exploring {location}.",
    },
  ],
  landmark: [
    {
      id: "landmark_photo_ready",
      label: "Photo-ready",
      template:
        "Make time for {place} in {location}. This quest is built for an in-person visit, a clear check-in, and a reward that feels worth the stop.",
    },
    {
      id: "landmark_scene_focus",
      label: "Scene-focused",
      template:
        "Treat {place} like a highlight on your route through {location}. Arrive on site, complete the mission, and capture the moment while you are there.",
    },
    {
      id: "landmark_destination",
      label: "Destination stop",
      template:
        "{place} is the kind of stop that rewards a little extra attention. Check in on site, finish the quest, and enjoy the destination vibe.",
    },
  ],
  nature: [
    {
      id: "nature_scenic_route",
      label: "Scenic route",
      template:
        "Take the scenic route to {place} in {location}. Stay on site long enough to complete the quest and turn the detour into {xp} XP.",
    },
    {
      id: "nature_fresh_air",
      label: "Fresh air",
      template:
        "This quest leans into the outdoors-first feel of {place}. Visit in person, check in on site, and earn a calm, scenic win.",
    },
    {
      id: "nature_quiet_detour",
      label: "Quiet detour",
      template:
        "Add a little breathing room to your route with {place}. It is a good fit for a quieter visit, a clean check-in, and steady progress.",
    },
  ],
  urban: [
    {
      id: "urban_city_route",
      label: "City route",
      template:
        "Use {place} as a waypoint in your city loop through {location}. Stop by on site, complete the mission, and keep moving with purpose.",
    },
    {
      id: "urban_neighborhood_stop",
      label: "Neighborhood stop",
      template:
        "This is a good place to anchor a neighborhood run. Visit {place} in person, check in on site, and turn the detour into progress.",
    },
    {
      id: "urban_walkable_win",
      label: "Walkable win",
      template:
        "{place} fits a more walkable route through {location}. Arrive there, complete the quest, and keep the momentum going.",
    },
  ],
  sponsor: [
    {
      id: "sponsor_spotlight",
      label: "Sponsored spotlight",
      template:
        "This sponsored route highlights {sponsor} at {place} in {location}. Visit on site, complete the mission, and earn a premium XP reward.",
    },
    {
      id: "sponsor_partner_stop",
      label: "Partner stop",
      template:
        "{sponsor} is backing this stop at {place}. Check in on site, finish the mission there, and keep the sponsored path feeling premium.",
    },
    {
      id: "sponsor_featured_route",
      label: "Featured route",
      template:
        "Follow the featured route to {place} in {location}. It is a sponsored quest built around a real on-site visit and a clean reward.",
    },
  ],
} as const satisfies Record<QuestGenerationVibe | "sponsor", readonly QuestGenerationTemplate[]>;

interface QuestGenerationSignals {
  is_landmark_like: boolean;
  is_niche: boolean;
  is_popular: boolean;
  is_high_rating: boolean;
  is_high_review_count: boolean;
  has_photo_potential: boolean;
}

function classifyQuestGenerationVibe(place: PlaceSource, sponsor: SponsorBusiness | null) {
  const blob = normalize(placeTextBlob(place));

  if (isTruthyToken(blob, ["coffee", "cafe", "bakery", "brunch", "restaurant", "diner", "bistro", "brewery", "bar", "dessert", "tea", "juice"])) {
    return "food" as const;
  }

  if (isTruthyToken(blob, ["park", "trail", "garden", "beach", "river", "lake", "outdoor", "nature", "preserve", "scenic", "overlook", "viewpoint", "arboretum", "botanical"])) {
    return "nature" as const;
  }

  if (isTruthyToken(blob, ["museum", "gallery", "art", "mural", "theatre", "theater", "history", "historic", "heritage", "cultural", "library", "music", "concert"])) {
    return "culture" as const;
  }

  if (isTruthyToken(blob, ["landmark", "monument", "tower", "memorial", "attraction", "bridge", "icon", "plaza", "square", "downtown", "district", "view"])) {
    return "landmark" as const;
  }

  if (sponsor || isTruthyToken(blob, ["shopping", "market", "bookstore", "arcade", "venue", "nightlife", "entertainment", "cinema", "festival"])) {
    return "urban" as const;
  }

  return "general" as const;
}

function deriveQuestSignals(place: PlaceSource, vibe: QuestGenerationVibe): QuestGenerationSignals {
  const reviewCount = place.review_count ?? 0;
  const rating = place.rating ?? 0;
  const blob = normalize(placeTextBlob(place));
  const isLandmarkLike =
    vibe === "landmark" ||
    isTruthyToken(blob, ["landmark", "monument", "tower", "memorial", "attraction", "viewpoint", "overlook", "historic", "museum", "gallery", "mural"]);
  const isHighRating = rating >= 4.6;
  const isHighReviewCount = reviewCount >= 1000;
  const isNiche = reviewCount > 0 && reviewCount < 600 && rating >= 4.4;
  const isPopular = isHighReviewCount || rating >= 4.7 || (reviewCount >= 250 && rating >= 4.5);
  const hasPhotoPotential =
    Boolean(place.image_url) ||
    isLandmarkLike ||
    isTruthyToken(blob, ["mural", "scenic", "viewpoint", "overlook", "gallery", "museum", "beach"]);

  return {
    has_photo_potential: hasPhotoPotential,
    is_high_rating: isHighRating,
    is_high_review_count: isHighReviewCount,
    is_landmark_like: isLandmarkLike,
    is_niche: isNiche,
    is_popular: isPopular,
  };
}

function determineQuestDiscoveryType(
  place: PlaceSource,
  sponsor: SponsorBusiness | null,
  vibe: QuestGenerationVibe,
  signals: QuestGenerationSignals,
) {
  if (sponsor) {
    return {
      discovery_type: "featured_route" as const,
      reason: `Sponsored partner content for ${sponsor.name}.`,
    };
  }

  if (signals.is_niche || (vibe !== "food" && !signals.is_popular && signals.is_high_rating)) {
    return {
      discovery_type: "hidden_gem" as const,
      reason: "The place reads as a smaller, locally interesting stop with strong hidden-gem potential.",
    };
  }

  if (signals.is_landmark_like || signals.is_popular) {
    return {
      discovery_type: "popular" as const,
      reason: "The place has broad appeal or destination-level signals, so it fits a popular route.",
    };
  }

  const blob = normalize(placeTextBlob(place));

  if (isTruthyToken(blob, ["local", "indie", "neighborhood", "favorite", "hidden", "boutique"])) {
    return {
      discovery_type: "hidden_gem" as const,
      reason: "The name and category feel more local than mainstream, which makes it a better hidden gem fit.",
    };
  }

  return {
    discovery_type: "popular" as const,
    reason: "The default route is a broad-appeal public stop, so it stays in the popular lane.",
  };
}

function determineQuestRarity(
  place: PlaceSource,
  sponsor: SponsorBusiness | null,
  vibe: QuestGenerationVibe,
  discoveryType: QuestDiscoveryType,
  signals: QuestGenerationSignals,
) {
  const reviewCount = place.review_count ?? 0;
  const rating = place.rating ?? 0;
  let score = 0;

  if (sponsor) {
    score += 1;
  }

  if (signals.is_landmark_like) {
    score += 2;
  } else if (vibe === "nature" || vibe === "culture") {
    score += 1;
  }

  if (reviewCount >= 10000) {
    score += 3;
  } else if (reviewCount >= 2500) {
    score += 2;
  } else if (reviewCount >= 400) {
    score += 1;
  }

  if (rating >= 4.8) {
    score += 2;
  } else if (rating >= 4.6) {
    score += 1;
  }

  if (discoveryType === "hidden_gem") {
    score += 1;
  }

  if (reviewCount < 100 && rating >= 4.5 && vibe !== "food") {
    score += 1;
  }

  if (score >= 6) {
    return {
      rarity: "legendary" as const,
      reason: "Destination-level quality with very strong engagement and standout location signals.",
    };
  }

  if (score >= 4) {
    return {
      rarity: "epic" as const,
      reason: "Strong quality and engagement signals put this in a high-value exploration tier.",
    };
  }

  if (score >= 2) {
    return {
      rarity: "rare" as const,
      reason: "Solid quality plus a distinct local vibe make this a good premium quest candidate.",
    };
  }

  return {
    rarity: "common" as const,
    reason: "This is a lightweight local stop that works well as an accessible starter quest.",
  };
}

function determineQuestXpReward(
  rarity: QuestRarity,
  vibe: QuestGenerationVibe,
  sponsor: SponsorBusiness | null,
  signals: QuestGenerationSignals,
  place: PlaceSource,
) {
  const base = {
    common: 100,
    rare: 165,
    epic: 235,
    legendary: 325,
  }[rarity];
  const vibeBonus = {
    general: 0,
    food: 0,
    urban: 10,
    culture: 20,
    nature: 25,
    landmark: 35,
  }[vibe];
  const sponsorBonus = sponsor ? 20 : 0;
  const ratingBonus = (place.rating ?? 0) >= 4.7 ? 15 : (place.rating ?? 0) >= 4.5 ? 8 : 0;
  const reviewBonus =
    (place.review_count ?? 0) >= 5000
      ? 20
      : (place.review_count ?? 0) >= 1000
        ? 12
        : (place.review_count ?? 0) >= 250
          ? 6
          : 0;
  const hiddenGemBonus = signals.is_niche ? 10 : 0;
  const cappedXp = Math.min(
    base + vibeBonus + sponsorBonus + ratingBonus + reviewBonus + hiddenGemBonus,
    5000,
  );
  const reasonParts = [`Base ${base} for ${rarity}`];

  if (vibeBonus) {
    reasonParts.push(`${vibe} bonus +${vibeBonus}`);
  }

  if (sponsorBonus) {
    reasonParts.push(`sponsor bonus +${sponsorBonus}`);
  }

  if (ratingBonus) {
    reasonParts.push(`rating bonus +${ratingBonus}`);
  }

  if (reviewBonus) {
    reasonParts.push(`review footprint bonus +${reviewBonus}`);
  }

  if (hiddenGemBonus) {
    reasonParts.push(`hidden gem bonus +${hiddenGemBonus}`);
  }

  if (signals.has_photo_potential) {
    reasonParts.push("photo-friendly location");
  }

  return {
    xp: cappedXp,
    reason: reasonParts.join(" · "),
  };
}

function determineQuestRadiusMeters(vibe: QuestGenerationVibe, signals: QuestGenerationSignals) {
  if (vibe === "nature") {
    return 180;
  }

  if (vibe === "landmark") {
    return 140;
  }

  if (vibe === "culture" || vibe === "urban") {
    return 115;
  }

  if (signals.has_photo_potential) {
    return 120;
  }

  return 100;
}

function getQuestTitleContext(
  place: PlaceSource,
  sponsor: SponsorBusiness | null,
  xpReward: number,
) {
  return {
    category: place.place_type,
    city: place.city ?? "",
    location: formatLocationLabel(place),
    place: place.name,
    place_type: place.place_type,
    sponsor: sponsor?.name ?? "",
    state: place.state?.name ?? place.state_code ?? "",
    xp: xpReward,
  };
}

function buildNearbySummary(
  filters: NearbyGenerationFilters,
  selectedState: StateRecord,
  inspectedCount: number,
  matches: NearbyGenerationPreviewItem[],
  skippedReasons: Partial<Record<NearbyGenerationSkipReason, number>>,
  createdCount = 0,
): NearbyGenerationSummary {
  const skipped_breakdown = Object.entries(skippedReasons)
    .filter(([, count]) => Boolean(count))
    .map(([reason, count]) => ({
      count: count ?? 0,
      reason: reason as NearbyGenerationSkipReason,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    area_label: filters.area_label,
    city: filters.city,
    created_count: createdCount,
    inspected_count: inspectedCount,
    latitude: filters.latitude,
    longitude: filters.longitude,
    matched_count: matches.length,
    radius_miles: filters.radius_miles,
    skipped_breakdown,
    skipped_count:
      Object.values(skippedReasons).reduce((accumulator, count) => accumulator + (count ?? 0), 0),
    state_code: selectedState.code,
    state_name: selectedState.name,
  };
}

function haversineMiles(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const radiusMiles = 3958.8;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) * Math.sin(deltaLatitude / 2) +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) *
      Math.sin(deltaLongitude / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return radiusMiles * c;
}

function matchesCityFilter(place: PlaceWithRelations, city: string | null) {
  if (!city) {
    return true;
  }

  const normalized = normalize(city);
  const haystack = [place.city, place.name, place.address].filter(Boolean).join(" ");

  return normalize(haystack).includes(normalized);
}

function matchesAreaLabel(place: PlaceWithRelations, areaLabel: string | null) {
  if (!areaLabel) {
    return true;
  }

  const normalized = normalize(areaLabel);
  const haystack = [place.city, place.name, place.address, place.place_type]
    .filter(Boolean)
    .join(" ");

  return normalize(haystack).includes(normalized);
}

function matchesPlaceTypeFilter(place: PlaceWithRelations, placeTypes: string) {
  const tokens = normalizeTokens(placeTypes);

  if (!tokens.length) {
    return true;
  }

  const haystack = [place.place_type, place.name, place.description ?? ""]
    .filter(Boolean)
    .join(" ");

  return tokens.some((token) => normalize(haystack).includes(token));
}

function makeNearbyGenerationContext(
  supabase: Awaited<ReturnType<typeof getSupabaseServerClient>> | null,
  places: PlaceWithRelations[],
  candidates: QuestCandidateWithRelations[],
  categories: QuestCategory[],
  sponsors: SponsorBusiness[],
  quests: QuestWithRelations[],
  states: StateRecord[],
): NearbyGenerationContext {
  return {
    categories,
    candidates,
    places,
    quests,
    sponsors,
    states,
    supabase,
  };
}

function normalize(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? "";
}

function mapQuestRelations(
  quest: QuestPayload & { created_at: string; updated_at: string; id: string },
  categories: QuestCategory[],
  states: StateRecord[],
  sponsors: SponsorBusiness[],
): QuestWithRelations {
  const category = categories.find((item) => item.id === quest.category_id);
  const state = states.find((item) => item.id === quest.state_id);

  if (!category || !state) {
    throw new Error("Quest relationships are out of sync.");
  }

  return {
    ...quest,
    category,
    state,
    sponsor_business:
      sponsors.find((item) => item.id === quest.sponsor_business_id) ?? null,
  };
}

function mapPlaceRelations(
  place: PlacePayload & { id: string; created_at: string; updated_at: string },
  states: StateRecord[],
): PlaceWithRelations {
  const state =
    (place.state_id ? states.find((item) => item.id === place.state_id) : null) ??
    (place.state_code ? states.find((item) => item.code === place.state_code) : null) ??
    null;

  return {
    ...place,
    state,
  };
}

function mapQuestCandidateRelations(
  candidate: QuestCandidatePayload & { id: string; created_at: string; updated_at: string },
  places: PlaceWithRelations[],
  categories: QuestCategory[],
  sponsors: SponsorBusiness[],
  quests: QuestWithRelations[],
): QuestCandidateWithRelations {
  const place = places.find((item) => item.id === candidate.place_id);
  const publishedQuest = quests.find(
    (quest) => quest.id === candidate.published_quest_id,
  );

  if (!place) {
    throw new Error("Quest candidate relationships are out of sync.");
  }

  return {
    ...candidate,
    place,
    published_quest: publishedQuest
      ? {
          id: publishedQuest.id,
          title: publishedQuest.title,
        }
      : null,
    suggested_category:
      categories.find((item) => item.id === candidate.suggested_category_id) ??
      null,
    sponsor_business:
      sponsors.find((item) => item.id === candidate.sponsor_business_id) ?? null,
  };
}

function pickCategoryIdForPlace(placeType: string, categories: QuestCategory[]) {
  const normalized = normalize(placeType);
  const rules = [
    {
      category: ["coffee", "cafe", "bakery", "dessert", "brunch", "espresso", "tea"],
      slug: "coffee",
    },
    {
      category: ["restaurant", "food", "diner", "bar", "brewery", "bistro", "eatery", "grill", "kitchen"],
      slug: "food",
    },
    {
      category: [
        "museum",
        "gallery",
        "art",
        "mural",
        "theatre",
        "theater",
        "cinema",
        "music",
        "culture",
        "cultural",
        "history",
        "heritage",
        "library",
      ],
      slug: "art",
    },
    {
      category: ["park", "trail", "garden", "nature", "outdoors", "beach", "preserve", "arboretum", "botanical"],
      slug: "outdoors",
    },
    {
      category: [
        "landmark",
        "monument",
        "tower",
        "attraction",
        "entertainment",
        "arcade",
        "shopping",
        "district",
        "market",
        "bookstore",
        "viewpoint",
        "overlook",
        "plaza",
        "downtown",
      ],
      slug: "landmark",
    },
  ] as const;

  for (const rule of rules) {
    if (rule.category.some((token) => normalized.includes(token))) {
      const category = categories.find((item) => item.slug === rule.slug);

      if (category) {
        return category.id;
      }
    }
  }

  return categories[0]?.id ?? null;
}

function buildQuestCandidateDraft(
  place: PlaceSource,
  categories: QuestCategory[],
  sponsors: SponsorBusiness[],
): Omit<
  QuestCandidatePayload,
  "id" | "status" | "reviewed_by" | "reviewed_at" | "published_quest_id"
> & {
  generation_method: QuestCandidateGenerationMethod;
} {
  const sponsor = resolveSponsorForPlace(place, sponsors);
  const suggested_category_id = pickCategoryIdForPlace(placeTextBlob(place), categories);
  const category = categories.find((item) => item.id === suggested_category_id) ?? null;
  const categorySlug = category?.slug ?? null;
  const vibe = classifyQuestGenerationVibe(place, sponsor);
  const signals = deriveQuestSignals(place, vibe);
  const discovery = determineQuestDiscoveryType(place, sponsor, vibe, signals);
  const rarity = determineQuestRarity(place, sponsor, vibe, discovery.discovery_type, signals);
  const xpProfile = determineQuestXpReward(rarity.rarity, vibe, sponsor, signals, place);
  const suggested_xp_reward = xpProfile.xp;
  const suggested_radius_meters = determineQuestRadiusMeters(vibe, signals);
  const titleTemplate = pickTemplate(
    (sponsor ? questTitleTemplates.sponsor : questTitleTemplates[vibe]) as readonly QuestGenerationTemplate[],
    `${place.id}:title:${vibe}:${discovery.discovery_type}`,
  );
  const descriptionTemplate = pickTemplate(
    (sponsor ? questDescriptionTemplates.sponsor : questDescriptionTemplates[vibe]) as readonly QuestGenerationTemplate[],
    `${place.id}:description:${vibe}:${discovery.discovery_type}`,
  );
  const context = getQuestTitleContext(place, sponsor, suggested_xp_reward);
  const title = renderTemplate(titleTemplate.template, context);
  const description = renderTemplate(descriptionTemplate.template, context);
  const state = place.state ?? null;
  const generation_notes: QuestCandidateGenerationNotes = {
    version: 2,
    source_mode: "single_place",
    source: {
      city: place.city,
      external_id: place.external_id,
      external_source: place.external_source,
      image_url: place.image_url,
      place_id: place.id,
      place_name: place.name,
      place_type: place.place_type,
      price_level: place.price_level,
      rating: place.rating,
      review_count: place.review_count,
      sponsor_business_id: sponsor?.id ?? null,
      sponsor_name: sponsor?.name ?? null,
      state_code: state?.code ?? place.state_code ?? null,
      state_name: state?.name ?? null,
    },
    classification: {
      category_id: suggested_category_id,
      category_name: category?.name ?? null,
      category_slug: categorySlug,
      description_pattern: descriptionTemplate.label,
      discovery_reason: discovery.reason,
      discovery_type: discovery.discovery_type,
      title_pattern: titleTemplate.label,
      vibe,
    },
    scoring: {
      rarity_reason: rarity.reason,
      suggested_radius_meters,
      suggested_rarity: rarity.rarity,
      suggested_xp_reward,
      xp_reason: xpProfile.reason,
    },
  };

  return {
    discovery_type: discovery.discovery_type,
    generation_method: "rules",
    generation_notes,
    place_id: place.id,
    sponsor_business_id: sponsor?.id ?? null,
    suggested_category_id,
    suggested_radius_meters,
    suggested_rarity: rarity.rarity,
    suggested_xp_reward,
    title,
    description,
  };
}

function buildQuestCandidatePayloadFromPlace(
  place: PlaceSource,
  categories: QuestCategory[],
  sponsors: SponsorBusiness[],
  generationNotes: Record<string, unknown> = {},
): QuestCandidatePayload {
  const draft = buildQuestCandidateDraft(place, categories, sponsors);

  return {
    ...draft,
    generation_notes: {
      ...draft.generation_notes,
      ...generationNotes,
    },
    published_quest_id: null,
    reviewed_at: null,
    reviewed_by: null,
    status: "draft",
  };
}

function buildNearbyGenerationNotes(
  filters: NearbyGenerationFilters,
  selectedState: StateRecord,
) {
  return {
    batch: {
      area_label: filters.area_label,
      city: filters.city,
      latitude: filters.latitude,
      longitude: filters.longitude,
      place_types: normalizeTokens(filters.place_types),
      radius_miles: filters.radius_miles,
      state_code: selectedState.code,
      state_name: selectedState.name,
    },
    source_mode: "nearby_places_bulk",
  };
}

async function loadNearbyGenerationContext() {
  const supabase = await getServerClientOrNull();

  const [places, candidates, categories, sponsors, quests, states] =
    await Promise.all([
      listPlaces(),
      listQuestCandidates(),
      listQuestCategories(),
      listSponsors(),
      listQuests(),
      listStates(),
    ]);

  return makeNearbyGenerationContext(
    supabase,
    places,
    candidates,
    categories,
    sponsors,
    quests,
    states,
  );
}

function buildNearbyGenerationPlan(
  filters: NearbyGenerationFilters,
  context: NearbyGenerationContext,
): NearbyQuestCandidatePreview {
  const selectedState = context.states.find((state) => state.id === filters.state_id);

  if (!selectedState) {
    throw new Error("The selected state is not available.");
  }

  const candidateByPlaceId = new Map(
    context.candidates.map((candidate) => [candidate.place_id, candidate]),
  );
  const questByPlaceId = new Map(
    context.quests
      .filter((quest) => Boolean(quest.place_id))
      .map((quest) => [quest.place_id as string, quest]),
  );
  const matches: NearbyGenerationPreviewItem[] = [];
  const skipped_examples: NearbyGenerationSkippedItem[] = [];
  const skippedReasons: Partial<Record<NearbyGenerationSkipReason, number>> = {};
  const recordSkip = (
    reason: NearbyGenerationSkipReason,
    place: PlaceWithRelations,
    distanceMiles = 0,
  ) => {
    skippedReasons[reason] = (skippedReasons[reason] ?? 0) + 1;

    if (skipped_examples.length < 6) {
      skipped_examples.push({
        distance_miles: distanceMiles,
        place,
        reason,
      });
    }
  };
  const placeTypeTokens = normalizeTokens(filters.place_types);

  for (const place of context.places) {
    const placeStateId = place.state?.id ?? place.state_id ?? null;
    const placeStateCode = place.state?.code ?? place.state_code ?? null;

    if (!placeStateId && !placeStateCode) {
      recordSkip("wrong_state", place);
      continue;
    }

    if (
      (placeStateId && placeStateId !== selectedState.id) ||
      (placeStateCode && placeStateCode !== selectedState.code)
    ) {
      recordSkip("wrong_state", place);
      continue;
    }

    if (filters.active_only && !place.is_active) {
      recordSkip("inactive", place);
      continue;
    }

    if (filters.public_only && !place.is_publicly_visitable) {
      recordSkip("private", place);
      continue;
    }

    if (
      !Number.isFinite(place.latitude) ||
      !Number.isFinite(place.longitude) ||
      (place.latitude === 0 && place.longitude === 0)
    ) {
      recordSkip("missing_coordinates", place);
      continue;
    }

    if (!matchesCityFilter(place, filters.city)) {
      recordSkip("city_mismatch", place);
      continue;
    }

    if (filters.min_rating !== null) {
      const rating = place.rating ?? 0;

      if (rating < filters.min_rating) {
        recordSkip("below_rating", place);
        continue;
      }
    }

    if (filters.min_review_count !== null) {
      const reviewCount = place.review_count ?? 0;

      if (reviewCount < filters.min_review_count) {
        recordSkip("below_review_count", place);
        continue;
      }
    }

    if (placeTypeTokens.length && !matchesPlaceTypeFilter(place, filters.place_types)) {
      recordSkip("type_mismatch", place);
      continue;
    }

    const distanceMiles = haversineMiles(
      filters.latitude,
      filters.longitude,
      place.latitude,
      place.longitude,
    );

    if (distanceMiles > filters.radius_miles) {
      recordSkip("outside_radius", place, distanceMiles);
      continue;
    }

    if (candidateByPlaceId.has(place.id)) {
      recordSkip("existing_candidate", place, distanceMiles);
      continue;
    }

    if (questByPlaceId.has(place.id)) {
      recordSkip("existing_quest", place, distanceMiles);
      continue;
    }

    matches.push({
      distance_miles: distanceMiles,
      place,
    });
  }

  const summary = buildNearbySummary(
    filters,
    selectedState,
    context.places.length,
    matches,
    skippedReasons,
  );

  return {
    ...summary,
    matches,
    skipped_examples,
  };
}

async function generateQuestCandidateFromPlaceRecord(
  place: PlaceWithRelations,
  context: NearbyGenerationContext,
  generationNotes: Record<string, unknown> = {},
) {
  const existingCandidate = context.candidates.find(
    (candidate) => candidate.place_id === place.id,
  );

  if (existingCandidate) {
    return existingCandidate;
  }

  const existingQuest = context.quests.find((quest) => quest.place_id === place.id);

  if (existingQuest) {
    throw new Error("This place already has a live quest.");
  }

  if (!place.is_active || !place.is_publicly_visitable) {
    throw new Error("Only active public places can become quest candidates.");
  }

  if (
    !Number.isFinite(place.latitude) ||
    !Number.isFinite(place.longitude) ||
    (place.latitude === 0 && place.longitude === 0)
  ) {
    throw new Error("The place needs valid coordinates before a candidate can be generated.");
  }

  const payload = buildQuestCandidatePayloadFromPlace(
    place,
    context.categories,
    context.sponsors,
    generationNotes,
  );

  if (!context.supabase) {
    const store = getMockAdminStore();
    const timestamp = nowIso();
    const nextCandidate = mapQuestCandidateRelations(
      {
        ...payload,
        id: crypto.randomUUID(),
        created_at: timestamp,
        updated_at: timestamp,
      },
      store.places,
      store.categories,
      store.sponsors,
      store.quests,
    );

    store.questCandidates = [nextCandidate, ...store.questCandidates];
    context.candidates = [nextCandidate, ...context.candidates];

    return nextCandidate;
  }

  const { error } = await context.supabase.from("quest_candidates").insert(payload);

  if (error) {
    if (isDuplicateCandidateInsertError(error)) {
      const existingCandidate =
        context.candidates.find((candidate) => candidate.place_id === place.id) ??
        (await listQuestCandidates()).find((candidate) => candidate.place_id === place.id);

      if (existingCandidate) {
        context.candidates = [existingCandidate, ...context.candidates.filter((candidate) => candidate.id !== existingCandidate.id)];
        return existingCandidate;
      }
    }

    throw new Error(error.message);
  }

  const nextCandidate =
    (await listQuestCandidates()).find((candidate) => candidate.place_id === place.id) ??
    context.candidates.find((candidate) => candidate.place_id === place.id) ??
    null;

  if (!nextCandidate) {
    throw new Error("Quest candidate was created but could not be loaded.");
  }

  context.candidates = [nextCandidate, ...context.candidates];

  return nextCandidate;
}

function isDuplicateCandidateInsertError(error: unknown) {
  return (
    error instanceof Error &&
    /duplicate key value violates unique constraint|quest_candidates_place_idx/i.test(
      error.message,
    )
  );
}

export async function previewNearbyQuestCandidateGeneration(
  filters: NearbyGenerationFilters,
) {
  const context = await loadNearbyGenerationContext();

  return buildNearbyGenerationPlan(filters, context);
}

export async function previewNearbyQuestCandidateGenerationFromSearch(
  filters: NearbyPlacesSearchInput,
) {
  const context = await loadNearbyGenerationContext();
  const resolved = resolveNearbySearchCenter(filters, context);
  const searchFilters: NearbyGenerationFilters = {
    active_only: filters.active_only,
    area_label: filters.area_label ?? null,
    city: filters.city ?? null,
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    min_rating: filters.min_rating ?? null,
    min_review_count: filters.min_review_count ?? null,
    place_types: filters.place_types ?? "",
    public_only: filters.public_only,
    radius_miles: filters.radius_miles ?? 10,
    state_id: filters.state_id,
  };

  return buildNearbyGenerationPlan(searchFilters, context);
}

export async function generateNearbyQuestCandidates(filters: NearbyGenerationFilters) {
  const context = await loadNearbyGenerationContext();
  const preview = buildNearbyGenerationPlan(filters, context);
  const selectedState = context.states.find((state) => state.id === filters.state_id);

  if (!selectedState) {
    throw new Error("The selected state is not available.");
  }

  const created_candidates: QuestCandidateWithRelations[] = [];
  const skippedReasons: Partial<Record<NearbyGenerationSkipReason, number>> = Object.fromEntries(
    preview.skipped_breakdown.map((item) => [item.reason, item.count]),
  ) as Partial<Record<NearbyGenerationSkipReason, number>>;

  for (const match of preview.matches) {
    try {
      const candidate = await generateQuestCandidateFromPlaceRecord(
        match.place,
        context,
        buildNearbyGenerationNotes(filters, selectedState),
      );
      created_candidates.push(candidate);
    } catch (error) {
      if (isDuplicateCandidateInsertError(error)) {
        skippedReasons.existing_candidate =
          (skippedReasons.existing_candidate ?? 0) + 1;
        continue;
      }

      throw error;
    }
  }

  const summary = buildNearbySummary(
    filters,
    selectedState,
    context.places.length,
    preview.matches,
    {
      ...Object.fromEntries(
        preview.skipped_examples.length
          ? preview.skipped_examples.map((item) => [item.reason, 0])
          : [],
      ),
      ...skippedReasons,
    } as Partial<Record<NearbyGenerationSkipReason, number>>,
    created_candidates.length,
  );

  return {
    ...summary,
    created_candidates,
  };
}

export async function generateNearbyQuestCandidatesFromSearch(
  filters: NearbyPlacesSearchInput,
) {
  const context = await loadNearbyGenerationContext();
  const resolved = resolveNearbySearchCenter(filters, context);
  const searchFilters: NearbyGenerationFilters = {
    active_only: filters.active_only,
    area_label: filters.area_label ?? null,
    city: filters.city ?? null,
    latitude: resolved.latitude,
    longitude: resolved.longitude,
    min_rating: filters.min_rating ?? null,
    min_review_count: filters.min_review_count ?? null,
    place_types: filters.place_types ?? "",
    public_only: filters.public_only,
    radius_miles: filters.radius_miles ?? 10,
    state_id: filters.state_id,
  };

  const preview = buildNearbyGenerationPlan(searchFilters, context);
  const selectedIds = new Set(filters.selected_place_ids ?? []);
  const placesToGenerate =
    selectedIds.size > 0
      ? preview.matches.filter((match) => selectedIds.has(match.place.id))
      : preview.matches;
  const selectedState = context.states.find((state) => state.id === filters.state_id);

  if (!selectedState) {
    throw new Error("The selected state is not available.");
  }

  const created_candidates: QuestCandidateWithRelations[] = [];
  const skippedReasons: Partial<Record<NearbyGenerationSkipReason, number>> = Object.fromEntries(
    preview.skipped_breakdown.map((item) => [item.reason, item.count]),
  ) as Partial<Record<NearbyGenerationSkipReason, number>>;

  for (const match of placesToGenerate) {
    try {
      const candidate = await generateQuestCandidateFromPlaceRecord(
        match.place,
        context,
        buildNearbyGenerationNotes(searchFilters, selectedState),
      );
      created_candidates.push(candidate);
    } catch (error) {
      if (isDuplicateCandidateInsertError(error)) {
        skippedReasons.existing_candidate =
          (skippedReasons.existing_candidate ?? 0) + 1;
        continue;
      }

      throw error;
    }
  }

  const summary = buildNearbySummary(
    searchFilters,
    selectedState,
    context.places.length,
    preview.matches,
    skippedReasons,
    created_candidates.length,
  );

  return {
    ...summary,
    created_candidates,
  };
}

function resolveSponsorForPlace(place: PlaceSource, sponsors: SponsorBusiness[]) {
  const metadata = place.source_metadata;
  const sponsorId =
    metadata && typeof metadata === "object" && "sponsor_business_id" in metadata
      ? String(metadata.sponsor_business_id ?? "")
      : "";
  const sponsorName =
    metadata && typeof metadata === "object" && "sponsor_name" in metadata
      ? String(metadata.sponsor_name ?? "")
      : "";

  if (sponsorId) {
    const byId = sponsors.find((item) => item.id === sponsorId);

    if (byId) {
      return byId;
    }
  }

  if (sponsorName) {
    const byName = sponsors.find(
      (item) => normalize(item.name) === normalize(sponsorName),
    );

    if (byName) {
      return byName;
    }
  }

  return null;
}

function resolveStateForPlace(place: PlaceSource, states: StateRecord[]) {
  return (
    place.state ??
    (place.state_id ? states.find((item) => item.id === place.state_id) ?? null : null) ??
    (place.state_code ? states.find((item) => item.code === place.state_code) ?? null : null)
  );
}

function buildQuestFromCandidateDraft(
  candidate: QuestCandidatePayload,
  place: PlaceSource,
  categories: QuestCategory[],
  sponsors: SponsorBusiness[],
  states: StateRecord[],
): QuestPayload {
  const category = categories.find((item) => item.id === candidate.suggested_category_id);
  const sponsor =
    candidate.sponsor_business_id
      ? sponsors.find((item) => item.id === candidate.sponsor_business_id) ?? null
      : null;
  const state = resolveStateForPlace(place, states);

  if (!category) {
    throw new Error("Quest candidate is missing a matching quest category.");
  }

  if (!state) {
    throw new Error("Quest candidate is missing a valid state reference.");
  }

  return {
    title: candidate.title,
    description: candidate.description,
    category_id: category.id,
    rarity: candidate.suggested_rarity,
    state_id: state.id,
    place_id: place.id,
    quest_candidate_id: candidate.id ?? null,
    latitude: place.latitude,
    longitude: place.longitude,
    radius_meters: candidate.suggested_radius_meters,
    xp_reward: candidate.suggested_xp_reward,
    image_url: place.image_url,
    is_active: true,
    is_sponsored: Boolean(sponsor),
    sponsor_business_id: sponsor?.id ?? null,
    discovery_type: candidate.discovery_type,
    is_featured:
      candidate.discovery_type === "featured_route" || Boolean(candidate.sponsor_business_id),
  };
}

function sumUserTotals(rows: UserStateStat[], userId: string) {
  return rows
    .filter((row) => row.user_id === userId)
    .reduce(
      (accumulator, row) => ({
        hidden_gems_completed:
          accumulator.hidden_gems_completed + row.hidden_gems_completed,
        quests_completed: accumulator.quests_completed + row.quests_completed,
        reviews_count: accumulator.reviews_count + row.reviews_count,
        xp_total: accumulator.xp_total + row.xp_total,
      }),
      {
        hidden_gems_completed: 0,
        quests_completed: 0,
        reviews_count: 0,
        xp_total: 0,
      },
    );
}

async function getServerClientOrNull() {
  if (!isSupabaseConfigured) {
    return null;
  }

  return getSupabaseServerClient();
}

export async function listQuestCategories() {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return [...getMockAdminStore().categories];
  }

  const { data, error } = await supabase
    .from("quest_categories")
    .select("*")
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data as QuestCategory[];
}

export async function listStates() {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return [...getMockAdminStore().states];
  }

  const { data, error } = await supabase.from("states").select("*").order("code");

  if (error) {
    throw new Error(error.message);
  }

  return data as StateRecord[];
}

export async function listSponsors() {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return [...getMockAdminStore().sponsors].sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );
  }

  const { data, error } = await supabase
    .from("sponsor_businesses")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as SponsorBusiness[];
}

export async function listPlaces() {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return [...getMockAdminStore().places].sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );
  }

  const { data, error } = await supabase
    .from("places")
    .select("*, state:states(*)")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as PlaceWithRelations[];
}

export async function listQuests() {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return [...getMockAdminStore().quests].sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );
  }

  const { data, error } = await supabase
    .from("quests")
    .select(
      "*, category:quest_categories(*), state:states(*), sponsor_business:sponsor_businesses(*)",
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as QuestWithRelations[];
}

export async function listQuestCandidates() {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return [...getMockAdminStore().questCandidates].sort((a, b) =>
      b.updated_at.localeCompare(a.updated_at),
    );
  }

  const { data, error } = await supabase
    .from("quest_candidates")
    .select(
      `*, place:places(*, state:states(*)), suggested_category:quest_categories(*), sponsor_business:sponsor_businesses(*), ${publishedQuestSelect}`,
    )
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as QuestCandidateWithRelations[];
}

export async function listRewards() {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return [...getMockAdminStore().rewards].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  const { data, error } = await supabase
    .from("rewards")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Reward[];
}

export async function listTitles() {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return [...getMockAdminStore().titles].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  const { data, error } = await supabase
    .from("titles")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Title[];
}

export async function listBadges() {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return [...getMockAdminStore().badges].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  const { data, error } = await supabase
    .from("badges")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as Badge[];
}

export async function listReviews() {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return [] as ReviewModerationItem[];
  }

  const { data, error } = await supabase
    .from("reviews")
    .select(
      "*, profile:profiles!reviews_user_id_fkey(id, username, display_name, avatar_url), quest:quests(id, title, state_id, state:states(*)), photos:review_photos(*)",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data as ReviewModerationItem[];
}

export async function listUsers(search = "") {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return [] as UserDirectoryRow[];
  }

  const [{ data: profiles, error: profileError }, { data: adminUsers, error: adminError }, { data: stateStats, error: statsError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("*, home_state:states(*)")
        .order("updated_at", { ascending: false }),
      supabase.from("admin_users").select("*"),
      supabase.from("user_state_stats").select("*"),
    ]);

  if (profileError) {
    throw new Error(profileError.message);
  }

  if (adminError) {
    throw new Error(adminError.message);
  }

  if (statsError) {
    throw new Error(statsError.message);
  }

  const normalizedSearch = search.trim().toLowerCase();
  const rows = (profiles ?? []).map((profile) => {
    const { home_state, ...profileRecord } = profile as DirectoryProfileRow;
    const totals = sumUserTotals((stateStats ?? []) as UserStateStat[], profileRecord.id);
    const adminRole =
      (adminUsers ?? []).find((item: { user_id: string; role: AdminRole }) => item.user_id === profileRecord.id)?.role ??
      null;

    return {
      admin_role: adminRole,
      home_state: home_state ?? null,
      profile: profileRecord,
      user_id: profileRecord.id,
      ...totals,
    } satisfies UserDirectoryRow;
  });

  return rows
    .filter((row) =>
      normalizedSearch
        ? row.profile.display_name.toLowerCase().includes(normalizedSearch) ||
          row.profile.username.toLowerCase().includes(normalizedSearch)
        : true,
    )
    .sort((left, right) => right.xp_total - left.xp_total);
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const [quests, sponsors, places, candidates, rewards, titles, badges, reviews, users] =
    await Promise.all([
      listQuests(),
      listSponsors(),
      listPlaces(),
      listQuestCandidates(),
      listRewards(),
      listTitles(),
      listBadges(),
      listReviews(),
      listUsers(),
    ]);

  return {
    activeQuests: quests.filter((quest) => quest.is_active).length,
    badgeCount: badges.filter((badge) => badge.is_active).length,
    candidateCount: candidates.length,
    flaggedReviews: reviews.filter((review) => review.status === "flagged").length,
    liveSponsors: sponsors.filter((sponsor) => sponsor.is_active).length,
    placeCount: places.filter((place) => place.is_active).length,
    rewardCount: rewards.filter((reward) => reward.is_active).length,
    reviewedCandidateCount: candidates.filter((candidate) => candidate.status !== "draft").length,
    sponsoredQuestCount: quests.filter(
      (quest) => quest.is_active && quest.is_sponsored,
    ).length,
    titleCount: titles.filter((title) => title.is_active).length,
    userCount: users.length,
  };
}

export async function saveSponsor(payload: SponsorPayload) {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    const store = getMockAdminStore();
    const timestamp = nowIso();

    if (payload.id) {
      store.sponsors = store.sponsors.map((sponsor) =>
        sponsor.id === payload.id
          ? { ...sponsor, ...payload, updated_at: timestamp }
          : sponsor,
      );
      return;
    }

    store.sponsors.unshift({
      ...payload,
      id: crypto.randomUUID(),
      created_at: timestamp,
      updated_at: timestamp,
    });
    return;
  }

  if (payload.id) {
    const { error } = await supabase
      .from("sponsor_businesses")
      .update(payload)
      .eq("id", payload.id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.from("sponsor_businesses").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function savePlace(payload: PlacePayload) {
  const supabase = await getServerClientOrNull();
  const states = await listStates();
  const stateReference = resolvePlaceStateReference(
    {
      state_code: payload.state_code,
      state_id: payload.state_id,
    },
    states,
  );
  const description =
    payload.description?.trim() ||
    derivePublicPlaceDescription({
      address: payload.address,
      city: payload.city,
      name: payload.name,
      place_type: payload.place_type,
      state_code: stateReference.state_code ?? payload.state_code ?? null,
    });
  const normalizedPayload: PlacePayload = {
    ...payload,
    external_id: payload.external_id ?? null,
    external_source: payload.external_source ?? null,
    description,
    state_code: stateReference.state_code,
    state_id: stateReference.state_id,
  };

  if (!supabase) {
    const store = getMockAdminStore();
    const timestamp = nowIso();
    const nextPlace = mapPlaceRelations(
      {
        ...normalizedPayload,
        id: payload.id ?? crypto.randomUUID(),
        created_at: payload.id
          ? store.places.find((place) => place.id === payload.id)?.created_at ?? timestamp
          : timestamp,
        updated_at: timestamp,
      },
      store.states,
    );

    store.places = payload.id
      ? store.places.map((place) => (place.id === payload.id ? nextPlace : place))
      : [nextPlace, ...store.places];

    return nextPlace;
  }

  if (payload.id) {
    const { data, error } = await supabase
      .from("places")
      .update(normalizedPayload)
      .eq("id", payload.id)
      .select("*, state:states(*)")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data as PlaceWithRelations;
  }

  const { data, error } = await supabase
    .from("places")
    .insert(normalizedPayload)
    .select("*, state:states(*)")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as PlaceWithRelations;
}

export async function deletePlace(placeId: string) {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    const store = getMockAdminStore();
    const timestamp = nowIso();
    const removedCandidateIds = new Set(
      store.questCandidates
        .filter((candidate) => candidate.place_id === placeId)
        .map((candidate) => candidate.id),
    );

    store.places = store.places.filter((place) => place.id !== placeId);
    store.questCandidates = store.questCandidates.filter(
      (candidate) => candidate.place_id !== placeId,
    );
    store.quests = store.quests.map((quest) =>
      quest.place_id === placeId || (quest.quest_candidate_id ? removedCandidateIds.has(quest.quest_candidate_id) : false)
        ? {
            ...quest,
            place_id: null,
            quest_candidate_id: removedCandidateIds.has(quest.quest_candidate_id ?? "")
              ? null
              : quest.quest_candidate_id ?? null,
            updated_at: timestamp,
          }
        : quest,
    );

    return;
  }

  const { error } = await supabase.from("places").delete().eq("id", placeId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function importPlaces(payloads: PlacePayload[]) {
  for (const payload of payloads) {
    await savePlace(payload);
  }
}

export async function saveQuest(payload: QuestPayload) {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    const store = getMockAdminStore();
    const timestamp = nowIso();
    const existingQuest = payload.id
      ? store.quests.find((quest) => quest.id === payload.id)
      : undefined;

    const nextQuest = mapQuestRelations(
      {
        ...payload,
        id: payload.id ?? crypto.randomUUID(),
        created_at: existingQuest?.created_at ?? timestamp,
        updated_at: timestamp,
      },
      store.categories,
      store.states,
      store.sponsors,
    );

    store.quests = payload.id
      ? store.quests.map((quest) => (quest.id === payload.id ? nextQuest : quest))
      : [nextQuest, ...store.quests];

    return;
  }

  if (payload.id) {
    const { error } = await supabase.from("quests").update(payload).eq("id", payload.id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.from("quests").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveQuestCandidate(payload: QuestCandidatePayload) {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    const store = getMockAdminStore();
    const timestamp = nowIso();
    const nextCandidate = mapQuestCandidateRelations(
      {
        ...payload,
        id: payload.id ?? crypto.randomUUID(),
        created_at: payload.id
          ? store.questCandidates.find((candidate) => candidate.id === payload.id)
              ?.created_at ?? timestamp
          : timestamp,
        updated_at: timestamp,
        published_quest_id: payload.published_quest_id ?? null,
        reviewed_by: payload.reviewed_by ?? null,
        reviewed_at: payload.reviewed_at ?? null,
      },
      store.places,
      store.categories,
      store.sponsors,
      store.quests,
    );

    store.questCandidates = payload.id
      ? store.questCandidates.map((candidate) =>
          candidate.id === payload.id ? nextCandidate : candidate,
        )
      : [nextCandidate, ...store.questCandidates];

    return nextCandidate;
  }

  if (payload.id) {
    const { error } = await supabase
      .from("quest_candidates")
      .update(payload)
      .eq("id", payload.id);

    if (error) {
      throw new Error(error.message);
    }

    return null;
  }

  const { error } = await supabase.from("quest_candidates").insert(payload);

  if (error) {
    throw new Error(error.message);
  }

  return null;
}

export async function generateQuestCandidateFromPlace(placeId: string) {
  const context = await loadNearbyGenerationContext();

  const place = context.places.find((item) => item.id === placeId);

  if (!place) {
    throw new Error("Place not found.");
  }

  return generateQuestCandidateFromPlaceRecord(place, context);
}

export async function publishQuestCandidate(params: {
  candidateId: string;
  reviewerId: string;
}) {
  const supabase = await getServerClientOrNull();
  const [places, candidates, categories, sponsors, states] = await Promise.all([
    listPlaces(),
    listQuestCandidates(),
    listQuestCategories(),
    listSponsors(),
    listStates(),
  ]);

  const candidate = candidates.find((item) => item.id === params.candidateId);

  if (!candidate) {
    throw new Error("Quest candidate not found.");
  }

  if (candidate.published_quest_id) {
    return {
      candidateId: candidate.id,
      questId: candidate.published_quest_id,
    };
  }

  if (candidate.status !== "approved") {
    throw new Error("Approve the candidate before publishing it as a live quest.");
  }

  const place = places.find((item) => item.id === candidate.place_id);

  if (!place) {
    throw new Error("The source place is missing.");
  }

  const questPayload = buildQuestFromCandidateDraft(
    {
      ...candidate,
      reviewed_by: candidate.reviewed_by ?? params.reviewerId,
      reviewed_at: candidate.reviewed_at ?? nowIso(),
    },
    place,
    categories,
    sponsors,
    states,
  );

  if (!supabase) {
    const store = getMockAdminStore();
    const timestamp = nowIso();
    const nextQuest = mapQuestRelations(
      {
        ...questPayload,
        id: crypto.randomUUID(),
        created_at: timestamp,
        updated_at: timestamp,
      },
      store.categories,
      store.states,
      store.sponsors,
    );

    store.quests = [nextQuest, ...store.quests];
    store.questCandidates = store.questCandidates.map((item) =>
      item.id === candidate.id
        ? mapQuestCandidateRelations(
            {
              ...item,
              status: "published",
              updated_at: timestamp,
              published_quest_id: nextQuest.id,
              reviewed_by: params.reviewerId,
              reviewed_at: item.reviewed_at ?? timestamp,
            },
            store.places,
            store.categories,
            store.sponsors,
            store.quests,
          )
        : item,
    );

    return {
      candidateId: candidate.id,
      questId: nextQuest.id,
    };
  }

  const { data: questRow, error: questError } = await supabase
    .from("quests")
    .insert(questPayload)
    .select(
      "*, category:quest_categories(*), state:states(*), sponsor_business:sponsor_businesses(*)",
    )
    .single();

  if (questError) {
    throw new Error(questError.message);
  }

  const { error: candidateError } = await supabase
    .from("quest_candidates")
    .update({
      published_quest_id: questRow.id,
      reviewed_at: candidate.reviewed_at ?? nowIso(),
      reviewed_by: params.reviewerId,
      status: "published",
    })
    .eq("id", candidate.id);

  if (candidateError) {
    throw new Error(candidateError.message);
  }

  return {
    candidateId: candidate.id,
    questId: questRow.id,
  };
}

export async function saveReward(payload: RewardPayload) {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    const store = getMockAdminStore();
    const timestamp = nowIso();

    if (payload.id) {
      store.rewards = store.rewards.map((reward) =>
        reward.id === payload.id
          ? { ...reward, ...payload, updated_at: timestamp }
          : reward,
      );
      return;
    }

    store.rewards.unshift({
      ...payload,
      id: crypto.randomUUID(),
      created_at: timestamp,
      updated_at: timestamp,
    });
    return;
  }

  if (payload.id) {
    const { error } = await supabase.from("rewards").update(payload).eq("id", payload.id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.from("rewards").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveTitle(payload: TitlePayload) {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    const store = getMockAdminStore();
    const timestamp = nowIso();

    if (payload.id) {
      store.titles = store.titles.map((title) =>
        title.id === payload.id
          ? { ...title, ...payload, updated_at: timestamp }
          : title,
      );
      return;
    }

    store.titles.unshift({
      ...payload,
      id: crypto.randomUUID(),
      created_at: timestamp,
      updated_at: timestamp,
    });
    return;
  }

  if (payload.id) {
    const { error } = await supabase.from("titles").update(payload).eq("id", payload.id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.from("titles").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveBadge(payload: BadgePayload) {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    const store = getMockAdminStore();
    const timestamp = nowIso();

    if (payload.id) {
      store.badges = store.badges.map((badge) =>
        badge.id === payload.id
          ? { ...badge, ...payload, updated_at: timestamp }
          : badge,
      );
      return;
    }

    store.badges.unshift({
      ...payload,
      id: crypto.randomUUID(),
      created_at: timestamp,
      updated_at: timestamp,
    });
    return;
  }

  if (payload.id) {
    const { error } = await supabase.from("badges").update(payload).eq("id", payload.id);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.from("badges").insert(payload);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveReviewModeration(payload: ReviewModerationPayload) {
  const supabase = await getServerClientOrNull();

  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("reviews")
    .update({
      moderated_at: nowIso(),
      moderated_by: payload.moderated_by,
      moderation_reason: payload.moderation_reason,
      status: payload.status,
    })
    .eq("id", payload.review_id);

  if (error) {
    throw new Error(error.message);
  }
}
