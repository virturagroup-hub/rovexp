import {
  demoLeaderboard,
  demoQuests,
  demoStates,
  type FriendActivityItem,
  type FriendHubEntry,
  type FriendRelationshipStatus,
  type FriendSearchResult,
  type Friendship,
} from "@rovexp/types";

import { getCurrentSupabaseUserId } from "@/services/auth";
import { warnSupabaseFallback } from "@/lib/runtime-status";
import { getSupabaseClient } from "@/lib/supabase";
import { makeLocalId } from "@/lib/id";

const demoFriendActivity: FriendActivityItem[] = [
  {
    activity_id: "demo-activity-1",
    activity_type: "quest_completed",
    avatar_url: null,
    comment: null,
    created_at: "2026-04-18T15:20:00.000Z",
    display_name: "Riley Chen",
    quest_id: demoQuests[0]!.id,
    quest_title: demoQuests[0]!.title,
    rating: null,
    state_code: demoStates[0]!.code,
    username: "riley_chen",
    user_id: "user-lead-1",
    xp_awarded: 180,
  },
  {
    activity_id: "demo-activity-2",
    activity_type: "review_posted",
    avatar_url: null,
    comment: "Great hidden mural stop. Worth giving yourself time to wander one block farther than the pin.",
    created_at: "2026-04-18T14:05:00.000Z",
    display_name: "Tess Alvarez",
    quest_id: demoQuests[3]!.id,
    quest_title: demoQuests[3]!.title,
    rating: 4,
    state_code: demoStates[0]!.code,
    username: "tess_alvarez",
    user_id: "user-lead-3",
    xp_awarded: null,
  },
];

function mapFriendHubRow(row: any): FriendHubEntry {
  return {
    addressee_id: row.addressee_id,
    created_at: row.created_at,
    direction: row.direction,
    friendship_id: row.friendship_id,
    other_avatar_url: row.other_avatar_url,
    other_display_name: row.other_display_name ?? row.other_username,
    other_hidden_gems_completed: row.other_hidden_gems_completed,
    other_home_state_code: row.other_home_state_code,
    other_home_state_id: row.other_home_state_id,
    other_home_state_name: row.other_home_state_name,
    other_quests_completed: row.other_quests_completed,
    other_reviews_count: row.other_reviews_count,
    other_title_name: row.other_title_name,
    other_user_id: row.other_user_id,
    other_username: row.other_username,
    other_xp_total: row.other_xp_total,
    requester_id: row.requester_id,
    status: row.status,
  };
}

function mapFriendSearchRow(row: any): FriendSearchResult {
  return {
    avatar_url: row.avatar_url,
    display_name: null,
    friend_code: row.friend_code,
    hidden_gems_completed: row.hidden_gems_completed,
    home_state_code: row.home_state_code,
    home_state_id: row.home_state_id,
    home_state_name: row.home_state_name,
    quests_completed: row.quests_completed,
    relationship_status: row.relationship_status as FriendRelationshipStatus,
    reviews_count: row.reviews_count,
    user_id: row.user_id,
    username: row.username,
    xp_total: row.xp_total,
  };
}

function mapFriendActivityRow(row: any): FriendActivityItem {
  return {
    activity_id: row.activity_id,
    activity_type: row.activity_type,
    avatar_url: row.avatar_url,
    comment: row.comment,
    created_at: row.created_at,
    display_name: row.display_name,
    quest_id: row.quest_id,
    quest_title: row.quest_title,
    rating: row.rating,
    state_code: row.state_code,
    user_id: row.user_id,
    username: row.username,
    xp_awarded: row.xp_awarded,
  };
}

function deriveDemoFriendCode(username: string) {
  const normalized = username.replace(/[^a-z0-9]/gi, "").toUpperCase();
  return `RV-${normalized.slice(0, 6).padEnd(6, "X")}`;
}

function buildDemoFriendHub(): FriendHubEntry[] {
  return demoLeaderboard
    .filter((entry) => !entry.is_self)
    .slice(0, 3)
    .map((entry, index) => ({
      addressee_id: `demo-addressee-${index + 1}`,
      created_at: "2026-04-18T13:00:00.000Z",
      direction: "friend",
      friendship_id: `demo-friendship-${index + 1}`,
      other_avatar_url: entry.avatar_url,
      other_display_name: entry.display_name ?? entry.username,
      other_hidden_gems_completed: entry.hidden_gems_completed,
      other_home_state_code: entry.state_code ?? null,
      other_home_state_id: entry.state_id ?? null,
      other_home_state_name: entry.state_name ?? null,
      other_quests_completed: entry.quests_completed,
      other_reviews_count: entry.reviews_count,
      other_title_name: entry.title_name,
      other_user_id: entry.user_id,
      other_username: entry.username,
      other_xp_total: entry.xp_total,
      requester_id: "demo-user",
      status: "accepted",
    }));
}

