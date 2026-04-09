"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/admin/categories", label: "Categories", icon: "🗂️" },
  { href: "/admin/products", label: "Products", icon: "🍽️" },
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
      {/* Mobile overlay */}
      <div
        className={`admin-overlay${sidebarOpen ? " visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className={`admin-sidebar${sidebarOpen ? " open" : ""}`}>
        <div className="admin-sidebar__brand">
          <div className="admin-sidebar__brand-name">Digital Menu</div>
          <div className="admin-sidebar__brand-sub">Admin Panel</div>
        </div>

        <nav className="admin-sidebar__nav" aria-label="Admin navigation">
          <div className="admin-nav__label">Menu</div>
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`admin-nav__link${
                pathname === item.href ? " active" : ""
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
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="mobile-menu-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label="Toggle navigation menu"
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

