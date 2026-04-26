import type {
  NearbyBusinessResult,
  NearbyBusinessSearchCenter,
  PlaceWithRelations,
} from "@rovexp/types";

export type NearbyBusinessTypeKey =
  | "coffee"
  | "food"
  | "parks"
  | "culture"
  | "landmarks"
  | "shopping"
  | "entertainment";

export interface NearbyBusinessTypeOption {
  key: NearbyBusinessTypeKey;
  label: string;
  placeType: string;
  tone: string;
  queryFragments: string[];
}

export const nearbyBusinessTypeOptions: readonly NearbyBusinessTypeOption[] = [
  {
    key: "coffee",
    label: "Coffee",
    placeType: "cafe",
    tone: "from-cyan-500 to-sky-400",
    queryFragments: ['["amenity"="cafe"]'],
  },
  {
    key: "food",
    label: "Food & drink",
    placeType: "restaurant",
    tone: "from-amber-500 to-orange-400",
    queryFragments: [
      '["amenity"~"restaurant|fast_food|bar|pub|bakery|ice_cream"]',
    ],
  },
  {
    key: "parks",
    label: "Parks",
    placeType: "park",
    tone: "from-emerald-500 to-teal-400",
    queryFragments: ['["leisure"~"park|garden|nature_reserve|playground"]'],
  },
  {
    key: "culture",
    label: "Culture",
    placeType: "museum",
    tone: "from-violet-500 to-fuchsia-400",
    queryFragments: [
      '["tourism"~"museum|gallery|artwork"]',
      '["amenity"="library"]',
      '["historic"~"monument|memorial|ruins|archaeological_site"]',
    ],
  },
  {
    key: "landmarks",
    label: "Landmarks",
    placeType: "landmark",
    tone: "from-sky-500 to-indigo-400",
    queryFragments: [
      '["tourism"~"attraction|viewpoint"]',
      '["historic"~"monument|memorial|castle|ruins|archaeological_site"]',
    ],
  },
  {
    key: "shopping",
    label: "Shopping",
    placeType: "shop",
    tone: "from-rose-500 to-pink-400",
    queryFragments: ['["shop"]', '["amenity"="marketplace"]'],
  },
  {
    key: "entertainment",
    label: "Entertainment",
    placeType: "entertainment",
    tone: "from-blue-500 to-cyan-400",
    queryFragments: [
      '["amenity"~"cinema|theatre|arts_centre|nightclub|casino"]',
      '["leisure"~"amusement_arcade|escape_game"]',
    ],
  },
];

export const defaultNearbyBusinessTypes: NearbyBusinessTypeKey[] = [
  "coffee",
  "food",
  "parks",
  "culture",
  "landmarks",
];

