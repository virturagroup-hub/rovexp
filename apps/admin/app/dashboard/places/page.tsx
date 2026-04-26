import Link from "next/link";
import { ArrowRight, Layers3, MapPin, Plus, Sparkles } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  generateQuestCandidateAction,
  importPlacesAction,
  savePlaceAction,
} from "@/lib/admin/actions";
import { listPlaces, listQuestCandidates, listStates } from "@/lib/admin/repository";

interface PlacesPageProps {
  searchParams: Promise<{
    edit?: string;
    error?: string;
    status?: string;
  }>;
}

export default async function PlacesPage({ searchParams }: PlacesPageProps) {
  const params = await searchParams;
  const [places, candidates, states] = await Promise.all([
    listPlaces(),
    listQuestCandidates(),
    listStates(),
  ]);

  const editing = places.find((item) => item.id === params.edit) ?? null;
  const candidateByPlaceId = new Map(candidates.map((candidate) => [candidate.place_id, candidate]));
  const activeCount = places.filter((place) => place.is_active).length;
  const publicCount = places.filter((place) => place.is_publicly_visitable).length;

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <section className="grid gap-4 md:grid-cols-4">
        {[
          {
            detail: "All imported and curated place records.",
            label: "Places",
            value: places.length,
          },
          {
            detail: "Location rows marked active for candidate generation.",
            label: "Active places",
            value: activeCount,
          },
          {
            detail: "Visible, visitable locations that can seed quests.",
            label: "Public places",
            value: publicCount,
          },
          {
            detail: "Places already flowing into candidate review.",
            label: "Candidate links",
            value: candidates.length,
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
          >
            <CardContent className="space-y-2 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {item.label}
              </p>
              <p className="font-display text-4xl font-semibold text-slate-950">
                {item.value}
              </p>
              <p className="text-sm leading-7 text-slate-600">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
        <CardContent className="flex flex-col gap-4 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
              Nearby generation utility
            </p>
            <h2 className="font-display text-2xl tracking-tight">Bulk-generate quest candidates by area</h2>
            <p className="max-w-2xl text-sm leading-7 text-slate-300">
              Open the nearby generator to preview stored places around a state, city, or pin, then
              create draft candidates in one admin-controlled pass.
            </p>
          </div>
          <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
            <Link href="/dashboard/places/nearby">
              Open nearby generator
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Nearby places
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              Import, inspect, and seed candidate-ready locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {places.length > 0 ? (
              places.map((place) => {
                const candidate = candidateByPlaceId.get(place.id) ?? null;
                const eligible =
                  place.is_active &&
                  place.is_publicly_visitable &&
                  Number.isFinite(place.latitude) &&
                  Number.isFinite(place.longitude);

                return (
                  <div
                    key={place.id}
                    className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline">{place.place_type}</Badge>
                          {place.state ? (
                            <Badge variant="outline">
                              {place.state.code} · {place.state.name}
                            </Badge>
                          ) : null}
                          <Badge
                            variant={place.is_active ? "default" : "secondary"}
                            className={place.is_active ? "bg-emerald-100 text-emerald-900" : ""}
                          >
                            {place.is_active ? "Active" : "Inactive"}
                          </Badge>
                          <Badge
                            variant={place.is_publicly_visitable ? "default" : "secondary"}
                            className={place.is_publicly_visitable ? "bg-sky-100 text-sky-900" : ""}
                          >
                            {place.is_publicly_visitable ? "Public" : "Private"}
                          </Badge>
                          {candidate ? (
                            <Badge className="bg-violet-100 text-violet-900">
                              Candidate {candidate.status}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No candidate yet</Badge>
                          )}
                        </div>

                        <div>
                          <p className="font-display text-xl font-semibold text-slate-950">
                            {place.name}
                          </p>
                          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                            {place.description ?? "No public description yet. Add one to help candidate generation feel more intentional."}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {candidate ? (
                          <Button asChild variant="outline">
                            <Link href={`/dashboard/candidates?edit=${candidate.id}`}>
                              <Layers3 className="size-4" />
                              Open candidate
                            </Link>
                          </Button>
                        ) : eligible ? (
                          <form action={generateQuestCandidateAction}>
                            <input type="hidden" name="place_id" value={place.id} />
                            <Button type="submit" className="w-full">
                              <Sparkles className="size-4" />
                              Generate candidate
                            </Button>
                          </form>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-4 py-3 text-xs uppercase tracking-[0.2em] text-slate-500">
                            Needs public access and coordinates
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                        <MapPin className="size-3.5" />
                        {place.latitude.toFixed(4)}, {place.longitude.toFixed(4)}
                      </span>
                      {place.rating ? (
                        <span className="rounded-full bg-white px-3 py-1">
                          Rating {place.rating.toFixed(1)}
                        </span>
                      ) : null}
                      {place.review_count !== null ? (
                        <span className="rounded-full bg-white px-3 py-1">
                          {place.review_count} reviews
                        </span>
                      ) : null}
                      {place.website ? (
                        <span className="truncate rounded-full bg-white px-3 py-1">
                          {place.website.replace("https://", "")}
                        </span>
                      ) : null}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                No places yet. Use the form to create the first seed location or paste a JSON import below.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardHeader className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {editing ? "Edit place" : "Create place"}
              </p>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                {editing ? editing.name : "New nearby place"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={savePlaceAction} className="space-y-4">
                <input type="hidden" name="id" value={editing?.id ?? ""} />

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Place name
                  </label>
                  <Input name="name" defaultValue={editing?.name ?? ""} required />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Description
                  </label>
                  <Textarea
                    name="description"
                    defaultValue={editing?.description ?? ""}
                    placeholder="Why is this place worth turning into a quest candidate?"
                    rows={4}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Place type
                    </label>
                    <Input
                      name="place_type"
                      defaultValue={editing?.place_type ?? ""}
                      placeholder="landmark, cafe, park, mural..."
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      State
                    </label>
                    <select
                      name="state_id"
                      defaultValue={editing?.state_id ?? ""}
                      className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                    >
                      <option value="">Select state</option>
                      {states.map((state) => (
                        <option key={state.id} value={state.id}>
                          {state.code} · {state.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Latitude
                    </label>
                    <Input
                      name="latitude"
                      type="number"
                      step="0.000001"
                      defaultValue={editing?.latitude ?? ""}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Longitude
                    </label>
                    <Input
                      name="longitude"
                      type="number"
                      step="0.000001"
                      defaultValue={editing?.longitude ?? ""}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Address
                    </label>
                    <Input name="address" defaultValue={editing?.address ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      City
                    </label>
                    <Input name="city" defaultValue={editing?.city ?? ""} />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Rating
                    </label>
                    <Input
                      name="rating"
                      type="number"
                      step="0.1"
                      min="0"
                      max="5"
                      defaultValue={editing?.rating ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Review count
                    </label>
                    <Input
                      name="review_count"
                      type="number"
                      min="0"
                      defaultValue={editing?.review_count ?? ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Price level
                    </label>
                    <Input
                      name="price_level"
                      type="number"
                      min="0"
                      max="4"
                      defaultValue={editing?.price_level ?? ""}
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Website
                    </label>
                    <Input
                      name="website"
                      type="url"
                      defaultValue={editing?.website ?? ""}
                      placeholder="https://..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Phone
                    </label>
                    <Input name="phone" defaultValue={editing?.phone ?? ""} />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Image URL
                  </label>
                  <Input
                    name="image_url"
                    type="url"
                    defaultValue={editing?.image_url ?? ""}
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Source metadata JSON
                  </label>
                  <Textarea
                    name="source_metadata"
                    defaultValue={
                      editing?.source_metadata
                        ? JSON.stringify(editing.source_metadata, null, 2)
                        : ""
                    }
                    placeholder='{"source":"manual","note":"Imported from a CSV"}'
                    rows={5}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="is_publicly_visitable"
                      defaultChecked={editing?.is_publicly_visitable ?? true}
                      className="size-4 accent-slate-950"
                    />
                    Publicly visitable
                  </label>

                  <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="is_active"
                      defaultChecked={editing?.is_active ?? true}
                      className="size-4 accent-slate-950"
                    />
                    Active in seed pipeline
                  </label>
                </div>

                <div className="flex flex-wrap gap-3">
                  <SubmitButton>
                    {editing ? "Save place" : "Create place"}
                  </SubmitButton>
                  {editing ? (
                    <Button asChild variant="outline">
                      <Link href="/dashboard/places">Clear selection</Link>
                    </Button>
                  ) : null}
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
            <CardHeader className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Bulk import
              </p>
              <CardTitle className="font-display text-2xl tracking-tight">
                Paste a JSON array of places
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form action={importPlacesAction} className="space-y-4">
                <Textarea
                  name="places_json"
                  defaultValue={JSON.stringify(
                    [
                      {
                        name: "Example cafe",
                        place_type: "cafe",
                        latitude: 41.88,
                        longitude: -87.62,
                        city: "Chicago",
                        state_id: states[0]?.id,
                        is_publicly_visitable: true,
                        is_active: true,
                      },
                    ],
                    null,
                    2,
                  )}
                  rows={10}
                  className="min-h-[240px] border-white/10 bg-white/5 text-white placeholder:text-slate-400"
                />
                <p className="text-sm leading-7 text-slate-300">
                  Include one object or an array of objects. The importer will upsert
                  each record and keep the place pipeline admin-controlled.
                </p>
                <SubmitButton>
                  <Plus className="size-4" />
                  Import places
                </SubmitButton>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
