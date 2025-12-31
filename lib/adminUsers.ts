import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthUserMapEntry = {
  email: string | null;
  lastSignInAt: string | null;
};

export async function fetchAuthUserMap(client: SupabaseClient | null) {
  const map = new Map<string, AuthUserMapEntry>();
  if (!client) return map;

  try {
    const perPage = 1000;
    let page = 1;
    while (true) {
      const { data, error } = await client.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw error;
      }
      const users = data?.users ?? [];
      for (const user of users) {
        map.set(user.id, {
          email: user.email ?? null,
          lastSignInAt: user.last_sign_in_at ?? null,
        });
      }
      if (users.length < perPage) {
        break;
      }
      page += 1;
    }
  } catch (error) {
    console.error("Failed to load auth users", error);
    return map;
  }

  return map;
}
