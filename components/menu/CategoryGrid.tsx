"use client";

import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { getMenuData } from "@/lib/queries";
import MenuImage from "@/components/ui/MenuImage";
import type { CategoryWithProducts } from "@/types/category";
import MenuHeader from "./MenuHeader";
import ErrorBanner from "./ErrorBanner";
import EmptyState from "@/components/ui/EmptyState";

// Skeleton for the category grid home screen
function CategoryGridSkeleton() {
  return (
    <>
      <div className="skeleton-grid-home" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton skeleton-cat-card" />
        ))}
      </div>
    </>
  );
}

export default function CategoryGrid() {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");

  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
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
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const categoryHref = (id: string) => {
    const params = new URLSearchParams({ scrollTo: id });
    if (tableId) params.set("table", tableId);
    return `/menu/all?${params.toString()}`;
  };

  return (
    <div className="menu-root">
      <MenuHeader />

      {loading && <CategoryGridSkeleton />}

      {!loading && error && (
        <div style={{ padding: "var(--sp-4)" }}>
          <ErrorBanner message={error} onRetry={fetchData} />
        </div>
      )}

      {!loading && !error && categories.length === 0 && <EmptyState />}

      {!loading && !error && categories.length > 0 && (
        <main className="category-grid-page">
          <div className="category-grid">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={categoryHref(cat.id)}
                className={`category-card${cat.card_type === "horizontal" ? " category-card--horizontal" : ""}`}
              >
                <div className="category-card__image-wrap">
                  <MenuImage
                    src={cat.image_url}
                    alt={cat.name}
                    fill
                    sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 33vw"
                    className="category-card__image"
                    style={{ objectFit: "cover" }}
                    fallback={
                      <div
                        className="category-card__placeholder"
                        aria-hidden="true"
                      >
                        🍴
                      </div>
                    }
                  />
                </div>
                <div className="category-card__overlay">
                  <span className="category-card__name">{cat.name}</span>
                </div>
              </Link>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
