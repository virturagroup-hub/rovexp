import { LinearGradient } from "expo-linear-gradient";
import type { QuestRarity } from "@rovexp/types";
import type { StyleProp, TextStyle, ViewStyle } from "react-native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { rarityColors, theme } from "@/constants/theme";

interface ScreenViewProps {
  children: React.ReactNode;
}

interface SectionHeaderProps {
  actionLabel?: string;
  eyebrow?: string;
  onActionPress?: () => void;
  subtitle?: string;
  title: string;
}

interface ActionButtonProps {
  disabled?: boolean;
  label: string;
  onPress?: () => void;
  secondary?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

interface PillProps {
  label: string;
}

interface EmptyStateCardProps {
  actionLabel?: string;
  onPress?: () => void;
  subtitle: string;
  title: string;
}

interface ScreenHeaderProps {
  eyebrow: string;
  rightSlot?: React.ReactNode;
  subtitle: string;
  title: string;
}

export function ScreenView({ children }: ScreenViewProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={theme.gradients.appChrome}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={styles.backgroundLayer}>
        <View style={[styles.glow, styles.cyanGlow]} />
        <View style={[styles.glow, styles.goldGlow]} />
      </View>
      <View style={styles.content}>{children}</View>
    </SafeAreaView>
  );
}

export function ScreenHeader({
  eyebrow,
  rightSlot,
  subtitle,
  title,
}: ScreenHeaderProps) {
  return (
    <View style={styles.screenHeader}>
      <View style={styles.screenHeaderText}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.heroTitle}>{title}</Text>
        <Text style={styles.heroSubtitle}>{subtitle}</Text>
      </View>
      {rightSlot}
    </View>
  );
}

export function SectionHeader({
  actionLabel,
  eyebrow,
  onActionPress,
  subtitle,
  title,
}: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderText}>
        {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {actionLabel && onActionPress ? (
        <Pressable onPress={onActionPress} style={styles.linkPill}>
          <Text style={styles.linkPillText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ActionButton({
  disabled,
  label,
  onPress,
  secondary,
  style,
  textStyle,
}: ActionButtonProps) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={[styles.actionButtonShell, disabled && styles.disabledButton, style]}
    >
      {secondary ? (
        <View style={[styles.actionButton, styles.secondaryActionButton]}>
          <Text
            style={[
              styles.actionButtonText,
              styles.secondaryActionButtonText,
              textStyle,
            ]}
          >
            {label}
          </Text>
        </View>
      ) : (
        <LinearGradient
          colors={theme.gradients.primaryButton}
          end={{ x: 1, y: 0.9 }}
          start={{ x: 0, y: 0 }}
          style={[styles.actionButton, styles.primaryActionButton]}
        >
          <Text style={[styles.actionButtonText, textStyle]}>{label}</Text>
        </LinearGradient>
      )}
    </Pressable>
  );
}

export function CategoryPill({ label }: PillProps) {
  return (
    <View style={styles.categoryPill}>
      <Text style={styles.categoryPillText}>{label}</Text>
    </View>
  );
}

export function RarityPill({ rarity }: { rarity: QuestRarity }) {
  const palette = rarityColors[rarity];

  return (
    <LinearGradient
      colors={[palette.background[0], palette.background[1]]}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={[styles.rarityPill, { borderColor: palette.border }]}
    >
      <Text style={[styles.rarityPillText, { color: palette.tint }]}>
        {rarity.toUpperCase()}
      </Text>
    </LinearGradient>
  );
}

export function EmptyStateCard({
  actionLabel,
  onPress,
  subtitle,
  title,
}: EmptyStateCardProps) {
  return (
    <LinearGradient
      colors={theme.gradients.surfaceGlow}
      end={{ x: 1, y: 1 }}
      start={{ x: 0, y: 0 }}
      style={styles.emptyCard}
    >
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
      {actionLabel && onPress ? (
        <View style={{ marginTop: 16 }}>
          <ActionButton label={actionLabel} onPress={onPress} secondary />
        </View>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    alignItems: "center",
    borderRadius: 18,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  actionButtonShell: {
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
  },
  actionButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  backgroundLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  categoryPill: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.badgeSoft,
    borderColor: theme.colors.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  categoryPillText: {
    color: theme.colors.badgeText,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  content: {
    flex: 1,
  },
  cyanGlow: {
    backgroundColor: "rgba(45, 183, 255, 0.16)",
    height: 280,
    left: -50,
    top: 70,
    width: 280,
  },
  disabledButton: {
    opacity: 0.48,
  },
  emptyCard: {
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    overflow: "hidden",
    padding: 20,
  },
  emptySubtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 24,
    marginTop: 8,
  },
  emptyTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 20,
  },
  eyebrow: {
    color: theme.colors.deepBlue,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  glow: {
    borderRadius: 999,
    opacity: 1,
    position: "absolute",
  },
  goldGlow: {
    backgroundColor: "rgba(245, 184, 46, 0.14)",
    height: 220,
    right: -40,
    top: 220,
    width: 220,
  },
  heroSubtitle: {
    color: theme.colors.muted,
    fontSize: 15,
    lineHeight: 24,
    marginTop: 8,
  },
  heroTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 28,
    lineHeight: 34,
    marginTop: 8,
  },
  linkPill: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.divider,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  linkPillText: {
    color: theme.colors.deepBlue,
    fontSize: 13,
    fontWeight: "800",
  },
  primaryActionButton: {
    shadowColor: theme.colors.shadowStrong,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
  },
  rarityPill: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rarityPillText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  safeArea: {
    backgroundColor: theme.colors.canvas,
    flex: 1,
  },
  screenHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  screenHeaderText: {
    flex: 1,
    gap: 2,
    paddingRight: 16,
  },
  sectionHeader: {
    alignItems: "flex-end",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionHeaderText: {
    flex: 1,
    paddingRight: 12,
  },
  sectionSubtitle: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 4,
  },
  sectionTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 22,
    marginTop: 6,
  },
  secondaryActionButton: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderWidth: 1,
  },
  secondaryActionButtonText: {
    color: theme.colors.ink,
  },
});
