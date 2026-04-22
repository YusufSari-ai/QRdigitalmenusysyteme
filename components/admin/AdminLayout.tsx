"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const navItems = [
  { href: "/admin/dashboard", label: "Panel", icon: "📊" },
  { href: "/admin/categories", label: "Kategoriler", icon: "🗂️" },
  { href: "/admin/products", label: "Ürünler", icon: "🍽️" },
  { href: "/admin/feedbacks", label: "Geri Bildirimler", icon: "💬" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="admin-root">
      {/* Mobil arka plan */}
      <div
        className={`admin-overlay${sidebarOpen ? " visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__brand-name">Dijital Menü</div>
          <div className="admin-sidebar__brand-sub">Yönetim Paneli</div>
        </div>

        <nav
          className="admin-sidebar__nav"
          aria-label="Yönetim paneli menüsü"
        >
          <div className="admin-nav__label">Menü</div>

          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav__link${pathname === item.href ? " active" : ""
                }`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="admin-nav__icon" aria-hidden="true">
                {item.icon}
              </span>
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="admin-sidebar__footer">
          <button
            className="admin-signout-btn"
            onClick={handleSignOut}
            id="admin-signout-btn"
          >
            <span className="admin-nav__icon" aria-hidden="true">
              🚪
            </span>
            Çıkış Yap
          </button>
        </div>
      </aside>

      {/* Ana içerik */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Menüyü aç veya kapat"
            id="admin-mobile-menu-btn"
          >
            ☰
          </button>

          <h1 className="admin-topbar__title">{title}</h1>
        </header>

        <main className="admin-page">{children}</main>
      </div>
    </div>
  );
}
