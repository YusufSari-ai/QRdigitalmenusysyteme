import { redirect } from "next/navigation";

/**
 * Legacy URL — kept so bookmarks don't 404.
 * The middleware also redirects authenticated visits away from here.
 */
export default function AdminLoginRedirect() {
  redirect("/login");
}
