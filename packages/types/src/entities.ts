import type {
  AdminRole,
  FriendshipStatus,
  LeaderboardScope,
  QuestDiscoveryType,
  QuestGenerationVibe,
  QuestProgressStatus,
  QuestRarity,
  QuestCandidateGenerationMethod,
  QuestCandidateStatus,
  ReviewStatus,
  RedemptionStatus,
  RewardType,
  SponsorFilter,
} from "./enums";

export interface StateRecord {
  id: string;
  code: string;
  name: string;
}

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  friend_code: string;
  avatar_url: string | null;
  home_state_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  user_id: string;
  preferred_radius_miles: number;
  allow_location: boolean;
  allow_camera: boolean;
  notifications_enabled: boolean;
  category_preferences: string[];
  rarity_preferences: QuestRarity[];
  sponsor_filter: SponsorFilter;
  discovery_preferences: QuestDiscoveryType[];
  updated_at: string;
}

export interface QuestCategory {
  id: string;
  slug: string;
  name: string;
  color_token: string | null;
}

export interface SponsorBusiness {
  id: string;
  name: string;
  description: string;
  website: string | null;
  logo_url: string | null;
  email: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  category_id: string;
  rarity: QuestRarity;
  state_id: string;
  place_id?: string | null;
  quest_candidate_id?: string | null;
  latitude: number;
  longitude: number;
  radius_meters: number;
  xp_reward: number;
  image_url: string | null;
  is_active: boolean;
  is_sponsored: boolean;
  sponsor_business_id: string | null;
  discovery_type: QuestDiscoveryType;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface QuestWithRelations extends Quest {
  category: QuestCategory;
  state: StateRecord;
  sponsor_business: SponsorBusiness | null;
}

export interface Place {
  id: string;
  external_source: string | null;
  external_id: string | null;
  name: string;
  description: string | null;
  place_type: string;
  latitude: number;
  longitude: number;
  address: string | null;
  city: string | null;
  state_id: string | null;
  state_code: string | null;
  rating: number | null;
  review_count: number | null;
  website: string | null;
  phone: string | null;
  image_url: string | null;
  price_level: number | null;
  is_publicly_visitable: boolean;
  is_active: boolean;
  source_metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PlaceWithRelations extends Place {
  state: StateRecord | null;
}

export interface QuestCandidate {
  id: string;
  place_id: string;
  title: string;
  description: string;
  suggested_category_id: string | null;
  suggested_rarity: QuestRarity;
  suggested_xp_reward: number;
  suggested_radius_meters: number;
  discovery_type: QuestDiscoveryType;
  sponsor_business_id: string | null;
  generation_method: QuestCandidateGenerationMethod;
  generation_notes: QuestCandidateGenerationNotes | Record<string, unknown> | null;
  status: QuestCandidateStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  published_quest_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestCandidateGenerationNotes {
  version: number;
  source_mode: "single_place" | "nearby_places_bulk";
  source: {
    place_id: string;
    place_name: string;
    place_type: string;
    city: string | null;
    state_code: string | null;
    state_name: string | null;
    external_source: string | null;
    external_id: string | null;
    image_url: string | null;
    sponsor_business_id: string | null;
    sponsor_name: string | null;
    rating: number | null;
    review_count: number | null;
    price_level: number | null;
  };
  classification: {
    category_id: string | null;
    category_name: string | null;
    category_slug: string | null;
    discovery_type: QuestDiscoveryType;
    discovery_reason: string;
    vibe: QuestGenerationVibe;
    title_pattern: string;
    description_pattern: string;
  };
  scoring: {
    suggested_rarity: QuestRarity;
    rarity_reason: string;
    suggested_radius_meters: number;
    suggested_xp_reward: number;
    xp_reason: string;
  };
  batch?: {
    area_label: string | null;
    city: string | null;
    radius_miles: number;
    state_code: string;
    state_name: string;
    latitude: number;
    longitude: number;
    place_types: string[];
  };
}

export interface QuestCandidateWithRelations extends QuestCandidate {
  place: PlaceWithRelations;
  suggested_category: QuestCategory | null;
  sponsor_business: SponsorBusiness | null;
  published_quest: Pick<Quest, "id" | "title"> | null;
}

export type NearbyGenerationSkipReason =
  | "missing_coordinates"
  | "wrong_state"
  | "outside_radius"
  | "inactive"
  | "private"
  | "city_mismatch"
  | "type_mismatch"
  | "below_rating"
  | "below_review_count"
  | "existing_candidate"
  | "existing_quest";

export interface NearbyGenerationSkipCount {
  count: number;
  reason: NearbyGenerationSkipReason;
}

export interface NearbyGenerationPreviewItem {
  distance_miles: number;
  place: PlaceWithRelations;
}

export interface NearbyGenerationSkippedItem {
  distance_miles: number;
  place: PlaceWithRelations;
  reason: NearbyGenerationSkipReason;
}

export interface NearbyGenerationSummary {
  area_label: string | null;
  city: string | null;
  created_count: number;
  inspected_count: number;
  latitude: number;
  longitude: number;
  matched_count: number;
  radius_miles: number;
  skipped_breakdown: NearbyGenerationSkipCount[];
  skipped_count: number;
  state_code: string;
  state_name: string;
}

export interface NearbyQuestCandidatePreview extends NearbyGenerationSummary {
  matches: NearbyGenerationPreviewItem[];
  skipped_examples: NearbyGenerationSkippedItem[];
}

export interface QuestAcceptance {
  id: string;
  user_id: string;
  quest_id: string;
  accepted_at: string;
}

export interface QuestCheckin {
  id: string;
  user_id: string;
  quest_id: string;
  accepted_id: string;
  checked_in_at: string;
  latitude: number;
  longitude: number;
}

export interface QuestCompletion {
  id: string;
  user_id: string;
  quest_id: string;
  accepted_id: string;
  checkin_id: string;
  completed_at: string;
  xp_awarded: number;
}

export interface Review {
  id: string;
  user_id: string;
  quest_id: string;
  completion_id: string;
  rating: number;
  comment: string;
  status: ReviewStatus;
  moderation_reason: string | null;
  moderated_at: string | null;
  moderated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ReviewPhoto {
  id: string;
  review_id: string;
  storage_path: string;
  created_at: string;
}

export interface Title {
  id: string;
  name: string;
  description: string;
  unlock_key: string | null;
  metadata: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserTitle {
  id: string;
  user_id: string;
  title_id: string;
  unlocked_at: string;
  is_equipped: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon_key: string;
  criteria_key: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  unlocked_at: string;
  is_featured: boolean;
}

export interface Reward {
  id: string;
  name: string;
  description: string;
  reward_type: RewardType;
  rule_json: Record<string, unknown> | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RewardRedemption {
  id: string;
  user_id: string;
  reward_id: string;
  redeemed_at: string;
  status: RedemptionStatus;
}

export interface Friendship {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
}

export type FriendHubDirection = "friend" | "incoming" | "outgoing";

export type FriendRelationshipStatus =
  | "blocked"
  | "friend"
  | "incoming"
  | "none"
  | "outgoing";

export type FriendActivityType = "quest_completed" | "review_posted";

export interface FriendHubEntry {
  friendship_id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  direction: FriendHubDirection;
  other_user_id: string;
  other_username: string;
  other_display_name: string;
  other_avatar_url: string | null;
  other_home_state_id: string | null;
  other_home_state_code: string | null;
  other_home_state_name: string | null;
  other_xp_total: number;
  other_quests_completed: number;
  other_reviews_count: number;
  other_hidden_gems_completed: number;
  other_title_name: string | null;
}

export interface FriendSearchResult {
  user_id: string;
  username: string;
  display_name?: string | null;
  friend_code: string;
  avatar_url: string | null;
  home_state_id: string | null;
  home_state_code: string | null;
  home_state_name: string | null;
  xp_total: number;
  quests_completed: number;
  reviews_count: number;
  hidden_gems_completed: number;
  relationship_status: FriendRelationshipStatus;
}

export interface FriendActivityItem {
  activity_id: string;
  activity_type: FriendActivityType;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  quest_id: string;
  quest_title: string;
  state_code: string | null;
  created_at: string;
  xp_awarded: number | null;
  rating: number | null;
  comment: string | null;
}

export interface UserStateStat {
  id: string;
  user_id: string;
  state_id: string;
  xp_total: number;
  quests_completed: number;
  hidden_gems_completed: number;
  reviews_count: number;
  updated_at: string;
}

export interface AdminUser {
  user_id: string;
  role: AdminRole;
  created_at: string;
}

export interface QuestProgress {
  quest_id: string;
  status: QuestProgressStatus;
  accepted_id: string | null;
  accepted_at: string | null;
  checkin_id: string | null;
  checked_in_at: string | null;
  completion_id: string | null;
  completed_at: string | null;
  review_id: string | null;
}

export interface NearbyQuestFeed {
  sponsored: QuestWithRelations[];
  nearby: QuestWithRelations[];
}

export interface UserProgressTotals {
  user_id: string;
  xp_total: number;
  quests_completed: number;
  hidden_gems_completed: number;
  reviews_count: number;
}

export interface ProfileSummary {
  profile: Profile;
  settings: UserSettings;
  home_state: StateRecord | null;
  equipped_title: Title | null;
  featured_badges: Badge[];
  overall_stats: UserProgressTotals;
  state_stat: UserStateStat | null;
}

export interface QuestFilterPreferences {
  category_slugs: string[];
  rarities: QuestRarity[];
  sponsor_filter: SponsorFilter;
  discovery_types: QuestDiscoveryType[];
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  username: string;
  display_name?: string | null;
  avatar_url: string | null;
  title_name: string | null;
  state_id?: string | null;
  state_code?: string | null;
  state_name?: string | null;
  xp_total: number;
  quests_completed: number;
  reviews_count: number;
  hidden_gems_completed: number;
  is_self: boolean;
}

export interface LeaderboardCollection {
  scope: LeaderboardScope;
  entries: LeaderboardEntry[];
  empty_message: string;
}

export interface QuestReview {
  review_id: string;
  user_id: string;
  username: string;
  display_name?: string | null;
  avatar_url: string | null;
  rating: number;
  comment: string;
  created_at: string;
  status: ReviewStatus;
  photo_paths: string[];
  photo_urls: string[];
}

export interface ReviewModerationItem extends Review {
  profile: Pick<Profile, "id" | "username" | "display_name" | "avatar_url">;
  quest: Pick<Quest, "id" | "title" | "state_id"> & {
    state: StateRecord;
  };
  photos: ReviewPhoto[];
}

export interface UserDirectoryRow extends UserProgressTotals {
  profile: Profile;
  home_state: StateRecord | null;
  admin_role: AdminRole | null;
}

export interface PublicProfileSnapshot {
  user_id: string;
  username: string;
  display_name: string | null;
  friend_code: string | null;
  avatar_url: string | null;
  home_state_id: string | null;
  home_state_code: string | null;
  home_state_name: string | null;
  title_name: string | null;
  xp_total: number;
  quests_completed: number;
  reviews_count: number;
  hidden_gems_completed: number;
  is_friend: boolean;
  is_self: boolean;
  visibility_scope: "public" | "friend" | "self";
}
