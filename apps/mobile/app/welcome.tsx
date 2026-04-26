import { Redirect, router } from "expo-router";
import {
  Compass,
  MapPinned,
  ShieldCheck,
  Sparkles,
  Star,
  Waypoints,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  Platform,
  View,
} from "react-native";

import { OnboardingShell } from "@/components/onboarding-shell";
import { theme } from "@/constants/theme";
import { hasSupabaseConfig, mobileEnv } from "@/lib/env";
import {
  signInWithEmail,
  signInWithOAuthProvider,
  signUpWithEmail,
} from "@/services/auth";
import { useAppStore } from "@/store/app-store";

type AuthMode = "sign-in" | "sign-up";

const onboardingSteps = [
  {
    progress: "Welcome aboard",
    subtitle:
      "Nearby quests, sponsor drops, XP ladders, and city discovery all feel better when the app opens like a real adventure.",
    title: "Turn your city into a live quest board",
  },
  {
    progress: "How it works",
    subtitle:
      "RoveXP stays playful without getting fuzzy: spot a quest, arrive on-site, verify the visit, then leave the review after completion.",
    title: "The loop is quick, fair, and rewarding",
  },
  {
    progress: "Explorer access",
    subtitle:
      "Sign in to sync your progress, or skip for now to enter a local explorer mode and test the app without getting trapped.",
    title: "Claim your route and start roaming",
  },
] as const;

