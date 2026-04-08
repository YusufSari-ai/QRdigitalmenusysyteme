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
import { CartProvider } from "@/components/waiter/CartContext";
import WaiterCart from "@/components/waiter/WaiterCart";
import WaiterBottomNav, { type WaiterTab } from "@/components/waiter/WaiterBottomNav";

export default function WaiterDashboard() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState<WaiterTab>("home");
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
    <CartProvider>
    <div style={{ display: "flex", flexDirection: "column", height: "100dvh", overflow: "hidden" }}>

     {/* ── Waiter top bar ──────────────────────────────────────────────────── */}
{/* ── Waiter top bar (compact) ───────────────────────────────────────── */}
<header
  style={{
    background:
      "linear-gradient(135deg, rgba(212,175,55,0.40), rgba(15,15,15,0.65))",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    color: "#fff",
    padding: "8px 14px", // ↓ küçüldü
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    borderBottom: "1px solid rgba(212,175,55,0.22)",
    boxShadow: "0 6px 16px rgba(0,0,0,0.18)",
  }}
>
  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
    <div
      style={{
        fontWeight: 700,
        fontSize: "0.95rem", // ↓ küçüldü
        lineHeight: 1.1,
        letterSpacing: "0.02em",
      }}
    >
      Waiter Panel
    </div>

    <div
      style={{
        fontSize: "0.68rem", // ↓ küçüldü
        color: "rgba(255,255,255,0.7)",
        lineHeight: 1.2,
      }}
    >
      Tart Cafe
    </div>
  </div>

  <button
    onClick={handleSignOut}
    style={{
      background: "rgba(212,175,55,0.16)",
      border: "1px solid rgba(212,175,55,0.30)",
      color: "#fff",
      padding: "5px 10px", // ↓ küçüldü
      borderRadius: 10,
      cursor: "pointer",
      fontSize: "0.72rem", // ↓ küçüldü
      fontWeight: 600,
      letterSpacing: "0.02em",
      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
    }}
  >
    Sign out
  </button>
</header>
      {/* ── Search bar — home tab only ──────────────────────────────────────── */}
      {activeTab === "home" && (
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
      )}

      {/* ── Content area ────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Cart tab ──────────────────────────────────────────────────────── */}
        {activeTab === "cart" && <WaiterCart />}

        {/* ── Home tab ──────────────────────────────────────────────────────── */}
        {activeTab === "home" && (
          <>
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
                {!query.trim() && (
                  <div style={{ flexShrink: 0, position: "relative", overflow: "hidden" }}>
                    <SidebarNavigation categories={visibleCategories} scrollRoot={scrollRoot} />
                  </div>
                )}

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
          </>
        )}
      </div>

      {/* ── Bottom navigation ───────────────────────────────────────────────── */}
      <WaiterBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

    </div>
    </CartProvider>
  );
}
