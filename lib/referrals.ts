import { randomBytes } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listAllAuthUsers } from "@/lib/adminUsers";

export function encodeReferralCodeFromUserId(userId: string) {
  return userId.replace(/-/g, "");
}

export function decodeReferralCodeToUserId(code: string) {
  const normalized = code.replace(/[^a-fA-F0-9]/g, "").toLowerCase();
  if (normalized.length !== 32) return null;
  return `${normalized.slice(0, 8)}-${normalized.slice(8, 12)}-${normalized.slice(12, 16)}-${normalized.slice(16, 20)}-${normalized.slice(20)}`;
}

async function ensureMetadataReferralCode(client: SupabaseClient, userId: string, fallback?: string | null) {
  const desiredCode = fallback ?? encodeReferralCodeFromUserId(userId);
  try {
    const { data, error } = await client.auth.admin.getUserById(userId);
    if (error || !data?.user) {
      return desiredCode;
    }
    const existing = data.user.user_metadata?.referral_code;
    if (existing) {
      return existing as string;
    }
    await client.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...(data.user.user_metadata ?? {}),
        referral_code: desiredCode,
      },
    });
    return desiredCode;
  } catch (error) {
    console.error("Failed to persist referral code in metadata", error);
    return desiredCode;
  }
}

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

  try {
    const existing = await fetchExisting();
    if (existing) {
      return ensureMetadataReferralCode(adminClient, userId, existing);
    }
  } catch (error) {
    console.error("Failed to fetch referral code column", error);
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = randomBytes(5).toString("hex");
    try {
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
        console.error("Failed to set referral_code column", error);
        break;
      }

      if (data?.referral_code) {
        return ensureMetadataReferralCode(adminClient, userId, data.referral_code);
      }
    } catch (error) {
      console.error("Error updating referral_code column", error);
      break;
    }
  }

  return ensureMetadataReferralCode(adminClient, userId, encodeReferralCodeFromUserId(userId));
}

export async function findUserIdByReferralCode(adminClient: SupabaseClient, code: string): Promise<string | null> {
  if (!code) return null;
  const trimmed = code.trim();
  if (!trimmed) return null;
  const decoded = decodeReferralCodeToUserId(code);
  if (decoded) {
    return decoded;
  }

  try {
    const { data, error } = await adminClient
      .from("users")
      .select("id")
      .eq("referral_code", trimmed)
      .maybeSingle();
    if (error) {
      const message = error.message ?? "";
      const isMissingColumn = error.code === "42703" || message.includes("referral_code");
      if (!isMissingColumn) {
        console.error("Failed to search referral_code column", error);
      }
    } else if (data?.id) {
      return data.id;
    }
  } catch (error) {
    console.error("Error querying referral_code column", error);
  }

  try {
    const users = await listAllAuthUsers(adminClient);
    const found = users.find((user) => {
      const metaCode = user.user_metadata?.referral_code;
      return typeof metaCode === "string" && metaCode.trim().toLowerCase() === trimmed.toLowerCase();
    });
    return found?.id ?? null;
  } catch (error) {
    console.error("Failed to search referral code", error);
    return null;
  }
}
