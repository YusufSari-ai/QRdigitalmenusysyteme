/**
 * adminAuth.ts — server-side authentication & authorization helpers.
 *
 * Authentication  = "are you who you say you are?" (Supabase Auth session)
 * Authorization   = "are you allowed to do this?"  (profiles.role = 'admin')
 *
 * The middleware already handles authentication-based route protection.
 * Use `isAdmin()` in Server Components or Route Handlers for operations
 * that should be restricted to users with the 'admin' role.
 *
 * SETUP REQUIRED (see SQL deliverable):
 *   1. Create the `profiles` table (see schema below).
 *   2. Add an `on auth.users insert` trigger to auto-create a profile row.
 *   3. Enable RLS + the policies listed in the SQL deliverable.
 *   4. Manually set `role = 'admin'` for your admin user(s) in the dashboard.
 */

import { createSupabaseServerClient } from "./supabaseServerClient";

export type AdminRole = "admin" | "viewer";

export interface Profile {
  id: string;
  role: AdminRole;
  created_at: string;
}

/**
 * Returns the currently authenticated Supabase user, or null.
 * Safe to call from Server Components and Route Handlers.
 */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns true if the current user is authenticated AND has role = 'admin'
 * in the profiles table.
 *
 * Returns false if:
 *  - The user is not authenticated.
 *  - The profiles table does not exist yet (graceful degradation).
 *  - The user's role is 'viewer' (default for new sign-ups).
 */
export async function isAdmin(): Promise<boolean> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile) return false;

  return profile.role === "admin";
}
