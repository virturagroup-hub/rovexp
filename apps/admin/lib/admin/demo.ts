import { cookies } from "next/headers";

export const adminDemoCookieName = "rovexp_admin_demo";

function readBooleanEnv(value: string | undefined) {
  if (value == null) {
    return null;
  }

  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return null;
}

const explicitDemoSetting =
  readBooleanEnv(process.env.ADMIN_DEMO_ENABLED) ??
  readBooleanEnv(process.env.NEXT_PUBLIC_ADMIN_DEMO_ENABLED);

export const isAdminDemoEnabled = explicitDemoSetting ?? true;

export async function isAdminDemoActive() {
  if (!isAdminDemoEnabled) {
    return false;
  }

  const cookieStore = await cookies();

  return cookieStore.get(adminDemoCookieName)?.value === "1";
}

export async function enableAdminDemoMode() {
  if (!isAdminDemoEnabled) {
    return false;
  }

  const cookieStore = await cookies();

  cookieStore.set(adminDemoCookieName, "1", {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return true;
}

export async function clearAdminDemoMode() {
  const cookieStore = await cookies();

  cookieStore.delete(adminDemoCookieName);
}
