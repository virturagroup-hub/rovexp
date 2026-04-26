import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { QuestDiscoveryType, QuestRarity } from "@rovexp/types";

import { QuestCard } from "@/components/quest-card";
import { SettingsButton } from "@/components/settings-button";
import { RuntimeStatusBanner } from "@/components/runtime-status-banner";
import { EmptyStateCard, ScreenHeader, SectionHeader, ScreenView } from "@/components/ui";
import { theme } from "@/constants/theme";
import { tabBarLayout } from "@/constants/navigation";
import { useQuestFeedQuery, useQuestFlowMutations } from "@/hooks/use-rovexp-data";
import type { QuestFeedItem } from "@/services/quests";
import { useAppStore } from "@/store/app-store";

const sortOptions = [
  { label: "Closest", value: "distance" },
  { label: "Highest XP", value: "xp" },
] as const;

const discoveryOptions: Array<{ label: string; value: QuestDiscoveryType }> = [
  { label: "Popular", value: "popular" },
  { label: "Hidden gems", value: "hidden_gem" },
  { label: "Featured", value: "featured_route" },
];

const rarityOptions: QuestRarity[] = ["common", "rare", "epic", "legendary"];

function toggleValue<T extends string>(values: T[], value: T) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function QuestsScreen() {
  const questProgress = useAppStore((state) => state.questProgress);
  const questFilters = useAppStore((state) => state.questFilters);
  const setQuestFilters = useAppStore((state) => state.setQuestFilters);
  const locationPermission = useAppStore((state) => state.locationPermission);
  const lastKnownLocation = useAppStore((state) => state.lastKnownLocation);
  const { data } = useQuestFeedQuery();
  const { acceptMutation, checkInMutation, completeMutation } =
    useQuestFlowMutations();
  const [sortMode, setSortMode] =
    useState<(typeof sortOptions)[number]["value"]>("distance");

  const allQuests = useMemo(() => {
    const catalog = data?.all ?? [...(data?.sponsored ?? []), ...(data?.nearby ?? [])];

    return [...catalog].sort((left, right) =>
      sortMode === "distance"
        ? left.distanceMeters - right.distanceMeters
        : right.xp_reward - left.xp_reward,
    );
  }, [data?.all, data?.nearby, data?.sponsored, sortMode]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Map(allQuests.map((quest) => [quest.category.slug, quest.category])).values(),
      ),
    [allQuests],
  );

  const inProgress = allQuests.filter((quest) => {
    const status = questProgress[quest.id]?.status;
    return status && status !== "reviewed";
  });

  const handleAccept = async (quest: QuestFeedItem) => {
    try {
      await acceptMutation.mutateAsync(quest);
    } catch (error) {
      Alert.alert(
        "Could not accept quest",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleCheckIn = async (quest: QuestFeedItem) => {
    if (!questProgress[quest.id]?.accepted_id) {
      return;
    }

    try {
      await checkInMutation.mutateAsync({
        allowMockVerification:
          locationPermission !== "granted" || !lastKnownLocation?.verified,
        currentLocation: lastKnownLocation,
        quest,
      });
    } catch (error) {
      Alert.alert(
        "Check-in failed",
        error instanceof Error ? error.message : "Please move closer and try again.",
      );
    }
  };

  const handleComplete = async (quest: QuestFeedItem) => {
    if (!questProgress[quest.id]?.checkin_id) {
      return;
    }

    try {
      await completeMutation.mutateAsync({ quest });
    } catch (error) {
      Alert.alert(
        "Completion failed",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  return (
    <ScreenView>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Quests"
          rightSlot={<SettingsButton />}
          subtitle="This is the full vertical browse surface. Home stays curated and swipeable; this board is where you go deep."
          title="Quest atlas"
        />

        {data?.runtimeSource ? (
          <RuntimeStatusBanner
            detail={data.runtimeMessage}
            source={data.runtimeSource}
          />
        ) : null}

        <View style={styles.summaryRow}>
          {[
            {
              label: "Accepted",
              value: Object.values(questProgress).filter((item) => item.status === "accepted").length,
            },
            {
              label: "Checked in",
              value: Object.values(questProgress).filter((item) => item.status === "checked_in").length,
            },
            {
              label: "Completed",
              value: Object.values(questProgress).filter((item) => item.status === "completed" || item.status === "reviewed").length,
            },
          ].map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{item.value}</Text>
            </View>
          ))}
        </View>

        <View style={styles.filterCard}>
          <SectionHeader
            eyebrow="Filters"
            subtitle="Saved preferences apply across Home, Quests, and Map."
            title="Browse controls"
          />

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupLabel}>Sort</Text>
            <View style={styles.chipRow}>
              {sortOptions.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => setSortMode(option.value)}
                  style={[
                    styles.chip,
                    sortMode === option.value && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      sortMode === option.value && styles.chipTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupLabel}>Sponsor mode</Text>
            <View style={styles.chipRow}>
              {["all", "sponsored", "regular"].map((value) => (
                <Pressable
                  key={value}
                  onPress={() =>
                    setQuestFilters((current) => ({
                      ...current,
                      sponsor_filter: value as typeof current.sponsor_filter,
                    }))
                  }
                  style={[
                    styles.chip,
                    questFilters.sponsor_filter === value && styles.chipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.chipText,
                      questFilters.sponsor_filter === value && styles.chipTextActive,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupLabel}>Discovery</Text>
            <View style={styles.chipRow}>
              {discoveryOptions.map((option) => {
                const active = questFilters.discovery_types.includes(option.value);

                return (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      setQuestFilters((current) => ({
                        ...current,
                        discovery_types: toggleValue(current.discovery_types, option.value),
                      }))
                    }
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupLabel}>Rarity</Text>
            <View style={styles.chipRow}>
              {rarityOptions.map((value) => {
                const active = questFilters.rarities.includes(value);

                return (
                  <Pressable
                    key={value}
                    onPress={() =>
                      setQuestFilters((current) => ({
                        ...current,
                        rarities: toggleValue(current.rarities, value),
                      }))
                    }
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {value}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupLabel}>Categories</Text>
            <View style={styles.chipRow}>
              {categoryOptions.map((category) => {
                const active = questFilters.category_slugs.includes(category.slug);

                return (
                  <Pressable
                    key={category.id}
                    onPress={() =>
                      setQuestFilters((current) => ({
                        ...current,
                        category_slugs: toggleValue(
                          current.category_slugs,
                          category.slug,
                        ),
                      }))
                    }
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View>
          <SectionHeader
            eyebrow="In progress"
            subtitle="Everything you have already touched in the quest loop."
            title="Active journey"
          />
          {inProgress.length ? (
            inProgress.map((quest) => (
              <QuestCard
                key={quest.id}
                currentLocation={lastKnownLocation}
                isBusy={
                  acceptMutation.isPending ||
                  checkInMutation.isPending ||
                  completeMutation.isPending
                }
                locationPermission={locationPermission}
                onAccept={handleAccept}
                onCheckIn={handleCheckIn}
                onComplete={handleComplete}
                progress={questProgress[quest.id]}
                quest={quest}
              />
            ))
          ) : (
            <EmptyStateCard
              title="No quests in progress"
              subtitle="Accept one from the board below to start your next active chain."
            />
          )}
        </View>

        <View>
          <SectionHeader
            eyebrow="Board"
            subtitle="The closest active quests from the current feed, already filtered by your saved preferences."
            title="All nearby quests"
          />
          {allQuests.length ? (
            allQuests.map((quest) => (
              <QuestCard
                key={quest.id}
                currentLocation={lastKnownLocation}
                isBusy={
                  acceptMutation.isPending ||
                  checkInMutation.isPending ||
                  completeMutation.isPending
                }
                locationPermission={locationPermission}
                onAccept={handleAccept}
                onCheckIn={handleCheckIn}
                onComplete={handleComplete}
                progress={questProgress[quest.id]}
                quest={quest}
              />
            ))
          ) : (
            <EmptyStateCard
              title="No quests match these filters"
              subtitle="Loosen one or two filters above, or widen your preferred radius from Settings."
            />
          )}
        </View>
      </ScrollView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  chip: {
    backgroundColor: theme.colors.canvas,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: theme.colors.deep,
    borderColor: theme.colors.deep,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  chipText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: theme.colors.white,
  },
  container: {
    gap: 20,
    padding: theme.spacing.screen,
    paddingBottom: tabBarLayout.screenBottomPadding,
  },
  filterCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  filterGroup: {
    gap: 10,
  },
  filterGroupLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  summaryCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    minWidth: 96,
    padding: 16,
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryValue: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 24,
    marginTop: 8,
  },
});
