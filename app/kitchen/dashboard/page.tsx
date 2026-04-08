"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  getKitchenOrders,
  startPreparingOrder,
  serveOrder,
  type KitchenOrder,
} from "@/lib/queries";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatElapsed(createdAt: string, now: number): string {
  const ms = now - new Date(createdAt).getTime();
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min === 0) return `${sec}s`;
  return `${min}m ${sec}s`;
}

function elapsedMs(createdAt: string, now: number): number {
  return now - new Date(createdAt).getTime();
}

// Warning threshold: 10 minutes
const WARN_MS = 10 * 60 * 1000;

// Supabase returns joined-parent rows as an object for FK relationships, but
// infers the type as an array without generated types. Normalize either form.
function getTableName(tables: KitchenOrder["tables"]): string {
  if (!tables) return "—";
  if (Array.isArray(tables)) return tables[0]?.name ?? "—";
  return tables.name ?? "—";
}

function getProductName(products: { name: string; price: number } | { name: string; price: number }[] | null): string {
  if (!products) return "Unknown item";
  if (Array.isArray(products)) return products[0]?.name ?? "Unknown item";
  return products.name;
}

const STATUS_META = {
  open: {
    label: "PENDING",
    bg: "#fffbeb",
    border: "#fbbf24",
    badgeBg: "#f59e0b",
    textColor: "#92400e",
    btnBg: "#f59e0b",
    btnColor: "#7c2d12",
    btnLabel: "Hazırlamaya Başla",
  },
  in_progress: {
    label: "PREPARING",
    bg: "#fff7ed",
    border: "#fb923c",
    badgeBg: "#ea580c",
    textColor: "#9a3412",
    btnBg: "#16a34a",
    btnColor: "#fff",
    btnLabel: "Servis Edildi",
  },
} as const;

// ── Component ─────────────────────────────────────────────────────────────────

