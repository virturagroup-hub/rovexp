import * as Haptics from "expo-haptics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ProfileFormInput,
  ReviewFormInput,
  SettingsFormInput,
} from "@rovexp/types";

import { getLeaderboardSnapshot } from "@/services/leaderboard";
import {
  acceptQuest,
  checkInQuest,
  completeQuest,
  hideSponsoredQuest,
  getQuestFeed,
  getQuestCategories,
  getQuestProgressSnapshot,
  resetHiddenSponsoredQuests,
  type QuestFeedItem,
} from "@/services/quests";
import {
  getProfileSummary,
  listStates,
  saveUserSettings,
  updateProfile,
} from "@/services/profile";
import {
  acceptFriendship,
  deleteFriendship,
  getFriendActivityFeed,
  getFriendHub,
  requestFriendship,
  requestFriendshipByCode,
  searchFriends,
} from "@/services/friends";
import { getQuestReviews, submitReview } from "@/services/reviews";
import { useAppStore } from "@/store/app-store";

export function useQuestFeedQuery() {
  const preferredRadiusMiles = useAppStore((state) => state.preferredRadiusMiles);
  const lastKnownLocation = useAppStore((state) => state.lastKnownLocation);
  const questFilters = useAppStore((state) => state.questFilters);
  const userId = useAppStore((state) => state.userId);

  return useQuery({
    queryKey: [
      "quest-feed",
      userId,
      preferredRadiusMiles,
      lastKnownLocation?.latitude,
      lastKnownLocation?.longitude,
      lastKnownLocation?.stateCode,
      questFilters,
    ],
    queryFn: () =>
      getQuestFeed({
        filters: questFilters,
        location: lastKnownLocation,
        radiusMiles: preferredRadiusMiles,
      }),
  });
}

export function useQuestProgressQuery() {
  const userId = useAppStore((state) => state.userId);

  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["quest-progress", userId],
    queryFn: getQuestProgressSnapshot,
  });
}

export function useProfileSummaryQuery() {
  const userId = useAppStore((state) => state.userId);

  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["profile-summary", userId],
    queryFn: () =>
      getProfileSummary({
        userId,
      }),
  });
}

export function useStatesQuery() {
  return useQuery({
    queryKey: ["states"],
    queryFn: listStates,
  });
}

export function useQuestReviewsQuery(questId: string | null) {
  return useQuery({
    enabled: Boolean(questId),
    queryKey: ["quest-reviews", questId],
    queryFn: () => getQuestReviews(questId ?? ""),
  });
}

export function useQuestCategoriesQuery() {
  return useQuery({
    queryKey: ["quest-categories"],
    queryFn: getQuestCategories,
  });
}

export function useLeaderboardQuery(stateId: string | null) {
  return useQuery({
    queryKey: ["leaderboards", stateId],
    queryFn: () => getLeaderboardSnapshot({ stateId }),
  });
}

export function useFriendHubQuery() {
  const userId = useAppStore((state) => state.userId);

  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["friend-hub", userId],
    queryFn: getFriendHub,
  });
}

export function useFriendSearchQuery(searchTerm: string) {
  const userId = useAppStore((state) => state.userId);
  const normalized = searchTerm.trim();

  return useQuery({
    enabled: Boolean(userId) && normalized.length >= 2,
    queryKey: ["friend-search", userId, normalized],
    queryFn: () => searchFriends(normalized),
  });
}

export function useFriendActivityQuery() {
  const userId = useAppStore((state) => state.userId);

  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["friend-activity", userId],
    queryFn: getFriendActivityFeed,
  });
}

export function useProfileMutations() {
  const queryClient = useQueryClient();
  const userId = useAppStore((state) => state.userId);
  const locationPermission = useAppStore((state) => state.locationPermission);
  const cameraPermission = useAppStore((state) => state.cameraPermission);
  const syncProfileSummary = useAppStore((state) => state.syncProfileSummary);

  const profileMutation = useMutation({
    mutationFn: (values: ProfileFormInput) => {
      if (!userId) {
        throw new Error("You need to be signed in to update your profile.");
      }

      return updateProfile({ userId, values });
    },
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      const summary = await getProfileSummary({ userId });
      syncProfileSummary(summary);
      await queryClient.invalidateQueries({ queryKey: ["profile-summary", userId] });
      await queryClient.invalidateQueries({ queryKey: ["leaderboards"] });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (values: Omit<SettingsFormInput, "allow_camera" | "allow_location">) => {
      if (!userId) {
        throw new Error("You need to be signed in to update settings.");
      }

      return saveUserSettings({
        userId,
        values: {
          ...values,
          allow_camera: cameraPermission !== "denied",
          allow_location: locationPermission !== "denied",
        },
      });
    },
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      const summary = await getProfileSummary({ userId });
      syncProfileSummary(summary);
      await queryClient.invalidateQueries({ queryKey: ["profile-summary", userId] });
      await queryClient.invalidateQueries({ queryKey: ["quest-feed"] });
      await queryClient.invalidateQueries({ queryKey: ["leaderboards"] });
    },
  });

  return {
    profileMutation,
    settingsMutation,
  };
}

