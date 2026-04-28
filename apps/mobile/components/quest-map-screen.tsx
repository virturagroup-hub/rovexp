import { useMemo, useState } from "react";

import { useQuestFeedQuery } from "@/hooks/use-rovexp-data";
import { mobileEnv } from "@/lib/env";
import { useAppStore } from "@/store/app-store";

import { QuestMapSurface } from "./quest-map-surface";

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

export default function QuestMapScreen() {
  const authMode = useAppStore((state) => state.authMode);
  const demoMode = authMode === "demo";
  const questProgress = useAppStore((state) => state.questProgress);
  const lastKnownLocation = useAppStore((state) => state.lastKnownLocation);
  const locationPermission = useAppStore((state) => state.locationPermission);
  const preferredRadiusMiles = useAppStore((state) => state.preferredRadiusMiles);
  const { data, isLoading } = useQuestFeedQuery();
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const liveLocation = demoMode
    ? null
    : lastKnownLocation?.verified
      ? lastKnownLocation
      : null;

  const allQuests = data?.all ?? [];
  const nearbyQuests = data?.nearby ?? [];
  const sponsoredQuests = data?.sponsored ?? [];
  const withinRadius = allQuests.filter(
    (quest) => quest.distanceMiles <= preferredRadiusMiles,
  );
  const visibleQuests = withinRadius.length ? withinRadius : allQuests.slice(0, 12);
  const selectionPool = useMemo(
    () => dedupeById([...visibleQuests, ...sponsoredQuests, ...nearbyQuests]),
    [nearbyQuests, sponsoredQuests, visibleQuests],
  );
  const selectedQuest = useMemo(
    () =>
      selectionPool.find((quest) => quest.id === selectedQuestId) ??
      selectionPool[0] ??
      null,
    [selectedQuestId, selectionPool],
  );
  const centerLatitude = demoMode
    ? mobileEnv.defaultLatitude
    : liveLocation?.latitude ?? mobileEnv.defaultLatitude;
  const centerLongitude = demoMode
    ? mobileEnv.defaultLongitude
    : liveLocation?.longitude ?? mobileEnv.defaultLongitude;
  const usingFallbackLocation =
    data?.usingFallbackLocation ?? (demoMode || !liveLocation);

  return (
    <QuestMapSurface
      areaLabel={
        data?.areaLabel ?? liveLocation?.areaLabel ?? mobileEnv.defaultAreaLabel
      }
      centerLatitude={centerLatitude}
      centerLongitude={centerLongitude}
      isLoading={isLoading}
      locationPermission={locationPermission}
      nearbyQuests={nearbyQuests}
      preferredRadiusMiles={preferredRadiusMiles}
      questProgress={questProgress}
      selectedQuest={selectedQuest}
      setSelectedQuestId={setSelectedQuestId}
      sponsoredQuests={sponsoredQuests}
      usingFallbackLocation={usingFallbackLocation}
      visibleQuests={visibleQuests}
    />
  );
}
