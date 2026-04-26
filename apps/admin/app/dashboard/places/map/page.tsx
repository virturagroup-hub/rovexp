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

  const importedCount = places.length;
  const candidateCount = candidates.length;
  const publishedCount = quests.filter((quest) => Boolean(quest.place_id)).length;

  return (
    <div className="space-y-6">
      <StatusBanner code={params.error ?? params.status} />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[2rem] border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Badge className="bg-sky-100 text-sky-900">Map explorer</Badge>
              <Badge variant="outline">Stored places</Badge>
            </div>
            <CardTitle className="font-display text-3xl tracking-tight text-slate-950">
              Search the map, inspect a place, and seed the next quest source
            </CardTitle>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              This tool uses the stored places table as its source of truth. Search by business name,
              address, city, or landmark, then choose whether to open, edit, or generate the next
              candidate from the selected place.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-3">
            {[
              {
                detail: "All imported location rows ready for inspection.",
                label: "Places",
                value: importedCount,
              },
              {
                detail: "Draft candidates already in the review pipeline.",
                label: "Candidates",
                value: candidateCount,
              },
              {
                detail: "Published live quests linked to place rows.",
                label: "Live quests",
                value: publishedCount,
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
                Find a spot and move it into the content pipeline
              </h2>
              <p className="text-sm leading-7 text-slate-300">
                The map explorer is designed for internal ops. It keeps humans in control while making
                it much faster to find, add, and turn interesting places into quest candidates.
              </p>
            </div>

            <div className="space-y-3">
              {[
                "Search by business, landmark, address, or city.",
                "Inspect imported status, candidate status, and published quests in one view.",
                "Drop a new pin on the map to seed a place, then optionally generate a candidate right away.",
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
                  Nearby generator
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
              When we add external place search later, this same map explorer can layer live search
              results on top of the stored place corpus without changing the review/publish workflow.
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
