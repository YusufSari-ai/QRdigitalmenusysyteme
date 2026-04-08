import { redirect } from "next/navigation";
import { hasRole } from "@/lib/adminAuth";

export default async function KitchenRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let allowed = false;
  try {
    allowed = await hasRole(["super_admin", "kitchen"]);
  } catch {
    redirect("/login?error=session_expired");
  }

  if (!allowed) {
    redirect("/login?error=unauthorized");
  }

  return <div className="page-bg">{children}</div>;
}

