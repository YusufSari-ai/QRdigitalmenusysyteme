"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getMenuData } from "@/lib/queries";
import type { CategoryWithProducts } from "@/types/category";
import SidebarNavigation from "./SidebarNavigation";
import CategorySection from "./CategorySection";
import SkeletonLoader from "./SkeletonLoader";
import ErrorBanner from "./ErrorBanner";
import EmptyState from "@/components/ui/EmptyState";

// tableId is parsed from the URL and stored in state.
// It is NEVER displayed in the UI (spec §2.1, §2.3).
export default function MenuView() {
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tableId = searchParams.get("table"); // stored silently, not rendered

  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMenu = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await getMenuData();

    if (fetchError) {
      setError(fetchError.message || "Failed to load menu. Please try again.");
      setLoading(false);
      return;
    }

    // Filter: categories with zero products MUST NOT be rendered (spec §8)
    const withProducts = (data ?? []).filter(
      (cat) => cat.products && cat.products.length > 0
    );

    setCategories(withProducts);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // ── Loading state (spec §5.2) ───────────────────────────────────────────────
  if (loading) {
    return (
      <div className="menu-root">
        <header className="menu-header">
          <div>
            <div className="menu-header__logo">Tart Cafe</div>
            <div className="menu-header__subtitle">Our Selection</div>
          </div>
        </header>
        <SkeletonLoader />
      </div>
    );
  }

  // ── Error state with retry (spec §5.3) ─────────────────────────────────────
  if (error) {
    return (
      <div className="menu-root">
        <header className="menu-header">
          <div>
            <div className="menu-header__logo">Tart Cafe</div>
            <div className="menu-header__subtitle">Our Selection</div>
          </div>
        </header>
        <ErrorBanner message={error} onRetry={fetchMenu} />
      </div>
    );
  }

  // ── Empty state: no categories with products (spec §8) ─────────────────────
  if (categories.length === 0) {
    return (
      <div className="menu-root">
        <header className="menu-header">
          <div>
            <div className="menu-header__logo">Tart Cafe</div>
            <div className="menu-header__subtitle">Our Selection</div>
          </div>
        </header>
        <EmptyState />
      </div>
    );
  }

  // ── Menu rendered: single scroll container (spec §6.1) ─────────────────────
  return (
    <div className="menu-root">
      <header className="menu-header">
        <div>
          <div className="menu-header__logo">Tart Cafe</div>
          <div className="menu-header__subtitle">Our Selection</div>
        </div>
      </header>

      {/* Sidebar navigation — sticky horizontal category nav (spec §3, §6.1) */}
      <SidebarNavigation categories={categories} />

      {/* Single scroll container — all categories and products (spec §6.1) */}
      <main className="menu-content" id="menu-content">
        {categories.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}
      </main>
    </div>
  );
}
