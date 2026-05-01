import type { Session } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import type {
  OAuthProvider,
  SignInInput,
  SignUpInput,
} from "@rovexp/types";

import { getSupabaseClient } from "@/lib/supabase";

WebBrowser.maybeCompleteAuthSession();

function buildOAuthRedirectUrl() {
  return Linking.createURL("auth/callback");
}

function buildRecoveryRedirectUrl() {
  return Linking.createURL("auth/callback?mode=recovery");
}

function readOAuthCallbackParams(callbackUrl: string) {
  const parsed = new URL(callbackUrl);
  const searchParams = parsed.searchParams;
  const hashParams = new URLSearchParams(parsed.hash.replace(/^#/, ""));

  const read = (key: string) =>
    searchParams.get(key) ?? hashParams.get(key) ?? null;

  return {
    accessToken: read("access_token"),
    code: read("code"),
    expiresAt: read("expires_at"),
    refreshToken: read("refresh_token"),
    tokenType: read("token_type"),
  };
}

export async function completeOAuthCallback(callbackUrl: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured for this app.");
  }

  const { accessToken, code, refreshToken, tokenType } =
    readOAuthCallbackParams(callbackUrl);

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw new Error(error.message);
    }

    return data.session ?? null;
  }

  if (accessToken && refreshToken) {
    const { data, error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw new Error(error.message);
    }

    return data.session ?? null;
  }

  throw new Error(
    tokenType
      ? "The OAuth callback did not include a code or session tokens."
      : "The OAuth callback URL was missing the Supabase session data.",
  );
}

export async function signInWithEmail(input: SignInInput) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured for this app.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function signUpWithEmail(input: SignUpInput) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured for this app.");
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: {
        display_name: input.display_name,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function requestPasswordReset(email: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured for this app.");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: buildRecoveryRedirectUrl(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateMobilePassword(password: string) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured for this app.");
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signInWithOAuthProvider(provider: OAuthProvider) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    throw new Error("Supabase is not configured for this app.");
  }

  const redirectTo = buildOAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
    provider,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.url) {
    throw new Error("Supabase did not return an OAuth sign-in URL.");
  }

  if (Platform.OS === "web") {
    if (typeof window === "undefined") {
      throw new Error("OAuth sign-in requires a browser environment.");
    }

    window.location.assign(data.url);
    return null;
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (result.type !== "success" || !result.url) {
    throw new Error("OAuth sign-in was cancelled.");
  }

  return completeOAuthCallback(result.url);
}

export async function signOutMobileSession() {
  const supabase = getSupabaseClient();
  await supabase?.auth.signOut();
}

export async function getCurrentSupabaseUserId() {
  const session = await getMobileSession();
  return session?.user.id ?? null;
}

export async function getMobileSession() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session;
}

export function subscribeToMobileAuth(
  callback: (session: Session | null) => void,
) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return {
      unsubscribe() {
        // No-op for demo fallback mode.
      },
    };
  }

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });

  return data.subscription;
}
