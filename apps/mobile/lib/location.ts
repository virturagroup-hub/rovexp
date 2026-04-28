import * as Location from "expo-location";

import { usStates } from "@rovexp/types";

import { mobileEnv } from "@/lib/env";
import type { LocationSnapshot } from "@/store/app-store";

const stateCodeByName = new Map(
  usStates.map((state) => [state.name.toLowerCase(), state.code]),
);
function resolveStateCode(region: string | null | undefined) {
  if (!region) {
    return mobileEnv.defaultStateCode;
  }

  const normalized = region.trim().toUpperCase();

  const directMatch = usStates.find((state) => state.code === normalized);

  if (directMatch) {
    return directMatch.code;
  }

  const byName = stateCodeByName.get(region.trim().toLowerCase());

  return byName ?? mobileEnv.defaultStateCode;
}

function resolveAreaLabel(
  address:
    | Awaited<ReturnType<typeof Location.reverseGeocodeAsync>>[number]
    | null,
  stateCode: string,
) {
  const locality =
    address?.city?.trim() ??
    address?.district?.trim() ??
    address?.subregion?.trim() ??
    null;

  if (locality) {
    return `${locality}, ${stateCode}`;
  }

  if (address?.region?.trim()) {
    return address.region.trim();
  }

  return "Live location";
}

export async function captureCurrentLocationSnapshot(): Promise<LocationSnapshot | null> {
  const currentPosition = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  let reverseGeocodedAddress:
    | Awaited<ReturnType<typeof Location.reverseGeocodeAsync>>[number]
    | null = null;

  try {
    const [address] = await Location.reverseGeocodeAsync({
      latitude: currentPosition.coords.latitude,
      longitude: currentPosition.coords.longitude,
    });

    reverseGeocodedAddress = address ?? null;
  } catch {
    reverseGeocodedAddress = null;
  }

  const stateCode = resolveStateCode(reverseGeocodedAddress?.region);

  return {
    areaLabel: resolveAreaLabel(reverseGeocodedAddress, stateCode),
    latitude: currentPosition.coords.latitude,
    longitude: currentPosition.coords.longitude,
    stateCode,
    verified: true,
  };
}
