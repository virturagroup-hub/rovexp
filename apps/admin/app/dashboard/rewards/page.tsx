import Link from "next/link";
import { Gift, Plus } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveRewardAction } from "@/lib/admin/actions";
import { listRewards } from "@/lib/admin/repository";

interface RewardsPageProps {
  searchParams: Promise<{
    edit?: string;
    error?: string;
    status?: string;
  }>;
}

const rewardTypes = [
  { value: "perk", label: "Perk" },
  { value: "discount", label: "Discount" },
  { value: "collectible", label: "Collectible" },
  { value: "experience_boost", label: "Experience boost" },
] as const;

export default async function RewardsPage({ searchParams }: RewardsPageProps) {
  const params = await searchParams;
  const rewards = await listRewards();
  const editing = rewards.find((item) => item.id === params.edit) ?? null;

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                Reward catalog
              </p>
              <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
                Redeemables and perk rules
              </CardTitle>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard/rewards">
                <Plus className="size-4" />
                New reward
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {rewards.length > 0 ? (
              rewards.map((reward) => (
                <Link
                  key={reward.id}
                  href={`/dashboard/rewards?edit=${reward.id}`}
                  className="block rounded-3xl border border-slate-200 bg-slate-50/80 p-5 transition hover:border-sky-200 hover:bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-slate-900 text-white">
                          {reward.reward_type.replace("_", " ")}
                        </Badge>
                        <Badge
                          variant={reward.is_active ? "default" : "secondary"}
                          className={
                            reward.is_active
                              ? "bg-emerald-100 text-emerald-900"
                              : ""
                          }
                        >
                          {reward.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div>
                        <p className="font-display text-xl font-semibold text-slate-950">
                          {reward.name}
                        </p>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {reward.description}
                        </p>
                      </div>
                    </div>
                    <Gift className="size-5 text-slate-400" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm leading-7 text-slate-500">
                No rewards yet. Add a first redeemable to anchor progression.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              {editing ? "Edit reward" : "Create reward"}
            </p>
            <CardTitle className="font-display text-2xl tracking-tight text-slate-950">
              {editing ? editing.name : "New reward"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={saveRewardAction} className="space-y-4">
              <input type="hidden" name="id" value={editing?.id ?? ""} />

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Reward name
                </label>
                <Input
                  name="name"
                  defaultValue={editing?.name ?? ""}
                  placeholder="Scout Sticker Pack"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Description
                </label>
                <Textarea
                  name="description"
                  rows={4}
                  defaultValue={editing?.description ?? ""}
                  placeholder="What the player gets and why it matters."
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Reward type
                </label>
                <select
                  name="reward_type"
                  defaultValue={editing?.reward_type ?? "perk"}
                  className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
                >
                  {rewardTypes.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
                  Rule JSON
                </label>
                <Textarea
                  name="rule_json"
                  rows={5}
                  defaultValue={
                    editing?.rule_json
                      ? JSON.stringify(editing.rule_json, null, 2)
                      : ""
                  }
                  placeholder='{"xpRequired":500}'
                />
              </div>

              <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="is_active"
                  defaultChecked={editing?.is_active ?? true}
                  className="size-4 accent-slate-950"
                />
                Available for redemption logic
              </label>

              <div className="flex flex-wrap gap-3">
                <SubmitButton>
                  {editing ? "Save reward" : "Create reward"}
                </SubmitButton>
                {editing ? (
                  <Button asChild variant="outline">
                    <Link href="/dashboard/rewards">Clear selection</Link>
                  </Button>
                ) : null}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
