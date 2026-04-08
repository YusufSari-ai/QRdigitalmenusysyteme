"use client";

import type { Product } from "@/types/product";
import { useCart } from "./CartContext";
import MenuImage from "@/components/ui/MenuImage";

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
  const { getCount, setCount } = useCart();
  const count = getCount(product.id);

  const increment = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCount(product, count + 1);
  };

  const decrement = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCount(product, count - 1);
  };

  return (
    <article className="product-card" style={{ position: "relative" }}>
      <h3 className="product-card__name">{product.name}</h3>

      <div className="product-card__image-wrap">
        <MenuImage
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(max-width: 480px) 50vw, (max-width: 768px) 33vw, 25vw"
          className="product-card__image"
          style={{ objectFit: "cover" }}
          fallback={
            <div className="product-card__placeholder" aria-hidden="true">
              🍽️
            </div>
          }
        />
      </div>

      <div className="product-card__footer">
        <span className="product-card__price">{formatPrice(product.price)}</span>
      </div>

      {/*
        Expandable quantity pill.
        flex-direction: row-reverse → DOM order [+][count][-/trash]
        renders visually as [-/trash][count][+], anchored to right edge.
      */}
      <div
        className={`qty-pill${count > 0 ? " qty-pill--active" : ""}`}
        aria-label={`Quantity: ${count}`}
      >
        <button className="qty-pill__btn" onClick={increment} aria-label="Add one">
          +
        </button>
        <span className="qty-pill__count" aria-live="polite">
          {count > 0 ? count : ""}
        </span>
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
