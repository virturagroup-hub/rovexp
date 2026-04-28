import { Redirect, router } from "expo-router";
import { Camera } from "expo-camera";
import * as Location from "expo-location";
import {
  Camera as CameraIcon,
  Compass,
  MapPin,
  Shield,
  Sparkles,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import { OnboardingShell } from "@/components/onboarding-shell";
import { ActionButton } from "@/components/ui";
import { theme } from "@/constants/theme";
import { captureCurrentLocationSnapshot } from "@/lib/location";
import { useAppStore } from "@/store/app-store";

function statusLabel(status: "unknown" | "granted" | "denied") {
  if (status === "granted") return "Granted";
  if (status === "denied") return "Denied";
  return "Not requested";
}

const permissionSteps = [
  {
    progress: "Quest radar",
    subtitle:
      "Location makes the nearby board, live map, and on-site check-in flow feel real instead of guessed.",
    title: "Let RoveXP point you toward the best nearby quests",
  },
  {
    progress: "Proof moments",
    subtitle:
      "Camera is optional, but it unlocks richer review moments after a quest is actually completed.",
    title: "Keep a review camera ready for the moments worth sharing",
  },
  {
    progress: "You're ready",
    subtitle:
      "You can enter the app with any combination of permissions and revisit the rest later from Settings.",
    title: "Setup is complete. Time to enter the route.",
  },
] as const;

export default function PermissionsScreen() {
  const authMode = useAppStore((state) => state.authMode);
  const hasCompletedPermissionFlow = useAppStore(
    (state) => state.hasCompletedPermissionFlow,
  );
  const locationPermission = useAppStore((state) => state.locationPermission);
  const cameraPermission = useAppStore((state) => state.cameraPermission);
  const setLocationPermission = useAppStore((state) => state.setLocationPermission);
  const setCameraPermission = useAppStore((state) => state.setCameraPermission);
  const completePermissionFlow = useAppStore(
    (state) => state.completePermissionFlow,
  );
  const [step, setStep] = useState(0);

  useEffect(() => {
    let active = true;

    async function syncPermissions() {
      const [locationStatus, cameraStatus] = await Promise.all([
        Location.getForegroundPermissionsAsync(),
        Camera.getCameraPermissionsAsync(),
      ]);

      if (!active) {
        return;
      }

      setLocationPermission(
        locationStatus.status === "granted" ? "granted" : locationStatus.status === "denied" ? "denied" : "unknown",
      );
      setCameraPermission(
        cameraStatus.status === "granted" ? "granted" : cameraStatus.status === "denied" ? "denied" : "unknown",
      );
    }

    void syncPermissions();

    return () => {
      active = false;
    };
  }, [setCameraPermission, setLocationPermission]);

  if (!authMode) {
    return <Redirect href="/welcome" />;
  }

  if (hasCompletedPermissionFlow) {
    return <Redirect href="/(tabs)" />;
  }

  const activeStep = permissionSteps[step] ?? permissionSteps[0];
  const allReady =
    locationPermission === "granted" && cameraPermission === "granted";

  const handleLocationPermission = async () => {
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
        // Keep the fallback district if the live capture fails.
      }

      setStep(1);
    }
  };

  const handleCameraPermission = async () => {
    const response = await Camera.requestCameraPermissionsAsync();
    const nextStatus = response.status === "granted" ? "granted" : "denied";

    setCameraPermission(nextStatus);

    if (nextStatus === "granted") {
      setStep(2);
    }
  };

  const enterApp = () => {
    completePermissionFlow();
    router.replace("/(tabs)");
  };

  const handlePrimary = () => {
    if (step < permissionSteps.length - 1) {
      setStep((current) => Math.min(current + 1, permissionSteps.length - 1));
      return;
    }

    enterApp();
  };

  const handleBack = () => {
    if (step === 0) {
      router.replace("/welcome");
      return;
    }

    setStep((current) => Math.max(current - 1, 0));
  };

  const handleSkip = () => {
    if (locationPermission === "unknown" && cameraPermission === "unknown") {
      Alert.alert(
        "You can still keep going",
        "RoveXP will open now, and you can enable permissions later from Settings whenever you want the full nearby quest and photo experience.",
      );
    }

    enterApp();
  };

  const primaryLabel =
    step === permissionSteps.length - 1
      ? allReady
        ? "Enter app"
        : "Finish and enter app"
      : "Continue";

  return (
    <OnboardingShell
      onBack={handleBack}
      onPrimary={handlePrimary}
      onSkip={handleSkip}
      primaryLabel={primaryLabel}
      progressLabel={activeStep.progress}
      step={step}
      subtitle={activeStep.subtitle}
      title={activeStep.title}
      topActionLabel="Enter app"
      totalSteps={permissionSteps.length}
    >
      {step === 0 ? (
        <>
          <View style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <View style={styles.permissionIcon}>
                <MapPin color={theme.colors.accent} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permissionTitle}>Foreground location</Text>
                <Text style={styles.permissionBody}>
                  Used to surface nearby quests, center the map, and verify
                  you reached the real quest location.
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <View
                style={[
                  styles.statusPill,
                  locationPermission === "granted"
                    ? styles.statusPillGood
                    : locationPermission === "denied"
                      ? styles.statusPillMuted
                      : styles.statusPillNeutral,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    locationPermission === "granted"
                      ? styles.statusPillTextGood
                      : locationPermission === "denied"
                        ? styles.statusPillTextMuted
                        : styles.statusPillTextNeutral,
                  ]}
                >
                  {statusLabel(locationPermission)}
                </Text>
              </View>
            </View>

            <View style={styles.benefitRow}>
              <View style={styles.benefitCard}>
                <Compass color={theme.colors.deepBlue} size={16} />
                <Text style={styles.benefitTitle}>Nearby feed</Text>
              </View>
              <View style={styles.benefitCard}>
                <Sparkles color={theme.colors.coral} size={16} />
                <Text style={styles.benefitTitle}>Server check-ins</Text>
              </View>
            </View>

            <ActionButton
              label={
                locationPermission === "granted"
                  ? "Location already enabled"
                  : "Allow location"
              }
              onPress={handleLocationPermission}
              secondary={locationPermission === "granted"}
            />
          </View>

          <View style={styles.noteCard}>
            <Shield color={theme.colors.badgeText} size={18} />
            <Text style={styles.noteText}>
              If you skip this for now, the app still opens with a fallback area
              and you can revisit location from Settings later.
            </Text>
          </View>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <View style={styles.permissionCard}>
            <View style={styles.permissionHeader}>
              <View style={[styles.permissionIcon, styles.permissionIconWarm]}>
                <CameraIcon color={theme.colors.coral} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.permissionTitle}>Camera access</Text>
                <Text style={styles.permissionBody}>
                  Optional for exploration, but ready when a completed quest
                  unlocks a review photo moment worth saving.
                </Text>
              </View>
            </View>

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <View
                style={[
                  styles.statusPill,
                  cameraPermission === "granted"
                    ? styles.statusPillGood
                    : cameraPermission === "denied"
                      ? styles.statusPillMuted
                      : styles.statusPillNeutral,
                ]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    cameraPermission === "granted"
                      ? styles.statusPillTextGood
                      : cameraPermission === "denied"
                        ? styles.statusPillTextMuted
                        : styles.statusPillTextNeutral,
                  ]}
                >
                  {statusLabel(cameraPermission)}
                </Text>
              </View>
            </View>

            <View style={styles.reviewStrip}>
              <Text style={styles.reviewStripTitle}>What this unlocks</Text>
              <Text style={styles.reviewStripBody}>
                Add an optional proof photo after a quest is accepted, checked in,
                and completed. No review shortcutting, no broken flow.
              </Text>
            </View>

            <ActionButton
              label={
                cameraPermission === "granted"
                  ? "Camera already enabled"
                  : "Allow camera"
              }
              onPress={handleCameraPermission}
              secondary={cameraPermission === "granted"}
            />
          </View>
        </>
      ) : null}

      {step === 2 ? (
        <View style={styles.permissionCard}>
          <Text style={styles.summaryTitle}>Your setup snapshot</Text>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Location</Text>
            <Text style={styles.summaryValue}>{statusLabel(locationPermission)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Camera</Text>
            <Text style={styles.summaryValue}>{statusLabel(cameraPermission)}</Text>
          </View>

          <View style={styles.finishHero}>
            <Text style={styles.finishHeroTitle}>
              {allReady ? "Everything is ready to roam." : "You can finish setup later."}
            </Text>
            <Text style={styles.finishHeroBody}>
              {allReady
                ? "Nearby quests, live map behavior, server-backed check-ins, and review photos are all primed."
                : "RoveXP will still open now. Any missing permission can be retried from Settings without blocking the rest of the app."}
            </Text>
          </View>
        </View>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  benefitCard: {
    alignItems: "center",
    backgroundColor: theme.colors.cardAlt,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 8,
    padding: 14,
  },
  benefitRow: {
    flexDirection: "row",
    gap: 12,
  },
  benefitTitle: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  finishHero: {
    backgroundColor: theme.colors.badgeSoft,
    borderColor: "rgba(45,183,255,0.16)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  finishHeroBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  finishHeroTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 18,
  },
  noteCard: {
    alignItems: "flex-start",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  noteText: {
    color: theme.colors.textOnDark,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  permissionBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  permissionCard: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 30,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  permissionHeader: {
    flexDirection: "row",
    gap: 16,
  },
  permissionIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.badgeSoft,
    borderRadius: 18,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  permissionIconWarm: {
    backgroundColor: theme.colors.sponsorSoft,
  },
  permissionTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 20,
    lineHeight: 24,
  },
  reviewStrip: {
    backgroundColor: theme.colors.sponsorSoft,
    borderColor: "rgba(242,138,26,0.14)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  reviewStripBody: {
    color: theme.colors.sponsorText,
    fontSize: 13,
    lineHeight: 20,
  },
  reviewStripTitle: {
    color: theme.colors.sponsorText,
    fontFamily: "SpaceMono",
    fontSize: 15,
  },
  statusLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusPillGood: {
    backgroundColor: "rgba(139,195,74,0.16)",
  },
  statusPillMuted: {
    backgroundColor: theme.colors.panelStrong,
  },
  statusPillNeutral: {
    backgroundColor: theme.colors.badgeSoft,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  statusPillTextGood: {
    color: "#5E8622",
  },
  statusPillTextMuted: {
    color: theme.colors.muted,
  },
  statusPillTextNeutral: {
    color: theme.colors.badgeText,
  },
  statusRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  summaryRow: {
    alignItems: "center",
    backgroundColor: theme.colors.cardAlt,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  summaryTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 20,
  },
  summaryValue: {
    color: theme.colors.deepBlue,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
});
