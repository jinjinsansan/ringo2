import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AuthUserMapEntry = {
  email: string | null;
  lastSignInAt: string | null;
  metadata: Record<string, unknown> | null;
};

export async function listAllAuthUsers(client: SupabaseClient | null) {
  if (!client) return [] as User[];
  const results: User[] = [];
  try {
    const perPage = 1000;
    let page = 1;
    while (true) {
      const { data, error } = await client.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw error;
      }
      const users = data?.users ?? [];
      results.push(...users);
      if (users.length < perPage) {
        break;
      }
      page += 1;
    }
  } catch (error) {
    console.error("Failed to list auth users", error);
    return [] as User[];
  }

  return results;
}

export async function fetchAuthUserMap(client: SupabaseClient | null) {
  const map = new Map<string, AuthUserMapEntry>();
  if (!client) return map;

  const users = await listAllAuthUsers(client);
  for (const user of users) {
    map.set(user.id, {
      email: user.email ?? null,
      lastSignInAt: user.last_sign_in_at ?? null,
      metadata: user.user_metadata ?? null,
    });
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
          metadata: data.user.user_metadata ?? null,
        });
      }
    } catch (error) {
      console.error("Failed to load auth user", id, error);
    }
  }

  return map;
}

export async function findAuthUserByEmail(client: SupabaseClient | null, email: string): Promise<User | null> {
  if (!client || !email) return null;
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  try {
    const perPage = 100;
    let page = 1;
    while (true) {
      const { data, error } = await client.auth.admin.listUsers({ page, perPage });
      if (error) {
        throw error;
      }
      const users = data?.users ?? [];
      const found = users.find((user) => (user.email ?? "").toLowerCase() === normalized);
      if (found) {
        return found;
      }
      if (users.length < perPage) {
        break;
      }
      page += 1;
    }
  } catch (error) {
    console.error("Failed to find auth user by email", email, error);
  }

  return null;
}
