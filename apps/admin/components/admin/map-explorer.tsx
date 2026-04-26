"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  ArrowRight,
  Compass,
  Layers3,
  Map as MapIcon,
  MapPin,
  Pin,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
} from "lucide-react";

import {
  generateQuestCandidateAction,
  savePlaceAndGenerateCandidateAction,
  savePlaceFromMapAction,
} from "@/lib/admin/actions";
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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

interface AdminMapExplorerProps {
  candidates: QuestCandidateWithRelations[];
  places: PlaceWithRelations[];
  quests: QuestWithRelations[];
  states: StateRecord[];
}

type WorkflowMode = "search" | "manual";

type SearchDraft = {
  activeOnly: boolean;
  placeType: string;
  publicOnly: boolean;
  query: string;
  stateId: string;
};

type ManualDraft = {
  address: string;
  city: string;
  description: string;
  image_url: string;
  is_active: boolean;
  is_publicly_visitable: boolean;
  latitude: number;
  longitude: number;
  name: string;
  place_type: string;
  rating: string;
  review_count: string;
  source_metadata: string;
  state_code: string;
  state_id: string;
  website: string;
};

type PlacePipelineStatus = "imported" | "candidate" | "live";

const MapCanvas = dynamic(() => import("./web-leaflet-map"), {
  loading: () => (
    <div className="flex h-full min-h-[560px] items-center justify-center rounded-[2rem] border border-slate-200 bg-slate-950/95 text-sm text-slate-300">
      Loading map…
    </div>
  ),
  ssr: false,
});

const DEFAULT_CENTER = { latitude: 39.8283, longitude: -98.5795 };

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function formatStateLabel(state: StateRecord | null | undefined) {
  if (!state) {
    return "Unassigned state";
  }

  return `${state.code} · ${state.name}`;
}

