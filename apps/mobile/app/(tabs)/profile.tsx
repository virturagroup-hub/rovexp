import { router } from "expo-router";
import { Medal, ShieldCheck } from "lucide-react-native";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { SettingsButton } from "@/components/settings-button";
import {
  ActionButton,
  EmptyStateCard,
  ScreenHeader,
  ScreenView,
  SectionHeader,
} from "@/components/ui";
import { theme } from "@/constants/theme";
import { tabBarLayout } from "@/constants/navigation";
import { useProfileSummaryQuery } from "@/hooks/use-rovexp-data";
import { signOutMobileSession } from "@/services/auth";
import { useAppStore } from "@/store/app-store";

export default function ProfileScreen() {
  const { data } = useProfileSummaryQuery();
  const authMode = useAppStore((state) => state.authMode);
  const signOut = useAppStore((state) => state.signOut);

  const initials = (data?.profile.display_name ?? "Explorer")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <ScreenView>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Profile"
          rightSlot={<SettingsButton />}
          subtitle="XP, titles, badges, and identity settings now all come from the same account surface."
          title="Explorer profile"
        />

        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>@{data?.profile.username}</Text>
          <Text style={styles.homeState}>
            Public handle used on leaderboards. Private display name stays tucked away.
          </Text>
          {authMode === "demo" ? (
            <View style={styles.demoPill}>
              <Text style={styles.demoPillText}>Demo mode active</Text>
            </View>
          ) : null}
          <View style={styles.identityBlock}>
            <Text style={styles.identityLabel}>Private display name</Text>
            <Text style={styles.identityValue}>{data?.profile.display_name ?? "Explorer"}</Text>
          </View>
          <View style={styles.identityBlock}>
            <Text style={styles.identityLabel}>Friend code</Text>
            <Text style={styles.friendCode}>{data?.profile.friend_code ?? "RV-EXPLOR"}</Text>
          </View>
          {data?.home_state ? (
            <Text style={styles.homeState}>Home base: {data.home_state.name}</Text>
          ) : null}
          {data?.equipped_title ? (
            <View style={styles.titlePill}>
              <Medal color={theme.colors.amber} size={16} />
              <Text style={styles.titlePillText}>{data.equipped_title.name}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>XP total</Text>
            <Text style={styles.summaryValue}>{data?.overall_stats.xp_total ?? 0}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Completed</Text>
            <Text style={styles.summaryValue}>
              {data?.overall_stats.quests_completed ?? 0}
            </Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Reviews</Text>
            <Text style={styles.summaryValue}>
              {data?.overall_stats.reviews_count ?? 0}
            </Text>
          </View>
        </View>

        <View>
          <SectionHeader
            eyebrow="Badges"
            subtitle="Featured badge previews that hint at the fuller collection system coming next."
            title="Badge shelf"
          />
          {data?.featured_badges.length ? (
            <View style={styles.badgeGrid}>
              {data.featured_badges.map((badge) => (
                <View key={badge.id} style={styles.badgeCard}>
                  <View style={styles.badgeIcon}>
                    <ShieldCheck color={theme.colors.accent} size={16} />
                  </View>
                  <Text style={styles.badgeName}>{badge.name}</Text>
                  <Text style={styles.badgeDescription}>{badge.description}</Text>
                </View>
              ))}
            </View>
          ) : (
            <EmptyStateCard
              title="Badge shelf is still warming up"
              subtitle="This profile will start collecting featured badge previews as more quests and titles are unlocked."
            />
          )}
        </View>

        <ActionButton
          label="Edit profile"
          onPress={() => router.push("/profile-edit")}
        />
        <ActionButton
          label="Open settings"
          onPress={() => router.push("/settings")}
          secondary
        />
        <ActionButton
          label="Sign out"
          onPress={async () => {
            await signOutMobileSession();
            signOut();
            router.replace("/welcome");
          }}
          secondary
        />
      </ScrollView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    backgroundColor: theme.colors.deep,
    borderRadius: 999,
    height: 84,
    justifyContent: "center",
    width: 84,
  },
  avatarText: {
    color: theme.colors.white,
    fontFamily: "SpaceMono",
    fontSize: 26,
  },
  badgeCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    minWidth: "46%",
    padding: 16,
  },
  badgeDescription: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  badgeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  demoPill: {
    alignItems: "center",
    backgroundColor: theme.colors.sponsorSoft,
    borderColor: "rgba(242,138,26,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  demoPillText: {
    color: theme.colors.sponsorText,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  badgeIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderRadius: 16,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  badgeName: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 15,
    marginTop: 12,
  },
  container: {
    gap: 20,
    padding: theme.spacing.screen,
    paddingBottom: tabBarLayout.screenBottomPadding,
  },
  heroCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    padding: 22,
  },
  homeState: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 6,
  },
  identityBlock: {
    alignItems: "center",
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: "100%",
  },
  identityLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  identityValue: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 16,
  },
  friendCode: {
    color: theme.colors.deepBlue,
    fontFamily: "SpaceMono",
    fontSize: 18,
  },
  name: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 24,
    marginTop: 14,
  },
  summaryCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flex: 1,
    minWidth: 96,
    padding: 16,
  },
  summaryLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryValue: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 24,
    marginTop: 8,
  },
  titlePill: {
    alignItems: "center",
    backgroundColor: theme.colors.rewardSoft,
    borderRadius: 999,
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  titlePillText: {
    color: theme.colors.rewardText,
    fontSize: 13,
    fontWeight: "800",
  },
  username: {
    color: theme.colors.muted,
    fontSize: 14,
    marginTop: 6,
  },
});
