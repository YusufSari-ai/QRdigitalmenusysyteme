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

  // ── Loading state ───────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="menu-root">
        <Win2kTitleBar />
        <Win2kMenubar />
        <div className="menu-window">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="menu-root">
        <Win2kTitleBar />
        <Win2kMenubar />
        <div className="menu-window">
          <ErrorBanner message={error} onRetry={fetchMenu} />
        </div>
      </div>
    );
  }

  // ── Empty state ─────────────────────────────────────────────────────────────
  if (categories.length === 0) {
    return (
      <div className="menu-root">
        <Win2kTitleBar />
        <Win2kMenubar />
        <div className="menu-window">
          <EmptyState />
        </div>
      </div>
    );
  }

  // ── Full menu ───────────────────────────────────────────────────────────────
  return (
    <div className="menu-root">
      {/* Win2000 Title Bar */}
      <Win2kTitleBar />

      {/* Win2000 Menu Bar */}
      <Win2kMenubar />

      {/* Window content area */}
      <div className="menu-window">
        {/* Tab-style category navigation */}
        <SidebarNavigation categories={categories} />

        {/* Content pane */}
        <main className="menu-content" id="menu-content">
          {categories.map((category) => (
            <CategorySection key={category.id} category={category} />
          ))}
        </main>
      </div>

      {/* Win2000 Taskbar at the bottom */}
      <Win2kTaskbar />
    </div>
  );
}

/* ─── Win2000 Title Bar ──────────────────────────────────── */
function Win2kTitleBar() {
  return (
    <header className="menu-header" role="banner" aria-label="Application title bar">
      <div className="menu-header__titlebar-left">
        <div className="menu-header__icon" aria-hidden="true">🍴</div>
        <span className="menu-header__logo">Tart Cafe</span>
        <span className="menu-header__subtitle">— Menu.exe</span>
      </div>
      <div className="menu-header__controls" aria-hidden="true">
        <button className="menu-header__btn" tabIndex={-1} aria-label="Minimize">_</button>
        <button className="menu-header__btn" tabIndex={-1} aria-label="Maximize">□</button>
        <button className="menu-header__btn" tabIndex={-1} aria-label="Close" style={{ marginLeft: 2 }}>✕</button>
      </div>
    </header>
  );
}

/* ─── Win2000 Menu Bar ────────────────────────────────────── */
function Win2kMenubar() {
  return (
    <nav className="menu-menubar" aria-label="Application menu bar">
      <span className="menu-menubar__item">File</span>
      <div className="menu-menubar__sep" aria-hidden="true" />
      <span className="menu-menubar__item">View</span>
      <div className="menu-menubar__sep" aria-hidden="true" />
      <span className="menu-menubar__item">Help</span>
    </nav>
  );
}

/* ─── Win2000 Taskbar ─────────────────────────────────────── */
function Win2kTaskbar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        })
      );
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer
      style={{
        position: "sticky",
        bottom: 0,
        zIndex: 60,
        height: 28,
        background: "var(--c-surface)",
        borderTop: "2px solid var(--c-bevel-light)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 4px",
        boxShadow: "inset 0 1px 0 var(--c-bevel-light)",
        flexShrink: 0,
      }}
      aria-label="System taskbar"
    >
      {/* Start button */}
      <button
        style={{
          height: 22,
          padding: "0 8px 0 6px",
          background: "var(--c-surface)",
          border: "none",
          cursor: "pointer",
          fontSize: 11,
          fontWeight: "bold",
          fontFamily: "var(--font-body)",
          display: "flex",
          alignItems: "center",
          gap: 4,
          boxShadow:
            "inset -1px -1px 0 var(--c-bevel-darkest), inset 1px 1px 0 var(--c-bevel-light), inset -2px -2px 0 var(--c-bevel-dark), inset 2px 2px 0 var(--c-bevel-mid)",
        }}
        aria-label="Start menu"
      >
        <span aria-hidden="true" style={{ fontSize: 13 }}>🪟</span>
        Start
      </button>

      {/* Active window chip */}
      <div
        style={{
          flex: 1,
          marginLeft: 4,
          display: "flex",
          gap: 2,
        }}
      >
        <div
          style={{
            height: 22,
            padding: "0 8px",
            background: "var(--c-surface-hi)",
            fontSize: 11,
            fontWeight: "bold",
            fontFamily: "var(--font-body)",
            display: "flex",
            alignItems: "center",
            gap: 4,
            boxShadow:
              "inset 1px 1px 0 var(--c-bevel-darkest), inset -1px -1px 0 var(--c-bevel-light), inset 2px 2px 0 var(--c-bevel-dark), inset -2px -2px 0 var(--c-bevel-mid)",
            maxWidth: 160,
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
          aria-hidden="true"
        >
          🍴 Tart Cafe — Menu
        </div>
      </div>

      {/* System tray clock */}
      <div
        style={{
          height: 22,
          padding: "0 8px",
          fontSize: 11,
          fontFamily: "var(--font-body)",
          display: "flex",
          alignItems: "center",
          background: "var(--c-surface)",
          boxShadow:
            "inset 1px 1px 0 var(--c-bevel-dark), inset -1px -1px 0 var(--c-bevel-light)",
          flexShrink: 0,
        }}
        aria-live="polite"
        aria-label={`Current time: ${time}`}
      >
        {time}
      </div>
    </footer>
  );
}
