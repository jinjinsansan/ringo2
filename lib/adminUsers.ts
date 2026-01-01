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

export async function fetchAuthUsers(client: SupabaseClient | null, userIds: string[] | readonly string[]) {
  const map = new Map<string, AuthUserMapEntry>();
  if (!client) return map;

  const unique = Array.from(new Set(userIds?.filter(Boolean)));
  for (const id of unique) {
    try {
      const { data, error } = await client.auth.admin.getUserById(id);
      if (!error && data?.user) {
        map.set(id, {
          email: data.user.email ?? null,
          lastSignInAt: data.user.last_sign_in_at ?? null,
        });
      }
    } catch (error) {
      console.error("Failed to load auth user", id, error);
    }
  }

  return map;
}
