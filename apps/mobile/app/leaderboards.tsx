import { router } from "expo-router";
import { ChevronLeft, Medal, Sparkles, Trophy } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyStateCard, ScreenHeader, ScreenView } from "@/components/ui";
import { theme } from "@/constants/theme";
import { useLeaderboardQuery, useProfileSummaryQuery } from "@/hooks/use-rovexp-data";

const tabs = [
  { key: "state", label: "State" },
  { key: "friends", label: "Friends" },
  { key: "weekly", label: "Weekly" },
] as const;

export default function LeaderboardsScreen() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["key"]>("state");
  const { data: profileSummary } = useProfileSummaryQuery();
  const selectedStateId = profileSummary?.home_state?.id ?? null;
  const { data } = useLeaderboardQuery(selectedStateId);

  const activeCollection = useMemo(() => {
    if (!data) {
      return null;
    }

    return activeTab === "state"
      ? data.state
      : activeTab === "friends"
        ? data.friends
        : data.weekly;
  }, [activeTab, data]);

  const leader = activeCollection?.entries[0] ?? null;

  return (
    <ScreenView>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Leaderboards"
          rightSlot={
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={theme.colors.textOnDark} size={18} />
            </Pressable>
          }
          subtitle="State, friends, and weekly ladders read from live data and keep public usernames visible."
          title="Ranks and rivals"
        />

        <View style={styles.tabRow}>
          {tabs.map((tab) => (
            <Pressable
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[
                styles.tab,
                activeTab === tab.key && styles.tabActive,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.tabTextActive,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {leader ? (
          <View style={styles.heroCard}>
            <View style={styles.heroBadge}>
              <Trophy color={theme.colors.amber} size={20} />
            </View>
            <Text style={styles.heroEyebrow}>
              {activeTab === "weekly" ? "Weekly frontrunner" : "Current pace leader"}
            </Text>
            <Text style={styles.heroName}>@{leader.username}</Text>
            <Text style={styles.heroMeta}>
              {leader.title_name ?? "Explorer"} · {leader.quests_completed} quests ·{" "}
              {leader.xp_total} XP
            </Text>
          </View>
        ) : null}

        {activeCollection?.entries.length ? (
          <View style={styles.list}>
            {activeCollection.entries.map((entry) => (
              <View key={`${activeTab}-${entry.user_id}`} style={styles.rankCard}>
                <View
                  style={[
                    styles.rankBadge,
                    entry.rank === 1 && styles.rankBadgeFirst,
                  ]}
                >
                  <Text
                    style={[
                      styles.rankBadgeText,
                      entry.rank === 1 && styles.rankBadgeTextFirst,
                    ]}
                  >
                    #{entry.rank}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.rankName}>@{entry.username}</Text>
                    {entry.is_self ? (
                      <View style={styles.selfPill}>
                        <Text style={styles.selfPillText}>You</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.rankMeta}>
                    {entry.title_name ?? "Explorer"} · {entry.quests_completed} quests
                    {activeTab === "state" && entry.state_code
                      ? ` · ${entry.state_code}`
                      : ""}
                  </Text>
                </View>
                <View style={styles.rankXp}>
                  <Medal color={theme.colors.amber} size={16} />
                  <Text style={styles.rankXpText}>{entry.xp_total}</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <EmptyStateCard
            title="Leaderboard is still warming up"
            subtitle={
              activeCollection?.empty_message ??
              "As completions and friendships accumulate, this ladder will start filling in with real explorers."
            }
          />
        )}

        <View style={styles.noteCard}>
          <Sparkles color={theme.colors.accent} size={18} />
          <Text style={styles.noteText}>
            State rankings are based on quest completions in that state, while the weekly board rolls up the last seven days of completions and visible reviews.
          </Text>
        </View>
      </ScrollView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: theme.colors.deep,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  container: {
    gap: 18,
    padding: theme.spacing.screen,
    paddingBottom: 32,
  },
  heroBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.rewardSoft,
    borderRadius: 20,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  heroCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 8,
    padding: 20,
  },
  heroEyebrow: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  heroMeta: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  heroName: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 28,
  },
  list: {
    gap: 12,
  },
  nameRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  noteCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 18,
  },
  noteText: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  rankBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.panel,
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  rankBadgeFirst: {
    backgroundColor: theme.colors.rewardSoft,
  },
  rankBadgeText: {
    color: theme.colors.deep,
    fontFamily: "SpaceMono",
    fontSize: 13,
  },
  rankBadgeTextFirst: {
    color: theme.colors.rewardText,
  },
  rankCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 26,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  rankMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  rankName: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 17,
  },
  rankXp: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  rankXpText: {
    color: theme.colors.deep,
    fontSize: 14,
    fontWeight: "800",
  },
  selfPill: {
    backgroundColor: theme.colors.badgeSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  selfPillText: {
    color: theme.colors.accent,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  tab: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  tabActive: {
    backgroundColor: theme.colors.deep,
    borderColor: theme.colors.deep,
    shadowOpacity: 0.14,
  },
  tabRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  tabText: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  tabTextActive: {
    color: theme.colors.white,
  },
});
