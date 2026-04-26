import Link from "next/link";
import { Globe, Mail, Phone, Plus } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveSponsorAction } from "@/lib/admin/actions";
import { listSponsors } from "@/lib/admin/repository";

interface SponsorsPageProps {
  searchParams: Promise<{
    edit?: string;
    error?: string;
    status?: string;
  }>;
}

export default async function SponsorsPage({
  searchParams,
}: SponsorsPageProps) {
  const params = await searchParams;
  const sponsors = await listSponsors();
  const editing = sponsors.find((item) => item.id === params.edit) ?? null;

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Sponsor businesses
              </p>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                Partner roster and status
              </CardTitle>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/sponsors">
                <Plus className="size-4" />
                New sponsor
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {sponsors.length > 0 ? (
              sponsors.map((sponsor) => (
                <Link
                  key={sponsor.id}
                  href={`/dashboard/sponsors?edit=${sponsor.id}`}
                  className="block rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-sky-200 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-display text-xl font-semibold text-slate-950">
                          {sponsor.name}
                        </p>
                        <Badge
                          variant={sponsor.is_active ? "default" : "secondary"}
                          className={
                            sponsor.is_active
                              ? "bg-emerald-100 text-emerald-900"
                              : ""
                          }
                        >
                          {sponsor.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-600">
                        {sponsor.description}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-slate-500">
                      Edit
                    </span>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-500">
                    {sponsor.website ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                        <Globe className="size-3.5" />
                        {sponsor.website.replace("https://", "")}
                      </span>
                    ) : null}
                    {sponsor.email ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                        <Mail className="size-3.5" />
                        {sponsor.email}
                      </span>
                    ) : null}
                    {sponsor.phone ? (
                      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                        <Phone className="size-3.5" />
                        {sponsor.phone}
                      </span>
                    ) : null}
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                No sponsor businesses yet. Add your first partner to support sponsored quests.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {editing ? "Edit sponsor" : "Create sponsor"}
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              {editing ? editing.name : "New partner profile"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveSponsorAction} className="space-y-4">
              <input type="hidden" name="id" value={editing?.id ?? ""} />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Business name
                </label>
                <Input
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  placeholder="North Star Roasters"
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
                  placeholder="What makes this sponsor worth surfacing inside RoveXP?"
                  required
                  rows={5}
                />
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
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Logo or image URL
                  </label>
                  <Input
                    name="logo_url"
                    type="url"
                    defaultValue={editing?.logo_url ?? ""}
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Contact email
                  </label>
                  <Input
                    name="email"
                    type="email"
                    defaultValue={editing?.email ?? ""}
                    placeholder="partners@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Contact phone
                  </label>
                  <Input
                    name="phone"
                    defaultValue={editing?.phone ?? ""}
                    placeholder="312-555-0142"
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
                Active in admin and mobile sponsor reads
              </label>

              <div className="flex flex-wrap gap-3">
                <SubmitButton>
                  {editing ? "Save sponsor" : "Create sponsor"}
                </SubmitButton>
                {editing ? (
                  <Button asChild variant="outline">
                    <Link href="/dashboard/sponsors">Clear selection</Link>
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
