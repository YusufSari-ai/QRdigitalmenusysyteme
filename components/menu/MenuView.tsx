"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getMenuData } from "@/lib/queries";
import type { CategoryWithProducts } from "@/types/category";
import CategoryChips from "./CategoryChips";
import CategorySection from "./CategorySection";
import MenuHeader from "./MenuHeader";
import SkeletonLoader from "./SkeletonLoader";
import ErrorBanner from "./ErrorBanner";
import EmptyState from "@/components/ui/EmptyState";

export default function MenuView() {
  const searchParams = useSearchParams();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const tableId = searchParams.get("table"); // stored silently, not rendered
  const scrollTo = searchParams.get("scrollTo");

  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [activeId, setActiveId] = useState<string>("");
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

    const withProducts = (data ?? []).filter(
      (cat) => cat.products && cat.products.length > 0
    );
    setCategories(withProducts);
    setActiveId(withProducts[0]?.id ?? "");
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  // IntersectionObserver: highlight the active chip as the user scrolls
  useEffect(() => {
    if (categories.length === 0) return;

    const sectionIds = categories.map((c) => `category-${c.id}`);
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        });

        // Active = the first section (in document order) currently visible
        for (const id of sectionIds) {
          if (visible.has(id)) {
            setActiveId(id.replace("category-", ""));
            break;
          }
        }
      },
      { rootMargin: "-10% 0px -60% 0px", threshold: 0 }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [categories]);

  // Scroll to a section after data loads (e.g. redirected from /menu/[category])
  useEffect(() => {
    if (loading || !scrollTo) return;
    const el = document.getElementById(`category-${scrollTo}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      setActiveId(scrollTo);
    }
  }, [loading, scrollTo]);

  // Chip click → smooth scroll to the category section
  const handleChipClick = useCallback((id: string) => {
    const el = document.getElementById(`category-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(id);
    }
  }, []);

  if (loading) {
    return (
      <div className="menu-root">
        <MenuHeader />
        <SkeletonLoader />
      </div>
    );
  }

  if (error) {
    return (
      <div className="menu-root">
        <MenuHeader />
        <div style={{ padding: "var(--sp-4)" }}>
          <ErrorBanner message={error} onRetry={fetchMenu} />
        </div>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="menu-root">
        <MenuHeader />
        <EmptyState />
      </div>
    );
  }

  return (
    <div className="menu-root">
      <MenuHeader />

      <CategoryChips
        categories={categories}
        activeId={activeId}
        onChipClick={handleChipClick}
      />

      <main className="menu-content" id="menu-content">
        {categories.map((category) => (
          <CategorySection key={category.id} category={category} />
        ))}
      </main>
    </div>
  );
}
