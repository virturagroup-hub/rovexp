"use client";

import { Loader2, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { NearbyPlacesSearchMode, StateRecord } from "@rovexp/types";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface NearbyPlacesSearchControlsProps {
  hasPreview: boolean;
  resultAnchorId: string;
  states: StateRecord[];
}

function readSearchMode(value: string | null): NearbyPlacesSearchMode {
  if (value === "coordinates" || value === "combined" || value === "stored_area") {
    return value;
  }

  return "stored_area";
}

function readParam(searchParams: URLSearchParams, key: string) {
  return searchParams.get(key) ?? "";
}

export function NearbyPlacesSearchControls({
  hasPreview,
  resultAnchorId,
  states,
}: NearbyPlacesSearchControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchModeParam = searchParams.get("search_mode");
  const [searchMode, setSearchMode] = useState<NearbyPlacesSearchMode>(
    readSearchMode(searchModeParam),
  );
  const [isPending, startTransition] = useTransition();
  const previousHasPreview = useRef(hasPreview);
  const formKey = searchParams.toString();

  const currentValues = useMemo(
    () => ({
      active_only: readParam(searchParams, "active_only"),
      area_label: readParam(searchParams, "area_label"),
      city: readParam(searchParams, "city"),
      latitude: readParam(searchParams, "latitude"),
      longitude: readParam(searchParams, "longitude"),
      min_rating: readParam(searchParams, "min_rating"),
      min_review_count: readParam(searchParams, "min_review_count"),
      place_types: readParam(searchParams, "place_types"),
      public_only: readParam(searchParams, "public_only"),
      radius_miles: readParam(searchParams, "radius_miles") || "10",
      state_id: readParam(searchParams, "state_id"),
    }),
    [searchParams],
  );

  useEffect(() => {
    if (!previousHasPreview.current && hasPreview) {
      const target = document.getElementById(resultAnchorId);

      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    previousHasPreview.current = hasPreview;
  }, [hasPreview, resultAnchorId]);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const nextParams = new URLSearchParams();
    const mode = readSearchMode(formData.get("search_mode")?.toString() ?? searchMode);

    nextParams.set("search_mode", mode);

    const add = (key: string) => {
      const value = formData.get(key)?.toString().trim() ?? "";

      if (value) {
        nextParams.set(key, value);
      }
    };

    const addCheckbox = (key: string) => {
      if (formData.get(key) === "on") {
        nextParams.set(key, "on");
      }
    };

    add("state_id");
    add("area_label");
    add("city");
    add("latitude");
    add("longitude");
    add("radius_miles");
    add("place_types");
    add("min_rating");
    add("min_review_count");
    addCheckbox("active_only");
    addCheckbox("public_only");

    startTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    });
  };

  return (
    <CardShell>
      <form key={formKey} onSubmit={submitSearch} className="space-y-4" aria-busy={isPending}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
              Nearby place search
            </p>
            <h2 className="font-display text-2xl tracking-tight text-slate-950">
              Define an area, preview matching places, then generate drafts
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-600">
              Use a stored area for a lighter search, use coordinates for precise radius matching,
              or combine both when you want the strongest control.
            </p>
          </div>

          <Badge className="bg-slate-950 text-white hover:bg-slate-950">
            {isPending ? "Searching..." : hasPreview ? "Preview loaded" : "Search ready"}
          </Badge>
        </div>

        <input type="hidden" name="search_mode" value={searchMode} />

        <div className="grid gap-2 sm:grid-cols-3">
          {(
            [
              {
                body: "State, city, and an optional area label determine the center from stored places.",
                id: "stored_area",
                label: "Stored area",
              },
              {
                body: "Latitude, longitude, and radius drive the exact nearby search around a pin.",
                id: "coordinates",
                label: "Coordinates",
              },
              {
                body: "Combine the state/city filter with a precise center for the cleanest batch.",
                id: "combined",
                label: "Combined",
              },
            ] as const
          ).map((mode) => {
            const active = searchMode === mode.id;

            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => setSearchMode(mode.id)}
                className={cn(
                  "rounded-[1.6rem] border px-4 py-4 text-left transition",
                  active
                    ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                    : "border-slate-200 bg-white/80 text-slate-700 hover:border-sky-200 hover:bg-white",
                )}
              >
                <p className="text-xs uppercase tracking-[0.24em] opacity-70">
                  {mode.label}
                </p>
                <p className="mt-2 text-sm leading-6 opacity-90">{mode.body}</p>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">State</label>
            <select
              defaultValue={currentValues.state_id}
              name="state_id"
              className="flex h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm shadow-xs"
              required
            >
              <option value="">Select state</option>
              {states.map((state) => (
                <option key={state.id} value={state.id}>
                  {state.code} · {state.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Area label</label>
            <Input
              defaultValue={currentValues.area_label}
              name="area_label"
              placeholder="Lafayette downtown, Riverfront, campus district..."
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">City filter</label>
          <Input
            defaultValue={currentValues.city}
            name="city"
            placeholder="Optional city or neighborhood name"
          />
        </div>

        {searchMode !== "stored_area" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Latitude</label>
              <Input
                defaultValue={currentValues.latitude}
                name="latitude"
                step="0.000001"
                type="number"
                placeholder={searchMode === "coordinates" ? "Required for precise search" : ""}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Longitude</label>
              <Input
                defaultValue={currentValues.longitude}
                name="longitude"
                step="0.000001"
                type="number"
                placeholder={searchMode === "coordinates" ? "Required for precise search" : ""}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Radius (miles)</label>
              <Input
                defaultValue={currentValues.radius_miles}
                min="1"
                name="radius_miles"
                step="1"
                type="number"
              />
            </div>
          </div>
        ) : (
          <div className="rounded-[1.6rem] border border-sky-200 bg-sky-50/70 p-4 text-sm leading-7 text-sky-950">
            Stored area mode is helpful when you know the city or district but not the exact pin.
            The backend will derive a search center from matching stored places in that area and use
            a sensible radius for the preview.
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Place type keywords
          </label>
          <Textarea
            defaultValue={currentValues.place_types}
            name="place_types"
            placeholder="cafe, park, museum, landmark, bookstore, mural"
            rows={3}
          />
          <p className="text-xs leading-6 text-slate-500">
            Separate keywords with commas or line breaks. The generator matches against the stored
            place type, name, and description.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Minimum rating</label>
            <Input
              defaultValue={currentValues.min_rating}
              max="5"
              min="0"
              name="min_rating"
              placeholder="Optional"
              step="0.1"
              type="number"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">
              Minimum review count
            </label>
            <Input
              defaultValue={currentValues.min_review_count}
              min="0"
              name="min_review_count"
              placeholder="Optional"
              step="1"
              type="number"
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <input
              defaultChecked={currentValues.active_only === "on" || currentValues.active_only === "true"}
              name="active_only"
              type="checkbox"
              className="size-4 accent-slate-950"
            />
            Active places only
          </label>

          <label className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
            <input
              defaultChecked={currentValues.public_only === "on" || currentValues.public_only === "true"}
              name="public_only"
              type="checkbox"
              className="size-4 accent-slate-950"
            />
            Publicly visitable only
          </label>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            disabled={isPending}
            className="bg-slate-950 text-white hover:bg-slate-800 disabled:opacity-70"
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            {isPending ? "Searching nearby places" : "Preview matching places"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.replace("/dashboard/places/nearby", { scroll: false })}
          >
            <SlidersHorizontal className="size-4" />
            Reset filters
          </Button>
        </div>
      </form>
    </CardShell>
  );
}

function CardShell({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[2rem] border border-white/70 bg-white/84 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
      <div className="space-y-0 p-6">{children}</div>
    </div>
  );
}