export default function WelcomeScreen() {
  const authMode = useAppStore((state) => state.authMode);
  const hydrated = useAppStore((state) => state.hydrated);
  const authBootstrapped = useAppStore((state) => state.authBootstrapped);
  const hasCompletedPermissionFlow = useAppStore(
    (state) => state.hasCompletedPermissionFlow,
  );
  const setAuthSession = useAppStore((state) => state.setAuthSession);
  const signInDemo = useAppStore((state) => state.signInDemo);
  const completePermissionFlow = useAppStore(
    (state) => state.completePermissionFlow,
  );
  const [step, setStep] = useState(authMode ? 2 : 0);
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [busyProvider, setBusyProvider] = useState<"google" | "facebook" | "apple" | null>(
    null,
  );

  const socialProviders = [
    {
      badge: "G",
      background: theme.colors.surface,
      border: theme.colors.border,
      enabled: hasSupabaseConfig && mobileEnv.oauthGoogleEnabled,
      label: "Continue with Google",
      provider: "google" as const,
      subtitle: hasSupabaseConfig && mobileEnv.oauthGoogleEnabled
        ? "Fast sign-in with your Google account."
        : "Not configured in this showcase build.",
      text: theme.colors.ink,
    },
    {
      badge: "f",
      background: theme.colors.deepBlue,
      border: theme.colors.deepBlue,
      enabled: hasSupabaseConfig && mobileEnv.oauthFacebookEnabled,
      label: "Continue with Facebook",
      provider: "facebook" as const,
      subtitle: hasSupabaseConfig && mobileEnv.oauthFacebookEnabled
        ? "Keep your city progress synced with Facebook."
        : "Not configured in this showcase build.",
      text: theme.colors.textOnDark,
    },
    ...(Platform.OS === "ios"
      ? [
          {
            badge: "",
            background: theme.colors.deep,
            border: theme.colors.deep,
            enabled: hasSupabaseConfig && mobileEnv.oauthAppleEnabled,
            label: "Continue with Apple",
            provider: "apple" as const,
            subtitle: hasSupabaseConfig && mobileEnv.oauthAppleEnabled
              ? "Use Apple Sign-In on supported devices."
              : "Not configured in this showcase build.",
            text: theme.colors.textOnDark,
          },
        ]
      : []),
  ];

  useEffect(() => {
    if (authMode) {
      setStep(2);
    }
  }, [authMode]);

  if (!hydrated || !authBootstrapped) {
    return null;
  }

  if (authMode && hasCompletedPermissionFlow) {
    return <Redirect href="/(tabs)" />;
  }

  const activeStep = onboardingSteps[step] ?? onboardingSteps[0];

  const handleAuth = async () => {
    if (!hasSupabaseConfig) {
      signInDemo();
      router.replace("/permissions");
      return;
    }

    if (!email.trim() || !password.trim()) {
      setMessage("Add your email and password to continue.");
      return;
    }

    if (mode === "sign-up" && displayName.trim().length < 2) {
      setMessage("Choose a display name so your profile feels real from the start.");
      return;
    }

    try {
      setBusy(true);
      setMessage(null);

      const result =
        mode === "sign-in"
          ? await signInWithEmail({
              email: email.trim(),
              password: password.trim(),
            })
          : await signUpWithEmail({
              display_name: displayName.trim(),
              email: email.trim(),
              password: password.trim(),
            });

      if (result.session?.user) {
        setAuthSession({
          authMode: "supabase",
          email: result.session.user.email ?? null,
          userId: result.session.user.id,
        });
        router.replace("/permissions");
        return;
      }

      setMessage(
        "Account created. Confirm the email if required, then sign in to continue.",
      );
      setMode("sign-in");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Authentication could not be completed right now.",
      );
    } finally {
      setBusy(false);
    }
  };

  const handleOAuth = async (provider: "google" | "facebook" | "apple") => {
    try {
      setBusyProvider(provider);
      setMessage(null);

      const session = await signInWithOAuthProvider(provider);

      if (session?.user) {
        setAuthSession({
          authMode: "supabase",
          email: session.user.email ?? null,
          userId: session.user.id,
        });
        router.replace("/permissions");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Provider sign-in could not be completed right now.",
      );
    } finally {
      setBusyProvider(null);
    }
  };

  const handlePrimary = async () => {
    if (step < 2) {
      setStep((current) => Math.min(current + 1, onboardingSteps.length - 1));
      return;
    }

    if (authMode) {
      router.replace("/permissions");
      return;
    }

    await handleAuth();
  };

  const handleSkip = () => {
    if (!authMode) {
      signInDemo();
    }

    completePermissionFlow();
    router.replace("/(tabs)");
  };

  const handleBack = () => {
    if (step === 0) {
      return;
    }

    setStep((current) => Math.max(current - 1, 0));
  };

  const primaryLabel =
    step < 2
      ? "Continue"
      : authMode
        ? "Continue to setup"
        : busy
          ? mode === "sign-in"
            ? "Signing in..."
            : "Creating account..."
          : mode === "sign-in"
            ? "Sign in and continue"
            : "Create account";

  return (
    <OnboardingShell
      onBack={step > 0 ? handleBack : undefined}
      onPrimary={() => void handlePrimary()}
      onSkip={handleSkip}
      primaryDisabled={busy}
      primaryLabel={primaryLabel}
      progressLabel={activeStep.progress}
      step={step}
      subtitle={activeStep.subtitle}
      title={activeStep.title}
      topActionLabel="Enter app"
      totalSteps={onboardingSteps.length}
    >
      {step === 0 ? (
        <>
          <View style={styles.panel}>
            <View style={styles.inlineHero}>
              <View style={styles.routeBadge}>
                <MapPinned color={theme.colors.cyan} size={22} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.panelTitle}>Your feed should feel alive</Text>
                <Text style={styles.panelBody}>
                  Open the app and RoveXP immediately shows nearby missions,
                  sponsored highlights, and a route worth stepping into.
                </Text>
              </View>
            </View>

            <View style={styles.featureGrid}>
              {[
                {
                  body: "Dynamic quest cards and map markers tuned to where you are.",
                  icon: Compass,
                  title: "Quest radar",
                },
                {
                  body: "XP, titles, and badges that reward real movement through the city.",
                  icon: Star,
                  title: "Progress that sticks",
                },
                {
                  body: "Sponsor content that feels premium instead of hidden or awkward.",
                  icon: Sparkles,
                  title: "Premium routes",
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <View key={item.title} style={styles.featureCard}>
                    <View style={styles.featureIcon}>
                      <Icon color={theme.colors.deepBlue} size={18} />
                    </View>
                    <Text style={styles.featureTitle}>{item.title}</Text>
                    <Text style={styles.featureBody}>{item.body}</Text>
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.helperPill}>
            <Text style={styles.helperPillText}>
              You can skip setup anytime and still land in the real app for testing.
            </Text>
          </View>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <View style={styles.panel}>
            {[
              {
                body: "Pick the mission you want to chase from the nearby board or live map.",
                icon: Compass,
                title: "1. Accept the quest",
              },
              {
                body: "Arrive on-site and check in so the app knows you really made the trip.",
                icon: Waypoints,
                title: "2. Verify the stop",
              },
              {
                body: "Complete the run, bank the XP, then unlock the review and optional photo.",
                icon: ShieldCheck,
                title: "3. Finish strong",
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <View key={item.title} style={styles.loopCard}>
                  <View style={styles.loopIcon}>
                    <Icon color={theme.colors.coral} size={18} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.loopTitle}>{item.title}</Text>
                    <Text style={styles.loopBody}>{item.body}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.rewardStrip}>
            <Text style={styles.rewardStripTitle}>What unlocks next</Text>
            <Text style={styles.rewardStripBody}>
              Live check-ins, leaderboard movement, and sponsor quest visibility all
              feel more rewarding when the setup flow gets you moving fast.
            </Text>
          </View>
        </>
      ) : null}

      {step === 2 ? (
        <View style={styles.panel}>
          {authMode ? (
            <View style={styles.readyCard}>
              <View style={styles.readyDot} />
              <Text style={styles.readyTitle}>Explorer session is ready</Text>
              <Text style={styles.readyBody}>
                Your account is active, so the next stop is the quick app-setup
                flow for location and camera permissions.
              </Text>
            </View>
          ) : (
            <>
              {hasSupabaseConfig ? (
                <View style={styles.providerCard}>
                  <Text style={styles.providerEyebrow}>Continue with</Text>
                  <Text style={styles.providerNotice}>
                    Email sign-in is fully available. Social buttons activate only
                    when the provider is configured for this build.
                  </Text>
                  <View style={styles.providerStack}>
                    {socialProviders.map((option) => {
                      const disabled = !option.enabled || Boolean(busyProvider);

                      return (
                        <Pressable
                          key={option.provider}
                          disabled={disabled}
                          onPress={() => void handleOAuth(option.provider)}
                          style={[
                            styles.providerButton,
                            { backgroundColor: option.background, borderColor: option.border },
                            disabled && styles.providerButtonDisabled,
                          ]}
                        >
                          <View
                            style={[
                              styles.providerBadge,
                              {
                                backgroundColor:
                                  option.border === theme.colors.border
                                    ? theme.colors.badgeSoft
                                    : "rgba(255,255,255,0.14)",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.providerBadgeText,
                                { color: option.text },
                              ]}
                            >
                              {option.badge}
                            </Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[
                                styles.providerTitle,
                                { color: option.text },
                              ]}
                            >
                              {option.label}
                            </Text>
                            <Text
                              style={[
                                styles.providerSubtitle,
                                {
                                  color:
                                    option.text === theme.colors.textOnDark
                                      ? "rgba(245,250,255,0.8)"
                                      : theme.colors.muted,
                                },
                              ]}
                            >
                              {option.subtitle}
                            </Text>
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                  {socialProviders.every((option) => !option.enabled) ? (
                    <View style={styles.providerFallbackNote}>
                      <Text style={styles.providerFallbackTitle}>
                        Social auth is intentionally quiet in this build.
                      </Text>
                      <Text style={styles.providerFallbackBody}>
                        Google, Facebook, and Apple remain available in the codebase,
                        but they are disabled until the Supabase provider settings are
                        configured for the showcase project.
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.devCard}>
                  <Text style={styles.devCardTitle}>OAuth is paused in fallback mode</Text>
                  <Text style={styles.devCardBody}>
                    Set the Supabase env values to unlock Google, Facebook, and Apple login buttons.
                  </Text>
                </View>
              )}

              <View style={styles.authModeRow}>
                {[
                  { key: "sign-in", label: "Sign in" },
                  { key: "sign-up", label: "Create account" },
                ].map((option) => (
                  <Pressable
                    key={option.key}
                    onPress={() => setMode(option.key as AuthMode)}
                    style={[
                      styles.authModeChip,
                      mode === option.key && styles.authModeChipActive,
                    ]}
                  >
                    <Text
                      style={[
                        styles.authModeChipText,
                        mode === option.key && styles.authModeChipTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {mode === "sign-up" ? (
                <TextInput
                  autoCapitalize="words"
                  onChangeText={setDisplayName}
                  placeholder="Display name"
                  placeholderTextColor={theme.colors.muted}
                  style={styles.input}
                  value={displayName}
                />
              ) : null}

              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="Email"
                placeholderTextColor={theme.colors.muted}
                style={styles.input}
                value={email}
              />

              <TextInput
                autoCapitalize="none"
                autoComplete="password"
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor={theme.colors.muted}
                secureTextEntry
                style={styles.input}
                value={password}
              />

              <Text style={styles.authHint}>
                {hasSupabaseConfig
                  ? `Continue will ${mode === "sign-in" ? "sign you in" : "create your explorer account"}.`
                  : "Supabase is not configured here, so continue will open the local explorer fallback."}
              </Text>

              {message ? <Text style={styles.message}>{message}</Text> : null}
              {busy ? (
                <View style={styles.busyRow}>
                  <ActivityIndicator color={theme.colors.accent} />
                </View>
              ) : null}
            </>
          )}

          <View style={styles.devCard}>
            <Text style={styles.devCardTitle}>Need to test quickly?</Text>
            <Text style={styles.devCardBody}>
              Skip for now enters a local explorer mode so you can reach the Home
              tab immediately without getting stuck in setup.
            </Text>
          </View>
        </View>
      ) : null}
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  authHint: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  authModeChip: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  authModeChipActive: {
    backgroundColor: theme.colors.deep,
    borderColor: theme.colors.deep,
  },
  authModeChipText: {
    color: theme.colors.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  authModeChipTextActive: {
    color: theme.colors.textOnDark,
  },
  authModeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  providerBadge: {
    alignItems: "center",
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  providerBadgeText: {
    fontSize: 14,
    fontWeight: "900",
  },
  providerButton: {
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  providerButtonDisabled: {
    opacity: 0.72,
  },
  providerCard: {
    backgroundColor: theme.colors.cardAlt,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  providerEyebrow: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  providerFallbackBody: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  providerFallbackNote: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 4,
    padding: 14,
  },
  providerFallbackTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 14,
  },
  providerNotice: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  providerStack: {
    gap: 10,
  },
  providerSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 2,
  },
  providerTitle: {
    fontFamily: "SpaceMono",
    fontSize: 15,
  },
  busyRow: {
    alignItems: "center",
    paddingTop: 4,
  },
  devCard: {
    backgroundColor: theme.colors.sponsorSoft,
    borderColor: "rgba(242,138,26,0.18)",
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  devCardBody: {
    color: theme.colors.sponsorText,
    fontSize: 13,
    lineHeight: 20,
  },
  devCardTitle: {
    color: theme.colors.sponsorText,
    fontFamily: "SpaceMono",
    fontSize: 15,
  },
  featureBody: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  featureCard: {
    backgroundColor: theme.colors.cardAlt,
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minWidth: "46%",
    padding: 16,
  },
  featureGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 18,
  },
  featureIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.badgeSoft,
    borderRadius: 14,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  featureTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 15,
    marginTop: 12,
  },
  helperPill: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  helperPillText: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  inlineHero: {
    flexDirection: "row",
    gap: 16,
  },
  input: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    color: theme.colors.ink,
    fontSize: 15,
    minHeight: 54,
    paddingHorizontal: 16,
  },
  loopBody: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 4,
  },
  loopCard: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.cardAlt,
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  loopIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.rewardSoft,
    borderRadius: 14,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  loopTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 15,
  },
  message: {
    color: theme.colors.coral,
    fontSize: 13,
    lineHeight: 20,
  },
  panel: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 30,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  panelBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  panelTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 20,
    lineHeight: 24,
  },
  readyBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  readyCard: {
    backgroundColor: theme.colors.badgeSoft,
    borderColor: "rgba(45,183,255,0.16)",
    borderRadius: 22,
    borderWidth: 1,
    gap: 8,
    padding: 16,
  },
  readyDot: {
    backgroundColor: theme.colors.emerald,
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  readyTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 17,
  },
  rewardStrip: {
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
    padding: 18,
  },
  rewardStripBody: {
    color: "rgba(245,250,255,0.82)",
    fontSize: 13,
    lineHeight: 20,
  },
  rewardStripTitle: {
    color: theme.colors.textOnDark,
    fontFamily: "SpaceMono",
    fontSize: 16,
  },
  routeBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.deep,
    borderRadius: 18,
    height: 50,
    justifyContent: "center",
    width: 50,
  },
});