interface OverpassElement {
  center?: { lat?: number; lon?: number };
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string | number | boolean | null | undefined>;
  type: "node" | "way" | "relation";
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function toTags(tags: OverpassElement["tags"]) {
  const entries = Object.entries(tags ?? {}).flatMap(([key, value]) => {
    if (value === null || typeof value === "undefined") {
      return [];
    }

    return [[key, String(value)] as const];
  });

  return Object.fromEntries(entries);
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function haversineMiles(
  latitudeA: number,
  longitudeA: number,
  latitudeB: number,
  longitudeB: number,
) {
  const earthRadiusMiles = 3958.8;
  const deltaLatitude = toRadians(latitudeB - latitudeA);
  const deltaLongitude = toRadians(longitudeB - longitudeA);
  const a =
    Math.sin(deltaLatitude / 2) ** 2 +
    Math.cos(toRadians(latitudeA)) *
      Math.cos(toRadians(latitudeB)) *
      Math.sin(deltaLongitude / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMiles * c;
}

export function buildNearbyBusinessesQuery(
  latitude: number,
  longitude: number,
  radiusMeters: number,
  types: NearbyBusinessTypeKey[],
) {
  const selectedTypes = types.length ? types : defaultNearbyBusinessTypes;
  const fragments = selectedTypes.flatMap((type) => {
    const option = nearbyBusinessTypeOptions.find((item) => item.key === type);

    return option?.queryFragments ?? [];
  });

  const queryLines = fragments.map(
    (fragment) => `  nwr(around:${radiusMeters},${latitude},${longitude})${fragment};`,
  );

  return `
[out:json][timeout:25];
(
${queryLines.join("\n")}
);
out center tags;
`.trim();
}

export function deriveNearbyBusinessType(tags: Record<string, string>) {
  const amenity = normalize(tags.amenity);
  const tourism = normalize(tags.tourism);
  const leisure = normalize(tags.leisure);
  const historic = normalize(tags.historic);
  const shop = normalize(tags.shop);

  if (amenity === "cafe") {
    return { key: "coffee" as const, label: "Coffee", placeType: "cafe" };
  }

  if (
    ["restaurant", "fast_food", "bar", "pub", "bakery", "ice_cream"].includes(amenity)
  ) {
    return { key: "food" as const, label: "Food & drink", placeType: amenity || "restaurant" };
  }

  if (["park", "garden", "nature_reserve", "playground"].includes(leisure)) {
    return { key: "parks" as const, label: "Parks", placeType: leisure || "park" };
  }

  if (["museum", "gallery", "artwork"].includes(tourism) || amenity === "library") {
    return { key: "culture" as const, label: "Culture", placeType: tourism || "museum" };
  }

  if (
    ["attraction", "viewpoint"].includes(tourism) ||
    ["monument", "memorial", "castle", "ruins", "archaeological_site"].includes(historic)
  ) {
    return { key: "landmarks" as const, label: "Landmarks", placeType: tourism || historic || "landmark" };
  }

  if (shop || amenity === "marketplace") {
    return { key: "shopping" as const, label: "Shopping", placeType: shop || "shop" };
  }

  if (
    ["cinema", "theatre", "arts_centre", "nightclub", "casino"].includes(amenity) ||
    ["amusement_arcade", "escape_game"].includes(leisure)
  ) {
    return {
      key: "entertainment" as const,
      label: "Entertainment",
      placeType: amenity || leisure || "entertainment",
    };
  }

  return { key: "landmarks" as const, label: "Landmarks", placeType: tourism || historic || "landmark" };
}

function formatAddress(tags: Record<string, string>) {
  const street = [tags["addr:housenumber"], tags["addr:street"]].filter(Boolean).join(" ");
  const locality =
    tags["addr:city"] ??
    tags["addr:suburb"] ??
    tags["addr:neighbourhood"] ??
    tags["addr:town"] ??
    tags["addr:village"] ??
    null;

  const parts = [street, locality].filter(Boolean);

  return parts.length ? parts.join(", ") : null;
}

function classifyFallbackPlaceType(placeType: string): NearbyBusinessTypeKey {
  const normalized = normalize(placeType);

  if (normalized.includes("coffee") || normalized.includes("cafe")) {
    return "coffee";
  }

  if (
    ["restaurant", "fast_food", "bar", "pub", "bakery", "ice_cream"].some((token) =>
      normalized.includes(token),
    )
  ) {
    return "food";
  }

  if (
    normalized.includes("park") ||
    normalized.includes("garden") ||
    normalized.includes("trail") ||
    normalized.includes("nature")
  ) {
    return "parks";
  }

  if (
    normalized.includes("museum") ||
    normalized.includes("gallery") ||
    normalized.includes("library") ||
    normalized.includes("art")
  ) {
    return "culture";
  }

  if (
    normalized.includes("landmark") ||
    normalized.includes("attraction") ||
    normalized.includes("viewpoint") ||
    normalized.includes("historic")
  ) {
    return "landmarks";
  }

  if (normalized.includes("shop") || normalized.includes("market")) {
    return "shopping";
  }

  if (
    normalized.includes("cinema") ||
    normalized.includes("theatre") ||
    normalized.includes("entertainment") ||
    normalized.includes("nightclub")
  ) {
    return "entertainment";
  }

  return "landmarks";
}

export function resolveNearbyBusinessResult(
  element: OverpassElement,
  center: NearbyBusinessSearchCenter,
): NearbyBusinessResult | null {
  const latitude = element.lat ?? element.center?.lat ?? null;
  const longitude = element.lon ?? element.center?.lon ?? null;

  if (typeof latitude !== "number" || typeof longitude !== "number") {
    return null;
  }

  const tags = toTags(element.tags);
  const category = deriveNearbyBusinessType(tags);
  const distanceMiles = haversineMiles(
    center.latitude,
    center.longitude,
    latitude,
    longitude,
  );

  return {
    address: formatAddress(tags),
    category_label: category.label,
    city:
      tags["addr:city"] ??
      tags["addr:suburb"] ??
      tags["addr:neighbourhood"] ??
      tags["addr:town"] ??
      tags["addr:village"] ??
      null,
    distance_miles: distanceMiles,
    id: `openstreetmap:${element.type}/${element.id}`,
    image_url: null,
    latitude,
    longitude,
    name:
      tags.name ??
      tags.brand ??
      tags.operator ??
      tags["name:en"] ??
      `${category.label} stop`,
    phone: tags["contact:phone"] ?? tags.phone ?? null,
    place_type: category.placeType,
    rating: null,
    review_count: null,
    source: "openstreetmap",
    source_id: `${element.type}/${element.id}`,
    state_code: tags["addr:state"] ?? center.state_code,
    state_name: center.state_name,
    tags,
    website: tags["contact:website"] ?? tags.website ?? null,
  };
}

export function resolveNearbyBusinessCenterLabel(
  location: string,
  stateCode: string,
  stateName: string,
  fallback: NearbyBusinessSearchCenter,
) {
  const trimmed = location.trim();

  if (trimmed) {
    return `${trimmed}, ${stateCode}`;
  }

  return fallback.label || `${stateName}, ${stateCode}`;
}

export function buildStatefulSearchQuery(location: string, stateCode: string, stateName: string) {
  const trimmed = location.trim();
  const stateLabel = stateName.trim() || stateCode.trim();

  return [trimmed, stateLabel, "USA"].filter(Boolean).join(", ");
}

export function createNearbyBusinessFallbackResults(
  center: NearbyBusinessSearchCenter,
  places: Array<PlaceWithRelations>,
  selectedTypes: NearbyBusinessTypeKey[],
) {
  const typeSet = new Set(selectedTypes.length ? selectedTypes : defaultNearbyBusinessTypes);

  return places
    .map((place) => {
      const businessType = classifyFallbackPlaceType(place.place_type);
      const category = nearbyBusinessTypeOptions.find((option) => option.key === businessType);

      const distanceMiles = haversineMiles(
        center.latitude,
        center.longitude,
        place.latitude,
        place.longitude,
      );

      const result: NearbyBusinessResult = {
        address: place.address,
        category_label: category?.label ?? "Nearby stop",
        city: place.city,
        distance_miles: distanceMiles,
        id: `demo:${place.id}`,
        image_url: place.image_url,
        latitude: place.latitude,
        longitude: place.longitude,
        name: place.name,
        phone: place.phone,
        place_type: category?.placeType || place.place_type,
        rating: place.rating,
        review_count: place.review_count,
        source: "demo-fixture",
        source_id: place.external_source && place.external_id ? `${place.external_source}:${place.external_id}` : place.id,
        state_code: place.state_code ?? place.state?.code ?? center.state_code,
        state_name: place.state?.name ?? center.state_name,
        tags: {
          demo: "true",
        },
        website: place.website,
      };

      return result;
    })
    .filter((result) => typeSet.size === 0 || typeSet.has(classifyFallbackPlaceType(result.place_type)))
    .sort((a, b) => a.distance_miles - b.distance_miles);
}
