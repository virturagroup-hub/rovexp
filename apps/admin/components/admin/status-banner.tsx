import { AlertCircle, CheckCircle2 } from "lucide-react";

import { cn } from "@/lib/utils";

const banners = {
  "check-form": {
    icon: AlertCircle,
    title: "Check the form details",
    body: "A required field is missing or one of the values needs a cleaner format.",
    tone: "warning",
  },
  "invalid-credentials": {
    icon: AlertCircle,
    title: "Sign-in failed",
    body: "Double-check the email and password, then try again.",
    tone: "warning",
  },
  "invalid-json": {
    icon: AlertCircle,
    title: "JSON needs attention",
    body: "The metadata or rule JSON could not be parsed. Fix the syntax and submit again.",
    tone: "warning",
  },
  "state-invalid": {
    icon: AlertCircle,
    title: "State values need attention",
    body: "The selected state ID or state code could not be resolved. Pick a valid state and try again.",
    tone: "warning",
  },
  "demo-disabled": {
    icon: AlertCircle,
    title: "Demo mode unavailable",
    body: "The demo walkthrough is turned off in this deployment.",
    tone: "warning",
  },
  "demo-mode": {
    icon: CheckCircle2,
    title: "Demo mode active",
    body: "You are exploring a mock-backed walkthrough. Sign out to return to the live admin path.",
    tone: "info",
  },
  generated: {
    icon: CheckCircle2,
    title: "Candidate generated",
    body: "A new quest candidate was seeded from the source place and is ready for review.",
    tone: "success",
  },
  "bulk-generated": {
    icon: CheckCircle2,
    title: "Nearby candidates generated",
    body: "The nearby places batch produced new draft candidates and skipped duplicates safely.",
    tone: "success",
  },
  imported: {
    icon: CheckCircle2,
    title: "Places imported",
    body: "The new place records are now available for candidate generation and review.",
    tone: "success",
  },
  "missing-env": {
    icon: AlertCircle,
    title: "Supabase is not configured",
    body: "Add the required environment variables before trying to access the private admin surface.",
    tone: "warning",
  },
  "not-authorized": {
    icon: AlertCircle,
    title: "Admin access required",
    body: "This account exists, but it does not have a row in admin_users yet.",
    tone: "warning",
  },
  saved: {
    icon: CheckCircle2,
    title: "Changes saved",
    body: "The latest update is now reflected in the dashboard.",
    tone: "success",
  },
  published: {
    icon: CheckCircle2,
    title: "Quest published",
    body: "The approved candidate is now live as a playable quest.",
    tone: "success",
  },
  "sponsor-required": {
    icon: AlertCircle,
    title: "Sponsor selection needed",
    body: "Sponsored quests need an associated sponsor business before they can be saved.",
    tone: "warning",
  },
  "place-needs-coordinates": {
    icon: AlertCircle,
    title: "Coordinates are required",
    body: "This place needs a valid latitude and longitude before a candidate can be generated.",
    tone: "warning",
  },
  "place-not-eligible": {
    icon: AlertCircle,
    title: "Place is not eligible yet",
    body: "Only active, publicly visitable places can be turned into quest candidates.",
    tone: "warning",
  },
  "candidate-duplicate": {
    icon: CheckCircle2,
    title: "Candidate already exists",
    body: "This place already has a candidate. Open the existing draft instead of generating another one.",
    tone: "info",
  },
  "place-generation-failed": {
    icon: AlertCircle,
    title: "Candidate generation failed",
    body: "Something unexpected blocked the place from becoming a candidate. Check the place details and try again.",
    tone: "warning",
  },
  "signed-out": {
    icon: CheckCircle2,
    title: "Signed out",
    body: "Your admin session has been closed.",
    tone: "success",
  },
} as const;

interface StatusBannerProps {
  code?: string;
}

export function StatusBanner({ code }: StatusBannerProps) {
  if (!code) {
    return null;
  }

  const banner = banners[code as keyof typeof banners];

  if (!banner) {
    return null;
  }

  const Icon = banner.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-3xl border px-4 py-4 text-sm",
        banner.tone === "success" &&
          "border-emerald-200 bg-emerald-50 text-emerald-900",
        banner.tone === "warning" &&
          "border-amber-200 bg-amber-50 text-amber-950",
        banner.tone === "info" && "border-sky-200 bg-sky-50 text-sky-950",
      )}
    >
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-2xl bg-white/80">
        <Icon className="size-4" />
      </div>
      <div className="space-y-1">
        <p className="font-semibold">{banner.title}</p>
        <p className="leading-6 opacity-90">{banner.body}</p>
      </div>
    </div>
  );
}
