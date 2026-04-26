"use client";

import { useEffect, useMemo, useState } from "react";

type GoogleMapsLoaderStatus = "idle" | "loading" | "ready" | "error";

let googleMapsLoaderPromise: Promise<void> | null = null;

function hasGoogleMaps() {
  return typeof window !== "undefined" && Boolean(window.google?.maps);
}

function loadGoogleMapsScript(apiKey: string) {
  if (!apiKey) {
    return Promise.reject(new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing."));
  }

  if (hasGoogleMaps()) {
    return Promise.resolve();
  }

  if (!googleMapsLoaderPromise) {
    googleMapsLoaderPromise = new Promise<void>((resolve, reject) => {
      const scriptId = "rovexp-google-maps-js";
      const existing = document.getElementById(scriptId) as HTMLScriptElement | null;

      const handleLoad = () => resolve();
      const handleError = () =>
        reject(new Error("Google Maps JavaScript API could not be loaded."));

      if (existing) {
        if (hasGoogleMaps()) {
          resolve();
          return;
        }

        existing.addEventListener("load", handleLoad, { once: true });
        existing.addEventListener("error", handleError, { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = scriptId;
      script.async = true;
      script.defer = true;
      script.onerror = handleError;
      script.onload = handleLoad;
      script.src =
        `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
        "&libraries=places&v=weekly";

      document.head.append(script);
    });
  }

  return googleMapsLoaderPromise;
}

export function useGoogleMapsLoader(apiKey: string) {
  const [status, setStatus] = useState<GoogleMapsLoaderStatus>(() =>
    apiKey ? "loading" : "error",
  );
  const [error, setError] = useState<string | null>(() =>
    apiKey ? null : "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is missing.",
  );

  useEffect(() => {
    let active = true;

    if (!apiKey) {
      return () => {
        active = false;
      };
    }

    loadGoogleMapsScript(apiKey)
      .then(() => {
        if (!active) {
          return;
        }

        setStatus("ready");
      })
      .catch((loadError) => {
        if (!active) {
          return;
        }

        setStatus("error");
        setError(loadError instanceof Error ? loadError.message : "Google Maps failed to load.");
      });

    return () => {
      active = false;
    };
  }, [apiKey]);

  return useMemo(
    () => ({
      error,
      google: hasGoogleMaps() ? window.google : null,
      status,
    }),
    [error, status],
  );
}
