import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { NearbyPlacesSearchControls } from "@/components/admin/nearby-places-search-controls";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateNearbyQuestCandidatesAction } from "@/lib/admin/actions";
import {
  listPlaces,
  listQuestCandidates,
  listQuests,
  listStates,
  previewNearbyQuestCandidateGenerationFromSearch,
  previewNearbyQuestCandidateGeneration,
  nearbyGenerationSkipLabels,
} from "@/lib/admin/repository";
import type {
  NearbyGenerationSummary,
  NearbyQuestCandidatePreview,
  NearbyPlacesSearchMode,
} from "@rovexp/types";

interface NearbyPlacesPageProps {
  searchParams: Promise<{
    active_only?: string;
    area_label?: string;
    city?: string;
    error?: string;
    latitude?: string;
    longitude?: string;
    min_rating?: string;
    min_review_count?: string;
    place_types?: string;
    public_only?: string;
    radius_miles?: string;
    search_mode?: string;
    state_id?: string;
    status?: string;
    summary?: string;
  }>;
}

function readParam(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function readNumberParam(value?: string | string[]) {
  const parsed = Number(readParam(value));

  return Number.isFinite(parsed) ? parsed : null;
}

function readBooleanParam(value?: string | string[]) {
  const next = readParam(value);

  return next === "on" || next === "true" || next === "1";
}

function readSearchModeParam(value?: string | string[]) {
  const next = readParam(value);

  if (next === "coordinates" || next === "combined" || next === "stored_area") {
    return next;
  }

  return null;
}

function parseSummary(value?: string | string[]) {
  const raw = readParam(value);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as NearbyGenerationSummary;
  } catch {
    return null;
  }
}

function hasPreviewFilters(params: Awaited<NearbyPlacesPageProps["searchParams"]>) {
  const searchMode = readSearchModeParam(params.search_mode);

  if (!readParam(params.state_id)) {
    return false;
  }

  if (searchMode) {
    return true;
  }

  return Boolean(readParam(params.latitude) && readParam(params.longitude));
}

