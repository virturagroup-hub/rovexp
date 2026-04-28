module.exports = ({ config }) => {
  const androidGoogleMapsApiKey =
    process.env.EXPO_PUBLIC_ANDROID_GOOGLE_MAPS_API_KEY ?? "";

  return {
    ...config,
    android: {
      ...config.android,
      config: {
        ...(config.android?.config ?? {}),
        ...(androidGoogleMapsApiKey
          ? {
              googleMaps: {
                apiKey: androidGoogleMapsApiKey,
              },
            }
          : {}),
      },
    },
  };
};
