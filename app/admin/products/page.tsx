"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import ProductTable from "@/components/admin/ProductTable";
import ProductForm from "@/components/admin/ProductForm";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import {
  adminGetProducts,
  adminGetCategories,
  adminDeleteProduct,
} from "@/lib/queries";
import type { Product } from "@/types/product";
import type { Category } from "@/types/category";

type View = "list" | "create" | "edit";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>("list");
  const [editTarget, setEditTarget] = useState<Product | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    msg: string;
  } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [prodResult, catResult] = await Promise.all([
      adminGetProducts(),
      adminGetCategories(),
    ]);
    if (prodResult.data) setProducts(prodResult.data);
    if (catResult.data) setCategories(catResult.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showAlert = (type: "success" | "error", msg: string) => {
    setAlert({ type, msg });
    setTimeout(() => setAlert(null), 3500);
  };

  const handleCreateSuccess = async () => {
    await loadData();
    setView("list");
    showAlert("success", "Product added successfully.");
  };

  const handleEditSuccess = async () => {
    await loadData();
    setView("list");
    setEditTarget(null);
    showAlert("success", "Product updated successfully.");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await adminDeleteProduct(deleteTarget.id);
    setDeleting(false);
    setDeleteTarget(null);
    if (error) {
      showAlert("error", error.message);
    } else {
      await loadData();
      showAlert("success", "Product deleted.");
    }
  };

  const nextOrderIndex =
    products.length > 0
      ? Math.max(...products.map((p) => p.orderIndex)) + 1
      : 0;

  return (
    <AdminLayout title="Products">
      {deleteTarget && (
        <ConfirmDialog
          title="Delete product?"
          message={`"${deleteTarget.name}" will be permanently deleted.`}
          confirmLabel={deleting ? "Deleting…" : "Yes, delete"}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-header__title">
            {view === "list"
              ? "Products"
              : view === "create"
              ? "New Product"
              : "Edit Product"}
          </h2>
          <p className="admin-page-header__subtitle">
            {view === "list"
              ? `${products.length} product${products.length === 1 ? "" : "s"}`
              : "Fill in the product details below."}
          </p>
        </div>

        {view === "list" && (
          <button
            className="btn btn-primary"
            onClick={() => setView("create")}
            id="add-product-btn"
          >
            + Add Product
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
            <ProductTable
              products={products}
              categories={categories}
              onEdit={(prod) => {
                setEditTarget(prod);
                setView("edit");
              }}
              onDelete={(prod) => setDeleteTarget(prod)}
            />
          )}
        </>
      )}

      {view === "create" && (
        <ProductForm
          categories={categories}
          nextOrderIndex={nextOrderIndex}
          onSuccess={handleCreateSuccess}
          onCancel={() => setView("list")}
        />
      )}

      {view === "edit" && editTarget && (
        <ProductForm
          editTarget={editTarget}
          categories={categories}
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