export default async function NearbyPlacesPage({ searchParams }: NearbyPlacesPageProps) {
  const params = await searchParams;
  const [states, places, candidates, quests] = await Promise.all([
    listStates(),
    listPlaces(),
    listQuestCandidates(),
    listQuests(),
  ]);

  const searchMode = readSearchModeParam(params.search_mode);
  const latitude = readNumberParam(params.latitude);
  const longitude = readNumberParam(params.longitude);
  const radiusMiles = readNumberParam(params.radius_miles);
  const fallbackSearchMode: NearbyPlacesSearchMode =
    Number.isFinite(latitude ?? NaN) && Number.isFinite(longitude ?? NaN)
      ? "coordinates"
      : "stored_area";
  const resolvedSearchMode: NearbyPlacesSearchMode = searchMode ?? fallbackSearchMode;
  const previewFilters =
    hasPreviewFilters(params) && readParam(params.state_id)
      ? {
          active_only: readBooleanParam(params.active_only),
          area_label: readParam(params.area_label),
          city: readParam(params.city),
          latitude,
          longitude,
          min_rating: readNumberParam(params.min_rating),
          min_review_count: readNumberParam(params.min_review_count),
          place_types: readParam(params.place_types),
          public_only: readBooleanParam(params.public_only),
          radius_miles: radiusMiles,
          search_mode: resolvedSearchMode,
          selected_place_ids: [],
          state_id: readParam(params.state_id),
        }
      : null;

  let preview: NearbyQuestCandidatePreview | null = null;
  let previewError: string | null = null;

  if (previewFilters) {
    try {
      if (searchMode) {
        preview = await previewNearbyQuestCandidateGenerationFromSearch(previewFilters);
      } else if (
        Number.isFinite(latitude ?? NaN) &&
        Number.isFinite(longitude ?? NaN) &&
        Number.isFinite(radiusMiles ?? NaN)
      ) {
        preview = await previewNearbyQuestCandidateGeneration({
          active_only: previewFilters.active_only,
          area_label: previewFilters.area_label,
          city: previewFilters.city,
          latitude: latitude as number,
          longitude: longitude as number,
          min_rating: previewFilters.min_rating,
          min_review_count: previewFilters.min_review_count,
          place_types: previewFilters.place_types,
          public_only: previewFilters.public_only,
          radius_miles: radiusMiles as number,
          state_id: previewFilters.state_id,
        });
      }
    } catch (error) {
      previewError = error instanceof Error ? error.message : "Unable to preview nearby places.";
    }
  }

  const generatedSummary = parseSummary(params.summary);
  const selectedState = states.find((state) => state.id === readParam(params.state_id)) ?? null;
  const totalKnownPlaces = places.length;
  const candidateCount = candidates.length;
  const questCount = quests.length;
  const renderSummary = generatedSummary ?? preview;
  const searchControlsKey = [
    params.search_mode,
    params.state_id,
    params.area_label,
    params.city,
    params.latitude,
    params.longitude,
    params.radius_miles,
    params.place_types,
    params.min_rating,
    params.min_review_count,
    params.active_only,
    params.public_only,
  ]
    .map((value) => readParam(value))
    .join("|");

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-sky-100 text-sky-900">Bulk place seeding</Badge>
              <Badge variant="outline">Nearby candidates</Badge>
            </div>
            <CardTitle className="font-display text-3xl tracking-tight text-slate-950">
              Seed an area with places and generate quest drafts in one pass
            </CardTitle>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              Choose a state and center point, preview the matching stored places, and bulk-generate
              draft quest candidates. Duplicates and already-published sources are skipped automatically.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-slate-600">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                {
                  detail: "Add places first, then turn the best matches into review-ready drafts.",
                  label: "1. Import places",
                },
                {
                  detail: "Preview the radius, filters, and duplicate skips before generating anything.",
                  label: "2. Preview nearby",
                },
                {
                  detail: "Approve or reject candidates in the existing review queue before publishing.",
                  label: "3. Review and publish",
                },
              ].map((step) => (
                <div
                  key={step.label}
                  className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{step.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{step.detail}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                { label: "Known places", value: totalKnownPlaces },
                { label: "Quest candidates", value: candidateCount },
                { label: "Live quests", value: questCount },
                { label: "Preview matches", value: preview?.matched_count ?? 0 },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-3xl border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
                >
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{item.label}</p>
                  <p className="mt-2 font-display text-3xl font-semibold text-slate-950">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.75rem] border border-sky-200 bg-sky-50/70 p-4 text-sm leading-7 text-sky-950">
              Nearby matching uses a first-pass haversine distance check around the chosen coordinates.
              We keep the existing stored places table as the source of truth for this workflow, so it
              stays practical now and can be upgraded to PostGIS later if needed.
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Target area
            </p>
            <CardTitle className="font-display text-2xl tracking-tight">
              {generatedSummary?.area_label || readParam(params.area_label) || "Configure a nearby seed batch"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-7 text-slate-300">
            <p>
              This utility stays admin-controlled. It only creates draft quest candidates and leaves
              approval, editing, and publish steps in the existing candidate workflow.
            </p>

            {selectedState ? (
              <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Selected state</p>
                <p className="mt-1 font-display text-xl text-white">
                  {selectedState.code} · {selectedState.name}
                </p>
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 px-4 py-4 text-slate-300">
                Pick a state to start previewing nearby places.
              </div>
            )}

            {renderSummary ? (
              <div className="space-y-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: "Inspected", value: renderSummary.inspected_count },
                    { label: "Matched", value: renderSummary.matched_count },
                    { label: "Skipped", value: renderSummary.skipped_count },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl border border-white/10 bg-slate-900/50 px-3 py-3">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
                        {item.label}
                      </p>
                      <p className="mt-1 font-display text-2xl text-white">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Filters</p>
                  <p className="text-slate-300">
                    Search mode: {resolvedSearchMode}{" "}
                    {resolvedSearchMode === "stored_area"
                      ? "(center derived from stored places)"
                      : ""}
                  </p>
                  <p className="text-slate-300">
                    Radius {renderSummary.radius_miles} miles around {renderSummary.latitude.toFixed(3)},{" "}
                    {renderSummary.longitude.toFixed(3)}
                  </p>
                  <p className="text-slate-300">
                    State {renderSummary.state_code} · {renderSummary.state_name}
                  </p>
                  {renderSummary.city ? <p className="text-slate-300">City filter: {renderSummary.city}</p> : null}
                </div>
              </div>
            ) : previewError ? (
              <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-950">
                <p className="text-xs uppercase tracking-[0.24em] text-rose-700">Preview error</p>
                <p className="mt-2 text-sm leading-7">{previewError}</p>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-slate-300">
                Use the search panel below to preview matching places. Search mode changes which
                fields are required.
              </div>
            )}

            <Button
              asChild
              variant="outline"
              className="border-white/10 bg-white/5 text-white hover:bg-white/10"
            >
              <Link href="/dashboard/places">
                <ArrowLeft className="size-4" />
                Back to places
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.88fr]">
        <NearbyPlacesSearchControls
          key={searchControlsKey}
          hasPreview={Boolean(renderSummary)}
          resultAnchorId="nearby-results"
          states={states}
        />

        <div className="space-y-6">
          <Card
            id="nearby-results"
            className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
          >
            <CardHeader className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Preview results and generation
              </p>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                Visible matches, skipped reasons, and draft generation in one place
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-slate-600">
                The generator will create draft quest candidates only. It skips places that are
                already represented by a candidate or a live quest, so you can safely re-run a batch
                after adjusting the inputs.
              </p>

              {previewError ? (
                <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-4 text-rose-950">
                  <p className="text-xs uppercase tracking-[0.24em] text-rose-700">Preview error</p>
                  <p className="mt-2 text-sm leading-7">{previewError}</p>
                </div>
              ) : preview ? (
                <form action={generateNearbyQuestCandidatesAction} className="space-y-4">
                  <input type="hidden" name="state_id" value={readParam(params.state_id)} />
                  <input type="hidden" name="area_label" value={readParam(params.area_label)} />
                  <input type="hidden" name="city" value={readParam(params.city)} />
                  <input type="hidden" name="latitude" value={readParam(params.latitude)} />
                  <input type="hidden" name="longitude" value={readParam(params.longitude)} />
                  <input type="hidden" name="radius_miles" value={readParam(params.radius_miles)} />
                  <input type="hidden" name="place_types" value={readParam(params.place_types)} />
                  <input type="hidden" name="min_rating" value={readParam(params.min_rating)} />
                  <input type="hidden" name="min_review_count" value={readParam(params.min_review_count)} />
                  <input type="hidden" name="search_mode" value={searchMode ?? "stored_area"} />
                  <input
                    type="hidden"
                    name="active_only"
                    value={readBooleanParam(params.active_only) ? "on" : ""}
                  />
                  <input
                    type="hidden"
                    name="public_only"
                    value={readBooleanParam(params.public_only) ? "on" : ""}
                  />

                  <div className="flex flex-wrap gap-3">
                    <SubmitButton name="intent" value="generate_all">
                      <CheckCircle2 className="size-4" />
                      Generate all matched places
                    </SubmitButton>
                    <SubmitButton
                      name="intent"
                      value="generate_selected"
                      variant="outline"
                      className="border-slate-200"
                    >
                      <Sparkles className="size-4" />
                      Generate selected places
                    </SubmitButton>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {preview.skipped_breakdown.length > 0
                      ? preview.skipped_breakdown.map((item) => (
                          <div
                            key={item.reason}
                            className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                          >
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                              {nearbyGenerationSkipLabels[item.reason]}
                            </p>
                            <p className="mt-2 font-display text-2xl text-slate-950">
                              {item.count}
                            </p>
                          </div>
                        ))
                      : [
                          {
                            count: preview.skipped_count,
                            label: "No skipped places",
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                          >
                            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                              {item.label}
                            </p>
                            <p className="mt-2 font-display text-2xl text-slate-950">
                              {item.count}
                            </p>
                          </div>
                        ))}
                  </div>

                  {preview.skipped_examples.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Sample skips
                      </p>
                      <div className="space-y-3">
                        {preview.skipped_examples.map((item) => (
                          <div
                            key={`${item.place.id}-${item.reason}`}
                            className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <p className="font-display text-lg font-semibold text-slate-950">
                                  {item.place.name}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {item.place.city ?? "Unknown city"} · {item.place.place_type}
                                </p>
                              </div>
                              <Badge variant="outline">
                                {nearbyGenerationSkipLabels[item.reason]}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Matching places
                      </p>
                      <Badge variant="outline">
                        {preview.matches.length} eligible
                      </Badge>
                    </div>
                    <div className="space-y-3">
                      {preview.matches.map((item) => (
                        <label
                          key={item.place.id}
                          className="block rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)] transition hover:border-sky-200"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="outline">{item.place.place_type}</Badge>
                                {item.place.state ? (
                                  <Badge variant="outline">
                                    {item.place.state.code} · {item.place.state.name}
                                  </Badge>
                                ) : null}
                                <Badge className="bg-sky-100 text-sky-900">
                                  Imported place
                                </Badge>
                              </div>
                              <div>
                                <p className="font-display text-lg font-semibold text-slate-950">
                                  {item.place.name}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {item.place.city ?? "Unknown city"} ·{" "}
                                  {item.place.rating?.toFixed(1) ?? "No rating"} ·{" "}
                                  {item.place.review_count ?? 0} reviews
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="rounded-2xl bg-sky-50 px-3 py-2 text-right">
                                <p className="text-[11px] uppercase tracking-[0.24em] text-sky-700">
                                  Distance
                                </p>
                                <p className="font-display text-lg font-semibold text-sky-950">
                                  {item.distance_miles.toFixed(1)} mi
                                </p>
                              </div>
                              <input
                                type="checkbox"
                                name="selected_place_ids"
                                value={item.place.id}
                                className="size-5 rounded border-slate-300 text-slate-950 accent-slate-950"
                              />
                            </div>
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.2em] text-slate-500">
                            <span className="rounded-full bg-slate-100 px-3 py-1">
                              {item.place.is_publicly_visitable ? "Public" : "Private"}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1">
                              {item.place.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                        </label>
                      ))}
                    </div>

                  </div>
                </form>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-7 text-slate-600">
                  Run a preview first to see matched places and enable bulk generation with the same
                  filters.
                </div>
              )}

              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-7 text-slate-600">
                If the batch looks off, adjust the map pin or the place-type keywords, preview again,
                and re-run the generator. The existing candidate review queue remains the final gate
                before a quest goes live.
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
