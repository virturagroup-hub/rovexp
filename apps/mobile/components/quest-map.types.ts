import type { QuestProgress } from "@rovexp/types";

import type { QuestFeedItem } from "@/services/quests";
import type { PermissionState } from "@/store/app-store";

export interface QuestMapSurfaceProps {
  areaLabel: string;
  centerLatitude: number;
  centerLongitude: number;
  isLoading: boolean;
  locationPermission: PermissionState;
  nearbyQuests: QuestFeedItem[];
  preferredRadiusMiles: number;
  questProgress: Record<string, QuestProgress>;
  selectedQuest: QuestFeedItem | null;
  setSelectedQuestId: (questId: string | null) => void;
  sponsoredQuests: QuestFeedItem[];
  usingFallbackLocation: boolean;
  visibleQuests: QuestFeedItem[];
}
