"use client";

import Link from "next/link";
import {
  ArrowRight,
  Layers3,
  Map as MapIcon,
  MapPinned,
  Pin,
  Search,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  generateQuestCandidateAction,
  savePlaceAndGenerateCandidateAction,
  savePlaceFromMapAction,
} from "@/lib/admin/actions";
import { cn } from "@/lib/utils";

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
import { Textarea } from "@/components/ui/textarea";

interface DraftPin {
  latitude: number;
  longitude: number;
}

interface DraftPlaceFormState {
  address: string;
  city: string;
  description: string;
  name: string;
  placeType: string;
  stateId: string;
}

interface AdminMapExplorerProps {
  candidates: QuestCandidateWithRelations[];
  places: PlaceWithRelations[];
  quests: QuestWithRelations[];
  states: StateRecord[];
}

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatStateLabel(state: StateRecord | null | undefined) {
  if (!state) {
    return "Unknown state";
  }

  return `${state.code} · ${state.name}`;
}

function matchesSearch(place: PlaceWithRelations, search: string) {
  const haystack = normalize(
    [
      place.name,
      place.place_type,
      place.address ?? "",
      place.city ?? "",
      place.state?.code ?? place.state_code ?? "",
      place.state?.name ?? "",
      place.description ?? "",
      place.external_source ?? "",
      place.external_id ?? "",
    ]
      .join(" ")
      .trim(),
  );

  return haystack.includes(normalize(search));
}

