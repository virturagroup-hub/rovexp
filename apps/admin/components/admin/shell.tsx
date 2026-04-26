import Link from "next/link";
import {
  LogOut,
  Medal,
} from "lucide-react";

import type { AdminSession } from "@/lib/admin/auth";
import { signOutAction } from "@/lib/admin/actions";

import { SidebarNav } from "./sidebar-nav";

const navigation = [
  {
    href: "/dashboard",
    iconKey: "dashboard",
    label: "Overview",
    description: "Pulse check on quests, sponsors, and catalog health.",
  },
  {
    href: "/showcase",
    iconKey: "showcase",
    label: "Showcase Demo",
    description: "Guided tour of the user experience and content pipeline.",
  },
  {
    href: "/dashboard/sponsors",
    iconKey: "sponsors",
    label: "Sponsors",
    description: "Manage partner businesses and branded placements.",
  },
  {
    href: "/dashboard/places",
    iconKey: "places",
    label: "Places",
    description: "Import and curate real-world points of interest.",
  },
  {
    href: "/dashboard/candidates",
    iconKey: "candidates",
    label: "Candidates",
    description: "Review generated quest drafts before publishing.",
  },
  {
    href: "/dashboard/quests",
    iconKey: "quests",
    label: "Quests",
    description: "Tune active routes, rarity, payout, and geography.",
  },
  {
    href: "/dashboard/rewards",
    iconKey: "rewards",
    label: "Rewards",
    description: "Control redeemables, perks, and reward logic.",
  },
  {
    href: "/dashboard/titles",
    iconKey: "titles",
    label: "Titles",
    description: "Shape cosmetic progression and prestige milestones.",
  },
  {
    href: "/dashboard/badges",
    iconKey: "badges",
    label: "Badges",
    description: "Maintain collectible achievements and icon hooks.",
  },
  {
    href: "/dashboard/reviews",
    iconKey: "reviews",
    label: "Reviews",
    description: "Moderate community reviews and photo presence.",
  },
  {
    href: "/dashboard/users",
    iconKey: "users",
    label: "Users",
    description: "Inspect explorer profiles, totals, and admin roles.",
  },
] as const;

interface AdminShellProps {
  children: React.ReactNode;
  user: AdminSession["user"];
  mode: AdminSession["mode"];
}

export function AdminShell({ children, user, mode }: AdminShellProps) {
  const isDemoMode = mode === "demo";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.25),_transparent_32%),radial-gradient(circle_at_top_right,_rgba(251,146,60,0.14),_transparent_28%),linear-gradient(180deg,_#f5f7fb_0%,_#edf2f7_100%)]">
      <div className="mx-auto grid min-h-screen max-w-[1600px] gap-6 px-4 py-4 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-6">
        <aside className="flex flex-col rounded-[2rem] border border-white/70 bg-white/72 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
          <Link href="/dashboard" className="rounded-3xl bg-slate-950 px-5 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10">
                <Medal className="size-5" />
              </div>
              <div>
                <p className="font-display text-xl font-semibold tracking-tight">
                  RoveXP
                </p>
                <p className="text-xs text-slate-300">
                  Internal adventure operations
                </p>
              </div>
            </div>
          </Link>

          <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50/90 p-4">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Active Session
            </p>
            <p className="mt-3 font-display text-2xl font-semibold text-slate-950">
              {user.displayName}
            </p>
            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
            <div className="mt-4 inline-flex rounded-full bg-sky-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-900">
              {user.role}
            </div>
          </div>

          {isDemoMode ? (
            <div className="mt-5 rounded-3xl border border-sky-200 bg-sky-50/90 p-4 text-sky-950">
              <p className="text-xs uppercase tracking-[0.24em] text-sky-700">
                Demo walkthrough
              </p>
              <p className="mt-2 text-sm leading-7">
                This mode uses the seeded mock admin store so you can explore the dashboard safely.
              </p>
              <div className="mt-4 grid gap-2 text-sm leading-6 text-sky-900">
                <div className="rounded-2xl bg-white/80 px-3 py-2">1. Explore Dashboard and Sponsors</div>
                <div className="rounded-2xl bg-white/80 px-3 py-2">2. Open Places and Nearby generator to seed content</div>
                <div className="rounded-2xl bg-white/80 px-3 py-2">3. Review Candidates and publish later</div>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex-1">
            <SidebarNav items={[...navigation]} />
          </div>

          <form action={signOutAction} className="mt-6">
            <button
              type="submit"
              className="flex w-full items-center justify-between rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              {isDemoMode ? "Exit demo" : "Sign out"}
              <LogOut className="size-4" />
            </button>
          </form>
        </aside>

        <div className="flex min-h-full flex-col gap-6">
          <header className="rounded-[2rem] border border-white/70 bg-white/78 px-6 py-5 shadow-[0_18px_48px_rgba(15,23,42,0.06)] backdrop-blur">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Phase 2 Control Room
                </p>
                <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-slate-950">
                  Explore the city. Run the system.
                </h1>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-right">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  Access Mode
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {isDemoMode ? "Demo walkthrough" : "Supabase Live"}
                </p>
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
