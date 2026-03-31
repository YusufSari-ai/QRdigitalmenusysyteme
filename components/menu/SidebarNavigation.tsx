"use client";

import { useEffect, useRef, useState } from "react";
import type { CategoryWithProducts } from "@/types/category";

interface SidebarNavigationProps {
  categories: CategoryWithProducts[];
}

// Sidebar nav (spec §3, §6.1):
// - Anchor-based smooth scroll ONLY — no route changes, no page reloads
// - Intersection Observer highlights the active category while scrolling
export default function SidebarNavigation({
  categories,
}: SidebarNavigationProps) {
  const [activeId, setActiveId] = useState<string>(
    categories[0]?.id ?? ""
  );
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (categories.length === 0) return;

    const sectionIds = categories.map((c) => `category-${c.id}`);

    // Track which sections are intersecting and pick the topmost visible one
    const visibleSections = new Set<string>();

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
        // Trigger when a section enters the top 30% of the viewport
        rootMargin: "-10% 0px -60% 0px",
        threshold: 0,
      }
    );

    sectionIds.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observerRef.current!.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [categories]);

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