function buildSearchableText(place: PlaceWithRelations) {
  return normalize(
    [
      place.name,
      place.description,
      place.address,
      place.city,
      place.place_type,
      place.state?.code,
      place.state?.name,
      place.website,
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function matchesSearch(place: PlaceWithRelations, filters: SearchDraft) {
  const query = normalize(filters.query);
  const placeType = normalize(filters.placeType);
  const text = buildSearchableText(place);

  if (filters.stateId && place.state?.id !== filters.stateId) {
    return false;
  }

  if (filters.activeOnly && !place.is_active) {
    return false;
  }

  if (filters.publicOnly && !place.is_publicly_visitable) {
    return false;
  }

  if (placeType && normalize(place.place_type) !== placeType) {
    return false;
  }

  if (query && !text.includes(query)) {
    return false;
  }

  return true;
}

function deriveCenter(places: PlaceWithRelations[]) {
  const valid = places.filter(
    (place) =>
      Number.isFinite(place.latitude) &&
      Number.isFinite(place.longitude) &&
      !(place.latitude === 0 && place.longitude === 0),
  );

  if (!valid.length) {
    return DEFAULT_CENTER;
  }

  const totals = valid.reduce(
    (accumulator, place) => {
      accumulator.latitude += place.latitude;
      accumulator.longitude += place.longitude;
      return accumulator;
    },
    { latitude: 0, longitude: 0 },
  );

  return {
    latitude: totals.latitude / valid.length,
    longitude: totals.longitude / valid.length,
  };
}

function getPlaceStatus(
  place: PlaceWithRelations,
  candidate: QuestCandidateWithRelations | null,
  quest: QuestWithRelations | null,
): PlacePipelineStatus {
  if (quest) {
    return "live";
  }

  if (candidate) {
    return "candidate";
  }

  return "imported";
}

function statusBadgeTone(status: PlacePipelineStatus) {
  switch (status) {
    case "live":
      return "bg-amber-100 text-amber-950";
    case "candidate":
      return "bg-cyan-100 text-cyan-950";
    case "imported":
    default:
      return "bg-slate-100 text-slate-900";
  }
}

function statusLabel(status: PlacePipelineStatus) {
  switch (status) {
    case "live":
      return "Live quest";
    case "candidate":
      return "Candidate";
    case "imported":
    default:
      return "Imported";
  }
}

function matchesResultResult(place: PlaceWithRelations, query: string) {
  return buildSearchableText(place).includes(normalize(query));
}

function defaultManualDraft(states: StateRecord[], center: { latitude: number; longitude: number }): ManualDraft {
  const preferredState = states.find((state) => state.code === "IL") ?? states[0] ?? null;

  return {
    address: "",
    city: "",
    description: "",
    image_url: "",
    is_active: true,
    is_publicly_visitable: true,
    latitude: center.latitude,
    longitude: center.longitude,
    name: "",
    place_type: "landmark",
    rating: "",
    review_count: "",
    source_metadata: "",
    state_code: preferredState?.code ?? "",
    state_id: preferredState?.id ?? "",
    website: "",
  };
}

export function AdminMapExplorer({
  candidates,
  places,
  quests,
  states,
}: AdminMapExplorerProps) {
  const [workflow, setWorkflow] = useState<WorkflowMode>("search");
  const [searchDraft, setSearchDraft] = useState<SearchDraft>(() => ({
    activeOnly: true,
    placeType: "",
    publicOnly: true,
    query: "",
    stateId: "",
  }));
  const [appliedSearch, setAppliedSearch] = useState<SearchDraft>(searchDraft);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(places[0]?.id ?? null);
  const [draftPin, setDraftPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [manualDraft, setManualDraft] = useState<ManualDraft>(() =>
    defaultManualDraft(states, deriveCenter(places)),
  );
  const [isSearching, startSearchTransition] = useTransition();

  const allPlaceTypes = useMemo(
    () => Array.from(new Set(places.map((place) => place.place_type).filter(Boolean))).sort(),
    [places],
  );
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

  const filteredPlaces = useMemo(() => {
    const query = normalize(appliedSearch.query);

    return places
      .filter((place) => matchesSearch(place, appliedSearch))
      .filter((place) => (query ? matchesResultResult(place, query) : true))
      .sort((a, b) => {
        const aStatus = getPlaceStatus(a, candidateByPlaceId.get(a.id) ?? null, questByPlaceId.get(a.id) ?? null);
        const bStatus = getPlaceStatus(b, candidateByPlaceId.get(b.id) ?? null, questByPlaceId.get(b.id) ?? null);

        if (aStatus !== bStatus) {
          const weight = { live: 0, candidate: 1, imported: 2 } as const;
          return weight[aStatus] - weight[bStatus];
        }

        return a.name.localeCompare(b.name);
      });
  }, [appliedSearch, candidateByPlaceId, places, questByPlaceId]);

  const searchCounts = useMemo(() => {
    const imported = filteredPlaces.filter((place) => !candidateByPlaceId.has(place.id)).length;
    const candidate = filteredPlaces.filter((place) => candidateByPlaceId.has(place.id)).length;
    const live = filteredPlaces.filter((place) => questByPlaceId.has(place.id)).length;

    return { candidate, imported, live, matched: filteredPlaces.length };
  }, [candidateByPlaceId, filteredPlaces, questByPlaceId]);

  const resolvedSelectedPlaceId = useMemo(() => {
    if (selectedPlaceId && filteredPlaces.some((place) => place.id === selectedPlaceId)) {
      return selectedPlaceId;
    }

    return filteredPlaces[0]?.id ?? null;
  }, [filteredPlaces, selectedPlaceId]);

  const selectedPlace = useMemo(
    () => filteredPlaces.find((place) => place.id === resolvedSelectedPlaceId) ?? null,
    [filteredPlaces, resolvedSelectedPlaceId],
  );

  const selectedCandidate = selectedPlace ? candidateByPlaceId.get(selectedPlace.id) ?? null : null;
  const selectedQuest = selectedPlace ? questByPlaceId.get(selectedPlace.id) ?? null : null;
  const selectedStatus = selectedPlace
    ? getPlaceStatus(selectedPlace, selectedCandidate, selectedQuest)
    : null;

  const manualCenter = useMemo(() => deriveCenter(places), [places]);
  const searchCenter = useMemo(
    () => (filteredPlaces.length ? deriveCenter(filteredPlaces) : manualCenter),
    [filteredPlaces, manualCenter],
  );

  function runSearch() {
    startSearchTransition(() => {
      setAppliedSearch(searchDraft);
      const visible = places.filter((place) => matchesSearch(place, searchDraft));
      setSelectedPlaceId(visible[0]?.id ?? null);
    });
  }

  function resetSearch() {
    const next = {
      activeOnly: true,
      placeType: "",
      publicOnly: true,
      query: "",
      stateId: "",
    };

    setSearchDraft(next);
    setAppliedSearch(next);
    setSelectedPlaceId(places[0]?.id ?? null);
  }

  function handleMapPinDrop(coordinates: { latitude: number; longitude: number }) {
    setDraftPin(coordinates);
    setManualDraft((current) => ({
      ...current,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    }));
  }

  function updateManualDraft<K extends keyof ManualDraft>(key: K, value: ManualDraft[K]) {
    setManualDraft((current) => ({ ...current, [key]: value }));
  }

  return (
    <Tabs
      className="space-y-6"
      onValueChange={(value) => setWorkflow(value as WorkflowMode)}
      value={workflow}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Map explorer</p>
          <h2 className="font-display text-2xl tracking-tight text-slate-950">
            A real admin map for stored places and manual pin-drop curation
          </h2>
          <p className="max-w-3xl text-sm leading-7 text-slate-600">
            Search only the stored places already inside RoveXP, or switch to manual add mode to
            drop a new pin and seed the next place record. Live external discovery is not part of
            this screen.
          </p>
        </div>
        <TabsList className="grid h-auto grid-cols-2 rounded-full bg-slate-100 p-1">
          <TabsTrigger value="search" className="rounded-full px-4 py-2">
            Search stored places
          </TabsTrigger>
          <TabsTrigger value="manual" className="rounded-full px-4 py-2">
            Add new place
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent className="m-0 space-y-6" value="search">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
            <CardHeader className="space-y-3 border-b border-white/10 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/10 text-white">Interactive map</Badge>
                <Badge className="bg-cyan-100 text-cyan-950">Stored places only</Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white">
                  Click markers to inspect
                </Badge>
              </div>
              <CardTitle className="font-display text-2xl tracking-tight">
                Search the internal places corpus and inspect markers on a real map
              </CardTitle>
              <p className="max-w-3xl text-sm leading-7 text-slate-300">
                Use the form below to search places already imported into RoveXP. Press Search to
                update the map and results list. If nothing matches, the map stays visible and the
                empty state stays honest.
              </p>
            </CardHeader>

            <CardContent className="space-y-4 p-0">
              <div className="relative min-h-[660px] overflow-hidden">
                <MapCanvas
                  draftPin={null}
                  fallbackCenter={searchCenter}
                  mode="search"
                  onDropPin={handleMapPinDrop}
                  onSelectPlace={setSelectedPlaceId}
                  places={filteredPlaces}
                  selectedPlaceId={resolvedSelectedPlaceId}
                />

                <div className="pointer-events-none absolute left-4 top-4 z-[500] flex flex-wrap gap-2">
                  <Badge className="bg-slate-950/90 text-white backdrop-blur">
                    <MapIcon className="mr-1.5 size-3.5" />
                    Stored places map
                  </Badge>
                  <Badge className="bg-white/90 text-slate-950 backdrop-blur">
                    {searchCounts.matched} markers
                  </Badge>
                </div>

                <div className="absolute right-4 top-4 z-[500] rounded-full border border-white/15 bg-slate-950/85 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-200 shadow-xl backdrop-blur">
                  Search stored places only
                </div>

                {filteredPlaces.length === 0 ? (
                  <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-[500] max-w-[460px] rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-4 text-sm leading-7 text-slate-200 shadow-2xl backdrop-blur">
                    <p className="font-semibold text-white">No stored places matched this search.</p>
                    <p className="mt-1 text-slate-300">
                      Clear the filters, widen the search, or switch to manual add mode and drop a
                      fresh pin.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button
                        className="bg-white text-slate-950 hover:bg-slate-100"
                        onClick={resetSearch}
                        type="button"
                      >
                        <RefreshCcw className="size-4" />
                        Reset filters
                      </Button>
                      <Button
                        className="border-white/10 bg-white/5 text-white hover:bg-white/10"
                        onClick={() => setWorkflow("manual")}
                        type="button"
                        variant="outline"
                      >
                        <Pin className="size-4" />
                        Switch to manual add
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <CardHeader className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Search stored places
                </p>
                <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                  Query the RoveXP places table
                </CardTitle>
                <p className="text-sm leading-7 text-slate-600">
                  This does not reach out to live external providers. It searches the places that
                  are already imported into the database and shows them on the map.
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="map-search">Search term</Label>
                  <Input
                    id="map-search"
                    onChange={(event) =>
                      setSearchDraft((current) => ({ ...current, query: event.target.value }))
                    }
                    placeholder="Business, landmark, address, city, or place type"
                    value={searchDraft.query}
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="map-state">State</Label>
                    <select
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
                      id="map-state"
                      onChange={(event) =>
                        setSearchDraft((current) => ({ ...current, stateId: event.target.value }))
                      }
                      value={searchDraft.stateId}
                    >
                      <option value="">All states</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.code} · {state.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="map-place-type">Place type</Label>
                    <select
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
                      id="map-place-type"
                      onChange={(event) =>
                        setSearchDraft((current) => ({ ...current, placeType: event.target.value }))
                      }
                      value={searchDraft.placeType}
                    >
                      <option value="">All place types</option>
                      {allPlaceTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                    <input
                      checked={searchDraft.activeOnly}
                      onChange={(event) =>
                        setSearchDraft((current) => ({
                          ...current,
                          activeOnly: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    Active only
                  </label>

                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                    <input
                      checked={searchDraft.publicOnly}
                      onChange={(event) =>
                        setSearchDraft((current) => ({
                          ...current,
                          publicOnly: event.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    Public only
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    className="bg-slate-950 text-white hover:bg-slate-800"
                    disabled={isSearching}
                    onClick={runSearch}
                    type="button"
                  >
                    {isSearching ? (
                      <Compass className="size-4 animate-spin" />
                    ) : (
                      <Search className="size-4" />
                    )}
                    {isSearching ? "Searching…" : "Search stored places"}
                  </Button>
                  <Button
                    className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50"
                    onClick={resetSearch}
                    type="button"
                    variant="outline"
                  >
                    <RefreshCcw className="size-4" />
                    Reset filters
                  </Button>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Inspected</p>
                    <p className="mt-2 font-display text-2xl text-slate-950">{places.length}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Matched</p>
                    <p className="mt-2 font-display text-2xl text-slate-950">{searchCounts.matched}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pipeline</p>
                    <p className="mt-2 font-display text-2xl text-slate-950">
                      {searchCounts.candidate + searchCounts.live}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <CardHeader className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Selected place
                </p>
                <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                  {selectedPlace ? selectedPlace.name : "Pick a marker to inspect"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedPlace ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge className={statusBadgeTone(selectedStatus ?? "imported")}>
                        {statusLabel(selectedStatus ?? "imported")}
                      </Badge>
                      {selectedCandidate ? (
                        <Badge className="bg-cyan-100 text-cyan-950">
                          Candidate {selectedCandidate.status}
                        </Badge>
                      ) : null}
                      {selectedQuest ? (
                        <Badge className="bg-amber-100 text-amber-950">Live quest</Badge>
                      ) : null}
                    </div>

                    <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-display text-xl text-slate-950">{selectedPlace.name}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {selectedPlace.place_type}
                            {selectedPlace.city ? ` · ${selectedPlace.city}` : ""}
                            {selectedPlace.state ? ` · ${selectedPlace.state.code}` : ""}
                          </p>
                        </div>
                        <Badge variant="outline">{formatStateLabel(selectedPlace.state)}</Badge>
                      </div>

                      <div className="grid gap-2 text-sm text-slate-600">
                        <div className="flex flex-wrap items-center gap-2">
                          <MapPin className="size-4 text-slate-500" />
                          <span>
                            {selectedPlace.latitude.toFixed(5)}, {selectedPlace.longitude.toFixed(5)}
                          </span>
                        </div>
                        {selectedPlace.address ? <p>{selectedPlace.address}</p> : null}
                        {selectedPlace.rating !== null ? (
                          <p>Rating {selectedPlace.rating.toFixed(1)}</p>
                        ) : null}
                        {selectedPlace.review_count !== null ? (
                          <p>{selectedPlace.review_count} reviews</p>
                        ) : null}
                      </div>
                    </div>

                    <div className="grid gap-3">
                      <div className="flex flex-wrap gap-3">
                        <Button asChild className="bg-slate-950 text-white hover:bg-slate-800">
                          <Link href={`/dashboard/places?edit=${selectedPlace.id}`}>
                            <Layers3 className="size-4" />
                            Open place
                          </Link>
                        </Button>

                        {selectedCandidate ? (
                          <Button asChild className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50" variant="outline">
                            <Link href={`/dashboard/candidates?edit=${selectedCandidate.id}`}>
                              <Sparkles className="size-4" />
                              Open candidate
                            </Link>
                          </Button>
                        ) : selectedPlace.is_active && selectedPlace.is_publicly_visitable ? (
                          <form action={generateQuestCandidateAction}>
                            <input name="place_id" type="hidden" value={selectedPlace.id} />
                            <Button type="submit" className="bg-cyan-500 text-slate-950 hover:bg-cyan-400">
                              <Sparkles className="size-4" />
                              Generate candidate
                            </Button>
                          </form>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                            This place needs to be active and publicly visitable before generating a candidate.
                          </div>
                        )}

                        {selectedQuest ? (
                          <Button asChild className="border-slate-200 bg-white text-slate-900 hover:bg-slate-50" variant="outline">
                            <Link href={`/dashboard/quests?edit=${selectedQuest.id}`}>
                              <ArrowRight className="size-4" />
                              Open live quest
                            </Link>
                          </Button>
                        ) : null}
                      </div>

                      <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-600">
                        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                          Pipeline note
                        </p>
                        <p className="mt-2">
                          {selectedQuest
                            ? "This place is already published as a live quest."
                            : selectedCandidate
                              ? `A ${selectedCandidate.status} candidate already exists for this place.`
                              : "No candidate exists yet. Generate one from the selected place when it is ready."}
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                    Use the map or the list to pick a stored place. The details panel will show
                    imported state, candidate state, and live quest state in one place.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
              <CardHeader className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                      Search results
                    </p>
                    <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                      Matching stored places
                    </CardTitle>
                  </div>
                  <Badge variant="outline">{searchCounts.matched} results</Badge>
                </div>
              </CardHeader>
              <CardContent>
                {filteredPlaces.length > 0 ? (
                  <div className="max-h-[560px] space-y-3 overflow-y-auto pr-1">
                    {filteredPlaces.map((place) => {
                      const candidate = candidateByPlaceId.get(place.id) ?? null;
                      const quest = questByPlaceId.get(place.id) ?? null;
                      const status = getPlaceStatus(place, candidate, quest);
                      const isSelected = place.id === selectedPlaceId;

                      return (
                        <button
                          key={place.id}
                          className={`w-full rounded-[1.5rem] border p-4 text-left transition ${
                            isSelected
                              ? "border-cyan-300 bg-cyan-50/70 shadow-[0_16px_30px_rgba(14,165,233,0.12)]"
                              : "border-slate-200 bg-slate-50/80 hover:border-slate-300 hover:bg-slate-50"
                          }`}
                          onClick={() => setSelectedPlaceId(place.id)}
                          type="button"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge className={statusBadgeTone(status)}>{statusLabel(status)}</Badge>
                                <Badge variant="outline">{place.place_type}</Badge>
                                {place.state ? (
                                  <Badge variant="outline">{place.state.code}</Badge>
                                ) : null}
                              </div>
                              <div>
                                <p className="font-display text-lg text-slate-950">{place.name}</p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {place.city ?? "Unknown city"}
                                  {place.state ? `, ${place.state.code}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="space-y-2 text-right text-sm text-slate-500">
                              <p className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                                <MapPin className="size-3.5" />
                                {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                              </p>
                              {candidate ? (
                                <p>{candidate.status} candidate</p>
                              ) : (
                                <p>No candidate yet</p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                    No stored places matched this search. Clear the filters or switch to manual add
                    mode to seed a fresh place.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent className="m-0 space-y-6" value="manual">
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
            <CardHeader className="space-y-3 border-b border-white/10 p-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-white/10 text-white">Manual add mode</Badge>
                <Badge className="bg-amber-100 text-amber-950">Drop a pin on the map</Badge>
                <Badge variant="outline" className="border-white/10 bg-white/5 text-white">
                  Save place or save + generate candidate
                </Badge>
              </div>
              <CardTitle className="font-display text-2xl tracking-tight">
                Click the map to seed a new place, then save it into the pipeline
              </CardTitle>
              <p className="max-w-3xl text-sm leading-7 text-slate-300">
                Manual add mode is separate from stored place search. Use it when you already know
                the location, want to place a pin visually, and then create the place record or
                place-plus-candidate in one pass.
              </p>
            </CardHeader>

            <CardContent className="space-y-4 p-0">
              <div className="relative min-h-[660px] overflow-hidden">
                <MapCanvas
                  draftPin={draftPin}
                  fallbackCenter={manualCenter}
                  mode="manual"
                  onDropPin={handleMapPinDrop}
                  onSelectPlace={(placeId) => setSelectedPlaceId(placeId)}
                  places={places}
                  selectedPlaceId={resolvedSelectedPlaceId}
                />

                <div className="pointer-events-none absolute left-4 top-4 z-[500] flex flex-wrap gap-2">
                  <Badge className="bg-slate-950/90 text-white backdrop-blur">
                    <Pin className="mr-1.5 size-3.5" />
                    Click the map to drop a pin
                  </Badge>
                  {draftPin ? (
                    <Badge className="bg-amber-100 text-amber-950">Pin placed</Badge>
                  ) : (
                    <Badge className="bg-white/90 text-slate-950">No pin yet</Badge>
                  )}
                </div>

                <div className="pointer-events-none absolute right-4 top-4 z-[500] rounded-full border border-white/15 bg-slate-950/85 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-200 shadow-xl backdrop-blur">
                  Manual place creation
                </div>

                {!draftPin ? (
                  <div className="pointer-events-auto absolute inset-x-4 bottom-4 z-[500] max-w-[460px] rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-4 text-sm leading-7 text-slate-200 shadow-2xl backdrop-blur">
                    <p className="font-semibold text-white">No pin selected yet.</p>
                    <p className="mt-1 text-slate-300">
                      Click anywhere on the map to place the draft pin and populate the place form
                      on the right.
                    </p>
                  </div>
                ) : null}
              </div>
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
                The pin controls the coordinates. Choose a state, fill in the place details, then
                save. You can publish a candidate later through the existing review flow.
              </p>
            </CardHeader>

            <CardContent>
              <form action={savePlaceFromMapAction} className="space-y-4">
                <input name="latitude" type="hidden" value={manualDraft.latitude} />
                <input name="longitude" type="hidden" value={manualDraft.longitude} />
                <input name="state_code" type="hidden" value={manualDraft.state_code} />

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="manual-name">Place name</Label>
                    <Input id="manual-name" name="name" placeholder="Cloud Gate" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-place-type">Place type</Label>
                    <Input
                      id="manual-place-type"
                      name="place_type"
                      placeholder="landmark, cafe, park..."
                      value={manualDraft.place_type}
                      onChange={(event) =>
                        updateManualDraft("place_type", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-state">State</Label>
                    <select
                      className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm outline-none transition focus:border-slate-400"
                      id="manual-state"
                      name="state_id"
                      onChange={(event) => {
                        const nextStateId = event.target.value;
                        const nextState = stateById.get(nextStateId) ?? null;

                        setManualDraft((current) => ({
                          ...current,
                          state_code: nextState?.code ?? "",
                          state_id: nextStateId,
                        }));
                      }}
                      value={manualDraft.state_id}
                    >
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.code} · {state.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-city">City</Label>
                    <Input
                      id="manual-city"
                      name="city"
                      placeholder="Chicago"
                      value={manualDraft.city}
                      onChange={(event) => updateManualDraft("city", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-address">Address</Label>
                    <Input
                      id="manual-address"
                      name="address"
                      placeholder="201 E Randolph St"
                      value={manualDraft.address}
                      onChange={(event) => updateManualDraft("address", event.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-latitude">Latitude</Label>
                    <Input
                      id="manual-latitude"
                      name="latitude-visible"
                      onChange={(event) =>
                        setManualDraft((current) => ({
                          ...current,
                          latitude: Number(event.target.value),
                        }))
                      }
                      step="0.000001"
                      type="number"
                      value={manualDraft.latitude}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="manual-longitude">Longitude</Label>
                    <Input
                      id="manual-longitude"
                      name="longitude-visible"
                      onChange={(event) =>
                        setManualDraft((current) => ({
                          ...current,
                          longitude: Number(event.target.value),
                        }))
                      }
                      step="0.000001"
                      type="number"
                      value={manualDraft.longitude}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="manual-description">Description</Label>
                    <Textarea
                      id="manual-description"
                      name="description"
                      placeholder="Short internal description for admin review and candidate generation."
                      value={manualDraft.description}
                      onChange={(event) => updateManualDraft("description", event.target.value)}
                      rows={4}
                    />
                  </div>
                </div>

                <details className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4">
                  <summary className="cursor-pointer text-sm font-medium text-slate-700">
                    Optional details
                  </summary>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="manual-website">Website</Label>
                      <Input
                        id="manual-website"
                        name="website"
                        placeholder="https://example.com"
                        value={manualDraft.website}
                        onChange={(event) => updateManualDraft("website", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-image">Image URL</Label>
                      <Input
                        id="manual-image"
                        name="image_url"
                        placeholder="https://..."
                        value={manualDraft.image_url}
                        onChange={(event) => updateManualDraft("image_url", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-rating">Rating</Label>
                      <Input
                        id="manual-rating"
                        name="rating"
                        onChange={(event) => updateManualDraft("rating", event.target.value)}
                        placeholder="4.7"
                        step="0.1"
                        type="number"
                        value={manualDraft.rating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-review-count">Review count</Label>
                      <Input
                        id="manual-review-count"
                        name="review_count"
                        onChange={(event) => updateManualDraft("review_count", event.target.value)}
                        placeholder="124"
                        type="number"
                        value={manualDraft.review_count}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-source">External source</Label>
                      <Input
                        id="manual-source"
                        name="external_source"
                        placeholder="google_places"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manual-external-id">External ID</Label>
                      <Input
                        id="manual-external-id"
                        name="external_id"
                        placeholder="optional source identifier"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="manual-source-metadata">Source metadata JSON</Label>
                      <Textarea
                        id="manual-source-metadata"
                        name="source_metadata"
                        placeholder='{"note":"manual-seed"}'
                        rows={4}
                      />
                    </div>
                  </div>
                </details>

                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                    <input
                      checked={manualDraft.is_active}
                      name="is_active"
                      onChange={(event) => updateManualDraft("is_active", event.target.checked)}
                      type="checkbox"
                    />
                    Active
                  </label>
                  <label className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700">
                    <input
                      checked={manualDraft.is_publicly_visitable}
                      name="is_publicly_visitable"
                      onChange={(event) =>
                        updateManualDraft("is_publicly_visitable", event.target.checked)
                      }
                      type="checkbox"
                    />
                    Publicly visitable
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    className="bg-slate-950 text-white hover:bg-slate-800"
                    type="submit"
                  >
                    <Plus className="size-4" />
                    Save place
                  </Button>
                  <Button
                    className="bg-cyan-500 text-slate-950 hover:bg-cyan-400"
                    formAction={savePlaceAndGenerateCandidateAction}
                    type="submit"
                  >
                    <Sparkles className="size-4" />
                    Add + generate candidate
                  </Button>
                </div>

                <p className="text-xs leading-6 text-slate-500">
                  The map click updates latitude and longitude instantly. Save the place first if
                  you want to keep it as a place-only record, or use the combined action to create
                  the place and draft candidate together.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
