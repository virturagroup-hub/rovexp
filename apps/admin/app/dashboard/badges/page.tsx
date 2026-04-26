import Link from "next/link";
import { Award, Plus } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveBadgeAction } from "@/lib/admin/actions";
import { listBadges } from "@/lib/admin/repository";

interface BadgesPageProps {
  searchParams: Promise<{
    edit?: string;
    error?: string;
    status?: string;
  }>;
}

export default async function BadgesPage({ searchParams }: BadgesPageProps) {
  const params = await searchParams;
  const badges = await listBadges();
  const editing = badges.find((item) => item.id === params.edit) ?? null;

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Badge collection
              </p>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                Achievements and icon hooks
              </CardTitle>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/badges">
                <Plus className="size-4" />
                New badge
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {badges.length > 0 ? (
              badges.map((badge) => (
                <Link
                  key={badge.id}
                  href={`/dashboard/badges?edit=${badge.id}`}
                  className="block rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-sky-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={badge.is_active ? "default" : "secondary"}
                          className={
                            badge.is_active
                              ? "bg-emerald-100 text-emerald-900"
                              : ""
                          }
                        >
                          {badge.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Badge variant="outline">{badge.icon_key}</Badge>
                        {badge.criteria_key ? (
                          <Badge variant="secondary">{badge.criteria_key}</Badge>
                        ) : null}
                      </div>
                      <div>
                        <p className="font-display text-xl font-semibold text-slate-950">
                          {badge.name}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {badge.description}
                        </p>
                      </div>
                    </div>
                    <Award className="size-5 text-slate-400" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                No badges yet. Add achievements to prepare profile progression.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {editing ? "Edit badge" : "Create badge"}
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              {editing ? editing.name : "New badge"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveBadgeAction} className="space-y-4">
              <input type="hidden" name="id" value={editing?.id ?? ""} />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Badge name
                </label>
                <Input
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  placeholder="Review Ranger"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Description
                </label>
                <Textarea
                  name="description"
                  rows={4}
                  defaultValue={editing?.description ?? ""}
                  placeholder="What the badge celebrates in the player journey."
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Icon key
                  </label>
                  <Input
                    name="icon_key"
                    defaultValue={editing?.icon_key ?? ""}
                    placeholder="review-star"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Criteria key
                  </label>
                  <Input
                    name="criteria_key"
                    defaultValue={editing?.criteria_key ?? ""}
                    placeholder="reviews_5"
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editing?.is_active ?? true}
                  className="size-4 accent-slate-950"
                />
                Visible to badge unlock logic
              </label>

              <div className="flex flex-wrap gap-3">
                <SubmitButton>{editing ? "Save badge" : "Create badge"}</SubmitButton>
                {editing ? (
                  <Button asChild variant="outline">
                    <Link href="/dashboard/badges">Clear selection</Link>
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
