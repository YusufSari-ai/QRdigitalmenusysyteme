"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseClient";
import {
  getCashierOrders,
  getPaidOrders,
  getPaidQuantityByOrderItemIds,
  settlePaymentSelection,
  removeCashierSelection,
  getTables,
  type CashierOrder,
  type PaidOrder,
} from "@/lib/queries";
import type { RestaurantTable } from "@/types/table";

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

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return date.toLocaleString("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
  }).format(value);
}

function getTableName(
  tables: { name: string } | { name: string }[] | null
): string {
  if (!tables) return "—";
  if (Array.isArray(tables)) return tables[0]?.name ?? "—";
  return tables.name ?? "—";
}

function getProductName(
  products:
    | { name: string; price: number }
    | { name: string; price: number }[]
    | null
): string {
  if (!products) return "Unknown item";
  if (Array.isArray(products)) return products[0]?.name ?? "Unknown item";
  return products.name;
}

function getOrderTotal(order: CashierOrder | PaidOrder): number {
  return order.order_items.reduce(
    (sum, item) => sum + Number(item.line_total ?? 0),
    0
  );
}

function getOrderItemCount(order: CashierOrder | PaidOrder): number {
  return order.order_items.reduce(
    (sum, item) => sum + Number(item.quantity ?? 0),
    0
  );
}

// Single source of truth for remaining-quantity arithmetic.
// Always returns a non-negative integer; never lets a DB inconsistency
// (over-payment) surface as a negative value in the UI.
function computeRemaining(orderedQty: number, paidQty: number): number {
  return Math.max(0, orderedQty - paidQty);
}

// Extracts the first run of digits from a table name for numeric sorting.
// "Masa 40" → 40, "3" → 3, "VIP Table" → NaN (falls back to localeCompare).
function parseTableNum(name: string): number {
  const m = name.match(/\d+/);
  return m ? parseInt(m[0], 10) : NaN;
}

function compareTableNames(a: string, b: string): number {
  const na = parseTableNum(a);
  const nb = parseTableNum(b);
  if (!isNaN(na) && !isNaN(nb)) return na - nb;
  return a.localeCompare(b, "tr");
}

// Warning threshold: 10 minutes
const WARN_MS = 10 * 60 * 1000;

type ActiveView = "tables" | "reports";

type GroupedTableOrder = {
  tableId: string;
  tableName: string;
  orders: CashierOrder[];
  totalAmount: number;
  totalItems: number;
  orderCount: number;
  oldestCreatedAt: string;
};

