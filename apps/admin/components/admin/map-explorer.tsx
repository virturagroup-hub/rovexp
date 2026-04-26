"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Compass,
  ExternalLink,
  Layers3,
  Map as MapIcon,
  MapPin,
  RefreshCcw,
  Search,
  Sparkles,
} from "lucide-react";

import {
  generateQuestCandidateAction,
  savePlaceAndGenerateCandidateAction,
  savePlaceFromMapAction,
} from "@/lib/admin/actions";
import { derivePublicPlaceDescription } from "@/lib/admin/place-content";
import { GoogleMapCanvas } from "@/components/admin/google-map-canvas";
import {
  buildGoogleResultDistanceMiles,
  defaultGoogleBusinessTypes,
  formatGoogleBusinessType,
  googleBusinessTypeOptions,
  googleResultStatusLabel,
  googleResultStatusTone,
  getGoogleBusinessTypesForKey,
  matchInternalPlaceFromGoogleResult,
  type GoogleBusinessTypeKey,
  type GoogleNearbyBusinessResult,
  type GoogleSearchCenter,
} from "@/lib/admin/google-places";
import { useGoogleMapsLoader } from "@/lib/admin/google-maps-loader";
import type {
  PlaceWithRelations,
  QuestCandidateWithRelations,
  QuestWithRelations,
  StateRecord,
} from "@rovexp/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface AdminMapExplorerProps {
  candidates: QuestCandidateWithRelations[];
  places: PlaceWithRelations[];
  quests: QuestWithRelations[];
  states: StateRecord[];
}

type ExplorerTab = "google" | "stored" | "manual";

type PlaceDraft = {
  address: string;
  city: string;
  description: string;
  external_id: string;
  external_source: string;
  id: string;
  image_url: string;
  is_active: boolean;
  is_publicly_visitable: boolean;
  latitude: string;
  longitude: string;
  name: string;
  phone: string;
  place_type: string;
  rating: string;
  review_count: string;
  source_metadata: string;
  state_code: string;
  state_id: string;
  website: string;
};

type StoredSearchState = {
  activeOnly: boolean;
  query: string;
  publicOnly: boolean;
  stateId: string;
};

type GoogleSearchState = {
  center: GoogleSearchCenter | null;
  error: string | null;
  locationQuery: string;
  predictions: google.maps.places.AutocompletePrediction[];
  radiusMiles: string;
  stateId: string;
  status: "idle" | "loading" | "success" | "error";
  types: GoogleBusinessTypeKey[];
};

type GoogleResultDetailState = {
  data: google.maps.places.PlaceResult | null;
  error: string | null;
  status: "idle" | "loading" | "success" | "error";
};

type GooglePlaceDraftState = {
  draft: PlaceDraft | null;
  selectedId: string | null;
};

type StoredSearchResult = PlaceWithRelations & {
  candidate: QuestCandidateWithRelations | null;
  quest: QuestWithRelations | null;
};

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

const DEFAULT_CENTER = {
  latitude: 41.8781,
  longitude: -87.6298,
  label: "Chicago, IL",
  placeId: null,
  resolvedFrom: "default" as const,
  stateCode: "IL",
  stateName: "Illinois",
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function formatStateLabel(state: StateRecord | null | undefined) {
  if (!state) {
    return "Unassigned state";
  }

  return `${state.code} · ${state.name}`;
}

function formatCoordinates(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function placeTypeLabel(placeType: string) {
  const value = normalize(placeType);

  if (value.includes("cafe")) return "Coffee";
  if (value.includes("restaurant") || value.includes("food")) return "Food";
  if (value.includes("park")) return "Park";
  if (value.includes("museum") || value.includes("culture")) return "Culture";
  if (value.includes("shop") || value.includes("store")) return "Shopping";
  if (value.includes("entertain")) return "Entertainment";

  return "Landmark";
}

function placeTypeTone(placeType: string) {
  const value = normalize(placeType);

  if (value.includes("cafe")) return "bg-cyan-100 text-cyan-950";
  if (value.includes("restaurant") || value.includes("food")) return "bg-amber-100 text-amber-950";
  if (value.includes("park")) return "bg-emerald-100 text-emerald-950";
  if (value.includes("museum") || value.includes("culture")) return "bg-violet-100 text-violet-950";
  if (value.includes("shop") || value.includes("store")) return "bg-rose-100 text-rose-950";
  if (value.includes("entertain")) return "bg-sky-100 text-sky-950";

  return "bg-slate-100 text-slate-900";
}

function pipelineTone(status: "stored" | "candidate" | "quest" | "new") {
  return googleResultStatusTone(status);
}

function pipelineLabel(status: "stored" | "candidate" | "quest" | "new") {
  return googleResultStatusLabel(status);
}

function getStoredPlaceStatus(
  placeId: string,
  candidatesByPlaceId: Map<string, QuestCandidateWithRelations>,
  questsByPlaceId: Map<string, QuestWithRelations>,
) {
  if (questsByPlaceId.has(placeId)) {
    return "quest" as const;
  }

  if (candidatesByPlaceId.has(placeId)) {
    return "candidate" as const;
  }

  return "stored" as const;
}

function buildSearchableText(place: PlaceWithRelations) {
  return normalize(
    [
      place.name,
      place.place_type,
      place.address ?? "",
      place.city ?? "",
      place.state?.code ?? place.state_code ?? "",
    ].join(" "),
  );
}

function buildStoredResults(
  places: PlaceWithRelations[],
  candidatesByPlaceId: Map<string, QuestCandidateWithRelations>,
  questsByPlaceId: Map<string, QuestWithRelations>,
  query: string,
  stateId: string,
  activeOnly: boolean,
  publicOnly: boolean,
) {
  const normalizedQuery = normalize(query);

  return places
    .filter((place) => {
      const placeStateId = place.state?.id ?? place.state_id ?? null;

      if (stateId && placeStateId && placeStateId !== stateId) {
        return false;
      }

      if (activeOnly && !place.is_active) {
        return false;
      }

      if (publicOnly && !place.is_publicly_visitable) {
        return false;
      }

      if (normalizedQuery.length === 0) {
        return true;
      }

      return buildSearchableText(place).includes(normalizedQuery);
    })
    .map((place) => ({
      ...place,
      candidate: candidatesByPlaceId.get(place.id) ?? null,
      quest: questsByPlaceId.get(place.id) ?? null,
    }));
}

function buildStoredDraft(place: PlaceWithRelations): PlaceDraft {
  return {
    address: place.address ?? "",
    city: place.city ?? "",
    description:
      place.description ??
      derivePublicPlaceDescription({
        address: place.address,
        city: place.city,
        name: place.name,
        place_type: place.place_type,
        state_code: place.state_code ?? place.state?.code ?? null,
      }),
    external_id: place.external_id ?? "",
    external_source: place.external_source ?? "",
    id: place.id,
    image_url: place.image_url ?? "",
    is_active: place.is_active,
    is_publicly_visitable: place.is_publicly_visitable,
    latitude: String(place.latitude),
    longitude: String(place.longitude),
    name: place.name,
    phone: place.phone ?? "",
    place_type: place.place_type,
    rating: place.rating === null ? "" : String(place.rating),
    review_count: place.review_count === null ? "" : String(place.review_count),
    source_metadata:
      place.source_metadata && Object.keys(place.source_metadata).length > 0
        ? JSON.stringify(place.source_metadata, null, 2)
        : "",
    state_code: place.state_code ?? place.state?.code ?? "",
    state_id: place.state_id ?? place.state?.id ?? "",
    website: place.website ?? "",
  };
}

function buildManualDraft(center: GoogleSearchCenter, state: StateRecord | null): PlaceDraft {
  return {
    address: "",
    city: center.label.split(",")[0]?.trim() ?? "",
    description: `Manually seeded location from the admin map near ${center.label}.`,
    external_id: "",
    external_source: "",
    id: "",
    image_url: "",
    is_active: true,
    is_publicly_visitable: true,
    latitude: String(center.latitude),
    longitude: String(center.longitude),
    name: "",
    phone: "",
    place_type: "landmark",
    rating: "",
    review_count: "",
    source_metadata: JSON.stringify(
      {
        admin_mode: "manual_add",
        map_center: center,
      },
      null,
      2,
    ),
    state_code: state?.code ?? "",
    state_id: state?.id ?? "",
    website: "",
  };
}

function buildGoogleDraft(
  result: GoogleNearbyBusinessResult,
  detail: google.maps.places.PlaceResult | null,
  state: StateRecord | null,
  center: GoogleSearchCenter,
  existingPlace: PlaceWithRelations | null,
  searchQuery: string,
): PlaceDraft {
  const address =
    detail?.formatted_address ?? result.formattedAddress ?? result.vicinity ?? existingPlace?.address ?? "";
  const city =
    detail?.address_components?.find((component) =>
      component.types.includes("locality"),
    )?.long_name ??
    result.city ??
    existingPlace?.city ??
    center.label.split(",")[0]?.trim() ??
    "";
  const stateCodeFromAddress =
    detail?.address_components?.find((component) => component.types.includes("administrative_area_level_1"))
      ?.short_name ?? result.stateCode ?? existingPlace?.state_code ?? null;
  const type = detail?.types?.[0] ?? result.primaryType ?? result.placeTypes[0] ?? "landmark";

  return {
    address,
    city,
    description:
      existingPlace?.description?.trim() ||
      derivePublicPlaceDescription({
        address,
        city,
        name: detail?.name ?? result.name,
        place_type: type,
        state_code: stateCodeFromAddress,
      }),
    external_id: existingPlace?.external_id ?? result.placeId,
    external_source: existingPlace?.external_source ?? "google_places",
    id: existingPlace?.id ?? "",
    image_url:
      existingPlace?.image_url ??
      result.photoUrl ??
      detail?.photos?.[0]?.getUrl({ maxHeight: 900, maxWidth: 1200 }) ??
      "",
    is_active: existingPlace?.is_active ?? true,
    is_publicly_visitable: existingPlace?.is_publicly_visitable ?? true,
    latitude: String(existingPlace?.latitude ?? detail?.geometry?.location?.lat() ?? result.latitude),
    longitude: String(existingPlace?.longitude ?? detail?.geometry?.location?.lng() ?? result.longitude),
    name: existingPlace?.name ?? detail?.name ?? result.name,
    phone:
      existingPlace?.phone ??
      detail?.formatted_phone_number ??
      result.phone ??
      "",
    place_type: existingPlace?.place_type ?? type,
    rating: existingPlace?.rating === null || typeof existingPlace?.rating === "undefined"
      ? result.rating === null
        ? ""
        : String(result.rating)
      : String(existingPlace.rating),
    review_count:
      existingPlace?.review_count === null || typeof existingPlace?.review_count === "undefined"
        ? result.userRatingsTotal === null
          ? ""
          : String(result.userRatingsTotal)
        : String(existingPlace.review_count),
    source_metadata: JSON.stringify(
      {
        google: {
          address_components: detail?.address_components?.map((component) => ({
            long_name: component.long_name,
            short_name: component.short_name,
            types: component.types,
          })),
          business_status: detail?.business_status ?? result.businessStatus ?? null,
          center,
          place_id: result.placeId,
          place_types: result.placeTypes,
          primary_type: result.primaryType,
          query: searchQuery,
          rating: detail?.rating ?? result.rating ?? null,
          user_ratings_total: detail?.user_ratings_total ?? result.userRatingsTotal ?? null,
        },
      },
      null,
      2,
    ),
    state_code: existingPlace?.state_code ?? stateCodeFromAddress ?? "",
    state_id:
      existingPlace?.state_id ??
      (state?.code && stateCodeFromAddress && state.code === stateCodeFromAddress
        ? state.id
        : ""),
    website: existingPlace?.website ?? detail?.website ?? result.website ?? "",
  };
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebounced(value);
    }, delay);

    return () => {
      window.clearTimeout(handle);
    };
  }, [delay, value]);

  return debounced;
}

