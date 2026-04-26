import * as Location from "expo-location";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useState, type ReactNode } from "react";
import {
  Alert,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Compass, Gem, Map, Sparkles, Trophy } from "lucide-react-native";
import type { QuestProgress } from "@rovexp/types";

import { QuestCard } from "@/components/quest-card";
import { SettingsButton } from "@/components/settings-button";
import { RuntimeStatusBanner } from "@/components/runtime-status-banner";
import { EmptyStateCard, ScreenHeader, ScreenView, SectionHeader } from "@/components/ui";
import { theme } from "@/constants/theme";
import { tabBarLayout } from "@/constants/navigation";
import { describeLocationStatus } from "@/lib/location-status";
import {
  useQuestFeedQuery,
  useQuestFlowMutations,
  useQuestVisibilityMutations,
} from "@/hooks/use-rovexp-data";
import { mobileEnv } from "@/lib/env";
import type { QuestFeedItem } from "@/services/quests";
import { useAppStore } from "@/store/app-store";

const radiusOptions = [3, 8, 15];

const railGap = 12;

function QuickShortcut({
  accent,
  icon,
  onPress,
  subtitle,
  title,
}: {
  accent: keyof typeof theme.colors;
  icon: ReactNode;
  onPress: () => void;
  subtitle: string;
  title: string;
}) {
  return (
    <Pressable onPress={onPress} style={styles.shortcutShell}>
      <LinearGradient
        colors={[theme.colors.card, theme.colors.cardAlt]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.shortcutCard}
      >
        <View
          style={[
            styles.shortcutIconBubble,
            { backgroundColor: `${theme.colors[accent]}1F` },
          ]}
        >
          {icon}
        </View>
        <Text style={styles.shortcutTitle}>{title}</Text>
        <Text style={styles.shortcutSubtitle}>{subtitle}</Text>
      </LinearGradient>
    </Pressable>
  );
}

function QuestRail({
  actionLabel,
  compact = true,
  currentLocation,
  emptySubtitle,
  emptyTitle,
  isLoading,
  isBusy,
  locationPermission,
  onAccept,
  onActionPress,
  onCheckIn,
  onComplete,
  onHideQuest,
  progress,
  quests,
  showDots = false,
  subtitle,
  title,
  width,
}: {
  actionLabel?: string;
  compact?: boolean;
  currentLocation: Parameters<typeof QuestCard>[0]["currentLocation"];
  emptySubtitle: string;
  emptyTitle: string;
  isLoading: boolean;
  isBusy: boolean;
  locationPermission: Parameters<typeof QuestCard>[0]["locationPermission"];
  onAccept: Parameters<typeof QuestCard>[0]["onAccept"];
  onActionPress?: () => void;
  onCheckIn: Parameters<typeof QuestCard>[0]["onCheckIn"];
  onComplete: Parameters<typeof QuestCard>[0]["onComplete"];
  onHideQuest?: Parameters<typeof QuestCard>[0]["onHideQuest"];
  progress: Record<string, QuestProgress | undefined>;
  quests: QuestFeedItem[];
  showDots?: boolean;
  subtitle: string;
  title: string;
  width: number;
}) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <View>
      <SectionHeader
        actionLabel={actionLabel}
        onActionPress={onActionPress}
        subtitle={subtitle}
        title={title}
      />

      {isLoading ? (
        <View style={styles.loadingCard}>
          <Text style={styles.loadingText}>
            {title === "Sponsored spotlight"
              ? "Scanning nearby sponsor quests..."
              : "Finding nearby quests..."}
          </Text>
        </View>
      ) : quests.length ? (
        <>
          <ScrollView
            horizontal
            decelerationRate="fast"
            contentContainerStyle={styles.railContent}
            showsHorizontalScrollIndicator={false}
            snapToInterval={width + railGap}
            snapToAlignment="start"
            onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / (width + railGap),
              );
              setActiveIndex(Math.max(0, Math.min(index, quests.length - 1)));
            }}
          >
            {quests.map((quest, index) => (
              <View
                key={quest.id}
                style={[
                  styles.railItem,
                  { marginRight: index === quests.length - 1 ? 0 : railGap, width },
                ]}
              >
                <QuestCard
                  compact={compact}
                  currentLocation={currentLocation}
                  isBusy={isBusy}
                  locationPermission={locationPermission}
                  onAccept={onAccept}
                  onCheckIn={onCheckIn}
                  onComplete={onComplete}
                  onHideQuest={onHideQuest}
                  progress={progress[quest.id]}
                  quest={quest}
                  style={styles.railCard}
                />
              </View>
            ))}
          </ScrollView>

          {showDots ? (
            <View style={styles.paginationRow}>
              {quests.map((quest, index) => (
                <View
                  key={quest.id}
                  style={[
                    styles.paginationDot,
                    index === activeIndex && styles.paginationDotActive,
                  ]}
                />
              ))}
            </View>
          ) : null}
        </>
      ) : (
        <EmptyStateCard title={emptyTitle} subtitle={emptySubtitle} />
      )}
    </View>
  );
}

