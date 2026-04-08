import { redirect } from "next/navigation";
import { hasRole } from "@/lib/adminAuth";

export default async function CashierRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const allowed = await hasRole(["super_admin", "cashier"]);
  if (!allowed) {
    redirect("/login?error=unauthorized");
  }

  return <div className="page-bg">{children}</div>;
}