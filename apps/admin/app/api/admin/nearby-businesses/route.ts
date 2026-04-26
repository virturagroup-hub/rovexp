import { NextResponse } from "next/server";

import {
  nearbyBusinessSearchSchema,
  type NearbyBusinessSearchInput,
} from "@rovexp/types";

import { isAdminDemoActive } from "@/lib/admin/demo";
import { getMockAdminStore } from "@/lib/admin/mock-store";
import {
  buildNearbyBusinessesQuery,
  buildStatefulSearchQuery,
  createNearbyBusinessFallbackResults,
  defaultNearbyBusinessTypes,
  resolveNearbyBusinessResult,
  type NearbyBusinessTypeKey,
} from "@/lib/admin/nearby-businesses";
import type { NearbyBusinessSearchResponse } from "@rovexp/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface SearchRequestBody extends NearbyBusinessSearchInput {
  state_code: string;
  state_name: string;
}

interface OverpassElement {
  center?: { lat?: number; lon?: number };
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string | number | boolean | null | undefined>;
  type: "node" | "way" | "relation";
}

function buildRadiusMeters(radiusMiles: number) {
  return Math.round(radiusMiles * 1609.34);
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  return new Promise<T>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("The nearby search timed out. Try widening the radius or searching again."));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeout);
        reject(error);
      });
  });
}

async function geocodeCenter({
  latitude,
  location,
  longitude,
  state_code,
  state_name,
}: Pick<SearchRequestBody, "latitude" | "location" | "longitude" | "state_code" | "state_name">) {
  const hasCoordinates =
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    typeof longitude === "number" &&
    Number.isFinite(longitude);

  if (hasCoordinates) {
    return {
      label: location?.trim()
        ? `${location.trim()}, ${state_code}`
        : `${state_name}, ${state_code}`,
      latitude: latitude as number,
      longitude: longitude as number,
      resolved_from: "coordinates" as const,
      state_code,
      state_name,
    };
  }

  const query = buildStatefulSearchQuery(location ?? "", state_code, state_name);
  const geocodeUrl = new URL("https://nominatim.openstreetmap.org/search");

  geocodeUrl.searchParams.set("format", "jsonv2");
  geocodeUrl.searchParams.set("limit", "1");
  geocodeUrl.searchParams.set("q", query);

  const response = await withTimeout(
    fetch(geocodeUrl, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "en",
        "User-Agent": "RoveXP/1.0 (admin map explorer)",
      },
    }),
    12000,
  );

  if (!response.ok) {
    throw new Error("We could not resolve that location. Try a different city or enter coordinates.");
  }

  const data = (await response.json()) as Array<{
    display_name?: string;
    lat?: string;
    lon?: string;
  }>;

  const first = data[0];

  if (!first?.lat || !first?.lon) {
    throw new Error("We could not find a matching location. Try a more specific city or coordinates.");
  }

  return {
    label: first.display_name ?? query,
    latitude: Number(first.lat),
    longitude: Number(first.lon),
    resolved_from: "location" as const,
    state_code,
    state_name,
  };
}

function buildDemoFallbackCenter({
  location,
  state_code,
  state_name,
}: Pick<SearchRequestBody, "location" | "state_code" | "state_name">) {
  return {
    label: location?.trim() ? `${location.trim()}, ${state_code}` : `${state_name}, ${state_code}`,
    latitude: 41.8781,
    longitude: -87.6298,
    resolved_from: "location" as const,
    state_code,
    state_name,
  };
}

