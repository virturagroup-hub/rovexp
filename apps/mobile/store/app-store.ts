import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  demoProfileSummary,
  demoQuestProgress,
  type ProfileSummary,
  type QuestFilterPreferences,
  type QuestProgress,
} from "@rovexp/types";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type PermissionState = "unknown" | "granted" | "denied";

export interface LocationSnapshot {
  areaLabel: string;
  latitude: number;
  longitude: number;
  stateCode: string;
  verified: boolean;
}

interface HydratedAccountPayload {
  email: string | null;
  mode: "demo" | "supabase";
  profileSummary: ProfileSummary;
  questProgress: Record<string, QuestProgress>;
}

interface AppState {
  authBootstrapped: boolean;
  authMode: "demo" | "supabase" | null;
  cameraPermission: PermissionState;
  displayName: string;
  email: string | null;
  hasCompletedPermissionFlow: boolean;
  hydrated: boolean;
  lastKnownLocation: LocationSnapshot | null;
  locationPermission: PermissionState;
  notificationsEnabled: boolean;
  preferredRadiusMiles: number;
  questFilters: QuestFilterPreferences;
  questProgress: Record<string, QuestProgress>;
  userId: string | null;
  username: string;
  xpTotal: number;
  acceptQuest: (payload: {
    acceptedAt: string;
    acceptanceId: string;
    questId: string;
  }) => void;
  checkInQuest: (payload: {
    checkedInAt: string;
    checkinId: string;
    questId: string;
  }) => void;
  completePermissionFlow: () => void;
  completeQuest: (payload: {
    completedAt: string;
    completionId: string;
    questId: string;
    xpAwarded: number;
  }) => void;
  hydrateAccount: (payload: HydratedAccountPayload) => void;
  recordReview: (payload: { questId: string; reviewId: string }) => void;
  resetQuestFilters: () => void;
  setAuthBootstrapped: (value: boolean) => void;
  setAuthSession: (payload: {
    authMode: "supabase";
    email: string | null;
    userId: string;
  } | null) => void;
  setCameraPermission: (status: PermissionState) => void;
  setHydrated: (value: boolean) => void;
  setLocationPermission: (status: PermissionState) => void;
  setPreferredRadius: (miles: number) => void;
  setQuestFilters: (
    filters:
      | QuestFilterPreferences
      | ((current: QuestFilterPreferences) => QuestFilterPreferences),
  ) => void;
  setStoredLocation: (location: LocationSnapshot | null) => void;
  signInDemo: () => void;
  signOut: () => void;
  syncProfileSummary: (summary: ProfileSummary) => void;
  syncQuestProgress: (progress: Record<string, QuestProgress>) => void;
  toggleNotifications: (value: boolean) => void;
}

const defaultQuestFilters = (): QuestFilterPreferences => ({
  category_slugs: [],
  discovery_types: [],
  rarities: [],
  sponsor_filter: "all",
});

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value));

function buildDefaultQuestProgress(): Record<string, QuestProgress> {
  return {};
}

function buildInitialState() {
  return {
    authBootstrapped: false,
    authMode: null as AppState["authMode"],
    cameraPermission: "unknown" as PermissionState,
    displayName: "Explorer",
    email: null as string | null,
    hasCompletedPermissionFlow: false,
    hydrated: false,
    lastKnownLocation: null as LocationSnapshot | null,
    locationPermission: "unknown" as PermissionState,
    notificationsEnabled: true,
    preferredRadiusMiles: 8,
    questFilters: defaultQuestFilters(),
    questProgress: buildDefaultQuestProgress(),
    userId: null as string | null,
    username: "explorer",
    xpTotal: 0,
  };
}

function getExistingProgress(
  state: Pick<AppState, "questProgress">,
  questId: string,
): QuestProgress {
  return (
    state.questProgress[questId] ?? {
      accepted_at: null,
      accepted_id: null,
      checked_in_at: null,
      checkin_id: null,
      completed_at: null,
      completion_id: null,
      quest_id: questId,
      review_id: null,
      status: "available",
    }
  );
}

