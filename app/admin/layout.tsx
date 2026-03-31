// Admin section uses its own layout shell (AdminLayout component)
// No shared layout wrapper needed at the route level
export default function AdminRouteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
