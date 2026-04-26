import { router } from "expo-router";
import * as Location from "expo-location";
import { Camera } from "expo-camera";
import { ChevronLeft, Settings2 } from "lucide-react-native";
import { Alert } from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton, ScreenHeader, ScreenView } from "@/components/ui";
import { theme } from "@/constants/theme";
import { describeLocationStatus } from "@/lib/location-status";
import {
  useProfileMutations,
  useQuestCategoriesQuery,
  useQuestVisibilityMutations,
} from "@/hooks/use-rovexp-data";
import { signOutMobileSession } from "@/services/auth";
import { useAppStore } from "@/store/app-store";

const radiusOptions = [3, 8, 15, 25];
const rarityOptions = ["common", "rare", "epic", "legendary"] as const;
const discoveryOptions = [
  { label: "Popular", value: "popular" },
  { label: "Hidden gems", value: "hidden_gem" },
  { label: "Featured", value: "featured_route" },
] as const;

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export default function SettingsScreen() {
  const preferredRadiusMiles = useAppStore((state) => state.preferredRadiusMiles);
  const authMode = useAppStore((state) => state.authMode);
  const lastKnownLocation = useAppStore((state) => state.lastKnownLocation);
  const locationPermission = useAppStore((state) => state.locationPermission);
  const cameraPermission = useAppStore((state) => state.cameraPermission);
  const notificationsEnabled = useAppStore((state) => state.notificationsEnabled);
  const questFilters = useAppStore((state) => state.questFilters);
  const setPreferredRadius = useAppStore((state) => state.setPreferredRadius);
  const setLocationPermission = useAppStore((state) => state.setLocationPermission);
  const setCameraPermission = useAppStore((state) => state.setCameraPermission);
  const toggleNotifications = useAppStore((state) => state.toggleNotifications);
  const setQuestFilters = useAppStore((state) => state.setQuestFilters);
  const signOut = useAppStore((state) => state.signOut);
  const { data: categories } = useQuestCategoriesQuery();
  const { settingsMutation } = useProfileMutations();
  const { resetHiddenSponsoredMutation } = useQuestVisibilityMutations();
  const locationStatus = describeLocationStatus({
    lastKnownLocation,
    locationPermission,
  });

  const handleLocationRetry = async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    setLocationPermission(response.status === "granted" ? "granted" : "denied");
  };

  const handleCameraRetry = async () => {
    const response = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(response.status === "granted" ? "granted" : "denied");
  };

  const handleSignOut = async () => {
    await signOutMobileSession();
    signOut();
    router.replace("/welcome");
  };

  const handleSave = async () => {
    try {
      await settingsMutation.mutateAsync({
        category_preferences: questFilters.category_slugs,
        discovery_preferences: questFilters.discovery_types,
        notifications_enabled: notificationsEnabled,
        preferred_radius_miles: preferredRadiusMiles,
        rarity_preferences: questFilters.rarities,
        sponsor_filter: questFilters.sponsor_filter,
      });
      Alert.alert("Preferences saved", "Your mobile discovery settings are updated.");
    } catch (error) {
      Alert.alert(
        "Preferences could not be saved",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  const handleResetHiddenSponsored = async () => {
    try {
      await resetHiddenSponsoredMutation.mutateAsync();
      Alert.alert(
        "Sponsored spotlight reset",
        "Hidden sponsored quests will appear in the Home spotlight again.",
      );
    } catch (error) {
      Alert.alert(
        "Could not reset spotlight",
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
          eyebrow="Menu"
          rightSlot={
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ChevronLeft color={theme.colors.textOnDark} size={18} />
            </Pressable>
          }
          subtitle="Tune quest radius, permission refresh, and the persistent discovery filters used across the mobile app."
          title="Settings"
        />

        <View style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View
              style={[
                styles.statusPill,
                authMode === "demo"
                  ? styles.statusPillDemo
                  : styles.statusPillLive,
              ]}
            >
              <Text style={styles.statusPillText}>
                {authMode === "demo" ? "Demo mode" : "Live session"}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                locationStatus.tone === "good"
                  ? styles.statusPillGood
                  : locationStatus.tone === "warning"
                    ? styles.statusPillWarning
                    : styles.statusPillNeutral,
              ]}
            >
              <Text style={styles.statusPillText}>{locationStatus.label}</Text>
            </View>
          </View>
          <Text style={styles.statusBody}>{locationStatus.body}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Preferred quest radius</Text>
          <Text style={styles.cardBody}>
            This controls how wide the nearby quest sweep should be for the home
            dashboard, quest board, and map.
          </Text>
          <View style={styles.chipRow}>
            {radiusOptions.map((radius) => (
              <Pressable
                key={radius}
                onPress={() => setPreferredRadius(radius)}
                style={[
                  styles.radiusChip,
                  preferredRadiusMiles === radius && styles.radiusChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.radiusChipText,
                    preferredRadiusMiles === radius && styles.radiusChipTextActive,
                  ]}
                >
                  {radius} mi
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Permissions</Text>
          <View style={styles.preferenceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.preferenceLabel}>Location</Text>
              <Text style={styles.preferenceValue}>{locationPermission}</Text>
            </View>
            <ActionButton label="Refresh" onPress={handleLocationRetry} secondary />
          </View>
          <View style={styles.preferenceRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.preferenceLabel}>Camera</Text>
              <Text style={styles.preferenceValue}>{cameraPermission}</Text>
            </View>
            <ActionButton label="Refresh" onPress={handleCameraRetry} secondary />
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Discovery filters</Text>
          <Text style={styles.cardBody}>
            These preferences are saved back to your user settings and reused by Home, Quests, and Map.
          </Text>

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupLabel}>Sponsor mode</Text>
            <View style={styles.chipRow}>
              {["all", "sponsored", "regular"].map((value) => (
                <Pressable
                  key={value}
                  onPress={() =>
                    setQuestFilters((current) => ({
                      ...current,
                      sponsor_filter: value as typeof current.sponsor_filter,
                    }))
                  }
                  style={[
                    styles.radiusChip,
                    questFilters.sponsor_filter === value && styles.radiusChipActive,
                  ]}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      questFilters.sponsor_filter === value && styles.radiusChipTextActive,
                    ]}
                  >
                    {value}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupLabel}>Discovery</Text>
            <View style={styles.chipRow}>
              {discoveryOptions.map((option) => {
                const active = questFilters.discovery_types.includes(option.value);

                return (
                  <Pressable
                    key={option.value}
                    onPress={() =>
                      setQuestFilters((current) => ({
                        ...current,
                        discovery_types: toggleValue(
                          current.discovery_types,
                          option.value,
                        ) as typeof current.discovery_types,
                      }))
                    }
                    style={[styles.radiusChip, active && styles.radiusChipActive]}
                  >
                    <Text
                      style={[
                        styles.radiusChipText,
                        active && styles.radiusChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupLabel}>Rarity</Text>
            <View style={styles.chipRow}>
              {rarityOptions.map((rarity) => {
                const active = questFilters.rarities.includes(rarity);

                return (
                  <Pressable
                    key={rarity}
                    onPress={() =>
                      setQuestFilters((current) => ({
                        ...current,
                        rarities: toggleValue(current.rarities, rarity) as typeof current.rarities,
                      }))
                    }
                    style={[styles.radiusChip, active && styles.radiusChipActive]}
                  >
                    <Text
                      style={[
                        styles.radiusChipText,
                        active && styles.radiusChipTextActive,
                      ]}
                    >
                      {rarity}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.filterGroup}>
            <Text style={styles.filterGroupLabel}>Categories</Text>
            <View style={styles.chipRow}>
              {categories?.map((category) => {
                const active = questFilters.category_slugs.includes(category.slug);

                return (
                  <Pressable
                    key={category.id}
                    onPress={() =>
                      setQuestFilters((current) => ({
                        ...current,
                        category_slugs: toggleValue(
                          current.category_slugs,
                          category.slug,
                        ),
                      }))
                    }
                    style={[styles.radiusChip, active && styles.radiusChipActive]}
                  >
                    <Text
                      style={[
                        styles.radiusChipText,
                        active && styles.radiusChipTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notifications placeholder</Text>
          <Text style={styles.cardBody}>
            Phase 2 still keeps notifications lightweight, but the preference is now part of your saved settings state.
          </Text>
          <Pressable
            onPress={() => toggleNotifications(!notificationsEnabled)}
            style={[
              styles.preferenceToggle,
              notificationsEnabled && styles.preferenceToggleActive,
            ]}
          >
            <Settings2 color={theme.colors.deep} size={18} />
            <Text style={styles.preferenceToggleText}>
              {notificationsEnabled
                ? "Notifications enabled"
                : "Notifications muted"}
            </Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sponsored spotlight</Text>
          <Text style={styles.cardBody}>
            Sponsored quests you hide from Home are stored per user and can be
            restored here later.
          </Text>
          <ActionButton
            disabled={resetHiddenSponsoredMutation.isPending}
            label={
              resetHiddenSponsoredMutation.isPending
                ? "Resetting spotlight..."
                : "Reset hidden sponsored quests"
            }
            onPress={handleResetHiddenSponsored}
            secondary
          />
        </View>

        <ActionButton
          disabled={settingsMutation.isPending}
          label={
            settingsMutation.isPending ? "Saving preferences..." : "Save preferences"
          }
          onPress={handleSave}
        />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account</Text>
          <Text style={styles.cardBody}>
            Signing out clears the local session snapshot and returns you to the auth entry screen.
          </Text>
          <ActionButton label="Sign out" onPress={handleSignOut} secondary />
        </View>
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
    gap: 14,
    padding: 20,
  },
  cardBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  cardTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 20,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  container: {
    gap: 18,
    padding: theme.spacing.screen,
    paddingBottom: 32,
  },
  filterGroup: {
    gap: 10,
  },
  filterGroupLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  preferenceLabel: {
    color: theme.colors.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  preferenceRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  preferenceToggle: {
    alignItems: "center",
    backgroundColor: theme.colors.panel,
    borderRadius: 20,
    borderColor: theme.colors.border,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  preferenceToggleActive: {
    backgroundColor: theme.colors.badgeSoft,
  },
  preferenceToggleText: {
    color: theme.colors.deep,
    fontSize: 14,
    fontWeight: "700",
  },
  preferenceValue: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 4,
    textTransform: "capitalize",
  },
  statusBody: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  statusCard: {
    backgroundColor: theme.colors.cardAlt,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 10,
    padding: 18,
  },
  statusPill: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillDemo: {
    backgroundColor: theme.colors.sponsorSoft,
    borderColor: "rgba(242,138,26,0.18)",
  },
  statusPillGood: {
    backgroundColor: "rgba(139,195,74,0.14)",
    borderColor: "rgba(139,195,74,0.22)",
  },
  statusPillLive: {
    backgroundColor: "rgba(45,183,255,0.12)",
    borderColor: "rgba(45,183,255,0.18)",
  },
  statusPillNeutral: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
  },
  statusPillWarning: {
    backgroundColor: "rgba(242,138,26,0.16)",
    borderColor: "rgba(242,138,26,0.22)",
  },
  statusPillText: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: "800",
  },
  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  radiusChip: {
    backgroundColor: theme.colors.canvas,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  radiusChipActive: {
    backgroundColor: theme.colors.deep,
    borderColor: theme.colors.deep,
  },
  radiusChipText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  radiusChipTextActive: {
    color: theme.colors.white,
  },
});
