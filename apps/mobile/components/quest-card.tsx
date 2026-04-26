import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import type { QuestProgress } from "@rovexp/types";
import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  FadeInDown,
  FadeOut,
  LinearTransition,
} from "react-native-reanimated";

import { rarityColors, theme } from "@/constants/theme";
import { formatDistanceMiles } from "@/lib/geo";
import type { QuestFeedItem } from "@/services/quests";
import type { LocationSnapshot, PermissionState } from "@/store/app-store";

import { ActionButton, CategoryPill, RarityPill } from "./ui";

interface QuestCardProps {
  currentLocation: LocationSnapshot | null;
  defaultExpanded?: boolean;
  isBusy?: boolean;
  locationPermission: PermissionState;
  onAccept: (quest: QuestFeedItem) => Promise<void>;
  onCheckIn: (quest: QuestFeedItem) => Promise<{ mockVerified: boolean } | void>;
  onComplete: (quest: QuestFeedItem) => Promise<void>;
  onHideQuest?: (quest: QuestFeedItem) => Promise<void> | void;
  progress?: QuestProgress;
  compact?: boolean;
  quest: QuestFeedItem;
  style?: StyleProp<ViewStyle>;
}

function getQuestStatus(progress?: QuestProgress) {
  return progress?.status ?? "available";
}

