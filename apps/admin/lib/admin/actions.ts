"use server";

import {
  badgeFormSchema,
  nearbyPlacesSearchSchema,
  placeFormSchema,
  questCandidateFormSchema,
  questFormSchema,
  reviewModerationSchema,
  rewardFormSchema,
  signInSchema,
  sponsorFormSchema,
  titleFormSchema,
} from "@rovexp/types";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { clearDemoSession, requireAdminSession } from "./auth";
import { enableAdminDemoMode, isAdminDemoEnabled } from "./demo";
import {
  generateQuestCandidateFromPlace,
  generateNearbyQuestCandidatesFromSearch,
  importPlaces,
  listQuestCandidates,
  publishQuestCandidate,
  savePlace,
  saveQuestCandidate,
  saveBadge,
  saveQuest,
  saveReviewModeration,
  saveReward,
  saveSponsor,
  saveTitle,
} from "./repository";
import { getSupabaseServerClient, isSupabaseConfigured } from "./supabase";

function readString(formData: FormData, key: string) {
  return formData.get(key)?.toString().trim() ?? "";
}

function readBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function readNumber(formData: FormData, key: string) {
  return Number(readString(formData, key));
}

function readOptionalNumber(formData: FormData, key: string) {
  const value = readString(formData, key);
  return value ? Number(value) : null;
}

function readStringArray(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .map((value) => value.toString().trim())
    .filter(Boolean);
}

function toNullable(value?: string) {
  return value ? value : null;
}

function parseJson(value?: string) {
  if (!value) {
    return null;
  }

  return JSON.parse(value) as Record<string, unknown>;
}

function parseImportPayload(value?: string) {
  if (!value) {
    return [];
  }

  const parsed = JSON.parse(value) as unknown;

  if (Array.isArray(parsed)) {
    return parsed;
  }

  if (parsed && typeof parsed === "object" && Array.isArray((parsed as { places?: unknown[] }).places)) {
    return (parsed as { places: unknown[] }).places;
  }

  if (parsed && typeof parsed === "object") {
    return [parsed];
  }

  return [];
}

function parsePlacePayload(formData: FormData) {
  return placeFormSchema.safeParse({
    address: readString(formData, "address"),
    city: readString(formData, "city"),
    description: readString(formData, "description"),
    external_id: readString(formData, "external_id"),
    external_source: readString(formData, "external_source"),
    id: readString(formData, "id") || undefined,
    image_url: readString(formData, "image_url"),
    is_active: readBoolean(formData, "is_active"),
    is_publicly_visitable: readBoolean(formData, "is_publicly_visitable"),
    latitude: readNumber(formData, "latitude"),
    longitude: readNumber(formData, "longitude"),
    name: readString(formData, "name"),
    phone: readString(formData, "phone"),
    place_type: readString(formData, "place_type"),
    price_level: readOptionalNumber(formData, "price_level"),
    rating: readOptionalNumber(formData, "rating"),
    source_metadata: readString(formData, "source_metadata"),
    state_code: readString(formData, "state_code"),
    state_id: readString(formData, "state_id"),
    website: readString(formData, "website"),
    review_count: readOptionalNumber(formData, "review_count"),
  });
}

function normalizeImportedPlace(row: Record<string, unknown>) {
  return {
    address: typeof row.address === "string" ? row.address : "",
    city: typeof row.city === "string" ? row.city : "",
    description: typeof row.description === "string" ? row.description : "",
    external_id: typeof row.external_id === "string" ? row.external_id : "",
    external_source: typeof row.external_source === "string" ? row.external_source : "",
    id: typeof row.id === "string" ? row.id : undefined,
    image_url: typeof row.image_url === "string" ? row.image_url : "",
    is_active: row.is_active !== false,
    is_publicly_visitable: row.is_publicly_visitable !== false,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    name: typeof row.name === "string" ? row.name : "",
    phone: typeof row.phone === "string" ? row.phone : "",
    place_type: typeof row.place_type === "string" ? row.place_type : "",
    price_level:
      row.price_level === undefined || row.price_level === null || row.price_level === ""
        ? null
        : Number(row.price_level),
    rating:
      row.rating === undefined || row.rating === null || row.rating === ""
        ? null
        : Number(row.rating),
    source_metadata:
      row.source_metadata && typeof row.source_metadata === "object"
        ? JSON.stringify(row.source_metadata)
        : typeof row.source_metadata === "string"
          ? row.source_metadata
          : "",
    state_code: typeof row.state_code === "string" ? row.state_code : "",
    state_id: typeof row.state_id === "string" ? row.state_id : "",
    website: typeof row.website === "string" ? row.website : "",
    review_count:
      row.review_count === undefined || row.review_count === null || row.review_count === ""
        ? null
        : Number(row.review_count),
  };
}

