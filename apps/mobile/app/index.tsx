import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";

import { theme } from "@/constants/theme";
import { useAppStore } from "@/store/app-store";

export default function IndexRoute() {
  const hydrated = useAppStore((state) => state.hydrated);
  const authBootstrapped = useAppStore((state) => state.authBootstrapped);
  const authMode = useAppStore((state) => state.authMode);
  const hasCompletedPermissionFlow = useAppStore(
    (state) => state.hasCompletedPermissionFlow,
  );

  if (!hydrated || !authBootstrapped) {
    return (
      <View
        style={{
          alignItems: "center",
          backgroundColor: theme.colors.canvas,
          flex: 1,
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!authMode) {
    return <Redirect href="/welcome" />;
  }

  if (!hasCompletedPermissionFlow) {
    return <Redirect href="/permissions" />;
  }

  return <Redirect href="/(tabs)" />;
}