export function QuestCard({
  currentLocation,
  defaultExpanded = false,
  compact = false,
  isBusy,
  locationPermission,
  onAccept,
  onCheckIn,
  onComplete,
  onHideQuest,
  progress,
  quest,
  style,
}: QuestCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const status = getQuestStatus(progress);
  const palette = rarityColors[quest.rarity];
  const sponsored = quest.is_sponsored;
  const distanceLabel = formatDistanceMiles(quest.distanceMiles);
  const showHeroImage = Boolean(quest.image_url) && (!compact || expanded);

  const handlePrimaryAction = async () => {
    if (status === "available") {
      await onAccept(quest);
      return;
    }

    if (status === "accepted") {
      await onCheckIn(quest);
      return;
    }

    if (status === "checked_in") {
      await onComplete(quest);
      return;
    }

    if (status === "completed") {
      router.push({
        pathname: "/review/[questId]",
        params: { questId: quest.id },
      });
    }
  };

  const handleHideQuest = async () => {
    if (!onHideQuest) {
      return;
    }

    await onHideQuest(quest);
  };

  const primaryLabel =
    status === "available"
      ? "Accept quest"
      : status === "accepted"
        ? "Check in"
        : status === "checked_in"
          ? "Complete quest"
          : status === "completed"
            ? "Leave review"
            : "Review submitted";

  const helperText =
    status === "accepted"
      ? locationPermission === "granted" && currentLocation
        ? `You need to be within ${quest.radius_meters}m to check in.`
        : "Location is unavailable, so demo verification can stand in for Phase 1."
      : status === "checked_in"
        ? "Check-in is locked. Confirm completion to bank the XP."
        : status === "completed"
          ? "Review is now unlocked for this quest."
          : sponsored
            ? "Sponsored quests are kept visually distinct but flow through the same progression rules."
            : "Accept the quest to unlock on-site check-in and the post-completion review.";

  return (
    <Animated.View layout={LinearTransition.springify().damping(18)} style={style}>
      <View
        style={[
          styles.card,
          compact && styles.compactCard,
          { borderColor: palette.border },
        ]}
      >
        <LinearGradient
          colors={
            sponsored
              ? [theme.colors.deep, theme.colors.deepBlue, theme.colors.orange]
              : [palette.background[0], theme.colors.white, palette.background[1]]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cardGradient, compact && styles.compactCardGradient]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setExpanded((current) => !current)}
          >
            {showHeroImage ? (
              <View style={styles.cardImageWrap}>
                <Image
                  source={{ uri: quest.image_url as string }}
                  style={[styles.cardImage, compact && styles.cardImageCompact]}
                />
              </View>
            ) : null}

            <View style={styles.cardHeader}>
              {quest.is_sponsored && quest.sponsor_business ? (
                <View style={styles.sponsorIdentityRow}>
                  {quest.sponsor_business.logo_url ? (
                    <Image
                      source={{ uri: quest.sponsor_business.logo_url }}
                      style={styles.sponsorLogo}
                    />
                  ) : (
                    <View style={styles.sponsorLogoFallback}>
                      <Text style={styles.sponsorLogoFallbackText}>
                        {quest.sponsor_business.name.slice(0, 1).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.sponsorIdentityText}>
                    Presented by {quest.sponsor_business.name}
                  </Text>
                </View>
              ) : null}
              <View style={styles.cardPills}>
                <CategoryPill label={quest.category.name} />
                <RarityPill rarity={quest.rarity} />
                {quest.is_featured ? (
                  <View style={styles.featuredPill}>
                    <Text style={styles.featuredPillText}>Featured</Text>
                  </View>
                ) : null}
                {quest.is_sponsored ? (
                  <View style={styles.sponsorPill}>
                    <Text style={styles.sponsorPillText}>Sponsored</Text>
                  </View>
                ) : null}
              </View>
              <Text
                style={[
                  styles.questTitle,
                  compact && styles.questTitleCompact,
                  sponsored && { color: theme.colors.white },
                ]}
              >
                {quest.title}
              </Text>
            </View>

            <View style={styles.metaRow}>
              <View style={styles.metaChip}>
                <Text style={styles.metaLabel}>Distance</Text>
                <Text style={styles.metaValue}>{distanceLabel}</Text>
              </View>
              <View style={styles.metaChip}>
                <Text style={styles.metaLabel}>Reward</Text>
                <Text style={styles.metaValue}>{quest.xp_reward} XP</Text>
              </View>
              {!compact ? (
                <View style={styles.metaChip}>
                  <Text style={styles.metaLabel}>Radius</Text>
                  <Text style={styles.metaValue}>{quest.radius_meters}m</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.expandHint}>
              {expanded ? "Tap to collapse" : "Tap to preview"}
            </Text>
          </Pressable>

          {expanded ? (
            <Animated.View entering={FadeInDown.duration(220)} exiting={FadeOut}>
              <View style={styles.detailsCard}>
                {compact && quest.image_url ? (
                  <View style={styles.expandedMediaWrap}>
                    <Image source={{ uri: quest.image_url }} style={styles.expandedMedia} />
                  </View>
                ) : null}
                <Text style={styles.description}>{quest.description}</Text>
                <Text style={styles.locationLine}>
                  {quest.state.name} · {quest.latitude.toFixed(4)},{" "}
                  {quest.longitude.toFixed(4)}
                </Text>
                {quest.sponsor_business?.name ? (
                  <Text style={styles.locationLine}>
                    Presented by {quest.sponsor_business.name}
                  </Text>
                ) : null}
                <Text style={styles.helperText}>{helperText}</Text>

                <View style={styles.actionRow}>
                  <ActionButton
                    disabled={isBusy || status === "reviewed"}
                    label={primaryLabel}
                    onPress={handlePrimaryAction}
                  />
                  {sponsored && onHideQuest ? (
                    <ActionButton
                      disabled={isBusy}
                      label="Hide quest"
                      onPress={() => void handleHideQuest()}
                      secondary
                    />
                  ) : null}
                  {status === "reviewed" ? (
                    <ActionButton
                      label="Open review"
                      onPress={() =>
                        router.push({
                          pathname: "/review/[questId]",
                          params: { questId: quest.id },
                        })
                      }
                      secondary
                    />
                  ) : null}
                </View>
              </View>
            </Animated.View>
          ) : null}
        </LinearGradient>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    gap: 10,
    marginTop: 16,
  },
  card: {
    borderRadius: 30,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
    width: "100%",
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.16,
    shadowRadius: 28,
  },
  cardGradient: {
    gap: 14,
    padding: 16,
  },
  cardHeader: {
    gap: 10,
  },
  cardImageWrap: {
    marginBottom: 14,
  },
  cardImage: {
    borderRadius: 22,
    height: 180,
    width: "100%",
  },
  cardImageCompact: {
    height: 150,
  },
  cardPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  compactCard: {
    borderRadius: 26,
    marginBottom: 0,
  },
  compactCardGradient: {
    padding: 14,
  },
  description: {
    color: theme.colors.ink,
    fontSize: 14,
    lineHeight: 24,
  },
  detailsCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderColor: theme.colors.divider,
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  expandedMedia: {
    borderRadius: 18,
    height: 170,
    width: "100%",
  },
  expandedMediaWrap: {
    marginBottom: 14,
  },
  featuredPill: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.rewardSoft,
    borderRadius: 999,
    borderColor: "rgba(245,184,46,0.25)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  featuredPillText: {
    color: theme.colors.rewardText,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  expandHint: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 10,
    textTransform: "uppercase",
  },
  helperText: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 8,
  },
  locationLine: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 8,
  },
  metaChip: {
    backgroundColor: "rgba(255,255,255,0.88)",
    borderColor: "rgba(18, 58, 99, 0.08)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minWidth: 84,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  metaLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metaValue: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 14,
    marginTop: 4,
  },
  questTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 22,
    lineHeight: 28,
  },
  questTitleCompact: {
    fontSize: 18,
    lineHeight: 24,
  },
  sponsorPill: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.sponsorSoft,
    borderRadius: 999,
    borderColor: "rgba(242,138,26,0.18)",
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sponsorPillText: {
    color: theme.colors.sponsorText,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sponsorIdentityRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  sponsorIdentityText: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  sponsorLogo: {
    borderRadius: 999,
    height: 22,
    width: 22,
  },
  sponsorLogoFallback: {
    alignItems: "center",
    backgroundColor: theme.colors.sponsorSoft,
    borderRadius: 999,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  sponsorLogoFallbackText: {
    color: theme.colors.sponsorText,
    fontSize: 11,
    fontWeight: "900",
  },
});
