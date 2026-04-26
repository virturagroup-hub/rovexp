import type { AdminRole } from "@rovexp/types";
import { redirect } from "next/navigation";

import { clearAdminDemoMode, isAdminDemoActive } from "./demo";
import { getSupabaseServerClient, isSupabaseConfigured } from "./supabase";

export interface AdminSession {
  mode: "supabase" | "demo";
  user: {
    id: string;
    email: string;
    displayName: string;
    role: AdminRole;
  };
}

const demoSession: AdminSession = {
  mode: "demo",
  user: {
    id: "demo-admin",
    email: "demo@rovexp.app",
    displayName: "Demo Guide",
    role: "owner",
  },
};

export async function getAdminSession(): Promise<AdminSession | null> {
  if (await isAdminDemoActive()) {
    return demoSession;
  }

  if (!isSupabaseConfigured) {
    return null;
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: adminMembership } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminMembership) {
    return null;
  }

  return {
    mode: "supabase",
    user: {
      id: user.id,
      email: user.email ?? "admin@rovexp.app",
      displayName:
        user.user_metadata.display_name ??
        user.user_metadata.full_name ??
        user.email?.split("@")[0] ??
        "RoveXP Admin",
      role: adminMembership.role,
    },
  };
}

export async function requireAdminSession() {
  if (await isAdminDemoActive()) {
    return demoSession;
  }

  if (!isSupabaseConfigured) {
    redirect("/login?error=missing-env");
  }

  const supabase = await getSupabaseServerClient();

  if (!supabase) {
    redirect("/login?error=missing-env");
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: adminMembership } = await supabase
    .from("admin_users")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!adminMembership) {
    redirect("/login?error=not-authorized");
  }

  return {
    mode: "supabase",
    user: {
      id: user.id,
      email: user.email ?? "admin@rovexp.app",
      displayName:
        user.user_metadata.display_name ??
        user.user_metadata.full_name ??
        user.email?.split("@")[0] ??
        "RoveXP Admin",
      role: adminMembership.role,
    },
  } satisfies AdminSession;
}

export async function clearDemoSession() {
  await clearAdminDemoMode();
}
