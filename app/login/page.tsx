"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getDashboardUrl } from "@/lib/roles";
import type { StaffRole } from "@/lib/roles";

// Separated into its own component because useSearchParams() requires a
// Suspense boundary at the page level for static rendering (Vercel build).
function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Show a message if redirected here due to an auth/role error
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "unauthorized") setError("You do not have permission to access that page.");
    if (err === "no_panel") setError("Your account has no assigned panel. Contact an administrator.");
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    const supabase = createSupabaseBrowserClient();

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !authData.user) {
      setLoading(false);
      setError("Invalid email or password.");
      return;
    }

    // Fetch role to determine which dashboard to redirect to
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    const role = (profile?.role ?? "viewer") as StaffRole;
    const next = searchParams.get("next");

    // Honor the ?next= param only if it stays within the user's permitted prefix
    const destination = next && isNextAllowed(next, role) ? next : getDashboardUrl(role);

    router.push(destination);
    router.refresh();
  };

  return (
    <div className="login-root">
      <div className="login-card">
        <div className="login-card__logo">Tart Cafe</div>
        <div className="login-card__sub">Staff Login</div>

        <form className="login-form" onSubmit={handleLogin} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="login-email">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@tartcafe.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="login-submit"
            disabled={loading}
          >
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                <span className="spinner" />
                Signing in…
              </span>
            ) : (
              "Sign in"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="login-root">
        <div className="login-card">
          <div className="login-card__logo">Tart Cafe</div>
          <div className="login-card__sub">Staff Login</div>
        </div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

/**
 * Only honour a ?next= redirect if the path starts with a prefix
 * that corresponds to the user's role. Prevents privilege escalation
 * via a crafted redirect URL.
 */
function isNextAllowed(next: string, role: StaffRole): boolean {
  const rolePrefix: Partial<Record<StaffRole, string>> = {
    super_admin: "/",   // super_admin can go anywhere
    admin: "/admin",
    waiter: "/waiter",
    kitchen: "/kitchen",
    bar: "/bar",
    cashier: "/cashier",
  };
  const allowed = rolePrefix[role];
  if (!allowed) return false;
  return allowed === "/" || next.startsWith(allowed);
}
