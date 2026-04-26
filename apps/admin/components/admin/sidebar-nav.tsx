"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  Compass,
  Gift,
  LayoutDashboard,
  Layers3,
  MapPin,
  MapPinned,
  MessageSquare,
  Map,
  Sparkles,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";

export type SidebarNavIconKey =
  | "dashboard"
  | "showcase"
  | "places"
  | "map"
  | "candidates"
  | "sponsors"
  | "quests"
  | "rewards"
  | "titles"
  | "badges"
  | "reviews"
  | "users";

interface SidebarNavItem {
  href: string;
  iconKey: SidebarNavIconKey;
  label: string;
  description: string;
}

interface SidebarNavProps {
  items: SidebarNavItem[];
}

const iconMap: Record<SidebarNavIconKey, React.ComponentType<{ className?: string }>> = {
  badges: BadgeCheck,
  dashboard: LayoutDashboard,
  showcase: Sparkles,
  candidates: Layers3,
  places: MapPin,
  map: Map,
  quests: MapPinned,
  rewards: Gift,
  reviews: MessageSquare,
  sponsors: Compass,
  titles: Sparkles,
  users: Users,
};

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {items.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = iconMap[item.iconKey];

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "group flex items-start gap-3 rounded-3xl border px-4 py-3 transition",
              isActive
                ? "border-slate-900 bg-slate-950 text-white shadow-lg shadow-slate-950/15"
                : "border-white/60 bg-white/70 text-slate-700 hover:border-sky-200 hover:bg-white",
            )}
          >
            <span
              className={cn(
                "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-2xl",
                isActive
                  ? "bg-white/10 text-white"
                  : "bg-slate-100 text-slate-700 group-hover:bg-sky-50 group-hover:text-sky-700",
              )}
            >
              <Icon className="size-4" />
            </span>
            <span className="space-y-1">
              <span className="block text-sm font-semibold">{item.label}</span>
              <span
                className={cn(
                  "block text-xs leading-5",
                  isActive ? "text-slate-300" : "text-slate-500",
                )}
              >
                {item.description}
              </span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
