"use client";

import { useEffect, useState } from "react";
import AdminLayout from "@/components/admin/AdminLayout";
import { adminGetCategories, adminGetProducts } from "@/lib/queries";

export default function AdminDashboard() {
  const [categoryCount, setCategoryCount] = useState<number | null>(null);
  const [productCount, setProductCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [catResult, prodResult] = await Promise.all([
        adminGetCategories(),
        adminGetProducts(),
      ]);
      setCategoryCount(catResult.data?.length ?? 0);
      setProductCount(prodResult.data?.length ?? 0);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <AdminLayout title="Dashboard">
      <div className="admin-page-header">
        <div>
          <h2 className="admin-page-header__title">Welcome back 👋</h2>
          <p className="admin-page-header__subtitle">
            Here&rsquo;s a quick overview of your menu.
          </p>
        </div>
      </div>

      <div className="admin-stats-grid">
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">
            {loading ? "—" : categoryCount}
          </div>
          <div className="admin-stat-card__label">Categories</div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-card__value">
            {loading ? "—" : productCount}
          </div>
          <div className="admin-stat-card__label">Products</div>
        </div>
      </div>

      <div
        className="data-table-wrap"
        style={{ padding: "var(--sp-5)", maxWidth: 600 }}
      >
        <h3
          style={{
            fontSize: "0.9rem",
            fontWeight: 600,
            marginBottom: "var(--sp-3)",
            color: "var(--a-text)",
          }}
        >
          Quick links
        </h3>
        <div style={{ display: "flex", gap: "var(--sp-3)", flexWrap: "wrap" }}>
          <a href="/admin/categories" className="btn btn-primary">
            🗂️ Manage Categories
          </a>
          <a href="/admin/products" className="btn btn-ghost">
            🍽️ Manage Products
          </a>
          <a
            href="/menu"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            👁️ Preview Menu
          </a>
        </div>
      </div>
    </AdminLayout>
  );
}
