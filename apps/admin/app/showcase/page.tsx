import type { Metadata } from "next";
import Link from "next/link";

import { ShowcaseDemo } from "@/components/admin/showcase-demo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { requireAdminSession } from "@/lib/admin/auth";
import { signOutAction } from "@/lib/admin/actions";

export const metadata: Metadata = {
  title: "Showcase Demo | RoveXP Admin",
  description: "Guided product walkthrough for the RoveXP showcase.",
};

export default async function ShowcasePage() {
  const session = await requireAdminSession();

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.24),_transparent_34%),radial-gradient(circle_at_top_right,_rgba(245,184,46,0.12),_transparent_28%),linear-gradient(180deg,_#f3f7fb_0%,_#eef3f8_100%)] px-4 py-6 lg:px-6">
      <div className="mx-auto max-w-[1600px] space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-3">
            <Badge className="bg-slate-950 text-white hover:bg-slate-950">
              Showcase route
            </Badge>
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Guided demo inside the admin site
              </p>
              <h1 className="font-display text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
                A polished walkthrough of the mobile product and the ops workflow.
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-slate-600">
                This route stays in the same Vercel deployment as the admin dashboard, but it
                tells the product story faster: user discovery, sponsored quests, privacy-aware
                profiles, places import, nearby generation, candidate review, and publishing.
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              asChild
              variant="outline"
              className="w-full border-slate-300 bg-white sm:w-auto"
            >
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
            <form action={signOutAction}>
              <Button type="submit" variant="secondary" className="w-full sm:w-auto">
                {session.mode === "demo" ? "Exit demo" : "Sign out"}
              </Button>
            </form>
          </div>
        </div>

        <ShowcaseDemo mode={session.mode} />
      </div>
    </main>
  );
}
