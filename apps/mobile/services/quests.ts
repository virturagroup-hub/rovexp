import {
  demoQuestCategories,
  demoQuestProgress,
  demoQuests,
  type QuestCategory,
  type QuestFilterPreferences,
  type QuestProgress,
  type QuestWithRelations,
} from "@rovexp/types";

import { mobileEnv } from "@/lib/env";
import { distanceBetweenMeters, metersToMiles } from "@/lib/geo";
import { makeLocalId } from "@/lib/id";
import {
  type SupabaseRuntimeSource,
  warnSupabaseFallback,
} from "@/lib/runtime-status";
import { getSupabaseClient } from "@/lib/supabase";
import { getCurrentSupabaseUserId } from "@/services/auth";

export interface QuestFeedItem extends QuestWithRelations {
  distanceMeters: number;
  distanceMiles: number;
}

export interface QuestFeedRuntime {
  message: string | null;
  source: SupabaseRuntimeSource;
}

export interface QuestFeedResult {
  all: QuestFeedItem[];
  areaLabel: string;
  nearby: QuestFeedItem[];
  runtimeMessage: string | null;
  runtimeSource: SupabaseRuntimeSource;
  sponsored: QuestFeedItem[];
  usingFallbackLocation: boolean;
}

export interface FeedLocationInput {
  areaLabel: string;
  latitude: number;
  longitude: number;
  stateCode: string;
}

function buildFallbackFeedItems(location: FeedLocationInput) {
  return demoQuests
    .filter((item) => item.is_active)
    .map((quest) => {
      const distanceMeters = distanceBetweenMeters(location, quest);

      return {
        ...quest,
        distanceMeters,
        distanceMiles: metersToMiles(distanceMeters),
      };
    })
    .sort((left, right) => left.distanceMeters - right.distanceMeters);
}

function mapRpcQuestRow(row: any): QuestFeedItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category_id: row.category_id,
    category: {
      color_token: row.category_color_token,
      id: row.category_id,
      name: row.category_name,
      slug: row.category_slug,
    },
    created_at: row.created_at ?? new Date().toISOString(),
    discovery_type: row.discovery_type,
    distanceMeters: row.distance_meters,
    distanceMiles: metersToMiles(row.distance_meters),
    image_url: row.image_url,
    is_active: row.is_active,
    is_featured: row.is_featured,
    is_sponsored: row.is_sponsored,
    latitude: row.latitude,
    longitude: row.longitude,
    radius_meters: row.radius_meters,
    rarity: row.rarity,
    sponsor_business: row.sponsor_business_id
      ? {
          created_at: row.created_at ?? new Date().toISOString(),
          description: row.sponsor_description,
          email: null,
          id: row.sponsor_business_id,
          is_active: true,
          logo_url: row.sponsor_logo_url,
          name: row.sponsor_name,
          phone: null,
          updated_at: row.updated_at ?? new Date().toISOString(),
          website: row.sponsor_website,
        }
      : null,
    sponsor_business_id: row.sponsor_business_id,
    state: {
      code: row.state_code,
      id: row.state_id,
      name: row.state_name,
    },
    state_id: row.state_id,
    updated_at: row.updated_at ?? new Date().toISOString(),
    xp_reward: row.xp_reward,
  };
}

async function getHiddenSponsoredQuestIds(): Promise<string[]> {
  const supabase = getSupabaseClient() as any;
  const userId = await getCurrentSupabaseUserId();

  if (!supabase || !userId) {
    return [];
  }

  const { data, error } = await supabase
    .from("user_hidden_sponsored_quests")
    .select("quest_id")
    .order("hidden_at", { ascending: false });

  if (error) {
    warnSupabaseFallback(
      "Hidden sponsored quests",
      error.message ?? "The live hidden-sponsored query failed in Supabase.",
    );
    return [];
  }

  return (data ?? []).map((row: { quest_id: string }) => row.quest_id);
}

