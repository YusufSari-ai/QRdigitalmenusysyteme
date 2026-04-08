"use client";

import { createContext, useContext, useState, useCallback } from "react";
import type { Product } from "@/types/product";
import type { CartItem } from "@/types/cart";

interface CartContextValue {
  items: Record<string, CartItem>;
  getCount: (productId: string) => number;
  setCount: (product: Product, count: number) => void;
  totalItems: number;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Record<string, CartItem>>({});

  const getCount = useCallback(
    (productId: string) => items[productId]?.quantity ?? 0,
    [items]
  );

  const setCount = useCallback((product: Product, count: number) => {
    setItems((prev) => {
      if (count <= 0) {
        const next = { ...prev };
        delete next[product.id];
        return next;
      }
      return {
        ...prev,
        [product.id]: {
          product_id: product.id,
          name: product.name,
          display_price: product.price,
          image_url: product.image_url,
          quantity: count,
        },
      };
    });
  }, []);

  const clearCart = useCallback(() => setItems({}), []);

  const totalItems = Object.values(items).reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
    <CartContext.Provider value={{ items, getCount, setCount, totalItems, clearCart }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
