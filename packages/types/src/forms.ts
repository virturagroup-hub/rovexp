import { z } from "zod";

import {
  adminRoles,
  questCandidateGenerationMethods,
  questCandidateStatuses,
  questDiscoveryTypes,
  questRarities,
  reviewStatuses,
  rewardTypes,
  sponsorFilters,
} from "./enums";

export const signInSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const signUpSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
  display_name: z.string().min(2).max(80),
});

export const sponsorFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(120),
  description: z.string().min(10).max(600),
  website: z.url().optional().or(z.literal("")),
  logo_url: z.url().optional().or(z.literal("")),
  email: z.email().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export const placeFormSchema = z.object({
  id: z.string().optional(),
  external_source: z.string().max(120).optional().or(z.literal("")),
  external_id: z.string().max(120).optional().or(z.literal("")),
  name: z.string().min(2).max(160),
  description: z.string().max(600).optional().or(z.literal("")),
  place_type: z.string().min(2).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  state_id: z.string().optional().or(z.literal("")),
  state_code: z.string().max(4).optional().or(z.literal("")),
  rating: z.number().min(0).max(5).optional().nullable(),
  review_count: z.number().int().min(0).optional().nullable(),
  website: z.url().optional().or(z.literal("")),
  phone: z.string().max(40).optional().or(z.literal("")),
  image_url: z.url().optional().or(z.literal("")),
  price_level: z.number().int().min(0).max(4).optional().nullable(),
  is_publicly_visitable: z.boolean(),
  is_active: z.boolean(),
  source_metadata: z.string().max(4000).optional().or(z.literal("")),
});

export const questCandidateFormSchema = z.object({
  id: z.string().optional(),
  place_id: z.string().min(1),
  title: z.string().min(3).max(120),
  description: z.string().min(12).max(800),
  suggested_category_id: z.string().optional().or(z.literal("")),
  suggested_rarity: z.enum(questRarities),
  suggested_xp_reward: z.number().int().min(25).max(5000),
  suggested_radius_meters: z.number().int().min(25).max(5000),
  discovery_type: z.enum(questDiscoveryTypes),
  sponsor_business_id: z.string().optional().or(z.literal("")),
  generation_method: z.enum(questCandidateGenerationMethods),
  generation_notes: z.string().max(4000).optional().or(z.literal("")),
  status: z.enum(questCandidateStatuses),
});

export const nearbyQuestCandidateGenerationSchema = z.object({
  state_id: z.string().min(1),
  area_label: z.string().max(120).optional().or(z.literal("")),
  city: z.string().max(120).optional().or(z.literal("")),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_miles: z.number().int().min(1).max(100),
  place_types: z.string().max(400).optional().or(z.literal("")),
  min_rating: z.number().min(0).max(5).optional().nullable(),
  min_review_count: z.number().int().min(0).optional().nullable(),
  active_only: z.boolean(),
  public_only: z.boolean(),
});

export const questFormSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(3).max(120),
  description: z.string().min(12).max(800),
  category_id: z.string().min(1),
  rarity: z.enum(questRarities),
  state_id: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radius_meters: z.number().int().min(25).max(5000),
  xp_reward: z.number().int().min(25).max(2500),
  image_url: z.url().optional().or(z.literal("")),
  is_active: z.boolean(),
  is_sponsored: z.boolean(),
  sponsor_business_id: z.string().optional().or(z.literal("")),
  discovery_type: z.enum(questDiscoveryTypes),
  is_featured: z.boolean(),
});

export const rewardFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(100),
  description: z.string().min(8).max(400),
  reward_type: z.enum(rewardTypes),
  rule_json: z.string().max(1200).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export const titleFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(100),
  description: z.string().min(8).max(400),
  unlock_key: z.string().max(120).optional().or(z.literal("")),
  metadata: z.string().max(1200).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export const badgeFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(100),
  description: z.string().min(8).max(400),
  icon_key: z.string().min(2).max(100),
  criteria_key: z.string().max(120).optional().or(z.literal("")),
  is_active: z.boolean(),
});

export const reviewFormSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(10).max(500),
  photo_uri: z.string().optional(),
});

export const profileFormSchema = z.object({
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/i, "Only letters, numbers, and underscores are allowed."),
  display_name: z.string().min(2).max(80),
  avatar_url: z.url().optional().or(z.literal("")),
  home_state_id: z.string().optional().or(z.literal("")),
});

export const settingsFormSchema = z.object({
  preferred_radius_miles: z.number().min(1).max(50),
  allow_location: z.boolean(),
  allow_camera: z.boolean(),
  notifications_enabled: z.boolean(),
  category_preferences: z.array(z.string()).default([]),
  rarity_preferences: z.array(z.enum(questRarities)).default([]),
  sponsor_filter: z.enum(sponsorFilters),
  discovery_preferences: z.array(z.enum(questDiscoveryTypes)).default([]),
});

export const adminUserSchema = z.object({
  user_id: z.string(),
  role: z.enum(adminRoles),
});

export const reviewModerationSchema = z.object({
  review_id: z.string(),
  status: z.enum(reviewStatuses),
  moderation_reason: z.string().max(400).optional().or(z.literal("")),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SponsorFormInput = z.infer<typeof sponsorFormSchema>;
export type PlaceFormInput = z.infer<typeof placeFormSchema>;
export type QuestCandidateFormInput = z.infer<typeof questCandidateFormSchema>;
export type NearbyQuestCandidateGenerationInput = z.infer<
  typeof nearbyQuestCandidateGenerationSchema
>;
export type QuestFormInput = z.infer<typeof questFormSchema>;
export type RewardFormInput = z.infer<typeof rewardFormSchema>;
export type TitleFormInput = z.infer<typeof titleFormSchema>;
export type BadgeFormInput = z.infer<typeof badgeFormSchema>;
export type ReviewFormInput = z.infer<typeof reviewFormSchema>;
export type ProfileFormInput = z.infer<typeof profileFormSchema>;
export type SettingsFormInput = z.infer<typeof settingsFormSchema>;
export type ReviewModerationInput = z.infer<typeof reviewModerationSchema>;
