import Link from "next/link";
import { Plus, Sparkles } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveTitleAction } from "@/lib/admin/actions";
import { listTitles } from "@/lib/admin/repository";

interface TitlesPageProps {
  searchParams: Promise<{
    edit?: string;
    error?: string;
    status?: string;
  }>;
}

export default async function TitlesPage({ searchParams }: TitlesPageProps) {
  const params = await searchParams;
  const titles = await listTitles();
  const editing = titles.find((item) => item.id === params.edit) ?? null;

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Title roster
              </p>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                Prestige and cosmetic status
              </CardTitle>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/titles">
                <Plus className="size-4" />
                New title
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {titles.length > 0 ? (
              titles.map((title) => (
                <Link
                  key={title.id}
                  href={`/dashboard/titles?edit=${title.id}`}
                  className="block rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-sky-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          variant={title.is_active ? "default" : "secondary"}
                          className={
                            title.is_active
                              ? "bg-emerald-100 text-emerald-900"
                              : ""
                          }
                        >
                          {title.is_active ? "Active" : "Inactive"}
                        </Badge>
                        {title.unlock_key ? (
                          <Badge variant="outline">{title.unlock_key}</Badge>
                        ) : null}
                      </div>
                      <div>
                        <p className="font-display text-xl font-semibold text-slate-950">
                          {title.name}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {title.description}
                        </p>
                      </div>
                    </div>
                    <Sparkles className="size-5 text-slate-400" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                No titles yet. Add a few prestige names to anchor profile identity.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {editing ? "Edit title" : "Create title"}
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              {editing ? editing.name : "New title"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveTitleAction} className="space-y-4">
              <input type="hidden" name="id" value={editing?.id ?? ""} />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Title name
                </label>
                <Input
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  placeholder="Skyline Scout"
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
                  placeholder="How the title feels and when it appears."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Unlock key
                </label>
                <Input
                  name="unlock_key"
                  defaultValue={editing?.unlock_key ?? ""}
                  placeholder="landmark_quests_10"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Metadata JSON
                </label>
                <Textarea
                  name="metadata"
                  rows={5}
                  defaultValue={
                    editing?.metadata
                      ? JSON.stringify(editing.metadata, null, 2)
                      : ""
                  }
                  placeholder='{"frame":"silver"}'
                />
              </div>

              <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editing?.is_active ?? true}
                  className="size-4 accent-slate-950"
                />
                Available for user profiles
              </label>

              <div className="flex flex-wrap gap-3">
                <SubmitButton>{editing ? "Save title" : "Create title"}</SubmitButton>
                {editing ? (
                  <Button asChild variant="outline">
                    <Link href="/dashboard/titles">Clear selection</Link>
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