export default function HomeScreen() {
  const authMode = useAppStore((state) => state.authMode);
  const displayName = useAppStore((state) => state.displayName);
  const preferredRadiusMiles = useAppStore((state) => state.preferredRadiusMiles);
  const questFilters = useAppStore((state) => state.questFilters);
  const setQuestFilters = useAppStore((state) => state.setQuestFilters);
  const setPreferredRadius = useAppStore((state) => state.setPreferredRadius);
  const questProgress = useAppStore((state) => state.questProgress);
  const locationPermission = useAppStore((state) => state.locationPermission);
  const lastKnownLocation = useAppStore((state) => state.lastKnownLocation);
  const setStoredLocation = useAppStore((state) => state.setStoredLocation);
  const { data, isLoading } = useQuestFeedQuery();
  const { acceptMutation, checkInMutation, completeMutation } =
    useQuestFlowMutations();
  const { hideSponsoredMutation } = useQuestVisibilityMutations();
  const { width } = useWindowDimensions();

  useEffect(() => {
    let cancelled = false;
    let subscription: Location.LocationSubscription | null = null;

    async function refreshLocation() {
      if (locationPermission !== "granted") {
        return;
      }

      try {
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        const reverse = await Location.reverseGeocodeAsync(position.coords);
        const topResult = reverse[0];

        if (cancelled) {
          return;
        }

        const regionLabel = topResult?.region ?? mobileEnv.defaultStateCode;
        const cityLabel = topResult?.city ?? "Nearby";
        const resolvedLocation = {
          areaLabel: `${cityLabel}, ${regionLabel}`,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          stateCode: regionLabel.slice(0, 2).toUpperCase(),
          verified: true,
        };

        setStoredLocation({
          ...resolvedLocation,
        });

        subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.Balanced,
            distanceInterval: 50,
          },
          (nextPosition) => {
            if (cancelled) {
              return;
            }

            setStoredLocation({
              ...resolvedLocation,
              latitude: nextPosition.coords.latitude,
              longitude: nextPosition.coords.longitude,
            });
          },
        );
      } catch {
        // Phase 2 still falls back to the default exploration district for browsing.
      }
    }

    void refreshLocation();

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, [locationPermission, setStoredLocation]);

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
      Alert.alert("Accept required", "Accept the quest before checking in.");
      return;
    }

    try {
      const result = await checkInMutation.mutateAsync({
        allowMockVerification:
          locationPermission !== "granted" || !lastKnownLocation?.verified,
        currentLocation: lastKnownLocation,
        quest,
      });

      if (result?.mockVerified) {
        Alert.alert(
          "Demo verification used",
          "Location could not be verified, so RoveXP used the local development fallback for this check-in.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Check-in failed",
        error instanceof Error ? error.message : "Please move closer and try again.",
      );
    }
  };

  const handleComplete = async (quest: QuestFeedItem) => {
    if (!questProgress[quest.id]?.checkin_id) {
      Alert.alert(
        "Check-in required",
        "You need to check in before completing this quest.",
      );
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

  const handleHideSponsoredQuest = async (quest: QuestFeedItem) => {
    try {
      await hideSponsoredMutation.mutateAsync(quest.id);
    } catch (error) {
      Alert.alert(
        "Could not hide quest",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const busy =
    acceptMutation.isPending ||
    checkInMutation.isPending ||
    completeMutation.isPending ||
    hideSponsoredMutation.isPending;
  const firstName = displayName.split(" ")[0];
  const sponsoredCardWidth = Math.min(320, Math.max(280, Math.round(width * 0.76)));
  const featuredCardWidth = Math.min(356, Math.max(300, Math.round(width * 0.84)));
  const locationStatus = describeLocationStatus({
    lastKnownLocation,
    locationPermission,
  });

  return (
    <ScreenView>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Home"
          rightSlot={<SettingsButton />}
          subtitle={`Radius set to ${preferredRadiusMiles} miles`}
          title={`Welcome back, ${firstName}`}
        />

        {data?.runtimeSource ? (
          <RuntimeStatusBanner
            detail={data.runtimeMessage}
            source={data.runtimeSource}
          />
        ) : null}

        <LinearGradient
          colors={theme.gradients.hero}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.hero}
        >
          <Text style={styles.heroEyebrow}>Current area</Text>
          <Text style={styles.heroTitle}>
            {data?.areaLabel ?? lastKnownLocation?.areaLabel ?? mobileEnv.defaultAreaLabel}
          </Text>
          <Text style={styles.heroBody}>
            {data?.usingFallbackLocation
              ? "Using the fallback exploration district until live location is available."
              : "Live location is shaping your nearby quest board."}
          </Text>
          <View style={styles.statusRow}>
            {authMode === "demo" ? (
              <View style={[styles.statusPill, styles.statusPillDemo]}>
                <Text style={styles.statusPillText}>Demo mode</Text>
              </View>
            ) : null}
            <View
              style={[
                styles.statusPill,
                locationStatus.tone === "good"
                  ? styles.statusPillGood
                  : locationStatus.tone === "warning"
                    ? styles.statusPillWarning
                    : styles.statusPillNeutral,
              ]}
            >
              <Text style={styles.statusPillText}>{locationStatus.label}</Text>
            </View>
          </View>
          <Text style={styles.locationStatusBody}>{locationStatus.body}</Text>
          <View style={styles.filterSummaryRow}>
            <Text style={styles.filterSummaryLabel}>Active filters</Text>
            <Text style={styles.filterSummaryValue}>
              {questFilters.category_slugs.length
                ? `${questFilters.category_slugs.length} categories`
                : "All categories"}
              {" · "}
              {questFilters.rarities.length
                ? `${questFilters.rarities.length} rarities`
                : "All rarities"}
              {" · "}
              {questFilters.sponsor_filter}
            </Text>
          </View>
          <View style={styles.radiusRow}>
            {radiusOptions.map((radius) => (
              <Pressable
                key={radius}
                onPress={() => setPreferredRadius(radius)}
                style={[
                  styles.radiusChip,
                  preferredRadiusMiles === radius && styles.radiusChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.radiusChipText,
                    preferredRadiusMiles === radius && styles.radiusChipTextActive,
                  ]}
                >
                  {radius} mi
                </Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        <QuestRail
          actionLabel="Tune filters"
          compact={false}
          currentLocation={lastKnownLocation}
          emptySubtitle="As sponsor inventory grows, the closest placements will appear here first."
          emptyTitle="No sponsored quests in range"
          isLoading={isLoading}
          isBusy={busy}
          locationPermission={locationPermission}
          onAccept={handleAccept}
          onActionPress={() => router.push("/settings")}
          onCheckIn={handleCheckIn}
          onComplete={handleComplete}
          onHideQuest={handleHideSponsoredQuest}
          progress={questProgress}
          quests={isLoading ? [] : data?.sponsored ?? []}
          subtitle="Partner-backed quests stay separate so they feel premium without blending into the standard board."
          title="Sponsored spotlight"
          width={sponsoredCardWidth}
        />

        <QuestRail
          actionLabel="Open board"
          compact
          currentLocation={lastKnownLocation}
          emptySubtitle="Try widening the radius or adjusting your saved quest filters from Settings."
          emptyTitle="Nothing nearby yet"
          isLoading={isLoading}
          isBusy={busy}
          locationPermission={locationPermission}
          onAccept={handleAccept}
          onActionPress={() => router.push("/(tabs)/quests")}
          onCheckIn={handleCheckIn}
          onComplete={handleComplete}
          progress={questProgress}
          quests={isLoading ? [] : data?.nearby ?? []}
          showDots
          subtitle="Swipe through the quests most worth your time right now. The full catalog lives in Quests."
          title="Featured nearby quests"
          width={featuredCardWidth}
        />

        <View>
          <SectionHeader
            eyebrow="Shortcuts"
            subtitle="Jump straight to the part of the adventure you want next."
            title="Quick actions"
          />
          <View style={styles.shortcutsGrid}>
            <QuickShortcut
              accent="deepBlue"
              icon={<Compass color={theme.colors.deepBlue} size={20} />}
              onPress={() => router.push("/(tabs)/quests")}
              subtitle="Open the full browse surface."
              title="View all quests"
            />
            <QuickShortcut
              accent="cyan"
              icon={<Map color={theme.colors.accent} size={20} />}
              onPress={() => router.push("/(tabs)/map")}
              subtitle="See nearby quests on the map."
              title="Open map"
            />
            <QuickShortcut
              accent="emerald"
              icon={<Gem color={theme.colors.emerald} size={20} />}
              onPress={() => {
                setQuestFilters((current: typeof questFilters) => ({
                  ...current,
                  discovery_types: ["hidden_gem"],
                  sponsor_filter: "all",
                }));
                router.push("/(tabs)/quests");
              }}
              subtitle="Focus the board on hidden gems."
              title="Hidden gems"
            />
            <QuickShortcut
              accent="amber"
              icon={<Trophy color={theme.colors.amber} size={20} />}
              onPress={() => router.push("/leaderboards")}
              subtitle="Check your rank and progress."
              title="Leaderboards"
            />
          </View>
        </View>
      </ScrollView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    padding: theme.spacing.screen,
    paddingBottom: tabBarLayout.screenBottomPadding + 8,
  },
  paginationDot: {
    backgroundColor: "rgba(18,58,99,0.2)",
    borderRadius: 999,
    height: 7,
    width: 7,
  },
  paginationDotActive: {
    backgroundColor: theme.colors.accent,
    width: 20,
  },
  paginationRow: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginTop: 12,
  },
  filterSummaryLabel: {
    color: "rgba(245,250,255,0.72)",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  filterSummaryRow: {
    gap: 4,
    marginTop: 4,
  },
  filterSummaryValue: {
    color: "rgba(245,250,255,0.84)",
    fontSize: 13,
    lineHeight: 20,
  },
  hero: {
    borderRadius: 30,
    gap: 10,
    overflow: "hidden",
    padding: 22,
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.18,
    shadowRadius: 26,
  },
  heroBody: {
    color: "rgba(245,250,255,0.84)",
    fontSize: 14,
    lineHeight: 22,
  },
  heroEyebrow: {
    color: "rgba(245,250,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: theme.colors.textOnDark,
    fontFamily: "SpaceMono",
    fontSize: 28,
    lineHeight: 34,
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 120,
    padding: 20,
  },
  loadingText: {
    color: theme.colors.muted,
    fontSize: 14,
  },
  locationStatusBody: {
    color: "rgba(245,250,255,0.88)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  radiusChip: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  radiusChipActive: {
    backgroundColor: theme.colors.rewardSoft,
  },
  radiusChipText: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    fontWeight: "800",
  },
  radiusChipTextActive: {
    color: theme.colors.rewardText,
  },
  radiusRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  railCard: {
    marginBottom: 0,
  },
  railContent: {
    paddingLeft: 2,
    paddingRight: 4,
  },
  railItem: {
    paddingBottom: 4,
  },
  statusPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillDemo: {
    backgroundColor: "rgba(255,240,217,0.18)",
    borderColor: "rgba(255,240,217,0.28)",
  },
  statusPillGood: {
    backgroundColor: "rgba(139,195,74,0.16)",
    borderColor: "rgba(139,195,74,0.24)",
  },
  statusPillNeutral: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.16)",
  },
  statusPillText: {
    color: theme.colors.textOnDark,
    fontSize: 12,
    fontWeight: "800",
  },
  statusPillWarning: {
    backgroundColor: "rgba(242,138,26,0.16)",
    borderColor: "rgba(242,138,26,0.22)",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 2,
  },
  shortcutsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  shortcutCard: {
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    gap: 10,
    minHeight: 132,
    padding: 16,
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  shortcutIconBubble: {
    alignItems: "center",
    borderRadius: 16,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  shortcutShell: {
    flexBasis: "48%",
    flexGrow: 1,
    minWidth: 150,
  },
  shortcutSubtitle: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  shortcutTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 16,
    lineHeight: 21,
  },
});