function buildBounds(
  places: PlaceWithRelations[],
): { latSpan: number; lngSpan: number; maxLat: number; maxLng: number; minLat: number; minLng: number } {
  if (!places.length) {
    return {
      latSpan: 6,
      lngSpan: 10,
      maxLat: 42,
      maxLng: -92,
      minLat: 36,
      minLng: -102,
    };
  }

  const latitudes = places.map((place) => place.latitude);
  const longitudes = places.map((place) => place.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  const latSpan = Math.max(maxLat - minLat, 0.02);
  const lngSpan = Math.max(maxLng - minLng, 0.02);
  const latPad = Math.max(latSpan * 0.18, 0.02);
  const lngPad = Math.max(lngSpan * 0.18, 0.02);

  return {
    latSpan: latSpan + latPad * 2,
    lngSpan: lngSpan + lngPad * 2,
    maxLat: maxLat + latPad,
    maxLng: maxLng + lngPad,
    minLat: minLat - latPad,
    minLng: minLng - lngPad,
  };
}

function projectToPercent(
  latitude: number,
  longitude: number,
  bounds: ReturnType<typeof buildBounds>,
) {
  const latRatio = (bounds.maxLat - latitude) / bounds.latSpan;
  const lngRatio = (longitude - bounds.minLng) / bounds.lngSpan;

  return {
    left: Math.max(3, Math.min(97, lngRatio * 100)),
    top: Math.max(3, Math.min(97, latRatio * 100)),
  };
}

function formatCount(value: number) {
  return value.toLocaleString();
}

function getPlaceStatus(place: PlaceWithRelations, candidate?: QuestCandidateWithRelations | null, quest?: QuestWithRelations | null) {
  if (quest) {
    return "live";
  }

  if (candidate) {
    return candidate.status;
  }

  return "place";
}

function statusTone(status: string) {
  switch (status) {
    case "published":
    case "live":
      return "bg-amber-400 text-amber-950";
    case "approved":
      return "bg-emerald-400 text-emerald-950";
    case "rejected":
      return "bg-rose-300 text-rose-950";
    case "draft":
      return "bg-cyan-300 text-cyan-950";
    default:
      return "bg-slate-200 text-slate-800";
  }
}

function statusLabel(
  place: PlaceWithRelations,
  candidate?: QuestCandidateWithRelations | null,
  quest?: QuestWithRelations | null,
) {
  if (quest) {
    return "Live quest";
  }

  if (candidate) {
    return `Candidate ${candidate.status}`;
  }

  if (place.is_active) {
    return "Imported place";
  }

  return "Inactive place";
}

function MapCanvas({
  bounds,
  draftPin,
  onCreateDraftPin,
  onSelectPlace,
  places,
  selectedPlaceId,
}: {
  bounds: ReturnType<typeof buildBounds>;
  draftPin: DraftPin | null;
  onCreateDraftPin: (point: DraftPin) => void;
  onSelectPlace: (placeId: string) => void;
  places: PlaceWithRelations[];
  selectedPlaceId: string | null;
}) {
  return (
    <div
      className="relative min-h-[540px] overflow-hidden rounded-[2rem] border border-slate-200 bg-[linear-gradient(135deg,_rgba(9,18,34,1)_0%,_rgba(17,44,78,1)_52%,_rgba(12,27,52,1)_100%)] shadow-[0_22px_64px_rgba(15,23,42,0.16)]"
      onClick={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        const latitude = bounds.maxLat - y * bounds.latSpan;
        const longitude = bounds.minLng + x * bounds.lngSpan;

        onCreateDraftPin({ latitude, longitude });
      }}
      role="presentation"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(45,183,255,0.3),_transparent_24%),radial-gradient(circle_at_bottom_right,_rgba(245,184,46,0.16),_transparent_28%),radial-gradient(circle_at_center,_rgba(255,255,255,0.08),_transparent_42%)]" />
      <div
        className="absolute inset-0 opacity-25"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.12) 1px, transparent 1px)",
          backgroundSize: "72px 72px",
        }}
      />

      <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/10 bg-white/8 px-3 py-2 text-xs uppercase tracking-[0.24em] text-slate-100 backdrop-blur">
        <MapIcon className="size-3.5" />
        Stored places map
      </div>

      <div className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-slate-950/45 px-3 py-2 text-xs uppercase tracking-[0.24em] text-slate-100 backdrop-blur">
        Click blank space to drop a new place pin
      </div>

      <div className="relative h-full min-h-[540px]">
        {places.map((place) => {
          const position = projectToPercent(place.latitude, place.longitude, bounds);
          const selected = place.id === selectedPlaceId;

          return (
            <button
              key={place.id}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onSelectPlace(place.id);
              }}
              className={cn(
                "absolute z-10 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 rounded-full border px-3 py-2 text-left shadow-[0_8px_24px_rgba(15,23,42,0.28)] transition",
                selected
                  ? "scale-110 border-white/70 bg-white text-slate-950"
                  : place.is_publicly_visitable
                    ? "border-white/20 bg-slate-950/60 text-white hover:border-white/60 hover:bg-slate-900/85"
                    : "border-white/20 bg-slate-800/70 text-slate-200 hover:bg-slate-800",
              )}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
              }}
            >
              <span
                className={cn(
                  "flex size-7 items-center justify-center rounded-full text-[10px] font-semibold uppercase tracking-[0.2em]",
                  selected
                    ? "bg-sky-500 text-white"
                    : place.is_publicly_visitable
                      ? "bg-white/10 text-sky-100"
                      : "bg-white/5 text-slate-200",
                )}
              >
                {place.place_type.slice(0, 2).toUpperCase()}
              </span>
              <span className="max-w-[140px] text-[11px] font-semibold leading-4">
                {place.name}
              </span>
            </button>
          );
        })}

        {draftPin ? (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
            }}
            className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${projectToPercent(draftPin.latitude, draftPin.longitude, bounds).left}%`,
              top: `${projectToPercent(draftPin.latitude, draftPin.longitude, bounds).top}%`,
            }}
          >
            <span className="flex size-11 items-center justify-center rounded-full border border-white/80 bg-cyan-400 text-cyan-950 shadow-[0_12px_30px_rgba(45,183,255,0.38)]">
              <Pin className="size-5" />
            </span>
          </button>
        ) : null}
      </div>

      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[1.5rem] border border-white/10 bg-slate-950/45 px-4 py-3 text-xs text-slate-100 backdrop-blur">
        <p className="max-w-2xl leading-6 text-slate-200">
          The map uses the stored places table only. Search by business, landmark, address, or city,
          then seed new places directly from the canvas when you want to expand a neighborhood.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-white/10 px-3 py-1 uppercase tracking-[0.18em]">
            {formatCount(places.length)} markers
          </span>
          {draftPin ? (
            <span className="rounded-full bg-cyan-500/15 px-3 py-1 uppercase tracking-[0.18em] text-cyan-100">
              Draft pin active
            </span>
          ) : null}
        </div>
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
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState("all");
  const [placeTypeFilter, setPlaceTypeFilter] = useState("all");
  const [activeOnly, setActiveOnly] = useState(true);
  const [publicOnly, setPublicOnly] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(
    places[0]?.id ?? null,
  );
  const [draftPin, setDraftPin] = useState<DraftPin | null>(null);
  const [draftForm, setDraftForm] = useState<DraftPlaceFormState>({
    address: "",
    city: "",
    description: "",
    name: "",
    placeType: "landmark",
    stateId: states[0]?.id ?? "",
  });

  const candidateByPlaceId = useMemo(
    () => new Map(candidates.map((candidate) => [candidate.place_id, candidate])),
    [candidates],
  );
  const questByPlaceId = useMemo(
    () =>
      new Map(
        quests
          .filter((quest) => Boolean(quest.place_id))
          .map((quest) => [quest.place_id as string, quest]),
      ),
    [quests],
  );
  const stateById = useMemo(
    () => new Map(states.map((state) => [state.id, state])),
    [states],
  );
  const placeTypes = useMemo(() => {
    const unique = new Set<string>();

    for (const place of places) {
      unique.add(place.place_type);
    }

    return Array.from(unique).sort((left, right) => left.localeCompare(right));
  }, [places]);

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = normalize(query);

    return places.filter((place) => {
      const placeStateId = place.state?.id ?? place.state_id ?? "";
      const placeStateCode = place.state?.code ?? place.state_code ?? "";

      if (stateFilter !== "all" && placeStateId !== stateFilter && placeStateCode !== stateFilter) {
        return false;
      }

      if (placeTypeFilter !== "all" && normalize(place.place_type) !== normalize(placeTypeFilter)) {
        return false;
      }

      if (activeOnly && !place.is_active) {
        return false;
      }

      if (publicOnly && !place.is_publicly_visitable) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return matchesSearch(place, query);
    });
  }, [activeOnly, placeTypeFilter, places, publicOnly, query, stateFilter]);

  const visiblePlaces = filteredPlaces.length > 0 ? filteredPlaces : places;
  const bounds = useMemo(() => buildBounds(visiblePlaces), [visiblePlaces]);

  const selectedPlace =
    places.find((place) => place.id === selectedPlaceId) ??
    filteredPlaces[0] ??
    places[0] ??
    null;
  const selectedCandidate = selectedPlace
    ? candidateByPlaceId.get(selectedPlace.id) ?? null
    : null;
  const selectedQuest = selectedPlace
    ? questByPlaceId.get(selectedPlace.id) ?? null
    : null;
  const selectedState = selectedPlace
    ? stateById.get(selectedPlace.state_id ?? selectedPlace.state?.id ?? "") ?? selectedPlace.state ?? null
    : null;

  const filteredCoverage = useMemo(() => {
    return {
      candidateCount: filteredPlaces.filter((place) => candidateByPlaceId.has(place.id)).length,
      questCount: filteredPlaces.filter((place) => questByPlaceId.has(place.id)).length,
      totalCount: filteredPlaces.length,
    };
  }, [candidateByPlaceId, filteredPlaces, questByPlaceId]);

  const selectedPlaceVisible =
    selectedPlace !== null && filteredPlaces.some((place) => place.id === selectedPlace.id);

  return (
    <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <section className="space-y-5">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-1 items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                <Search className="size-4 text-slate-400" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search business, landmark, address, city, or place name"
                  className="border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                />
              </div>

              <select
                value={stateFilter}
                onChange={(event) => setStateFilter(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm"
              >
                <option value="all">All states</option>
                {states.map((state) => (
                  <option key={state.id} value={state.id}>
                    {state.code} · {state.name}
                  </option>
                ))}
              </select>

              <select
                value={placeTypeFilter}
                onChange={(event) => setPlaceTypeFilter(event.target.value)}
                className="h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-700 shadow-sm"
              >
                <option value="all">All place types</option>
                {placeTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  checked={activeOnly}
                  onChange={(event) => setActiveOnly(event.target.checked)}
                  type="checkbox"
                />
                Active only
              </label>
              <label className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  checked={publicOnly}
                  onChange={(event) => setPublicOnly(event.target.checked)}
                  type="checkbox"
                />
                Public only
              </label>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setQuery("");
                  setStateFilter("all");
                  setPlaceTypeFilter("all");
                  setActiveOnly(true);
                  setPublicOnly(true);
                }}
              >
                Reset filters
              </Button>
            </div>
          </CardContent>
        </Card>

        <MapCanvas
          bounds={bounds}
          draftPin={draftPin}
          onCreateDraftPin={setDraftPin}
          onSelectPlace={setSelectedPlaceId}
          places={filteredPlaces}
          selectedPlaceId={selectedPlaceId}
        />

        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: "Visible", value: filteredCoverage.totalCount },
            { label: "Imported", value: filteredPlaces.length },
            { label: "Candidates", value: filteredCoverage.candidateCount },
            { label: "Live quests", value: filteredCoverage.questCount },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-[1.75rem] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
            >
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
              <p className="mt-2 font-display text-3xl font-semibold text-slate-950">
                {formatCount(item.value)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <aside className="space-y-5">
        {draftPin ? (
          <Card className="rounded-[2rem] border-sky-200 bg-sky-50/90 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-sky-100 text-sky-900">New place pin</Badge>
                <Badge variant="outline">Add as Place</Badge>
                <Badge variant="outline">Add + Generate Candidate</Badge>
              </div>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                Seed a new place from the map
              </CardTitle>
              <p className="text-sm leading-7 text-slate-600">
                Use this pin as the starting point for a new place record, then optionally generate a candidate immediately.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <form action={savePlaceFromMapAction} className="space-y-4">
                <input name="id" type="hidden" value="" />
                <input name="latitude" type="hidden" value={String(draftPin.latitude)} />
                <input name="longitude" type="hidden" value={String(draftPin.longitude)} />
                <input
                  name="source_metadata"
                  type="hidden"
                  value={JSON.stringify({
                    source: "admin_map_explorer",
                    mode: "create_place",
                  })}
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-semibold text-slate-700">Place name</label>
                    <Input
                      name="name"
                      value={draftForm.name}
                      onChange={(event) =>
                        setDraftForm((previous) => ({ ...previous, name: event.target.value }))
                      }
                      placeholder="Riverfront overlook, neighborhood cafe..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Place type</label>
                    <Input
                      name="place_type"
                      value={draftForm.placeType}
                      onChange={(event) =>
                        setDraftForm((previous) => ({
                          ...previous,
                          placeType: event.target.value,
                        }))
                      }
                      placeholder="park, cafe, mural..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">State</label>
                    <select
                      name="state_id"
                      value={draftForm.stateId}
                      onChange={(event) =>
                        setDraftForm((previous) => ({ ...previous, stateId: event.target.value }))
                      }
                      className="h-10 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-xs"
                    >
                      <option value="">Select state</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.code} · {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">City</label>
                    <Input
                      name="city"
                      value={draftForm.city}
                      onChange={(event) =>
                        setDraftForm((previous) => ({ ...previous, city: event.target.value }))
                      }
                      placeholder="Optional city"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Address</label>
                    <Input
                      name="address"
                      value={draftForm.address}
                      onChange={(event) =>
                        setDraftForm((previous) => ({ ...previous, address: event.target.value }))
                      }
                      placeholder="Optional address"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Description</label>
                  <Textarea
                    name="description"
                    value={draftForm.description}
                    onChange={(event) =>
                      setDraftForm((previous) => ({
                        ...previous,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Why does this spot deserve to become a quest candidate?"
                    rows={4}
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button type="submit" className="bg-slate-950 text-white hover:bg-slate-800">
                    <MapPinned className="size-4" />
                    Add as Place
                  </Button>
                  <Button
                    type="submit"
                    formAction={savePlaceAndGenerateCandidateAction}
                    variant="outline"
                    className="border-sky-200 bg-white text-sky-950 hover:bg-sky-50"
                  >
                    <Sparkles className="size-4" />
                    Add + Generate Candidate
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setDraftPin(null)}
                  >
                    Clear pin
                  </Button>
                </div>
                <p className="text-xs leading-6 text-slate-500">
                  A place created here is saved first, then candidate generation stays admin-controlled.
                </p>
              </form>
            </CardContent>
          </Card>
        ) : null}

        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Search results
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              {formatCount(filteredPlaces.length)} matching places
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="max-h-[360px] space-y-3 overflow-auto pr-1">
              {filteredPlaces.length > 0 ? (
                filteredPlaces.map((place) => {
                  const candidate = candidateByPlaceId.get(place.id) ?? null;
                  const quest = questByPlaceId.get(place.id) ?? null;
                  const selected = place.id === selectedPlaceId;

                  return (
                    <button
                      key={place.id}
                      type="button"
                      onClick={() => setSelectedPlaceId(place.id)}
                      className={cn(
                        "w-full rounded-[1.5rem] border p-4 text-left transition",
                        selected
                          ? "border-sky-200 bg-sky-50 shadow-[0_10px_24px_rgba(45,183,255,0.12)]"
                          : "border-slate-200 bg-slate-50/80 hover:border-sky-200 hover:bg-white",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{place.place_type}</Badge>
                            {place.state ? (
                              <Badge variant="outline">{place.state.code}</Badge>
                            ) : null}
                            <Badge className={cn("uppercase tracking-[0.2em]", statusTone(getPlaceStatus(place, candidate, quest)))}>
                              {statusLabel(place, candidate, quest)}
                            </Badge>
                          </div>
                          <div>
                            <p className="font-display text-lg font-semibold text-slate-950">
                              {place.name}
                            </p>
                            <p className="mt-1 text-sm leading-6 text-slate-600">
                              {place.city ?? "Unknown city"}{place.address ? ` · ${place.address}` : ""}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="mt-1 size-4 shrink-0 text-slate-400" />
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-7 text-slate-500">
                  No places match the current search. Clear the filters or widen the state and type filters.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedPlace ? (
          <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-sky-100 text-sky-900">Selected place</Badge>
                <Badge variant="outline">Imported as place</Badge>
                {selectedCandidate ? (
                  <Badge className="bg-violet-100 text-violet-900">
                    Candidate {selectedCandidate.status}
                  </Badge>
                ) : (
                  <Badge variant="outline">No candidate yet</Badge>
                )}
                {selectedQuest ? (
                  <Badge className="bg-amber-100 text-amber-900">Live quest</Badge>
                ) : null}
              </div>

              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                {selectedPlace.name}
              </CardTitle>
              <p className="text-sm leading-7 text-slate-600">
                {selectedPlace.description ?? "This place has no description yet. Add one when editing the place or generate a candidate from the map."}
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {selectedPlace.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt={selectedPlace.name}
                  src={selectedPlace.image_url}
                  className="h-48 w-full rounded-[1.5rem] object-cover"
                />
              ) : (
                <div className="flex h-48 items-center justify-center rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
                  No image available
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Category</p>
                  <p className="mt-2 font-semibold text-slate-950">{selectedPlace.place_type}</p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Location</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {selectedPlace.address ?? selectedPlace.city ?? "No address"}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Coordinates</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {selectedPlace.latitude.toFixed(5)}, {selectedPlace.longitude.toFixed(5)}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">State</p>
                  <p className="mt-2 font-semibold text-slate-950">
                    {formatStateLabel(selectedState)}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {selectedPlace.is_active ? "Active" : "Inactive"}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1">
                  {selectedPlace.is_publicly_visitable ? "Publicly visitable" : "Private"}
                </span>
                {selectedPlace.rating !== null ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {selectedPlace.rating.toFixed(1)} rating
                  </span>
                ) : null}
                {selectedPlace.review_count !== null ? (
                  <span className="rounded-full bg-slate-100 px-3 py-1">
                    {selectedPlace.review_count} reviews
                  </span>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <Link href={`/dashboard/places?edit=${selectedPlace.id}`}>
                    <MapPinned className="size-4" />
                    Open place
                  </Link>
                </Button>

                {selectedCandidate ? (
                  <Button asChild className="bg-slate-950 text-white hover:bg-slate-800">
                    <Link href={`/dashboard/candidates?edit=${selectedCandidate.id}`}>
                      <Layers3 className="size-4" />
                      Open candidate
                    </Link>
                  </Button>
                ) : selectedQuest ? (
                  <Button asChild className="bg-amber-500 text-amber-950 hover:bg-amber-400">
                    <Link href={`/dashboard/quests?edit=${selectedQuest.id}`}>
                      <MapIcon className="size-4" />
                      Open quest
                    </Link>
                  </Button>
                ) : selectedPlace.is_active && selectedPlace.is_publicly_visitable ? (
                  <form action={generateQuestCandidateAction}>
                    <input type="hidden" name="place_id" value={selectedPlace.id} />
                    <Button type="submit" className="bg-sky-700 text-white hover:bg-sky-600">
                      <Sparkles className="size-4" />
                      Generate candidate
                    </Button>
                  </form>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    Make the place active and publicly visitable before generating a candidate.
                  </div>
                )}
              </div>

              {!selectedPlaceVisible ? (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-7 text-amber-950">
                  This selected place is currently hidden by the active filters. Clear or adjust the filters if you want it to stay visible on the map.
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardContent className="p-6 text-sm leading-7 text-slate-600">
              No place is selected yet. Use the map or the results list to inspect a place, or click on empty map space to create a new pin.
            </CardContent>
          </Card>
        )}
      </aside>
    </div>
  );
}
