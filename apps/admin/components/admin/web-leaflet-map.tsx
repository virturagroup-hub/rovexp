"use client";

import { useEffect, useMemo } from "react";
import { divIcon, type LatLngBoundsExpression } from "leaflet";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import type { PlaceWithRelations } from "@rovexp/types";

type Coordinates = {
  latitude: number;
  longitude: number;
};

interface WebLeafletMapProps {
  draftPin: Coordinates | null;
  fallbackCenter: Coordinates;
  mode: "manual" | "search";
  onDropPin: (coordinates: Coordinates) => void;
  onSelectPlace: (placeId: string) => void;
  places: PlaceWithRelations[];
  selectedPlaceId: string | null;
}

const tileUrl = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

function buildMarkerIcon({
  label,
  selected,
  tone,
  variant,
}: {
  label: string;
  selected?: boolean;
  tone: string;
  variant?: "default" | "draft";
}) {
  const border = selected ? "rgba(224, 242, 254, 0.95)" : "rgba(255, 255, 255, 0.88)";
  const glow = selected
    ? "rgba(14, 165, 233, 0.34)"
    : variant === "draft"
      ? "rgba(234, 179, 8, 0.32)"
      : "rgba(15, 23, 42, 0.22)";
  const badgeBackground =
    variant === "draft"
      ? "rgba(245, 158, 11, 0.96)"
      : selected
        ? "rgba(14, 165, 233, 0.96)"
        : "rgba(15, 23, 42, 0.92)";

  return divIcon({
    className: "",
    iconAnchor: [26, 50],
    iconSize: [52, 64],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:52px;height:64px;pointer-events:none;">
        <div style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:9999px;background:${tone};border:3px solid ${border};box-shadow:0 18px 32px ${glow};transform:translateY(1px);"></div>
        <div style="margin-top:4px;max-width:52px;padding:2px 7px;border-radius:9999px;background:${badgeBackground};color:#fff;font-size:9px;font-weight:800;letter-spacing:0.14em;line-height:1;text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
          ${label}
        </div>
      </div>
    `,
  });
}

function safeMarkerLabel(value: string) {
  return value
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 3)
    .toUpperCase() || "PIN";
}

function MapClickHandler({
  enabled,
  onDropPin,
}: {
  enabled: boolean;
  onDropPin: (coordinates: Coordinates) => void;
}) {
  useMapEvents({
    click(event) {
      if (!enabled) {
        return;
      }

      onDropPin({
        latitude: event.latlng.lat,
        longitude: event.latlng.lng,
      });
    },
  });

  return null;
}

function MapViewportController({
  draftPin,
  fallbackCenter,
  mode,
  places,
  selectedPlace,
}: {
  draftPin: Coordinates | null;
  fallbackCenter: Coordinates;
  mode: "manual" | "search";
  places: PlaceWithRelations[];
  selectedPlace: PlaceWithRelations | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (mode === "manual") {
      if (draftPin) {
        map.setView([draftPin.latitude, draftPin.longitude], 14, { animate: true });
        return;
      }

      map.setView([fallbackCenter.latitude, fallbackCenter.longitude], 10, {
        animate: false,
      });
      return;
    }

    if (places.length > 1) {
      const bounds: LatLngBoundsExpression = places.map((place) => [
        place.latitude,
        place.longitude,
      ]);

      map.fitBounds(bounds, { padding: [48, 48], maxZoom: 13 });
      return;
    }

    if (places.length === 1) {
      map.setView([places[0]!.latitude, places[0]!.longitude], 13, { animate: false });
      return;
    }

    map.setView([fallbackCenter.latitude, fallbackCenter.longitude], 10, {
      animate: false,
    });
  }, [draftPin, fallbackCenter.latitude, fallbackCenter.longitude, map, mode, places]);

  useEffect(() => {
    if (mode !== "search" || !selectedPlace) {
      return;
    }

    map.flyTo([selectedPlace.latitude, selectedPlace.longitude], Math.max(map.getZoom(), 13), {
      animate: true,
      duration: 0.65,
    });
  }, [map, mode, selectedPlace]);

  return null;
}

export default function WebLeafletMap({
  draftPin,
  fallbackCenter,
  mode,
  onDropPin,
  onSelectPlace,
  places,
  selectedPlaceId,
}: WebLeafletMapProps) {
  const selectedPlace = useMemo(
    () => places.find((place) => place.id === selectedPlaceId) ?? null,
    [places, selectedPlaceId],
  );

  return (
    <MapContainer
      center={[fallbackCenter.latitude, fallbackCenter.longitude]}
      className="h-full w-full"
      preferCanvas
      scrollWheelZoom
      zoom={10}
      zoomControl
    >
      <TileLayer
        attribution="&copy; OpenStreetMap contributors"
        url={tileUrl}
      />

      <MapClickHandler enabled={mode === "manual"} onDropPin={onDropPin} />
      <MapViewportController
        draftPin={draftPin}
        fallbackCenter={fallbackCenter}
        mode={mode}
        places={places}
        selectedPlace={selectedPlace}
      />

      {places.map((place) => {
        const isSelected = place.id === selectedPlaceId;
        const stateCode = place.state?.code ?? place.state_code ?? "";
        const tone = stateCode === "IL"
          ? "linear-gradient(180deg, #0ea5e9, #38bdf8)"
          : stateCode === "CA"
            ? "linear-gradient(180deg, #f59e0b, #fb7185)"
            : stateCode === "NY"
              ? "linear-gradient(180deg, #14b8a6, #22c55e)"
              : stateCode === "TX"
                ? "linear-gradient(180deg, #60a5fa, #a78bfa)"
                : stateCode === "FL"
                  ? "linear-gradient(180deg, #f97316, #facc15)"
                  : "linear-gradient(180deg, #94a3b8, #cbd5e1)";
        const label = safeMarkerLabel(place.place_type || place.state?.code || "place");

        return (
          <Marker
            key={place.id}
            eventHandlers={{
              click: () => onSelectPlace(place.id),
            }}
            icon={buildMarkerIcon({
              label,
              selected: isSelected,
              tone,
            })}
            position={[place.latitude, place.longitude]}
          >
            <Popup>
              <div className="space-y-1.5">
                <p className="font-medium text-slate-950">{place.name}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                  {place.place_type}
                </p>
                <p className="text-xs leading-5 text-slate-600">
                  {place.city ?? "Unknown city"}
                  {place.state?.code ? `, ${place.state.code}` : ""}
                </p>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {draftPin ? (
        <Marker
          icon={buildMarkerIcon({
            label: "NEW",
            selected: true,
            tone: "linear-gradient(180deg, #f59e0b, #f97316)",
            variant: "draft",
          })}
          position={[draftPin.latitude, draftPin.longitude]}
        >
          <Popup>
            <div className="space-y-1.5">
              <p className="font-medium text-slate-950">Draft pin</p>
              <p className="text-xs leading-5 text-slate-600">
                This pin will seed a new place record.
              </p>
            </div>
          </Popup>
        </Marker>
      ) : null}
    </MapContainer>
  );
}
