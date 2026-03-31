import { Suspense } from "react";
import type { Metadata } from "next";
import MenuView from "@/components/menu/MenuView";
import SkeletonLoader from "@/components/menu/SkeletonLoader";

export const metadata: Metadata = {
  title: "Menu | Digital Menu",
  description: "Browse our full menu. Scan the QR code at your table to order.",
};

// useSearchParams() inside MenuView requires Suspense boundary (Next.js App Router)
export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="menu-root">
          <header className="menu-header">
            <div>
              <div className="menu-header__logo">Digital Menu</div>
              <div className="menu-header__subtitle">Our Selection</div>
            </div>
          </header>
          <SkeletonLoader />
        </div>
      }
    >
      <MenuView />
    </Suspense>
  );
}
