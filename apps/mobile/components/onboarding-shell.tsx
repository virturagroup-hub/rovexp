import { LinearGradient } from "expo-linear-gradient";
import { StatusBar } from "expo-status-bar";
import { ChevronLeft, Sparkles } from "lucide-react-native";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { theme } from "@/constants/theme";
import { ActionButton } from "@/components/ui";

interface OnboardingShellProps {
  backLabel?: string;
  children: React.ReactNode;
  onBack?: () => void;
  onPrimary: () => void;
  onSkip?: () => void;
  primaryDisabled?: boolean;
  primaryLabel: string;
  progressLabel: string;
  step: number;
  subtitle: string;
  title: string;
  topActionLabel?: string;
  totalSteps: number;
}

export function OnboardingShell({
  backLabel = "Back",
  children,
  onBack,
  onPrimary,
  onSkip,
  primaryDisabled,
  primaryLabel,
  progressLabel,
  step,
  subtitle,
  title,
  topActionLabel,
  totalSteps,
}: OnboardingShellProps) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <LinearGradient
        colors={theme.gradients.hero}
        end={{ x: 1, y: 1 }}
        start={{ x: 0, y: 0 }}
        style={StyleSheet.absoluteFill}
      />

      <View pointerEvents="none" style={styles.backgroundArt}>
        <View style={styles.mapTileOne} />
        <View style={styles.mapTileTwo} />
        <View style={styles.routeGlow} />
        <View style={styles.goldOrb} />
        <View style={styles.cyanOrb} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.flex}
      >
        <View style={styles.topRow}>
          <View style={styles.brandPill}>
            <View style={styles.brandGem} />
            <Text style={styles.brandText}>RoveXP</Text>
          </View>
          {onSkip ? (
            <Pressable onPress={onSkip} style={styles.topAction}>
              <Sparkles color={theme.colors.textOnDark} size={16} />
              <Text style={styles.topActionText}>
                {topActionLabel ?? "Skip for now"}
              </Text>
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.progressCard}>
            <View style={styles.progressMeta}>
              <Text style={styles.progressText}>{progressLabel}</Text>
              <Text style={styles.progressStep}>
                {step + 1}/{totalSteps}
              </Text>
            </View>
            <View style={styles.progressBarRow}>
              {Array.from({ length: totalSteps }).map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.progressBar,
                    index <= step && styles.progressBarActive,
                  ]}
                />
              ))}
            </View>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>{title}</Text>
            <Text style={styles.heroSubtitle}>{subtitle}</Text>
          </View>

          {children}
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: Math.max(18, insets.bottom + 10) }]}>
          <View style={styles.utilityRow}>
            {onBack ? (
              <Pressable onPress={onBack} style={styles.utilityButton}>
                <ChevronLeft color={theme.colors.ink} size={16} />
                <Text style={styles.utilityButtonText}>{backLabel}</Text>
              </Pressable>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {onSkip ? (
              <Pressable onPress={onSkip} style={styles.skipButton}>
                <Text style={styles.skipButtonText}>
                  {topActionLabel ?? "Skip for now"}
                </Text>
              </Pressable>
            ) : null}
          </View>

          <ActionButton
            disabled={primaryDisabled}
            label={primaryLabel}
            onPress={onPrimary}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundArt: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomBar: {
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopColor: "rgba(18, 58, 99, 0.12)",
    borderTopWidth: 1,
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 18,
    paddingTop: 14,
  },
  brandGem: {
    backgroundColor: theme.colors.cyan,
    borderRadius: 999,
    height: 10,
    shadowColor: theme.colors.cyan,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    width: 10,
  },
  brandPill: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  brandText: {
    color: theme.colors.textOnDark,
    fontFamily: "SpaceMono",
    fontSize: 15,
  },
  cyanOrb: {
    backgroundColor: "rgba(45, 183, 255, 0.28)",
    borderRadius: 999,
    height: 240,
    left: -40,
    position: "absolute",
    top: 110,
    width: 240,
  },
  flex: {
    flex: 1,
  },
  goldOrb: {
    backgroundColor: "rgba(245, 184, 46, 0.2)",
    borderRadius: 999,
    height: 260,
    position: "absolute",
    right: -70,
    top: 80,
    width: 260,
  },
  heroCard: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 30,
    borderWidth: 1,
    overflow: "hidden",
    padding: 22,
  },
  heroSubtitle: {
    color: "rgba(245,250,255,0.82)",
    fontSize: 15,
    lineHeight: 24,
    marginTop: 10,
  },
  heroTitle: {
    color: theme.colors.textOnDark,
    fontFamily: "SpaceMono",
    fontSize: 28,
    lineHeight: 34,
  },
  mapTileOne: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderColor: "rgba(255,255,255,0.08)",
    borderRadius: 36,
    borderWidth: 1,
    height: 210,
    position: "absolute",
    right: -20,
    top: 150,
    transform: [{ rotate: "-12deg" }],
    width: 210,
  },
  mapTileTwo: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderColor: "rgba(255,255,255,0.07)",
    borderRadius: 28,
    borderWidth: 1,
    height: 140,
    left: -36,
    position: "absolute",
    top: 240,
    transform: [{ rotate: "18deg" }],
    width: 140,
  },
  progressBar: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 999,
    flex: 1,
    height: 8,
  },
  progressBarActive: {
    backgroundColor: theme.colors.cyan,
  },
  progressBarRow: {
    flexDirection: "row",
    gap: 8,
  },
  progressCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,255,255,0.14)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  progressMeta: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressStep: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    fontWeight: "800",
  },
  progressText: {
    color: "rgba(245,250,255,0.74)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  routeGlow: {
    borderColor: "rgba(245, 184, 46, 0.28)",
    borderRadius: 999,
    borderStyle: "dashed",
    borderWidth: 3,
    height: 180,
    position: "absolute",
    right: 40,
    top: 210,
    transform: [{ rotate: "18deg" }],
    width: 90,
  },
  safeArea: {
    backgroundColor: theme.colors.deep,
    flex: 1,
  },
  scrollContent: {
    gap: 18,
    paddingHorizontal: 20,
    paddingBottom: 28,
  },
  skipButton: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 42,
    paddingHorizontal: 12,
  },
  skipButtonText: {
    color: theme.colors.deepBlue,
    fontSize: 14,
    fontWeight: "800",
  },
  topAction: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  topActionText: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    fontWeight: "800",
  },
  topRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  utilityButton: {
    alignItems: "center",
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  utilityButtonText: {
    color: theme.colors.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  utilityRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
