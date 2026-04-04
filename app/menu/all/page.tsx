import { Suspense } from "react";
import type { Metadata } from "next";
import MenuView from "@/components/menu/MenuView";
import SkeletonLoader from "@/components/menu/SkeletonLoader";
import MenuHeader from "@/components/menu/MenuHeader";

export const metadata: Metadata = {
  title: "Menu | Tart Cafe",
  description: "Browse our full menu. Scan the QR code at your table to order.",
};

// MenuView uses useSearchParams → must be wrapped in Suspense
export default function AllMenuPage() {
  return (
    <Suspense
      fallback={
        <div className="menu-root">
          <MenuHeader />
          <SkeletonLoader />
        </div>
      }
    >
      <MenuView />
    </Suspense>
  );
}
