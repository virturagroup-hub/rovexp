import { router } from "expo-router";
import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ActionButton, EmptyStateCard, ScreenHeader, ScreenView } from "@/components/ui";
import { theme } from "@/constants/theme";
import { updateMobilePassword } from "@/services/auth";
import { useAppStore } from "@/store/app-store";

export default function ChangePasswordScreen() {
  const authMode = useAppStore((state) => state.authMode);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async () => {
    if (authMode !== "supabase") {
      Alert.alert(
        "Sign in required",
        "Use your Supabase account session before changing a password.",
      );
      return;
    }

    if (password.trim().length < 8) {
      Alert.alert(
        "Password too short",
        "Use at least 8 characters so the account stays protected.",
      );
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Passwords do not match", "Please type the same password twice.");
      return;
    }

    try {
      setBusy(true);
      await updateMobilePassword(password);
      Alert.alert("Password updated", "Your account password was changed successfully.");
      router.replace("/settings");
    } catch (error) {
      Alert.alert(
        "Could not update password",
        error instanceof Error ? error.message : "Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenView>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Account"
          subtitle="Update your password without leaving the app."
          title="Change password"
        />

        {authMode === "supabase" ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>New password</Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setPassword}
              placeholder="New password"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              style={styles.input}
              value={password}
            />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              onChangeText={setConfirmPassword}
              placeholder="Confirm new password"
              placeholderTextColor={theme.colors.muted}
              secureTextEntry
              style={styles.input}
              value={confirmPassword}
            />
            <Text style={styles.cardBody}>
              Password changes happen against your live Supabase session and update the
              account immediately.
            </Text>
          </View>
        ) : (
          <EmptyStateCard
            actionLabel="Back to sign in"
            onPress={() => router.replace("/welcome")}
            subtitle="Password changes only work when the app has a live Supabase session."
            title="No active session"
          />
        )}

        {authMode === "supabase" ? (
          <ActionButton
            disabled={busy}
            label={busy ? "Updating password..." : "Save password"}
            onPress={handleSubmit}
          />
        ) : null}
      </ScrollView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
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
    fontSize: 13,
    lineHeight: 21,
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
  input: {
    backgroundColor: theme.colors.canvas,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 15,
    minHeight: 52,
    paddingHorizontal: 14,
  },
});
