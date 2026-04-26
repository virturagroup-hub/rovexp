import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { Compass, MapPin, Navigation, Sparkles } from "lucide-react-native";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { SettingsButton } from "@/components/settings-button";
import {
  ActionButton,
  EmptyStateCard,
  ScreenHeader,
  ScreenView,
  SectionHeader,
} from "@/components/ui";
import { tabBarLayout } from "@/constants/navigation";
import { theme } from "@/constants/theme";
import { formatDistanceMiles } from "@/lib/geo";

import type { QuestMapSurfaceProps } from "./quest-map.types";

export function QuestMapSurface({
  areaLabel,
  isLoading,
  locationPermission,
  nearbyQuests,
  preferredRadiusMiles,
  selectedQuest,
  setSelectedQuestId,
  sponsoredQuests,
  usingFallbackLocation,
  visibleQuests,
}: QuestMapSurfaceProps) {
  return (
    <ScreenView>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Map"
          rightSlot={<SettingsButton />}
          subtitle="Interactive quest cartography stays native on iOS and Android. On web, you can still scout nearby drops, sponsors, and jump into the same quest details."
          title="Quest territory"
        />

        <LinearGradient
          colors={theme.gradients.hero}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconShell}>
              <Compass color={theme.colors.textOnDark} size={22} />
            </View>
            <View style={styles.heroBadge}>
              <Sparkles color={theme.colors.amber} size={14} />
              <Text style={styles.heroBadgeText}>Web fallback</Text>
            </View>
          </View>
          <Text style={styles.heroEyebrow}>{areaLabel}</Text>
          <Text style={styles.heroTitle}>Quest discovery panel</Text>
          <Text style={styles.heroBody}>
            Interactive map controls are available on iOS and Android. On web, this
            scout board keeps the same feed useful with branded quest discovery and
            quick access into each quest detail view.
          </Text>
          <View style={styles.heroMetaRow}>
            <View style={styles.heroMetaPill}>
              <Navigation color={theme.colors.cyan} size={14} />
              <Text style={styles.heroMetaText}>
                Radius set to {preferredRadiusMiles} mi
              </Text>
            </View>
            <View style={styles.heroMetaPill}>
              <MapPin color={theme.colors.amber} size={14} />
              <Text style={styles.heroMetaText}>
                {usingFallbackLocation || locationPermission !== "granted"
                  ? "Using fallback district"
                  : "Location-aware feed"}
              </Text>
            </View>
          </View>
        </LinearGradient>

        {selectedQuest ? (
          <View style={styles.previewCard}>
            <SectionHeader
              eyebrow="Featured route"
              subtitle="Pick a quest from the scout board below, then jump straight into the full quest flow."
              title={selectedQuest.title}
            />
            <View style={styles.previewMetaRow}>
              <View style={styles.metaBadge}>
                <MapPin color={theme.colors.accent} size={14} />
                <Text style={styles.metaBadgeText}>{selectedQuest.category.name}</Text>
              </View>
              <View style={styles.metaBadge}>
                <Navigation color={theme.colors.deepBlue} size={14} />
                <Text style={styles.metaBadgeText}>
                  {formatDistanceMiles(selectedQuest.distanceMiles)}
                </Text>
              </View>
              {selectedQuest.is_sponsored ? (
                <View style={[styles.metaBadge, styles.metaBadgeSponsor]}>
                  <Text style={styles.metaBadgeSponsorText}>Sponsored</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.previewBody}>{selectedQuest.description}</Text>
            <ActionButton
              label="Open quest detail"
              onPress={() => router.push(`/quest/${selectedQuest.id}`)}
            />
          </View>
        ) : null}

        {sponsoredQuests.length ? (
          <View>
            <SectionHeader
              eyebrow="Sponsored trails"
              subtitle="Featured brand-backed quests stay visible on web even without the native interactive map."
              title="Sponsor highlights"
            />
            <View style={styles.sectionStack}>
              {sponsoredQuests.map((quest) => (
                <Pressable
                  key={quest.id}
                  onPress={() => setSelectedQuestId(quest.id)}
                  style={[styles.discoveryCard, styles.sponsorCard]}
                >
                  <View style={styles.discoveryHeaderRow}>
                    <View style={[styles.discoveryIcon, styles.sponsorIcon]}>
                      <Sparkles color={theme.colors.orange} size={16} />
                    </View>
                    <View style={styles.discoveryCopy}>
                      <Text style={styles.discoveryTitle}>{quest.title}</Text>
                      <Text style={styles.discoveryMeta}>
                        {quest.sponsor_business?.name ?? "Sponsored route"} ·{" "}
                        {formatDistanceMiles(quest.distanceMiles)}
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={2} style={styles.discoveryBody}>
                    {quest.description}
                  </Text>
                  <View style={styles.discoveryFooter}>
                    <Text style={styles.discoveryTag}>Sponsored</Text>
                    <Pressable
                      onPress={() => router.push(`/quest/${quest.id}`)}
                      style={styles.inlineLink}
                    >
                      <Text style={styles.inlineLinkText}>Open quest</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View>
          <SectionHeader
            eyebrow="Scout board"
            subtitle="A web-safe quest list for exploration when the native map canvas is unavailable."
            title="Nearby quests"
          />
          {isLoading ? (
            <View style={styles.loadingCard}>
              <Text style={styles.loadingTitle}>Loading nearby routes...</Text>
              <Text style={styles.loadingBody}>
                Pulling the same quest feed used by the native map.
              </Text>
            </View>
          ) : nearbyQuests.length ? (
            <View style={styles.sectionStack}>
              {nearbyQuests.map((quest) => (
                <Pressable
                  key={quest.id}
                  onPress={() => setSelectedQuestId(quest.id)}
                  style={styles.discoveryCard}
                >
                  <View style={styles.discoveryHeaderRow}>
                    <View style={styles.discoveryIcon}>
                      <MapPin
                        color={
                          quest.is_sponsored ? theme.colors.orange : theme.colors.accent
                        }
                        size={16}
                      />
                    </View>
                    <View style={styles.discoveryCopy}>
                      <Text style={styles.discoveryTitle}>{quest.title}</Text>
                      <Text style={styles.discoveryMeta}>
                        {quest.state.code} · {formatDistanceMiles(quest.distanceMiles)} ·{" "}
                        {quest.xp_reward} XP
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={2} style={styles.discoveryBody}>
                    {quest.description}
                  </Text>
                  <View style={styles.discoveryFooter}>
                    <Text style={styles.discoveryTag}>{quest.category.name}</Text>
                    <Pressable
                      onPress={() => router.push(`/quest/${quest.id}`)}
                      style={styles.inlineLink}
                    >
                      <Text style={styles.inlineLinkText}>Open quest</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : visibleQuests.length ? (
            <View style={styles.sectionStack}>
              {visibleQuests.map((quest) => (
                <Pressable
                  key={quest.id}
                  onPress={() => setSelectedQuestId(quest.id)}
                  style={styles.discoveryCard}
                >
                  <View style={styles.discoveryHeaderRow}>
                    <View style={styles.discoveryIcon}>
                      <MapPin
                        color={
                          quest.is_sponsored ? theme.colors.orange : theme.colors.accent
                        }
                        size={16}
                      />
                    </View>
                    <View style={styles.discoveryCopy}>
                      <Text style={styles.discoveryTitle}>{quest.title}</Text>
                      <Text style={styles.discoveryMeta}>
                        {quest.state.code} · {formatDistanceMiles(quest.distanceMiles)} ·{" "}
                        {quest.xp_reward} XP
                      </Text>
                    </View>
                  </View>
                  <Text numberOfLines={2} style={styles.discoveryBody}>
                    {quest.description}
                  </Text>
                  <View style={styles.discoveryFooter}>
                    <Text style={styles.discoveryTag}>{quest.category.name}</Text>
                    <Pressable
                      onPress={() => router.push(`/quest/${quest.id}`)}
                      style={styles.inlineLink}
                    >
                      <Text style={styles.inlineLinkText}>Open quest</Text>
                    </Pressable>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyStateCard
              subtitle="Try relaxing one of your saved filters or increasing the preferred radius to refresh the scout board."
              title="No visible quests"
            />
          )}
        </View>
      </ScrollView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    padding: theme.spacing.screen,
    paddingBottom: tabBarLayout.screenBottomPadding,
  },
  discoveryBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  discoveryCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  discoveryCopy: {
    flex: 1,
  },
  discoveryFooter: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  discoveryHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  discoveryIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.badgeSoft,
    borderRadius: 16,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  discoveryMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  discoveryTag: {
    color: theme.colors.deepBlue,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  discoveryTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 16,
  },
  heroBadge: {
    alignItems: "center",
    backgroundColor: "rgba(245,250,255,0.12)",
    borderColor: "rgba(245,250,255,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroBadgeText: {
    color: theme.colors.textOnDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  heroBody: {
    color: "rgba(245,250,255,0.84)",
    fontSize: 14,
    lineHeight: 22,
  },
  heroCard: {
    borderRadius: 30,
    gap: 14,
    overflow: "hidden",
    padding: 22,
  },
  heroEyebrow: {
    color: "rgba(245,250,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.2,
    textTransform: "uppercase",
  },
  heroIconShell: {
    alignItems: "center",
    backgroundColor: "rgba(245,250,255,0.16)",
    borderColor: "rgba(245,250,255,0.18)",
    borderRadius: 18,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  heroMetaPill: {
    alignItems: "center",
    backgroundColor: "rgba(245,250,255,0.1)",
    borderColor: "rgba(245,250,255,0.12)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  heroMetaText: {
    color: theme.colors.textOnDark,
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: {
    color: theme.colors.textOnDark,
    fontFamily: "SpaceMono",
    fontSize: 24,
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  inlineLink: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  inlineLinkText: {
    color: theme.colors.deepBlue,
    fontSize: 12,
    fontWeight: "800",
  },
  loadingBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 6,
  },
  loadingCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
  },
  loadingTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 18,
  },
  metaBadge: {
    alignItems: "center",
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaBadgeSponsor: {
    backgroundColor: theme.colors.sponsorSoft,
    borderColor: "rgba(242,138,26,0.18)",
  },
  metaBadgeSponsorText: {
    color: theme.colors.sponsorText,
    fontSize: 12,
    fontWeight: "800",
  },
  metaBadgeText: {
    color: theme.colors.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  previewBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  previewCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  previewMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  sectionStack: {
    gap: 12,
  },
  sponsorCard: {
    backgroundColor: theme.colors.sponsorSoft,
    borderColor: "rgba(242,138,26,0.2)",
  },
  sponsorIcon: {
    backgroundColor: "rgba(245,184,46,0.16)",
  },
});
