export const questRarities = ["common", "rare", "epic", "legendary"] as const;
export type QuestRarity = (typeof questRarities)[number];

export const questDiscoveryTypes = [
  "popular",
  "hidden_gem",
  "featured_route",
] as const;
export type QuestDiscoveryType = (typeof questDiscoveryTypes)[number];

export const questGenerationVibes = [
  "food",
  "nature",
  "culture",
  "landmark",
  "urban",
  "general",
] as const;
export type QuestGenerationVibe = (typeof questGenerationVibes)[number];

export const rewardTypes = [
  "perk",
  "discount",
  "collectible",
  "experience_boost",
] as const;
export type RewardType = (typeof rewardTypes)[number];

export const adminRoles = ["editor", "manager", "owner"] as const;
export type AdminRole = (typeof adminRoles)[number];

export const friendshipStatuses = ["pending", "accepted", "blocked"] as const;
export type FriendshipStatus = (typeof friendshipStatuses)[number];

export const redemptionStatuses = [
  "pending",
  "approved",
  "fulfilled",
  "cancelled",
] as const;
export type RedemptionStatus = (typeof redemptionStatuses)[number];

export const reviewStatuses = ["visible", "hidden", "flagged"] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

export const sponsorFilters = ["all", "sponsored", "regular"] as const;
export type SponsorFilter = (typeof sponsorFilters)[number];

export const questCandidateStatuses = [
  "draft",
  "approved",
  "rejected",
  "published",
] as const;
export type QuestCandidateStatus = (typeof questCandidateStatuses)[number];

export const questCandidateGenerationMethods = ["rules", "ai", "manual"] as const;
export type QuestCandidateGenerationMethod =
  (typeof questCandidateGenerationMethods)[number];

export const oauthProviders = ["google", "facebook", "apple"] as const;
export type OAuthProvider = (typeof oauthProviders)[number];

export const questProgressStatuses = [
  "available",
  "accepted",
  "checked_in",
  "completed",
  "reviewed",
] as const;
export type QuestProgressStatus = (typeof questProgressStatuses)[number];

export const leaderboardScopes = ["state", "friends", "weekly"] as const;
export type LeaderboardScope = (typeof leaderboardScopes)[number];

export const rarityPresentation = {
  common: {
    accent: "sky",
    label: "Common",
  },
  rare: {
    accent: "emerald",
    label: "Rare",
  },
  epic: {
    accent: "amber",
    label: "Epic",
  },
  legendary: {
    accent: "rose",
    label: "Legendary",
  },
} as const;
