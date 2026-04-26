import Link from "next/link";
import { Layers3, MapPin, Sparkles } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  publishQuestCandidateAction,
  saveQuestCandidateAction,
} from "@/lib/admin/actions";
import {
  listQuestCategories,
  listQuestCandidates,
  listSponsors,
} from "@/lib/admin/repository";
import type {
  QuestCandidateGenerationNotes,
  QuestCandidateWithRelations,
} from "@rovexp/types";

interface CandidatesPageProps {
  searchParams: Promise<{
    edit?: string;
    error?: string;
    status?: string;
  }>;
}

const rarityOptions = [
  { value: "common", label: "Common" },
  { value: "rare", label: "Rare" },
  { value: "epic", label: "Epic" },
  { value: "legendary", label: "Legendary" },
] as const;

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "published", label: "Published" },
] as const;

const discoveryOptions = [
  { value: "popular", label: "Popular" },
  { value: "hidden_gem", label: "Hidden gem" },
  { value: "featured_route", label: "Featured route" },
] as const;

const generationOptions = [
  { value: "rules", label: "Rules" },
  { value: "manual", label: "Manual" },
  { value: "ai", label: "AI" },
] as const;

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readNote(notes: unknown, path: string[]) {
  return path.reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      return null;
    }

    return (current as Record<string, unknown>)[key] ?? null;
  }, notes);
}