async function getGoogleAutocompletePredictions(
  input: string,
): Promise<google.maps.places.AutocompletePrediction[]> {
  if (!window.google?.maps?.places) {
    return [];
  }

  const service = new google.maps.places.AutocompleteService();

  return new Promise((resolve) => {
    service.getPlacePredictions(
      {
        input,
        types: ["geocode"],
      },
      (predictions, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
          resolve([]);
          return;
        }

        resolve(predictions);
      },
    );
  });
}

async function resolveGoogleCenterFromPrediction(
  placeId: string,
  mapHost: HTMLDivElement,
): Promise<google.maps.places.PlaceResult | null> {
  const service = new google.maps.places.PlacesService(mapHost);

  return new Promise((resolve) => {
    service.getDetails(
      {
        fields: ["geometry", "formatted_address", "name", "place_id"],
        placeId,
      },
      (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !place) {
          resolve(null);
          return;
        }

        resolve(place);
      },
    );
  });
}

async function resolveGoogleCenterFromQuery(
  query: string,
  mapHost: HTMLDivElement,
): Promise<google.maps.places.PlaceResult | null> {
  const service = new google.maps.places.PlacesService(mapHost);

  return new Promise((resolve) => {
    service.textSearch(
      {
        query,
      },
      (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results?.length) {
          resolve(null);
          return;
        }

        resolve(results[0] ?? null);
      },
    );
  });
}

async function searchNearbyGooglePlaces(
  center: GoogleSearchCenter,
  radiusMeters: number,
  types: GoogleBusinessTypeKey[],
  mapHost: HTMLDivElement,
) {
  const service = new google.maps.places.PlacesService(mapHost);
  const placeTypes = Array.from(
    new Set(
      (types.length ? types : defaultGoogleBusinessTypes).flatMap((type) =>
        getGoogleBusinessTypesForKey(type),
      ),
    ),
  );

  const results = await Promise.all(
    placeTypes.map(
      (type) =>
        new Promise<google.maps.places.PlaceResult[]>((resolve) => {
          service.nearbySearch(
            {
              location: new google.maps.LatLng(center.latitude, center.longitude),
              radius: radiusMeters,
              type,
            },
            (places, status) => {
              if (status !== google.maps.places.PlacesServiceStatus.OK || !places) {
                resolve([]);
                return;
              }

              resolve(places);
            },
          );
        }),
    ),
  );

  const flattened = results.flat();
  const unique = new Map<string, google.maps.places.PlaceResult>();

  flattened.forEach((place) => {
    const placeId = place.place_id;

    if (!placeId || unique.has(placeId)) {
      return;
    }

    unique.set(placeId, place);
  });

  const nearbyResults: GoogleNearbyBusinessResult[] = [];

  unique.forEach((place) => {
    const geometryLocation = place.geometry?.location;

    if (!geometryLocation) {
      return;
    }

    const placeTypes = place.types ?? [];
    const primaryType = placeTypes[0] ?? null;

    nearbyResults.push({
      businessStatus: place.business_status ?? null,
      city: place.vicinity ?? null,
      distanceMiles: buildGoogleResultDistanceMiles(
        center,
        geometryLocation.lat(),
        geometryLocation.lng(),
      ),
      formattedAddress: place.formatted_address ?? place.vicinity ?? null,
      id: `google:${place.place_id ?? place.name ?? `${geometryLocation.lat()}-${geometryLocation.lng()}`}`,
      latitude: geometryLocation.lat(),
      longitude: geometryLocation.lng(),
      name: place.name ?? "Google place",
      placeId: place.place_id ?? "",
      placeTypes,
      phone: place.formatted_phone_number ?? null,
      photoUrl: place.photos?.[0]
        ? place.photos[0].getUrl({ maxHeight: 900, maxWidth: 1200 })
        : null,
      primaryType,
      rating: place.rating ?? null,
      source: "google",
      stateCode: null,
      userRatingsTotal: place.user_ratings_total ?? null,
      vicinity: place.vicinity ?? null,
      website: place.website ?? null,
    });
  });

  return nearbyResults.sort((a, b) => a.distanceMiles - b.distanceMiles);
}

function mapResultSummary(
  status: "stored" | "candidate" | "quest" | "new",
  label: string,
) {
  return (
    <Badge className={pipelineTone(status)}>
      {label}
    </Badge>
  );
}

