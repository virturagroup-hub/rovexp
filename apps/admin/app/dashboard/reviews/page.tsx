import { Camera, Flag, MessageSquare, Shield } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { moderateReviewAction } from "@/lib/admin/actions";
import { listReviews } from "@/lib/admin/repository";

interface ReviewsPageProps {
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
}

const statusOptions = [
  { value: "visible", label: "Visible" },
  { value: "flagged", label: "Flagged" },
  { value: "hidden", label: "Hidden" },
] as const;

export default async function ReviewsPage({ searchParams }: ReviewsPageProps) {
  const params = await searchParams;
  const reviews = await listReviews();
  const flaggedCount = reviews.filter((review) => review.status === "flagged").length;

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <section className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: "Submitted reviews",
            value: reviews.length,
            detail: "All visible, flagged, and hidden submissions.",
          },
          {
            label: "Flagged right now",
            value: flaggedCount,
            detail: "Requires a moderation decision or confirmation.",
          },
          {
            label: "Photos attached",
            value: reviews.filter((review) => (review.photos ?? []).length > 0).length,
            detail: "Review rows with at least one uploaded image.",
          },
        ].map((item) => (
          <Card
            key={item.label}
            className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]"
          >
            <CardContent className="space-y-2 p-6">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                {item.label}
              </p>
              <p className="font-display text-4xl font-semibold text-slate-950">
                {item.value}
              </p>
              <p className="text-sm leading-7 text-slate-600">{item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <CardHeader className="space-y-2">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
            Review moderation
          </p>
          <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
            Inspect sentiment, photo presence, and visibility state
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {reviews.length ? (
            reviews.map((review) => {
              const photos = review.photos ?? [];

              return (
                <div
                  key={review.id}
                  className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge
                          className={
                            review.status === "visible"
                              ? "bg-emerald-100 text-emerald-900"
                              : review.status === "flagged"
                                ? "bg-amber-100 text-amber-900"
                                : "bg-slate-200 text-slate-800"
                          }
                        >
                          {review.status}
                        </Badge>
                        <Badge variant="outline">{review.quest.title}</Badge>
                        <Badge variant="outline">{review.quest.state.code}</Badge>
                        <Badge variant="secondary">{review.rating}/5</Badge>
                        <Badge variant="secondary">
                          {photos.length} photo{photos.length === 1 ? "" : "s"}
                        </Badge>
                      </div>

                      <div>
                        <p className="font-display text-xl font-semibold text-slate-950">
                          {review.profile.display_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          @{review.profile.username} ·{" "}
                          {new Date(review.created_at).toLocaleString()}
                        </p>
                      </div>

                      <div className="rounded-3xl border border-slate-200 bg-white px-4 py-4 text-sm leading-7 text-slate-700">
                        {review.comment}
                      </div>

                      <div className="flex flex-wrap gap-3 text-sm text-slate-500">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                          <MessageSquare className="size-3.5" />
                          Review ID {review.id.slice(0, 8)}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                          <Camera className="size-3.5" />
                          {photos.length ? "Photo uploaded" : "No photo attached"}
                        </span>
                        {review.moderated_by ? (
                          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                            <Shield className="size-3.5" />
                            Moderated{" "}
                            {new Date(
                              review.moderated_at ?? review.created_at,
                            ).toLocaleDateString()}
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <form
                      action={moderateReviewAction}
                      className="w-full max-w-sm space-y-4"
                    >
                      <input type="hidden" name="review_id" value={review.id} />

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Visibility state
                        </label>
                        <select
                          name="status"
                          defaultValue={review.status}
                          className="flex h-10 w-full rounded-xl border border-input bg-white px-3 text-sm shadow-xs"
                        >
                          {statusOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-slate-700">
                          Moderation note
                        </label>
                        <Textarea
                          name="moderation_reason"
                          rows={4}
                          defaultValue={review.moderation_reason ?? ""}
                          placeholder="Optional internal context for why the review was hidden or flagged."
                        />
                      </div>

                      <SubmitButton>
                        <Flag className="size-4" />
                        Save moderation
                      </SubmitButton>
                    </form>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
              No reviews have been submitted yet. Once explorers finish quests
              and leave feedback, moderation controls will appear here automatically.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
