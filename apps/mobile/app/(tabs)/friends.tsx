import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  BadgeCheck,
  Search,
  Sparkles,
  UsersRound,
} from "lucide-react-native";
import { useDeferredValue, useMemo, useState } from "react";
import {
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Share,
  View,
} from "react-native";

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
import {
  useFriendActivityQuery,
  useFriendHubQuery,
  useFriendMutations,
  useFriendSearchQuery,
  useLeaderboardQuery,
  useProfileSummaryQuery,
} from "@/hooks/use-rovexp-data";
import type {
  FriendHubEntry,
  FriendRelationshipStatus,
  FriendSearchResult,
} from "@rovexp/types";

type FriendPreview = {
  avatar_url: string | null;
  display_name: string | null;
  friendship_id: string | null;
  home_state_code: string | null;
  home_state_name: string | null;
  hidden_gems_completed: number;
  direction: FriendHubEntry["direction"] | null;
  friend_code: string | null;
  quests_completed: number;
  relationship_status: FriendRelationshipStatus;
  reviews_count: number;
  source: "hub" | "search";
  title_name: string | null;
  user_id: string;
  username: string;
  xp_total: number;
};

function formatRelativeTime(iso: string) {
  const diffMinutes = Math.max(
    Math.round((Date.now() - new Date(iso).getTime()) / 60000),
    0,
  );

  if (diffMinutes < 1) {
    return "just now";
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const hours = Math.round(diffMinutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.round(hours / 24);

  return `${days}d ago`;
}

function initialsForName(name: string) {
  return name
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function previewFromHub(entry: FriendHubEntry): FriendPreview {
  return {
    avatar_url: entry.other_avatar_url,
    display_name: entry.direction === "friend" ? entry.other_display_name : null,
    direction: entry.direction,
    friendship_id: entry.friendship_id,
    home_state_code: entry.other_home_state_code,
    home_state_name: entry.other_home_state_name,
    hidden_gems_completed: entry.other_hidden_gems_completed,
    friend_code: null,
    quests_completed: entry.other_quests_completed,
    relationship_status: entry.status === "accepted" ? "friend" : entry.direction,
    reviews_count: entry.other_reviews_count,
    source: "hub",
    title_name: entry.other_title_name,
    user_id: entry.other_user_id,
    username: entry.other_username,
    xp_total: entry.other_xp_total,
  };
}

function previewFromSearch(result: FriendSearchResult): FriendPreview {
  return {
    avatar_url: result.avatar_url,
    display_name: result.display_name ?? null,
    direction: null,
    friendship_id: null,
    home_state_code: result.home_state_code,
    home_state_name: result.home_state_name,
    hidden_gems_completed: result.hidden_gems_completed,
    friend_code: result.friend_code,
    quests_completed: result.quests_completed,
    relationship_status: result.relationship_status,
    reviews_count: result.reviews_count,
    source: "search",
    title_name: null,
    user_id: result.user_id,
    username: result.username,
    xp_total: result.xp_total,
  };
}

function statusLabel(status: FriendRelationshipStatus) {
  switch (status) {
    case "friend":
      return "Friend";
    case "incoming":
      return "Incoming";
    case "outgoing":
      return "Request sent";
    case "blocked":
      return "Blocked";
    default:
      return "New explorer";
  }
}

function actionLabel(status: FriendRelationshipStatus) {
  switch (status) {
    case "friend":
      return "Remove friend";
    case "incoming":
      return "Accept request";
    case "outgoing":
      return "Cancel request";
    case "blocked":
      return "Blocked";
    default:
      return "Send friend request";
  }
}

export default function FriendsScreen() {
  const [searchTerm, setSearchTerm] = useState("");
  const [friendCodeInput, setFriendCodeInput] = useState("");
  const [selectedPreview, setSelectedPreview] = useState<FriendPreview | null>(null);
  const deferredSearchTerm = useDeferredValue(searchTerm);

  const { data: profileSummary } = useProfileSummaryQuery();
  const { data: leaderboard } = useLeaderboardQuery(profileSummary?.home_state?.id ?? null);
  const { data: hubEntries = [], isLoading: hubLoading } = useFriendHubQuery();
  const { data: activityItems = [], isLoading: activityLoading } = useFriendActivityQuery();
  const { data: searchResults = [], isFetching: searchLoading } =
    useFriendSearchQuery(deferredSearchTerm);
  const {
    acceptMutation,
    deleteMutation,
    requestByCodeMutation,
    requestMutation,
  } = useFriendMutations();

  const acceptedFriends = useMemo(
    () => hubEntries.filter((entry) => entry.direction === "friend"),
    [hubEntries],
  );
  const incomingRequests = useMemo(
    () => hubEntries.filter((entry) => entry.direction === "incoming"),
    [hubEntries],
  );
  const outgoingRequests = useMemo(
    () => hubEntries.filter((entry) => entry.direction === "outgoing"),
    [hubEntries],
  );
  const requestCount = incomingRequests.length + outgoingRequests.length;
  const friendCode = profileSummary?.profile.friend_code ?? "RV-EXPLOR";

  const leaderboardFriendsCount = Math.max((leaderboard?.friends.entries.length ?? 0) - 1, 0);

  const handleCopyFriendCode = async () => {
    try {
      await Clipboard.setStringAsync(friendCode);
      Alert.alert("Friend code copied", "Paste it anywhere or share it from the app.");
    } catch {
      Alert.alert(
        "Copy unavailable",
        "You can still share the code manually from the Friends tab.",
      );
    }
  };

  const handleShareFriendCode = async () => {
    try {
      await Share.share({
        message: `Join me in RoveXP with my friend code ${friendCode}. Search me in the app to connect.`,
      });
    } catch {
      Alert.alert("Share unavailable", "You can still copy your code and share it manually.");
    }
  };

  const handleInviteByCode = async () => {
    const normalized = friendCodeInput.trim();

    if (!normalized) {
      Alert.alert("Add a friend code", "Enter a code to send a request.");
      return;
    }

    try {
      await requestByCodeMutation.mutateAsync(normalized);
      setFriendCodeInput("");
      Alert.alert("Invite sent", "Your request was sent successfully.");
    } catch (error) {
      Alert.alert(
        "Could not send invite",
        error instanceof Error ? error.message : "Please try again.",
      );
    }
  };

  return (
    <ScreenView>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <ScreenHeader
          eyebrow="Friends"
          rightSlot={<SettingsButton />}
          subtitle="Social orbit is now live. Search explorers, manage requests, preview profiles, and watch friend activity roll in."
          title="Social orbit"
        />

        <LinearGradient
          colors={theme.gradients.heroAlt}
          end={{ x: 1, y: 1 }}
          start={{ x: 0, y: 0 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTopRow}>
            <View style={styles.heroIcon}>
              <UsersRound color={theme.colors.textOnDark} size={22} />
            </View>
            <View style={styles.heroPill}>
              <Sparkles color={theme.colors.amber} size={14} />
              <Text style={styles.heroPillText}>Live social graph</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Build your exploration orbit</Text>
          <Text style={styles.heroBody}>
            Accepted friends now feed the ladder, request actions are backed by Supabase,
            and each explorer has a quick profile preview right in the app.
          </Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{acceptedFriends.length}</Text>
              <Text style={styles.heroStatLabel}>Friends</Text>
            </View>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{requestCount}</Text>
              <Text style={styles.heroStatLabel}>Requests</Text>
            </View>
            <View style={styles.heroStatPill}>
              <Text style={styles.heroStatValue}>{leaderboardFriendsCount}</Text>
              <Text style={styles.heroStatLabel}>On ladder</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.codeCard}>
          <View style={styles.codeHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.codeEyebrow}>Your invite code</Text>
              <Text style={styles.codeTitle}>{friendCode}</Text>
              <Text style={styles.codeBody}>
                Share this code to connect without exposing your private display name.
              </Text>
            </View>
            <View style={styles.codeActions}>
              <Pressable onPress={handleCopyFriendCode} style={styles.codeActionButton}>
                <Text style={styles.codeActionText}>Copy</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleShareFriendCode()}
                style={styles.codeActionButtonPrimary}
              >
                <Text style={styles.codeActionTextPrimary}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.searchCard}>
          <SectionHeader
            eyebrow="Find explorers"
            subtitle="Search by username or friend code to send a request or open a quick profile preview."
            title="Invite someone new"
          />
          <View style={styles.searchField}>
            <Search color={theme.colors.deepBlue} size={18} />
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              onChangeText={setSearchTerm}
              placeholder="Search by username or code"
              placeholderTextColor={theme.colors.muted}
              style={styles.searchInput}
              value={searchTerm}
            />
            {searchLoading ? (
              <ActivityIndicator color={theme.colors.accent} />
            ) : null}
          </View>
          <View style={styles.codeInviteCard}>
            <Text style={styles.filterGroupLabel}>Add by code</Text>
            <View style={styles.codeInviteRow}>
              <TextInput
                autoCapitalize="characters"
                autoCorrect={false}
                onChangeText={setFriendCodeInput}
                placeholder="RV-ABC123"
                placeholderTextColor={theme.colors.muted}
                style={styles.codeInviteInput}
                value={friendCodeInput}
              />
              <Pressable
                onPress={() => void handleInviteByCode()}
                style={styles.codeInviteButton}
              >
                <Text style={styles.codeInviteButtonText}>
                  {requestByCodeMutation.isPending ? "Sending..." : "Send"}
                </Text>
              </Pressable>
            </View>
          </View>
          {deferredSearchTerm.trim().length < 2 ? (
            <Text style={styles.searchHint}>
              Type two or more characters to search by handle or friend code.
            </Text>
          ) : searchResults.length ? (
            <View style={styles.listStack}>
              {searchResults.map((result) => {
                const preview = previewFromSearch(result);

                return (
                  <Pressable
                    key={result.user_id}
                    onPress={() => setSelectedPreview(preview)}
                    style={styles.listCard}
                  >
                    <View style={styles.listAvatar}>
                      <Text style={styles.listAvatarText}>{initialsForName(result.username)}</Text>
                    </View>
                    <View style={styles.listCopy}>
                      <Text style={styles.listTitle}>@{result.username}</Text>
                      <Text style={styles.listMeta}>
                        {result.friend_code}
                        {result.home_state_code ? ` · ${result.home_state_code}` : ""}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.relationshipChip,
                        result.relationship_status === "friend" && styles.relationshipChipFriend,
                        result.relationship_status === "incoming" && styles.relationshipChipIncoming,
                        result.relationship_status === "outgoing" && styles.relationshipChipOutgoing,
                      ]}
                    >
                      <Text
                        style={[
                          styles.relationshipChipText,
                          result.relationship_status === "friend" &&
                            styles.relationshipChipTextDark,
                        ]}
                      >
                        {statusLabel(result.relationship_status)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <EmptyStateCard
              subtitle="No explorers matched that search yet. Try a different username or friend code."
              title="No matches"
            />
          )}
        </View>

        <Modal
          animationType="fade"
          transparent
          visible={Boolean(selectedPreview)}
          onRequestClose={() => setSelectedPreview(null)}
        >
          <View style={styles.previewModalBackdrop}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setSelectedPreview(null)}
              style={StyleSheet.absoluteFill}
            />
            <ScrollView
              contentContainerStyle={styles.previewModalScroll}
              showsVerticalScrollIndicator={false}
            >
              {selectedPreview ? (
                <View style={styles.previewCard}>
                  <SectionHeader
                    actionLabel="Close"
                    eyebrow="Profile preview"
                    onActionPress={() => setSelectedPreview(null)}
                    subtitle="Tap a person from search, your friends list, or requests to see a compact social snapshot."
                    title={
                      selectedPreview.relationship_status === "friend"
                        ? selectedPreview.display_name ?? `@${selectedPreview.username}`
                        : `@${selectedPreview.username}`
                    }
                  />
                  <View style={styles.previewTopRow}>
                    <View style={styles.previewAvatar}>
                      <Text style={styles.previewAvatarText}>
                        {initialsForName(
                          selectedPreview.relationship_status === "friend" &&
                            selectedPreview.display_name
                            ? selectedPreview.display_name
                            : selectedPreview.username,
                        )}
                      </Text>
                    </View>
                    <View style={styles.previewIntro}>
                      <Text style={styles.previewUsername}>@{selectedPreview.username}</Text>
                      {selectedPreview.friend_code ? (
                        <Text style={styles.previewState}>
                          Code: {selectedPreview.friend_code}
                        </Text>
                      ) : null}
                      <Text style={styles.previewState}>
                        {selectedPreview.home_state_code
                          ? `${selectedPreview.home_state_code}${
                              selectedPreview.home_state_name
                                ? ` · ${selectedPreview.home_state_name}`
                                : ""
                            }`
                          : "No home state set"}
                      </Text>
                      {selectedPreview.title_name ? (
                        <View style={styles.previewTitleChip}>
                          <BadgeCheck color={theme.colors.amber} size={14} />
                          <Text style={styles.previewTitleChipText}>
                            {selectedPreview.title_name}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.previewStats}>
                    <View style={styles.previewStatPill}>
                      <Text style={styles.previewStatValue}>{selectedPreview.xp_total}</Text>
                      <Text style={styles.previewStatLabel}>XP</Text>
                    </View>
                    <View style={styles.previewStatPill}>
                      <Text style={styles.previewStatValue}>
                        {selectedPreview.quests_completed}
                      </Text>
                      <Text style={styles.previewStatLabel}>Quests</Text>
                    </View>
                    <View style={styles.previewStatPill}>
                      <Text style={styles.previewStatValue}>
                        {selectedPreview.reviews_count}
                      </Text>
                      <Text style={styles.previewStatLabel}>Reviews</Text>
                    </View>
                    <View style={styles.previewStatPill}>
                      <Text style={styles.previewStatValue}>
                        {selectedPreview.hidden_gems_completed}
                      </Text>
                      <Text style={styles.previewStatLabel}>Gems</Text>
                    </View>
                  </View>

                  <View style={styles.previewRelationshipRow}>
                    <View
                      style={[
                        styles.relationshipChip,
                        selectedPreview.relationship_status === "friend" &&
                          styles.relationshipChipFriend,
                        selectedPreview.relationship_status === "incoming" &&
                          styles.relationshipChipIncoming,
                        selectedPreview.relationship_status === "outgoing" &&
                          styles.relationshipChipOutgoing,
                      ]}
                    >
                      <Text
                        style={[
                          styles.relationshipChipText,
                          selectedPreview.relationship_status === "friend" &&
                            styles.relationshipChipTextDark,
                        ]}
                      >
                        {statusLabel(selectedPreview.relationship_status)}
                      </Text>
                    </View>
                    {selectedPreview.direction === "friend" ? (
                      <Text style={styles.previewMicrocopy}>
                        Friend leaderboard entry and activity are now linked.
                      </Text>
                    ) : selectedPreview.direction === "incoming" ? (
                      <Text style={styles.previewMicrocopy}>
                        They sent you a request. Accept it to connect the ladders.
                      </Text>
                    ) : selectedPreview.direction === "outgoing" ? (
                      <Text style={styles.previewMicrocopy}>
                        Request sent. You can cancel it if you want to back out.
                      </Text>
                    ) : (
                      <Text style={styles.previewMicrocopy}>
                        Public profile only. Add them to unlock friend-visible details.
                      </Text>
                    )}
                  </View>

                  {selectedPreview.relationship_status === "incoming" ? (
                    <View style={styles.actionRow}>
                      <ActionButton
                        label="Accept"
                        onPress={() => {
                          if (selectedPreview.friendship_id) {
                            acceptMutation.mutate(selectedPreview.friendship_id);
                          }
                        }}
                        style={{ flex: 1 }}
                      />
                      <ActionButton
                        label="Decline"
                        onPress={() => {
                          if (selectedPreview.friendship_id) {
                            deleteMutation.mutate(selectedPreview.friendship_id);
                          }
                        }}
                        secondary
                        style={{ flex: 1 }}
                      />
                    </View>
                  ) : selectedPreview.relationship_status === "outgoing" ? (
                    <ActionButton
                      label="Cancel request"
                      onPress={() => {
                        if (selectedPreview.friendship_id) {
                          deleteMutation.mutate(selectedPreview.friendship_id);
                        }
                      }}
                      secondary
                    />
                  ) : selectedPreview.relationship_status === "friend" ? (
                    <ActionButton
                      label="Remove friend"
                      onPress={() => {
                        if (selectedPreview.friendship_id) {
                          deleteMutation.mutate(selectedPreview.friendship_id);
                        }
                      }}
                      secondary
                    />
                  ) : selectedPreview.relationship_status === "blocked" ? (
                    <EmptyStateCard
                      subtitle="This explorer is blocked for now. You can revisit later if the relationship changes."
                      title="Blocked"
                    />
                  ) : (
                    <ActionButton
                      label="Send friend request"
                      onPress={() => {
                        requestMutation.mutate(selectedPreview.user_id);
                      }}
                    />
                  )}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </Modal>

        <View>
          <SectionHeader
            eyebrow="Requests"
            subtitle="Manage incoming and outgoing requests without leaving the social hub."
            title="Pending connections"
          />
          {hubLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading your social graph...</Text>
            </View>
          ) : requestCount ? (
            <View style={styles.listStack}>
              {incomingRequests.map((entry) => (
                <Pressable
                  key={entry.friendship_id}
                  onPress={() => setSelectedPreview(previewFromHub(entry))}
                  style={styles.listCard}
                >
                  <View style={styles.listAvatar}>
                    <Text style={styles.listAvatarText}>
                      {initialsForName(entry.other_username)}
                    </Text>
                  </View>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>@{entry.other_username}</Text>
                    <Text style={styles.listMeta}>Incoming request</Text>
                  </View>
                  <View style={styles.pendingChip}>
                    <Text style={styles.pendingChipText}>Respond</Text>
                  </View>
                </Pressable>
              ))}
              {outgoingRequests.map((entry) => (
                <Pressable
                  key={entry.friendship_id}
                  onPress={() => setSelectedPreview(previewFromHub(entry))}
                  style={styles.listCard}
                >
                  <View style={styles.listAvatar}>
                    <Text style={styles.listAvatarText}>
                      {initialsForName(entry.other_username)}
                    </Text>
                  </View>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>@{entry.other_username}</Text>
                    <Text style={styles.listMeta}>Request sent</Text>
                  </View>
                  <View style={styles.outgoingChip}>
                    <Text style={styles.outgoingChipText}>Waiting</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyStateCard
              actionLabel="Find explorers"
              onPress={() => setSearchTerm("riley")}
              subtitle="No pending requests right now. Use the search panel above to invite someone new."
              title="All clear"
            />
          )}
        </View>

        <View>
          <SectionHeader
            eyebrow="Friends"
            subtitle="Accepted friendships feed the ladder and keep the orbit connected."
            title="Accepted friends"
          />
          {hubLoading ? null : acceptedFriends.length ? (
            <View style={styles.listStack}>
              {acceptedFriends.map((entry) => (
                <Pressable
                  key={entry.friendship_id}
                  onPress={() => setSelectedPreview(previewFromHub(entry))}
                  style={styles.listCard}
                >
                  <View style={styles.listAvatar}>
                    <Text style={styles.listAvatarText}>
                      {initialsForName(entry.other_display_name)}
                    </Text>
                  </View>
                  <View style={styles.listCopy}>
                    <Text style={styles.listTitle}>{entry.other_display_name}</Text>
                    <Text style={styles.listMeta}>
                      @{entry.other_username} · {entry.other_xp_total} XP
                    </Text>
                  </View>
                  <View style={styles.friendChip}>
                    <Text style={styles.friendChipText}>Friend</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ) : (
            <EmptyStateCard
              actionLabel="Open leaderboards"
              onPress={() => router.push("/leaderboards")}
              subtitle="Accepted friends will appear here once your first request is accepted."
              title="No accepted friends yet"
            />
          )}
        </View>

        <View>
          <SectionHeader
            eyebrow="Activity"
            subtitle="Recent completions and reviews from your friends show up here as the network wakes up."
            title="Friend activity"
          />
          {activityLoading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={theme.colors.accent} />
              <Text style={styles.loadingText}>Loading recent activity...</Text>
            </View>
          ) : activityItems.length ? (
            <View style={styles.activityStack}>
              {activityItems.map((item) => (
                <View key={item.activity_id} style={styles.activityCard}>
                  <View style={styles.activityIcon}>
                    {item.activity_type === "quest_completed" ? (
                      <Sparkles color={theme.colors.amber} size={16} />
                    ) : (
                      <BadgeCheck color={theme.colors.accent} size={16} />
                    )}
                  </View>
                  <View style={styles.activityCopy}>
                    <Text style={styles.activityTitle}>@{item.username}</Text>
                    <Text style={styles.activityBody}>
                      {item.activity_type === "quest_completed"
                        ? `completed ${item.quest_title}`
                        : `posted a ${item.rating}-star review for ${item.quest_title}`}
                    </Text>
                    <Text style={styles.activityMeta}>
                      {item.state_code ? `${item.state_code} · ` : ""}
                      {formatRelativeTime(item.created_at)}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <EmptyStateCard
              subtitle="Once friends start exploring, their completions and reviews will flow into this section."
              title="No activity yet"
            />
          )}
        </View>

        <ActionButton
          label="Open leaderboards"
          onPress={() => router.push("/leaderboards")}
        />
      </ScrollView>
    </ScreenView>
  );
}

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  activityBody: {
    color: theme.colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 4,
  },
  activityCard: {
    alignItems: "flex-start",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  activityCopy: {
    flex: 1,
  },
  activityIcon: {
    alignItems: "center",
    backgroundColor: theme.colors.panel,
    borderRadius: 16,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  activityMeta: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  activityStack: {
    gap: 12,
  },
  activityTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 16,
  },
  container: {
    gap: 20,
    padding: theme.spacing.screen,
    paddingBottom: tabBarLayout.screenBottomPadding,
  },
  friendChip: {
    alignItems: "center",
    backgroundColor: theme.colors.emerald,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  friendChipText: {
    color: theme.colors.textOnDark,
    fontSize: 12,
    fontWeight: "800",
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
  heroIcon: {
    alignItems: "center",
    backgroundColor: "rgba(245,250,255,0.16)",
    borderColor: "rgba(245,250,255,0.16)",
    borderRadius: 18,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  heroPill: {
    alignItems: "center",
    backgroundColor: "rgba(245,250,255,0.12)",
    borderColor: "rgba(245,250,255,0.14)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  heroPillText: {
    color: theme.colors.textOnDark,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  heroStatLabel: {
    color: "rgba(245,250,255,0.72)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
    marginTop: 2,
    textTransform: "uppercase",
  },
  heroStatPill: {
    backgroundColor: "rgba(245,250,255,0.1)",
    borderColor: "rgba(245,250,255,0.12)",
    borderRadius: 22,
    borderWidth: 1,
    flex: 1,
    minWidth: 94,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  heroStatValue: {
    color: theme.colors.textOnDark,
    fontFamily: "SpaceMono",
    fontSize: 20,
  },
  heroStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  codeActionButton: {
    alignItems: "center",
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  codeActionButtonPrimary: {
    alignItems: "center",
    backgroundColor: theme.colors.deep,
    borderColor: theme.colors.deep,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  codeActionText: {
    color: theme.colors.deepBlue,
    fontSize: 13,
    fontWeight: "800",
  },
  codeActionTextPrimary: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    fontWeight: "800",
  },
  codeActions: {
    gap: 10,
  },
  codeBody: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
    marginTop: 6,
  },
  codeCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    padding: 18,
  },
  codeEyebrow: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  codeHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  codeInviteButton: {
    alignItems: "center",
    backgroundColor: theme.colors.deep,
    borderColor: theme.colors.deep,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 88,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  codeInviteButtonText: {
    color: theme.colors.textOnDark,
    fontSize: 13,
    fontWeight: "800",
  },
  codeInviteCard: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  codeInviteInput: {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.border,
    borderRadius: 16,
    borderWidth: 1,
    color: theme.colors.ink,
    flex: 1,
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  codeInviteRow: {
    flexDirection: "row",
    gap: 10,
  },
  codeTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 24,
    marginTop: 4,
  },
  heroTitle: {
    color: theme.colors.textOnDark,
    fontFamily: "SpaceMono",
    fontSize: 24,
  },
  filterGroupLabel: {
    color: theme.colors.muted,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.1,
    textTransform: "uppercase",
  },
  heroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  loadingCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 10,
    padding: 20,
  },
  loadingText: {
    color: theme.colors.muted,
    fontSize: 14,
  },
  listAvatar: {
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderRadius: 18,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  listAvatarText: {
    color: theme.colors.deepBlue,
    fontFamily: "SpaceMono",
    fontSize: 12,
  },
  listCard: {
    alignItems: "center",
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 16,
  },
  listCopy: {
    flex: 1,
  },
  listMeta: {
    color: theme.colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  listStack: {
    gap: 12,
  },
  listTitle: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 16,
  },
  outgoingChip: {
    alignItems: "center",
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outgoingChipText: {
    color: theme.colors.deepBlue,
    fontSize: 12,
    fontWeight: "800",
  },
  pendingChip: {
    alignItems: "center",
    backgroundColor: theme.colors.sponsorSoft,
    borderColor: "rgba(242,138,26,0.18)",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  pendingChipText: {
    color: theme.colors.sponsorText,
    fontSize: 12,
    fontWeight: "800",
  },
  previewAvatar: {
    alignItems: "center",
    backgroundColor: theme.colors.canvas,
    borderRadius: 22,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  previewAvatarText: {
    color: theme.colors.deepBlue,
    fontFamily: "SpaceMono",
    fontSize: 16,
  },
  previewCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  previewIntro: {
    flex: 1,
    gap: 6,
  },
  previewMicrocopy: {
    color: theme.colors.muted,
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
  },
  previewRelationshipRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  previewUsername: {
    color: theme.colors.deepBlue,
    fontSize: 13,
    fontWeight: "800",
  },
  previewState: {
    color: theme.colors.muted,
    fontSize: 13,
  },
  previewStatLabel: {
    color: theme.colors.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.2,
    marginTop: 2,
    textTransform: "uppercase",
  },
  previewStatPill: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    minWidth: 86,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  previewStatValue: {
    color: theme.colors.ink,
    fontFamily: "SpaceMono",
    fontSize: 18,
  },
  previewStats: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  previewTitleChip: {
    alignSelf: "flex-start",
    alignItems: "center",
    backgroundColor: theme.colors.rewardSoft,
    borderColor: "rgba(145,90,0,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  previewTitleChipText: {
    color: theme.colors.rewardText,
    fontSize: 12,
    fontWeight: "800",
  },
  previewTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  previewModalBackdrop: {
    backgroundColor: "rgba(8,15,29,0.5)",
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  previewModalScroll: {
    paddingBottom: 24,
    paddingTop: 24,
  },
  relationshipChip: {
    alignItems: "center",
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  relationshipChipFriend: {
    backgroundColor: "rgba(139,195,74,0.16)",
    borderColor: "rgba(139,195,74,0.2)",
  },
  relationshipChipIncoming: {
    backgroundColor: theme.colors.sponsorSoft,
    borderColor: "rgba(242,138,26,0.18)",
  },
  relationshipChipOutgoing: {
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
  },
  relationshipChipText: {
    color: theme.colors.deepBlue,
    fontSize: 12,
    fontWeight: "800",
  },
  relationshipChipTextDark: {
    color: theme.colors.textOnDark,
  },
  searchCard: {
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.large,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  searchField: {
    alignItems: "center",
    backgroundColor: theme.colors.panel,
    borderColor: theme.colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchHint: {
    color: theme.colors.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  searchInput: {
    color: theme.colors.ink,
    flex: 1,
    fontSize: 15,
    minHeight: 24,
  },
});