function groupOrdersByTable(orders: CashierOrder[]): GroupedTableOrder[] {
  const map = new Map<string, GroupedTableOrder>();

  for (const order of orders) {
    const tableId = order.table_id;
    const tableName = getTableName(order.tables);
    const orderTotal = getOrderTotal(order);
    const itemCount = getOrderItemCount(order);

    const existing = map.get(tableId);

    if (!existing) {
      map.set(tableId, {
        tableId,
        tableName,
        orders: [order],
        totalAmount: orderTotal,
        totalItems: itemCount,
        orderCount: 1,
        oldestCreatedAt: order.created_at,
      });
      continue;
    }

    existing.orders.push(order);
    existing.totalAmount += orderTotal;
    existing.totalItems += itemCount;
    existing.orderCount += 1;

    if (
      new Date(order.created_at).getTime() <
      new Date(existing.oldestCreatedAt).getTime()
    ) {
      existing.oldestCreatedAt = order.created_at;
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    compareTableNames(a.tableName, b.tableName)
  );
}

// ── Report range ─────────────────────────────────────────────────────────────

type ReportRange = "daily" | "weekly" | "monthly" | "yearly";

const REPORT_RANGE_LABELS: Record<ReportRange, string> = {
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
  yearly: "Yıllık",
};

function getRangeStart(range: ReportRange): Date {
  const now = new Date();
  switch (range) {
    case "daily":
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case "weekly": {
      const d = new Date(now);
      const day = d.getDay();
      const diff = day === 0 ? -6 : 1 - day; // Monday as week start
      d.setDate(d.getDate() + diff);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    case "monthly":
      return new Date(now.getFullYear(), now.getMonth(), 1);
    case "yearly":
      return new Date(now.getFullYear(), 0, 1);
  }
}

function exportReportCSV(orders: PaidOrder[], range: ReportRange): void {
  const rows: string[][] = [
    ["Masa", "Ürün Adedi", "Açılış", "Ödeme", "Tutar (TRY)"],
    ...orders.map((order) => [
      getTableName(order.tables),
      String(getOrderItemCount(order)),
      formatDateTime(order.created_at),
      formatDateTime(order.closed_at),
      getOrderTotal(order).toFixed(2),
    ]),
  ];
  const csv =
    "\uFEFF" + // BOM for Excel UTF-8
    rows
      .map((row) => row.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rapor_${range}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportReportPDF(orders: PaidOrder[], range: ReportRange): void {
  const total = orders.reduce((sum, o) => sum + getOrderTotal(o), 0);
  const rows = orders
    .map(
      (order) => `<tr>
        <td>${getTableName(order.tables)}</td>
        <td>${getOrderItemCount(order)}</td>
        <td>${formatDateTime(order.created_at)}</td>
        <td>${formatDateTime(order.closed_at)}</td>
        <td style="text-align:right;font-weight:700">${formatCurrency(getOrderTotal(order))}</td>
      </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
    <title>Finansal Rapor — ${REPORT_RANGE_LABELS[range]}</title>
    <style>
      body{font-family:Arial,sans-serif;font-size:12px;padding:24px;color:#0f172a}
      h1{font-size:17px;margin:0 0 4px}
      .sub{color:#6b7280;margin-bottom:20px;font-size:11px}
      table{width:100%;border-collapse:collapse}
      th{background:#f8fafc;text-align:left;padding:9px 10px;border-bottom:2px solid #e5e7eb;font-size:11px}
      td{padding:9px 10px;border-bottom:1px solid #f1f5f9}
      .foot{margin-top:14px;text-align:right;font-weight:700;font-size:13px}
      @media print{body{padding:0}}
    </style>
  </head><body>
    <h1>Finansal Rapor — ${REPORT_RANGE_LABELS[range]}</h1>
    <div class="sub">Oluşturulma: ${new Date().toLocaleString("tr-TR")}</div>
    <table>
      <thead>
        <tr><th>Masa</th><th>Ürün Adedi</th><th>Açılış</th><th>Ödeme</th><th style="text-align:right">Tutar</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="foot">Toplam: ${formatCurrency(total)}</div>
  </body></html>`;

  const win = window.open("", "_blank");
  if (!win) return;
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

// ── Table filter / search types ───────────────────────────────────────────────

type TableFilter = "waiting" | "all";

type DisplayTable =
  | { kind: "waiting"; group: GroupedTableOrder }
  | { kind: "idle"; tableId: string; tableName: string };

// ── Selection types ───────────────────────────────────────────────────────────

type SelectionEntry = { qty: number; unit_price: number; order_id: string };
type SelectionMap = Record<number, SelectionEntry>;

// ── Component ─────────────────────────────────────────────────────────────────

export default function CashierDashboard() {
  const router = useRouter();

  const [activeView, setActiveView] = useState<ActiveView>("tables");

  const [orders, setOrders] = useState<CashierOrder[]>([]);
  const [paidOrders, setPaidOrders] = useState<PaidOrder[]>([]);

  const [loading, setLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [now, setNow] = useState(Date.now());
  const [isSettling, setIsSettling] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  // Report range
  const [reportRange, setReportRange] = useState<ReportRange>("daily");

  // Table filter / search state
  const [allTables, setAllTables] = useState<RestaurantTable[]>([]);
  const [tableFilter, setTableFilter] = useState<TableFilter>("waiting");
  const [tableSearch, setTableSearch] = useState("");

  // Item-based payment state
  const [paidQtyMap, setPaidQtyMap] = useState<Record<number, number>>({});
  const [paidQtyLoading, setPaidQtyLoading] = useState(false);
  const [selection, setSelection] = useState<SelectionMap>({});

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAllTables = useCallback(async () => {
    const { data } = await getTables();
    setAllTables(data ?? []);
  }, []);

  const fetchCashierOrders = useCallback(async () => {
    const { data, error: fetchErr } = await getCashierOrders();
    if (fetchErr) {
      setError(fetchErr.message);
      return;
    }
    setOrders(data ?? []);
    setError(null);
  }, []);

  // TODO(payment-reports): replace getPaidOrders() with a query against the
  // `payments` + `payment_items` tables once payment-based reporting is ready.
  // The new query should group by payment.id and join payment_items for totals.
  const fetchPaidOrders = useCallback(async () => {
    setReportsLoading(true);
    const { data, error: fetchErr } = await getPaidOrders();
    if (fetchErr) {
      setError(fetchErr.message);
      setReportsLoading(false);
      return;
    }
    setPaidOrders(data ?? []);
    setError(null);
    setReportsLoading(false);
  }, []);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchCashierOrders(), fetchPaidOrders(), fetchAllTables()]);
    setLoading(false);
  }, [fetchCashierOrders, fetchPaidOrders, fetchAllTables]);

  // Initial load + polling
  useEffect(() => {
    fetchAll();
    const poll = setInterval(() => {
      fetchCashierOrders();
      if (activeView === "reports") {
        fetchPaidOrders();
      }
    }, 30_000);
    return () => clearInterval(poll);
  }, [fetchAll, fetchCashierOrders, fetchPaidOrders, activeView]);

  // Live clock for elapsed time
  useEffect(() => {
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(tick);
  }, []);

  // ── Derived data ───────────────────────────────────────────────────────────

  const groupedTables = useMemo(() => groupOrdersByTable(orders), [orders]);

  const selectedTable = useMemo(() => {
    if (!selectedTableId) return null;
    return groupedTables.find((group) => group.tableId === selectedTableId) ?? null;
  }, [groupedTables, selectedTableId]);

  const filteredPaidOrders = useMemo(() => {
    const start = getRangeStart(reportRange);
    return paidOrders.filter((order) => {
      if (!order.closed_at) return false;
      return new Date(order.closed_at) >= start;
    });
  }, [paidOrders, reportRange]);

  // TODO(payment-reports): once payment-based reporting lands, derive these
  // figures from `payments` rows instead of paid orders:
  //   totalRevenue  → SUM(payments.amount)
  //   totalOrders   → COUNT(DISTINCT payments.id)  (or COUNT(orders closed today))
  //   averageTicket → totalRevenue / totalOrders
  const reportSummary = useMemo(() => {
    const totalRevenue = filteredPaidOrders.reduce(
      (sum, order) => sum + getOrderTotal(order),
      0
    );
    const totalOrders = filteredPaidOrders.length;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    return { totalRevenue, totalOrders, averageTicket };
  }, [filteredPaidOrders]);

  const displayedTables = useMemo((): DisplayTable[] => {
    const q = tableSearch.trim().toLowerCase();

    if (tableFilter === "waiting") {
      return groupedTables
        .filter((g) => q === "" || g.tableName.toLowerCase().includes(q))
        .map((g) => ({ kind: "waiting" as const, group: g }));
    }

    // "all": every table from DB, merged with payment-waiting groups
    const waitingById = new Map(groupedTables.map((g) => [g.tableId, g]));
    const rows: DisplayTable[] = allTables
      .filter((t) => q === "" || t.name.toLowerCase().includes(q))
      .map((t) => {
        const group = waitingById.get(t.id);
        if (group) return { kind: "waiting" as const, group };
        return { kind: "idle" as const, tableId: t.id, tableName: t.name };
      });

    // waiting tables always come before idle ones; within each group sort by name
    return rows.sort((a, b) => {
      if (a.kind !== b.kind) return a.kind === "waiting" ? -1 : 1;
      const nameA = a.kind === "waiting" ? a.group.tableName : a.tableName;
      const nameB = b.kind === "waiting" ? b.group.tableName : b.tableName;
      return compareTableNames(nameA, nameB);
    });
  }, [tableFilter, tableSearch, groupedTables, allTables]);

  // Close panel if selected table disappears after a data refresh
  useEffect(() => {
    if (!selectedTableId) return;
    const exists = groupedTables.some((group) => group.tableId === selectedTableId);
    if (!exists) setSelectedTableId(null);
  }, [groupedTables, selectedTableId]);

  // Fetch paid quantities whenever the selected table changes
  const fetchPaidQtyForTable = useCallback(async (tableOrders: CashierOrder[]) => {
    const ids = tableOrders.flatMap((o) => o.order_items.map((i) => Number(i.id)));
    if (ids.length === 0) {
      setPaidQtyMap({});
      return;
    }
    setPaidQtyLoading(true);
    const { data, error: fetchErr } = await getPaidQuantityByOrderItemIds(ids);
    if (fetchErr) {
      setError(fetchErr.message);
    } else {
      setPaidQtyMap(data ?? {});
    }
    setPaidQtyLoading(false);
  }, []);

  useEffect(() => {
    if (!selectedTable) {
      setPaidQtyMap({});
      setSelection({});
      return;
    }
    setSelection({});
    fetchPaidQtyForTable(selectedTable.orders);
  }, [selectedTable, fetchPaidQtyForTable]);

  // ── Selection helpers ──────────────────────────────────────────────────────

  const getRemainingQty = useCallback(
    (itemId: string, orderedQty: number): number =>
      computeRemaining(orderedQty, paidQtyMap[Number(itemId)] ?? 0),
    [paidQtyMap]
  );

  const setItemQty = useCallback(
    (itemId: number, entry: SelectionEntry | null) => {
      setSelection((prev) => {
        const next = { ...prev };
        if (!entry || entry.qty <= 0) {
          delete next[itemId];
        } else {
          next[itemId] = entry;
        }
        return next;
      });
    },
    []
  );

  const handleSelectAllForOrder = useCallback(
    (order: CashierOrder) => {
      setSelection((prev) => {
        const next = { ...prev };
        for (const item of order.order_items) {
          const remaining = getRemainingQty(item.id, item.quantity);
          if (remaining > 0) {
            next[Number(item.id)] = {
              qty: remaining,
              unit_price: item.unit_price,
              order_id: order.id,
            };
          }
        }
        return next;
      });
    },
    [getRemainingQty]
  );

  const handleSelectAllForTable = useCallback(() => {
    if (!selectedTable) return;
    const next: SelectionMap = {};
    for (const order of selectedTable.orders) {
      for (const item of order.order_items) {
        const remaining = getRemainingQty(item.id, item.quantity);
        if (remaining > 0) {
          next[Number(item.id)] = {
            qty: remaining,
            unit_price: item.unit_price,
            order_id: order.id,
          };
        }
      }
    }
    setSelection(next);
  }, [selectedTable, getRemainingQty]);

  const handleClearSelection = useCallback(() => setSelection({}), []);

  // Clamps rawQty to [0, remaining] and writes it to selection.
  // Passing 0 (or anything ≤ 0) removes the item. Fractional values are
  // truncated. This is the single enforcement point for the cap invariant;
  // increment/decrement/selectFull all delegate here.
  const updateItemQty = useCallback(
    (
      itemId: number,
      rawQty: number,
      orderedQty: number,
      unitPrice: number,
      orderId: string
    ) => {
      const remaining = computeRemaining(orderedQty, paidQtyMap[itemId] ?? 0);
      const clamped = Math.min(Math.max(0, Math.trunc(rawQty)), remaining);
      setItemQty(
        itemId,
        clamped > 0 ? { qty: clamped, unit_price: unitPrice, order_id: orderId } : null
      );
    },
    [paidQtyMap, setItemQty]
  );

  const incrementItem = useCallback(
    (itemId: number, orderedQty: number, unitPrice: number, orderId: string) => {
      updateItemQty(itemId, (selection[itemId]?.qty ?? 0) + 1, orderedQty, unitPrice, orderId);
    },
    [selection, updateItemQty]
  );

  const decrementItem = useCallback(
    (itemId: number, orderedQty: number, unitPrice: number, orderId: string) => {
      updateItemQty(itemId, (selection[itemId]?.qty ?? 0) - 1, orderedQty, unitPrice, orderId);
    },
    [selection, updateItemQty]
  );

  const selectFullItem = useCallback(
    (itemId: number, orderedQty: number, unitPrice: number, orderId: string) => {
      updateItemQty(itemId, orderedQty, orderedQty, unitPrice, orderId);
    },
    [updateItemQty]
  );

  // ── Derived selection totals ───────────────────────────────────────────────

  const selectionSummary = useMemo(() => {
    const entries = Object.values(selection);
    return {
      itemCount: entries.length,
      totalQty: entries.reduce((sum, e) => sum + Number(e.qty ?? 0), 0),
      totalAmount: entries.reduce(
        (sum, e) => sum + Number(e.qty ?? 0) * Number(e.unit_price ?? 0),
        0
      ),
    };
  }, [selection]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleSignOut = async () => {
    await createSupabaseBrowserClient().auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const handleRefresh = async () => {
    await fetchAll();
    // paidQtyMap auto-refreshes via the selectedTable useEffect
  };

  const handleSettle = async () => {
    if (!selectedTable || selectionSummary.itemCount === 0) return;

    // Build a lookup of orderedQty from the current selectedTable snapshot so
    // we can clamp stale selections before sending.
    const orderedQtyById = new Map<number, number>();
    for (const order of selectedTable.orders) {
      for (const item of order.order_items) {
        orderedQtyById.set(Number(item.id), item.quantity);
      }
    }

    // Validate and clamp every entry against current paidQtyMap.
    // Items where remaining === 0 are dropped silently.
    const safeItems: {
      order_item_id: number;
      quantity_paid: number;
      unit_price: number;
      line_total: number;
    }[] = [];

    for (const [itemIdStr, entry] of Object.entries(selection)) {
      const itemId = Number(itemIdStr);
      const ordered = orderedQtyById.get(itemId) ?? 0;
      const remaining = computeRemaining(ordered, paidQtyMap[itemId] ?? 0);
      if (remaining === 0) continue;
      const quantity_paid = Math.min(entry.qty, remaining);
      if (quantity_paid > 0) {
        safeItems.push({
          order_item_id: itemId,
          quantity_paid,
          unit_price: entry.unit_price,
          line_total: quantity_paid * entry.unit_price,
        });
      }
    }

    if (safeItems.length === 0) return;

    setIsSettling(true);
    setError(null);
    try {
      const { error: settleErr } = await settlePaymentSelection({
        table_id: selectedTable.tableId,
        payment_method: null,
        note: null,
        items: safeItems,
      });

      if (settleErr) {
        setError(settleErr.message);
        return;
      }

      setSelection({});
      await fetchCashierOrders();
      await fetchPaidOrders();
      // Panel closes automatically via the groupedTables useEffect when the
      // table no longer has payable orders. No explicit setSelectedTableId(null)
      // needed here — React will re-render with the updated orders list first.
    } finally {
      setIsSettling(false);
    }
  };
  const handleRemoveSelection = async () => {
    if (!selectedTable || selectionSummary.itemCount === 0) return;


    const orderedQtyById = new Map<number, number>();
    for (const order of selectedTable.orders) {
      for (const item of order.order_items) {
        orderedQtyById.set(Number(item.id), item.quantity);
      }
    }

    const safeItems: {
      order_item_id: number;
      quantity_remove: number;
      order_id: string;
    }[] = [];

    for (const [itemIdStr, entry] of Object.entries(selection)) {
      const itemId = Number(itemIdStr);
      const ordered = orderedQtyById.get(itemId) ?? 0;
      const paid = paidQtyMap[itemId] ?? 0;
      const remaining = computeRemaining(ordered, paid);

      const quantity_remove = Math.min(entry.qty, remaining);

      if (quantity_remove > 0) {
        safeItems.push({
          order_item_id: itemId,
          quantity_remove,
          order_id: entry.order_id,
        });
      }
    }

    if (safeItems.length === 0) return;

    setIsRemoving(true);
    setError(null);

    try {
      const { error: removeErr } = await removeCashierSelection({
        table_id: selectedTable.tableId,
        items: safeItems,
      });

      if (removeErr) {
        setError(removeErr.message);
        return;
      }

      setSelection({});
      await fetchCashierOrders();
      await fetchPaidOrders();
    } finally {
      setIsRemoving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          background: "#f8fafc",
          fontFamily:
            'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          color: "#0f172a",
        }}
      >
        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside
          style={{
            width: 260,
            borderRight: "1px solid #e5e7eb",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            padding: 18,
            gap: 18,
          }}
        >
          <div>
            <div
              style={{ fontSize: "1.1rem", fontWeight: 800, lineHeight: 1.2, marginBottom: 6 }}
            >
              Cashier Panel
            </div>
            <div style={{ fontSize: "0.82rem", color: "#64748b", lineHeight: 1.4 }}>
              Ödeme ve raporlama yönetimi
            </div>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => setActiveView("tables")}
              style={{
                textAlign: "left",
                border: "1px solid",
                borderColor: activeView === "tables" ? "#0f766e" : "#e5e7eb",
                background: activeView === "tables" ? "#ccfbf1" : "#fff",
                color: activeView === "tables" ? "#134e4a" : "#0f172a",
                borderRadius: 12,
                padding: "12px 14px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              Masalar & Ödemeler
            </button>

            <button
              onClick={() => setActiveView("reports")}
              style={{
                textAlign: "left",
                border: "1px solid",
                borderColor: activeView === "reports" ? "#0f766e" : "#e5e7eb",
                background: activeView === "reports" ? "#ccfbf1" : "#fff",
                color: activeView === "reports" ? "#134e4a" : "#0f172a",
                borderRadius: 12,
                padding: "12px 14px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.95rem",
              }}
            >
              Finansal Raporlar
            </button>
          </nav>

          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={handleRefresh}
              style={{
                border: "1px solid #d1d5db",
                background: "#fff",
                color: "#111827",
                borderRadius: 12,
                padding: "10px 14px",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: "0.9rem",
              }}
            >
              Yenile
            </button>

            <button
              onClick={handleSignOut}
              style={{
                border: "1px solid #fecaca",
                background: "#fff1f2",
                color: "#b91c1c",
                borderRadius: 12,
                padding: "10px 14px",
                cursor: "pointer",
                fontWeight: 700,
                fontSize: "0.9rem",
              }}
            >
              Sign out
            </button>
          </div>
        </aside>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div style={{ flex: 1, display: "flex", minWidth: 0 }}>
          {/* ── Center area ───────────────────────────────────────────────── */}
          <main style={{ flex: 1, padding: 20, overflowY: "auto" }}>
            {/* Page header */}
            <div
              style={{
                marginBottom: 18,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 16,
              }}
            >
              <div>
                <h1
                  style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#111827" }}
                >
                  {activeView === "tables" ? "Masalar & Ödemeler" : "Finansal Raporlar"}
                </h1>
                <div style={{ marginTop: 6, fontSize: "0.9rem", color: "#6b7280" }}>
                  {activeView === "tables"
                    ? tableFilter === "waiting"
                      ? `${displayedTables.length} masa, ${orders.length} bekleyen sipariş`
                      : `${displayedTables.length} masa (${groupedTables.length} bekleyen)`
                    : `${filteredPaidOrders.length} / ${paidOrders.length} ödenmiş sipariş (${REPORT_RANGE_LABELS[reportRange].toLowerCase()})`}
                </div>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div
                style={{
                  background: "#fef2f2",
                  border: "1px solid #fca5a5",
                  borderRadius: 12,
                  padding: "14px 16px",
                  color: "#991b1b",
                  marginBottom: 16,
                  fontSize: "0.92rem",
                }}
              >
                {error}
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div
                style={{ textAlign: "center", color: "#6b7280", padding: "56px 0", fontSize: "0.95rem" }}
              >
                Veriler yükleniyor...
              </div>
            )}

            {/* Tables view */}
            {!loading && activeView === "tables" && (
              <>
                {/* Filter toggle + search bar */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 16,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Filter toggle */}
                  <div
                    style={{
                      display: "flex",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {(["waiting", "all"] as TableFilter[]).map((f) => (
                      <button
                        key={f}
                        onClick={() => setTableFilter(f)}
                        style={{
                          padding: "7px 14px",
                          border: "none",
                          background: tableFilter === f ? "#0f766e" : "#fff",
                          color: tableFilter === f ? "#fff" : "#374151",
                          fontWeight: 600,
                          fontSize: "0.84rem",
                          cursor: "pointer",
                        }}
                      >
                        {f === "waiting" ? "Ödeme Bekleyen" : "Tüm Masalar"}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <input
                    type="text"
                    placeholder="Masa ara..."
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: 140,
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      padding: "7px 12px",
                      fontSize: "0.9rem",
                      outline: "none",
                      background: "#fff",
                    }}
                  />
                </div>

                {displayedTables.length === 0 ? (
                  <div
                    style={{
                      background: "#fff",
                      border: "1px solid #e5e7eb",
                      borderRadius: 16,
                      padding: "48px 24px",
                      textAlign: "center",
                      color: "#6b7280",
                    }}
                  >
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#374151" }}>
                      {tableFilter === "waiting" ? "Bekleyen ödeme yok" : "Masa bulunamadı"}
                    </div>
                    <div style={{ marginTop: 6, fontSize: "0.92rem" }}>
                      {tableFilter === "waiting"
                        ? "Mutfaktan tamamlanan siparişler burada görünecektir."
                        : "Arama kriterini değiştirmeyi deneyin."}
                    </div>
                  </div>
                ) : (() => {
                  const waitingEntries = displayedTables.filter((e) => e.kind === "waiting");
                  const idleEntries = displayedTables.filter((e) => e.kind === "idle");

                  const gridStyle: React.CSSProperties = {
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: 16,
                  };

                  const renderWaitingCard = (entry: Extract<DisplayTable, { kind: "waiting" }>) => {
                    const { group } = entry;
                    const isSelected = selectedTableId === group.tableId;
                    const isOld = elapsedMs(group.oldestCreatedAt, now) > WARN_MS;

                    return (
                      <button
                        key={group.tableId}
                        onClick={() => setSelectedTableId(group.tableId)}
                        style={{
                          textAlign: "left",
                          border: `2px solid ${isOld ? "#ef4444" : isSelected ? "#0f766e" : "#0d9488"}`,
                          background: isOld ? "#fff" : isSelected ? "#f0fdf9" : "#f0fdf9",
                          borderRadius: 16,
                          padding: 16,
                          cursor: "pointer",
                          boxShadow: isOld
                            ? "0 4px 20px rgba(239,68,68,.14)"
                            : "0 4px 20px rgba(13,148,136,.12)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                            gap: 12,
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: "2rem",
                                fontWeight: 800,
                                lineHeight: 1,
                                color: isOld ? "#991b1b" : "#0f172a",
                              }}
                            >
                              {group.tableName}
                            </div>
                            <div style={{ marginTop: 8, fontSize: "0.82rem", color: "#6b7280" }}>
                              {group.orderCount} sipariş
                            </div>
                          </div>

                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                            <div
                              style={{
                                fontSize: "0.85rem",
                                fontWeight: 700,
                                color: isOld ? "#991b1b" : "#0f766e",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {formatElapsed(group.oldestCreatedAt, now)}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{
                            marginTop: 16,
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 12,
                          }}
                        >
                          <div style={{ border: "1px solid #99f6e4", borderRadius: 12, padding: 12, background: "#fff" }}>
                            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: 4 }}>
                              Ürün adedi
                            </div>
                            <div style={{ fontWeight: 800, fontSize: "1rem" }}>{group.totalItems}</div>
                          </div>

                          <div style={{ border: "1px solid #99f6e4", borderRadius: 12, padding: 12, background: "#fff" }}>
                            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: 4 }}>
                              Toplam tutar
                            </div>
                            <div style={{ fontWeight: 800, fontSize: "1rem" }}>
                              {formatCurrency(group.totalAmount)}
                            </div>
                          </div>
                        </div>

                        <div
                          style={{ marginTop: 14, fontSize: "0.84rem", fontWeight: 700, color: "#0f766e" }}
                        >
                          Detayı görüntüle →
                        </div>
                      </button>
                    );
                  };

                  const renderIdleCard = (entry: Extract<DisplayTable, { kind: "idle" }>) => (
                    <div
                      key={entry.tableId}
                      style={{
                        textAlign: "left",
                        border: "1px dashed #e2e8f0",
                        background: "#fafafa",
                        borderRadius: 16,
                        padding: "14px 16px",
                        opacity: 0.5,
                      }}
                    >
                      <div style={{ fontSize: "1.6rem", fontWeight: 800, lineHeight: 1, color: "#cbd5e1" }}>
                        {entry.tableName}
                      </div>
                      <div style={{ marginTop: 8, fontSize: "0.8rem", color: "#94a3b8" }}>
                        Bekleyen sipariş yok
                      </div>
                    </div>
                  );

                  if (tableFilter === "waiting") {
                    return (
                      <div style={gridStyle}>
                        {waitingEntries.map((e) => renderWaitingCard(e as Extract<DisplayTable, { kind: "waiting" }>))}
                      </div>
                    );
                  }

                  return (
                    <>
                      {waitingEntries.length > 0 && (
                        <>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "#0f766e",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              marginBottom: 12,
                            }}
                          >
                            Ödeme Bekleyen Masalar ({waitingEntries.length})
                          </div>
                          <div style={{ ...gridStyle, marginBottom: idleEntries.length > 0 ? 28 : 0 }}>
                            {waitingEntries.map((e) => renderWaitingCard(e as Extract<DisplayTable, { kind: "waiting" }>))}
                          </div>
                        </>
                      )}
                      {idleEntries.length > 0 && (
                        <>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "#94a3b8",
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                              marginBottom: 12,
                            }}
                          >
                            Diğer Masalar ({idleEntries.length})
                          </div>
                          <div style={gridStyle}>
                            {idleEntries.map((e) => renderIdleCard(e as Extract<DisplayTable, { kind: "idle" }>))}
                          </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </>
            )}

            {/* Reports view
              TODO(payment-reports): this entire section currently reads from
              `paidOrders` (closed orders). Once `payments` / `payment_items`
              data is available, migrate each sub-section as noted inline. */}
            {!loading && activeView === "reports" && (
              <>
                {/* ── Range filter + export toolbar ── */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 18,
                    flexWrap: "wrap",
                  }}
                >
                  {/* Range tabs */}
                  <div
                    style={{
                      display: "flex",
                      border: "1px solid #e5e7eb",
                      borderRadius: 10,
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    {(Object.keys(REPORT_RANGE_LABELS) as ReportRange[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => setReportRange(r)}
                        style={{
                          padding: "7px 14px",
                          border: "none",
                          background: reportRange === r ? "#0f766e" : "#fff",
                          color: reportRange === r ? "#fff" : "#374151",
                          fontWeight: 600,
                          fontSize: "0.84rem",
                          cursor: "pointer",
                        }}
                      >
                        {REPORT_RANGE_LABELS[r]}
                      </button>
                    ))}
                  </div>

                  {/* Spacer */}
                  <div style={{ flex: 1 }} />

                  {/* Export buttons */}
                  <button
                    onClick={() => exportReportPDF(filteredPaidOrders, reportRange)}
                    disabled={filteredPaidOrders.length === 0}
                    style={{
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      color: "#374151",
                      borderRadius: 10,
                      padding: "7px 14px",
                      cursor: filteredPaidOrders.length === 0 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.84rem",
                      opacity: filteredPaidOrders.length === 0 ? 0.5 : 1,
                    }}
                  >
                    PDF İndir
                  </button>
                  <button
                    onClick={() => exportReportCSV(filteredPaidOrders, reportRange)}
                    disabled={filteredPaidOrders.length === 0}
                    style={{
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      color: "#374151",
                      borderRadius: 10,
                      padding: "7px 14px",
                      cursor: filteredPaidOrders.length === 0 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.84rem",
                      opacity: filteredPaidOrders.length === 0 ? 0.5 : 1,
                    }}
                  >
                    Excel İndir
                  </button>
                </div>

                {/* ── Summary cards ── */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: 14,
                    marginBottom: 18,
                  }}
                >
                  <div
                    style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}
                  >
                    <div style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: 6 }}>
                      Toplam ciro
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                      {formatCurrency(reportSummary.totalRevenue)}
                    </div>
                  </div>

                  <div
                    style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}
                  >
                    <div style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: 6 }}>
                      Ödenmiş sipariş
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                      {reportSummary.totalOrders}
                    </div>
                  </div>

                  <div
                    style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 16 }}
                  >
                    <div style={{ fontSize: "0.82rem", color: "#6b7280", marginBottom: 6 }}>
                      Ortalama fiş
                    </div>
                    <div style={{ fontSize: "1.2rem", fontWeight: 800 }}>
                      {formatCurrency(reportSummary.averageTicket)}
                    </div>
                  </div>
                </div>

                {/* ── Orders table ── */}
                <div
                  style={{
                    background: "#fff",
                    border: "1px solid #e5e7eb",
                    borderRadius: 16,
                    overflow: "hidden",
                  }}
                >
                  {reportsLoading ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
                      Raporlar yükleniyor...
                    </div>
                  ) : filteredPaidOrders.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#6b7280" }}>
                      {paidOrders.length === 0
                        ? "Henüz ödenmiş sipariş bulunmuyor."
                        : `${REPORT_RANGE_LABELS[reportRange]} döneminde kayıt bulunamadı.`}
                    </div>
                  ) : (
                    <div style={{ overflowX: "auto" }}>
                      <table
                        style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.92rem" }}
                      >
                        <thead>
                          <tr style={{ background: "#f8fafc", color: "#334155" }}>
                            <th style={{ textAlign: "left", padding: 14, borderBottom: "1px solid #e5e7eb" }}>
                              Masa
                            </th>
                            <th style={{ textAlign: "left", padding: 14, borderBottom: "1px solid #e5e7eb" }}>
                              Ürün adedi
                            </th>
                            <th style={{ textAlign: "left", padding: 14, borderBottom: "1px solid #e5e7eb" }}>
                              Açılış
                            </th>
                            <th style={{ textAlign: "left", padding: 14, borderBottom: "1px solid #e5e7eb" }}>
                              Ödeme
                            </th>
                            <th style={{ textAlign: "right", padding: 14, borderBottom: "1px solid #e5e7eb" }}>
                              Tutar
                            </th>
                          </tr>
                        </thead>
                        {/* TODO(payment-reports): replace filteredPaidOrders.map with
                          payments.map — each row should represent one payment
                          transaction. Columns to remap:
                            table name   → payment.table_id → tables.name (join)
                            item count   → SUM(payment_items.quantity_paid)
                            opened at    → the order's created_at (or drop column)
                            paid at      → payment.created_at
                            amount       → payment.amount  */}
                        <tbody>
                          {filteredPaidOrders.map((order) => (
                            <tr key={order.id}>
                              <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9", fontWeight: 700 }}>
                                {getTableName(order.tables)}
                              </td>
                              <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                                {getOrderItemCount(order)}
                              </td>
                              <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                                {formatDateTime(order.created_at)}
                              </td>
                              <td style={{ padding: 14, borderBottom: "1px solid #f1f5f9" }}>
                                {formatDateTime(order.closed_at)}
                              </td>
                              <td
                                style={{
                                  padding: 14,
                                  borderBottom: "1px solid #f1f5f9",
                                  textAlign: "right",
                                  fontWeight: 800,
                                }}
                              >
                                {formatCurrency(getOrderTotal(order))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </main>

          {/* ── Detail panel (item-based payment) ───────────────────────────── */}
          {activeView === "tables" && selectedTable && (
            <aside
              style={{
                width: 460,
                borderLeft: "1px solid #e5e7eb",
                background: "#ffffff",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              {/* Panel header */}
              <div style={{ padding: 18, borderBottom: "1px solid #e5e7eb" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div>
                    <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#111827" }}>
                      Masa {selectedTable.tableName}
                    </div>
                    <div style={{ marginTop: 6, fontSize: "0.88rem", color: "#6b7280" }}>
                      {selectedTable.orderCount} bekleyen sipariş
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedTableId(null)}
                    style={{
                      border: "1px solid #e5e7eb",
                      background: "#fff",
                      borderRadius: 10,
                      padding: "8px 10px",
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Kapat
                  </button>
                </div>

                {/* Summary stats */}
                <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: 4 }}>
                      Ürün adedi
                    </div>
                    <div style={{ fontWeight: 800 }}>{selectedTable.totalItems}</div>
                  </div>

                  <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
                    <div style={{ fontSize: "0.78rem", color: "#6b7280", marginBottom: 4 }}>
                      Toplam tutar
                    </div>
                    <div style={{ fontWeight: 800 }}>
                      {formatCurrency(selectedTable.totalAmount)}
                    </div>
                  </div>
                </div>

                {/* Selection action bar */}
                <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
                  <button
                    onClick={handleSelectAllForTable}
                    disabled={paidQtyLoading}
                    style={{
                      flex: 1,
                      border: "1px solid #d1d5db",
                      background: "#f8fafc",
                      color: "#111827",
                      borderRadius: 10,
                      padding: "9px 10px",
                      cursor: paidQtyLoading ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.84rem",
                      opacity: paidQtyLoading ? 0.6 : 1,
                    }}
                  >
                    Tümünü Seç
                  </button>
                  <button
                    onClick={handleClearSelection}
                    disabled={selectionSummary.itemCount === 0}
                    style={{
                      flex: 1,
                      border: "1px solid #d1d5db",
                      background: "#fff",
                      color: "#374151",
                      borderRadius: 10,
                      padding: "9px 10px",
                      cursor: selectionSummary.itemCount === 0 ? "not-allowed" : "pointer",
                      fontWeight: 600,
                      fontSize: "0.84rem",
                      opacity: selectionSummary.itemCount === 0 ? 0.5 : 1,
                    }}
                  >
                    Seçimi Temizle
                  </button>
                </div>
              </div>

              {/* Scrollable items list */}
              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {paidQtyLoading ? (
                  <div
                    style={{ textAlign: "center", color: "#6b7280", padding: "32px 0", fontSize: "0.9rem" }}
                  >
                    Ödeme bilgileri yükleniyor...
                  </div>
                ) : (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {selectedTable.orders.flatMap((order) =>
                      order.order_items.map((item) => {
                        const itemId = Number(item.id);
                        const paidQty = paidQtyMap[itemId] ?? 0;
                        const remaining = Math.max(0, item.quantity - paidQty);
                        const currentQty = selection[itemId]?.qty ?? 0;
                        const isFullyPaid = remaining === 0;

                        return (
                          <li
                            key={item.id}
                            style={{
                              padding: "11px 0",
                              borderBottom: "1px solid #f1f5f9",
                              opacity: isFullyPaid ? 0.55 : 1,
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                gap: 10,
                              }}
                            >
                              {/* Left: product info */}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    color: "#111827",
                                    fontSize: "0.92rem",
                                    whiteSpace: "nowrap",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {getProductName(item.products)}
                                </div>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: 8,
                                    marginTop: 4,
                                    fontSize: "0.76rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span style={{ color: "#6b7280" }}>
                                    {item.quantity} sipariş
                                  </span>
                                  <span style={{ color: "#10b981" }}>{paidQty} ödendi</span>
                                  <span style={{ color: remaining > 0 ? "#f59e0b" : "#6b7280" }}>
                                    {remaining} kalan
                                  </span>
                                  <span style={{ color: "#6b7280" }}>
                                    {formatCurrency(item.unit_price)} / adet
                                  </span>
                                </div>
                              </div>

                              {/* Right: qty controls or paid badge */}
                              {isFullyPaid ? (
                                <div
                                  style={{
                                    fontSize: "0.76rem",
                                    fontWeight: 700,
                                    color: "#10b981",
                                    background: "#d1fae5",
                                    borderRadius: 8,
                                    padding: "4px 10px",
                                    whiteSpace: "nowrap",
                                    flexShrink: 0,
                                  }}
                                >
                                  Ödendi
                                </div>
                              ) : (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 5,
                                    flexShrink: 0,
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      decrementItem(itemId, item.quantity, item.unit_price, order.id)
                                    }
                                    disabled={currentQty === 0}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      border: "1px solid #d1d5db",
                                      background: "#fff",
                                      borderRadius: 6,
                                      cursor: currentQty === 0 ? "not-allowed" : "pointer",
                                      fontWeight: 800,
                                      fontSize: "1rem",
                                      lineHeight: 1,
                                      opacity: currentQty === 0 ? 0.35 : 1,
                                    }}
                                  >
                                    −
                                  </button>

                                  <input
                                    type="number"
                                    min={0}
                                    max={remaining}
                                    value={currentQty}
                                    onChange={(e) =>
                                      updateItemQty(
                                        itemId,
                                        parseInt(e.target.value, 10) || 0,
                                        item.quantity,
                                        item.unit_price,
                                        order.id
                                      )
                                    }
                                    style={{
                                      width: 36,
                                      textAlign: "center",
                                      fontWeight: 700,
                                      fontSize: "0.92rem",
                                      color: currentQty > 0 ? "#0f766e" : "#9ca3af",
                                      border: "1px solid #d1d5db",
                                      borderRadius: 6,
                                      padding: "2px 4px",
                                      MozAppearance: "textfield",
                                    }}
                                  />

                                  <button
                                    onClick={() =>
                                      incrementItem(itemId, item.quantity, item.unit_price, order.id)
                                    }
                                    disabled={currentQty >= remaining}
                                    style={{
                                      width: 28,
                                      height: 28,
                                      border: "1px solid #d1d5db",
                                      background: "#fff",
                                      borderRadius: 6,
                                      cursor: currentQty >= remaining ? "not-allowed" : "pointer",
                                      fontWeight: 800,
                                      fontSize: "1rem",
                                      lineHeight: 1,
                                      opacity: currentQty >= remaining ? 0.35 : 1,
                                    }}
                                  >
                                    +
                                  </button>

                                  <button
                                    onClick={() =>
                                      selectFullItem(itemId, item.quantity, item.unit_price, order.id)
                                    }
                                    disabled={paidQtyLoading}
                                    style={{
                                      border: "1px solid #d1d5db",
                                      background: "#f8fafc",
                                      color: "#374151",
                                      borderRadius: 6,
                                      padding: "4px 8px",
                                      cursor: paidQtyLoading ? "not-allowed" : "pointer",
                                      fontWeight: 600,
                                      fontSize: "0.74rem",
                                      whiteSpace: "nowrap",
                                      opacity: paidQtyLoading ? 0.45 : 1,
                                    }}
                                  >
                                    Tümü
                                  </button>
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })
                    )}
                  </ul>
                )}

                {/* Payment summary + settle button */}
                <div
                  style={{ padding: 18, borderTop: "1px solid #e5e7eb", background: "#f8fafc" }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr 1fr",
                      gap: 10,
                      marginBottom: 14,
                    }}
                  >
                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: 10,
                      }}
                    >
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: 3 }}>
                        Seçili ürün
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                        {selectionSummary.itemCount}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: 10,
                      }}
                    >
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: 3 }}>
                        Seçili adet
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                        {selectionSummary.totalQty}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#fff",
                        border: "1px solid #e5e7eb",
                        borderRadius: 10,
                        padding: 10,
                      }}
                    >
                      <div style={{ fontSize: "0.72rem", color: "#6b7280", marginBottom: 3 }}>
                        Toplam
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "0.95rem" }}>
                        {formatCurrency(selectionSummary.totalAmount)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    {showRemoveConfirm && (
                      <div
                        style={{
                          marginBottom: 10,
                          border: "1px solid #fecaca",
                          background: "#fff1f2",
                          borderRadius: 10,
                          padding: "10px 12px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.82rem",
                            fontWeight: 700,
                            color: "#991b1b",
                            marginBottom: 6,
                          }}
                        >
                          Seçili {selectionSummary.totalQty} adet ürün silinsin mi?
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <button
                            type="button"
                            onClick={() => setShowRemoveConfirm(false)}
                            style={{
                              flex: 1,
                              padding: "9px 10px",
                              border: "1px solid #d1d5db",
                              background: "#fff",
                              color: "#374151",
                              borderRadius: 8,
                              fontWeight: 700,
                              cursor: "pointer",
                              fontSize: "0.82rem",
                            }}
                          >
                            Vazgeç
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              await handleRemoveSelection();
                              setShowRemoveConfirm(false);
                            }}
                            disabled={isRemoving}
                            style={{
                              flex: 1,
                              padding: "9px 10px",
                              border: "none",
                              background: isRemoving ? "#fca5a5" : "#dc2626",
                              color: "#fff",
                              borderRadius: 8,
                              fontWeight: 800,
                              cursor: isRemoving ? "not-allowed" : "pointer",
                              fontSize: "0.82rem",
                            }}
                          >
                            {isRemoving ? "Siliniyor..." : "Evet, Sil"}
                          </button>
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => setShowRemoveConfirm(true)}
                      disabled={isRemoving || selectionSummary.itemCount === 0}
                      style={{
                        width: "100%",
                        padding: "14px",
                        background:
                          isRemoving || selectionSummary.itemCount === 0 ? "#d1d5db" : "#dc2626",
                        color: "#fff",
                        border: "none",
                        borderRadius: 12,
                        fontSize: "0.95rem",
                        fontWeight: 800,
                        cursor:
                          isRemoving || selectionSummary.itemCount === 0 ? "not-allowed" : "pointer",
                      }}
                    >
                      {isRemoving
                        ? "Siliniyor..."
                        : selectionSummary.itemCount === 0
                          ? "Ürün Seçin"
                          : `Seçiliyi Sil`}
                    </button>

                    <button
                      onClick={handleSettle}
                      disabled={isSettling || selectionSummary.itemCount === 0 || isRemoving}
                      style={{
                        width: "100%",
                        padding: "12px",
                        background:
                          isSettling || selectionSummary.itemCount === 0 || isRemoving
                            ? "#d1d5db"
                            : "#0f766e",
                        color: "#fff",
                        border: "none",
                        borderRadius: 12,
                        fontSize: "0.88rem",
                        fontWeight: 800,
                        cursor:
                          isSettling || selectionSummary.itemCount === 0 || isRemoving
                            ? "not-allowed"
                            : "pointer",
                      }}
                    >
                      {isSettling
                        ? "İşleniyor..."
                        : selectionSummary.itemCount === 0
                          ? "Ürün Seçin"
                          : `Ödemeyi Tamamla — ${formatCurrency(selectionSummary.totalAmount)}`}
                    </button>
                  </div>
                </div>
              </div>
            </aside>
          )}
        </div>
      </div>
    </>
  );
}