import { Shield, Star } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { listUsers } from "@/lib/admin/repository";

interface UsersPageProps {
  searchParams: Promise<{
    error?: string;
    q?: string;
    status?: string;
  }>;
}

export default async function UsersPage({ searchParams }: UsersPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const users = await listUsers(query);
  const adminCount = users.filter((user) => user.admin_role).length;

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Profiles",
            value: users.length,
            detail: query
              ? "Matching the current search query."
              : "Visible explorer records in Supabase.",
          },
          {
            label: "Admins",
            value: adminCount,
            detail: "Accounts currently promoted into public.admin_users.",
          },
          {
            label: "Top XP",
            value: users[0]?.xp_total ?? 0,
            detail: "Highest all-time XP total in the current result set.",
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

      <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <CardHeader className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Explorer directory
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              Profile, prestige, and admin visibility
            </CardTitle>
          </div>

          <form className="flex flex-col gap-3 sm:flex-row">
            <Input
              defaultValue={query}
              name="q"
              placeholder="Search by display name or username"
            />
            <Button type="submit">Search</Button>
          </form>
        </CardHeader>
        <CardContent className="space-y-4">
          {users.length ? (
            users.map((user) => (
              <div
                key={user.profile.id}
                className="flex flex-wrap items-start justify-between gap-4 rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5"
              >
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {user.admin_role ? (
                      <Badge className="bg-sky-100 text-sky-900">
                        <Shield className="mr-1 size-3.5" />
                        {user.admin_role}
                      </Badge>
                    ) : null}
                    {user.home_state ? (
                      <Badge variant="outline">
                        {user.home_state.code} · {user.home_state.name}
                      </Badge>
                    ) : (
                      <Badge variant="secondary">No home state</Badge>
                    )}
                  </div>

                  <div>
                    <p className="font-display text-xl font-semibold text-slate-950">
                      {user.profile.display_name}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      @{user.profile.username} · {user.profile.id}
                    </p>
                  </div>
                </div>

                <div className="grid min-w-[280px] gap-3 sm:grid-cols-2">
                  {[
                    { label: "XP total", value: user.xp_total },
                    { label: "Quests completed", value: user.quests_completed },
                    { label: "Reviews", value: user.reviews_count },
                    { label: "Hidden gems", value: user.hidden_gems_completed },
                  ].map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-3xl border border-slate-200 bg-white px-4 py-4"
                    >
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">
                        {metric.label}
                      </p>
                      <p className="mt-2 font-display text-2xl font-semibold text-slate-950">
                        {metric.value}
                      </p>
                    </div>
                  ))}
                </div>

                {user.profile.avatar_url ? (
                  <div className="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    Avatar path ready: {user.profile.avatar_url}
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-sm text-slate-500">
                    <Star className="size-4" />
                    Avatar not set yet
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
              {query
                ? "No users match that search yet. Try a broader display name or username."
                : "No explorer profiles are available yet. Profiles appear automatically when users sign up through Supabase auth."}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
