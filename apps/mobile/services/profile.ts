import {
  demoProfileSummary,
  toStateRecords,
  type Badge,
  type ProfileFormInput,
  type ProfileSummary,
  type SettingsFormInput,
  type StateRecord,
  type Title,
  type UserProgressTotals,
  type UserStateStat,
} from "@rovexp/types";

import { warnSupabaseFallback } from "@/lib/runtime-status";
import { getSupabaseClient } from "@/lib/supabase";

function sumTotals(rows: Array<Pick<UserStateStat, "xp_total" | "quests_completed" | "hidden_gems_completed" | "reviews_count">>, userId: string): UserProgressTotals {
  return rows.reduce<UserProgressTotals>(
    (accumulator, row) => ({
      ...accumulator,
      hidden_gems_completed:
        accumulator.hidden_gems_completed + row.hidden_gems_completed,
      quests_completed: accumulator.quests_completed + row.quests_completed,
      reviews_count: accumulator.reviews_count + row.reviews_count,
      xp_total: accumulator.xp_total + row.xp_total,
    }),
    {
      hidden_gems_completed: 0,
      quests_completed: 0,
      reviews_count: 0,
      user_id: userId,
      xp_total: 0,
    },
  );
}

export async function listStates(): Promise<StateRecord[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase.from("states").select("*").order("code");

    if (!error && data) {
      return data as StateRecord[];
    }

    warnSupabaseFallback(
      "State list",
      error?.message ?? "The live states table failed to load from Supabase.",
    );
  }

  return toStateRecords();
}

export async function getProfileSummary(params: {
  demoMode?: boolean;
  userId: string | null;
}): Promise<ProfileSummary> {
  if (params.demoMode) {
    return demoProfileSummary;
  }

  const supabase = getSupabaseClient() as any;

  if (supabase && params.userId) {
    const [
      { data: profile, error: profileError },
      { data: settings, error: settingsError },
      { data: stateStats, error: stateStatsError },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", params.userId).maybeSingle(),
      supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", params.userId)
        .maybeSingle(),
      supabase.from("user_state_stats").select("*").eq("user_id", params.userId),
    ]);

    if (profile && settings && !profileError && !settingsError && !stateStatsError) {
      const homeState = profile.home_state_id
        ? (
            await supabase
              .from("states")
              .select("*")
              .eq("id", profile.home_state_id)
              .maybeSingle()
          ).data
        : null;

      const [{ data: equippedTitleRow }, { data: featuredBadgeRows }] =
        await Promise.all([
          supabase
            .from("user_titles")
            .select("title:titles(*)")
            .eq("user_id", params.userId)
            .eq("is_equipped", true)
            .maybeSingle(),
          supabase
            .from("user_badges")
            .select("badge:badges(*)")
            .eq("user_id", params.userId)
            .eq("is_featured", true)
            .limit(4),
        ]);

      const overallStats = sumTotals(
        (stateStats ?? []) as UserStateStat[],
        params.userId,
      );
      const homeStateStat =
        ((stateStats ?? []) as UserStateStat[]).find(
          (row) => row.state_id === profile.home_state_id,
        ) ?? null;

      return {
        profile,
        settings,
        home_state: (homeState ?? null) as StateRecord | null,
        equipped_title: (equippedTitleRow?.title ?? null) as Title | null,
        featured_badges: ((featuredBadgeRows ?? [])
          .map((row: { badge: Badge | null }) => row.badge)
          .filter(Boolean) as Badge[]),
        overall_stats: overallStats,
        state_stat: homeStateStat,
      };
    }

    warnSupabaseFallback(
      "Profile summary",
      profileError?.message ??
        settingsError?.message ??
        stateStatsError?.message ??
        "The live profile or settings rows were missing in Supabase.",
    );

    return {
      ...demoProfileSummary,
      profile: {
        ...demoProfileSummary.profile,
        display_name: "Explorer",
        id: params.userId,
        username: "explorer",
      },
      settings: {
        ...demoProfileSummary.settings,
        user_id: params.userId,
      },
      home_state: null,
      equipped_title: null,
      featured_badges: [],
      overall_stats: {
        hidden_gems_completed: 0,
        quests_completed: 0,
        reviews_count: 0,
        user_id: params.userId,
        xp_total: 0,
      },
      state_stat: null,
    };
  }

  return demoProfileSummary;
}

export async function updateProfile(params: {
  demoMode?: boolean;
  userId: string;
  values: ProfileFormInput;
}) {
  if (params.demoMode) {
    return;
  }

  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      avatar_url: params.values.avatar_url || null,
      display_name: params.values.display_name,
      home_state_id: params.values.home_state_id || null,
      username: params.values.username,
    })
    .eq("id", params.userId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function saveUserSettings(params: {
  demoMode?: boolean;
  userId: string;
  values: SettingsFormInput;
}) {
  if (params.demoMode) {
    return;
  }

  const supabase = getSupabaseClient() as any;

  if (!supabase) {
    return;
  }

  const { error } = await supabase
    .from("user_settings")
    .update({
      allow_camera: params.values.allow_camera,
      allow_location: params.values.allow_location,
      category_preferences: params.values.category_preferences,
      discovery_preferences: params.values.discovery_preferences,
      notifications_enabled: params.values.notifications_enabled,
      preferred_radius_miles: params.values.preferred_radius_miles,
      rarity_preferences: params.values.rarity_preferences,
      sponsor_filter: params.values.sponsor_filter,
    })
    .eq("user_id", params.userId);

  if (error) {
    throw new Error(error.message);
  }
}
