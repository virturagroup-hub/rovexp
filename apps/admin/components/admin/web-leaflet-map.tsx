"use client";

import { useEffect, useMemo } from "react";
import { Circle, Marker, MapContainer, TileLayer, useMap } from "react-leaflet";
import { divIcon, type LatLngBoundsExpression } from "leaflet";

import type { NearbyBusinessResult, NearbyBusinessSearchCenter } from "@rovexp/types";

type Coordinates = {
  latitude: number;
  longitude: number;
};

interface WebLeafletMapProps {
  center: NearbyBusinessSearchCenter;
  onSelectResult: (resultId: string) => void;
  radiusMiles: number;
  results: NearbyBusinessResult[];
  selectedResultId: string | null;
}

const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

const toneByCategory: Record<string, string> = {
  coffee: "linear-gradient(180deg, #22d3ee, #38bdf8)",
  culture: "linear-gradient(180deg, #a855f7, #ec4899)",
  entertainment: "linear-gradient(180deg, #3b82f6, #22d3ee)",
  food: "linear-gradient(180deg, #f59e0b, #fb7185)",
  landmarks: "linear-gradient(180deg, #2563eb, #8b5cf6)",
  parks: "linear-gradient(180deg, #10b981, #14b8a6)",
  shopping: "linear-gradient(180deg, #f43f5e, #fb7185)",
};

function buildMarkerIcon({
  label,
  selected,
  tone,
  variant,
}: {
  label: string;
  selected?: boolean;
  tone: string;
  variant?: "default" | "center";
}) {
  const border = selected ? "rgba(224, 242, 254, 0.95)" : "rgba(255, 255, 255, 0.88)";
  const glow = selected
    ? "rgba(14, 165, 233, 0.34)"
    : variant === "center"
      ? "rgba(250, 204, 21, 0.34)"
      : "rgba(15, 23, 42, 0.22)";
  const badgeBackground =
    variant === "center"
      ? "rgba(251, 191, 36, 0.96)"
      : selected
        ? "rgba(14, 165, 233, 0.96)"
        : "rgba(15, 23, 42, 0.92)";

  return divIcon({
    className: "",
    iconAnchor: [26, 50],
    iconSize: [52, 64],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:52px;height:64px;pointer-events:none;">
        <div style="display:flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:9999px;background:${tone};border:3px solid ${border};box-shadow:0 18px 32px ${glow};transform:translateY(1px);"></div>
        <div style="margin-top:4px;max-width:52px;padding:2px 7px;border-radius:9999px;background:${badgeBackground};color:#fff;font-size:9px;font-weight:800;letter-spacing:0.14em;line-height:1;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${label}
        </div>
      </div>
    `,
  });
}

function badgeLabel(placeType: string) {
  const normalized = placeType.trim().toLowerCase();

  if (normalized.includes("coffee")) {
    return "CO";
  }

  if (normalized.includes("restaurant") || normalized.includes("food")) {
    return "FO";
  }

  if (normalized.includes("park")) {
    return "PK";
  }

  if (normalized.includes("museum") || normalized.includes("culture")) {
    return "CU";
  }

  if (normalized.includes("shop")) {
    return "SH";
  }

  if (normalized.includes("entertain")) {
    return "EN";
  }

  if (normalized.includes("land")) {
    return "LM";
  }

  return placeType.slice(0, 2).toUpperCase() || "NE";
}

function MapViewportController({
  center,
  radiusMiles,
  results,
  selectedResult,
}: {
  center: Coordinates;
  radiusMiles: number;
  results: NearbyBusinessResult[];
  selectedResult: NearbyBusinessResult | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (results.length > 0) {
      const bounds: LatLngBoundsExpression = [
        [center.latitude, center.longitude],
        ...results.map((result) => [result.latitude, result.longitude] as [number, number]),
      ];

      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 14 });
      return;
    }

    map.setView([center.latitude, center.longitude], 13, { animate: false });
  }, [center.latitude, center.longitude, map, results, radiusMiles]);

  useEffect(() => {
    if (!selectedResult) {
      return;
    }

    map.flyTo(
      [selectedResult.latitude, selectedResult.longitude],
      Math.max(map.getZoom(), 14),
      {
        animate: true,
        duration: 0.55,
      },
    );
  }, [map, selectedResult]);

  return null;
}

export default function WebLeafletMap({
  center,
  onSelectResult,
  radiusMiles,
  results,
  selectedResultId,
}: WebLeafletMapProps) {
  const selectedResult = useMemo(
    () => results.find((result) => result.id === selectedResultId) ?? null,
    [results, selectedResultId],
  );
  const radiusMeters = Math.max(0, radiusMiles * 1609.34);

  return (
    <MapContainer
      center={[center.latitude, center.longitude]}
      className="h-full min-h-[620px] w-full"
      preferCanvas
      scrollWheelZoom
      zoom={13}
      zoomControl
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url={tileUrl}
      />

      <MapViewportController
        center={center}
        radiusMiles={radiusMiles}
        results={results}
        selectedResult={selectedResult}
      />

      {radiusMeters > 0 ? (
        <Circle
          center={[center.latitude, center.longitude]}
          pathOptions={{
            color: "#0ea5e9",
            fillColor: "#38bdf8",
            fillOpacity: 0.08,
            opacity: 0.5,
            weight: 1.5,
          }}
          radius={radiusMeters}
        />
      ) : null}

      <Marker
        icon={buildMarkerIcon({
          label: "CTR",
          tone: "linear-gradient(180deg, #f59e0b, #fb923c)",
          variant: "center",
        })}
        position={[center.latitude, center.longitude]}
      />

      {results.map((result) => {
        const isSelected = result.id === selectedResultId;

        return (
          <Marker
            key={result.id}
            eventHandlers={{
              click: () => onSelectResult(result.id),
            }}
            icon={buildMarkerIcon({
              label: badgeLabel(result.place_type),
              selected: isSelected,
              tone: toneByCategory[result.place_type] ?? "linear-gradient(180deg, #94a3b8, #cbd5e1)",
            })}
            position={[result.latitude, result.longitude]}
          />
        );
      })}
    </MapContainer>
  );
}
