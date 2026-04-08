"use client";

import type { Product } from "@/types/product";
import type { Category } from "@/types/category";
import EmptyState from "@/components/ui/EmptyState";
import MenuImage from "@/components/ui/MenuImage";

interface ProductTableProps {
  products: Product[];
  categories: Category[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(price);
}

export default function ProductTable({
  products,
  categories,
  onEdit,
  onDelete,
}: ProductTableProps) {
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  if (products.length === 0) {
    return (
      <div
        className="data-table-wrap"
        style={{ padding: "var(--sp-8) var(--sp-4)" }}
      >
        <EmptyState
          title="No products yet"
          subtitle="Add your first product to start populating the menu."
          icon="🍽️"
        />
      </div>
    );
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table" aria-label="Products table">
        <thead>
          <tr>
            <th scope="col">Image</th>
            <th scope="col">Name</th>
            <th scope="col">Category</th>
            <th scope="col">Price</th>
            <th scope="col">Order</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <MenuImage
                  src={product.image_url}
                  alt={product.name}
                  width={44}
                  height={44}
                  className="table-thumbnail"
                  style={{ objectFit: "cover" }}
                  fallback={
                    <div
                      className="table-thumbnail-placeholder"
                      aria-hidden="true"
                    >
                      🍽️
                    </div>
                  }
                />
              </td>
              <td>
                <span
                  className="truncate"
                  style={{ maxWidth: 200, display: "block" }}
                >
                  {product.name}
                </span>
              </td>
              <td>
                <span className="table-badge">
                  {categoryMap.get(product.categoryId) ?? "—"}
                </span>
              </td>
              <td style={{ fontWeight: 600, color: "var(--a-primary)" }}>
                {formatPrice(product.price)}
              </td>
              <td>
                <span className="table-badge">{product.orderIndex}</span>
              </td>
              <td>
                <div className="table-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onEdit(product)}
                    id={`edit-product-${product.id}`}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete(product)}
                    id={`delete-product-${product.id}`}
                  >
                    🗑️ Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