async function getQuestCatalog(params: {
  filters: QuestFilterPreferences;
  location: FeedLocationInput;
  limitCount?: number;
}): Promise<{ items: QuestFeedItem[]; runtime: QuestFeedRuntime }> {
  const supabase = getSupabaseClient() as any;

  if (supabase) {
    const { data, error } = await supabase.rpc("get_nearby_quests", {
      category_slugs: params.filters.category_slugs.length
        ? params.filters.category_slugs
        : null,
      discovery_filter: params.filters.discovery_types.length
        ? params.filters.discovery_types
        : null,
      limit_count: params.limitCount ?? 40,
      rarity_filter: params.filters.rarities.length
        ? params.filters.rarities
        : null,
      sponsor_mode: params.filters.sponsor_filter,
      target_state_code: params.location.stateCode,
      user_latitude: params.location.latitude,
      user_longitude: params.location.longitude,
    });

    if (!error && data) {
      return {
        items: (data as any[]).map(mapRpcQuestRow),
        runtime: {
          message: null,
          source: "live",
        },
      };
    }

    const detail =
      error?.message ?? "Supabase is configured, but the quest feed request failed.";

    warnSupabaseFallback("Quest feed", detail);

    return {
      items: buildFallbackFeedItems(params.location)
        .filter((quest) => {
          if (
            params.filters.category_slugs.length &&
            !params.filters.category_slugs.includes(quest.category.slug)
        ) {
          return false;
        }

        if (
          params.filters.rarities.length &&
          !params.filters.rarities.includes(quest.rarity)
        ) {
          return false;
        }

        if (
          params.filters.discovery_types.length &&
          !params.filters.discovery_types.includes(quest.discovery_type)
        ) {
          return false;
        }

        if (
          params.filters.sponsor_filter === "sponsored" &&
          !quest.is_sponsored
        ) {
          return false;
        }

        if (params.filters.sponsor_filter === "regular" && quest.is_sponsored) {
          return false;
        }

          return true;
        })
        .slice(0, params.limitCount ?? 40),
      runtime: {
        message: detail,
        source: "fallback-backend",
      },
    };
  }

  const filtered = buildFallbackFeedItems(params.location).filter((quest) => {
    if (
      params.filters.category_slugs.length &&
      !params.filters.category_slugs.includes(quest.category.slug)
    ) {
      return false;
    }

    if (
      params.filters.rarities.length &&
      !params.filters.rarities.includes(quest.rarity)
    ) {
      return false;
    }

    if (
      params.filters.discovery_types.length &&
      !params.filters.discovery_types.includes(quest.discovery_type)
    ) {
      return false;
    }

    if (
      params.filters.sponsor_filter === "sponsored" &&
      !quest.is_sponsored
    ) {
      return false;
    }

    if (
      params.filters.sponsor_filter === "regular" &&
      quest.is_sponsored
    ) {
      return false;
    }

    return true;
  });

  return {
    items: filtered.slice(0, params.limitCount ?? 40),
    runtime: {
      message:
        "Supabase env values are missing, so the app is using the local fallback board.",
      source: "fallback-env",
    },
  };
}

export async function getQuestById(questId: string) {
  const supabase = getSupabaseClient() as any;

  if (supabase) {
    const { data, error } = await supabase
      .from("quests")
      .select(
        "*, category:quest_categories(*), state:states(*), sponsor_business:sponsor_businesses(*)",
      )
      .eq("id", questId)
      .maybeSingle();

    if (!error && data) {
      return data as QuestWithRelations;
    }

    warnSupabaseFallback(
      "Quest detail",
      error?.message ?? "The live quest detail request failed in Supabase.",
    );
  }

  return demoQuests.find((quest) => quest.id === questId) ?? null;
}

export async function getQuestCategories(): Promise<QuestCategory[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("quest_categories")
      .select("*")
      .order("name");

    if (!error && data) {
      return data as QuestCategory[];
    }

    warnSupabaseFallback(
      "Quest categories",
      error?.message ?? "The live quest categories request failed in Supabase.",
    );
  }

  return demoQuestCategories;
}

export async function getQuestFeed(params: {
  filters: QuestFilterPreferences;
  location: FeedLocationInput | null;
  radiusMiles: number;
}): Promise<QuestFeedResult> {
  const fallbackLocation = {
    areaLabel: mobileEnv.defaultAreaLabel,
    latitude: mobileEnv.defaultLatitude,
    longitude: mobileEnv.defaultLongitude,
    stateCode: mobileEnv.defaultStateCode,
  };
  const activeLocation = params.location ?? fallbackLocation;
  const source = await getQuestCatalog({
    filters: params.filters,
    location: activeLocation,
  });
  const hiddenSponsoredQuestIds = new Set(await getHiddenSponsoredQuestIds());

  const nearbyCandidates = source.items.filter((quest) => !quest.is_sponsored);
  const withinRadius = nearbyCandidates.filter(
    (quest) => quest.distanceMiles <= params.radiusMiles,
  );

  return {
    all: source.items,
    areaLabel: activeLocation.areaLabel,
    nearby: (withinRadius.length >= 3 ? withinRadius : nearbyCandidates).slice(0, 12),
    runtimeMessage: source.runtime.message,
    runtimeSource: source.runtime.source,
    sponsored: source.items
      .filter((quest) => quest.is_sponsored && !hiddenSponsoredQuestIds.has(quest.id))
      .slice(0, 4),
    usingFallbackLocation: !params.location,
  };
}

