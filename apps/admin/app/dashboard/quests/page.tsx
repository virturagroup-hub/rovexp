import Link from "next/link";
import { MapPin, Plus, Sparkles } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveQuestAction } from "@/lib/admin/actions";
import {
  listQuestCategories,
  listQuests,
  listSponsors,
  listStates,
} from "@/lib/admin/repository";

interface QuestsPageProps {
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

const discoveryOptions = [
  { value: "popular", label: "Popular" },
  { value: "hidden_gem", label: "Hidden gem" },
  { value: "featured_route", label: "Featured route" },
] as const;

export default async function QuestsPage({ searchParams }: QuestsPageProps) {
  const params = await searchParams;
  const [quests, categories, states, sponsors] = await Promise.all([
    listQuests(),
    listQuestCategories(),
    listStates(),
    listSponsors(),
  ]);

  const editing = quests.find((item) => item.id === params.edit) ?? null;

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Quest catalog
              </p>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                Live missions and location tuning
              </CardTitle>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/quests">
                <Plus className="size-4" />
                New quest
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {quests.length > 0 ? (
              quests.map((quest) => (
                <Link
                  key={quest.id}
                  href={`/dashboard/quests?edit=${quest.id}`}
                  className="block rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-sky-200 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{quest.category.name}</Badge>
                        <Badge
                          variant="secondary"
                          className="bg-slate-900 text-white"
                        >
                          {quest.rarity}
                        </Badge>
                        {quest.is_sponsored ? (
                          <Badge className="bg-sky-100 text-sky-900">
                            Sponsored
                          </Badge>
                        ) : null}
                        <Badge variant="outline">
                          {quest.discovery_type.replace("_", " ")}
                        </Badge>
                        {quest.is_featured ? (
                          <Badge className="bg-amber-100 text-amber-900">
                            Featured
                          </Badge>
                        ) : null}
                        <Badge
                          variant={quest.is_active ? "default" : "secondary"}
                          className={
                            quest.is_active
                              ? "bg-emerald-100 text-emerald-900"
                              : ""
                          }
                        >
                          {quest.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-display text-xl font-semibold text-slate-950">
                          {quest.title}
                        </p>
                        <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                          {quest.description}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-medium text-slate-500">
                      Edit
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                      <MapPin className="size-3.5" />
                      {quest.state.code} · {quest.latitude.toFixed(4)},{" "}
                      {quest.longitude.toFixed(4)}
                    </span>
                    <span className="rounded-full bg-white px-3 py-1">
                      Radius {quest.radius_meters}m
                    </span>
                    <span className="rounded-full bg-white px-3 py-1">
                      {quest.xp_reward} XP
                    </span>
                    {quest.sponsor_business ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                        <Sparkles className="size-3.5" />
                        {quest.sponsor_business.name}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                No quests yet. Create the first route to populate the mobile home feed.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {editing ? "Edit quest" : "Create quest"}
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              {editing ? editing.title : "New quest setup"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveQuestAction} className="space-y-4">
              <input type="hidden" name="id" value={editing?.id ?? ""} />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Quest title
                </label>
                <Input
                  name="title"
                  defaultValue={editing?.title ?? ""}
                  placeholder="Sunrise at the Bean"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Description
                </label>
                <Textarea
                  name="description"
                  defaultValue={editing?.description ?? ""}
                  rows={5}
                  placeholder="Describe the discovery loop, check-in expectation, and reward angle."
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Category
                  </label>
                  <select
                    name="category_id"
                    defaultValue={editing?.category_id ?? categories[0]?.id}
                    className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                  >
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
                    name="rarity"
                    defaultValue={editing?.rarity ?? "common"}
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
                    State
                  </label>
                  <select
                    name="state_id"
                    defaultValue={editing?.state_id ?? states[0]?.id}
                    className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                  >
                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.code} · {state.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Discovery type
                  </label>
                  <select
                    name="discovery_type"
                    defaultValue={editing?.discovery_type ?? "popular"}
                    className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                  >
                    {discoveryOptions.map((option) => (
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
                    Sponsor business
                  </label>
                  <select
                    name="sponsor_business_id"
                    defaultValue={editing?.sponsor_business_id ?? ""}
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

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Radius (meters)
                  </label>
                  <Input
                    name="radius_meters"
                    type="number"
                    defaultValue={editing?.radius_meters ?? 100}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    XP reward
                  </label>
                  <Input
                    name="xp_reward"
                    type="number"
                    defaultValue={editing?.xp_reward ?? 120}
                    required
                  />
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
              </div>

              <div className="grid gap-3">
                <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={editing?.is_active ?? true}
                    className="size-4 accent-slate-950"
                  />
                  Available to mobile clients
                </label>
                <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="is_sponsored"
                    defaultChecked={editing?.is_sponsored ?? false}
                    className="size-4 accent-slate-950"
                  />
                  Sponsored quest with a linked business
                </label>
                <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    name="is_featured"
                    defaultChecked={editing?.is_featured ?? false}
                    className="size-4 accent-slate-950"
                  />
                  Featured quest eligible for premium placements
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <SubmitButton>{editing ? "Save quest" : "Create quest"}</SubmitButton>
                {editing ? (
                  <Button asChild variant="outline">
                    <Link href="/dashboard/quests">Clear selection</Link>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
