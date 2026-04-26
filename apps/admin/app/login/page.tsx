import { ShieldCheck, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";

import { StatusBanner } from "@/components/admin/status-banner";
import { SubmitButton } from "@/components/admin/submit-button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getAdminSession } from "@/lib/admin/auth";
import { signInAction } from "@/lib/admin/actions";
import { isSupabaseConfigured } from "@/lib/admin/supabase";

interface LoginPageProps {
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const session = await getAdminSession();

  if (session) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const bannerCode = params.error ?? params.status;

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.22),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(251,146,60,0.18),_transparent_32%),linear-gradient(180deg,_#eaf1f8_0%,_#f8fafc_100%)] px-4 py-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Card className="overflow-hidden rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-[0_24px_80px_rgba(15,23,42,0.24)]">
          <CardContent className="flex h-full flex-col justify-between gap-8 p-8 lg:p-10">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.24em] text-slate-300">
                <ShieldCheck className="size-3.5" />
                Private Admin Surface
              </div>
              <div className="space-y-4">
                <h1 className="font-display text-4xl font-semibold tracking-tight text-white md:text-5xl">
                  RoveXP keeps the quest layer sharp from one control room.
                </h1>
                <p className="max-w-xl text-base leading-8 text-slate-300">
                  Manage sponsor businesses, tune quest density, moderate reviews,
                  and keep progression content ready for the mobile app.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: "Sponsor ops",
                  body: "Activate and tune partner placements without touching production data manually.",
                },
                {
                  title: "Quest tuning",
                  body: "Adjust rarity, geography, discovery type, and payout with a tighter workflow.",
                },
                {
                  title: "Review controls",
                  body: "Moderate visible community feedback without introducing a giant trust-and-safety system yet.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-white/5 p-4"
                >
                  <p className="font-display text-lg font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="rounded-[2rem] border-white/70 bg-white/82 shadow-[0_18px_48px_rgba(15,23,42,0.08)] backdrop-blur">
            <CardContent className="space-y-6 p-8">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-sky-900">
                  <Sparkles className="size-3.5" />
                  Internal Sign-In
                </div>
                <div>
                  <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-950">
                    Access the dashboard
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-500">
                    Use a Supabase account that has been promoted in
                    <code className="mx-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs">
                      public.admin_users
                    </code>
                    .
                  </p>
                </div>
              </div>

              <StatusBanner code={bannerCode} />

              {isSupabaseConfigured ? (
                <form action={signInAction} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Email
                    </label>
                    <Input
                      name="email"
                      type="email"
                      placeholder="ops@rovexp.app"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Password
                    </label>
                    <Input
                      name="password"
                      type="password"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                  <SubmitButton>Sign in</SubmitButton>
                </form>
              ) : (
                <div className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-950">
                  The admin dashboard now requires real Supabase auth. Add the
                  environment variables, create an auth user, then promote that
                  user in <code className="mx-1 rounded bg-white/80 px-1.5 py-0.5 text-xs">public.admin_users</code>.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