export function useQuestFlowMutations() {
  const queryClient = useQueryClient();
  const acceptQuestInStore = useAppStore((state) => state.acceptQuest);
  const checkInQuestInStore = useAppStore((state) => state.checkInQuest);
  const completeQuestInStore = useAppStore((state) => state.completeQuest);
  const recordReview = useAppStore((state) => state.recordReview);

  const acceptMutation = useMutation({
    mutationFn: (quest: QuestFeedItem) => acceptQuest({ questId: quest.id }),
    onSuccess: async (result, quest) => {
      acceptQuestInStore({
        acceptedAt: result.acceptedAt,
        acceptanceId: result.acceptanceId,
        questId: quest.id,
      });
      await queryClient.invalidateQueries({ queryKey: ["quest-progress"] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (params: {
      allowMockVerification: boolean;
      currentLocation: { latitude: number; longitude: number } | null;
      quest: QuestFeedItem;
    }) => checkInQuest(params),
    onSuccess: async (result, variables) => {
      checkInQuestInStore({
        checkedInAt: result.checkedInAt,
        checkinId: result.checkinId,
        questId: variables.quest.id,
      });
      await queryClient.invalidateQueries({ queryKey: ["quest-progress"] });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const completeMutation = useMutation({
    mutationFn: (params: { quest: QuestFeedItem }) => completeQuest(params),
    onSuccess: async (result, variables) => {
      completeQuestInStore({
        completedAt: result.completedAt,
        completionId: result.completionId,
        questId: variables.quest.id,
        xpAwarded: result.xpAwarded,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-summary"] }),
        queryClient.invalidateQueries({ queryKey: ["quest-progress"] }),
      ]);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
  });

  const reviewMutation = useMutation({
    mutationFn: (params: ReviewFormInput & {
      completionId: string;
      questId: string;
    }) =>
      submitReview({
        comment: params.comment,
        completionId: params.completionId,
        photoUri: params.photo_uri,
        questId: params.questId,
        rating: params.rating,
      }),
    onSuccess: async (result, variables) => {
      recordReview({
        questId: variables.questId,
        reviewId: result.reviewId,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
        queryClient.invalidateQueries({ queryKey: ["profile-summary"] }),
        queryClient.invalidateQueries({
          queryKey: ["quest-reviews", variables.questId],
        }),
        queryClient.invalidateQueries({ queryKey: ["quest-progress"] }),
      ]);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  return {
    acceptMutation,
    checkInMutation,
    completeMutation,
    reviewMutation,
  };
}

export function useFriendMutations() {
  const queryClient = useQueryClient();

  const requestMutation = useMutation({
    mutationFn: (targetUserId: string) => requestFriendship(targetUserId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friend-hub"] }),
        queryClient.invalidateQueries({ queryKey: ["friend-search"] }),
        queryClient.invalidateQueries({ queryKey: ["friend-activity"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
      ]);
    },
  });

  const requestByCodeMutation = useMutation({
    mutationFn: (friendCode: string) => requestFriendshipByCode(friendCode),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friend-hub"] }),
        queryClient.invalidateQueries({ queryKey: ["friend-search"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
      ]);
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (friendshipId: string) => acceptFriendship(friendshipId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friend-hub"] }),
        queryClient.invalidateQueries({ queryKey: ["friend-search"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
      ]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (friendshipId: string) => deleteFriendship(friendshipId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["friend-hub"] }),
        queryClient.invalidateQueries({ queryKey: ["friend-search"] }),
        queryClient.invalidateQueries({ queryKey: ["friend-activity"] }),
        queryClient.invalidateQueries({ queryKey: ["leaderboards"] }),
      ]);
    },
  });

  return {
    acceptMutation,
    deleteMutation,
    requestMutation,
    requestByCodeMutation,
  };
}

export function useQuestVisibilityMutations() {
  const queryClient = useQueryClient();
  const userId = useAppStore((state) => state.userId);

  const hideSponsoredMutation = useMutation({
    mutationFn: (questId: string) => hideSponsoredQuest({ questId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quest-feed", userId] });
      await queryClient.invalidateQueries({ queryKey: ["quest-feed"] });
    },
  });

  const resetHiddenSponsoredMutation = useMutation({
    mutationFn: resetHiddenSponsoredQuests,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quest-feed", userId] });
      await queryClient.invalidateQueries({ queryKey: ["quest-feed"] });
    },
  });

  return {
    hideSponsoredMutation,
    resetHiddenSponsoredMutation,
  };
}
