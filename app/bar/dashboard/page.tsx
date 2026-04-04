"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

export default function BarDashboard() {
  const router = useRouter();

  const handleSignOut = async () => {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", fontFamily: "sans-serif" }}>
      <header
        style={{
          background: "#7c3aed",
          color: "#fff",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Bar Panel</span>
        <button
          onClick={handleSignOut}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: "0.85rem",
          }}
        >
          Sign out
        </button>
      </header>
      <main style={{ flex: 1, padding: 32, color: "#374151" }}>
        <p>Beverage queue — coming soon.</p>
      </main>
    </div>
  );
}