export async function signInAction(formData: FormData) {
  await clearDemoSession();

  if (!isSupabaseConfigured) {
    redirect("/login?error=missing-env");
  }

  const parsed = signInSchema.safeParse({
    email: readString(formData, "email"),
    password: readString(formData, "password"),
  });

  if (!parsed.success) {
    redirect("/login?error=invalid-credentials");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/login?error=missing-env");
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    redirect("/login?error=invalid-credentials");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=invalid-credentials");
  }

  const { data: adminMembership } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminMembership) {
    await supabase.auth.signOut();
    redirect("/login?error=not-authorized");
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  await clearDemoSession();

  const supabase = await getSupabaseServerClient();
  await supabase?.auth.signOut();

  redirect("/login?status=signed-out");
}

export async function enterDemoAction() {
  if (!isAdminDemoEnabled) {
    redirect("/login?error=missing-env");
  }

  await clearDemoSession();

  const supabase = await getSupabaseServerClient();
  await supabase?.auth.signOut();

  await enableAdminDemoMode();

  revalidatePath("/dashboard");
  redirect("/dashboard?status=demo-mode");
}

export async function saveSponsorAction(formData: FormData) {
  await requireAdminSession();

  const parsed = sponsorFormSchema.safeParse({
    id: readString(formData, "id") || undefined,
    name: readString(formData, "name"),
    description: readString(formData, "description"),
    website: readString(formData, "website"),
    logo_url: readString(formData, "logo_url"),
    email: readString(formData, "email"),
    phone: readString(formData, "phone"),
    is_active: readBoolean(formData, "is_active"),
  });

  if (!parsed.success) {
    redirect("/dashboard/sponsors?error=check-form");
  }

  await saveSponsor({
    ...parsed.data,
    website: toNullable(parsed.data.website),
    logo_url: toNullable(parsed.data.logo_url),
    email: toNullable(parsed.data.email),
    phone: toNullable(parsed.data.phone),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/sponsors");
  redirect("/dashboard/sponsors?status=saved");
}

export async function savePlaceAction(formData: FormData) {
  await requireAdminSession();

  const parsed = parsePlacePayload(formData);

  if (!parsed.success) {
    redirect("/dashboard/places?error=check-form");
  }

  try {
    await savePlace({
      address: toNullable(parsed.data.address),
      city: toNullable(parsed.data.city),
      description: toNullable(parsed.data.description),
      external_id: toNullable(parsed.data.external_id),
      external_source: toNullable(parsed.data.external_source),
      id: parsed.data.id,
      image_url: toNullable(parsed.data.image_url),
      is_active: parsed.data.is_active,
      is_publicly_visitable: parsed.data.is_publicly_visitable,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      name: parsed.data.name,
      phone: toNullable(parsed.data.phone),
      place_type: parsed.data.place_type,
      price_level: parsed.data.price_level ?? null,
      rating: parsed.data.rating ?? null,
      review_count: parsed.data.review_count ?? null,
      source_metadata: parseJson(parsed.data.source_metadata),
      state_code: toNullable(parsed.data.state_code),
      state_id: toNullable(parsed.data.state_id),
      website: toNullable(parsed.data.website),
    });
  } catch (error) {
    redirect(
      `/dashboard/places?error=${
        error instanceof Error && error.message.includes("duplicate")
          ? "check-form"
          : "check-form"
      }`,
    );
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/places");
  redirect("/dashboard/places?status=saved");
}

export async function importPlacesAction(formData: FormData) {
  await requireAdminSession();

  const raw = readString(formData, "places_json");

  let payloads: Array<ReturnType<typeof normalizeImportedPlace>> = [];

  try {
    payloads = parseImportPayload(raw)
      .map((row) => normalizeImportedPlace(row as Record<string, unknown>));
  } catch {
    redirect("/dashboard/places?error=invalid-json");
  }

  if (!payloads.length) {
    redirect("/dashboard/places?error=check-form");
  }

  const parsedPlaces = payloads.map((place) => placeFormSchema.safeParse(place));
  const normalizedPlaces: Array<Parameters<typeof savePlace>[0]> = [];

  for (const item of parsedPlaces) {
    if (!item.success) {
      redirect("/dashboard/places?error=check-form");
    }

    const data = item.data;
    normalizedPlaces.push({
      address: toNullable(data.address),
      city: toNullable(data.city),
      description: toNullable(data.description),
      external_id: toNullable(data.external_id),
      external_source: toNullable(data.external_source),
      id: data.id,
      image_url: toNullable(data.image_url),
      is_active: data.is_active,
      is_publicly_visitable: data.is_publicly_visitable,
      latitude: data.latitude,
      longitude: data.longitude,
      name: data.name,
      phone: toNullable(data.phone),
      place_type: data.place_type,
      price_level: data.price_level ?? null,
      rating: data.rating ?? null,
      review_count: data.review_count ?? null,
      source_metadata: parseJson(data.source_metadata),
      state_code: toNullable(data.state_code),
      state_id: toNullable(data.state_id),
      website: toNullable(data.website),
    });
  }

  try {
    await importPlaces(normalizedPlaces);
  } catch {
    redirect("/dashboard/places?error=check-form");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/places");
  redirect("/dashboard/places?status=imported");
}

export async function saveQuestAction(formData: FormData) {
  await requireAdminSession();

  const parsed = questFormSchema.safeParse({
    id: readString(formData, "id") || undefined,
    title: readString(formData, "title"),
    description: readString(formData, "description"),
    category_id: readString(formData, "category_id"),
    rarity: readString(formData, "rarity"),
    state_id: readString(formData, "state_id"),
    latitude: readNumber(formData, "latitude"),
    longitude: readNumber(formData, "longitude"),
    radius_meters: readNumber(formData, "radius_meters"),
    xp_reward: readNumber(formData, "xp_reward"),
    image_url: readString(formData, "image_url"),
    is_active: readBoolean(formData, "is_active"),
    is_sponsored: readBoolean(formData, "is_sponsored"),
    is_featured: readBoolean(formData, "is_featured"),
    sponsor_business_id: readString(formData, "sponsor_business_id"),
    discovery_type: readString(formData, "discovery_type"),
  });

  if (!parsed.success) {
    redirect("/dashboard/quests?error=check-form");
  }

  if (parsed.data.is_sponsored && !parsed.data.sponsor_business_id) {
    redirect("/dashboard/quests?error=sponsor-required");
  }

  await saveQuest({
    ...parsed.data,
    image_url: toNullable(parsed.data.image_url),
    sponsor_business_id: parsed.data.is_sponsored
      ? toNullable(parsed.data.sponsor_business_id)
      : null,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/quests");
  redirect("/dashboard/quests?status=saved");
}

export async function generateQuestCandidateAction(formData: FormData) {
  await requireAdminSession();

  const placeId = readString(formData, "place_id");

  if (!placeId) {
    redirect("/dashboard/places?error=check-form");
  }

  try {
    const candidate = await generateQuestCandidateFromPlace(placeId);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/places");
    revalidatePath("/dashboard/candidates");
    redirect(`/dashboard/candidates?edit=${candidate.id}&status=generated`);
  } catch {
    redirect("/dashboard/places?error=check-form");
  }
}

export async function savePlaceFromMapAction(formData: FormData) {
  await requireAdminSession();

  const parsed = parsePlacePayload(formData);

  if (!parsed.success) {
    redirect("/dashboard/places/map?error=check-form");
  }

  try {
    await savePlace({
      address: toNullable(parsed.data.address),
      city: toNullable(parsed.data.city),
      description: toNullable(parsed.data.description),
      external_id: toNullable(parsed.data.external_id),
      external_source: toNullable(parsed.data.external_source),
      id: parsed.data.id,
      image_url: toNullable(parsed.data.image_url),
      is_active: parsed.data.is_active,
      is_publicly_visitable: parsed.data.is_publicly_visitable,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      name: parsed.data.name,
      phone: toNullable(parsed.data.phone),
      place_type: parsed.data.place_type,
      price_level: parsed.data.price_level ?? null,
      rating: parsed.data.rating ?? null,
      review_count: parsed.data.review_count ?? null,
      source_metadata: parseJson(parsed.data.source_metadata),
      state_code: toNullable(parsed.data.state_code),
      state_id: toNullable(parsed.data.state_id),
      website: toNullable(parsed.data.website),
    });
  } catch {
    redirect("/dashboard/places/map?error=check-form");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/places");
  revalidatePath("/dashboard/places/map");
  redirect("/dashboard/places/map?status=saved");
}

export async function savePlaceAndGenerateCandidateAction(formData: FormData) {
  await requireAdminSession();

  const parsed = parsePlacePayload(formData);

  if (!parsed.success) {
    redirect("/dashboard/places/map?error=check-form");
  }

  try {
    const savedPlace = await savePlace({
      address: toNullable(parsed.data.address),
      city: toNullable(parsed.data.city),
      description: toNullable(parsed.data.description),
      external_id: toNullable(parsed.data.external_id),
      external_source: toNullable(parsed.data.external_source),
      id: parsed.data.id,
      image_url: toNullable(parsed.data.image_url),
      is_active: parsed.data.is_active,
      is_publicly_visitable: parsed.data.is_publicly_visitable,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      name: parsed.data.name,
      phone: toNullable(parsed.data.phone),
      place_type: parsed.data.place_type,
      price_level: parsed.data.price_level ?? null,
      rating: parsed.data.rating ?? null,
      review_count: parsed.data.review_count ?? null,
      source_metadata: parseJson(parsed.data.source_metadata),
      state_code: toNullable(parsed.data.state_code),
      state_id: toNullable(parsed.data.state_id),
      website: toNullable(parsed.data.website),
    });

    if (!savedPlace?.id) {
      redirect("/dashboard/places/map?error=check-form");
    }

    const candidate = await generateQuestCandidateFromPlace(savedPlace.id);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/places");
    revalidatePath("/dashboard/places/map");
    revalidatePath("/dashboard/candidates");
    redirect(`/dashboard/candidates?edit=${candidate.id}&status=generated`);
  } catch {
    redirect("/dashboard/places/map?error=check-form");
  }
}

export async function generateNearbyQuestCandidatesAction(formData: FormData) {
  await requireAdminSession();

  const intent = readString(formData, "intent") || "generate_all";
  const parsed = nearbyPlacesSearchSchema.safeParse({
    active_only: readBoolean(formData, "active_only"),
    area_label: readString(formData, "area_label"),
    city: readString(formData, "city"),
    latitude: readOptionalNumber(formData, "latitude"),
    longitude: readOptionalNumber(formData, "longitude"),
    min_rating: readOptionalNumber(formData, "min_rating"),
    min_review_count: readOptionalNumber(formData, "min_review_count"),
    place_types: readString(formData, "place_types"),
    public_only: readBoolean(formData, "public_only"),
    radius_miles: readOptionalNumber(formData, "radius_miles"),
    search_mode: readString(formData, "search_mode") || "coordinates",
    selected_place_ids: readStringArray(formData, "selected_place_ids"),
    state_id: readString(formData, "state_id"),
  });

  if (!parsed.success) {
    redirect("/dashboard/places/nearby?error=check-form");
  }

  if (intent === "generate_selected" && parsed.data.selected_place_ids.length === 0) {
    redirect("/dashboard/places/nearby?error=select-some-places");
  }

  try {
    const result = await generateNearbyQuestCandidatesFromSearch({
      active_only: parsed.data.active_only,
      area_label: parsed.data.area_label || undefined,
      city: parsed.data.city || undefined,
      latitude: parsed.data.latitude,
      longitude: parsed.data.longitude,
      min_rating: parsed.data.min_rating ?? null,
      min_review_count: parsed.data.min_review_count ?? null,
      place_types: parsed.data.place_types ?? "",
      public_only: parsed.data.public_only,
      radius_miles: parsed.data.radius_miles ?? null,
      search_mode: parsed.data.search_mode,
      selected_place_ids:
        intent === "generate_selected" ? parsed.data.selected_place_ids : [],
      state_id: parsed.data.state_id,
    });

    const summary = { ...result, created_candidates: undefined };
    const params = new URLSearchParams({
      active_only: parsed.data.active_only ? "on" : "",
      area_label: parsed.data.area_label ?? "",
      city: parsed.data.city ?? "",
      latitude: parsed.data.latitude === null ? "" : String(parsed.data.latitude),
      longitude: parsed.data.longitude === null ? "" : String(parsed.data.longitude),
      min_rating: parsed.data.min_rating === null ? "" : String(parsed.data.min_rating),
      min_review_count: parsed.data.min_review_count === null ? "" : String(parsed.data.min_review_count),
      place_types: parsed.data.place_types ?? "",
      public_only: parsed.data.public_only ? "on" : "",
      radius_miles: parsed.data.radius_miles === null ? "" : String(parsed.data.radius_miles),
      search_mode: parsed.data.search_mode,
      state_id: parsed.data.state_id,
      status: "bulk-generated",
      summary: JSON.stringify(summary),
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/places");
    revalidatePath("/dashboard/places/nearby");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/quests");

    redirect(`/dashboard/places/nearby?${params.toString()}`);
  } catch {
    redirect("/dashboard/places/nearby?error=check-form");
  }
}

export async function saveQuestCandidateAction(formData: FormData) {
  const session = await requireAdminSession();

  const parsed = questCandidateFormSchema.safeParse({
    description: readString(formData, "description"),
    generation_method: readString(formData, "generation_method"),
    generation_notes: readString(formData, "generation_notes"),
    id: readString(formData, "id") || undefined,
    place_id: readString(formData, "place_id"),
    published_quest_id: readString(formData, "published_quest_id"),
    discovery_type: readString(formData, "discovery_type"),
    sponsor_business_id: readString(formData, "sponsor_business_id"),
    status: readString(formData, "status"),
    suggested_category_id: readString(formData, "suggested_category_id"),
    suggested_radius_meters: readNumber(formData, "suggested_radius_meters"),
    suggested_rarity: readString(formData, "suggested_rarity"),
    suggested_xp_reward: readNumber(formData, "suggested_xp_reward"),
    title: readString(formData, "title"),
  });

  if (!parsed.success) {
    redirect("/dashboard/candidates?error=check-form");
  }

  const existing = parsed.data.id
    ? (await listQuestCandidates()).find((candidate) => candidate.id === parsed.data.id)
    : null;

  if (parsed.data.status === "published") {
    if (!parsed.data.id) {
      redirect("/dashboard/candidates?error=check-form");
    }

    try {
      await publishQuestCandidate({
        candidateId: parsed.data.id,
        reviewerId: session.user.id,
      });
    } catch {
      redirect("/dashboard/candidates?error=check-form");
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/candidates");
    revalidatePath("/dashboard/quests");
    redirect("/dashboard/candidates?status=published");
  }

  const persistedStatus = existing?.published_quest_id
    ? "published"
    : parsed.data.status;
  const reviewedBy =
    persistedStatus === "draft" ? null : session.user.id;
  const reviewedAt =
    persistedStatus === "draft"
      ? null
      : existing?.reviewed_at ?? new Date().toISOString();

  try {
    await saveQuestCandidate({
      ...parsed.data,
      generation_notes: parseJson(parsed.data.generation_notes),
      published_quest_id: existing?.published_quest_id ?? null,
      reviewed_at: reviewedAt,
      reviewed_by: reviewedBy,
      sponsor_business_id: toNullable(parsed.data.sponsor_business_id),
      suggested_category_id: toNullable(parsed.data.suggested_category_id),
      status: persistedStatus,
    });
  } catch {
    redirect("/dashboard/candidates?error=check-form");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/candidates");
  redirect("/dashboard/candidates?status=saved");
}

export async function publishQuestCandidateAction(formData: FormData) {
  const session = await requireAdminSession();
  const candidateId = readString(formData, "candidate_id");

  if (!candidateId) {
    redirect("/dashboard/candidates?error=check-form");
  }

  try {
    await publishQuestCandidate({
      candidateId,
      reviewerId: session.user.id,
    });
  } catch {
    redirect("/dashboard/candidates?error=check-form");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/candidates");
  revalidatePath("/dashboard/quests");
  revalidatePath("/dashboard/places");
  redirect("/dashboard/candidates?status=published");
}

export async function saveRewardAction(formData: FormData) {
  await requireAdminSession();

  const parsed = rewardFormSchema.safeParse({
    id: readString(formData, "id") || undefined,
    name: readString(formData, "name"),
    description: readString(formData, "description"),
    reward_type: readString(formData, "reward_type"),
    rule_json: readString(formData, "rule_json"),
    is_active: readBoolean(formData, "is_active"),
  });

  if (!parsed.success) {
    redirect("/dashboard/rewards?error=check-form");
  }

  try {
    await saveReward({
      ...parsed.data,
      rule_json: parseJson(parsed.data.rule_json),
    });
  } catch {
    redirect("/dashboard/rewards?error=invalid-json");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/rewards");
  redirect("/dashboard/rewards?status=saved");
}

export async function saveTitleAction(formData: FormData) {
  await requireAdminSession();

  const parsed = titleFormSchema.safeParse({
    id: readString(formData, "id") || undefined,
    name: readString(formData, "name"),
    description: readString(formData, "description"),
    unlock_key: readString(formData, "unlock_key"),
    metadata: readString(formData, "metadata"),
    is_active: readBoolean(formData, "is_active"),
  });

  if (!parsed.success) {
    redirect("/dashboard/titles?error=check-form");
  }

  try {
    await saveTitle({
      ...parsed.data,
      unlock_key: toNullable(parsed.data.unlock_key),
      metadata: parseJson(parsed.data.metadata),
    });
  } catch {
    redirect("/dashboard/titles?error=invalid-json");
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/titles");
  redirect("/dashboard/titles?status=saved");
}

export async function saveBadgeAction(formData: FormData) {
  await requireAdminSession();

  const parsed = badgeFormSchema.safeParse({
    id: readString(formData, "id") || undefined,
    name: readString(formData, "name"),
    description: readString(formData, "description"),
    icon_key: readString(formData, "icon_key"),
    criteria_key: readString(formData, "criteria_key"),
    is_active: readBoolean(formData, "is_active"),
  });

  if (!parsed.success) {
    redirect("/dashboard/badges?error=check-form");
  }

  await saveBadge({
    ...parsed.data,
    criteria_key: toNullable(parsed.data.criteria_key),
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/badges");
  redirect("/dashboard/badges?status=saved");
}

export async function moderateReviewAction(formData: FormData) {
  const session = await requireAdminSession();

  const parsed = reviewModerationSchema.safeParse({
    moderation_reason: readString(formData, "moderation_reason"),
    review_id: readString(formData, "review_id"),
    status: readString(formData, "status"),
  });

  if (!parsed.success) {
    redirect("/dashboard/reviews?error=check-form");
  }

  await saveReviewModeration({
    moderated_by: session.user.id,
    moderation_reason: toNullable(parsed.data.moderation_reason),
    review_id: parsed.data.review_id,
    status: parsed.data.status,
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/reviews");
  redirect("/dashboard/reviews?status=saved");
}
