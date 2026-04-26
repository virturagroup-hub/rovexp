"use client";

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Sparkles, Trash2 } from "lucide-react";

import type {
  PlaceWithRelations,
  QuestCandidateWithRelations,
  QuestWithRelations,
  StateRecord,
} from "@rovexp/types";

import {
  deletePlaceAction,
  savePlaceAction,
  savePlaceAndGenerateCandidateAction,
} from "@/lib/admin/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/admin/submit-button";
import { Textarea } from "@/components/ui/textarea";

interface PlaceEditorDialogProps {
  place: PlaceWithRelations;
  candidate: QuestCandidateWithRelations | null;
  defaultOpen?: boolean;
  quest: QuestWithRelations | null;
  states: StateRecord[];
}

export function PlaceEditorDialog({
  place,
  candidate,
  defaultOpen = false,
  quest,
  states,
}: PlaceEditorDialogProps) {
  const isEligibleForGeneration =
    place.is_active &&
    place.is_publicly_visitable &&
    Number.isFinite(place.latitude) &&
    Number.isFinite(place.longitude) &&
    !candidate;

  const stateWarning = useMemo(() => {
    if (!place.state && (place.state_id || place.state_code)) {
      return "State metadata could not be resolved. Pick a valid state to keep location data trustworthy.";
    }

    return null;
  }, [place.state, place.state_code, place.state_id]);

  return (
    <Dialog defaultOpen={defaultOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-slate-200 bg-white/80">
          Edit place
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[min(96vw,1440px)] max-w-none overflow-hidden rounded-[2rem] border-slate-200 p-0 shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
        <div className="flex max-h-[calc(100vh-2rem)] flex-col">
          <div className="border-b border-slate-200 bg-[linear-gradient(135deg,_#f8fbff,_#edf4fb)] px-8 py-6">
            <DialogHeader className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.24em] text-slate-500">
                <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm">Edit place profile</span>
                <span className="rounded-full bg-white/70 px-3 py-1 shadow-sm">Stored location</span>
                <span className="rounded-full bg-white/70 px-3 py-1 shadow-sm">Candidate pipeline</span>
              </div>
              <div className="space-y-2">
                <DialogTitle className="font-display text-3xl tracking-tight text-slate-950">
                  {place.name}
                </DialogTitle>
                <DialogDescription className="max-w-4xl text-sm leading-7 text-slate-600">
                  Edit the stored place record, keep the public description and image polished,
                  and move it cleanly toward candidate review or publishing.
                </DialogDescription>
              </div>
            </DialogHeader>
          </div>

          <div className="grid min-h-0 flex-1 gap-0 xl:grid-cols-[minmax(0,1.25fr)_380px]">
            <div className="min-h-0 overflow-y-auto px-8 py-6">
              <form action={savePlaceAction} className="space-y-6">
                <input type="hidden" name="id" value={place.id} />

                <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 space-y-1">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Core profile</p>
                    <h3 className="font-display text-xl tracking-tight text-slate-950">
                      Identity and public description
                    </h3>
                  </div>

                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Place name</label>
                      <Input name="name" defaultValue={place.name} required />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Public description</label>
                      <Textarea
                        name="public_description"
                        defaultValue={place.description ?? ""}
                        placeholder="A short public description that helps the quest feel intentional."
                        rows={5}
                        className="min-h-[130px]"
                      />
                      <p className="text-xs leading-6 text-slate-500">
                        If left blank, RoveXP will derive a safe public description from the place data.
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 space-y-1">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Location</p>
                    <h3 className="font-display text-xl tracking-tight text-slate-950">
                      Coordinates, state, and nearby context
                    </h3>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Place type</label>
                      <Input name="place_type" defaultValue={place.place_type} required />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">State</label>
                      <select
                        name="state_id"
                        defaultValue={place.state_id ?? ""}
                        className="flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-xs"
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
                      <label className="text-sm font-semibold text-slate-700">Latitude</label>
                      <Input
                        name="latitude"
                        type="number"
                        step="0.000001"
                        defaultValue={place.latitude}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Longitude</label>
                      <Input
                        name="longitude"
                        type="number"
                        step="0.000001"
                        defaultValue={place.longitude}
                        required
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Address</label>
                      <Input name="address" defaultValue={place.address ?? ""} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">City</label>
                      <Input name="city" defaultValue={place.city ?? ""} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Price level</label>
                      <Input
                        name="price_level"
                        type="number"
                        min="0"
                        max="4"
                        defaultValue={place.price_level ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Rating</label>
                      <Input
                        name="rating"
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        defaultValue={place.rating ?? ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Review count</label>
                      <Input
                        name="review_count"
                        type="number"
                        min="0"
                        defaultValue={place.review_count ?? ""}
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 space-y-1">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Media and metadata</p>
                    <h3 className="font-display text-xl tracking-tight text-slate-950">
                      Attach the public-facing details
                    </h3>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Website</label>
                      <Input
                        name="website"
                        type="url"
                        defaultValue={place.website ?? ""}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">Phone</label>
                      <Input name="phone" defaultValue={place.phone ?? ""} />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Image URL</label>
                      <Input
                        name="image_url"
                        type="url"
                        defaultValue={place.image_url ?? ""}
                        placeholder="https://..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">External source</label>
                      <Input name="external_source" defaultValue={place.external_source ?? ""} />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">External ID</label>
                      <Input name="external_id" defaultValue={place.external_id ?? ""} />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-semibold text-slate-700">Source metadata JSON</label>
                      <Textarea
                        name="source_metadata"
                        defaultValue={
                          place.source_metadata ? JSON.stringify(place.source_metadata, null, 2) : ""
                        }
                        placeholder='{"source":"manual","note":"Imported from CSV"}'
                        rows={5}
                        className="min-h-[140px]"
                      />
                    </div>
                  </div>
                </section>

                <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="mb-4 space-y-1">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pipeline flags</p>
                    <h3 className="font-display text-xl tracking-tight text-slate-950">
                      Visibility and generation readiness
                    </h3>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="is_publicly_visitable"
                        defaultChecked={place.is_publicly_visitable}
                        className="size-4 accent-slate-950"
                      />
                      Publicly visitable
                    </label>

                    <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={place.is_active}
                        className="size-4 accent-slate-950"
                      />
                      Active in seed pipeline
                    </label>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-3">
                    <SubmitButton className="px-5">Save place</SubmitButton>
                    {isEligibleForGeneration ? (
                      <Button type="submit" formAction={savePlaceAndGenerateCandidateAction}>
                        <Sparkles className="size-4" />
                        Save + generate candidate
                      </Button>
                    ) : (
                      <p className="text-sm leading-7 text-slate-500">
                        Fill in coordinates, keep the place public, and save before generating a candidate.
                      </p>
                    )}
                  </div>
                </section>
              </form>
            </div>

            <aside className="min-h-0 overflow-y-auto border-t border-slate-200 bg-slate-50/80 px-6 py-6 xl:border-l xl:border-t-0">
              <div className="space-y-4">
                {place.image_url ? (
                  <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
                    <div className="aspect-[16/10] bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={place.image_url}
                        alt={place.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(135deg,_#0f172a,_#1d4ed8)] px-5 py-6 text-white shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-white/60">Preview</p>
                    <p className="mt-3 font-display text-2xl tracking-tight">{place.name}</p>
                    <p className="mt-2 text-sm leading-7 text-white/75">
                      Add an image URL to give the place a more polished public preview.
                    </p>
                  </div>
                )}

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Pipeline state</p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-slate-100 px-3 py-1">{place.place_type}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {place.state?.code ?? place.state_code ?? "State unresolved"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {place.is_active ? "Active" : "Inactive"}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">
                      {place.is_publicly_visitable ? "Public" : "Private"}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm leading-7 text-slate-600">
                    <p>{stateWarning ?? "Keep the place details accurate before turning it into a candidate."}</p>
                    <p>
                      Coordinates: {place.latitude.toFixed(6)}, {place.longitude.toFixed(6)}
                    </p>
                    {place.description ? (
                      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-slate-700">
                        {place.description}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Candidate status</p>
                  {candidate ? (
                    <div className="mt-3 space-y-3">
                      <p className="font-display text-xl font-semibold text-slate-950">
                        {candidate.title}
                      </p>
                      <p className="text-sm leading-7 text-slate-600">
                        {candidate.status} · {candidate.discovery_type.replace(/_/g, " ")}
                      </p>
                      <Button asChild variant="outline" className="w-full justify-between">
                        <Link href={`/dashboard/candidates?edit=${candidate.id}`}>
                          Open candidate
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : isEligibleForGeneration ? (
                    <div className="mt-3 space-y-3">
                      <p className="text-sm leading-7 text-slate-600">
                        This place is ready to seed a draft candidate after you save the edits.
                      </p>
                      <Button asChild variant="outline" className="w-full justify-between">
                        <Link href={`/dashboard/places?edit=${place.id}`}>
                          Reopen after save
                          <ArrowRight className="size-4" />
                        </Link>
                      </Button>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      Complete the place profile and make sure it has coordinates before generating a draft.
                    </p>
                  )}
                </div>

                {quest ? (
                  <div className="rounded-[1.75rem] border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.24em] text-emerald-700">Published quest</p>
                    <p className="mt-3 font-display text-xl font-semibold text-slate-950">{quest.title}</p>
                    <Button asChild variant="outline" className="mt-4 w-full justify-between">
                      <Link href={`/dashboard/quests?edit=${quest.id}`}>
                        Open quest
                        <ArrowRight className="size-4" />
                      </Link>
                    </Button>
                  </div>
                ) : null}

                <div className="rounded-[1.75rem] border border-rose-200 bg-rose-50 p-4 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.24em] text-rose-700">Danger zone</p>
                  <p className="mt-2 text-sm leading-7 text-rose-950">
                    Deleting this place removes its candidate draft and leaves any published quest
                    without a place link. Use this only when the record is truly wrong.
                  </p>
                  <form action={deletePlaceAction} className="mt-4">
                    <input type="hidden" name="place_id" value={place.id} />
                    <Button type="submit" variant="destructive" className="w-full">
                      <Trash2 className="size-4" />
                      Delete place
                    </Button>
                  </form>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
