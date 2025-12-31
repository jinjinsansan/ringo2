import type { SupabaseClient } from "@supabase/supabase-js";

export type AppleWeights = {
  poison: number;
  bronze: number;
  silver: number;
  gold: number;
  red: number;
};

export const DEFAULT_APPLE_WEIGHTS: AppleWeights = {
  poison: 50,
  bronze: 35,
  silver: 10,
  gold: 4.9,
  red: 0.1,
};

export const WEIGHT_KEY_MAP: Record<keyof AppleWeights, string> = {
  poison: "rtp_poison_weight",
  bronze: "rtp_bronze_weight",
  silver: "rtp_silver_weight",
  gold: "rtp_gold_weight",
  red: "rtp_red_weight",
};
const RESULT_MAP = Object.fromEntries(Object.entries(WEIGHT_KEY_MAP).map(([result, key]) => [key, result])) as Record<string, keyof AppleWeights>;

export async function loadAppleWeights(client: SupabaseClient | null): Promise<AppleWeights> {
  if (!client) {
    return { ...DEFAULT_APPLE_WEIGHTS };
  }

  const keys = Object.values(WEIGHT_KEY_MAP);
  const { data, error } = await client.from("system_settings").select("key, value").in("key", keys);

  if (error || !data) {
    return { ...DEFAULT_APPLE_WEIGHTS };
  }

  const weights: AppleWeights = { ...DEFAULT_APPLE_WEIGHTS };

  for (const row of data) {
    const target = row?.key ? RESULT_MAP[row.key] : undefined;
    if (!target) continue;
    const parsed = typeof row.value === "number" ? Number(row.value) : parseFloat(String(row.value ?? ""));
    if (Number.isFinite(parsed) && parsed > 0) {
      weights[target] = parsed;
    }
  }

  return weights;
}

export function computeRtpPercentage(weights: AppleWeights): number {
  const total = Object.values(weights).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0);
  if (total <= 0) return 0;
  const winPortion = total - (weights.poison ?? 0);
  return (winPortion / total) * 100;
}

export function serializeWeightUpdates(weights: AppleWeights) {
  return Object.entries(weights).map(([result, value]) => ({
    key: WEIGHT_KEY_MAP[result as keyof AppleWeights],
    value: String(value),
  }));
}

export function normalizeWeights(weights: AppleWeights) {
  const next: AppleWeights = { ...weights };
  (Object.keys(next) as (keyof AppleWeights)[]).forEach((key) => {
    const value = next[key];
    next[key] = Number.isFinite(value) ? Number(value) : DEFAULT_APPLE_WEIGHTS[key];
  });
  return next;
}

export const APPLE_RESULT_ORDER: (keyof AppleWeights)[] = ["poison", "bronze", "silver", "gold", "red"];
