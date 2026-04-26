import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { ChevronLeft, ImagePlus, Star } from "lucide-react-native";
import { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { ActionButton, EmptyStateCard, ScreenHeader, ScreenView } from "@/components/ui";
import { theme } from "@/constants/theme";
import { useQuestFlowMutations } from "@/hooks/use-rovexp-data";
import { getQuestById } from "@/services/quests";
import { useAppStore } from "@/store/app-store";

export default function ReviewQuestScreen() {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  const progress = useAppStore((state) =>
    questId ? state.questProgress[questId] : undefined,
  );
  const { reviewMutation } = useQuestFlowMutations();
  const { data: quest } = useQuery({
    enabled: Boolean(questId),
    queryKey: ["quest", questId],
    queryFn: () => getQuestById(questId ?? ""),
  });
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photoUri, setPhotoUri] = useState<string | undefined>();

  const completionId = progress?.completion_id ?? null;
  const isEligible = Boolean(completionId);

  const handlePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotoUri(result.assets[0]?.uri);
    }
  };

  const handleSubmit = async () => {
    if (!questId || !completionId) {
      return;
    }

    if (comment.trim().length < 10) {
      Alert.alert("Add a bit more detail", "Aim for at least 10 characters.");
      return;
    }

    try {
      const result = await reviewMutation.mutateAsync({
        comment: comment.trim(),
        completionId,
        photo_uri: photoUri,
        questId,
        rating,
      });

      if (result.photoUploaded) {
        Alert.alert("Review saved", "Your review and photo are now attached.");
      } else if (result.photoUploadError) {
        Alert.alert(
          "Review saved, photo needs another try",
          "The rating and comment were saved, but the optional photo upload did not finish cleanly.",
        );
      } else {
        Alert.alert("Review saved", "Your post-quest review is now attached.");
      }

      router.replace(`/quest/${questId}`);
    } catch (error) {
      Alert.alert(
        "Review could not be saved",
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
          eyebrow="Review"
          rightSlot={
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={theme.colors.textOnDark} size={18} />
            </Pressable>
          }
          subtitle="Reviews unlock only after accept, check-in, and completion."
          title={quest ? `Review ${quest.title}` : "Quest review"}
        />

        {!isEligible ? (
          <EmptyStateCard
            title="Complete the quest first"
            subtitle="This review screen stays gated until the quest has been accepted, checked in, and marked complete."
            actionLabel="Back to quests"
            onPress={() => router.replace("/(tabs)/quests")}
          />
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your rating</Text>
              <View style={styles.starRow}>
                {[1, 2, 3, 4, 5].map((value) => (
                  <Pressable
                    key={value}
                    onPress={() => setRating(value)}
                    style={styles.starButton}
                  >
                    <Star
                      color={value <= rating ? theme.colors.amber : "#b8c8d8"}
                      fill={value <= rating ? theme.colors.amber : "transparent"}
                      size={28}
                    />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Comment</Text>
              <TextInput
                multiline
                onChangeText={setComment}
                placeholder="What stood out about the stop, the route, or the sponsor moment?"
                placeholderTextColor={theme.colors.muted}
                style={styles.textArea}
                value={comment}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Optional photo</Text>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photoPreview} />
              ) : (
                <View style={styles.photoEmptyState}>
                  <ImagePlus color={theme.colors.accent} size={22} />
                  <Text style={styles.cardBody}>
                    Add a post-completion photo if this stop deserves a visual proof point.
                  </Text>
                </View>
              )}
              <ActionButton
                label={photoUri ? "Retake photo" : "Take photo"}
                onPress={handlePhoto}
                secondary
              />
            </View>

            <ActionButton
              disabled={reviewMutation.isPending}
              label={reviewMutation.isPending ? "Saving review..." : "Submit review"}
              onPress={handleSubmit}
            />
          </>
        )}
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
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  cardBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  cardTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 20,
  },
  container: {
    gap: 18,
    padding: theme.spacing.screen,
    paddingBottom: 34,
  },
  photoEmptyState: {
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderRadius: 22,
    gap: 10,
    minHeight: 120,
    justifyContent: "center",
    padding: 20,
  },
  photoPreview: {
    borderRadius: 22,
    height: 220,
    width: "100%",
  },
  starButton: {
    padding: 4,
  },
  starRow: {
    flexDirection: "row",
    gap: 8,
  },
  textArea: {
    backgroundColor: theme.colors.canvas,
    borderRadius: 22,
    color: theme.colors.ink,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 150,
    padding: 16,
    textAlignVertical: "top",
  },
});
