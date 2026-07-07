import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function assertServerOnly(fnName: string): void {
  if (typeof window !== "undefined") {
    throw new Error(`${fnName} must only be called from server-side code`);
  }
}

/** Client-safe (browser) client — NEXT_PUBLIC_* only, always subject to RLS. */
export function createBrowserSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createClient(url, anonKey);
}

/** Server-only client using the anon key — still subject to RLS. For infrastructure/ repos & auth. */
export function createServerSupabaseClient(accessToken?: string): SupabaseClient {
  assertServerOnly("createServerSupabaseClient");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return createClient(url, anonKey, {
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}

/**
 * ADMIN client — service-role key, BYPASSES RLS ENTIRELY.
 * Forbidden outside strictly administrative server-side operations (docs/CONSTITUCION.md rule 11).
 * Never import from a route/use-case that serves participants.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  assertServerOnly("createAdminSupabaseClient");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
