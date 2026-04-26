import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ActionButton, ScreenHeader, ScreenView } from "@/components/ui";
import { StatePicker } from "@/components/state-picker";
import { theme } from "@/constants/theme";
import { useProfileMutations, useProfileSummaryQuery, useStatesQuery } from "@/hooks/use-rovexp-data";

export default function ProfileEditScreen() {
  const { data } = useProfileSummaryQuery();
  const { data: states } = useStatesQuery();
  const { profileMutation } = useProfileMutations();
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [homeStateId, setHomeStateId] = useState<string | null>(null);
  const selectedState =
    states?.find((state) => state.id === homeStateId) ??
    states?.find((state) => state.code === data?.home_state?.code) ??
    data?.home_state ??
    null;

  useEffect(() => {
    if (!data) {
      return;
    }

    setUsername(data.profile.username);
    setDisplayName(data.profile.display_name);
    setAvatarUrl(data.profile.avatar_url ?? "");
    setHomeStateId(data.profile.home_state_id);
  }, [data]);

  const handleSave = async () => {
    try {
      await profileMutation.mutateAsync({
        avatar_url: avatarUrl.trim(),
        display_name: displayName.trim(),
        home_state_id: homeStateId ?? "",
        username: username.trim(),
      });
      Alert.alert("Profile updated", "Your explorer profile is now saved.");
      router.back();
    } catch (error) {
      Alert.alert(
        "Profile could not be updated",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  return (
    <ScreenView>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Profile edit"
          rightSlot={
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={theme.colors.textOnDark} size={18} />
            </Pressable>
          }
          subtitle="Keep your public handle, private display name, and home-state positioning in sync with the backend profile."
          title="Edit profile"
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Private display name</Text>
          <TextInput
            onChangeText={setDisplayName}
            placeholder="Display name"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            value={displayName}
          />
          <Text style={styles.hint}>Shown to friends and on your private profile surfaces.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Public username</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setUsername}
            placeholder="username"
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            value={username}
          />
          <Text style={styles.hint}>Used on leaderboards and public-facing RoveXP surfaces.</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Avatar URL</Text>
          <TextInput
            autoCapitalize="none"
            onChangeText={setAvatarUrl}
            placeholder="https://..."
            placeholderTextColor={theme.colors.muted}
            style={styles.input}
            value={avatarUrl}
          />
          <Text style={styles.hint}>
            Phase 2 keeps avatar editing URL-based so storage-backed upload can land later without changing the profile shape.
          </Text>
        </View>

        <View style={styles.card}>
          <StatePicker
            allowClear
            label="Home state"
            onChange={(state) => setHomeStateId(state?.id ?? null)}
            placeholder="Select your public home base"
            states={states ?? []}
            value={selectedState}
          />
        </View>

        <ActionButton
          disabled={profileMutation.isPending}
          label={profileMutation.isPending ? "Saving profile..." : "Save profile"}
          onPress={handleSave}
        />
      </ScrollView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  backButton: {
    alignItems: "center",
    backgroundColor: theme.colors.deep,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 18,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  card: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  cardTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 20,
  },
  container: {
    gap: 18,
    padding: theme.spacing.screen,
    paddingBottom: 32,
  },
  hint: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    backgroundColor: theme.colors.canvas,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 15,
    minHeight: 50,
    paddingHorizontal: 16,
  },
});
