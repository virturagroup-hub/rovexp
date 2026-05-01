"use client";

import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  Compass,
  Globe2,
  Layers3,
  MapPin,
  MessageSquareWarning,
  Play,
  Sparkles,
  Star,
  Trophy,
  Users,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  buildDemoQuestFeed,
  demoLeaderboard,
  demoPlaces,
  demoProfileSummary,
  demoQuestCandidates,
  demoQuests,
  demoSponsors,
} from "@rovexp/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

interface ShowcaseDemoProps {
  mode: "demo" | "supabase";
}

const steps = [
  {
    body: "A mobile-first discovery app powered by Supabase-backed data and a clean content pipeline.",
    id: "overview",
    label: "What it is",
  },
  {
    body: "Sponsored quests sit above nearby discovery so partners feel premium, not hidden.",
    id: "discover",
    label: "Discover quests",
  },
  {
    body: "Leaderboards use public usernames, while friend views can reveal richer profile details.",
    id: "privacy",
    label: "Progress + privacy",
  },
  {
    body: "Admins start from stored places, then bulk-generate nearby quest candidates by area.",
    id: "pipeline",
    label: "Places pipeline",
  },
  {
    body: "Candidates stay in review until a human approves or edits them into live quests.",
    id: "review",
    label: "Review + publish",
  },
  {
    body: "Sponsors, reviews, and moderation keep the system polished and production-minded.",
    id: "ops",
    label: "Admin ops",
  },
  {
    body: "A realistic roadmap for what a fuller production version could include next.",
    id: "future",
    label: "Future vision",
  },
] as const;

function DemoSection({
  action,
  children,
  eyebrow,
  id,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  eyebrow: string;
  id: (typeof steps)[number]["id"];
  title: string;
}) {
  return (
    <section id={id} className="scroll-mt-8">
      <Card className="overflow-hidden rounded-[2rem] border-slate-200/80 bg-white/88 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur">
        <CardContent className="space-y-5 p-6 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {eyebrow}
              </p>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950 md:text-3xl">
                {title}
              </h2>
            </div>
            {action ? <div>{action}</div> : null}
          </div>
          {children}
        </CardContent>
      </Card>
    </section>
  );
}

function QuestCardPreview({
  category,
  discovery,
  isSponsored,
  sponsorName,
  title,
  xp,
}: {
  category: string;
  discovery: string;
  isSponsored: boolean;
  sponsorName?: string | null;
  title: string;
  xp: number;
}) {
  return (
    <div className="rounded-[1.75rem] border border-white/10 bg-white/8 p-4 text-white shadow-[0_18px_40px_rgba(15,23,42,0.22)]">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge className="bg-white/12 text-white hover:bg-white/12">
              {category}
            </Badge>
            <Badge className="bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/20">
              {discovery.replace("_", " ")}
            </Badge>
            {isSponsored ? (
              <Badge className="bg-amber-400/20 text-amber-50 hover:bg-amber-400/20">
                Sponsored
              </Badge>
            ) : null}
          </div>
          <p className="font-display text-xl font-semibold tracking-tight">{title}</p>
          {sponsorName ? (
            <p className="text-sm text-white/70">Presented by {sponsorName}</p>
          ) : null}
        </div>
        <div className="flex size-14 items-center justify-center rounded-[1.5rem] bg-white/10 text-right">
          <span className="text-lg font-semibold">{xp}</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-white/70">
        <span>Nearby quest</span>
        <span>{xp} XP reward</span>
      </div>
    </div>
  );
}