async function searchLiveNearbyBusinesses({
  latitude,
  longitude,
  radius_miles,
  types,
}: {
  latitude: number;
  longitude: number;
  radius_miles: number;
  types: NearbyBusinessTypeKey[];
}) {
  const radiusMeters = buildRadiusMeters(radius_miles);
  const query = buildNearbyBusinessesQuery(latitude, longitude, radiusMeters, types);

  const response = await withTimeout(
    fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        "User-Agent": "RoveXP/1.0 (admin map explorer)",
      },
      body: new URLSearchParams({ data: query }).toString(),
    }),
    18000,
  );

  if (!response.ok) {
    throw new Error("The nearby business search service is unavailable right now.");
  }

  const payload = (await response.json()) as { elements?: OverpassElement[] };
  const center = {
    latitude,
    longitude,
    label: "",
    resolved_from: "coordinates" as const,
    state_code: "",
    state_name: "",
  };

  const results = (payload.elements ?? [])
    .map((element) => resolveNearbyBusinessResult(element, center))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .sort((a, b) => a.distance_miles - b.distance_miles);

  const uniqueResults = Array.from(new Map(results.map((item) => [item.source_id, item])).values());

  return uniqueResults;
}

function buildDemoSearchResults(
  center: {
    latitude: number;
    longitude: number;
    label: string;
    resolved_from: "coordinates" | "location";
    state_code: string;
    state_name: string;
  },
  types: NearbyBusinessTypeKey[],
) {
  const store = getMockAdminStore();

  return createNearbyBusinessFallbackResults(center, store.places, types).map((item) => ({
    ...item,
    source: "demo-fixture" as const,
  }));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as SearchRequestBody | null;

  if (!body) {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const parsed = nearbyBusinessSearchSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Enter a location or coordinates, then pick a state and radius before searching.",
      },
      { status: 400 },
    );
  }

  const normalizedTypes = parsed.data.types.length
    ? parsed.data.types
    : defaultNearbyBusinessTypes;
  const useDemoFallback = await isAdminDemoActive();
  let center;

  try {
    center = await geocodeCenter({
      latitude: parsed.data.latitude ?? null,
      location: parsed.data.location ?? "",
      longitude: parsed.data.longitude ?? null,
      state_code: parsed.data.state_code,
      state_name: parsed.data.state_name,
    });
  } catch (error) {
    if (!useDemoFallback) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "We could not resolve that location. Try a city name or coordinates.",
        },
        { status: 422 },
      );
    }

    center = buildDemoFallbackCenter({
      location: parsed.data.location ?? "",
      state_code: parsed.data.state_code,
      state_name: parsed.data.state_name,
    });
  }

  try {
    const liveResults = await searchLiveNearbyBusinesses({
      latitude: center.latitude,
      longitude: center.longitude,
      radius_miles: parsed.data.radius_miles,
      types: normalizedTypes,
    });

    if (liveResults.length || !useDemoFallback) {
      const response: NearbyBusinessSearchResponse = {
        center,
        query: buildStatefulSearchQuery(parsed.data.location ?? "", parsed.data.state_code, parsed.data.state_name),
        radius_miles: parsed.data.radius_miles,
        results: liveResults,
        source: "openstreetmap",
        total: liveResults.length,
        types: normalizedTypes,
      };

      return NextResponse.json(response);
    }
  } catch (error) {
    if (!useDemoFallback) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "We could not load nearby businesses right now.",
        },
        { status: 502 },
      );
    }
  }

  if (!useDemoFallback) {
    return NextResponse.json(
      {
        center,
        query: buildStatefulSearchQuery(parsed.data.location ?? "", parsed.data.state_code, parsed.data.state_name),
        radius_miles: parsed.data.radius_miles,
        results: [],
        source: "openstreetmap",
        total: 0,
        types: normalizedTypes,
      } satisfies NearbyBusinessSearchResponse,
    );
  }

  const demoResults = buildDemoSearchResults(center, normalizedTypes);

  const response: NearbyBusinessSearchResponse = {
    center,
    query: buildStatefulSearchQuery(parsed.data.location ?? "", parsed.data.state_code, parsed.data.state_name),
    radius_miles: parsed.data.radius_miles,
    results: demoResults,
    source: "demo-fixture",
    total: demoResults.length,
    types: normalizedTypes,
  };

  return NextResponse.json(response);
}
