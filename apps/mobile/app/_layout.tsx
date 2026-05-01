import { ThemeProvider, type Theme } from "@react-navigation/native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { AuthBootstrap } from "@/components/auth-bootstrap";
import { theme } from "@/constants/theme";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync();

const navigationTheme: Theme = {
  dark: false,
  colors: {
    background: theme.colors.canvas,
    border: theme.colors.border,
    card: theme.colors.canvas,
    notification: theme.colors.coral,
    primary: theme.colors.accent,
    text: theme.colors.ink,
  },
  fonts: {
    bold: { fontFamily: "SpaceMono", fontWeight: "700" },
    heavy: { fontFamily: "SpaceMono", fontWeight: "700" },
    medium: { fontFamily: "System", fontWeight: "500" },
    regular: { fontFamily: "System", fontWeight: "400" },
  },
};

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
          },
        },
      }),
  );

  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthBootstrap />
        <ThemeProvider value={navigationTheme}>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              contentStyle: { backgroundColor: theme.colors.canvas },
              headerShown: false,
            }}
          >
          <Stack.Screen name="index" />
          <Stack.Screen name="welcome" />
          <Stack.Screen name="permissions" />
          <Stack.Screen name="auth/callback" />
          <Stack.Screen name="auth/change-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="settings" />
            <Stack.Screen name="leaderboards" />
            <Stack.Screen name="profile-edit" options={{ presentation: "modal" }} />
            <Stack.Screen name="quest/[questId]" />
            <Stack.Screen
              name="review/[questId]"
              options={{ presentation: "modal" }}
            />
          </Stack>
        </ThemeProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
