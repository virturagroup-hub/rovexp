import { mobileEnv } from "@/lib/env";
import type { PermissionState, LocationSnapshot } from "@/store/app-store";

export type LocationStatusTone = "good" | "neutral" | "warning";

export interface LocationStatusSummary {
  body: string;
  label: string;
  tone: LocationStatusTone;
}

export function describeLocationStatus(params: {
  lastKnownLocation: LocationSnapshot | null;
  locationPermission: PermissionState;
}) {
  if (params.locationPermission === "denied") {
    return {
      body: "RoveXP is using the fallback exploration district until location access is restored.",
      label: "Location denied",
      tone: "warning" as const,
    } satisfies LocationStatusSummary;
  }

  if (params.lastKnownLocation?.verified) {
    return {
      body: `${params.lastKnownLocation.areaLabel} is driving live nearby quests right now.`,
      label: "Live location",
      tone: "good" as const,
    } satisfies LocationStatusSummary;
  }

  return {
    body: `The app is using ${mobileEnv.defaultAreaLabel} until the GPS lock becomes available.`,
    label: "Fallback area",
    tone: "neutral" as const,
  } satisfies LocationStatusSummary;
}
