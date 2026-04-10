"use client";

import { useState } from "react";
import type { Product } from "@/types/product";
import MenuImage from "@/components/ui/MenuImage";

interface ProductCardProps {
  product: Product;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(price);
}

// Display order per spec §6.2: Name → Image → Price
export default function ProductCard({ product }: ProductCardProps) {
  const [flipped, setFlipped] = useState(false);

  const tags = product.tags ?? [];
  const inlineTag = tags[0] ?? null;

  return (
    <article
      className={`product-card${flipped ? " product-card--flipped" : ""}`}
      onClick={() => setFlipped((f) => !f)}
      aria-pressed={flipped}
    >
      <div className="product-card__inner">

        {/* ── Front ── */}
        <div className="product-card__front">
          {/* "i" info badge — top-right corner */}
          <div className="product-card__info-badge" aria-hidden="true">i</div>

          {/* 1. Product Name */}
          <h3 className="product-card__name">{product.name}</h3>

          {/* 2. Product Image */}
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

          {/* 3. Price + single inline tag */}
          <div className="product-card__footer">
            <span className="product-card__price">{formatPrice(product.price)}</span>
            {inlineTag && (
              <span className="product-card__tag">
                {inlineTag}
              </span>
            )}
          </div>
        </div>

        {/* ── Back ── */}
        <div className="product-card__back" aria-hidden={!flipped}>
          <h3 className="product-card__back-name">{product.name}</h3>

          {product.description ? (
            <div className="product-card__description">
              {product.description.split("\n").map((line, i) => {
                const match = line.match(/^([^:]+:)(.*)/);
                return (
                  <p key={i} className="product-card__desc-line">
                    {match ? (
                      <>
                        <span className={`product-card__desc-label${match[1].startsWith("Alerjen") ? " product-card__desc-label--alert" : ""}`}>{match[1]}</span>
                        {match[2]}
                      </>
                    ) : line}
                  </p>
                );
              })}
            </div>
          ) : (
            <p className="product-card__description" style={{ fontStyle: "italic", opacity: 0.5 }}>
              No description available.
            </p>
          )}

          <div className="product-card__back-hint">Kartı geri çevirmek için dokunun</div>
        </div>

      </div>
    </article>
  );
}
