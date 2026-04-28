'use client';

import { useEffect, useRef } from "react";

import { captureCurrentLocationSnapshot } from "@/lib/location";
import { useAppStore } from "@/store/app-store";

export function LocationBootstrapper() {
  const authMode = useAppStore((state) => state.authMode);
  const authBootstrapped = useAppStore((state) => state.authBootstrapped);
  const hydrated = useAppStore((state) => state.hydrated);
  const locationPermission = useAppStore((state) => state.locationPermission);
  const setStoredLocation = useAppStore((state) => state.setStoredLocation);
  const hasBootstrapped = useRef(false);

  useEffect(() => {
    if (!hydrated || !authBootstrapped || authMode !== "supabase") {
      hasBootstrapped.current = false;
      return;
    }

    if (locationPermission !== "granted") {
      return;
    }

    if (hasBootstrapped.current) {
      return;
    }

    hasBootstrapped.current = true;
    let active = true;

    void (async () => {
      try {
        const snapshot = await captureCurrentLocationSnapshot();

        if (active && snapshot) {
          setStoredLocation(snapshot);
        }
      } catch {
        // Keep the current fallback location in place if live capture fails.
      }
    })();

    return () => {
      active = false;
    };
  }, [authBootstrapped, authMode, hydrated, locationPermission, setStoredLocation]);

  return null;
}
