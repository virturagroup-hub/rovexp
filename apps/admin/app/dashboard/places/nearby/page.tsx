import Link from "next/link";
import { ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { generateNearbyQuestCandidatesAction } from "@/lib/admin/actions";
import {
  listPlaces,
  listQuestCandidates,
  listStates,
  previewNearbyQuestCandidateGeneration,
  nearbyGenerationSkipLabels,
} from "@/lib/admin/repository";
import type {
  NearbyGenerationSummary,
  NearbyQuestCandidatePreview,
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
  return Boolean(
    readParam(params.state_id) &&
      readParam(params.latitude) &&
      readParam(params.longitude) &&
      readParam(params.radius_miles),
  );
}

export default async function NearbyPlacesPage({ searchParams }: NearbyPlacesPageProps) {
  const params = await searchParams;
  const [states, places, candidates] = await Promise.all([
    listStates(),
    listPlaces(),
    listQuestCandidates(),
  ]);

  const latitude = Number(readParam(params.latitude));
  const longitude = Number(readParam(params.longitude));
  const radiusMiles = Number(readParam(params.radius_miles));
  const previewFilters =
    hasPreviewFilters(params) &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Number.isFinite(radiusMiles)
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
          state_id: readParam(params.state_id),
        }
      : null;

  const preview: NearbyQuestCandidatePreview | null = previewFilters
    ? await previewNearbyQuestCandidateGeneration(previewFilters)
    : null;

  const generatedSummary = parseSummary(params.summary);
  const selectedState = states.find((state) => state.id === readParam(params.state_id)) ?? null;
  const totalKnownPlaces = places.length;
  const candidateCount = candidates.length;
  const renderSummary = generatedSummary ?? preview;

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
                { label: "Preview matches", value: preview?.matched_count ?? 0 },
                { label: "Generated today", value: generatedSummary?.created_count ?? 0 },
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
                    Radius {renderSummary.radius_miles} miles around {renderSummary.latitude.toFixed(3)},{" "}
                    {renderSummary.longitude.toFixed(3)}
                  </p>
                  <p className="text-slate-300">
                    State {renderSummary.state_code} · {renderSummary.state_name}
                  </p>
                  {renderSummary.city ? <p className="text-slate-300">City filter: {renderSummary.city}</p> : null}
                </div>
              </div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-slate-300">
                Fill out the form on the left, preview the matching places, then run the bulk generator.
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
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Nearby generation filters
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              Preview the area before bulk-generating drafts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action="/dashboard/places/nearby" method="get" className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">State</label>
                  <select
                    defaultValue={readParam(params.state_id)}
                    name="state_id"
                    className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                    required
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
                  <label className="text-sm font-semibold text-slate-700">Area label</label>
                  <Input
                    defaultValue={readParam(params.area_label)}
                    name="area_label"
                    placeholder="Lafayette downtown, Riverfront, campus district..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">City filter</label>
                <Input
                  defaultValue={readParam(params.city)}
                  name="city"
                  placeholder="Optional city or neighborhood name"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Latitude</label>
                  <Input
                    defaultValue={readParam(params.latitude)}
                    name="latitude"
                    required
                    step="0.000001"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Longitude</label>
                  <Input
                    defaultValue={readParam(params.longitude)}
                    name="longitude"
                    required
                    step="0.000001"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Radius (miles)</label>
                  <Input
                    defaultValue={readParam(params.radius_miles) || "10"}
                    min="1"
                    name="radius_miles"
                    required
                    step="1"
                    type="number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Place type keywords
                </label>
                <Textarea
                  defaultValue={readParam(params.place_types)}
                  name="place_types"
                  placeholder="cafe, park, museum, landmark, bookstore, mural"
                  rows={3}
                />
                <p className="text-xs leading-6 text-slate-500">
                  Separate keywords with commas or line breaks. The generator matches against the stored
                  place type, name, and description.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Minimum rating
                  </label>
                  <Input
                    defaultValue={readParam(params.min_rating)}
                    max="5"
                    min="0"
                    name="min_rating"
                    placeholder="Optional"
                    step="0.1"
                    type="number"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Minimum review count
                  </label>
                  <Input
                    defaultValue={readParam(params.min_review_count)}
                    min="0"
                    name="min_review_count"
                    placeholder="Optional"
                    step="1"
                    type="number"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <input
                    defaultChecked={
                      typeof params.active_only !== "undefined"
                        ? readBooleanParam(params.active_only)
                        : true
                    }
                    name="active_only"
                    type="checkbox"
                    className="size-4 accent-slate-950"
                  />
                  Active places only
                </label>

                <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <input
                    defaultChecked={
                      typeof params.public_only !== "undefined"
                        ? readBooleanParam(params.public_only)
                        : true
                    }
                    name="public_only"
                    type="checkbox"
                    className="size-4 accent-slate-950"
                  />
                  Publicly visitable only
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" className="bg-slate-950 text-white hover:bg-slate-800">
                  <Sparkles className="size-4" />
                  Preview nearby places
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard/places/nearby">Reset filters</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardHeader className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Bulk generation
              </p>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                Run the bulk workflow with the current preview filters
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-7 text-slate-600">
                The generator will create draft quest candidates only. It skips places that are already
                represented by a candidate or a live quest, so you can safely re-run a batch after
                adjusting the inputs.
              </p>

              {preview ? (
                <form action={generateNearbyQuestCandidatesAction} className="space-y-0">
                  <input type="hidden" name="state_id" value={readParam(params.state_id)} />
                  <input type="hidden" name="area_label" value={readParam(params.area_label)} />
                  <input type="hidden" name="city" value={readParam(params.city)} />
                  <input type="hidden" name="latitude" value={readParam(params.latitude)} />
                  <input type="hidden" name="longitude" value={readParam(params.longitude)} />
                  <input type="hidden" name="radius_miles" value={readParam(params.radius_miles)} />
                  <input type="hidden" name="place_types" value={readParam(params.place_types)} />
                  <input type="hidden" name="min_rating" value={readParam(params.min_rating)} />
                  <input type="hidden" name="min_review_count" value={readParam(params.min_review_count)} />
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
                  <SubmitButton>
                    <CheckCircle2 className="size-4" />
                    Generate nearby candidates
                  </SubmitButton>
                </form>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-7 text-slate-600">
                  Run a preview first to enable the bulk generate button with the same filters.
                </div>
              )}

              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-7 text-slate-600">
                If the batch looks off, adjust the map pin or the place-type keywords, preview again,
                and re-run the generator. The existing candidate review queue remains the final gate
                before a quest goes live.
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardHeader className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Preview results
              </p>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                {preview ? `${preview.matches.length} places ready for draft generation` : "No preview yet"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {preview ? (
                <>
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
                            <p className="mt-2 font-display text-2xl text-slate-950">{item.count}</p>
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
                            <p className="mt-2 font-display text-2xl text-slate-950">{item.count}</p>
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
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                      Matching places
                    </p>
                    <div className="space-y-3">
                      {preview.matches.slice(0, 8).map((item) => (
                        <div
                          key={item.place.id}
                          className="rounded-3xl border border-slate-200 bg-white p-4 shadow-[0_10px_24px_rgba(15,23,42,0.05)]"
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
                              </div>
                              <div>
                                <p className="font-display text-lg font-semibold text-slate-950">
                                  {item.place.name}
                                </p>
                                <p className="mt-1 text-sm text-slate-600">
                                  {item.place.city ?? "Unknown city"} · {item.place.rating?.toFixed(1) ?? "No rating"} ·{" "}
                                  {item.place.review_count ?? 0} reviews
                                </p>
                              </div>
                            </div>

                            <div className="rounded-2xl bg-sky-50 px-3 py-2 text-right">
                              <p className="text-[11px] uppercase tracking-[0.24em] text-sky-700">
                                Distance
                              </p>
                              <p className="font-display text-lg font-semibold text-sky-950">
                                {item.distance_miles.toFixed(1)} mi
                              </p>
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
                        </div>
                      ))}
                    </div>

                    {preview.matches.length > 8 ? (
                      <p className="text-sm text-slate-500">
                        Showing the first 8 matches. The bulk generator will include the full set.
                      </p>
                    ) : null}
                  </div>
                </>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                  Enter a state, point, radius, and optional filters to preview nearby places.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
