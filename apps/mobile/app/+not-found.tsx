import { router } from "expo-router";

import { EmptyStateCard, ScreenView } from "@/components/ui";

export default function NotFoundScreen() {
  return (
    <ScreenView>
      <EmptyStateCard
        title="This route wandered off"
        subtitle="The screen you were looking for is not part of Phase 1. Head back to the live quest flow."
        actionLabel="Return home"
        onPress={() => router.replace("/(tabs)")}
      />
    </ScreenView>
  );
}
