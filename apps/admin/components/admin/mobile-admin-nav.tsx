"use client"

import Link from "next/link";
import { LogOut, Medal, Menu } from "lucide-react";

import type { AdminSession } from "@/lib/admin/auth";
import { signOutAction } from "@/lib/admin/actions";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import type { SidebarNavItem } from "./sidebar-nav";
import { SidebarNav } from "./sidebar-nav";

interface MobileAdminNavProps {
  items: SidebarNavItem[];
  mode: AdminSession["mode"];
  user: AdminSession["user"];
}

export function MobileAdminNav({ items, mode, user }: MobileAdminNavProps) {
  const isDemoMode = mode === "demo";

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          aria-label="Open navigation"
          className="size-11 rounded-2xl border border-slate-200 bg-white/90 text-slate-700 shadow-sm hover:bg-white"
          size="icon-sm"
          variant="outline"
        >
          <Menu className="size-4" />
        </Button>
      </SheetTrigger>
      <SheetContent
        className="w-[min(88vw,22rem)] border-slate-200 bg-[linear-gradient(180deg,_rgba(8,15,29,0.98),_rgba(18,58,99,0.92))] p-0 text-white sm:max-w-none"
        side="left"
      >
        <div className="flex h-full flex-col">
          <SheetHeader className="border-b border-white/10 px-4 py-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-2xl bg-white/10 text-white">
                <Medal className="size-5" />
              </div>
              <div className="min-w-0 text-left">
                <SheetTitle className="font-display text-lg font-semibold tracking-tight text-white">
                  RoveXP
                </SheetTitle>
                <SheetDescription className="text-xs text-white/60">
                  Internal adventure operations
                </SheetDescription>
              </div>
            </Link>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-white/55">
                Active session
              </p>
              <p className="mt-3 font-display text-2xl font-semibold tracking-tight text-white">
                {user.displayName}
              </p>
              <p className="mt-1 text-sm text-white/72">{user.email}</p>
              <div className="mt-4 inline-flex rounded-full bg-sky-400/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-sky-100">
                {user.role}
              </div>
            </div>

            {isDemoMode ? (
              <div className="rounded-3xl border border-cyan-300/20 bg-cyan-400/10 p-4 text-cyan-50">
                <p className="text-xs uppercase tracking-[0.24em] text-cyan-100/70">
                  Demo mode
                </p>
                <p className="mt-2 text-sm leading-7 text-cyan-50/90">
                  Seeded demo data is enabled so the dashboard stays safe and showcase-ready.
                </p>
              </div>
            ) : null}

            <SidebarNav closeOnNavigate items={items} />
          </div>

          <div className="border-t border-white/10 p-4">
            <form action={signOutAction}>
              <Button
                className="w-full justify-between border-white/10 bg-white/10 text-white hover:bg-white/15"
                type="submit"
                variant="outline"
              >
                {isDemoMode ? "Exit demo" : "Sign out"}
                <LogOut className="size-4" />
              </Button>
            </form>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