function PlaceEditorFields({
  draft,
  onChange,
}: {
  draft: PlaceDraft;
  onChange: (patch: Partial<PlaceDraft>) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="selected-name">Place name</Label>
        <Input
          id="selected-name"
          name="name"
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Place name"
          value={draft.name}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="selected-place-type">Place type</Label>
        <Input
          id="selected-place-type"
          name="place_type"
          onChange={(event) => onChange({ place_type: event.target.value })}
          placeholder="restaurant"
          value={draft.place_type}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="selected-state">State</Label>
        <Input
          id="selected-state"
          name="state_code"
          onChange={(event) => onChange({ state_code: event.target.value })}
          placeholder="IL"
          value={draft.state_code}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="selected-city">City</Label>
        <Input
          id="selected-city"
          name="city"
          onChange={(event) => onChange({ city: event.target.value })}
          placeholder="Chicago"
          value={draft.city}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="selected-address">Address</Label>
        <Input
          id="selected-address"
          name="address"
          onChange={(event) => onChange({ address: event.target.value })}
          placeholder="201 E Randolph St"
          value={draft.address}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="selected-latitude">Latitude</Label>
        <Input
          id="selected-latitude"
          name="latitude"
          onChange={(event) => onChange({ latitude: event.target.value })}
          placeholder="41.8833"
          value={draft.latitude}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="selected-longitude">Longitude</Label>
        <Input
          id="selected-longitude"
          name="longitude"
          onChange={(event) => onChange({ longitude: event.target.value })}
          placeholder="-87.6217"
          value={draft.longitude}
        />
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="selected-description">Description</Label>
        <Textarea
          id="selected-description"
          name="description"
          onChange={(event) => onChange({ description: event.target.value })}
          rows={4}
          value={draft.description}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="selected-website">Website</Label>
        <Input
          id="selected-website"
          name="website"
          onChange={(event) => onChange({ website: event.target.value })}
          placeholder="https://..."
          value={draft.website}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="selected-image">Image URL</Label>
        <Input
          id="selected-image"
          name="image_url"
          onChange={(event) => onChange({ image_url: event.target.value })}
          placeholder="https://..."
          value={draft.image_url}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="selected-rating">Rating</Label>
        <Input
          id="selected-rating"
          name="rating"
          onChange={(event) => onChange({ rating: event.target.value })}
          placeholder="4.7"
          value={draft.rating}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="selected-reviews">Review count</Label>
        <Input
          id="selected-reviews"
          name="review_count"
          onChange={(event) => onChange({ review_count: event.target.value })}
          placeholder="183"
          value={draft.review_count}
        />
      </div>

      <div className="sm:col-span-2 flex flex-wrap gap-3 pt-1">
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <input
            checked={draft.is_active}
            className="rounded border-slate-300 text-slate-900"
            name="is_active"
            onChange={(event) => onChange({ is_active: event.target.checked })}
            type="checkbox"
          />
          Active
        </label>
        <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
          <input
            checked={draft.is_publicly_visitable}
            className="rounded border-slate-300 text-slate-900"
            name="is_publicly_visitable"
            onChange={(event) => onChange({ is_publicly_visitable: event.target.checked })}
            type="checkbox"
          />
          Publicly visitable
        </label>
      </div>

      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="selected-source-metadata">Source metadata</Label>
        <Textarea
          id="selected-source-metadata"
          name="source_metadata"
          onChange={(event) => onChange({ source_metadata: event.target.value })}
          rows={4}
          value={draft.source_metadata}
        />
      </div>
    </div>
  );
}

