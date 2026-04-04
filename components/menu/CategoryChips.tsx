"use client";

import { useEffect, useRef } from "react";
import type { CategoryWithProducts } from "@/types/category";

interface CategoryChipsProps {
  categories: CategoryWithProducts[];
  activeId: string;
  onChipClick: (id: string) => void;
}

export default function CategoryChips({
  categories,
  activeId,
  onChipClick,
}: CategoryChipsProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);

  // ── Sliding pill indicator ────────────────────────────────────────────────
  useEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;

    const activeEl = list.querySelector<HTMLElement>(`[data-id="${activeId}"]`);
    if (!activeEl) return;

    // Position relative to the scrollable list (accounts for scroll offset)
    const listRect = list.getBoundingClientRect();
    const elRect = activeEl.getBoundingClientRect();
    const left = elRect.left - listRect.left + list.scrollLeft;

    indicator.style.width = `${activeEl.offsetWidth}px`;
    indicator.style.height = `${activeEl.offsetHeight}px`;

    if (!mountedRef.current) {
      // First render: snap without animation, then re-enable transitions
      mountedRef.current = true;
      indicator.style.transition = "none";
      indicator.style.transform = `translateX(${left}px)`;
      requestAnimationFrame(() => {
        if (indicatorRef.current) {
          indicatorRef.current.style.transition = "";
        }
      });
    } else {
      indicator.style.transform = `translateX(${left}px)`;
    }
  }, [activeId, categories]);

  // ── Auto-scroll active chip into view ─────────────────────────────────────
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const activeEl = list.querySelector<HTMLButtonElement>(`[data-id="${activeId}"]`);
    activeEl?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeId]);

  if (categories.length === 0) return null;

  return (
    <nav className="cat-chips" aria-label="Category navigation">
      <ul className="cat-chips__list" ref={listRef} role="list">
        {/* Animated background pill — slides between chips */}
        <div
          ref={indicatorRef}
          className="cat-chips__indicator"
          aria-hidden="true"
        />

        {categories.map((cat) => (
          <li key={cat.id}>
            <button
              data-id={cat.id}
              className={`cat-chips__item${activeId === cat.id ? " active" : ""}`}
              onClick={() => onChipClick(cat.id)}
              aria-current={activeId === cat.id ? "true" : undefined}
            >
              {cat.name}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