export async function getQuestProgressSnapshot() {
  const supabase = getSupabaseClient() as any;
  const userId = await getCurrentSupabaseUserId();

  if (supabase && userId) {
    const { data, error } = await supabase.rpc("get_my_quest_progress");

    if (!error && data) {
      return (data as any[]).reduce<Record<string, QuestProgress>>((accumulator, row) => {
        accumulator[row.quest_id] = {
          accepted_at: row.accepted_at,
          accepted_id: row.accepted_id,
          checked_in_at: row.checked_in_at,
          checkin_id: row.checkin_id,
          completed_at: row.completed_at,
          completion_id: row.completion_id,
          quest_id: row.quest_id,
          review_id: row.review_id,
          status: row.status,
        };

        return accumulator;
      }, {});
    }

    warnSupabaseFallback(
      "Quest progress",
      error?.message ?? "The live quest progress snapshot failed in Supabase.",
    );

    return {};
  }

  return demoQuestProgress;
}

export async function acceptQuest(params: { questId: string }) {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient() as any;
  const userId = await getCurrentSupabaseUserId();

  if (supabase && userId) {
    const { data, error } = await supabase
      .from("quest_acceptances")
      .insert({ quest_id: params.questId, user_id: userId })
      .select("*")
      .single();

    if (!error && data) {
      return {
        acceptanceId: data.id,
        acceptedAt: data.accepted_at,
      };
    }

    warnSupabaseFallback(
      "Quest acceptance",
      error?.message ?? "The live quest acceptance insert failed in Supabase.",
    );

    throw new Error(
      error?.message ??
        "Quest acceptance failed against the live Supabase project.",
    );
  }

  if (!supabase && userId) {
    return {
      acceptanceId: makeLocalId("accept"),
      acceptedAt: now,
    };
  }

  if (supabase && !userId) {
    throw new Error("Sign in to accept quests in the live Supabase project.");
  }

  return {
    acceptanceId: makeLocalId("accept"),
    acceptedAt: now,
  };
}

export async function checkInQuest(params: {
  allowMockVerification: boolean;
  currentLocation: { latitude: number; longitude: number } | null;
  quest: QuestFeedItem;
}) {
  const now = new Date().toISOString();
  const location = params.currentLocation;
  const supabase = getSupabaseClient() as any;

  if (supabase) {
    if (!location) {
      throw new Error("Current location is required to verify this check-in.");
    }

    const { data, error } = await supabase.rpc("check_in_to_quest", {
      submitted_latitude: location.latitude,
      submitted_longitude: location.longitude,
      target_quest_id: params.quest.id,
    });

    if (error) {
      throw new Error(error.message);
    }

    const row = (data as any[])[0];

    return {
      checkinId: row.checkin_id,
      checkedInAt: row.checked_in_at,
      distanceMeters: row.distance_meters,
      mockVerified: false,
      radiusMeters: row.radius_meters,
    };
  }

  if (!location && !params.allowMockVerification) {
    throw new Error("Current location is required to verify this check-in.");
  }

  const distanceMeters = location
    ? distanceBetweenMeters(location, params.quest)
    : null;

  if (distanceMeters !== null && distanceMeters > params.quest.radius_meters) {
    throw new Error(
      `Move closer to the quest location. You are about ${Math.round(distanceMeters)} meters away.`,
    );
  }

  return {
    checkinId: makeLocalId("checkin"),
    checkedInAt: now,
    distanceMeters: distanceMeters ? Math.round(distanceMeters) : null,
    mockVerified: distanceMeters === null,
    radiusMeters: params.quest.radius_meters,
  };
}

export async function completeQuest(params: { quest: QuestFeedItem }) {
  const now = new Date().toISOString();
  const supabase = getSupabaseClient() as any;

  if (supabase) {
    const { data, error } = await supabase.rpc("complete_quest_session", {
      target_quest_id: params.quest.id,
    });

    if (error) {
      throw new Error(error.message);
    }

    const row = (data as any[])[0];

    return {
      acceptedId: row.accepted_id,
      checkinId: row.checkin_id,
      completedAt: row.completed_at,
      completionId: row.completion_id,
      xpAwarded: row.xp_awarded,
    };
  }

  return {
    acceptedId: makeLocalId("accept"),
    checkinId: makeLocalId("checkin"),
    completedAt: now,
    completionId: makeLocalId("complete"),
    xpAwarded: params.quest.xp_reward,
  };
}

export async function hideSponsoredQuest(params: { questId: string }) {
  const supabase = getSupabaseClient() as any;
  const userId = await getCurrentSupabaseUserId();

  if (supabase && userId) {
    const { data, error } = await supabase.rpc("hide_sponsored_quest", {
      target_quest_id: params.questId,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data as Array<{ hidden_at: string; quest_id: string }>;
  }

  return [];
}

export async function resetHiddenSponsoredQuests() {
  const supabase = getSupabaseClient() as any;
  const userId = await getCurrentSupabaseUserId();

  if (supabase && userId) {
    const { data, error } = await supabase.rpc("reset_hidden_sponsored_quests");

    if (error) {
      throw new Error(error.message);
    }

    return Number(data ?? 0);
  }

  return 0;
}
