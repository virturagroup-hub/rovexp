"use client";

import { useEffect, useMemo, useRef } from "react";

import { useGoogleMapsLoader } from "@/lib/admin/google-maps-loader";

export interface GoogleMapCanvasCenter {
  latitude: number;
  longitude: number;
  label: string;
}

export interface GoogleMapCanvasMarker {
  id: string;
  latitude: number;
  longitude: number;
  kind: "google" | "stored" | "manual" | "selected";
  subtitle?: string | null;
  title: string;
}

interface GoogleMapCanvasProps {
  apiKey: string;
  center: GoogleMapCanvasCenter;
  draftPin?: { latitude: number; longitude: number } | null;
  emptyMessage?: string;
  markers: GoogleMapCanvasMarker[];
  modeLabel: string;
  onMapClick?: (point: { latitude: number; longitude: number }) => void;
  onMarkerSelect: (markerId: string) => void;
  radiusMiles: number;
  selectedMarkerId: string | null;
}

function markerColor(kind: GoogleMapCanvasMarker["kind"], selected: boolean) {
  if (selected) {
    return "#0f172a";
  }

  switch (kind) {
    case "google":
      return "#0ea5e9";
    case "stored":
      return "#14b8a6";
    case "manual":
      return "#f59e0b";
    case "selected":
    default:
      return "#8b5cf6";
  }
}

