import Link from "next/link";
import { ArrowLeft, Sparkles } from "lucide-react";

import { StatusBanner } from "@/components/admin/status-banner";
import { AdminMapExplorer } from "@/components/admin/map-explorer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  listPlaces,
  listQuestCandidates,
  listQuests,
  listStates,
} from "@/lib/admin/repository";

interface MapExplorerPageProps {
  searchParams: Promise<{
    error?: string;
    status?: string;
  }>;
}

export default async function MapExplorerPage({
  searchParams,
}: MapExplorerPageProps) {
  const params = await searchParams;
  const [places, candidates, quests, states] = await Promise.all([
    listPlaces(),
    listQuestCandidates(),
    listQuests(),
    listStates(),
  ]);

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-sky-100 text-sky-900">Internal draft tool</Badge>
              <Badge variant="outline">Not part of the showcase path</Badge>
            </div>
            <CardTitle className="font-display text-3xl tracking-tight text-slate-950">
              Draft a location by hand if you need a one-off internal place record
            </CardTitle>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              This route is an internal utility for one-off drafting. The showcase itself does not
              depend on this screen. Use the main places and nearby generator workflow for the
              repeatable content pipeline.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {[
                {
                detail: "Create a one-off place record from a selected location.",
                label: "Draft",
                value: "Local",
              },
              {
                detail: "Save the record into the internal places table.",
                label: "Store",
                value: "Place",
              },
              {
                detail: "Generate a quest candidate after the place is saved.",
                label: "Next step",
                value: "Quest",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-[1.75rem] border border-slate-200 bg-slate-50/80 p-4"
              >
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                  {item.label}
                </p>
                <p className="mt-2 font-display text-3xl font-semibold text-slate-950">
                  {item.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-600">{item.detail}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-slate-950 bg-slate-950 text-white shadow-[0_22px_56px_rgba(15,23,42,0.18)]">
          <CardContent className="space-y-4 p-6">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400">
                Map workflow
              </p>
              <h2 className="font-display text-2xl tracking-tight">
                Search nearby businesses, pick one, and save it into the pipeline
              </h2>
              <p className="text-sm leading-7 text-slate-300">
                This tool uses public business data around the location you choose. It is not a
                place import screen. Choose a location, filter by business type, then save the
                selected business as a stored place or place-plus-candidate.
              </p>
            </div>

            <div className="space-y-3">
              {[
                "Choose a city, address, or coordinates for the search center.",
                "Pick one or more business types, then click Search nearby businesses.",
                "Select a result to save it as a stored place or generate a quest candidate.",
              ].map((item) => (
                <div
                  key={item}
                  className="rounded-3xl border border-white/10 bg-white/5 px-4 py-4 text-sm leading-7 text-slate-200"
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="bg-white text-slate-950 hover:bg-slate-100">
                <Link href="/dashboard/places">
                  <ArrowLeft className="size-4" />
                  Back to places
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-white/10 bg-white/5 text-white hover:bg-white/10">
                <Link href="/dashboard/places/nearby">
                  <Sparkles className="size-4" />
                  Nearby candidate builder
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <AdminMapExplorer
        candidates={candidates}
        places={places}
        quests={quests}
        states={states}
      />

      <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
        <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Future-ready
            </p>
            <p className="text-sm leading-7 text-slate-600">
              When we add richer external discovery later, this same map explorer can layer more
              sources on top of the nearby-business search without changing the review/publish
              workflow.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Search</Badge>
            <Badge variant="outline">Map</Badge>
            <Badge variant="outline">Add</Badge>
            <Badge variant="outline">Generate</Badge>
            <Badge variant="outline">Publish later</Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
