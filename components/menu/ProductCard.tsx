import Image from "next/image";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
}

// Price formatted per spec §6.2: ₺100,00 (Turkish Lira locale)
function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(price);
}

// Display order per spec §6.2: Name → Image → Price
// Styled as a Windows 2000 raised panel card
export default function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="product-card">
      {/* 1. Product Name — Win2000 title strip */}
      <h3 className="product-card__name">{product.name}</h3>

      {/* 2. Product Image — sunken bevel frame */}
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

      {/* 3. Price — Win2000 status bar style footer */}
      <div className="product-card__footer">
        <span className="product-card__price-label">Price:</span>
        <span className="product-card__price">{formatPrice(product.price)}</span>
      </div>
    </article>
  );
}
