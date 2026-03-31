import { redirect } from "next/navigation";

// Root path redirects to the menu. The customer always arrives via QR with ?table=
export default function RootPage() {
  redirect("/menu");
}
