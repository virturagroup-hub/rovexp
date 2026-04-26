import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Star } from "lucide-react-native";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { QuestCard } from "@/components/quest-card";
import { EmptyStateCard, ScreenHeader, ScreenView, SectionHeader } from "@/components/ui";
import { theme } from "@/constants/theme";
import { useQuestFlowMutations, useQuestReviewsQuery } from "@/hooks/use-rovexp-data";
import { mobileEnv } from "@/lib/env";
import { distanceBetweenMeters, metersToMiles } from "@/lib/geo";
import { getQuestById, type QuestFeedItem } from "@/services/quests";
import { useAppStore } from "@/store/app-store";

export default function QuestDetailScreen() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const questProgress = useAppStore((state) =>
    questId ? state.questProgress[questId] : undefined,
  );
  const locationPermission = useAppStore((state) => state.locationPermission);
  const lastKnownLocation = useAppStore((state) => state.lastKnownLocation);
  const { data: quest } = useQuery({
    enabled: Boolean(questId),
    queryKey: ["quest", questId],
    queryFn: () => getQuestById(questId ?? ""),
  });
  const { data: reviews } = useQuestReviewsQuery(questId ?? null);
  const { acceptMutation, checkInMutation, completeMutation } =
    useQuestFlowMutations();

  const handleAccept = async (selectedQuest: QuestFeedItem) => {
    try {
      await acceptMutation.mutateAsync(selectedQuest);
    } catch (error) {
      Alert.alert(
        "Could not accept quest",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleCheckIn = async (selectedQuest: QuestFeedItem) => {
    if (!questProgress?.accepted_id) {
      Alert.alert("Accept required", "Accept the quest before checking in.");
      return;
    }

    try {
      await checkInMutation.mutateAsync({
        allowMockVerification:
          locationPermission !== "granted" || !lastKnownLocation?.verified,
        currentLocation: lastKnownLocation,
        quest: selectedQuest,
      });
    } catch (error) {
      Alert.alert(
        "Check-in failed",
        error instanceof Error ? error.message : "Please move closer and try again.",
      );
    }
  };

  const handleComplete = async (selectedQuest: QuestFeedItem) => {
    if (!questProgress?.checkin_id) {
      Alert.alert(
        "Check-in required",
        "You need to check in before completing this quest.",
      );
      return;
    }

    try {
      await completeMutation.mutateAsync({ quest: selectedQuest });
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
          eyebrow="Quest detail"
          rightSlot={
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={theme.colors.textOnDark} size={18} />
            </Pressable>
          }
          subtitle="Use this detail view when you want the full quest context plus recent explorer reviews."
          title={quest?.title ?? "Quest detail"}
        />

        {quest ? (
          <QuestCard
            currentLocation={lastKnownLocation}
            defaultExpanded
            isBusy={
              acceptMutation.isPending ||
              checkInMutation.isPending ||
              completeMutation.isPending
            }
            locationPermission={locationPermission}
            onAccept={handleAccept}
            onCheckIn={handleCheckIn}
            onComplete={handleComplete}
            progress={questProgress}
            quest={{
              ...quest,
              distanceMeters: distanceBetweenMeters(
                lastKnownLocation ?? {
                  latitude: mobileEnv.defaultLatitude,
                  longitude: mobileEnv.defaultLongitude,
                },
                quest,
              ),
              distanceMiles: metersToMiles(
                distanceBetweenMeters(
                  lastKnownLocation ?? {
                    latitude: mobileEnv.defaultLatitude,
                    longitude: mobileEnv.defaultLongitude,
                  },
                  quest,
                ),
              ),
            }}
          />
        ) : (
          <EmptyStateCard
            title="Quest not found"
            subtitle="The quest may be unavailable or filtered out of the current feed."
          />
        )}

        <View>
          <SectionHeader
            eyebrow="Explorer reviews"
            subtitle="Visible reviews and uploaded photos help the stop feel lived-in without opening the full social system yet."
            title="Recent impressions"
          />
              {reviews?.length ? (
            reviews.map((review) => (
              <View key={review.review_id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View>
                    <Text style={styles.reviewerName}>@{review.username}</Text>
                    <Text style={styles.reviewerMeta}>
                      {review.display_name ? "Friend-visible profile" : "Public review"}
                    </Text>
                  </View>
                  <View style={styles.ratingRow}>
                    <Star color={theme.colors.amber} fill={theme.colors.amber} size={14} />
                    <Text style={styles.ratingText}>{review.rating}</Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{review.comment}</Text>
                {review.photo_urls[0] ? (
                  <Image source={{ uri: review.photo_urls[0] }} style={styles.reviewImage} />
                ) : null}
              </View>
            ))
          ) : (
            <EmptyStateCard
              title="No visible reviews yet"
              subtitle="Complete the quest and leave the first post-visit note to seed this stop."
            />
          )}
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
    paddingBottom: 34,
  },
  ratingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  ratingText: {
    color: theme.colors.deep,
    fontSize: 13,
    fontWeight: "700",
  },
  reviewCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  reviewComment: {
    color: theme.colors.ink,
    fontSize: 14,
    lineHeight: 22,
  },
  reviewHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  reviewImage: {
    borderRadius: 20,
    height: 180,
    width: "100%",
  },
  reviewerMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    marginTop: 2,
  },
  reviewerName: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 15,
  },
});
