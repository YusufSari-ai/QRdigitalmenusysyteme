"use client";

import { useEffect, useRef, useState } from "react";
import type { CategoryWithProducts } from "@/types/category";

interface SidebarNavigationProps {
  categories: CategoryWithProducts[];
  /**
   * The scrollable container that holds the category sections.
   * When provided, the IntersectionObserver uses it as root so active-state
   * tracking works correctly inside a nested scroll container (e.g. waiter panel).
   * When omitted, the viewport is used (customer menu, full-page scroll).
   */
  scrollRoot?: HTMLElement | null;
}

// Sidebar nav (spec §3, §6.1):
// - Anchor-based smooth scroll ONLY — no route changes, no page reloads
// - Intersection Observer highlights the active category while scrolling
export default function SidebarNavigation({
  categories,
  scrollRoot,
}: SidebarNavigationProps) {
  const [activeId, setActiveId] = useState<string>(
    categories[0]?.id ?? ""
  );
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (categories.length === 0) return;

    // When a scrollRoot is provided (waiter panel), wait until it's mounted.
    // scrollRoot === undefined means "not supplied" (customer menu — use viewport).
    // scrollRoot === null means "supplied but not yet mounted" — skip until ready.
    if (scrollRoot === null) return;

    const sectionIds = categories.map((c) => `category-${c.id}`);
    const visibleSections = new Set<string>();

    // root: the actual scroll container, or null to use the viewport.
    // rootMargin: when using a scroll container, px values are relative to that
    // container's edges. When using the viewport, % values work better.
    const usingScrollRoot = scrollRoot instanceof HTMLElement;
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            visibleSections.add(entry.target.id);
          } else {
            visibleSections.delete(entry.target.id);
          }
        });

        // Active = the first section (in document order) that is currently visible
        for (const id of sectionIds) {
          if (visibleSections.has(id)) {
            setActiveId(id.replace("category-", ""));
            break;
          }
        }
      },
      {
        root: usingScrollRoot ? scrollRoot : null,
        // With a scroll container: px margins relative to that container's edges.
        // With the viewport: % margins relative to viewport dimensions.
        rootMargin: usingScrollRoot ? "-8px 0px -50% 0px" : "-10% 0px -60% 0px",
        threshold: 0,
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  // scrollRoot is intentionally in deps: when it goes null→element the observer
  // must be re-created with the correct root.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, scrollRoot]);

  // Smooth scroll to section — client-side only, no navigation (spec §2.2)
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    categoryId: string
  ) => {
    e.preventDefault();
    const target = document.getElementById(`category-${categoryId}`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setActiveId(categoryId);
    }
  };

  if (categories.length === 0) return null;

  return (
    <nav className="sidebar-nav" aria-label="Category navigation">
      <ul className="sidebar-nav__list" role="list">
        {categories.map((category) => (
          <li key={category.id} className="sidebar-nav__item">
            <a
              href={`#category-${category.id}`}
              className={`sidebar-nav__link${
                activeId === category.id ? " active" : ""
              }`}
              onClick={(e) => handleNavClick(e, category.id)}
              aria-current={activeId === category.id ? "true" : undefined}
            >
              {category.name}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
