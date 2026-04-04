/** Client-side cart representation. Prices here are display-only;
 *  the server fetches authoritative prices from the DB on order creation. */
export interface CartItem {
  product_id: string;
  name: string;
  /** Display price only — never sent to the server for billing. */
  display_price: number;
  image_url: string;
  quantity: number;
}
