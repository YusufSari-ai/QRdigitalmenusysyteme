"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import CategoryTable from "@/components/admin/CategoryTable";
import CategoryForm from "@/components/admin/CategoryForm";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { adminGetCategories, adminDeleteCategory } from "@/lib/queries";
import type { Category } from "@/types/category";

type View = "list" | "create" | "edit";

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [editTarget, setEditTarget] = useState<Category | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const { data, error } = await adminGetCategories();
    if (!error && data) setCategories(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3500);
  };

  const handleCreateSuccess = async () => {
    await loadCategories();
    setView("list");
    showAlert("success", "Category created successfully.");
  };

  const handleEditSuccess = async () => {
    await loadCategories();
    setView("list");
    setEditTarget(null);
    showAlert("success", "Category updated successfully.");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await adminDeleteCategory(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      showAlert("error", error.message);
    } else {
      await loadCategories();
      showAlert("success", "Category and its products were deleted.");
    }
  };

  const nextOrderIndex =
    categories.length > 0
      ? Math.max(...categories.map((c) => c.orderIndex)) + 1
      : 0;

  return (
    <AdminLayout title="Categories">
      {/* Confirm delete dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete category?"
          message={`"${deleteTarget.name}" and ALL its products will be permanently deleted. This cannot be undone.`}
          confirmLabel={deleting ? "Deleting…" : "Yes, delete"}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-header__title">
            {view === "list"
              ? "Categories"
              : view === "create"
              ? "New Category"
              : "Edit Category"}
          </h2>
          <p className="admin-page-header__subtitle">
            {view === "list"
              ? `${categories.length} categor${categories.length === 1 ? "y" : "ies"}`
              : "Fill in the details below."}
          </p>
        </div>

        {view === "list" && (
          <button
            className="btn btn-primary"
            onClick={() => setView("create")}
            id="add-category-btn"
          >
            + Add Category
          </button>
        )}
      </div>

      {alert && (
        <div
          className={`alert ${alert.type === "success" ? "alert-success" : "alert-error"}`}
          role="alert"
          style={{ marginBottom: "var(--sp-4)" }}
        >
          {alert.type === "success" ? "✅" : "❌"} {alert.msg}
        </div>
      )}

      {view === "list" && (
        <>
          {loading ? (
            <p style={{ color: "var(--a-text-secondary)" }}>Loading…</p>
          ) : (
            <CategoryTable
              categories={categories}
              onEdit={(cat) => {
                setEditTarget(cat);
                setView("edit");
              }}
              onDelete={(cat) => setDeleteTarget(cat)}
            />
          )}
        </>
      )}

      {view === "create" && (
        <CategoryForm
          nextOrderIndex={nextOrderIndex}
          onSuccess={handleCreateSuccess}
          onCancel={() => setView("list")}
        />
      )}

      {view === "edit" && editTarget && (
        <CategoryForm
          editTarget={editTarget}
          nextOrderIndex={nextOrderIndex}
          onSuccess={handleEditSuccess}
          onCancel={() => {
            setView("list");
            setEditTarget(null);
          }}
        />
      )}
    </AdminLayout>
  );
}
