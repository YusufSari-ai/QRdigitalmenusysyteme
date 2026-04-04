"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import { getMenuData } from "@/lib/queries";
import type { CategoryWithProducts } from "@/types/category";
import SidebarNavigation from "@/components/menu/SidebarNavigation";
import WaiterCategorySection from "@/components/waiter/WaiterCategorySection";
import SkeletonLoader from "@/components/menu/SkeletonLoader";
import ErrorBanner from "@/components/menu/ErrorBanner";
import EmptyState from "@/components/ui/EmptyState";

export default function WaiterDashboard() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  // Captured once main#menu-content mounts; triggers observer re-creation in SidebarNavigation.
  const [scrollRoot, setScrollRoot] = useState<HTMLElement | null>(null);
  const mainRef = useCallback((el: HTMLElement | null) => setScrollRoot(el), []);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: fetchError } = await getMenuData();
    if (fetchError) {
      setError(fetchError.message || "Failed to load menu. Please try again.");
      setLoading(false);
      return;
    }
    setCategories(
      (data ?? []).filter((cat) => cat.products && cat.products.length > 0)
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // Filter products by name; drop categories with no matching products
  const visibleCategories = useMemo<CategoryWithProducts[]>(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories
      .map((cat) => ({
        ...cat,
        products: cat.products.filter((p) =>
          p.name.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [categories, query]);

  const handleSignOut = async () => {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>

      {/* ── Waiter top bar ──────────────────────────────────────────────────── */}
      <header
        style={{
          background: "#2563eb",
          color: "#fff",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          boxShadow: "0 1px 4px rgba(0,0,0,.15)",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", lineHeight: 1.2 }}>
            Waiter Panel
          </div>
          <div style={{ fontSize: "0.75rem", opacity: 0.8, marginTop: 1 }}>
            Tart Cafe
          </div>
        </div>
        <button
          onClick={handleSignOut}
          style={{
            background: "rgba(255,255,255,0.18)",
            border: "1px solid rgba(255,255,255,0.3)",
            color: "#fff",
            padding: "6px 14px",
            borderRadius: 6,
            cursor: "pointer",
            fontSize: "0.82rem",
            fontWeight: 500,
          }}
        >
          Sign out
        </button>
      </header>

      {/* ── Search bar ──────────────────────────────────────────────────────── */}
      <div
        style={{
          flexShrink: 0,
          padding: "10px 16px",
          background: "#111",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div style={{ position: "relative" }}>
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: "0.95rem",
              opacity: 0.45,
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search menu…"
            aria-label="Search menu items"
            style={{
              width: "100%",
              boxSizing: "border-box",
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.13)",
              borderRadius: 8,
              color: "#fff",
              fontSize: "0.9rem",
              padding: "9px 12px 9px 36px",
              outline: "none",
            }}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search"
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                color: "rgba(255,255,255,0.5)",
                cursor: "pointer",
                fontSize: "1rem",
                lineHeight: 1,
                padding: 2,
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* ── Menu area (scrollable) ───────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {loading && (
          <div className="menu-content" style={{ overflowY: "auto" }}>
            <SkeletonLoader />
          </div>
        )}

        {!loading && error && (
          <div className="menu-content" style={{ overflowY: "auto" }}>
            <ErrorBanner message={error} onRetry={fetchMenu} />
          </div>
        )}

        {!loading && !error && categories.length === 0 && (
          <div className="menu-content" style={{ overflowY: "auto" }}>
            <EmptyState />
          </div>
        )}

        {!loading && !error && categories.length > 0 && (
          <>
            {/* Category pills — strictly excluded from DOM while searching.
                Wrapper overrides position:sticky (top:64px) which can leave a
                phantom gap in overflow:hidden flex contexts in some browsers. */}
            {!query.trim() && (
              <div style={{ flexShrink: 0, position: "relative", overflow: "hidden" }}>
                <SidebarNavigation categories={visibleCategories} scrollRoot={scrollRoot} />
              </div>
            )}

            {/* scroll-margin-top scoped to this container offsets scrollIntoView
                so section titles land 8px below the top edge of main, not flush. */}
            <style>{`#menu-content .category-section { scroll-margin-top: 8px; }`}</style>
            <main
              ref={mainRef}
              className="menu-content"
              id="menu-content"
              style={{ flex: 1, overflowY: "auto" }}
            >
              {visibleCategories.length > 0 ? (
                visibleCategories.map((category) => (
                  <WaiterCategorySection key={category.id} category={category} />
                ))
              ) : (
                <div
                  style={{
                    padding: "48px 24px",
                    textAlign: "center",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "0.95rem",
                  }}
                >
                  No items match &ldquo;{query}&rdquo;
                </div>
              )}
            </main>
          </>
        )}
      </div>

    </div>
  );
}
