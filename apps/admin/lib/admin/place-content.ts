import type { StateRecord } from "@rovexp/types";

function normalize(value: string | null | undefined) {
  return (value ?? "").trim();
}

export function derivePublicPlaceDescription(input: {
  address?: string | null;
  city?: string | null;
  name: string;
  place_type: string;
  state_code?: string | null;
}) {
  const placeName = normalize(input.name) || "This place";
  const placeType = normalize(input.place_type) || "location";
  const location =
    [normalize(input.city), normalize(input.state_code)].filter(Boolean).join(", ") ||
    "the area";
  const address = normalize(input.address);

  if (address) {
    return `${placeName} is a ${placeType} at ${address} in ${location}. It is a practical source for a nearby quest candidate.`;
  }

  return `${placeName} is a ${placeType} in ${location}. It is a practical source for a nearby quest candidate.`;
}

export function resolvePlaceStateReference(
  input: { state_code?: string | null; state_id?: string | null },
  states: StateRecord[],
) {
  const stateId = normalize(input.state_id);
  const stateCode = normalize(input.state_code).toUpperCase();
  const stateById = stateId ? states.find((state) => state.id === stateId) ?? null : null;
  const stateByCode = stateCode ? states.find((state) => state.code === stateCode) ?? null : null;

  if (stateById && stateByCode && stateById.id !== stateByCode.id) {
    throw new Error("State ID and state code do not match.");
  }

  if (stateId && !stateById) {
    throw new Error("State ID could not be resolved.");
  }

  if (stateCode && !stateByCode) {
    throw new Error("State code could not be resolved.");
  }

  const resolved = stateById ?? stateByCode;

  return {
    state_code: resolved?.code ?? null,
    state_id: resolved?.id ?? null,
  };
}
