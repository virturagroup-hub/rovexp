import { demoSponsors } from "@rovexp/types";
import type { SponsorBusiness } from "@rovexp/types";

import { getSupabaseClient } from "@/lib/supabase";

export async function listActiveSponsors(): Promise<SponsorBusiness[]> {
  const supabase = getSupabaseClient();

  if (supabase) {
    const { data, error } = await supabase
      .from("sponsor_businesses")
      .select("*")
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      return data as SponsorBusiness[];
    }
  }

  return demoSponsors.filter((item) => item.is_active);
}
