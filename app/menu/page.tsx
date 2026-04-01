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
          <header className="menu-header" role="banner">
            <div className="menu-header__titlebar-left">
              <div className="menu-header__icon" aria-hidden="true">🍴</div>
              <span className="menu-header__logo">Tart Cafe</span>
              <span className="menu-header__subtitle">— Menu.exe</span>
            </div>
            <div className="menu-header__controls" aria-hidden="true">
              <button className="menu-header__btn" tabIndex={-1}>_</button>
              <button className="menu-header__btn" tabIndex={-1}>□</button>
              <button className="menu-header__btn" tabIndex={-1}>✕</button>
            </div>
          </header>
          <nav className="menu-menubar" aria-label="Application menu bar">
            <span className="menu-menubar__item">File</span>
            <div className="menu-menubar__sep" />
            <span className="menu-menubar__item">View</span>
            <div className="menu-menubar__sep" />
            <span className="menu-menubar__item">Help</span>
          </nav>
          <div className="menu-window">
            <SkeletonLoader />
          </div>
        </div>
      }
    >
      <MenuView />
    </Suspense>
  );
}
