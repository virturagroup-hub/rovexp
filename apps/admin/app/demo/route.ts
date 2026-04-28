import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/admin/supabase";
import { adminDemoCookieName, isAdminDemoEnabled } from "@/lib/admin/demo";

export async function GET(request: Request) {
  if (!isAdminDemoEnabled) {
    return NextResponse.redirect(new URL("/login?error=missing-env", request.url));
  }

  const supabase = await getSupabaseServerClient();
  await supabase?.auth.signOut();

  const response = NextResponse.redirect(
    new URL("/dashboard?status=demo-mode", request.url),
  );

  response.cookies.set(adminDemoCookieName, "1", {
    httpOnly: true,
    maxAge: 60 * 60 * 8,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  return response;
}
