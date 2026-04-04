# Tart Cafe QR Menu & Ordering System – Technical Architecture Documentation
## 1. Project Description
This project aims to expand the digital menu system accessed via QR code to encompass full restaurant operations.
### Currently
- Users access the menu via QR code
- Categories and products are displayed
- Management is handled through the admin panel
### Goal
- Order taking
- Kitchen / bar / cashier workflow
- Real-time operation management
## 2. Architectural Approach
### 2.1 General Architecture
- Monolithic backend (Supabase + API)
- React / Next.js frontend
- Role-based UI separation
- Domain-driven data model
### 2.2 Core Principle
- Order = transaction package
- Order item (`order_item`) = operational unit
- State management = at the `order_item` level
## 3. Data Model
### 3.1 Tables
```sql
-- users
id, name, username, password_hash, role, is_active, created_at, updated_at, last_login_at
-- tables
id, table_name, sort_order, is_active, created_at, updated_at
-- Note: 'status' is not stored; it is derived from open orders.
-- categories
id, name, description, is_active, created_at, updated_at
-- products
id, name, category_id, base_price, target_department, is_active, created_at, updated_at
-- target_department: kitchen | bar | cashier
-- orders
id, table_id, waiter_id, order_no, status, note, created_at, updated_at, closed_at
-- order_items (CRITICAL)
id, order_id, product_id, quantity, unit_price, line_total, status, note,
prepared_by, served_by, created_at, updated_at, cancelled_at, cancelled_by
-- payments
id, table_id, amount, payment_method, received_by, note, created_at
-- payment_orders
id, payment_id, order_id
-- audit_logs (optional)
id, user_id, action_type, entity_type, entity_id, old_value, new_value, created_at
````
## 4. Relationships
* `users → orders`
* `tables → orders`
* `categories → products`
* `orders → order_items`
* `products → order_items`
* `payments → orders`
## 5. State Management
### 5.1 `order_items.status`
* `pending`
* `preparing`
* `ready`
* `served`
* `paid`
* `cancelled`
### 5.2 `orders.status`
Derived by the backend:
* `open`
* `in_progress`
* `partially_completed`
* `completed`
* `paid`
* `cancelled`
## 6. Backend Workflow
### 6.1 Order Creation
**Endpoint**
```http
POST /waiter/orders
```
**Request**

```json
{
  "table_id": 5,
  "items": [
    { "product_id": 12, "quantity": 2 },
    { "product_id": 5, "quantity": 1 }
  ]
}
```
**Backend Steps**
1. Validate table
2. Check products
3. Fetch prices from the database
4. Create order
5. Create `order_items`
6. Commit transaction
---
## 7. Frontend Structure
### 7.1 File Structure
```text
/app
  /menu
  /admin
/components
  /menu
    CategoryGrid.tsx
    CategoryChips.tsx
    ProductCard.tsx
    MenuHeader.tsx
  /ui
/lib
  queries.ts
  supabaseClient.ts
/public
  logo.png
/types
  product.ts
  category.ts
```
---
## 8. Sample Code
### 8.1 Order Creation (Frontend)
```javascript
const createOrder = async (cart) => {
  await fetch("/api/orders", {
    method: "POST",
    body: JSON.stringify(cart),
  });
};
```
### 8.2 Backend (Pseudo-code)
```javascript
await db.transaction(async (trx) => {
  const order = await trx.insert("orders", { ... });
  for (const item of items) {
    const product = await trx.get("products", item.product_id);
    await trx.insert("order_items", {
      order_id: order.id,
      unit_price: product.base_price,
      line_total: product.base_price * item.quantity
    });
  }
});
```
---
## 9. UI/UX Architecture
### 9.1 Flow
* Category grid
* Product list
* Category transition via swipe
**Header**
* Left: back
* Center: logo + text
* Right: feedback
### 9.2 Animations
* Framer Motion
* Swipe detection
* Card stagger animation

## 10. Animation Example
```jsx
<motion.div
  key={categoryId}
  initial={{ x: 100, opacity: 0 }}
  animate={{ x: 0, opacity: 1 }}
  exit={{ x: -100, opacity: 0 }}
>
  {/* content */}
</motion.div>
```
---
## 11. Role-Based System

| Role          | Authority / Access |
| ------------- | ------------------ |
| `super_admin` | Entire system      |
| `waiter`      | Ordering           |
| `kitchen`     | Preparation        |
| `bar`         | Beverages          |
| `cashier`     | Payment            |

---
## 12. Development Steps
```bash
npm install
npm run dev
```
## 13. Environment Variables
**`.env.local`**
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```
## 14. Error Scenarios
### 14.1 RLS Error
**Error**
```text
new row violates row-level security
```
**Solution**
* Add policy
* Grant insert permission
### 14.2 Bucket Not Found
**Error**
```text
Bucket not found
```
**Solution**
* Go to Supabase Storage
* Create the bucket
* Use the correct bucket name
### 14.3 Image Not Showing
**Error**
```text
Image not showing
```
**Solution**
* Place the image inside `/public`
* Use the correct path
## 15. Security
* `password_hash` is mandatory
* Frontend does not send prices
* Prices are fetched in the backend
* Transactions are used for data integrity
* Soft delete is applied
## 16. Performance
### Index Recommendations
* `orders.table_id`
* `orders.status`
* `order_items.order_id`
* `order_items.status`
* `products.category_id`
## 17. System Flow
1. Admin setup
2. Waiter creates an order
3. Kitchen/bar processes the order
4. Waiter serves
5. Cashier takes the payment
6. Table becomes available
## 18. Conclusion
This architecture forms the foundation of a complete restaurant system covering the pipeline:
**Menu → Order → Operations → Payment**
### Most Critical Decision
An architecture centered around the `order_items` table.
Without this structure, the system cannot scale properly.
