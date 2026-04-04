import { redirect } from "next/navigation";
import { hasRole } from "@/lib/adminAuth";

/**
 * Server-side role guard for all /admin/* pages.
 * Middleware already ensures the user is authenticated by this point.
 * This layer enforces that only admin / super_admin roles can proceed.
 */
export default async function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = await hasRole(["super_admin", "admin"]);
  if (!allowed) {
    redirect("/login?error=unauthorized");
  }
  return <>{children}</>;
}
