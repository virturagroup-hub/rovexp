export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_METERS = 6_371_000;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

export function distanceBetweenMeters(
  origin: Coordinates,
  destination: Coordinates,
) {
  const latitudeDelta = toRadians(destination.latitude - origin.latitude);
  const longitudeDelta = toRadians(destination.longitude - origin.longitude);
  const originLatitude = toRadians(origin.latitude);
  const destinationLatitude = toRadians(destination.latitude);

  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(originLatitude) *
      Math.cos(destinationLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(haversine));
}

export function metersToMiles(meters: number) {
  return meters / 1609.34;
}

export function formatDistanceMiles(distanceMiles: number) {
  if (distanceMiles < 0.2) {
    return `${Math.round(distanceMiles * 5280)} ft`;
  }

  return `${distanceMiles.toFixed(distanceMiles < 10 ? 1 : 0)} mi`;
}
