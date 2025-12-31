import { NextRequest } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase environment variables are not set");
}

const sharedOptions = {
  auth: { persistSession: false, autoRefreshToken: false },
};

const anonServerClient = createClient(supabaseUrl, supabaseAnonKey, sharedOptions);
const adminServerClient = serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey, sharedOptions) : null;

export async function authenticateRequest(req: NextRequest) {
  const header = req.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return { error: "Unauthorized" } as const;
  }

  const token = header.replace("Bearer ", "").trim();
  if (!token) {
    return { error: "Unauthorized" } as const;
  }

  const { data, error } = await anonServerClient.auth.getUser(token);
  if (error || !data.user) {
    return { error: "Unauthorized" } as const;
  }

  return { userId: data.user.id, email: data.user.email ?? null } as const;
}

export function getAdminClient(): SupabaseClient | null {
  return adminServerClient;
}

export function getAnonServerClient(): SupabaseClient {
  return anonServerClient;
}
