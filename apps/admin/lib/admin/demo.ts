import { cookies } from "next/headers";

export const adminDemoCookieName = "rovexp_admin_demo";
export const isAdminDemoEnabled =
  process.env.ADMIN_DEMO_ENABLED === "true" ||
  process.env.NEXT_PUBLIC_ADMIN_DEMO_ENABLED === "true";

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
