import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";

import { ScreenView } from "@/components/ui";
import { theme } from "@/constants/theme";
import { completeOAuthCallback } from "@/services/auth";

function readCallbackMode(callbackUrl: string) {
  try {
    const parsed = new URL(callbackUrl);
    return parsed.searchParams.get("mode") ?? parsed.searchParams.get("type");
  } catch {
    return null;
  }
}

export default function AuthCallbackScreen() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("Finishing sign in...");

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const callbackUrl = await Linking.getInitialURL();

      if (!callbackUrl) {
        throw new Error("The sign-in callback did not include a URL.");
      }

      const mode = readCallbackMode(callbackUrl);
      await completeOAuthCallback(callbackUrl);

      if (cancelled) {
        return;
      }

      if (mode === "recovery") {
        router.replace("/auth/change-password" as never);
        return;
      }

      router.replace("/permissions");
    }

    void bootstrap().catch((error) => {
      if (!cancelled) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "We could not finish this sign-in link.",
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <ScreenView>
      <View style={styles.container}>
        <View style={styles.card}>
          {status === "loading" ? (
            <ActivityIndicator color={theme.colors.accent} />
          ) : null}
          <Text style={styles.title}>
            {status === "loading" ? "Finishing sign in" : "Sign-in link problem"}
          </Text>
          <Text style={styles.body}>{message}</Text>
        </View>
      </View>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  body: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
  },
  card: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 14,
    padding: 24,
    width: "100%",
  },
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    padding: theme.spacing.screen,
  },
  title: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 22,
    textAlign: "center",
  },
});