function applyProfileSummaryState(summary: ProfileSummary) {
  return {
    displayName: summary.profile.display_name,
    notificationsEnabled: summary.settings.notifications_enabled,
    preferredRadiusMiles: summary.settings.preferred_radius_miles,
    questFilters: {
      category_slugs: clone(summary.settings.category_preferences),
      discovery_types: clone(summary.settings.discovery_preferences),
      rarities: clone(summary.settings.rarity_preferences),
      sponsor_filter: summary.settings.sponsor_filter,
    },
    username: summary.profile.username,
    userId: summary.profile.id,
    xpTotal: summary.overall_stats.xp_total,
  };
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      ...buildInitialState(),
      acceptQuest: ({ acceptedAt, acceptanceId, questId }) =>
        set((state) => ({
          questProgress: {
            ...state.questProgress,
            [questId]: {
              accepted_at: acceptedAt,
              accepted_id: acceptanceId,
              checked_in_at: null,
              checkin_id: null,
              completed_at: null,
              completion_id: null,
              quest_id: questId,
              review_id: null,
              status: "accepted",
            },
          },
        })),
      checkInQuest: ({ checkedInAt, checkinId, questId }) =>
        set((state) => ({
          questProgress: {
            ...state.questProgress,
            [questId]: {
              ...getExistingProgress(state, questId),
              checked_in_at: checkedInAt,
              checkin_id: checkinId,
              status: "checked_in",
            },
          },
        })),
      completePermissionFlow: () => set({ hasCompletedPermissionFlow: true }),
      completeQuest: ({ completedAt, completionId, questId, xpAwarded }) =>
        set((state) => ({
          questProgress: {
            ...state.questProgress,
            [questId]: {
              ...getExistingProgress(state, questId),
              completed_at: completedAt,
              completion_id: completionId,
              status: "completed",
            },
          },
          xpTotal: state.xpTotal + xpAwarded,
        })),
      hydrateAccount: ({ email, mode, profileSummary, questProgress }) =>
        set({
          ...applyProfileSummaryState(profileSummary),
          authMode: mode,
          email,
          questProgress,
        }),
      recordReview: ({ questId, reviewId }) =>
        set((state) => ({
          questProgress: {
            ...state.questProgress,
            [questId]: {
              ...getExistingProgress(state, questId),
              review_id: reviewId,
              status: "reviewed",
            },
          },
        })),
      resetQuestFilters: () =>
        set({
          questFilters: defaultQuestFilters(),
        }),
      setAuthBootstrapped: (value) => set({ authBootstrapped: value }),
      setAuthSession: (payload) =>
        set((state) => {
          if (!payload) {
            const next = buildInitialState();

            return {
              ...next,
              authBootstrapped: true,
              cameraPermission: state.cameraPermission,
              hasCompletedPermissionFlow: state.hasCompletedPermissionFlow,
              hydrated: true,
              lastKnownLocation: state.lastKnownLocation,
              locationPermission: state.locationPermission,
              notificationsEnabled: state.notificationsEnabled,
            };
          }

          return {
            authMode: payload.authMode,
            email: payload.email,
            userId: payload.userId,
          };
        }),
      setCameraPermission: (status) => set({ cameraPermission: status }),
      setHydrated: (value) => set({ hydrated: value }),
      setLocationPermission: (status) => set({ locationPermission: status }),
      setPreferredRadius: (miles) => set({ preferredRadiusMiles: miles }),
      setQuestFilters: (filters) =>
        set((state) => ({
          questFilters:
            typeof filters === "function" ? filters(state.questFilters) : filters,
        })),
      setStoredLocation: (location) => set({ lastKnownLocation: location }),
      signInDemo: () =>
        set({
          ...applyProfileSummaryState(demoProfileSummary),
          authBootstrapped: true,
          authMode: "demo",
          email: "demo@rovexp.local",
          questProgress: clone(demoQuestProgress),
        }),
      signOut: () => {
        const next = buildInitialState();

        set((state) => ({
          ...next,
          authBootstrapped: true,
          cameraPermission: state.cameraPermission,
          hydrated: true,
          lastKnownLocation: state.lastKnownLocation,
          locationPermission: state.locationPermission,
        }));
      },
      syncProfileSummary: (summary) =>
        set({
          ...applyProfileSummaryState(summary),
        }),
      syncQuestProgress: (progress) =>
        set({
          questProgress: progress,
        }),
      toggleNotifications: (value) => set({ notificationsEnabled: value }),
    }),
    {
      name: "rovexp-mobile-store",
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
      },
      partialize: (state) => ({
        authMode: state.authMode,
        cameraPermission: state.cameraPermission,
        displayName: state.displayName,
        email: state.email,
        hasCompletedPermissionFlow: state.hasCompletedPermissionFlow,
        lastKnownLocation: state.lastKnownLocation,
        locationPermission: state.locationPermission,
        notificationsEnabled: state.notificationsEnabled,
        preferredRadiusMiles: state.preferredRadiusMiles,
        questFilters: state.questFilters,
        questProgress: state.questProgress,
        userId: state.userId,
        username: state.username,
        xpTotal: state.xpTotal,
      }),
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
