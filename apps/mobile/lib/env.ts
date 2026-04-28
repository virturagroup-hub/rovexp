export const mobileEnv = {
  androidGoogleMapsApiKey:
    process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY ?? "",
  oauthAppleEnabled: readBooleanEnv(process.env.EXPO_PUBLIC_OAUTH_APPLE_ENABLED),
  oauthFacebookEnabled: readBooleanEnv(
    process.env.EXPO_PUBLIC_OAUTH_FACEBOOK_ENABLED,
  ),
  oauthGoogleEnabled: readBooleanEnv(
    process.env.EXPO_PUBLIC_OAUTH_GOOGLE_ENABLED,
  ),
  defaultAreaLabel:
    process.env.EXPO_PUBLIC_DEFAULT_AREA_LABEL ?? "Downtown Chicago",
  defaultLatitude: Number(process.env.EXPO_PUBLIC_DEFAULT_LATITUDE ?? 41.882657),
  defaultLongitude: Number(
    process.env.EXPO_PUBLIC_DEFAULT_LONGITUDE ?? -87.623304,
  ),
  defaultStateCode: process.env.EXPO_PUBLIC_DEFAULT_STATE_CODE ?? "IL",
  supabaseAnonKey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
} as const;

export const hasSupabaseConfig = Boolean(
  mobileEnv.supabaseAnonKey && mobileEnv.supabaseUrl,
);

function readBooleanEnv(value: string | undefined) {
  return ["1", "true", "yes", "on"].includes(
    (value ?? "").trim().toLowerCase(),
  );
}
