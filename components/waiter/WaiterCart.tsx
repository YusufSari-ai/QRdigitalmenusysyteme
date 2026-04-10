"use client";

import { useEffect, useState } from "react";
import { useCart } from "./CartContext";
import { getTables, placeOrder } from "@/lib/queries";
import type { RestaurantTable } from "@/types/table";

export default function WaiterCart() {
  const { items, totalItems, clearCart } = useCart();
  const cartItems = Object.values(items);

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [tableId, setTableId] = useState("");
  const [note, setNote] = useState("");
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getTables().then(({ data }) => {
      if (data) setTables(data);
    });
  }, []);

  const handlePlaceOrder = async () => {
    if (!tableId) { setError("Lütfen masa seçin."); return; }
    if (cartItems.length === 0) { setError("Sepet boş."); return; }

    setPlacing(true);
    setError(null);

    const { error: orderError } = await placeOrder(tableId, null, cartItems, note.trim() || null);

    setPlacing(false);
    if (orderError) {
      setError(orderError.message);
    } else {
      setSuccess(true);
      clearCart();
      setNote("");
    }
  };

  if (success) {
    return (
      <div style={styles.centered}>
        <div style={styles.successIcon}>✓</div>
        <div style={styles.successText}>Sipariş mutfağa gönderildi!</div>
        <button
          style={styles.newOrderBtn}
          onClick={() => setSuccess(false)}
        >
          Yeni Şipariş
        </button>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      <div style={styles.header}>Sepetim</div>

      {totalItems === 0 ? (
        <div style={styles.empty}>Henüz ürün eklenmedi.</div>
      ) : (
        <>
          {/* Table selector */}
          <div style={styles.section}>
            <label style={styles.label} htmlFor="table-select">Masa</label>
            <select
              id="table-select"
              value={tableId}
              onChange={(e) => setTableId(e.target.value)}
              style={styles.select}
            >
              <option value="">— masa seç —</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Item list */}
          <div style={styles.itemList}>
            {cartItems.map((item) => (
              <div key={item.product_id} style={styles.item}>
                <span style={styles.itemName}>{item.name}</span>
                <span style={styles.itemQty}>×{item.quantity}</span>
              </div>
            ))}
          </div>

          {/* Sipariş Notu */}
          <div style={styles.section}>
            <label style={styles.label} htmlFor="order-note">Not (İsteğe bağlı)</label>
            <textarea
              id="order-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="örn. soğansız, ekstra soslu…"
              rows={3}
              style={styles.textarea}
            />
            <span style={styles.hint}>Visible to kitchen staff</span>
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            style={{ ...styles.placeBtn, opacity: placing ? 0.6 : 1 }}
            onClick={handlePlaceOrder}
            disabled={placing}
          >
            {placing ? "Gönderiliyor…" : "Siparişi Gönder"}
          </button>
        </>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: {
    flex: 1,
    overflowY: "auto",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  header: {
    fontSize: "1.05rem",
    fontWeight: 700,
    color: "#f0ede6",
    paddingBottom: 8,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
  },
  empty: {
    color: "rgba(255,255,255,0.35)",
    fontSize: "0.9rem",
    textAlign: "center",
    marginTop: 48,
  },
  section: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  label: {
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "rgba(255,255,255,0.5)",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  select: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: 8,
    color: "#f0ede6",
    fontSize: "0.9rem",
    padding: "9px 12px",
    outline: "none",
    width: "100%",
  },
  itemList: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 12px",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 8,
  },
  itemName: {
    color: "#f0ede6",
    fontSize: "0.9rem",
  },
  itemQty: {
    color: "#d4a847",
    fontSize: "0.85rem",
    fontWeight: 600,
  },
  error: {
    color: "#f87171",
    fontSize: "0.85rem",
    padding: "8px 12px",
    background: "rgba(248,113,113,0.1)",
    borderRadius: 6,
  },
  hint: {
    fontSize: "0.75rem",
    color: "rgba(255,255,255,0.35)",
    marginTop: 4,
  },
  textarea: {
    background: "rgba(255,255,255,0.07)",
    border: "1px solid rgba(255,255,255,0.13)",
    borderRadius: 8,
    color: "#f0ede6",
    fontSize: "0.9rem",
    padding: "9px 12px",
    outline: "none",
    width: "100%",
    resize: "vertical",
    fontFamily: "inherit",
    lineHeight: 1.5,
  },
  placeBtn: {
    background: "#d4a847",
    color: "#1a1a1a",
    border: "none",
    borderRadius: 10,
    padding: "13px 0",
    fontSize: "0.95rem",
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    marginTop: "auto",
  },
  centered: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  successIcon: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    background: "#16a34a",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.5rem",
    fontWeight: 700,
  },
  successText: {
    color: "#f0ede6",
    fontSize: "1rem",
    fontWeight: 600,
  },
  newOrderBtn: {
    marginTop: 8,
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    color: "#f0ede6",
    borderRadius: 8,
    padding: "8px 20px",
    cursor: "pointer",
    fontSize: "0.88rem",
  },
};
