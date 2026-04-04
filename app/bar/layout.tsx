import { redirect } from "next/navigation";
import { hasRole } from "@/lib/adminAuth";

export default async function BarRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = await hasRole(["super_admin", "bar"]);
  if (!allowed) {
    redirect("/login?error=unauthorized");
  }
  return <>{children}</>;
}