function buildDemoSearchResults(query: string): FriendSearchResult[] {
  const normalized = query.trim().toLowerCase();

  return demoLeaderboard
    .filter(
      (entry) =>
        entry.username.toLowerCase().includes(normalized) ||
        deriveDemoFriendCode(entry.username).toLowerCase().includes(normalized),
    )
    .filter((entry) => !entry.is_self)
    .slice(0, 6)
    .map((entry) => ({
      avatar_url: entry.avatar_url,
      display_name: null,
      friend_code: deriveDemoFriendCode(entry.username),
      hidden_gems_completed: entry.hidden_gems_completed,
      home_state_code: entry.state_code ?? null,
      home_state_id: entry.state_id ?? null,
      home_state_name: entry.state_name ?? null,
      quests_completed: entry.quests_completed,
      relationship_status: "none",
      reviews_count: entry.reviews_count,
      user_id: entry.user_id,
      username: entry.username,
      xp_total: entry.xp_total,
    }));
}

function buildDemoActivityFeed(): FriendActivityItem[] {
  return demoFriendActivity;
}

export async function getFriendHub(): Promise<FriendHubEntry[]> {
  const supabase = getSupabaseClient() as any;
  const userId = await getCurrentSupabaseUserId();

  if (supabase && userId) {
    const { data, error } = await supabase.rpc("get_friend_hub", {
      limit_count: 50,
    });

    if (!error && data) {
      return (data as any[]).map(mapFriendHubRow);
    }

    warnSupabaseFallback(
      "Friend hub",
      error?.message ?? "The live friend hub query failed in Supabase.",
    );
  }

  return buildDemoFriendHub();
}

export async function searchFriends(query: string): Promise<FriendSearchResult[]> {
  const supabase = getSupabaseClient() as any;
  const userId = await getCurrentSupabaseUserId();
  const normalized = query.trim();

  if (supabase && userId && normalized.length >= 2) {
    const { data, error } = await supabase.rpc("search_profiles", {
      limit_count: 12,
      search_query: normalized,
    });

    if (!error && data) {
      return (data as any[]).map(mapFriendSearchRow);
    }

    warnSupabaseFallback(
      "Friend search",
      error?.message ?? "The live profile search query failed in Supabase.",
    );
  }

  if (!normalized) {
    return [];
  }

  return buildDemoSearchResults(normalized);
}

export async function requestFriendshipByCode(friendCode: string) {
  const supabase = getSupabaseClient() as any;
  const userId = await getCurrentSupabaseUserId();
  const normalized = friendCode.trim().toUpperCase();

  if (supabase && userId) {
    const { data, error } = await supabase.rpc("request_friendship_by_code", {
      friend_code: normalized,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      const row = Array.isArray(data) ? data[0] : data;

      return {
        addressee_id: row.addressee_id,
        created_at: row.created_at,
        id: row.id,
        requester_id: row.requester_id,
        status: row.status,
      };
    }

    throw new Error("The friend code invite did not return a result.");
  }

  const demoMatch = demoLeaderboard.find(
    (entry) => deriveDemoFriendCode(entry.username) === normalized,
  );

  if (!demoMatch) {
    throw new Error("Friend code not found.");
  }

  return {
    addressee_id: demoMatch.user_id,
    created_at: new Date().toISOString(),
    id: makeLocalId("friendship"),
    requester_id: userId ?? "demo-user",
    status: "pending",
  };
}

async function runFriendAction(functionName: string, params: Record<string, unknown>): Promise<Friendship> {
  const supabase = getSupabaseClient() as any;
  const userId = await getCurrentSupabaseUserId();

  if (supabase && userId) {
    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      const row = Array.isArray(data) ? data[0] : data;

      return {
        addressee_id: row.addressee_id,
        created_at: row.created_at,
        id: row.id,
        requester_id: row.requester_id,
        status: row.status,
      };
    }

    throw new Error("The friendship action did not return a result.");
  }

  return {
    addressee_id: String(params.target_user_id ?? params.friendship_id ?? "demo"),
    created_at: new Date().toISOString(),
    id: makeLocalId("friendship"),
    requester_id: userId ?? "demo-user",
    status: "pending",
  };
}

export function requestFriendship(targetUserId: string) {
  return runFriendAction("request_friendship", { target_user_id: targetUserId });
}

export function acceptFriendship(friendshipId: string) {
  return runFriendAction("accept_friendship", { friendship_id: friendshipId });
}

export function deleteFriendship(friendshipId: string) {
  return runFriendAction("delete_friendship", { friendship_id: friendshipId });
}

export async function getFriendActivityFeed(): Promise<FriendActivityItem[]> {
  const supabase = getSupabaseClient() as any;
  const userId = await getCurrentSupabaseUserId();

  if (supabase && userId) {
    const { data, error } = await supabase.rpc("get_friend_activity_feed", {
      limit_count: 12,
    });

    if (!error && data) {
      return (data as any[]).map(mapFriendActivityRow);
    }

    warnSupabaseFallback(
      "Friend activity",
      error?.message ?? "The live friend activity feed failed in Supabase.",
    );
  }

  return buildDemoActivityFeed();
}
