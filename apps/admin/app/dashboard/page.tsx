import {
  ArrowRight,
  Compass,
  Gift,
  Layers3,
  MapPin,
  MessageSquareWarning,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";

import { StatusBanner } from "@/components/admin/status-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getDashboardSummary,
  listQuests,
  listRewards,
  listSponsors,
  listTitles,
} from "@/lib/admin/repository";

interface DashboardPageProps {
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
}

const statMeta = [
  { key: "activeQuests", label: "Active quests", icon: Compass },
  { key: "sponsoredQuestCount", label: "Sponsored live", icon: Sparkles },
  { key: "liveSponsors", label: "Live sponsors", icon: Trophy },
  { key: "placeCount", label: "Places staged", icon: MapPin },
  { key: "candidateCount", label: "Quest candidates", icon: Layers3 },
  { key: "rewardCount", label: "Reward options", icon: Gift },
  { key: "userCount", label: "Profiles live", icon: Users },
  { key: "flaggedReviews", label: "Flagged reviews", icon: MessageSquareWarning },
] as const;

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const [summary, quests, sponsors, rewards, titles] = await Promise.all([
    getDashboardSummary(),
    listQuests(),
    listSponsors(),
    listRewards(),
    listTitles(),
  ]);

  const featuredSponsored = quests.filter((quest) => quest.is_sponsored).slice(0, 3);

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <section>
        <Card className="overflow-hidden rounded-[2rem] border-sky-200/60 bg-[linear-gradient(135deg,_rgba(15,23,42,0.98),_rgba(15,118,110,0.92)_52%,_rgba(245,184,46,0.88))] text-white shadow-[0_24px_60px_rgba(15,23,42,0.16)]">
          <CardContent className="grid gap-6 p-7 lg:grid-cols-[1.15fr_0.85fr] lg:p-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
                <Sparkles className="size-3.5" />
                Guided showcase
              </div>
              <div className="space-y-3">
                <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                  Open the web demo judges can use to understand the product in minutes.
                </h2>
                <p className="max-w-2xl text-sm leading-7 text-white/82">
                  This route stays inside the admin site and walks through the mobile experience,
                  the places pipeline, nearby candidate generation, and the review-publish loop.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/showcase"
                  className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                >
                  Open showcase demo
                  <ArrowRight className="size-4" />
                </Link>
              <Link
                href="/dashboard/places"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15"
              >
                Open places
                <Layers3 className="size-4" />
              </Link>
              </div>
            </div>

            <div className="grid gap-3 rounded-[1.75rem] border border-white/10 bg-white/8 p-4 backdrop-blur">
              {[
                {
                  title: "User story",
                  body: "Sponsored spotlight, nearby quests, leaderboard identity, and privacy-aware profiles.",
                },
                {
                  title: "Content ops",
                  body: "Places import, nearby generation, candidate review, sponsor management, and moderation.",
                },
                {
                  title: "Mobile first",
                  body: "The live consumer app remains Expo + React Native; this web demo is the guided companion.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-3xl border border-white/10 bg-slate-950/35 px-4 py-4"
                >
                  <p className="font-display text-base font-semibold">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-white/75">{item.body}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardContent className="space-y-6 p-7">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Operations Snapshot
              </p>
              <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-950">
                Phase 2 systems are live and ready to steer.
              </h2>
              <p className="max-w-2xl text-sm leading-7 text-slate-600">
                Auth-backed explorers, server-validated quest progression, review
                moderation, and progression content now run through the same
                control room.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {statMeta.map((item) => {
                const Icon = item.icon;
                const value = summary[item.key];

                return (
                  <div
                    key={item.key}
                    className="rounded-3xl border border-slate-200 bg-slate-50/80 p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <span className="flex size-9 items-center justify-center rounded-2xl bg-white text-slate-700 shadow-sm">
                        <Icon className="size-4" />
                      </span>
                    </div>
                    <p className="mt-4 font-display text-4xl font-semibold text-slate-950">
                      {value}
                    </p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
          <CardContent className="space-y-5 p-7">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Catalog Pulse
              </p>
              <h3 className="mt-2 font-display text-2xl font-semibold tracking-tight">
                Progression inventory
              </h3>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: "Rewards",
                  value: rewards.length,
                  href: "/dashboard/rewards",
                },
                {
                  label: "Titles",
                  value: titles.length,
                  href: "/dashboard/titles",
                },
                {
                  label: "Sponsors",
                  value: sponsors.length,
                  href: "/dashboard/sponsors",
                },
                {
                  label: "Places",
                  value: summary.placeCount,
                  href: "/dashboard/places",
                },
                {
                  label: "Candidates",
                  value: summary.candidateCount,
                  href: "/dashboard/candidates",
                },
                {
                  label: "Reviewed candidates",
                  value: summary.reviewedCandidateCount,
                  href: "/dashboard/candidates",
                },
                {
                  label: "Reviews",
                  value: summary.flaggedReviews,
                  href: "/dashboard/reviews",
                },
                {
                  label: "Users",
                  value: summary.userCount,
                  href: "/dashboard/users",
                },
              ].map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/5 px-4 py-4 transition hover:bg-white/10"
                >
                  <span>
                    <p className="text-sm text-slate-300">{item.label}</p>
                    <p className="font-display text-2xl font-semibold text-white">
                      {item.value}
                    </p>
                  </span>
                  <ArrowRight className="size-4 text-slate-300" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Featured Sponsor Quests
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              Live placements with partner visibility
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {featuredSponsored.length > 0 ? (
              featuredSponsored.map((quest) => (
                <Link
                  key={quest.id}
                  href={`/dashboard/quests?edit=${quest.id}`}
                  className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 transition hover:border-sky-200 hover:bg-white"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">{quest.rarity}</Badge>
                    <Badge variant="outline">{quest.category.name}</Badge>
                    <Badge variant="outline">
                      {quest.discovery_type.replace("_", " ")}
                    </Badge>
                    <Badge className="bg-sky-100 text-sky-900">
                      Sponsored
                    </Badge>
                    {quest.is_featured ? (
                      <Badge className="bg-amber-100 text-amber-900">
                        Featured
                      </Badge>
                    ) : null}
                  </div>
                  <div>
                    <p className="font-display text-xl font-semibold text-slate-950">
                      {quest.title}
                    </p>
                    <p className="mt-1 text-sm leading-7 text-slate-600">
                      {quest.description}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>{quest.sponsor_business?.name}</span>
                    <span>{quest.xp_reward} XP</span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                No sponsored quests yet. Add a sponsor quest to surface it here.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Readiness Checklist
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              Phase 2 handoff
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              "Quests and sponsors are modeled for mobile read access and admin writes.",
              "Reviews can now be moderated without opening a broader trust-and-safety toolchain.",
              "Explorer profiles and leaderboard-facing totals are available for inspection.",
            ].map((item) => (
              <div
                key={item}
                className="rounded-3xl border border-slate-200 bg-slate-50/70 px-4 py-4 text-sm leading-7 text-slate-600"
              >
                {item}
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
