import { router } from "expo-router";
import * as Location from "expo-location";
import { Camera } from "expo-camera";
import { ChevronLeft, Settings2 } from "lucide-react-native";
import { Alert } from "react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { ActionButton, ScreenHeader, ScreenView } from "@/components/ui";
import { theme } from "@/constants/theme";
import { captureCurrentLocationSnapshot } from "@/lib/location";
import { describeLocationStatus } from "@/lib/location-status";
import { describeSupabaseRuntimeSource } from "@/lib/runtime-status";
import {
  useAdminAccessQuery,
  useProfileMutations,
  useQuestFeedQuery,
} from "@/hooks/use-rovexp-data";
import { signOutMobileSession } from "@/services/auth";
import { useAppStore } from "@/store/app-store";

const radiusOptions = [3, 8, 15, 25];

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
  const signOut = useAppStore((state) => state.signOut);
  const { data: adminAccess } = useAdminAccessQuery();
  const { data: questFeed } = useQuestFeedQuery();
  const { settingsMutation } = useProfileMutations();
  const locationStatus = describeLocationStatus({
    lastKnownLocation,
    locationPermission,
  });
  const runtimeStatus = questFeed?.runtimeSource
    ? describeSupabaseRuntimeSource(questFeed.runtimeSource, questFeed.runtimeMessage)
    : null;

  const handleLocationRetry = async () => {
    const response = await Location.requestForegroundPermissionsAsync();
    const nextStatus = response.status === "granted" ? "granted" : "denied";

    setLocationPermission(nextStatus);

    if (nextStatus === "granted") {
      try {
        const snapshot = await captureCurrentLocationSnapshot();

        if (snapshot) {
          useAppStore.getState().setStoredLocation(snapshot);
        }
      } catch {
        // Keep the existing location snapshot if live capture fails.
      }
    }
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
          subtitle="Tune quest radius, refresh permissions, and keep account settings tidy. Discovery filters now live on the Quests board."
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
          <Text style={styles.cardTitle}>Quest filters</Text>
          <Text style={styles.cardBody}>
            Your current saved discovery defaults still travel with Home and the map, but the main
            live filter controls now stay on the Quests board so this screen can stay cleaner.
          </Text>
          <View style={styles.questFilterSummary}>
            <View style={styles.summaryRowInline}>
              <Text style={styles.preferenceLabel}>Sponsor mode</Text>
              <Text style={styles.preferenceValue}>
                {questFilters.sponsor_filter === "all"
                  ? "All quests"
                  : questFilters.sponsor_filter === "sponsored"
                    ? "Sponsored only"
                    : "Regular only"}
              </Text>
            </View>
            <View style={styles.summaryRowInline}>
              <Text style={styles.preferenceLabel}>Discovery</Text>
              <Text style={styles.preferenceValue}>
                {questFilters.discovery_types.length
                  ? `${questFilters.discovery_types.length} selected`
                  : "All discovery types"}
              </Text>
            </View>
            <View style={styles.summaryRowInline}>
              <Text style={styles.preferenceLabel}>Rarity</Text>
              <Text style={styles.preferenceValue}>
                {questFilters.rarities.length
                  ? `${questFilters.rarities.length} selected`
                  : "All rarities"}
              </Text>
            </View>
            <View style={styles.summaryRowInline}>
              <Text style={styles.preferenceLabel}>Categories</Text>
              <Text style={styles.preferenceValue}>
                {questFilters.category_slugs.length
                  ? `${questFilters.category_slugs.length} selected`
                  : "All categories"}
              </Text>
            </View>
          </View>
          <ActionButton
            label="Open quest filters"
            onPress={() => router.push("/(tabs)/quests")}
            secondary
          />
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notification preferences</Text>
          <Text style={styles.cardBody}>
            Notifications stay lightweight in this build, but the preference still saves to your account.
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
          <ActionButton
            label="Change password"
            onPress={() => router.push("/auth/change-password" as never)}
            secondary
          />
          <ActionButton label="Sign out" onPress={handleSignOut} secondary />
        </View>

        {adminAccess ? (
          <View style={styles.debugCard}>
            <Text style={styles.debugEyebrow}>Admin status</Text>
            <Text style={styles.debugTitle}>Lightweight runtime snapshot</Text>
            <View style={styles.debugPills}>
              <View style={styles.debugPill}>
                <Text style={styles.debugPillLabel}>Role</Text>
                <Text style={styles.debugPillValue}>{adminAccess.role}</Text>
              </View>
              <View style={styles.debugPill}>
                <Text style={styles.debugPillLabel}>Data</Text>
                <Text style={styles.debugPillValue}>
                  {runtimeStatus?.label ?? "Unknown"}
                </Text>
              </View>
              <View style={styles.debugPill}>
                <Text style={styles.debugPillLabel}>Location</Text>
                <Text style={styles.debugPillValue}>{locationStatus.label}</Text>
              </View>
              <View style={styles.debugPill}>
                <Text style={styles.debugPillLabel}>Visible quests</Text>
                <Text style={styles.debugPillValue}>
                  {questFeed?.all.length ?? 0}
                </Text>
              </View>
              <View style={styles.debugPill}>
                <Text style={styles.debugPillLabel}>Sponsored</Text>
                <Text style={styles.debugPillValue}>
                  {questFeed?.sponsored.length ?? 0}
                </Text>
              </View>
              <View style={styles.debugPill}>
                <Text style={styles.debugPillLabel}>Nearby</Text>
                <Text style={styles.debugPillValue}>
                  {questFeed?.nearby.length ?? 0}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
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
  questFilterSummary: {
    gap: 10,
    marginBottom: 12,
    marginTop: 8,
  },
  summaryRowInline: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
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
  debugCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  debugEyebrow: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  debugPill: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 2,
    minWidth: 138,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  debugPillLabel: {
    color: theme.colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.9,
    textTransform: "uppercase",
  },
  debugPillValue: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  debugPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  debugTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 18,
  },
});