function PipelineCard({
  action,
  body,
  chip,
  icon,
  title,
}: {
  action?: React.ReactNode;
  body: string;
  chip: string;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{chip}</p>
          <p className="font-display text-lg font-semibold text-slate-950">{title}</p>
        </div>
      </div>
      <p className="mt-3 text-sm leading-7 text-slate-600">{body}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function RoadmapCard({
  body,
  icon,
  items,
  kicker,
  title,
}: {
  body: string;
  icon: ReactNode;
  items: string[];
  kicker: string;
  title: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-[1.6rem] border border-slate-200 bg-white/90 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-sm">
          {icon}
        </div>
        <div className="space-y-1">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{kicker}</p>
          <p className="font-display text-xl font-semibold tracking-tight text-slate-950">
            {title}
          </p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-600">{body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {items.map((item) => (
          <Badge key={item} variant="outline" className="border-slate-200 bg-slate-50">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function ShowcaseDemo({ mode }: ShowcaseDemoProps) {
  const [activeStep, setActiveStep] = useState(0);

  const curatedQuestFeed = useMemo(() => buildDemoQuestFeed(4), []);
  const sponsoredQuest = curatedQuestFeed.sponsored[0] ?? demoQuests[1]!;
  const nearbyQuest = curatedQuestFeed.nearby[0] ?? demoQuests[0]!;
  const secondaryNearbyQuest = curatedQuestFeed.nearby[1] ?? demoQuests[2]!;
  const publicProfile = demoProfileSummary.profile;
  const title = demoProfileSummary.equipped_title?.name ?? "Skyline Scout";
  const leaderboardRows = demoLeaderboard.slice(0, 4);
  const place = demoPlaces[0]!;
  const generatedCandidate = demoQuestCandidates[0]!;
  const publishCandidate = demoQuestCandidates[3]!;
  const scrollOffset = 96;

  const scrollToSection = (index: number) => {
    const step = steps[index];

    if (!step) {
      return;
    }

    const node = document.getElementById(step.id);

    if (node) {
      const top = window.scrollY + node.getBoundingClientRect().top - scrollOffset;

      window.scrollTo({
        behavior: "smooth",
        top: Math.max(top, 0),
      });
    }

    setActiveStep(index);
  };

  useEffect(() => {
    const sections = steps
      .map((step, index) => {
        const element = document.getElementById(step.id);

        return element ? { element, index } : null;
      })
      .filter((item): item is { element: HTMLElement; index: number } => item !== null);

    if (sections.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) {
          return;
        }

        const index = sections.find(
          (section) => section.element === visible.target,
        )?.index;

        if (typeof index === "number") {
          setActiveStep(index);
        }
      },
      {
        rootMargin: "-20% 0px -55% 0px",
        threshold: [0.2, 0.35, 0.5, 0.75],
      },
    );

    sections.forEach((section) => observer.observe(section.element));

    return () => {
      observer.disconnect();
    };
  }, []);

  const stepNav = (
    <div className="space-y-2">
      {steps.map((step, index) => {
        const active = activeStep === index;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => scrollToSection(index)}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex w-full items-start gap-3 rounded-[1.35rem] border px-4 py-3 text-left transition",
              active
                ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                : "border-white/60 bg-white/75 text-slate-700 hover:border-sky-200 hover:bg-white",
            )}
          >
            <span
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-2xl text-xs font-semibold",
                active ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700",
              )}
            >
              {index + 1}
            </span>
            <span className="space-y-1">
              <span className="block text-sm font-semibold">{step.label}</span>
              <span
                className={cn(
                  "block text-xs leading-5",
                  active ? "text-slate-300" : "text-slate-500",
                )}
              >
                {step.body}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );

  const compactStepNav = (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {steps.map((step, index) => {
        const active = activeStep === index;

        return (
          <button
            key={step.id}
            type="button"
            onClick={() => scrollToSection(index)}
            aria-current={active ? "step" : undefined}
            className={cn(
              "flex min-w-[9rem] flex-none items-center gap-2 rounded-2xl border px-3 py-2 text-left transition",
              active
                ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:border-sky-200 hover:bg-white",
            )}
          >
            <span
              className={cn(
                "flex size-7 shrink-0 items-center justify-center rounded-xl text-xs font-semibold",
                active ? "bg-white/10 text-white" : "bg-white text-slate-700",
              )}
            >
              {index + 1}
            </span>
            <span className="block min-w-0">
              <span className="block truncate text-xs font-semibold">
                {step.label}
              </span>
              <span
                className={cn(
                  "block truncate text-[11px] leading-4",
                  active ? "text-white/70" : "text-slate-500",
                )}
              >
                {step.body}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="hidden space-y-4 xl:sticky xl:top-8 xl:block xl:max-h-[calc(100vh-4rem)] xl:self-start xl:overflow-y-auto xl:pr-1">
        <Card className="rounded-[2rem] border-slate-200/80 bg-white/88 shadow-[0_18px_52px_rgba(15,23,42,0.08)] backdrop-blur">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-2">
                <Badge className="bg-slate-950 text-white hover:bg-slate-950">
                  {mode === "demo" ? "Demo walkthrough" : "Live admin"}
                </Badge>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Guided showcase
                </p>
              </div>
              <div className="flex size-12 items-center justify-center rounded-[1.4rem] bg-[linear-gradient(135deg,_#0B1830,_#123A63_45%,_#F5B82E)] text-white shadow-lg">
                <Play className="size-5 fill-current" />
              </div>
            </div>

              <div className="space-y-2">
                <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-950">
                  RoveXP demo in one scrollable story.
                </h1>
                <p className="text-sm leading-7 text-slate-600">
                  Start here, then jump through the product and the ops workflow without leaving
                  the admin app.
                </p>
              </div>

            <div className="grid gap-2 text-sm">
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-slate-600">
                <ShieldCheck className="size-4 text-emerald-600" />
                Mobile-first consumer experience
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-slate-600">
                <Layers3 className="size-4 text-sky-600" />
                Places to candidate generation pipeline
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2 text-slate-600">
                <Users className="size-4 text-amber-600" />
                Privacy-aware leaderboards and profiles
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200/80 bg-white/88 shadow-[0_18px_52px_rgba(15,23,42,0.08)] backdrop-blur">
          <CardContent className="space-y-4 p-5">
            <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Walkthrough steps
                </p>
              <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-semibold text-white">
                {activeStep + 1}/{steps.length}
              </span>
            </div>
            {stepNav}
            <div className="flex gap-2 pt-1">
              <Button
                className="flex-1"
                disabled={activeStep === 0}
                onClick={() => scrollToSection(Math.max(activeStep - 1, 0))}
                variant="outline"
              >
                <ChevronLeft className="size-4" />
                Prev
              </Button>
              <Button
                className="flex-1"
                disabled={activeStep === steps.length - 1}
                onClick={() =>
                  scrollToSection(Math.min(activeStep + 1, steps.length - 1))
                }
              >
                Next
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-200/80 bg-slate-950 text-white shadow-[0_18px_52px_rgba(15,23,42,0.14)]">
          <CardContent className="space-y-4 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Direct admin links
              </p>
              <p className="mt-2 font-display text-2xl font-semibold tracking-tight">
                Open the live ops screens
              </p>
            </div>
            <div className="space-y-2">
              {[
                { href: "/dashboard/places/nearby", label: "Bulk nearby generation" },
                { href: "/dashboard/candidates", label: "Candidate review" },
                { href: "/dashboard/sponsors", label: "Sponsor ops" },
                { href: "/dashboard/reviews", label: "Moderation" },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-sm text-white transition hover:bg-white/10"
                >
                  <span>{item.label}</span>
                  <ArrowRight className="size-4 text-white/70" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </aside>

      <div className="space-y-6">
        <div className="xl:hidden">
          <Card className="rounded-[2rem] border-slate-200/80 bg-white/90 shadow-[0_18px_52px_rgba(15,23,42,0.08)] backdrop-blur">
            <CardContent className="space-y-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Guided showcase
                  </p>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                    Swipe through the story
                  </h2>
                </div>
                <Badge className="bg-slate-950 text-white hover:bg-slate-950">
                  {activeStep + 1}/{steps.length}
                </Badge>
              </div>

              {compactStepNav}

              <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Current step
                </p>
                <p className="mt-2 font-display text-lg font-semibold tracking-tight text-slate-950">
                  {steps[activeStep]?.label}
                </p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  {steps[activeStep]?.body}
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  disabled={activeStep === 0}
                  onClick={() => scrollToSection(Math.max(activeStep - 1, 0))}
                  variant="outline"
                >
                  <ChevronLeft className="size-4" />
                  Prev
                </Button>
                <Button
                  className="flex-1"
                  disabled={activeStep === steps.length - 1}
                  onClick={() =>
                    scrollToSection(Math.min(activeStep + 1, steps.length - 1))
                  }
                >
                  Next
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div id="overview" className="scroll-mt-8">
          <Card className="overflow-hidden rounded-[2.25rem] border-slate-200/80 bg-[linear-gradient(135deg,_rgba(8,15,29,0.98),_rgba(18,58,99,0.92)_56%,_rgba(245,184,46,0.88))] text-white shadow-[0_26px_72px_rgba(15,23,42,0.16)]">
            <CardContent className="grid gap-6 p-6 md:p-8 xl:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/10 text-white hover:bg-white/10">
                    Mobile-first
                  </Badge>
                  <Badge className="bg-cyan-500/20 text-cyan-50 hover:bg-cyan-500/20">
                    Supabase-backed
                  </Badge>
                  <Badge className="bg-amber-400/20 text-amber-50 hover:bg-amber-400/20">
                    Admin-controlled
                  </Badge>
                </div>
                <div className="space-y-3">
                  <h2 className="font-display text-4xl font-semibold tracking-tight md:text-5xl">
                    RoveXP turns real places into quests, then lets admins keep the loop safe.
                  </h2>
                  <p className="max-w-2xl text-base leading-8 text-white/82">
                    Judges can scan the guided demo to understand how sponsored placements,
                    nearby discovery, progression, privacy, and moderation fit together.
                    The real consumer experience stays mobile-native; this web route is the
                    showcase companion.
                  </p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Button
                    asChild
                    className="w-full bg-white text-slate-950 hover:bg-slate-100 sm:w-auto"
                  >
                    <Link href="/dashboard">
                      Open dashboard
                      <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    variant="outline"
                    className="w-full border-white/15 bg-white/10 text-white hover:bg-white/15 sm:w-auto"
                  >
                    <Link href="/dashboard/places/nearby">
                      Open nearby generator
                      <Layers3 className="size-4" />
                    </Link>
                  </Button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-white/8 p-4 backdrop-blur">
                <div className="rounded-[1.6rem] border border-white/10 bg-slate-950/35 p-4 shadow-[0_20px_40px_rgba(15,23,42,0.25)]">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-white/60">
                        Mobile preview
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold tracking-tight">
                        Curated quest board
                      </p>
                    </div>
                    <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                      {mode === "demo" ? "Demo" : "Live"}
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <QuestCardPreview
                      category={sponsoredQuest.category.name}
                      discovery={sponsoredQuest.discovery_type}
                      isSponsored
                      sponsorName={sponsoredQuest.sponsor_business?.name}
                      title={sponsoredQuest.title}
                      xp={sponsoredQuest.xp_reward}
                    />
                    <QuestCardPreview
                      category={nearbyQuest.category.name}
                      discovery={nearbyQuest.discovery_type}
                      isSponsored={nearbyQuest.is_sponsored}
                      title={nearbyQuest.title}
                      xp={nearbyQuest.xp_reward}
                    />
                  </div>

                  <div className="mt-4 grid grid-cols-5 gap-2 text-center text-[11px] uppercase tracking-[0.18em] text-white/55">
                    {["Home", "Quests", "Map", "Friends", "Profile"].map((item, index) => (
                      <div
                        key={item}
                        className={cn(
                          "rounded-2xl border px-2 py-2",
                          index === 0
                            ? "border-cyan-300/40 bg-cyan-400/15 text-cyan-50"
                            : "border-white/8 bg-white/5",
                        )}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DemoSection
          action={
            <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">
              Sponsored spotlight + nearby board
            </Badge>
          }
          eyebrow="User experience"
          id="discover"
          title="Sponsored quests stay premium, and the nearby board stays swipeable."
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="space-y-4 rounded-[1.75rem] bg-slate-950 p-4 text-white shadow-[0_20px_45px_rgba(15,23,42,0.2)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                    Sponsored spotlight
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold">
                    Partner quests at the top
                  </p>
                </div>
                <Sparkles className="size-5 text-amber-300" />
              </div>
              <QuestCardPreview
                category={sponsoredQuest.category.name}
                discovery={sponsoredQuest.discovery_type}
                isSponsored
                sponsorName={sponsoredQuest.sponsor_business?.name}
                title={sponsoredQuest.title}
                xp={sponsoredQuest.xp_reward}
              />
              <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm leading-7 text-white/75">
                Sponsored content is labeled clearly, gets priority placement, and still flows
                through the same quest progression rules.
              </div>
            </div>

            <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Nearby discovery
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-slate-950">
                    Swipeable board
                  </p>
                </div>
                <Compass className="size-5 text-sky-700" />
              </div>

              <div className="grid gap-3">
                {[nearbyQuest, secondaryNearbyQuest].map((quest) => (
                  <div
                    key={quest.id}
                    className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{quest.category.name}</Badge>
                      <Badge variant="outline">{quest.rarity}</Badge>
                      <Badge variant="outline">
                        {quest.discovery_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-3 font-display text-xl font-semibold text-slate-950">
                      {quest.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {quest.description}
                    </p>
                    <div className="mt-4 flex items-center justify-between text-sm text-slate-500">
                      <span>{quest.xp_reward} XP</span>
                      <span>{quest.is_featured ? "Featured nearby" : "Nearby discovery"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DemoSection>

        <DemoSection
          action={
            <Badge className="bg-emerald-100 text-emerald-900 hover:bg-emerald-100">
              Quest detail + progression
            </Badge>
          }
          eyebrow="User experience"
          id="privacy"
          title="Public usernames on leaderboards, richer friend views in profiles."
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Leaderboard preview
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-slate-950">
                    Handles, not private names
                  </p>
                </div>
                <Trophy className="size-5 text-amber-600" />
              </div>
              <div className="mt-4 overflow-hidden rounded-[1.5rem] border border-slate-200">
                {leaderboardRows.map((row, index) => (
                  <div
                    key={row.user_id}
                    className={cn(
                      "flex items-center justify-between gap-4 px-4 py-3 text-sm",
                      index % 2 === 0 ? "bg-slate-50" : "bg-white",
                    )}
                  >
                    <div>
                      <p className="font-semibold text-slate-950">{row.username}</p>
                      <p className="text-xs text-slate-500">
                        {row.state_name ?? "State ladder"} · {row.quests_completed} quests
                      </p>
                    </div>
                    <p className="font-display text-lg font-semibold text-slate-950">
                      {row.xp_total}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fbff,_#edf4fb)] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Profile preview
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-slate-950">
                    Public vs friend-aware
                  </p>
                </div>
                <Users className="size-5 text-sky-700" />
              </div>
              <div className="mt-4 space-y-4">
                <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-slate-950 text-white hover:bg-slate-950">
                      Public handle
                    </Badge>
                    <Badge variant="outline">Friend-aware profile</Badge>
                  </div>
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Public leaderboard
                      </p>
                      <p className="mt-2 font-display text-xl font-semibold text-slate-950">
                        {publicProfile.username}
                      </p>
                    </div>
                    <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        Friend-visible name
                      </p>
                      <p className="mt-2 font-display text-xl font-semibold text-slate-950">
                        {publicProfile.display_name}
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-600">
                    Leaderboards use usernames by default. Real names stay friend-aware so the
                    public view never leaks private identity.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-4 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-white/50">
                        Titles + badges
                      </p>
                      <p className="mt-1 font-display text-2xl font-semibold">
                        Progress that feels collectible
                      </p>
                    </div>
                    <BadgeCheck className="size-5 text-emerald-300" />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="bg-white/10 text-white hover:bg-white/10">
                      {title}
                    </Badge>
                    {demoProfileSummary.featured_badges.slice(0, 3).map((badge) => (
                      <Badge key={badge.id} className="bg-amber-400/20 text-amber-50 hover:bg-amber-400/20">
                        {badge.name}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-7 text-white/75">
                    Quest completions unlock titles, badges, and reward hooks that the mobile
                    app surfaces without overcomplicating the moment-to-moment loop.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DemoSection>

        <DemoSection
          action={
            <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">
              Places, nearby generation, and publish flow
            </Badge>
          }
          eyebrow="Admin workflow"
          id="pipeline"
          title="Admins start from real places, then generate quest candidates by area."
        >
          <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Source place
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-slate-950">
                    {place.name}
                  </p>
                </div>
                <MapPin className="size-5 text-rose-600" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{place.place_type}</Badge>
                <Badge variant="outline">{place.city}</Badge>
                <Badge variant="outline">{place.state_code}</Badge>
              </div>
              <p className="text-sm leading-7 text-slate-600">{place.description}</p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Rating</p>
                  <p className="mt-2 font-display text-2xl font-semibold text-slate-950">
                    {place.rating}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Reviews</p>
                  <p className="mt-2 font-display text-2xl font-semibold text-slate-950">
                    {place.review_count?.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-[linear-gradient(180deg,_#f8fbff,_#edf4fb)] p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                    Generated candidate
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold text-slate-950">
                    {generatedCandidate.title}
                  </p>
                </div>
                <Layers3 className="size-5 text-sky-700" />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">
                  Generated from place
                </Badge>
                <Badge variant="outline">
                  {generatedCandidate.discovery_type.replace("_", " ")}
                </Badge>
                <Badge variant="outline">{generatedCandidate.suggested_rarity}</Badge>
              </div>
              <p className="text-sm leading-7 text-slate-600">
                {generatedCandidate.description}
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">XP</p>
                  <p className="mt-2 font-display text-2xl font-semibold text-slate-950">
                    {generatedCandidate.suggested_xp_reward}
                  </p>
                </div>
                <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Radius</p>
                  <p className="mt-2 font-display text-2xl font-semibold text-slate-950">
                    {generatedCandidate.suggested_radius_meters}m
                  </p>
                </div>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-600">
                Bulk generation starts from the admin map or nearby search, keeps duplicates out,
                and leaves the final publish decision with a human reviewer.
              </div>
            </div>
          </div>
        </DemoSection>

        <DemoSection
          action={
            <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
              Candidate review + moderation
            </Badge>
          }
          eyebrow="Admin workflow"
          id="review"
          title="Generated candidates stay editable until an admin approves them."
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Queue state
              </p>
              <div className="mt-3 space-y-3">
                {demoQuestCandidates.slice(0, 3).map((candidate) => (
                  <div
                    key={candidate.id}
                    className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4"
                  >
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">
                        {candidate.status.replace("_", " ")}
                      </Badge>
                      <Badge variant="outline">
                        {candidate.suggested_rarity}
                      </Badge>
                      <Badge variant="outline">
                        {candidate.discovery_type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="mt-3 font-display text-lg font-semibold text-slate-950">
                      {candidate.title}
                    </p>
                    <p className="mt-2 text-sm leading-7 text-slate-600">
                      {candidate.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-950 p-4 text-white shadow-[0_20px_45px_rgba(15,23,42,0.2)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                    Publish path
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold">
                    Human approval before a quest goes live
                  </p>
                </div>
                <BadgeCheck className="size-5 text-emerald-300" />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                    Review context
                  </p>
                  <p className="mt-2 font-display text-lg font-semibold">
                    Why this candidate exists
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/74">
                    Generated from place name, category, rating, review count, and discovery
                    signals. Admins can refine title, copy, rarity, and payout before publish.
                  </p>
                </div>
                <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                    Publish target
                  </p>
                  <p className="mt-2 font-display text-lg font-semibold">
                    {publishCandidate.title}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-white/74">
                    A published candidate becomes a live quest only after review and approval.
                  </p>
                </div>
              </div>
              <div className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                  Admin actions
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Edit", "Approve", "Reject", "Publish later"].map((label) => (
                    <Badge key={label} className="bg-white/10 text-white hover:bg-white/10">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </DemoSection>

        <DemoSection
          action={
            <Badge className="bg-slate-950 text-white hover:bg-slate-950">
              Sponsors, reviews, and ops
            </Badge>
          }
          eyebrow="Admin workflow"
          id="ops"
          title="The control room stays narrow: sponsor ops, moderation, and stored-place curation."
        >
          <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
            <PipelineCard
              chip="Sponsor ops"
              icon={<Sparkles className="size-4" />}
              title={demoSponsors[0]!.name}
              body="Sponsor branding stays separate from standard discovery and can lift a quest into a premium placement without blending it into the rest of the board."
              action={
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-sky-100 text-sky-900 hover:bg-sky-100">Active partner</Badge>
                  <Badge variant="outline">Logo + copy</Badge>
                </div>
              }
            />

            <PipelineCard
              chip="Moderation"
              icon={<MessageSquareWarning className="size-4" />}
              title="Reviews stay visible and manageable"
              body="Moderation keeps photo previews, comment flags, and approval states in one place so the ops view stays practical for live content work."
              action={
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-amber-100 text-amber-900 hover:bg-amber-100">
                    Pending review
                  </Badge>
                  <Badge variant="outline">Photo preview</Badge>
                </div>
              }
            />
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <PipelineCard
              chip="Places workflow"
              icon={<MapPin className="size-4" />}
              title="Search and seed by area"
              body="The places workflow helps admins curate stored locations, inspect coverage, and add or generate candidates from nearby matches."
            />
            <PipelineCard
              chip="Nearby generation"
              icon={<Globe2 className="size-4" />}
              title="Bulk generate by radius"
              body="Stored places can be seeded into an area, filtered, and turned into a batch of candidate drafts for review."
            />
            <PipelineCard
              chip="Why it matters"
              icon={<Star className="size-4" />}
              title="Content stays human"
              body="The workflow keeps curation, review, and publish decisions with people, while the rules-based engine does the repetitive setup."
            />
          </div>

          <Separator className="my-2" />

          <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Admin links
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                {[
                  { href: "/dashboard/places", label: "Places" },
                  { href: "/dashboard/places/nearby", label: "Nearby generator" },
                  { href: "/dashboard/candidates", label: "Candidates" },
                  { href: "/dashboard/sponsors", label: "Sponsors" },
                  { href: "/dashboard/reviews", label: "Reviews" },
                ].map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-sky-200 hover:bg-white"
                  >
                    <span>{item.label}</span>
                    <ArrowRight className="size-4 text-slate-400" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-slate-200 bg-[linear-gradient(180deg,_#0b1830,_#123a63)] p-4 text-white shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-white/10">
                  <ShieldCheck className="size-5 text-cyan-200" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                    Showcase wrap-up
                  </p>
                  <p className="mt-1 font-display text-2xl font-semibold tracking-tight">
                    Mobile does the adventure. Admin keeps the content engine sharp.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/76">
                This demo stays web-safe and Vercel-friendly, but it points back to the real
                Expo app, the same Supabase project, and the same admin workflow the team uses
                to keep quests fresh.
              </p>
            </div>
          </div>
        </DemoSection>

        <DemoSection
          action={
            <Badge className="bg-slate-950 text-white hover:bg-slate-950">
              Roadmap
            </Badge>
          }
          eyebrow="Future vision"
          id="future"
          title="What a full production version could include next."
        >
          <div className="rounded-[1.8rem] border border-sky-200 bg-[linear-gradient(135deg,_rgba(239,246,255,0.96),_rgba(255,251,235,0.92))] p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="max-w-3xl space-y-2">
                <p className="text-xs uppercase tracking-[0.24em] text-sky-700">
                  Built today vs future roadmap
                </p>
                <p className="font-display text-2xl font-semibold tracking-tight text-slate-950">
                  The showcase focuses on the working MVP, the mobile app, and the content
                  pipeline. A fuller production version could expand from there.
                </p>
                <p className="text-sm leading-7 text-slate-600">
                  These ideas are intentionally framed as roadmap opportunities, not
                  shipped features. They show how RoveXP could grow into a broader,
                  more scalable platform over time.
                </p>
              </div>
              <div className="rounded-full border border-white/70 bg-white/85 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-slate-700 shadow-sm">
                Future only
              </div>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <div className="rounded-[1.35rem] border border-white/70 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  What exists now
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  <li>• Mobile quest board, sponsored spotlight, and progression flow</li>
                  <li>• Admin places, candidates, quests, sponsors, reviews, and users</li>
                  <li>• Demo mode and showcase walkthrough for judges and testers</li>
                </ul>
              </div>
              <div className="rounded-[1.35rem] border border-white/70 bg-white/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  What could come next
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-slate-700">
                  <li>• Richer maps, directions, and trip planning on the user side</li>
                  <li>• Sponsor CRM tools, analytics, and renewal planning</li>
                  <li>• Deeper achievement rewards, partnerships, and monetization layers</li>
                  <li>• Profile pictures, avatar strategy, and richer identity cues</li>
                  <li>• Google profile, review, and image enrichment for places</li>
                  <li>• More advanced reward types and account lifecycle controls</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <RoadmapCard
              kicker="For users"
              icon={<MapPin className="size-4" />}
              title="Richer discovery, rewards, and social play"
              body="A fuller production version could make the consumer experience feel even more city-native, social, and rewarding."
              items={[
                "Live quest map + directions",
                "Achievements and level-up rewards",
                "Friend challenges and group quests",
                "Seasonal and city-specific routes",
                "Push notifications and photo-first moments",
                "Profile pictures and richer avatar identity",
              ]}
            />
            <RoadmapCard
              kicker="For sponsors / businesses"
              icon={<Sparkles className="size-4" />}
              title="A stronger business and partnership layer"
              body="Future sponsor tooling could look more like a lightweight CRM, giving partners clearer campaign visibility and planning."
              items={[
                "Campaign tracking and notes",
                "Sponsor performance analytics",
                "Reward partnerships and premium tiers",
                "Renewals, contacts, and planning",
                "Discounts, gift cards, and branded offers",
                "More advanced sponsor CRM and campaign ops",
              ]}
            />
            <RoadmapCard
              kicker="For admins / operations"
              icon={<Layers3 className="size-4" />}
              title="Smarter curation and scaling tools"
              body="Ops tooling could get stronger as the catalog grows, helping teams roll out cities and keep candidate quality high."
              items={[
                "Admin map and nearby place search",
                "Better import / sync tooling",
                "Candidate quality scoring",
                "Advanced moderation dashboards",
                "City rollout and coverage planning",
                "Google profile / review / image enrichment",
              ]}
            />
            <RoadmapCard
              kicker="For growth / scale"
              icon={<Trophy className="size-4" />}
              title="Monetization and support systems"
              body="RoveXP could expand into a fuller platform with more structured monetization and support for larger partner programs."
              items={[
                "Featured city campaigns",
                "Sponsor business onboarding tools",
                "Reward catalog expansion",
                "Conversion and foot-traffic insights",
                "Premium sponsor experiences",
                "Account deactivation lifecycle controls",
              ]}
            />
          </div>

          <div className="mt-5 rounded-[1.55rem] border border-slate-200 bg-white/90 p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="max-w-3xl space-y-1">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  A realistic next chapter
                </p>
                <p className="font-display text-lg font-semibold tracking-tight text-slate-950">
                  The current build proves the core loop. Future work could deepen the
                  product without changing the foundation.
                </p>
              </div>
              <Badge className="bg-slate-950 text-white hover:bg-slate-950">
                Roadmap ideas only
              </Badge>
            </div>
          </div>
        </DemoSection>
      </div>
    </div>
  );
}
