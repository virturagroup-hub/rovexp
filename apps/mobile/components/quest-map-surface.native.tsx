import { router } from "expo-router";
import Constants from "expo-constants";
import { MapPin, Navigation } from "lucide-react-native";
import {
  Pressable,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import MapView, {
  Marker,
  PROVIDER_DEFAULT,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import { useEffect, useMemo, useRef, useState } from "react";

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
import { mobileEnv } from "@/lib/env";
import { formatDistanceMiles } from "@/lib/geo";

import type { QuestMapSurfaceProps } from "./quest-map.types";

export function QuestMapSurface({
  areaLabel,
  centerLatitude,
  centerLongitude,
  isLoading,
  locationPermission,
  questProgress,
  selectedQuest,
  setSelectedQuestId,
  visibleQuests,
}: QuestMapSurfaceProps) {
  const mapRef = useRef<MapView | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapMarkerQuests = useMemo(
    () =>
      visibleQuests.filter(
        (quest) =>
          Number.isFinite(quest.latitude) && Number.isFinite(quest.longitude),
      ),
    [visibleQuests],
  );

  useEffect(() => {
    if (!mapReady || !mapMarkerQuests.length) {
      return;
    }

    const handle = requestAnimationFrame(() => {
      const coordinates = mapMarkerQuests.map((quest) => ({
        latitude: quest.latitude,
        longitude: quest.longitude,
      }));

      if (coordinates.length === 1) {
        const [coordinate] = coordinates;

        if (!coordinate) {
          return;
        }

        mapRef.current?.animateToRegion(
          {
            latitude: coordinate.latitude,
            latitudeDelta: 0.045,
            longitude: coordinate.longitude,
            longitudeDelta: 0.045,
          },
          500,
        );
        return;
      }

      mapRef.current?.fitToCoordinates(coordinates, {
        animated: true,
        edgePadding: {
          bottom: 128,
          left: 72,
          right: 72,
          top: 88,
        },
      });
    });

    return () => cancelAnimationFrame(handle);
  }, [mapMarkerQuests, mapReady]);

  const androidMapKeyReady =
    Platform.OS !== "android" ||
    Constants.executionEnvironment === "storeClient" ||
    Boolean(mobileEnv.androidGoogleMapsApiKey);

  return (
    <ScreenView>
      <ScrollView
        contentContainerStyle={styles.container}
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Map"
          rightSlot={<SettingsButton />}
          subtitle="Live quest markers, sponsor distinction, and progress-aware marker states are tied into the same feed as Home and Quests."
          title="Quest territory"
        />

        <View style={styles.mapCard}>
          <Text style={styles.mapEyebrow}>{areaLabel}</Text>
          <Text style={styles.mapTitle}>Nearby quest field</Text>
          <Text style={styles.mapBody}>
            {locationPermission === "granted"
              ? "Your live position drives the map center and keeps the nearby board grounded in where you are right now."
              : "Location is unavailable, so the map is centered on the fallback exploration district until permission is restored."}
          </Text>

          <View style={styles.mapCanvas}>
            {!androidMapKeyReady ? (
              <View style={styles.mapLoadingState}>
                <Text style={styles.mapLoadingText}>
                  Android map key not configured
                </Text>
                <Text style={styles.mapLoadingDetail}>
                  Add EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY for standalone
                  Android builds so the quest map can render.
                </Text>
              </View>
            ) : isLoading ? (
              <View style={styles.mapLoadingState}>
                <Text style={styles.mapLoadingText}>Loading quest markers...</Text>
              </View>
            ) : mapMarkerQuests.length ? (
                <MapView
                  onMapReady={() => setMapReady(true)}
                  ref={mapRef}
                  initialRegion={{
                    latitude: centerLatitude,
                  latitudeDelta: 0.075,
                    longitude: centerLongitude,
                    longitudeDelta: 0.075,
                  }}
                provider={Platform.OS === "android" ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
                  showsUserLocation={locationPermission === "granted"}
                  style={StyleSheet.absoluteFill}
                >
                {mapMarkerQuests.map((quest) => {
                  const status = questProgress[quest.id]?.status ?? "available";
                  const pinColor =
                    status === "completed" || status === "reviewed"
                      ? theme.colors.emerald
                      : status === "accepted" || status === "checked_in"
                        ? theme.colors.accent
                        : quest.is_sponsored
                          ? theme.colors.coral
                          : theme.colors.deep;

                  return (
                    <Marker
                      key={quest.id}
                      coordinate={{
                        latitude: quest.latitude,
                        longitude: quest.longitude,
                      }}
                      description={`${quest.xp_reward} XP · ${formatDistanceMiles(quest.distanceMiles)}`}
                      onPress={() => setSelectedQuestId(quest.id)}
                      pinColor={pinColor}
                      title={quest.title}
                    />
                  );
                })}
              </MapView>
            ) : (
              <EmptyStateCard
                subtitle="Once nearby quests match your radius and filters, they will appear here as live markers."
                title="No map markers yet"
              />
            )}
          </View>
        </View>

        {locationPermission === "denied" ? (
          <EmptyStateCard
            subtitle="Browsing still works with the fallback district, but real map centering and server-backed check-ins need foreground location enabled."
            title="Location access is off"
          />
        ) : null}

        {selectedQuest ? (
          <View style={styles.previewCard}>
            <SectionHeader
              eyebrow="Selected marker"
              subtitle="Markers inherit quest status and sponsor styling from the live feed."
              title={selectedQuest.title}
            />
            <View style={styles.previewMetaRow}>
              <View style={styles.metaBadge}>
                <MapPin color={theme.colors.accent} size={14} />
                <Text style={styles.metaBadgeText}>{selectedQuest.category.name}</Text>
              </View>
              <View style={styles.metaBadge}>
                <Navigation color={theme.colors.deep} size={14} />
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

        <View>
          <SectionHeader
            eyebrow="Marker list"
            subtitle="A compact fallback list so the same map feed stays usable even if the native view is empty or permission-limited."
            title="Visible quests"
          />
          {visibleQuests.length ? (
            visibleQuests.map((quest) => (
              <Pressable
                key={quest.id}
                onPress={() => router.push(`/quest/${quest.id}`)}
                style={styles.markerCard}
              >
                <View style={styles.markerIcon}>
                  <MapPin
                    color={quest.is_sponsored ? theme.colors.coral : theme.colors.accent}
                    size={16}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.markerTitle}>{quest.title}</Text>
                  <Text style={styles.markerMeta}>
                    {quest.state.code} · {formatDistanceMiles(quest.distanceMiles)} away
                  </Text>
                </View>
              </Pressable>
            ))
          ) : (
            <EmptyStateCard
              subtitle="Try relaxing one of your saved filters or increasing the preferred radius."
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
  mapBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  mapCanvas: {
    backgroundColor: theme.colors.panelStrong,
    borderColor: theme.colors.border,
    borderRadius: 28,
    borderWidth: 1,
    minHeight: 320,
    overflow: "hidden",
    position: "relative",
  },
  mapCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 12,
    padding: 20,
  },
  mapEyebrow: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2.4,
    textTransform: "uppercase",
  },
  mapLoadingState: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    minHeight: 320,
    paddingHorizontal: 20,
  },
  mapLoadingDetail: {
    color: theme.colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 6,
    textAlign: "center",
  },
  mapLoadingText: {
    color: theme.colors.muted,
    fontSize: 14,
    textAlign: "center",
  },
  mapTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 22,
  },
  markerCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  markerIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderRadius: 16,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  markerMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  markerTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 16,
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
});
