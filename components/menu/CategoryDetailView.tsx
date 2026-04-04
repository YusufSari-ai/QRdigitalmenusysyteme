"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { getMenuData } from "@/lib/queries";
import type { CategoryWithProducts } from "@/types/category";
import CategoryChips from "./CategoryChips";
import ProductCard from "./ProductCard";
import SkeletonLoader from "./SkeletonLoader";
import ErrorBanner from "./ErrorBanner";
import EmptyState from "@/components/ui/EmptyState";
import FeedbackModal from "./FeedbackModal";

// ─── Animation variants ────────────────────────────────────────────────────
// direction: 1 = forward (swipe left / next chip), -1 = backward (swipe right / prev chip)
const slideVariants = {
  enter: (dir: number) => ({
    x: dir >= 0 ? "60%" : "-60%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir >= 0 ? "-60%" : "60%",
    opacity: 0,
  }),
};

const SLIDE_TRANSITION = {
  x: { type: "spring", stiffness: 320, damping: 32, mass: 0.8 },
  opacity: { duration: 0.18 },
} as const;

// ─── Icons ─────────────────────────────────────────────────────────────────
function ChatIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

// ─── Component ─────────────────────────────────────────────────────────────
interface Props {
  categoryId: string;
}

export default function CategoryDetailView({ categoryId }: Props) {
  const searchParams = useSearchParams();
  const tableId = searchParams.get("table");

  const [categories, setCategories] = useState<CategoryWithProducts[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState(categoryId);
  // direction: 1 = next, -1 = prev — drives the slide axis
  const [direction, setDirection] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Stable refs for the swipe handler (avoids re-attaching listeners on state changes)
  const categoriesRef = useRef(categories);
  const activeCategoryIdRef = useRef(activeCategoryId);
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => { categoriesRef.current = categories; }, [categories]);
  useEffect(() => { activeCategoryIdRef.current = activeCategoryId; }, [activeCategoryId]);

  // ── Data fetching ──────────────────────────────────────────────────────
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

  useEffect(() => { fetchData(); }, [fetchData]);

  // Resolve initial category once data loads
  useEffect(() => {
    if (categories.length === 0) return;
    const exists = categories.some((c) => c.id === categoryId);
    setActiveCategoryId(exists ? categoryId : categories[0].id);
  }, [categories, categoryId]);

  // ── Category switch (shared by chip clicks and swipe) ──────────────────
  const switchCategory = useCallback(
    (id: string, dir: number) => {
      if (id === activeCategoryId) return;
      setDirection(dir);
      setActiveCategoryId(id);
      const next = tableId ? `/menu/${id}?table=${tableId}` : `/menu/${id}`;
      window.history.replaceState(null, "", next);
      // Reset scroll to top instantly (no scroll animation — the slide handles UX)
      window.scrollTo({ top: 0, behavior: "instant" });
    },
    [activeCategoryId, tableId]
  );

  const handleChipClick = useCallback(
    (id: string) => {
      const currentIndex = categories.findIndex((c) => c.id === activeCategoryId);
      const nextIndex = categories.findIndex((c) => c.id === id);
      switchCategory(id, nextIndex > currentIndex ? 1 : -1);
    },
    [categories, activeCategoryId, switchCategory]
  );

  // ── Touch swipe detection ──────────────────────────────────────────────
  // Uses refs so the effect only runs once — no listener re-attachment on state changes.
  const switchCategoryRef = useRef(switchCategory);
  useEffect(() => { switchCategoryRef.current = switchCategory; }, [switchCategory]);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) return;

    let startX = 0;
    let startY = 0;

    const onTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;

      // Require a dominant horizontal movement above the threshold
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const cats = categoriesRef.current;
      const activeId = activeCategoryIdRef.current;
      const currentIndex = cats.findIndex((c) => c.id === activeId);

      if (dx < 0 && currentIndex < cats.length - 1) {
        // Swipe left → next category
        switchCategoryRef.current(cats[currentIndex + 1].id, 1);
      } else if (dx > 0 && currentIndex > 0) {
        // Swipe right → previous category
        switchCategoryRef.current(cats[currentIndex - 1].id, -1);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, []); // Intentionally empty — refs carry current values

  const backHref = tableId ? `/menu?table=${tableId}` : "/menu";
  const activeCategory = categories.find((c) => c.id === activeCategoryId);

  return (
    <div className="menu-root">
      {/* ── Sticky header ─────────────────────────────────────────── */}
      <header className="cat-detail-header">
        <Link
          href={backHref}
          className="cat-detail-header__back"
          aria-label="Back to categories"
        >
          ←
        </Link>

        {/* Title crossfades when category changes */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={activeCategoryId}
            className="cat-detail-header__title"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.14 }}
          >
            {activeCategory?.name ?? ""}
          </motion.span>
        </AnimatePresence>

        <button
          className="menu-header__feedback-btn"
          onClick={() => setFeedbackOpen(true)}
          aria-label="Geri bildirim gönder"
        >
          <ChatIcon />
        </button>
      </header>

      <FeedbackModal
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
      />

      {/* ── Loading ────────────────────────────────────────────────── */}
      {loading && <SkeletonLoader />}

      {/* ── Error ──────────────────────────────────────────────────── */}
      {!loading && error && (
        <div style={{ padding: "var(--sp-4)" }}>
          <ErrorBanner message={error} onRetry={fetchData} />
        </div>
      )}

      {/* ── Empty ──────────────────────────────────────────────────── */}
      {!loading && !error && categories.length === 0 && <EmptyState />}

      {/* ── Menu ───────────────────────────────────────────────────── */}
      {!loading && !error && categories.length > 0 && (
        <>
          <CategoryChips
            categories={categories}
            activeId={activeCategoryId}
            onChipClick={handleChipClick}
          />

          {/* Swipe area — touch events attach here */}
          <main className="menu-content" ref={mainRef}>
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={activeCategoryId}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={SLIDE_TRANSITION}
                className="cat-slide-pane"
              >
                {activeCategory && activeCategory.products.length > 0 ? (
                  <div className="products-grid">
                    {activeCategory.products.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </motion.div>
            </AnimatePresence>
          </main>
        </>
      )}
    </div>
  );
}
