"use client";

import { useCart } from "./CartContext";

export type WaiterTab = "home" | "cart";

interface Props {
  activeTab: WaiterTab;
  onTabChange: (tab: WaiterTab) => void;
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={active ? "#d4a847" : "rgba(255,255,255,0.45)"}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function CartIcon({ active }: { active: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={active ? "#d4a847" : "rgba(255,255,255,0.45)"}
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

export default function WaiterBottomNav({ activeTab, onTabChange }: Props) {
  const { totalItems } = useCart();

  return (
    <nav style={styles.nav} aria-label="Bottom navigation">
      <button
        style={styles.tab}
        onClick={() => onTabChange("home")}
        aria-current={activeTab === "home" ? "page" : undefined}
      >
        <HomeIcon active={activeTab === "home"} />
        <span style={{ ...styles.label, color: activeTab === "home" ? "#d4a847" : "rgba(255,255,255,0.45)" }}>
          Home
        </span>
      </button>

      <button
        style={styles.tab}
        onClick={() => onTabChange("cart")}
        aria-current={activeTab === "cart" ? "page" : undefined}
      >
        <div style={{ position: "relative", display: "inline-flex" }}>
          <CartIcon active={activeTab === "cart"} />
          {totalItems > 0 && (
            <span style={styles.badge}>{totalItems > 99 ? "99+" : totalItems}</span>
          )}
        </div>
        <span style={{ ...styles.label, color: activeTab === "cart" ? "#d4a847" : "rgba(255,255,255,0.45)" }}>
          My Cart
        </span>
      </button>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    flexShrink: 0,
    display: "flex",
    background: "#111",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    height: 56,
  },
  tab: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
  },
  label: {
    fontSize: "0.68rem",
    fontWeight: 500,
    letterSpacing: "0.02em",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -7,
    background: "#d4a847",
    color: "#1a1a1a",
    fontSize: "0.6rem",
    fontWeight: 700,
    borderRadius: 10,
    padding: "1px 4px",
    lineHeight: 1.4,
    minWidth: 14,
    textAlign: "center",
  },
};
