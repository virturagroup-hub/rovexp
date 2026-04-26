import type { PlaceWithRelations } from "@rovexp/types";

import { haversineMiles } from "./nearby-businesses";

export type GoogleBusinessTypeKey =
  | "coffee"
  | "food"
  | "parks"
  | "culture"
  | "landmarks"
  | "shopping"
  | "entertainment";

export type GoogleBusinessStatus =
  | "CLOSED_PERMANENTLY"
  | "CLOSED_TEMPORARILY"
  | "OPERATIONAL"
  | null;

export interface GoogleBusinessTypeOption {
  key: GoogleBusinessTypeKey;
  label: string;
  googleTypes: string[];
  tone: string;
  description: string;
}

export const googleBusinessTypeOptions: readonly GoogleBusinessTypeOption[] = [
  {
    key: "coffee",
    label: "Coffee",
    googleTypes: ["cafe"],
    tone: "from-cyan-500 to-sky-400",
    description: "Neighborhood coffee bars and cafe stops.",
  },
  {
    key: "food",
    label: "Food & drink",
    googleTypes: ["restaurant", "bakery", "bar"],
    tone: "from-amber-500 to-orange-400",
    description: "Restaurants, bakeries, and casual food stops.",
  },
  {
    key: "parks",
    label: "Parks",
    googleTypes: ["park"],
    tone: "from-emerald-500 to-teal-400",
    description: "Green spaces, plazas, and outdoor walks.",
  },
  {
    key: "culture",
    label: "Culture",
    googleTypes: ["museum", "art_gallery", "library"],
    tone: "from-violet-500 to-fuchsia-400",
    description: "Museums, galleries, libraries, and arts stops.",
  },
  {
    key: "landmarks",
    label: "Landmarks",
    googleTypes: ["tourist_attraction", "point_of_interest"],
    tone: "from-sky-500 to-indigo-400",
    description: "Iconic points of interest and photo stops.",
  },
  {
    key: "shopping",
    label: "Shopping",
    googleTypes: ["shopping_mall", "store"],
    tone: "from-rose-500 to-pink-400",
    description: "Malls, shops, and retail corridors.",
  },
  {
    key: "entertainment",
    label: "Entertainment",
    googleTypes: ["movie_theater", "amusement_park", "night_club"],
    tone: "from-blue-500 to-cyan-400",
    description: "Theaters, nightlife, and activity venues.",
  },
];

export const defaultGoogleBusinessTypes: GoogleBusinessTypeKey[] = [
  "coffee",
  "food",
  "parks",
  "culture",
  "landmarks",
];

export interface GoogleSearchCenter {
  latitude: number;
  longitude: number;
  label: string;
  placeId: string | null;
  resolvedFrom: "autocomplete" | "geocode" | "manual" | "default";
  stateCode: string;
  stateName: string;
}

export interface GoogleNearbyBusinessResult {
  id: string;
  placeId: string;
  name: string;
  placeTypes: string[];
  primaryType: string | null;
  formattedAddress: string | null;
  vicinity: string | null;
  city: string | null;
  stateCode: string | null;
  latitude: number;
  longitude: number;
  distanceMiles: number;
  website: string | null;
  phone: string | null;
  photoUrl: string | null;
  rating: number | null;
  userRatingsTotal: number | null;
  businessStatus: GoogleBusinessStatus;
  source: "google";
}

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

export function classifyGoogleBusinessType(types: string[]) {
  const typeSet = new Set(types.map(normalize));

  if (typeSet.has("cafe")) {
    return "coffee" as const;
  }

  if (typeSet.has("restaurant") || typeSet.has("bakery") || typeSet.has("bar")) {
    return "food" as const;
  }

  if (typeSet.has("park")) {
    return "parks" as const;
  }

  if (typeSet.has("museum") || typeSet.has("art_gallery") || typeSet.has("library")) {
    return "culture" as const;
  }

  if (typeSet.has("tourist_attraction") || typeSet.has("point_of_interest")) {
    return "landmarks" as const;
  }

  if (typeSet.has("shopping_mall") || typeSet.has("store")) {
    return "shopping" as const;
  }

  if (
    typeSet.has("movie_theater") ||
    typeSet.has("amusement_park") ||
    typeSet.has("night_club")
  ) {
    return "entertainment" as const;
  }

  return "landmarks" as const;
}

export function googleBusinessLabel(types: string[]) {
  const key = classifyGoogleBusinessType(types);
  const option = googleBusinessTypeOptions.find((item) => item.key === key);

  return option?.label ?? "Landmarks";
}

export function googleBusinessTone(types: string[]) {
  const key = classifyGoogleBusinessType(types);
  return googleBusinessTypeOptions.find((item) => item.key === key)?.tone ?? "from-slate-500 to-slate-400";
}

export function getGoogleBusinessTypesForKey(key: GoogleBusinessTypeKey) {
  return googleBusinessTypeOptions.find((item) => item.key === key)?.googleTypes ?? [];
}

export function placeLookupKey(value: {
  name: string;
  address: string | null;
  city: string | null;
  stateCode: string | null;
}) {
  return normalize([value.name, value.address ?? "", value.city ?? "", value.stateCode ?? ""].join(" "));
}

export function matchInternalPlaceFromGoogleResult(
  result: GoogleNearbyBusinessResult,
  places: PlaceWithRelations[],
) {
  const exactExternal = places.find(
    (place) =>
      normalize(place.external_source) === "google_places" &&
      normalize(place.external_id) === normalize(result.placeId),
  );

  if (exactExternal) {
    return exactExternal;
  }

  const resultKey = placeLookupKey({
    address: result.formattedAddress ?? result.vicinity,
    city: result.city,
    name: result.name,
    stateCode: result.stateCode,
  });

  return (
    places.find((place) => {
      const placeKey = placeLookupKey({
        address: place.address,
        city: place.city,
        name: place.name,
        stateCode: place.state_code ?? place.state?.code ?? null,
      });

      if (placeKey && placeKey === resultKey) {
        return true;
      }

      const sameCoordinates =
        Math.abs(place.latitude - result.latitude) < 0.0008 &&
        Math.abs(place.longitude - result.longitude) < 0.0008;

      return sameCoordinates && normalize(place.name) === normalize(result.name);
    }) ?? null
  );
}

export function buildGoogleResultDistanceMiles(
  center: { latitude: number; longitude: number },
  latitude: number,
  longitude: number,
) {
  return haversineMiles(center.latitude, center.longitude, latitude, longitude);
}

export function googleResultStatusTone(status: "stored" | "candidate" | "quest" | "new") {
  switch (status) {
    case "quest":
      return "bg-amber-100 text-amber-950";
    case "candidate":
      return "bg-cyan-100 text-cyan-950";
    case "stored":
      return "bg-slate-100 text-slate-900";
    case "new":
    default:
      return "bg-emerald-100 text-emerald-950";
  }
}

export function googleResultStatusLabel(status: "stored" | "candidate" | "quest" | "new") {
  switch (status) {
    case "quest":
      return "Live quest";
    case "candidate":
      return "Candidate";
    case "stored":
      return "Stored";
    case "new":
    default:
      return "New";
  }
}

export function formatGoogleBusinessType(types: string[]) {
  const key = classifyGoogleBusinessType(types);
  return googleBusinessTypeOptions.find((item) => item.key === key)?.label ?? "Landmarks";
}
