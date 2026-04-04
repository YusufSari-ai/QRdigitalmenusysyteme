/**
 * Server-side authentication & authorization helpers.
 *
 * Authentication  = "are you who you say you are?" (Supabase Auth session)
 * Authorization   = "are you allowed to do this?"  (profiles.role)
 *
 * The middleware handles session-level route protection.
 * Route layouts call hasRole() to enforce role-level access.
 *
 * SETUP REQUIRED:
 *   Run sql/rbac_migration.sql in Supabase SQL Editor.
 *   Set roles manually in the profiles table for each staff account.
 */

import { createSupabaseServerClient } from "./supabaseServerClient";
import type { StaffRole } from "./roles";

export type { StaffRole };

export interface Profile {
  id: string;
  role: StaffRole;
  created_at: string;
}

/**
 * Returns the currently authenticated Supabase user, or null.
 */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the profile row for the current user, or null if unauthenticated
 * or if the profiles table is not yet set up.
 */
export async function getProfile(): Promise<Profile | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, created_at")
    .eq("id", user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

/**
 * Returns true if the current user's role is in the allowed list.
 * Returns false for unauthenticated users or missing profiles rows.
 */
export async function hasRole(allowed: StaffRole[]): Promise<boolean> {
  const profile = await getProfile();
  if (!profile) return false;
  return allowed.includes(profile.role);
}

/**
 * Convenience: true for admin and super_admin roles.
 */
export async function isAdmin(): Promise<boolean> {
  return hasRole(["super_admin", "admin"]);
}
