import * as SecureStore from "expo-secure-store";
import { createClient } from "@supabase/supabase-js";
import { AppState, Platform } from "react-native";

import { hasSupabaseConfig, mobileEnv } from "./env";

const secureStorage = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
};

let supabaseSingleton:
  | ReturnType<typeof createClient>
  | null
  | undefined = undefined;
let appStateBound = false;

function bindAppState(client: ReturnType<typeof createClient>) {
  if (appStateBound || Platform.OS === "web") {
    return;
  }

  AppState.addEventListener("change", (state) => {
    if (state === "active") {
      client.auth.startAutoRefresh();
      return;
    }

    client.auth.stopAutoRefresh();
  });

  appStateBound = true;
}

export function getSupabaseClient() {
  if (!hasSupabaseConfig) {
    return null;
  }

  if (!supabaseSingleton) {
    supabaseSingleton = createClient(
      mobileEnv.supabaseUrl,
      mobileEnv.supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: true,
          detectSessionInUrl: Platform.OS === "web",
          flowType: "pkce",
          persistSession: true,
          storage: Platform.OS === "web" ? undefined : secureStorage,
        },
      },
    );

    bindAppState(supabaseSingleton);
  }

  return supabaseSingleton;
}