export function AdminMapExplorer({
  candidates,
  places,
  quests,
  states,
}: AdminMapExplorerProps) {
  const preferredState = useMemo(
    () => states.find((state) => state.code === "IL") ?? states[0] ?? null,
    [states],
  );

  const [activeTab, setActiveTab] = useState<ExplorerTab>("google");

  const [googleSearch, setGoogleSearch] = useState<GoogleSearchState>(() => ({
    center: null,
    error: null,
    locationQuery: preferredState?.code === "IL" ? "Chicago" : "",
    predictions: [],
    radiusMiles: "4",
    stateId: preferredState?.id ?? states[0]?.id ?? "",
    status: "idle",
    types: [...defaultGoogleBusinessTypes],
  }));
  const [googleResultState, setGoogleResultState] = useState<GooglePlaceDraftState>({
    draft: null,
    selectedId: null,
  });
  const [googleDetailState, setGoogleDetailState] = useState<GoogleResultDetailState>({
    data: null,
    error: null,
    status: "idle",
  });
  const [googleResults, setGoogleResults] = useState<GoogleNearbyBusinessResult[]>([]);
  const [googleLoading, setGoogleLoading] = useState(false);

  const [storedSearch, setStoredSearch] = useState<StoredSearchState>(() => ({
    activeOnly: true,
    query: "",
    publicOnly: true,
    stateId: preferredState?.id ?? states[0]?.id ?? "",
  }));
  const [storedResults, setStoredResults] = useState<StoredSearchResult[]>([]);
  const [storedLoading, setStoredLoading] = useState(false);
  const [storedDraft, setStoredDraft] = useState<PlaceDraft | null>(null);
  const [storedSelectedId, setStoredSelectedId] = useState<string | null>(null);

  const [manualDraft, setManualDraft] = useState<PlaceDraft>(() =>
    buildManualDraft(DEFAULT_CENTER, preferredState ?? states[0] ?? null),
  );
  const [manualPin, setManualPin] = useState<{ latitude: number; longitude: number } | null>(null);

  const stateById = useMemo(() => new Map(states.map((state) => [state.id, state])), [states]);
  const candidateByPlaceId = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.place_id, candidate])),
    [candidates],
  );
  const questByPlaceId = useMemo(() => {
    const entries = quests
      .filter((quest) => quest.place_id)
      .map((quest) => [quest.place_id as string, quest] as const);

    return new Map(entries);
  }, [quests]);

  const googleApi = useGoogleMapsLoader(GOOGLE_MAPS_API_KEY);
  const debouncedGoogleQuery = useDebouncedValue(googleSearch.locationQuery, 240);
  const selectedGoogleResult = googleResults.find((result) => result.id === googleResultState.selectedId) ?? null;
  const selectedGoogleMatch = selectedGoogleResult
    ? matchInternalPlaceFromGoogleResult(selectedGoogleResult, places)
    : null;
  const selectedGoogleCandidate = selectedGoogleMatch
    ? candidateByPlaceId.get(selectedGoogleMatch.id) ?? null
    : null;
  const selectedGoogleQuest = selectedGoogleMatch
    ? questByPlaceId.get(selectedGoogleMatch.id) ?? null
    : null;

  const selectedStoredPlace = storedResults.find((place) => place.id === storedSelectedId) ?? null;
  const selectedStoredCandidate = selectedStoredPlace
    ? candidateByPlaceId.get(selectedStoredPlace.id) ?? null
    : null;
  const selectedStoredQuest = selectedStoredPlace
    ? questByPlaceId.get(selectedStoredPlace.id) ?? null
    : null;
  const googleSelectedState = stateById.get(googleSearch.stateId) ?? null;
  const manualSelectedState = stateById.get(manualDraft.state_id) ?? null;

  const googleCenter = googleSearch.center ?? DEFAULT_CENTER;
  const storedCenter = storedResults[0]
    ? {
        latitude: storedResults[0].latitude,
        longitude: storedResults[0].longitude,
        label: storedResults[0].city
          ? `${storedResults[0].city}${storedResults[0].state_code ? `, ${storedResults[0].state_code}` : storedResults[0].state?.code ? `, ${storedResults[0].state.code}` : ""}`
          : storedResults[0].state?.name ?? DEFAULT_CENTER.label,
      }
    : DEFAULT_CENTER;

  const storedSelectedState = stateById.get(storedSearch.stateId) ?? preferredState ?? null;

  function updateGoogleSearch<K extends keyof GoogleSearchState>(key: K, value: GoogleSearchState[K]) {
    setGoogleSearch((current) => ({ ...current, [key]: value }));
  }

  function updateStoredSearch<K extends keyof StoredSearchState>(key: K, value: StoredSearchState[K]) {
    setStoredSearch((current) => ({ ...current, [key]: value }));
  }

  function resetGoogleSearch() {
    setGoogleSearch({
      center: null,
      error: null,
      locationQuery: preferredState?.code === "IL" ? "Chicago" : "",
      predictions: [],
      radiusMiles: "4",
      stateId: preferredState?.id ?? states[0]?.id ?? "",
      status: "idle",
      types: [...defaultGoogleBusinessTypes],
    });
    setGoogleResults([]);
    setGoogleLoading(false);
    setGoogleResultState({ draft: null, selectedId: null });
    setGoogleDetailState({ data: null, error: null, status: "idle" });
  }

  function resetStoredSearch() {
    setStoredSearch({
      activeOnly: true,
      query: "",
      publicOnly: true,
      stateId: preferredState?.id ?? states[0]?.id ?? "",
    });
    setStoredResults([]);
    setStoredLoading(false);
    setStoredDraft(null);
    setStoredSelectedId(null);
  }

  function selectGooglePlace(result: GoogleNearbyBusinessResult) {
    setGoogleResultState((current) => ({ ...current, selectedId: result.id }));
    setGoogleDetailState({ data: null, error: null, status: "loading" });

    const safeState = googleSelectedState;

    const googleMaps = googleApi.google?.maps ?? null;

    if (!googleMaps?.places) {
      setGoogleDetailState({ data: null, error: "Google Maps is not ready yet.", status: "error" });
      return;
    }

    const serviceHost = document.createElement("div");
    const service = new googleMaps.places.PlacesService(serviceHost);

    service.getDetails(
      {
        fields: [
          "address_components",
          "business_status",
          "formatted_address",
          "formatted_phone_number",
          "geometry",
          "name",
          "photos",
          "place_id",
          "rating",
          "types",
          "user_ratings_total",
          "website",
        ],
        placeId: result.placeId,
      },
      (place, status) => {
        if (status !== googleMaps.places.PlacesServiceStatus.OK || !place) {
          setGoogleDetailState({
            data: null,
            error: "We could not load Google place details.",
            status: "error",
          });
          return;
        }

        const existingPlace = matchInternalPlaceFromGoogleResult(result, places);

        setGoogleDetailState({ data: place, error: null, status: "success" });
        setGoogleResultState({
          draft: buildGoogleDraft(
            result,
            place,
            safeState,
            googleSearch.center ?? DEFAULT_CENTER,
            existingPlace,
            googleSearch.locationQuery,
          ),
          selectedId: result.id,
        });
      },
    );
  }

  function selectStoredPlace(place: PlaceWithRelations) {
    setStoredSelectedId(place.id);
    setStoredDraft(buildStoredDraft(place));
  }

  async function runGoogleSearch() {
    const googleMaps = googleApi.google?.maps ?? null;

    if (!googleMaps?.places) {
      setGoogleSearch((current) => ({
        ...current,
        error: "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable Google Maps.",
        status: "error",
      }));
      return;
    }

    const selectedStateForSearch = googleSelectedState;

    if (!selectedStateForSearch) {
      setGoogleSearch((current) => ({
        ...current,
        error: "Choose a state before searching Google places.",
        status: "error",
      }));
      return;
    }

    let resolvedCenter = googleSearch.center;

    if (!resolvedCenter) {
      const trimmedQuery = googleSearch.locationQuery.trim();

      if (!trimmedQuery) {
        setGoogleSearch((current) => ({
          ...current,
          error: "Enter a city or address before searching nearby businesses.",
          status: "error",
        }));
        return;
      }

      setGoogleSearch((current) => ({ ...current, error: null, status: "loading" }));
      const serviceHost = document.createElement("div");
      const place = await resolveGoogleCenterFromQuery(trimmedQuery, serviceHost);

      if (!place?.geometry?.location) {
        setGoogleSearch((current) => ({
          ...current,
          error: "We could not resolve that location. Try a more specific city or address.",
          status: "error",
        }));
        return;
      }

      resolvedCenter = {
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
        label: place.formatted_address ?? place.name ?? trimmedQuery,
        placeId: place.place_id ?? null,
        resolvedFrom: "geocode",
        stateCode: selectedStateForSearch.code,
        stateName: selectedStateForSearch.name,
      };
      setGoogleSearch((current) => ({ ...current, center: resolvedCenter }));
    }

    const radiusMiles = Number(googleSearch.radiusMiles) || 4;
    const radiusMeters = radiusMiles * 1609.34;
    setGoogleSearch((current) => ({
      ...current,
      error: null,
      status: "loading",
    }));
    setGoogleLoading(true);

    try {
      const results = await searchNearbyGooglePlaces(
        resolvedCenter,
        radiusMeters,
        googleSearch.types,
        document.createElement("div"),
      );

      setGoogleResults(results);
      setGoogleResultState({ draft: null, selectedId: results[0]?.id ?? null });
      setGoogleDetailState({ data: null, error: null, status: "idle" });
      setGoogleSearch((current) => ({
        ...current,
        center: resolvedCenter,
        error: null,
        predictions: [],
        status: "success",
      }));
      setGoogleLoading(false);

      if (results[0]) {
        selectGooglePlace(results[0]);
      }
    } catch (error) {
      setGoogleLoading(false);
      setGoogleSearch((current) => ({
        ...current,
        error:
          error instanceof Error
            ? error.message
            : "We could not load Google places right now.",
        status: "error",
      }));
      setGoogleResults([]);
      setGoogleResultState({ draft: null, selectedId: null });
    }
  }

  async function runStoredSearch() {
    setStoredLoading(true);
    const selectedStateForSearch = stateById.get(storedSearch.stateId) ?? preferredState ?? null;

    const results = buildStoredResults(
      places,
      candidateByPlaceId,
      questByPlaceId,
      storedSearch.query,
      storedSearch.stateId,
      storedSearch.activeOnly,
      storedSearch.publicOnly,
    );

    const firstResult = results[0] ?? null;

    if (firstResult) {
      setStoredSelectedId(firstResult.id);
      setStoredDraft(buildStoredDraft(firstResult));
    } else {
      setStoredSelectedId(null);
      setStoredDraft(null);
    }

    setStoredResults(results);
    setStoredLoading(false);

    if (selectedStateForSearch) {
      setGoogleSearch((current) => ({
        ...current,
        center: current.center ?? {
          latitude: firstResult?.latitude ?? DEFAULT_CENTER.latitude,
          longitude: firstResult?.longitude ?? DEFAULT_CENTER.longitude,
          label: selectedStateForSearch.name,
          placeId: null,
          resolvedFrom: "default",
          stateCode: selectedStateForSearch.code,
          stateName: selectedStateForSearch.name,
        },
      }));
    }
  }

  function handleManualMapClick(point: { latitude: number; longitude: number }) {
    const state = manualSelectedState;

    if (!state) {
      return;
    }

    const nextDraft = {
      ...manualDraft,
      latitude: String(point.latitude),
      longitude: String(point.longitude),
      source_metadata: JSON.stringify(
        {
          admin_mode: "manual_add",
          map_center: {
            latitude: point.latitude,
            longitude: point.longitude,
          },
        },
        null,
        2,
      ),
      state_code: state.code,
      state_id: state.id,
    };

    setManualPin(point);
    setManualDraft(nextDraft);
    setActiveTab("manual");
  }

  const googleMarkers = useMemo(
    () =>
      googleResults.map((result) => ({
        id: result.id,
        kind: result.id === googleResultState.selectedId ? ("selected" as const) : ("google" as const),
        latitude: result.latitude,
        longitude: result.longitude,
        subtitle: result.formattedAddress ?? result.vicinity,
        title: result.name,
      })),
    [googleResultState.selectedId, googleResults],
  );

  const storedMarkers = useMemo(
    () =>
      storedResults.map((place) => ({
        id: place.id,
        kind:
          place.id === storedSelectedId ? ("selected" as const) : ("stored" as const),
        latitude: place.latitude,
        longitude: place.longitude,
        subtitle: place.address ?? place.city,
        title: place.name,
      })),
    [storedResults, storedSelectedId],
  );

  const manualMarkers = useMemo(
    () => [
      ...places
        .filter((place) => {
          const placeStateId = place.state?.id ?? place.state_id ?? null;
          const selectedStateId = manualDraft.state_id || (preferredState?.id ?? "");
          return !selectedStateId || placeStateId === selectedStateId;
        })
        .slice(0, 18)
        .map((place) => ({
          id: place.id,
          kind: "stored" as const,
          latitude: place.latitude,
          longitude: place.longitude,
          subtitle: place.address ?? place.city,
          title: place.name,
        })),
      ...(manualPin
        ? [
            {
              id: "manual-pin",
              kind: "manual" as const,
              latitude: manualPin.latitude,
              longitude: manualPin.longitude,
              subtitle: "Draft pin",
              title: "Draft pin",
            },
          ]
        : []),
    ],
    [manualDraft.state_id, manualPin, places, preferredState?.id],
  );

  const activeCenter = useMemo(() => {
    if (activeTab === "google") {
      return googleSearch.center ?? DEFAULT_CENTER;
    }

    if (activeTab === "stored") {
      return storedResults[0]
        ? {
            latitude: storedResults[0].latitude,
            longitude: storedResults[0].longitude,
            label: storedResults[0].city
              ? `${storedResults[0].city}${storedResults[0].state_code ? `, ${storedResults[0].state_code}` : storedResults[0].state?.code ? `, ${storedResults[0].state.code}` : ""}`
              : storedResults[0].state?.name ?? DEFAULT_CENTER.label,
          }
        : DEFAULT_CENTER;
    }

    return manualPin
      ? {
          latitude: manualPin.latitude,
          longitude: manualPin.longitude,
          label: "Draft pin",
        }
      : {
          latitude: Number(manualDraft.latitude) || DEFAULT_CENTER.latitude,
          longitude: Number(manualDraft.longitude) || DEFAULT_CENTER.longitude,
          label: "Manual pin",
        };
  }, [
    activeTab,
    googleSearch.center,
    manualDraft.latitude,
    manualDraft.longitude,
    manualPin,
    storedResults,
  ]);

  useEffect(() => {
    if (activeTab !== "google" || !googleApi.google?.maps?.places || !debouncedGoogleQuery.trim()) {
      return;
    }

    let active = true;

    getGoogleAutocompletePredictions(debouncedGoogleQuery).then((predictions) => {
      if (!active) {
        return;
      }

      setGoogleSearch((current) => ({
        ...current,
        predictions,
      }));
    });

    return () => {
      active = false;
    };
  }, [activeTab, debouncedGoogleQuery, googleApi.google?.maps?.places]);

  function handleGooglePredictionClick(prediction: google.maps.places.AutocompletePrediction) {
    const googleMaps = googleApi.google?.maps ?? null;

    if (!googleMaps?.places) {
      return;
    }

    const serviceHost = document.createElement("div");

    resolveGoogleCenterFromPrediction(prediction.place_id, serviceHost).then((place) => {
      const location = place?.geometry?.location;

      if (!location) {
        return;
      }

      const selectedStateForSearch = googleSelectedState;

      if (!selectedStateForSearch) {
        return;
      }

      setGoogleSearch((current) => ({
        ...current,
        center: {
          latitude: location.lat(),
          longitude: location.lng(),
          label: place.formatted_address ?? prediction.description,
          placeId: place.place_id ?? prediction.place_id,
          resolvedFrom: "autocomplete",
          stateCode: selectedStateForSearch.code,
          stateName: selectedStateForSearch.name,
        },
        locationQuery: place.formatted_address ?? prediction.description,
        predictions: [],
      }));
    });
  }

  function updateManualDraft(patch: Partial<PlaceDraft>) {
    setManualDraft((current) => ({ ...current, ...patch }));
  }

  const googleSelectedPlaceStatus = selectedGoogleMatch
    ? getStoredPlaceStatus(selectedGoogleMatch.id, candidateByPlaceId, questByPlaceId)
    : "new";

  const storedSelectedPlaceStatus = selectedStoredPlace
    ? getStoredPlaceStatus(selectedStoredPlace.id, candidateByPlaceId, questByPlaceId)
    : "new";

  const googleResultsSummary = googleResults.length
    ? `${googleResults.length} businesses found, ${googleResults.filter((result) => matchInternalPlaceFromGoogleResult(result, places)).length} already stored.`
    : googleSearch.status === "success"
      ? "No Google businesses matched this search."
      : "Search Google to see nearby businesses.";

  const storedResultsSummary = storedLoading
    ? "Searching stored places…"
    : storedResults.length
      ? `${storedResults.length} stored places matched this search.`
      : "No stored places matched this search.";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 xl:grid-cols-[1.14fr_0.86fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-sky-100 text-sky-900">Google Maps + Places</Badge>
              <Badge variant="outline">Interactive admin map</Badge>
            </div>
            <CardTitle className="font-display text-3xl tracking-tight text-slate-950">
              Discover nearby businesses, import the right place, and turn it into a quest source
            </CardTitle>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              This explorer uses the Google Maps JavaScript API for the real map canvas and the
              Google Places library for autocomplete, nearby search, and place details. The
              workflows stay separate: discover on Google, search stored internal places, or drop a
              manual pin to seed the pipeline.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {[
              {
                detail: "Nearby businesses discovered through Google Places and filtered by type.",
                label: "Google discovery",
                value: "Live",
              },
              {
                detail: "Search the internal RoveXP places table and review the existing pipeline.",
                label: "Stored places",
                value: "Internal",
              },
              {
                detail: "Click the map to seed a manual pin, then save or generate a candidate.",
                label: "Manual add",
                value: "Pin",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                <p className="mt-2 font-display text-2xl font-semibold text-slate-950">
                  {item.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-950 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Workflow</p>
              <h2 className="font-display text-2xl tracking-tight">
                1. Choose a mode  2. Search or drop a pin  3. Import into RoveXP
              </h2>
              <p className="text-sm leading-7 text-slate-300">
                Google discovery is for finding a real nearby business. Stored search is for
                searching the internal database. Manual add is for intentional pin-drop creation.
                No part of this screen auto-publishes live quests.
              </p>
            </div>

            <div className="space-y-3">
              {[
                "Google discovery uses a live map plus Google Places autocomplete and nearby search.",
                "Stored search only scans the places already in RoveXP.",
                "Manual add lets you click the map, save the place, then generate a candidate later.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/dashboard/places">
                  <ArrowRight className="size-4 rotate-180" />
                  Back to places
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10"
              >
                <Link href="/dashboard/places/nearby">
                  <Sparkles className="size-4" />
                  Nearby generator
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <CardContent className="space-y-5 p-6">
          <div className="flex flex-wrap gap-2">
            {[
              { key: "google" as const, label: "Google discovery" },
              { key: "stored" as const, label: "Stored internal places" },
              { key: "manual" as const, label: "Manual pin add" },
            ].map((tab) => (
              <button
                key={tab.key}
                className={[
                  "rounded-full border px-4 py-2 text-sm font-medium transition-all",
                  activeTab === tab.key
                    ? "border-transparent bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                ].join(" ")}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "google" ? (
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-none">
                <CardContent className="space-y-5 p-6">
                  <div className="grid gap-4 xl:grid-cols-[1.2fr_0.9fr_0.75fr]">
                    <div className="space-y-2">
                      <Label htmlFor="google-state">State</Label>
                      <select
                        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
                        id="google-state"
                        onChange={(event) => updateGoogleSearch("stateId", event.target.value)}
                        value={googleSearch.stateId}
                      >
                        <option value="">Choose a state</option>
                        {states.map((state) => (
                          <option key={state.id} value={state.id}>
                            {state.code} · {state.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500">
                        Used to frame the search and populate imported places.
                      </p>
                    </div>

                    <div className="space-y-2 relative">
                      <Label htmlFor="google-location">Location or address</Label>
                      <Input
                        id="google-location"
                        onChange={(event) =>
                          setGoogleSearch((current) => ({
                            ...current,
                            locationQuery: event.target.value,
                            predictions: [],
                          }))
                        }
                        placeholder="Chicago, River North, 201 E Randolph St"
                        value={googleSearch.locationQuery}
                      />
                      {googleSearch.predictions.length > 0 ? (
                        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                          {googleSearch.predictions.slice(0, 5).map((prediction) => (
                            <button
                              key={prediction.place_id}
                              className="w-full rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                              onClick={() => handleGooglePredictionClick(prediction)}
                              type="button"
                            >
                              <div className="font-medium text-slate-950">
                                {prediction.structured_formatting.main_text}
                              </div>
                              <div className="text-xs text-slate-500">
                                {prediction.structured_formatting.secondary_text}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="google-radius">Radius</Label>
                      <Input
                        id="google-radius"
                        min={1}
                        max={25}
                        onChange={(event) => updateGoogleSearch("radiusMiles", event.target.value)}
                        type="number"
                        value={googleSearch.radiusMiles}
                      />
                      <p className="text-xs text-slate-500">Miles around the selected center.</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">Business types</p>
                        <p className="text-xs text-slate-500">
                          Pick one or more Google business categories to search nearby.
                        </p>
                      </div>
                      <Button
                        className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        onClick={() => updateGoogleSearch("types", [...defaultGoogleBusinessTypes])}
                        size="sm"
                        type="button"
                        variant="outline"
                      >
                        Reset types
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {googleBusinessTypeOptions.map((option) => (
                        <button
                          key={option.key}
                          className={[
                            "group inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-all",
                            googleSearch.types.includes(option.key)
                              ? "border-transparent bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                              : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
                          ].join(" ")}
                          onClick={() => {
                            setGoogleSearch((current) => ({
                              ...current,
                              types: current.types.includes(option.key)
                                ? current.types.filter((item) => item !== option.key)
                                : [...current.types, option.key],
                            }));
                          }}
                          title={option.description}
                          type="button"
                        >
                          <span
                            className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${option.tone}`}
                          />
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      className="bg-slate-950 text-white hover:bg-slate-800"
                      disabled={googleLoading || googleApi.status !== "ready"}
                      onClick={runGoogleSearch}
                      type="button"
                    >
                      <Search className="size-4" />
                      {googleLoading ? "Searching Google Places…" : "Search Google Places"}
                    </Button>
                    <Button
                      className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      onClick={resetGoogleSearch}
                      type="button"
                      variant="outline"
                    >
                      <RefreshCcw className="size-4" />
                      Reset search
                    </Button>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">
                        {googleSearch.center
                          ? `Center: ${googleSearch.center.label}`
                          : "Set a location to begin"}
                      </Badge>
                      <Badge variant="outline">
                        {googleSearch.status === "success"
                          ? "Google search ready"
                          : googleSearch.status === "loading"
                            ? "Searching Google Places…"
                            : "Google discovery"}
                      </Badge>
                    </div>
                  </div>

                  {googleSearch.error ? (
                    <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
                      {googleSearch.error}
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
                <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
                  <CardHeader className="space-y-3 border-b border-white/10 p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-white/10 text-white">
                        <MapIcon className="mr-1.5 size-3.5" />
                        Google map
                      </Badge>
                      <Badge className="bg-cyan-100 text-cyan-950">
                        {googleResults.length} results
                      </Badge>
                      <Badge className="bg-white/10 text-white">
                        {googleSearch.status === "success" ? "Live Google data" : "Awaiting search"}
                      </Badge>
                    </div>
                    <CardTitle className="font-display text-2xl tracking-tight">
                      Search nearby businesses and click markers to inspect place details
                    </CardTitle>
                    <p className="max-w-3xl text-sm leading-7 text-slate-300">
                      The map stays visible even with zero results. Choose a location, then search
                      one or more business types. When a result is selected, you can import it into
                      the internal places table and continue through the existing quest candidate
                      review flow.
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4 p-0">
                    <GoogleMapCanvas
                      apiKey={GOOGLE_MAPS_API_KEY}
                      center={googleCenter}
                      emptyMessage="No Google Places matched this search yet. Try a wider radius or a different type combination."
                      markers={googleMarkers}
                      modeLabel="Google discovery"
                      onMarkerSelect={(markerId) => {
                        const result = googleResults.find((item) => item.id === markerId);
                        if (result) {
                          selectGooglePlace(result);
                        }
                      }}
                      radiusMiles={Number(googleSearch.radiusMiles) || 4}
                      selectedMarkerId={googleResultState.selectedId}
                    />
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                    <CardHeader className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Google results
                      </p>
                      <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                        {googleResultsSummary}
                      </CardTitle>
                      <p className="text-sm leading-7 text-slate-600">
                        Results are drawn from Google Places, not the internal database. Selected
                        results can be imported into RoveXP and then promoted into the candidate
                        workflow.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {googleResults.length === 0 ? (
                        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
                          Search Google to discover nearby businesses. The real map stays visible
                          even when there are no markers yet.
                        </div>
                      ) : (
                        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                          {googleResults.map((result) => {
                            const match = result.placeId
                              ? matchInternalPlaceFromGoogleResult(result, places)
                              : null;
                            const candidate = match ? candidateByPlaceId.get(match.id) ?? null : null;
                            const quest = match ? questByPlaceId.get(match.id) ?? null : null;
                            const selected = result.id === googleResultState.selectedId;

                            return (
                              <button
                                key={result.id}
                                className={[
                                  "w-full rounded-[1.5rem] border p-4 text-left transition-all",
                                  selected
                                    ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                ].join(" ")}
                                onClick={() => selectGooglePlace(result)}
                                type="button"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium">{result.name}</p>
                                      <Badge className={placeTypeTone(result.primaryType ?? result.placeTypes[0] ?? "")}>
                                        {formatGoogleBusinessType(result.placeTypes)}
                                      </Badge>
                                      {mapResultSummary(
                                        quest
                                          ? "quest"
                                          : candidate
                                            ? "candidate"
                                            : match
                                              ? "stored"
                                              : "new",
                                        quest
                                          ? "Live quest"
                                          : candidate
                                            ? "Candidate"
                                            : match
                                              ? "Stored"
                                              : "New",
                                      )}
                                    </div>
                                    <p className={selected ? "text-sm text-slate-300" : "text-sm text-slate-600"}>
                                      {result.formattedAddress ?? result.vicinity ?? "No address available"}
                                    </p>
                                  </div>

                                  <div className="flex flex-col items-end gap-2">
                                    <Badge variant="outline">
                                      {result.distanceMiles.toFixed(1)} mi
                                    </Badge>
                                    {quest ? (
                                      <Badge className="bg-amber-100 text-amber-950">Live quest</Badge>
                                    ) : candidate ? (
                                      <Badge className="bg-cyan-100 text-cyan-950">Candidate</Badge>
                                    ) : match ? (
                                      <Badge className="bg-slate-100 text-slate-900">Stored</Badge>
                                    ) : (
                                      <Badge className="bg-emerald-100 text-emerald-950">New</Badge>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                    <CardHeader className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Selected Google place
                      </p>
                      <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                        {selectedGoogleResult ? selectedGoogleResult.name : "Pick a result from the map or list"}
                      </CardTitle>
                      <p className="text-sm leading-7 text-slate-600">
                        Import a selected Google place into the internal places table, then turn it
                        into a quest candidate through the normal admin workflow.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedGoogleResult ? (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={placeTypeTone(selectedGoogleResult.primaryType ?? selectedGoogleResult.placeTypes[0] ?? "")}>
                              {formatGoogleBusinessType(selectedGoogleResult.placeTypes)}
                            </Badge>
                            <Badge className={pipelineTone(googleSelectedPlaceStatus)}>
                              {pipelineLabel(googleSelectedPlaceStatus)}
                            </Badge>
                            <Badge variant="outline">
                              {googleDetailState.status === "loading"
                                ? "Loading details…"
                                : googleDetailState.status === "success"
                                  ? "Google details loaded"
                                  : "Google result"}
                            </Badge>
                          </div>

                          <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 text-sm">
                            <div className="grid gap-1">
                              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                Coordinates
                              </span>
                              <span className="font-medium text-slate-950">
                                {formatCoordinates(selectedGoogleResult.latitude, selectedGoogleResult.longitude)}
                              </span>
                            </div>
                            <div className="grid gap-1">
                              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                Address
                              </span>
                              <span className="font-medium text-slate-950">
                                {selectedGoogleResult.formattedAddress ?? selectedGoogleResult.vicinity ?? "No address available"}
                              </span>
                            </div>
                            <div className="grid gap-1 sm:grid-cols-2">
                              <div className="grid gap-1">
                                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                  Rating
                                </span>
                                <span className="font-medium text-slate-950">
                                  {selectedGoogleResult.rating
                                    ? `${selectedGoogleResult.rating.toFixed(1)} / 5`
                                    : "N/A"}
                                </span>
                              </div>
                              <div className="grid gap-1">
                                <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                  Reviews
                                </span>
                                <span className="font-medium text-slate-950">
                                  {selectedGoogleResult.userRatingsTotal ?? "N/A"}
                                </span>
                              </div>
                            </div>
                          </div>

                          {selectedGoogleCandidate ? (
                            <Button asChild className="w-full bg-cyan-100 text-cyan-950 hover:bg-cyan-200">
                              <Link href={`/dashboard/candidates?edit=${selectedGoogleCandidate.id}`}>
                                <ExternalLink className="size-4" />
                                Open existing candidate
                              </Link>
                            </Button>
                          ) : null}

                          {selectedGoogleQuest ? (
                            <Button asChild className="w-full bg-amber-100 text-amber-950 hover:bg-amber-200">
                              <Link href={`/dashboard/quests?edit=${selectedGoogleQuest.id}`}>
                                <ExternalLink className="size-4" />
                                Open existing quest
                              </Link>
                            </Button>
                          ) : null}

                          <form className="space-y-3">
                            <input name="id" type="hidden" value={googleResultState.draft?.id ?? ""} />
                            <input
                              name="external_source"
                              type="hidden"
                              value={googleResultState.draft?.external_source ?? "google_places"}
                            />
                            <input
                              name="external_id"
                              type="hidden"
                              value={googleResultState.draft?.external_id ?? selectedGoogleResult.placeId}
                            />
                            <input name="state_id" type="hidden" value={googleResultState.draft?.state_id ?? googleSelectedState?.id ?? ""} />
                            <input
                              name="state_code"
                              type="hidden"
                              value={googleResultState.draft?.state_code ?? googleSelectedState?.code ?? ""}
                            />
                            <PlaceEditorFields
                              draft={
                                googleResultState.draft ??
                                buildGoogleDraft(
                                  selectedGoogleResult,
                                  googleDetailState.data,
                                  googleSelectedState,
                                  googleSearch.center ?? DEFAULT_CENTER,
                                  selectedGoogleMatch,
                                  googleSearch.locationQuery,
                                )
                              }
                              onChange={(patch) => {
                                setGoogleResultState((current) => {
                                  const draft =
                                    current.draft ??
                                    buildGoogleDraft(
                                      selectedGoogleResult,
                                      googleDetailState.data,
                                      googleSelectedState,
                                      googleSearch.center ?? DEFAULT_CENTER,
                                      selectedGoogleMatch,
                                      googleSearch.locationQuery,
                                    );

                                  return {
                                    ...current,
                                    draft: {
                                      ...draft,
                                      ...patch,
                                    },
                                  };
                                });
                              }}
                            />

                            <div className="flex flex-wrap gap-3">
                              <Button
                                formAction={savePlaceFromMapAction}
                                className="bg-slate-950 text-white hover:bg-slate-800"
                                type="submit"
                              >
                                <Layers3 className="size-4" />
                                {selectedGoogleMatch ? "Update stored location" : "Import place"}
                              </Button>
                              {!selectedGoogleMatch ? (
                                <Button
                                  formAction={savePlaceAndGenerateCandidateAction}
                                  className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                                  type="submit"
                                >
                                  <Sparkles className="size-4" />
                                  Import + generate candidate
                                </Button>
                              ) : !selectedGoogleCandidate && !selectedGoogleQuest ? (
                                <Button
                                  formAction={generateQuestCandidateAction}
                                  className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                                  type="submit"
                                >
                                  <Compass className="size-4" />
                                  Generate candidate from stored location
                                </Button>
                              ) : null}
                            </div>
                          </form>

                          {googleDetailState.error ? (
                            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm leading-6 text-rose-900">
                              {googleDetailState.error}
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
                          Search Google Places, then choose a nearby result from the map or result
                          list. The selected place will appear here with import and candidate
                          actions.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "stored" ? (
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-none">
                <CardContent className="space-y-5 p-6">
                  <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr_0.75fr]">
                    <div className="space-y-2">
                      <Label htmlFor="stored-state">State</Label>
                      <select
                        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
                        id="stored-state"
                        onChange={(event) => updateStoredSearch("stateId", event.target.value)}
                        value={storedSearch.stateId}
                      >
                        <option value="">Choose a state</option>
                        {states.map((state) => (
                          <option key={state.id} value={state.id}>
                            {state.code} · {state.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500">
                        Search only the places already stored in the RoveXP database.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="stored-query">Search stored places</Label>
                      <Input
                        id="stored-query"
                        onChange={(event) => updateStoredSearch("query", event.target.value)}
                        placeholder="Cloud Gate, Chicago, coffee, museum..."
                        value={storedSearch.query}
                      />
                      <p className="text-xs text-slate-500">
                        Matches internal place name, address, city, or type.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row xl:flex-col">
                      <Button
                        className="bg-slate-950 text-white hover:bg-slate-800"
                        disabled={storedLoading}
                        onClick={runStoredSearch}
                        type="button"
                      >
                        <Search className="size-4" />
                        {storedLoading ? "Searching stored places…" : "Search stored places"}
                      </Button>
                      <Button
                        className="border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        onClick={resetStoredSearch}
                        type="button"
                        variant="outline"
                      >
                        <RefreshCcw className="size-4" />
                        Reset search
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        checked={storedSearch.activeOnly}
                        className="rounded border-slate-300 text-slate-900"
                        onChange={(event) => updateStoredSearch("activeOnly", event.target.checked)}
                        type="checkbox"
                      />
                      Active only
                    </label>
                    <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                      <input
                        checked={storedSearch.publicOnly}
                        className="rounded border-slate-300 text-slate-900"
                        onChange={(event) => updateStoredSearch("publicOnly", event.target.checked)}
                        type="checkbox"
                      />
                      Publicly visitable
                    </label>
                    <Badge variant="outline">{formatStateLabel(storedSelectedState)}</Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
                <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
                  <CardHeader className="space-y-3 border-b border-white/10 p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-white/10 text-white">
                        <MapIcon className="mr-1.5 size-3.5" />
                        Stored places map
                      </Badge>
                      <Badge className="bg-cyan-100 text-cyan-950">
                        {storedResults.length} results
                      </Badge>
                      <Badge className="bg-white/10 text-white">Internal database only</Badge>
                    </div>
                    <CardTitle className="font-display text-2xl tracking-tight">
                      Search the internal places table and inspect pipeline state
                    </CardTitle>
                    <p className="max-w-3xl text-sm leading-7 text-slate-300">
                      This mode is intentionally honest: it only searches places already stored in
                      RoveXP. Use it to review the imported corpus, inspect candidates, and open
                      existing quests.
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4 p-0">
                    <GoogleMapCanvas
                      apiKey={GOOGLE_MAPS_API_KEY}
                      center={storedCenter}
                      emptyMessage="No stored places matched this search. Clear filters or switch to Google discovery."
                      markers={storedMarkers}
                      modeLabel="Stored places"
                      onMarkerSelect={(markerId) => {
                        const place = storedResults.find((item) => item.id === markerId);
                        if (place) {
                          selectStoredPlace(place);
                        }
                      }}
                      radiusMiles={4}
                      selectedMarkerId={storedSelectedId}
                    />
                  </CardContent>
                </Card>

                <div className="space-y-6">
                  <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                    <CardHeader className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Stored results
                      </p>
                      <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                        {storedResultsSummary}
                      </CardTitle>
                      <p className="text-sm leading-7 text-slate-600">
                        Search only the internal database. If nothing matches, widen the query or
                        switch to Google discovery.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {storedResults.length === 0 ? (
                        <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
                          No stored places matched this search. Try a broader query or a different
                          state filter.
                        </div>
                      ) : (
                        <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
                          {storedResults.map((place) => {
                            const selected = place.id === storedSelectedId;
                            return (
                              <button
                                key={place.id}
                                className={[
                                  "w-full rounded-[1.5rem] border p-4 text-left transition-all",
                                  selected
                                    ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                                    : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                                ].join(" ")}
                                onClick={() => selectStoredPlace(place)}
                                type="button"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="space-y-2">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="font-medium">{place.name}</p>
                                      <Badge className={placeTypeTone(place.place_type)}>
                                        {placeTypeLabel(place.place_type)}
                                      </Badge>
                                      <Badge className={pipelineTone(getStoredPlaceStatus(place.id, candidateByPlaceId, questByPlaceId))}>
                                        {pipelineLabel(getStoredPlaceStatus(place.id, candidateByPlaceId, questByPlaceId))}
                                      </Badge>
                                    </div>
                                    <p className={selected ? "text-sm text-slate-300" : "text-sm text-slate-600"}>
                                      {place.address ?? "No street address available"}
                                    </p>
                                    <p className={selected ? "text-xs text-slate-400" : "text-xs text-slate-500"}>
                                      {place.city ?? "Unknown city"}
                                      {place.state_code ? `, ${place.state_code}` : ""}
                                    </p>
                                  </div>

                                  <div className="flex flex-col items-end gap-2">
                                    <Badge variant="outline">
                                      {place.latitude.toFixed(2)}, {place.longitude.toFixed(2)}
                                    </Badge>
                                    {selectedStoredQuest ? (
                                      <Badge className="bg-amber-100 text-amber-950">Live quest</Badge>
                                    ) : selectedStoredCandidate ? (
                                      <Badge className="bg-cyan-100 text-cyan-950">Candidate</Badge>
                                    ) : (
                                      <Badge className="bg-slate-100 text-slate-900">Stored</Badge>
                                    )}
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                    <CardHeader className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Selected stored place
                      </p>
                      <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                        {selectedStoredPlace ? selectedStoredPlace.name : "Pick a stored place"}
                      </CardTitle>
                      <p className="text-sm leading-7 text-slate-600">
                        Review the imported record, open the existing candidate or quest, or send it
                        back into the candidate generator.
                      </p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedStoredPlace ? (
                        <>
                          <div className="flex flex-wrap gap-2">
                            <Badge className={placeTypeTone(selectedStoredPlace.place_type)}>
                              {placeTypeLabel(selectedStoredPlace.place_type)}
                            </Badge>
                            <Badge className={pipelineTone(storedSelectedPlaceStatus)}>
                              {pipelineLabel(storedSelectedPlaceStatus)}
                            </Badge>
                            <Badge variant="outline">
                              {selectedStoredPlace.is_publicly_visitable
                                ? "Publicly visitable"
                                : "Private"}
                            </Badge>
                          </div>

                          <div className="grid gap-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 text-sm">
                            <div className="grid gap-1">
                              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                Coordinates
                              </span>
                              <span className="font-medium text-slate-950">
                                {formatCoordinates(selectedStoredPlace.latitude, selectedStoredPlace.longitude)}
                              </span>
                            </div>
                            <div className="grid gap-1">
                              <span className="text-xs uppercase tracking-[0.2em] text-slate-500">
                                Address
                              </span>
                              <span className="font-medium text-slate-950">
                                {selectedStoredPlace.address ?? "No address available"}
                              </span>
                            </div>
                          </div>

                          {selectedStoredCandidate ? (
                            <Button asChild className="w-full bg-cyan-100 text-cyan-950 hover:bg-cyan-200">
                              <Link href={`/dashboard/candidates?edit=${selectedStoredCandidate.id}`}>
                                <ExternalLink className="size-4" />
                                Open existing candidate
                              </Link>
                            </Button>
                          ) : null}

                          {selectedStoredQuest ? (
                            <Button asChild className="w-full bg-amber-100 text-amber-950 hover:bg-amber-200">
                              <Link href={`/dashboard/quests?edit=${selectedStoredQuest.id}`}>
                                <ExternalLink className="size-4" />
                                Open existing quest
                              </Link>
                            </Button>
                          ) : null}

                          <form className="space-y-3">
                            <input name="id" type="hidden" value={storedDraft?.id ?? ""} />
                            <input
                              name="external_source"
                              type="hidden"
                              value={storedDraft?.external_source ?? ""}
                            />
                            <input
                              name="external_id"
                              type="hidden"
                              value={storedDraft?.external_id ?? ""}
                            />
                            <input name="state_id" type="hidden" value={storedDraft?.state_id ?? ""} />
                            <input
                              name="state_code"
                              type="hidden"
                              value={storedDraft?.state_code ?? ""}
                            />
                            <PlaceEditorFields
                              draft={storedDraft ?? buildStoredDraft(selectedStoredPlace)}
                              onChange={(patch) => {
                                setStoredDraft((current) => {
                                  const base = current ?? buildStoredDraft(selectedStoredPlace);
                                  return {
                                    ...base,
                                    ...patch,
                                  };
                                });
                              }}
                            />
                            <div className="flex flex-wrap gap-3">
                              <Button
                                formAction={savePlaceFromMapAction}
                                className="bg-slate-950 text-white hover:bg-slate-800"
                                type="submit"
                              >
                                <Layers3 className="size-4" />
                                Update location
                              </Button>
                              {!selectedStoredCandidate && !selectedStoredQuest ? (
                                <Button
                                  formAction={generateQuestCandidateAction}
                                  className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                                  type="submit"
                                >
                                  <Sparkles className="size-4" />
                                  Generate candidate from stored location
                                </Button>
                              ) : null}
                            </div>
                          </form>
                        </>
                      ) : (
                        <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5 text-sm leading-7 text-slate-600">
                          Search the internal places table, then choose a stored place to inspect its
                          candidate and quest state.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "manual" ? (
            <div className="space-y-6">
              <Card className="rounded-[2rem] border-white/70 bg-white/90 shadow-none">
                <CardContent className="space-y-5 p-6">
                  <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr_0.75fr]">
                    <div className="space-y-2">
                      <Label htmlFor="manual-state">State</Label>
                      <select
                        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
                        id="manual-state"
                        onChange={(event) => {
                          const nextState = stateById.get(event.target.value) ?? null;

                          setManualDraft((current) => ({
                            ...current,
                            state_code: nextState?.code ?? "",
                            state_id: nextState?.id ?? "",
                          }));
                        }}
                        value={manualDraft.state_id}
                      >
                        <option value="">Choose a state</option>
                        {states.map((state) => (
                          <option key={state.id} value={state.id}>
                            {state.code} · {state.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-slate-500">
                        Click the map to drop a pin, then save the place or place + candidate.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-name">Place name</Label>
                      <Input
                        id="manual-name"
                        onChange={(event) => updateManualDraft({ name: event.target.value })}
                        placeholder="New place name"
                        value={manualDraft.name}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="manual-place-type">Place type</Label>
                      <Input
                        id="manual-place-type"
                        onChange={(event) => updateManualDraft({ place_type: event.target.value })}
                        placeholder="landmark"
                        value={manualDraft.place_type}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                      {manualPin
                        ? `Draft pin: ${formatCoordinates(manualPin.latitude, manualPin.longitude)}`
                        : "Click the map to drop a pin"}
                    </Badge>
                    <Badge variant="outline">
                      {manualDraft.state_id ? formatStateLabel(stateById.get(manualDraft.state_id)) : "No state selected"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <div className="grid gap-6 xl:grid-cols-[1.22fr_0.78fr]">
                <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
                  <CardHeader className="space-y-3 border-b border-white/10 p-6">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="bg-white/10 text-white">
                        <MapPin className="mr-1.5 size-3.5" />
                        Manual pin map
                      </Badge>
                      <Badge className="bg-white/10 text-white">Click to drop pin</Badge>
                    </div>
                    <CardTitle className="font-display text-2xl tracking-tight">
                      Drop a pin on the map and seed a new internal place
                    </CardTitle>
                    <p className="max-w-3xl text-sm leading-7 text-slate-300">
                      This mode is separate from search. Click anywhere on the map to set the
                      coordinates, then save the place or save it and generate a candidate in one
                      step.
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4 p-0">
                    <GoogleMapCanvas
                      apiKey={GOOGLE_MAPS_API_KEY}
                      center={activeCenter}
                      draftPin={manualPin}
                      emptyMessage="Click the map to drop a draft pin."
                      markers={manualMarkers}
                      modeLabel="Manual add mode"
                      onMapClick={handleManualMapClick}
                      onMarkerSelect={(markerId) => {
                        const place = places.find((item) => item.id === markerId);
                        if (place) {
                          setManualDraft(buildStoredDraft(place));
                          setManualPin({
                            latitude: place.latitude,
                            longitude: place.longitude,
                          });
                        }
                      }}
                      radiusMiles={4}
                      selectedMarkerId={manualPin ? "manual-pin" : null}
                    />
                  </CardContent>
                </Card>

                <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
                  <CardHeader className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                      New place form
                    </p>
                    <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                      Save the pin as a place or place + candidate
                    </CardTitle>
                    <p className="text-sm leading-7 text-slate-600">
                      The pin controls the coordinates. Fill in the details, then save into the
                      pipeline. You can publish a candidate later through the existing review flow.
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <form className="space-y-3">
                      <input name="id" type="hidden" value={manualDraft.id} />
                      <input
                        name="external_source"
                        type="hidden"
                        value={manualDraft.external_source}
                      />
                      <input
                        name="external_id"
                        type="hidden"
                        value={manualDraft.external_id}
                      />
                      <input name="state_id" type="hidden" value={manualDraft.state_id} />
                      <input name="state_code" type="hidden" value={manualDraft.state_code} />

                      <PlaceEditorFields
                        draft={manualDraft}
                        onChange={(patch) => {
                          setManualDraft((current) => ({ ...current, ...patch }));
                        }}
                      />

                      <div className="flex flex-wrap gap-3">
                        <Button
                          formAction={savePlaceFromMapAction}
                          className="bg-slate-950 text-white hover:bg-slate-800"
                          type="submit"
                        >
                          <Layers3 className="size-4" />
                          Save place
                        </Button>
                        <Button
                          formAction={savePlaceAndGenerateCandidateAction}
                          className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                          type="submit"
                        >
                          <Sparkles className="size-4" />
                          Save + generate candidate
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