function buildMarkerIcon(kind: GoogleMapCanvasMarker["kind"], selected: boolean) {
  const fill = markerColor(kind, selected);
  const outer = selected ? "#fde68a" : "#ffffff";

  return {
    anchor: new google.maps.Point(20, 40),
    scaledSize: new google.maps.Size(40, 40),
    url:
      "data:image/svg+xml;charset=UTF-8," +
      encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
          <path d="M20 38s10-10.2 10-19a10 10 0 1 0-20 0c0 8.8 10 19 10 19z" fill="${fill}" stroke="${outer}" stroke-width="2"/>
          <circle cx="20" cy="19" r="4.25" fill="${outer}"/>
        </svg>
      `),
  } satisfies google.maps.Icon;
}

function loadingLabel(status: "idle" | "loading" | "ready" | "error") {
  if (status === "loading") {
    return "Loading Google Maps…";
  }

  if (status === "error") {
    return "Google Maps could not load.";
  }

  return "Google Maps";
}

export function GoogleMapCanvas({
  apiKey,
  center,
  draftPin,
  emptyMessage,
  markers,
  modeLabel,
  onMapClick,
  onMarkerSelect,
  radiusMiles,
  selectedMarkerId,
}: GoogleMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const radiusRef = useRef<google.maps.Circle | null>(null);
  const centerMarkerRef = useRef<google.maps.Marker | null>(null);
  const draftMarkerRef = useRef<google.maps.Marker | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const { error, status } = useGoogleMapsLoader(apiKey);

  const radiusMeters = useMemo(() => Math.max(0, radiusMiles * 1609.34), [radiusMiles]);

  useEffect(() => {
    if (status !== "ready" || !containerRef.current || mapRef.current) {
      return;
    }

    const map = new google.maps.Map(containerRef.current, {
      center: {
        lat: center.latitude,
        lng: center.longitude,
      },
      clickableIcons: true,
      disableDefaultUI: false,
      fullscreenControl: false,
      gestureHandling: "greedy",
      mapTypeControl: false,
      streetViewControl: false,
      zoom: 13,
    });

    mapRef.current = map;
  }, [center.latitude, center.longitude, status]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) {
      return;
    }

    const map = mapRef.current;
    map.setCenter({ lat: center.latitude, lng: center.longitude });

    if (markers.length === 0) {
      map.setZoom(13);
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: center.latitude, lng: center.longitude });

    markers.forEach((marker) => {
      bounds.extend({ lat: marker.latitude, lng: marker.longitude });
    });

    if (draftPin) {
      bounds.extend({ lat: draftPin.latitude, lng: draftPin.longitude });
    }

    map.fitBounds(bounds, 72);
  }, [center.latitude, center.longitude, draftPin, markers, status]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) {
      return;
    }

    if (clickListenerRef.current) {
      clickListenerRef.current.remove();
      clickListenerRef.current = null;
    }

    if (!onMapClick) {
      return;
    }

    clickListenerRef.current = mapRef.current.addListener("click", (event: google.maps.MapMouseEvent) => {
      const lat = event.latLng?.lat();
      const lng = event.latLng?.lng();

      if (typeof lat === "number" && typeof lng === "number") {
        onMapClick({ latitude: lat, longitude: lng });
      }
    });
  }, [onMapClick, status]);

  useEffect(() => {
    if (status !== "ready" || !mapRef.current) {
      return;
    }

    const map = mapRef.current;

    centerMarkerRef.current?.setMap(null);
    centerMarkerRef.current = new google.maps.Marker({
      icon: buildMarkerIcon("selected", false),
      map,
      position: { lat: center.latitude, lng: center.longitude },
      title: center.label,
      zIndex: 3,
    });

    radiusRef.current?.setMap(null);
    radiusRef.current = new google.maps.Circle({
      center: { lat: center.latitude, lng: center.longitude },
      fillColor: "#0ea5e9",
      fillOpacity: 0.08,
      map,
      radius: radiusMeters,
      strokeColor: "#0ea5e9",
      strokeOpacity: 0.48,
      strokeWeight: 2,
    });

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = markers.map((marker) => {
      const isSelected = marker.id === selectedMarkerId;

      return new google.maps.Marker({
        icon: buildMarkerIcon(marker.kind, isSelected),
        map,
        position: { lat: marker.latitude, lng: marker.longitude },
        title: marker.title,
        zIndex: isSelected ? 2 : 1,
      });
    });

    markersRef.current.forEach((marker, index) => {
      const markerId = markers[index]?.id ?? "";

      marker.addListener("click", () => {
        onMarkerSelect(markerId);
      });
    });

    draftMarkerRef.current?.setMap(null);
    if (draftPin) {
      draftMarkerRef.current = new google.maps.Marker({
        draggable: Boolean(onMapClick),
        icon: buildMarkerIcon("manual", true),
        map,
        position: { lat: draftPin.latitude, lng: draftPin.longitude },
        title: "Draft pin",
        zIndex: 4,
      });

      if (onMapClick) {
        draftMarkerRef.current.addListener("dragend", () => {
          const position = draftMarkerRef.current?.getPosition();

          if (!position) {
            return;
          }

          onMapClick({
            latitude: position.lat(),
            longitude: position.lng(),
          });
        });
      }
    } else {
      draftMarkerRef.current = null;
    }
  }, [center.latitude, center.label, center.longitude, draftPin, markers, onMapClick, onMarkerSelect, radiusMeters, selectedMarkerId, status]);

  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      centerMarkerRef.current?.setMap(null);
      radiusRef.current?.setMap(null);
      draftMarkerRef.current?.setMap(null);
      clickListenerRef.current?.remove();
    };
  }, []);

  if (status === "error") {
    return (
      <div className="flex min-h-[700px] items-center justify-center rounded-[2rem] border border-rose-200 bg-rose-50 p-6 text-sm leading-7 text-rose-900">
        <div className="max-w-md space-y-3">
          <p className="font-semibold">Google Maps is not available.</p>
          <p>{error ?? "Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to load the admin map explorer."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[700px] overflow-hidden rounded-[2rem] bg-slate-950">
      <div ref={containerRef} className="absolute inset-0" />

      <div className="pointer-events-none absolute left-4 top-4 z-[500] flex flex-wrap gap-2">
        <div className="rounded-full border border-white/10 bg-slate-950/92 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/90 backdrop-blur">
          {loadingLabel(status)}
        </div>
        <div className="rounded-full border border-white/10 bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-950 backdrop-blur">
          {modeLabel}
        </div>
        <div className="rounded-full border border-white/10 bg-slate-950/86 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur">
          {markers.length} markers
        </div>
      </div>

      {status === "loading" ? (
        <div className="pointer-events-none absolute inset-0 z-[550] flex items-center justify-center bg-slate-950/18 backdrop-blur-[1px]">
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/92 px-4 py-3 text-sm text-white shadow-2xl">
            Loading Google Maps…
          </div>
        </div>
      ) : null}

      {status === "ready" && markers.length === 0 ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-4 z-[520] max-w-[560px] rounded-[1.75rem] border border-white/10 bg-slate-950/90 p-4 text-sm leading-7 text-slate-200 shadow-2xl backdrop-blur">
          <p className="font-semibold text-white">No markers to show yet.</p>
          <p className="mt-1 text-slate-300">
            {emptyMessage ?? "Run a search or switch modes. The real Google map stays visible either way."}
          </p>
        </div>
      ) : null}
    </div>
  );
}
