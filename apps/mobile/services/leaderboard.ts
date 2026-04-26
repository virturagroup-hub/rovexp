import {
  demoLeaderboard,
  type LeaderboardCollection,
  type LeaderboardEntry,
} from "@rovexp/types";

import { warnSupabaseFallback } from "@/lib/runtime-status";
import { getSupabaseClient } from "@/lib/supabase";

function mapLeaderboardRows(rows: any[] | null | undefined): LeaderboardEntry[] {
  return (rows ?? []).map((row) => ({
    avatar_url: row.avatar_url ?? null,
    display_name: null,
    hidden_gems_completed: row.hidden_gems_completed,
    is_self: row.is_self,
    quests_completed: row.quests_completed,
    rank: Number(row.rank),
    reviews_count: row.reviews_count,
    state_code: row.state_code ?? null,
    state_id: row.state_id ?? null,
    state_name: row.state_name ?? null,
    title_name: row.title_name ?? null,
    user_id: row.user_id,
    username: row.username,
    xp_total: row.xp_total,
  }));
}

export async function getLeaderboardSnapshot(params: {
  stateId: string | null;
}): Promise<{
  friends: LeaderboardCollection;
  state: LeaderboardCollection;
  weekly: LeaderboardCollection;
}> {
  const supabase = getSupabaseClient() as any;

  if (supabase) {
    const [stateResult, friendsResult, weeklyResult] = await Promise.all([
      supabase.rpc("get_state_leaderboard", {
        limit_count: 25,
        selected_state_id: params.stateId,
      }),
      supabase.rpc("get_friends_leaderboard", {
        limit_count: 25,
      }),
      supabase.rpc("get_weekly_leaderboard", {
        limit_count: 25,
        selected_state_id: params.stateId,
      }),
    ]);

    if (stateResult.error || friendsResult.error || weeklyResult.error) {
      warnSupabaseFallback(
        "Leaderboards",
        stateResult.error?.message ??
          friendsResult.error?.message ??
          weeklyResult.error?.message ??
          "A live leaderboard RPC failed in Supabase.",
      );

      return {
        friends: {
          empty_message:
            "Accepted friends will appear here once your social graph starts filling in.",
          entries: demoLeaderboard.slice(0, 2),
          scope: "friends",
        },
        state: {
          empty_message:
            "Complete a quest in your selected state to start this ranking ladder.",
          entries: demoLeaderboard,
          scope: "state",
        },
        weekly: {
          empty_message:
            "Weekly movement appears here once fresh quest completions land this week.",
          entries: demoLeaderboard.slice(0, 3).map((entry, index) => ({
            ...entry,
            rank: index + 1,
            xp_total: Math.round(entry.xp_total * 0.28),
          })),
          scope: "weekly",
        },
      };
    }

    return {
      friends: {
        empty_message:
          "Accepted friends will appear here once your social graph starts filling in.",
        entries: mapLeaderboardRows(friendsResult.data),
        scope: "friends",
      },
      state: {
        empty_message:
          "Complete a quest in your selected state to start this ranking ladder.",
        entries: mapLeaderboardRows(stateResult.data),
        scope: "state",
      },
      weekly: {
        empty_message:
          "Weekly movement appears here once fresh quest completions land this week.",
        entries: mapLeaderboardRows(weeklyResult.data),
        scope: "weekly",
      },
    };
  }

  return {
    friends: {
      empty_message:
        "Accepted friends will appear here once your social graph starts filling in.",
      entries: demoLeaderboard.slice(0, 2),
      scope: "friends",
    },
    state: {
      empty_message:
        "Complete a quest in your selected state to start this ranking ladder.",
      entries: demoLeaderboard,
      scope: "state",
    },
    weekly: {
      empty_message:
        "Weekly movement appears here once fresh quest completions land this week.",
      entries: demoLeaderboard.slice(0, 3).map((entry, index) => ({
        ...entry,
        rank: index + 1,
        xp_total: Math.round(entry.xp_total * 0.28),
      })),
      scope: "weekly",
    },
  };
}
