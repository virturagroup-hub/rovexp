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
import { mobileEnv } from "@/lib/env";

export function useQuestFeedQuery() {
  const authMode = useAppStore((state) => state.authMode);
  const preferredRadiusMiles = useAppStore((state) => state.preferredRadiusMiles);
  const lastKnownLocation = useAppStore((state) => state.lastKnownLocation);
  const questFilters = useAppStore((state) => state.questFilters);
  const userId = useAppStore((state) => state.userId);
  const liveLocation =
    authMode === "demo"
      ? null
      : lastKnownLocation?.verified
        ? lastKnownLocation
        : null;
  const demoLocationKey =
    authMode === "demo"
      ? {
          latitude: mobileEnv.defaultLatitude,
          longitude: mobileEnv.defaultLongitude,
          stateCode: mobileEnv.defaultStateCode,
        }
      : null;

  return useQuery({
    queryKey: [
      "quest-feed",
      authMode,
      userId,
      preferredRadiusMiles,
      demoLocationKey?.latitude ?? liveLocation?.latitude,
      demoLocationKey?.longitude ?? liveLocation?.longitude,
      demoLocationKey?.stateCode ?? liveLocation?.stateCode,
      questFilters,
    ],
    queryFn: () =>
      getQuestFeed({
        filters: questFilters,
        demoMode: authMode === "demo",
        location: liveLocation,
        radiusMiles: preferredRadiusMiles,
      }),
  });
}

export function useQuestProgressQuery() {
  const authMode = useAppStore((state) => state.authMode);
  const userId = useAppStore((state) => state.userId);

  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["quest-progress", authMode, userId],
    queryFn: () => getQuestProgressSnapshot({ demoMode: authMode === "demo" }),
  });
}

export function useProfileSummaryQuery() {
  const authMode = useAppStore((state) => state.authMode);
  const userId = useAppStore((state) => state.userId);

  return useQuery({
    enabled: Boolean(userId),
    queryKey: ["profile-summary", authMode, userId],
    queryFn: () =>
      getProfileSummary({
        demoMode: authMode === "demo",
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
  const authMode = useAppStore((state) => state.authMode);
  return useQuery({
    enabled: Boolean(questId),
    queryKey: ["quest-reviews", authMode, questId],
    queryFn: () =>
      getQuestReviews(questId ?? "", {
        demoMode: authMode === "demo",
      }),
  });
}

export function useQuestCategoriesQuery() {
  const authMode = useAppStore((state) => state.authMode);
  return useQuery({
    queryKey: ["quest-categories", authMode],
    queryFn: () => getQuestCategories({ demoMode: authMode === "demo" }),
  });
}

export function useLeaderboardQuery(stateId: string | null) {
  const authMode = useAppStore((state) => state.authMode);
  return useQuery({
    queryKey: ["leaderboards", authMode, stateId],
    queryFn: () =>
      getLeaderboardSnapshot({
        demoMode: authMode === "demo",
        stateId,
      }),
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
  const authMode = useAppStore((state) => state.authMode);
  const userId = useAppStore((state) => state.userId);
  const locationPermission = useAppStore((state) => state.locationPermission);
  const cameraPermission = useAppStore((state) => state.cameraPermission);
  const syncProfileSummary = useAppStore((state) => state.syncProfileSummary);

  const profileMutation = useMutation({
    mutationFn: (values: ProfileFormInput) => {
      if (!userId) {
        throw new Error("You need to be signed in to update your profile.");
      }

      return updateProfile({ demoMode: authMode === "demo", userId, values });
    },
    onSuccess: async () => {
      if (!userId) {
        return;
      }

      const summary = await getProfileSummary({ userId });
      syncProfileSummary(summary);
      await queryClient.invalidateQueries({ queryKey: ["profile-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["leaderboards"] });
    },
  });

  const settingsMutation = useMutation({
    mutationFn: (values: Omit<SettingsFormInput, "allow_camera" | "allow_location">) => {
      if (!userId) {
        throw new Error("You need to be signed in to update settings.");
      }

      return saveUserSettings({
        demoMode: authMode === "demo",
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
      await queryClient.invalidateQueries({ queryKey: ["profile-summary"] });
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
  const authMode = useAppStore((state) => state.authMode);
  const acceptQuestInStore = useAppStore((state) => state.acceptQuest);
  const checkInQuestInStore = useAppStore((state) => state.checkInQuest);
  const completeQuestInStore = useAppStore((state) => state.completeQuest);
  const recordReview = useAppStore((state) => state.recordReview);

  const acceptMutation = useMutation({
    mutationFn: (quest: QuestFeedItem) =>
      acceptQuest({ demoMode: authMode === "demo", questId: quest.id }),
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
    }) =>
      checkInQuest({
        ...params,
        demoMode: authMode === "demo",
      }),
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
    mutationFn: (params: { quest: QuestFeedItem }) =>
      completeQuest({ ...params, demoMode: authMode === "demo" }),
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
        queryClient.invalidateQueries({ queryKey: ["quest-reviews"] }),
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
  const authMode = useAppStore((state) => state.authMode);

  const hideSponsoredMutation = useMutation({
    mutationFn: (questId: string) =>
      hideSponsoredQuest({ demoMode: authMode === "demo", questId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quest-feed"] });
    },
  });

  const resetHiddenSponsoredMutation = useMutation({
    mutationFn: () => resetHiddenSponsoredQuests({ demoMode: authMode === "demo" }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["quest-feed"] });
    },
  });

  return {
    hideSponsoredMutation,
    resetHiddenSponsoredMutation,
  };
}
