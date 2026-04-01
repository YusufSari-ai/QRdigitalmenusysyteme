import Image from "next/image";
import type { CategoryWithProducts } from "@/types/category";
import ProductCard from "./ProductCard";

interface CategorySectionProps {
  category: CategoryWithProducts;
}

// Each category is a section with its own anchor ID (spec §6.1)
// Category header styled as Win2000 title bar strip
export default function CategorySection({ category }: CategorySectionProps) {
  return (
    <section
      id={`category-${category.id}`}
      className="category-section"
      aria-labelledby={`category-title-${category.id}`}
    >
      {/* Win2000 mini title bar for each category */}
      <div className="category-header">
        <div className="category-header__image-wrap">
          {category.image_url ? (
            <Image
              src={category.image_url}
              alt={category.name}
              width={20}
              height={20}
              className="category-header__image"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <span aria-hidden="true" style={{ fontSize: 12, lineHeight: "20px", textAlign: "center", display: "block" }}>
              🍴
            </span>
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

      {/* Products grid */}
      <div className="products-grid">
        {category.products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
