"use client";

import Image from "next/image";
import type { Category } from "@/types/category";
import EmptyState from "@/components/ui/EmptyState";

interface CategoryTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export default function CategoryTable({
  categories,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  if (categories.length === 0) {
    return (
      <div
        className="data-table-wrap"
        style={{ padding: "var(--sp-8) var(--sp-4)" }}
      >
        <EmptyState
          title="No categories yet"
          subtitle="Create your first category to start building the menu."
          icon="🗂️"
        />
      </div>
    );
  }

  return (
    <div className="data-table-wrap">
      <table className="data-table" aria-label="Categories table">
        <thead>
          <tr>
            <th scope="col">Image</th>
            <th scope="col">Name</th>
            <th scope="col">Order</th>
            <th scope="col">Created</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat.id}>
              <td>
                {cat.image_url ? (
                  <Image
                    src={cat.image_url}
                    alt={cat.name}
                    width={44}
                    height={44}
                    className="table-thumbnail"
                    style={{ objectFit: "cover" }}
                  />
                ) : (
                  <div className="table-thumbnail-placeholder" aria-hidden="true">
                    🍴
                  </div>
                )}
              </td>
              <td>
                <strong className="truncate" style={{ maxWidth: 200, display: "block" }}>
                  {cat.name}
                </strong>
              </td>
              <td>
                <span className="table-badge">{cat.orderIndex}</span>
              </td>
              <td style={{ color: "var(--a-text-secondary)", fontSize: "0.8rem" }}>
                {new Date(cat.createdAt).toLocaleDateString("en-GB")}
              </td>
              <td>
                <div className="table-actions">
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => onEdit(cat)}
                    id={`edit-category-${cat.id}`}
                  >
                    ✏️ Edit
                  </button>
                  <button
                    className="btn btn-danger btn-sm"
                    onClick={() => onDelete(cat)}
                    id={`delete-category-${cat.id}`}
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