export default function KitchenDashboard() {
  const router = useRouter();
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState<Set<string>>(new Set());

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchOrders = useCallback(async () => {
    const { data, error: fetchErr } = await getKitchenOrders();
    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      setOrders(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, []);

  // Initial load + 30 s polling
  useEffect(() => {
    fetchOrders();
    const poll = setInterval(fetchOrders, 30_000);
    return () => clearInterval(poll);
  }, [fetchOrders]);

  // Live clock for elapsed time display
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleSignOut = async () => {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleAction = async (order: KitchenOrder) => {
    setBusy((prev) => new Set(prev).add(order.id));
    try {
      if (order.status === "open") {
        const { error: e } = await startPreparingOrder(order.id);
        if (!e) {
          setOrders((prev) =>
            prev.map((o) =>
              o.id === order.id ? { ...o, status: "in_progress" as const } : o
            )
          );
        }
      } else if (order.status === "in_progress") {
        const { error: e } = await serveOrder(order.id);
        if (!e) {
          // Remove from kitchen queue — now visible on /cashier
          setOrders((prev) => prev.filter((o) => o.id !== order.id));
        }
      }
    } finally {
      setBusy((prev) => {
        const next = new Set(prev);
        next.delete(order.id);
        return next;
      });
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
  <div
    style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "transparent",
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}
    >
     {/* ── Header ──────────────────────────────────────────────────────────── */}
<header
  style={{
    background:
      "linear-gradient(135deg, rgba(212,175,55,0.45), rgba(15,15,15,0.60))",
    backdropFilter: "blur(14px)",
    WebkitBackdropFilter: "blur(14px)",
    color: "#fff",
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
    borderBottom: "1px solid rgba(212,175,55,0.25)",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
  }}
>
  {/* LEFT */}
  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
    <div
      style={{
        fontWeight: 700,
        fontSize: "1.1rem",
        lineHeight: 1.2,
        letterSpacing: "0.02em",
      }}
    >
      Kitchen Panel
    </div>

    <div
      style={{
        fontSize: "0.75rem",
        color: "rgba(255,255,255,0.75)",
        lineHeight: 1.3,
      }}
    >
      {loading
        ? "Loading…"
        : `${orders.length} active order${orders.length !== 1 ? "s" : ""}`}
    </div>
  </div>

  {/* RIGHT */}
  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
    {/* Refresh */}
    <button
      onClick={fetchOrders}
      title="Refresh now"
      style={{
        background: "rgba(212,175,55,0.18)",
        border: "1px solid rgba(212,175,55,0.35)",
        color: "#fff",
        width: 40,
        height: 40,
        borderRadius: 12,
        cursor: "pointer",
        fontSize: "1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        transition: "all 0.2s ease",
      }}
    >
      ↺
    </button>

    {/* Sign out */}
    <button
      onClick={handleSignOut}
      style={{
        background: "rgba(212,175,55,0.18)",
        border: "1px solid rgba(212,175,55,0.35)",
        color: "#fff",
        padding: "8px 14px",
        borderRadius: 12,
        cursor: "pointer",
        fontSize: "0.82rem",
        fontWeight: 600,
        letterSpacing: "0.02em",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06)",
        transition: "all 0.2s ease",
      }}
    >
      Sign out
    </button>
  </div>
</header>

      {/* ── Main ────────────────────────────────────────────────────────────── */}
      <main style={{ flex: 1, padding: "18px 14px", overflowY: "auto" }}>
        {/* Loading state */}
        {loading && (
          <div
            style={{
              textAlign: "center",
              color: "#6b7280",
              padding: "56px 0",
              fontSize: "0.95rem",
            }}
          >
            Loading orders…
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div
            style={{
              background: "#fef2f2",
              border: "1px solid #fca5a5",
              borderRadius: 10,
              padding: "14px 18px",
              color: "#991b1b",
              marginBottom: 16,
              fontSize: "0.9rem",
            }}
          >
            {error}
            <button
              onClick={fetchOrders}
              style={{
                marginLeft: 12,
                background: "none",
                border: "none",
                color: "#dc2626",
                cursor: "pointer",
                textDecoration: "underline",
                fontSize: "inherit",
              }}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && orders.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "72px 24px",
              color: "#9ca3af",
            }}
          >
            <div style={{ fontSize: "3rem", marginBottom: 10, lineHeight: 1 }}>
              ✓
            </div>
            <div
              style={{ fontSize: "1.1rem", fontWeight: 600, color: "#6b7280" }}
            >
              All caught up!
            </div>
            <div style={{ fontSize: "0.88rem", marginTop: 6 }}>
              No pending orders right now.
            </div>
          </div>
        )}

        {/* Order grid */}
        {!loading && !error && orders.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
              gap: 14,
            }}
          >
            {orders.map((order) => {
              const meta =
                STATUS_META[order.status as keyof typeof STATUS_META] ??
                STATUS_META.open;
              const isBusy = busy.has(order.id);
              const isOld = elapsedMs(order.created_at, now) > WARN_MS;

              return (
                <div
                  key={order.id}
                  style={{
                    background: "#fff",
                    border: `2px solid ${isOld ? "#ef4444" : meta.border}`,
                    borderRadius: 14,
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    boxShadow: "0 2px 8px rgba(0,0,0,.07)",
                  }}
                >
                  {/* Card header: table + status + elapsed */}
                  <div
                    style={{
                      background: isOld ? "#fef2f2" : meta.bg,
                      padding: "12px 15px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: `1px solid ${isOld ? "#fca5a5" : meta.border}`,
                    }}
                  >
                    {/* Large table number */}
                    <div
                      style={{
                        fontSize: "2.6rem",
                        fontWeight: 800,
                        lineHeight: 1,
                        color: isOld ? "#991b1b" : meta.textColor,
                      }}
                    >
                      {getTableName(order.tables)}
                    </div>

                    <div style={{ textAlign: "right" }}>
                      {/* Elapsed time */}
                      <div
                        style={{
                          fontSize: "0.85rem",
                          fontWeight: 600,
                          color: isOld ? "#991b1b" : meta.textColor,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        ⏱ {formatElapsed(order.created_at, now)}
                      </div>
                    </div>
                  </div>

                  {/* Product list */}
                  <div style={{ padding: "10px 15px", flex: 1 }}>
                    <ul
                      style={{ margin: 0, padding: 0, listStyle: "none" }}
                    >
                      {order.order_items.map((item) => (
                        <li
                          key={item.id}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            padding: "5px 0",
                            fontSize: "0.92rem",
                            color: "#374151",
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <span>{getProductName(item.products)}</span>
                          <span
                            style={{
                              fontWeight: 700,
                              color: "#111827",
                              marginLeft: 10,
                              flexShrink: 0,
                            }}
                          >
                            ×{item.quantity}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Order note */}
                  {order.note?.trim() && (
                    <div
                      style={{
                        margin: "0 15px 10px",
                        padding: "8px 12px",
                        background: "#fffbeb",
                        border: "1px solid #fde68a",
                        borderRadius: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          letterSpacing: "0.07em",
                          textTransform: "uppercase",
                          color: "#b45309",
                          marginBottom: 3,
                        }}
                      >
                        Order Note
                      </div>
                      <div
                        style={{
                          fontSize: "0.88rem",
                          color: "#78350f",
                          lineHeight: 1.45,
                          wordBreak: "break-word",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {order.note?.trim()}
                      </div>
                    </div>
                  )}

                  {/* Action button */}
                  <div style={{ padding: "12px 15px" }}>
                    <button
                      onClick={() => handleAction(order)}
                      disabled={isBusy}
                      style={{
                        width: "100%",
                        padding: "14px",
                        background: isBusy ? "#d1d5db" : meta.btnBg,
                        color: isBusy ? "#9ca3af" : meta.btnColor,
                        border: "none",
                        borderRadius: 10,
                        fontSize: "1rem",
                        fontWeight: 700,
                        cursor: isBusy ? "not-allowed" : "pointer",
                        letterSpacing: "0.02em",
                        transition: "background 0.15s",
                      }}
                    >
                      {isBusy ? "Updating…" : meta.btnLabel}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