function humanize(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatGenerationNotes(candidate: QuestCandidateWithRelations) {
  return asRecord(candidate.generation_notes) as QuestCandidateGenerationNotes | null;
}

export default async function CandidatesPage({ searchParams }: CandidatesPageProps) {
  const params = await searchParams;
  const [candidates, categories, sponsors] = await Promise.all([
    listQuestCandidates(),
    listQuestCategories(),
    listSponsors(),
  ]);

  const editing = candidates.find((item) => item.id === params.edit) ?? null;
  const approvedCount = candidates.filter((item) => item.status === "approved").length;
  const draftCount = candidates.filter((item) => item.status === "draft").length;
  const publishedCount = candidates.filter((item) => item.status === "published").length;
  const editingNotes = editing ? formatGenerationNotes(editing) : null;
  const editingClassification = editingNotes
    ? asRecord(readNote(editingNotes, ["classification"]))
    : null;
  const editingScoring = editingNotes ? asRecord(readNote(editingNotes, ["scoring"])) : null;
  const editingSource = editingNotes ? asRecord(readNote(editingNotes, ["source"])) : null;
  const editingBatch = editingNotes ? asRecord(readNote(editingNotes, ["batch"])) : null;

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            detail: "Drafts waiting for a human review pass.",
            label: "Draft candidates",
            value: draftCount,
          },
          {
            detail: "Approved and ready to publish into quests.",
            label: "Approved candidates",
            value: approvedCount,
          },
          {
            detail: "Already turned into playable quests.",
            label: "Published candidates",
            value: publishedCount,
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

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Quest candidate queue
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              Review place-derived drafts before they go live
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {candidates.length > 0 ? (
              candidates.map((candidate) => {
                const notes = formatGenerationNotes(candidate);
                const classification = notes
                  ? asRecord(readNote(notes, ["classification"]))
                  : null;
                const scoring = notes ? asRecord(readNote(notes, ["scoring"])) : null;
                const source = notes ? asRecord(readNote(notes, ["source"])) : null;

                return (
                  <div
                    key={candidate.id}
                    className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5"
                  >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={
                            candidate.status === "published"
                              ? "bg-emerald-100 text-emerald-900"
                              : candidate.status === "approved"
                                ? "bg-sky-100 text-sky-900"
                                : candidate.status === "rejected"
                                  ? "bg-rose-100 text-rose-900"
                                  : "bg-slate-200 text-slate-800"
                          }
                        >
                          {candidate.status}
                        </Badge>
                        <Badge variant="outline">{candidate.place.name}</Badge>
                        <Badge variant="outline">
                          {candidate.suggested_category?.name ?? "Unmapped category"}
                        </Badge>
                        <Badge variant="outline">
                          {candidate.suggested_rarity}
                        </Badge>
                        <Badge variant="outline">
                          {candidate.discovery_type.replace("_", " ")}
                        </Badge>
                      </div>

                      <div>
                        <p className="font-display text-xl font-semibold text-slate-950">
                          {candidate.title}
                        </p>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                          {candidate.description}
                        </p>
                      </div>

                      {notes ? (
                        <div className="flex flex-wrap gap-2">
                          <Badge className="bg-slate-950 text-white">Generated from place</Badge>
                          {humanize(
                            typeof classification?.vibe === "string" ? classification.vibe : null,
                          ) ? (
                            <Badge variant="outline">
                              {humanize(
                                typeof classification?.vibe === "string"
                                  ? classification.vibe
                                  : null,
                              )}
                            </Badge>
                          ) : null}
                          {humanize(
                            typeof classification?.discovery_type === "string"
                              ? classification.discovery_type
                              : null,
                          ) ? (
                            <Badge variant="outline">
                              {humanize(
                                typeof classification?.discovery_type === "string"
                                  ? classification.discovery_type
                                  : null,
                              )}
                            </Badge>
                          ) : null}
                          <Badge variant="outline">
                            {typeof scoring?.suggested_rarity === "string"
                              ? scoring.suggested_rarity
                              : "Unknown"}
                          </Badge>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2">
                      <Button asChild variant="outline">
                        <Link href={`/dashboard/candidates?edit=${candidate.id}`}>
                          <Layers3 className="size-4" />
                          Edit candidate
                        </Link>
                      </Button>

                      {candidate.status === "approved" && !candidate.published_quest_id ? (
                        <form action={publishQuestCandidateAction}>
                          <input type="hidden" name="candidate_id" value={candidate.id} />
                          <Button type="submit" className="w-full">
                            <Sparkles className="size-4" />
                            Publish quest
                          </Button>
                        </form>
                      ) : candidate.published_quest_id ? (
                        <Button asChild variant="outline">
                          <Link href={`/dashboard/quests?edit=${candidate.published_quest_id}`}>
                            <Sparkles className="size-4" />
                            Open quest
                          </Link>
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                      <MapPin className="size-3.5" />
                      {candidate.place.city ?? "Unknown city"}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1">
                      {candidate.suggested_xp_reward} XP
                    </span>
                    <span className="rounded-full bg-white px-3 py-1">
                      Radius {candidate.suggested_radius_meters}m
                    </span>
                    <span className="rounded-full bg-white px-3 py-1">
                      {candidate.generation_method}
                    </span>
                  </div>

                  {notes ? (
                    <details className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white/90 p-4">
                      <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                        Why this candidate was generated
                      </summary>
                      <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-600 sm:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-800">Source place:</span>{" "}
                          {typeof source?.place_name === "string" ? source.place_name : "Unknown"} ·{" "}
                          {typeof source?.place_type === "string" ? source.place_type : "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Vibe:</span>{" "}
                          {humanize(
                            typeof classification?.vibe === "string" ? classification.vibe : null,
                          ) ?? "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Discovery reason:</span>{" "}
                          {typeof classification?.discovery_reason === "string"
                            ? classification.discovery_reason
                            : "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Title pattern:</span>{" "}
                          {typeof classification?.title_pattern === "string"
                            ? classification.title_pattern
                            : "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Description pattern:</span>{" "}
                          {typeof classification?.description_pattern === "string"
                            ? classification.description_pattern
                            : "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Rarity reason:</span>{" "}
                          {typeof scoring?.rarity_reason === "string"
                            ? scoring.rarity_reason
                            : "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">XP reasoning:</span>{" "}
                          {typeof scoring?.xp_reason === "string" ? scoring.xp_reason : "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Batch source:</span>{" "}
                          {notes?.source_mode === "nearby_places_bulk"
                            ? "Nearby places bulk seed"
                            : "Single place generation"}
                        </p>
                      </div>
                    </details>
                  ) : null}
                </div>
                );
              })
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                No quest candidates yet. Generate one from a place to start the review flow.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardHeader className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {editing ? "Edit candidate" : "Draft a candidate"}
              </p>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                {editing ? editing.title : "New candidate review"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {editing ? (
                <form action={saveQuestCandidateAction} className="space-y-4">
                  <input type="hidden" name="id" value={editing.id} />
                  <input type="hidden" name="place_id" value={editing.place_id} />
                  <input type="hidden" name="candidate_id" value={editing.id} />

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Source place
                    </label>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      {editing.place.name} · {editing.place.city ?? "Unknown city"}
                    </div>
                  </div>

                  {editingNotes ? (
                    <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-slate-950 text-white">Generated from place</Badge>
                        {humanize(typeof editingClassification?.vibe === "string" ? editingClassification.vibe : null) ? (
                          <Badge variant="outline">
                            {humanize(typeof editingClassification?.vibe === "string" ? editingClassification.vibe : null)}
                          </Badge>
                        ) : null}
                        {humanize(
                          typeof editingClassification?.discovery_type === "string"
                            ? editingClassification.discovery_type
                            : null,
                        ) ? (
                          <Badge variant="outline">
                            {humanize(
                              typeof editingClassification?.discovery_type === "string"
                                ? editingClassification.discovery_type
                                : null,
                            )}
                          </Badge>
                        ) : null}
                        <Badge variant="outline">
                          {typeof editingScoring?.suggested_rarity === "string"
                            ? editingScoring.suggested_rarity
                            : "Unknown"}
                        </Badge>
                      </div>

                      <div className="mt-4 grid gap-3 text-sm leading-7 text-slate-600 sm:grid-cols-2">
                        <p>
                          <span className="font-semibold text-slate-800">Title pattern:</span>{" "}
                          {typeof editingClassification?.title_pattern === "string"
                            ? editingClassification.title_pattern
                            : "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Description pattern:</span>{" "}
                          {typeof editingClassification?.description_pattern === "string"
                            ? editingClassification.description_pattern
                            : "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Discovery reason:</span>{" "}
                          {typeof editingClassification?.discovery_reason === "string"
                            ? editingClassification.discovery_reason
                            : "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Rarity reason:</span>{" "}
                          {typeof editingScoring?.rarity_reason === "string"
                            ? editingScoring.rarity_reason
                            : "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">XP reasoning:</span>{" "}
                          {typeof editingScoring?.xp_reason === "string"
                            ? editingScoring.xp_reason
                            : "Unknown"}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-800">Source type:</span>{" "}
                          {typeof editingSource?.place_type === "string"
                            ? editingSource.place_type
                            : "Unknown"}
                        </p>
                        {editingBatch ? (
                          <p className="sm:col-span-2">
                            <span className="font-semibold text-slate-800">Batch area:</span>{" "}
                            {typeof editingBatch.area_label === "string" &&
                            editingBatch.area_label
                              ? editingBatch.area_label
                              : "Nearby bulk seed"}
                          </p>
                        ) : null}
                      </div>

                      <details className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3">
                        <summary className="cursor-pointer text-sm font-semibold text-slate-800">
                          View raw generation notes
                        </summary>
                        <pre className="mt-3 overflow-auto text-xs leading-6 text-slate-600">
                          {JSON.stringify(editingNotes, null, 2)}
                        </pre>
                      </details>
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Candidate title
                    </label>
                    <Input name="title" defaultValue={editing.title} required />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Description
                    </label>
                    <Textarea
                      name="description"
                      defaultValue={editing.description}
                      rows={4}
                      required
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Suggested category
                      </label>
                      <select
                        name="suggested_category_id"
                        defaultValue={editing.suggested_category_id ?? ""}
                        className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                      >
                        <option value="">Unmapped</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Rarity
                      </label>
                      <select
                        name="suggested_rarity"
                        defaultValue={editing.suggested_rarity}
                        className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                      >
                        {rarityOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Discovery type
                      </label>
                      <select
                        name="discovery_type"
                        defaultValue={editing.discovery_type}
                        className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                      >
                        {discoveryOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Generation method
                      </label>
                      <select
                        name="generation_method"
                        defaultValue={editing.generation_method}
                        className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                      >
                        {generationOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        XP reward
                      </label>
                      <Input
                        name="suggested_xp_reward"
                        type="number"
                        defaultValue={editing.suggested_xp_reward}
                        min="25"
                        max="5000"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700">
                        Radius (meters)
                      </label>
                      <Input
                        name="suggested_radius_meters"
                        type="number"
                        defaultValue={editing.suggested_radius_meters}
                        min="25"
                        max="5000"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Sponsor business
                    </label>
                    <select
                      name="sponsor_business_id"
                      defaultValue={editing.sponsor_business_id ?? ""}
                      className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                    >
                      <option value="">No sponsor</option>
                      {sponsors.map((sponsor) => (
                        <option key={sponsor.id} value={sponsor.id}>
                          {sponsor.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Generation notes JSON
                    </label>
                    <Textarea
                      name="generation_notes"
                      defaultValue={
                        editing.generation_notes
                          ? JSON.stringify(editing.generation_notes, null, 2)
                          : ""
                      }
                      rows={5}
                      placeholder='{"keywords":["landmark","photo"]}'
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Status
                    </label>
                    <select
                      name="status"
                      defaultValue={editing.status}
                      className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                    >
                      {statusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <SubmitButton>
                      {editing.status === "published" ? "Save published candidate" : "Save candidate"}
                    </SubmitButton>
                    {editing.status === "approved" && !editing.published_quest_id ? (
                      <Button formAction={publishQuestCandidateAction} type="submit" variant="outline">
                        <Sparkles className="size-4" />
                        Publish quest
                      </Button>
                    ) : null}
                    <Button asChild variant="outline">
                      <Link href="/dashboard/candidates">Clear selection</Link>
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                  Choose a quest candidate on the left to review or publish it.
                </div>
              )}
            </CardContent>
          </Card>

          {editing?.published_quest_id ? (
            <Card className="rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
              <CardHeader className="space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                  Published quest
                </p>
                <CardTitle className="font-display text-2xl tracking-tight">
                  Live route is already available
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-7 text-slate-300">
                  This candidate has already been converted into a playable quest.
                  You can jump to the quest editor or keep reviewing the source place.
                </p>
                <Button asChild variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                  <Link href={`/dashboard/quests?edit=${editing.published_quest_id}`}>
                    Open quest editor
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ) : null}

          <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
            <CardHeader className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Candidate workflow
              </p>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                Move from place → draft → approval → publish
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-7 text-slate-600">
              <p>1. Import or create a place record.</p>
              <p>2. Generate a draft quest candidate from that place.</p>
              <p>3. Review the title, rarity, XP, and radius with human approval.</p>
              <p>4. Publish the approved candidate into a real quest.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
