export type SupabaseRuntimeSource = "live" | "fallback-env" | "fallback-backend";

const warnedContexts = new Set<string>();

export function describeSupabaseRuntimeSource(
  source: SupabaseRuntimeSource,
  detail?: string | null,
) {
  switch (source) {
    case "live":
      return {
        body: "Connected to the live Supabase project.",
        label: "Live Supabase",
        tone: "good" as const,
      };
    case "fallback-env":
      return {
        body:
          "Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to switch from local fallback data to live project data.",
        label: "Fallback mode: env missing",
        tone: "neutral" as const,
      };
    case "fallback-backend":
      return {
        body:
          detail ??
          "Supabase is configured, but a live request failed so the app is showing fallback data for now.",
        label: "Fallback mode: backend error",
        tone: "warning" as const,
      };
  }
}

export function warnSupabaseFallback(context: string, detail?: string | null) {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const normalizedDetail = detail?.trim() || "the backend request failed";
  const cacheKey = `${context}:${normalizedDetail}`;

  if (warnedContexts.has(cacheKey)) {
    return;
  }

  warnedContexts.add(cacheKey);
  console.warn(
    `[RoveXP] ${context} fell back to mock data because ${normalizedDetail}.`,
  );
}
