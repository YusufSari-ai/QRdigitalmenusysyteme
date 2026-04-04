import Image from "next/image";
import type { CategoryWithProducts } from "@/types/category";
import WaiterProductCard from "./WaiterProductCard";

interface Props {
  category: CategoryWithProducts;
}

export default function WaiterCategorySection({ category }: Props) {
  return (
    <section
      id={`category-${category.id}`}
      className="category-section"
      aria-labelledby={`category-title-${category.id}`}
    >
      <div className="category-header">
        <div className="category-header__image-wrap">
          {category.image_url ? (
            <Image
              src={category.image_url}
              alt={category.name}
              width={44}
              height={44}
              className="category-header__image"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="product-card__placeholder" aria-hidden="true">
              🍴
            </div>
          )}
        </div>
        <h2
          id={`category-title-${category.id}`}
          className="category-header__name"
        >
          {category.name}
        </h2>
        <div className="category-header__accent" aria-hidden="true" />
      </div>

      <div className="products-grid">
        {category.products.map((product) => (
          <WaiterProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
