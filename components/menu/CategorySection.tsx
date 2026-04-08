import type { CategoryWithProducts } from "@/types/category";
import ProductCard from "./ProductCard";
import MenuImage from "@/components/ui/MenuImage";

interface CategorySectionProps {
  category: CategoryWithProducts;
}

// Each category is a section with its own anchor ID (spec §6.1)
// Category header is sticky (spec §6.4)
// Categories with zero products are filtered before reaching this component (spec §8)
export default function CategorySection({ category }: CategorySectionProps) {
  return (
    <section
      id={`category-${category.id}`}
      className="category-section"
      aria-labelledby={`category-title-${category.id}`}
    >
      {/* Sticky header */}
      <div className="category-header">
        <div className="category-header__image-wrap">
          <MenuImage
            src={category.image_url}
            alt={category.name}
            width={44}
            height={44}
            className="category-header__image"
            style={{ objectFit: "cover" }}
            fallback={
              <div className="product-card__placeholder" aria-hidden="true">
                🍴
              </div>
            }
          />
        </div>
        <h2
          id={`category-title-${category.id}`}
          className="category-header__name"
        >
          {category.name}
        </h2>
        <div className="category-header__accent" aria-hidden="true" />
      </div>

      {/* Products grid */}
      <div className="products-grid">
        {category.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
