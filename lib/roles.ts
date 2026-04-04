/**
 * Pure role definitions — no server imports.
 * Safe to import from both client and server code.
 */

export type StaffRole =
  | "super_admin"
  | "admin"
  | "waiter"
  | "kitchen"
  | "bar"
  | "cashier"
  | "viewer"; // default for new sign-ups; no panel access

/** Roles that can access /admin/* */
export const ADMIN_ROLES: StaffRole[] = ["super_admin", "admin"];

/** All roles that have an operational panel */
export const OPERATIONAL_ROLES: StaffRole[] = [
  "super_admin",
  "admin",
  "waiter",
  "kitchen",
  "bar",
  "cashier",
];

/** Where each role lands after login */
export function getDashboardUrl(role: StaffRole): string {
  switch (role) {
    case "super_admin":
    case "admin":
      return "/admin/dashboard";
    case "waiter":
      return "/waiter/dashboard";
    case "kitchen":
      return "/kitchen/dashboard";
    case "bar":
      return "/bar/dashboard";
    case "cashier":
      return "/cashier/dashboard";
    default:
      return "/login?error=no_panel";
  }
}

export const ROLE_LABELS: Record<StaffRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  waiter: "Waiter",
  kitchen: "Kitchen",
  bar: "Bar",
  cashier: "Cashier",
  viewer: "Viewer",
};
