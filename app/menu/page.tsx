import { Suspense } from "react";
import type { Metadata } from "next";
import CategoryGrid from "@/components/menu/CategoryGrid";

export const metadata: Metadata = {
  title: "Menu | Tart Cafe",
  description: "Browse our full menu. Scan the QR code at your table to order.",
};

// CategoryGrid uses useSearchParams → must be wrapped in Suspense
export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="menu-root">
          <header className="menu-header">
            <div>
              <div className="menu-header__logo">Tart Cafe</div>
              <div className="menu-header__subtitle">Our Selection</div>
            </div>
          </header>
          <div className="skeleton-grid-home" aria-hidden="true">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton skeleton-cat-card" />
            ))}
          </div>
        </div>
      }
    >
      <CategoryGrid />
    </Suspense>
  );
}
