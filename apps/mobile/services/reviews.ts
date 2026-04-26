import {
  demoQuestReviews,
  type QuestReview,
} from "@rovexp/types";

import { warnSupabaseFallback } from "@/lib/runtime-status";
import { getSupabaseClient } from "@/lib/supabase";
import { makeLocalId } from "@/lib/id";
import { getCurrentSupabaseUserId } from "@/services/auth";

async function createSignedPhotoUrls(photoPaths: string[]) {
  const supabase = getSupabaseClient();

  if (!supabase || !photoPaths.length) {
    return [];
  }

  const signed = await Promise.all(
    photoPaths.map(async (path) => {
      const { data } = await supabase.storage
        .from("review-photos")
        .createSignedUrl(path, 60 * 60);

      return data?.signedUrl ?? null;
    }),
  );

  return signed.filter(Boolean) as string[];
}

export async function getQuestReviews(questId: string): Promise<QuestReview[]> {
  const supabase = getSupabaseClient() as any;

  if (supabase) {
    const { data, error } = await supabase.rpc("get_quest_reviews", {
      limit_count: 6,
      target_quest_id: questId,
    });

    if (!error && data) {
      const rows = data as any[];

      return Promise.all(
        rows.map(async (row) => ({
          avatar_url: row.avatar_url,
          comment: row.comment,
          created_at: row.created_at,
          display_name: null,
          photo_paths: row.photo_paths ?? [],
          photo_urls: await createSignedPhotoUrls(row.photo_paths ?? []),
          rating: row.rating,
          review_id: row.review_id,
          status: row.status,
          user_id: row.user_id,
          username: row.username,
        })),
      );
    }

    warnSupabaseFallback(
      "Quest reviews",
      error?.message ?? "The live review feed failed in Supabase.",
    );
  }

  return demoQuestReviews[questId] ?? [];
}

export async function submitReview(params: {
  comment: string;
  completionId: string;
  photoUri?: string;
  questId: string;
  rating: number;
}) {
  const supabase = getSupabaseClient() as any;
  const userId = await getCurrentSupabaseUserId();

  if (supabase && userId) {
    const { data, error } = await supabase
      .from("reviews")
      .insert({
        comment: params.comment,
        completion_id: params.completionId,
        quest_id: params.questId,
        rating: params.rating,
        user_id: userId,
      })
      .select("*")
      .single();

    if (error) {
      throw new Error(error.message);
    }

    let photoUploaded = false;
    let photoUploadError: string | null = null;

    if (params.photoUri) {
      try {
        const response = await fetch(params.photoUri);
        const arrayBuffer = await response.arrayBuffer();
        const extension = params.photoUri.split(".").pop() ?? "jpg";
        const storagePath = `${userId}/${data.id}/${Date.now()}.${extension}`;

        const { error: uploadError } = await supabase.storage
          .from("review-photos")
          .upload(storagePath, arrayBuffer, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          photoUploadError = uploadError.message;
        } else {
          const { error: photoRowError } = await supabase
            .from("review_photos")
            .insert({
              review_id: data.id,
              storage_path: storagePath,
            });

          if (photoRowError) {
            photoUploadError = photoRowError.message;
          } else {
            photoUploaded = true;
          }
        }
      } catch (error) {
        photoUploadError =
          error instanceof Error ? error.message : "Photo upload failed.";
      }
    }

    return {
      photoUploadError,
      photoUploaded,
      reviewId: data.id,
    };
  }

  return {
    photoUploadError: null,
    photoUploaded: Boolean(params.photoUri),
    reviewId: makeLocalId("review"),
  };
}
