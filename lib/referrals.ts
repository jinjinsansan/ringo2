import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function ensureReferralCode(adminClient: SupabaseClient, userId: string): Promise<string | null> {
  if (!adminClient) {
    throw new Error("Service role client is not configured");
  }

  const fetchExisting = async () => {
    const { data, error } = await adminClient
      .from("users")
      .select("referral_code")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw error;
    return data?.referral_code ?? null;
  };

  const existing = await fetchExisting();
  if (existing) {
    return existing;
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomBytes(5).toString("hex");
    const { data, error } = await adminClient
      .from("users")
      .update({ referral_code: candidate })
      .eq("id", userId)
      .is("referral_code", null)
      .select("referral_code")
      .maybeSingle();

    if (error) {
      const message = error.message ?? "";
      const duplicate = message.includes("duplicate key") || error.code === "23505";
      if (duplicate) {
        continue;
      }
      throw error;
    }

    if (data?.referral_code) {
      return data.referral_code;
    }
  }

  return fetchExisting();
}
