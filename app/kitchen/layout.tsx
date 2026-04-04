import { redirect } from "next/navigation";
import { hasRole } from "@/lib/adminAuth";

export default async function KitchenRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = await hasRole(["super_admin", "kitchen"]);
  if (!allowed) {
    redirect("/login?error=unauthorized");
  }
  return <>{children}</>;
}
