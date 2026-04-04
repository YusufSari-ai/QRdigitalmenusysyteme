"use client";

import { useState } from "react";
import Image from "next/image";
import type { Product } from "@/types/product";

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(price);
}

function TrashIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

interface Props {
  product: Product;
}

export default function WaiterProductCard({ product }: Props) {
  const [count, setCount] = useState(0);

  const increment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCount((c) => c + 1);
  };

  const decrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (count === 1) setCount(0);
    else setCount((c) => c - 1);
  };

  return (
    <article className="product-card" style={{ position: "relative" }}>
      <h3 className="product-card__name">{product.name}</h3>

      <div className="product-card__image-wrap">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 25vw"
            className="product-card__image"
            loading="lazy"
            style={{ objectFit: "cover" }}
          />
        ) : (
          <div className="product-card__placeholder" aria-hidden="true">
            🍽️
          </div>
        )}
      </div>

      <div className="product-card__footer">
        <span className="product-card__price">{formatPrice(product.price)}</span>
      </div>

      {/*
        Expandable quantity pill.
        flex-direction: row-reverse → DOM order [+][count][-/trash]
        renders visually as [-/trash][count][+], anchored to right edge.
        overflow:hidden + width transition reveals items from right to left.
      */}
      <div
        className={`qty-pill${count > 0 ? " qty-pill--active" : ""}`}
        aria-label={`Quantity: ${count}`}
      >
        {/* Rightmost: + */}
        <button
          className="qty-pill__btn"
          onClick={increment}
          aria-label="Add one"
        >
          +
        </button>

        {/* Middle: count */}
        <span className="qty-pill__count" aria-live="polite">
          {count > 0 ? count : ""}
        </span>

        {/* Leftmost: − or trash */}
        <button
          className="qty-pill__btn"
          onClick={decrement}
          aria-label={count === 1 ? "Remove" : "Remove one"}
        >
          {count === 1 ? <TrashIcon /> : "−"}
        </button>
      </div>
    </article>
  );
}
