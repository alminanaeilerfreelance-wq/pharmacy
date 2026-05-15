# PharmaPOS — Pharmacy POS & Inventory Management System

A full-stack starter implementing the spec end-to-end: point-of-sale, inventory with batch tracking, prescriptions, suppliers & purchase orders, customers with loyalty, multi-branch operations, and reporting.

> **Persistence note:** This build uses an **in-memory** store (resets on every backend restart). It's designed to demo the entire workflow without a database. Swap `StoreService` for a real DB (Postgres, MongoDB, etc.) when you're ready.

---

## Stack

- **Backend** — NestJS 10, JWT auth, in-memory singleton store, REST API on port 4000
- **Frontend** — Next.js 14 (app router), Tailwind CSS, recharts, lucide-react, on port 3000

---

## Quick start

You'll need Node 18+ and npm.

```bash
# Backend (terminal 1)
cd backend
npm install
npm run start:dev
# → http://localhost:4000/api

# Frontend (terminal 2)
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

Open http://localhost:3000 and sign in with one of the demo accounts below.

---

## Demo accounts

All passwords are `password123`.

| Username     | Role       | What they can do                                         |
|--------------|------------|----------------------------------------------------------|
| `admin`      | Admin      | Everything, including user management                    |
| `pharmacist` | Pharmacist | Verify/reject prescriptions, override Rx requirements    |
| `cashier`    | Cashier    | Operate the POS, refund sales                            |
| `inventory`  | Inventory  | Manage stock, transfers, GRN, adjustments                |
| `manager`    | Manager    | View reports, manage suppliers, branches, users          |

---

## Seed data

The store is pre-loaded with realistic demo data so screens feel populated:

- **3 branches** (Main, North, Central Warehouse)
- **8 medicines** spanning analgesics, antibiotics, diabetes, controlled substances, vitamins
- **11 batches** with varying expiry dates — including one near-expiry, one **already expired** (for the alerts demo) and multiple batches per medicine (to demo FEFO)
- **4 customers** with loyalty points + insurance
- **3 suppliers** with outstanding balances
- **2 prescriptions** (one verified, one pending)

---

## Feature map

| Module          | Where to look                                            | Key behaviors                                              |
|-----------------|----------------------------------------------------------|------------------------------------------------------------|
| **Authentication**  | `/login`                                              | JWT, role-based guards, sessionStorage on the client       |
| **Dashboard**       | `/`                                                   | KPIs, 14-day revenue chart, top sellers, alert counts      |
| **POS**             | `/pos`                                                | Barcode scan, multi-batch FEFO, prescription enforcement, pharmacist override (logged), insurance split, loyalty points, receipt screen |
| **Inventory**       | `/inventory`                                          | Tabs: All / Low stock / Expiring / Expired. Per-medicine batch drawer; add medicine; add batch |
| **Prescriptions**   | `/prescriptions`                                      | Verify, reject, drug-interaction warnings (toy data: Tramadol ⇄ cough syrup), dispense flag |
| **Suppliers**       | `/suppliers`                                          | List + outstanding balances, create new                    |
| **Purchases**       | `/purchases`                                          | Create PO, receive (auto-creates batches & charges supplier), reorder suggestions panel |
| **Customers**       | `/customers`                                          | Loyalty pts, insurance, sales & Rx history                 |
| **Reports**         | `/reports`                                            | Best/slow sellers, sales by day, valuation, profit margins, supplier performance |
| **Branches**        | `/branches`                                           | Multi-store + warehouse, per-branch stock value            |

---

## API surface

All endpoints are prefixed with `/api`. All except `POST /api/auth/login` require a Bearer JWT.

### Auth
- `POST /auth/login` — `{ username, password }` → `{ token, user }`

### Medicines & batches
- `GET /medicines?search=&category=&lowStock=true`
- `GET /medicines/:id`
- `GET /medicines/barcode/:bc`
- `GET /medicines/expiring?days=60`
- `GET /medicines/expired`
- `POST /medicines`, `PUT /medicines/:id`, `DELETE /medicines/:id`
- `POST /medicines/:id/batches`

### Sales (POS)
- `POST /sales` — checkout (FEFO consumption + Rx enforcement)
- `GET /sales`, `GET /sales/:id`
- `POST /sales/:id/refund`

### Prescriptions
- `GET /prescriptions?status=pending|verified|dispensed|rejected`
- `GET /prescriptions/:id` — includes drug-interaction warnings
- `POST /prescriptions`, `PUT /prescriptions/:id`
- `POST /prescriptions/:id/verify`, `POST /prescriptions/:id/reject`

### Purchases
- `GET /purchases`, `GET /purchases/:id`
- `GET /purchases/reorder-suggestions`
- `POST /purchases` — create PO
- `POST /purchases/:id/receive` — GRN (creates batches, charges supplier)
- `PUT /purchases/:id/cancel`
- `POST /purchases/suppliers/:id/pay` — record supplier payment

### Inventory
- `GET /inventory/logs?branchId=&type=&medicineId=&limit=`
- `GET /inventory/alerts` — low stock + expiring + expired
- `POST /inventory/adjust` — `{ batchId, quantityChange, reason }`
- `POST /inventory/transfer` — `{ batchId, toBranchId, quantity }`
- `POST /inventory/write-off-expired` — zeroes out expired batches with logs

### Reports
- `GET /reports/dashboard`
- `GET /reports/best-sellers?days=30`
- `GET /reports/slow-movers?days=30`
- `GET /reports/sales-by-day?days=30`
- `GET /reports/inventory-valuation`
- `GET /reports/profit-margins?days=30`
- `GET /reports/supplier-performance`

### Customers, Suppliers, Branches, Users
- Standard CRUD on `/customers`, `/suppliers`, `/branches`, `/users` (users requires `admin` or `manager` role)

---

## Architecture notes

**Single source of truth** — `backend/src/store/store.service.ts` holds all entity arrays in a `@Global()` Nest module. Every module injects this singleton, so cross-resource consistency (e.g. a sale decrementing stock and bumping loyalty + dispensing a prescription) is straightforward.

**FEFO consumption** — `StoreService.consumeStock(medicineId, qty, branchId)` selects active batches sorted by ascending expiry, decrements them in order, and rolls back on shortage. The POS expands this into multiple `SaleItem` rows so refunds know exactly which batch to credit back.

**Authorization** — `JwtAuthGuard` is registered as `APP_GUARD`, so every endpoint is protected by default. Use `@Public()` for opt-out (login) and `@Roles('admin', 'manager')` for fine-grained gates.

**Drug interactions** — toy implementation in `prescriptions.module.ts` (`INTERACTIONS` map). Replace with a real drug-interaction database (e.g. RxNorm + DrugBank) for production.

---

## Going to production

This starter is intentionally lean. Before deploying you'll want:

1. **Real persistence** — replace `StoreService` with TypeORM/Prisma + Postgres. The interfaces in `store/types.ts` map cleanly to entities.
2. **Migrations & seeding** — port `seed.ts` to a one-off seed command.
3. **Real password storage & user provisioning flow** — current bcrypt setup is fine; add password reset, MFA.
4. **Audit logging** — `inventory_logs` already exists; extend the same pattern to sales and Rx changes for full traceability.
5. **Drug interaction service** — integrate a licensed clinical DB.
6. **Tax compliance** — Saudi VAT (15%) is baked in; verify against ZATCA requirements (e-invoicing / Fatoora) for KSA deployment.
7. **Tests** — none included yet; add unit tests for `StoreService.consumeStock` and the POS checkout flow first.

---

## Project layout

```
pharmacy-system/
├── backend/
│   ├── package.json
│   ├── tsconfig.json
│   ├── nest-cli.json
│   └── src/
│       ├── main.ts
│       ├── app.module.ts
│       ├── store/         # in-memory singleton + types + seed
│       ├── auth/          # JWT login + global guard
│       └── modules/       # feature modules (one per resource)
│           ├── medicines/
│           ├── suppliers/
│           ├── customers/
│           ├── prescriptions/
│           ├── sales/
│           ├── purchases/
│           ├── inventory/
│           ├── reports/
│           ├── branches/
│           └── users/
└── frontend/
    ├── package.json
    ├── next.config.js
    ├── tailwind.config.js
    ├── components/Sidebar.tsx
    ├── lib/api.ts
    └── app/
        ├── layout.tsx
        ├── page.tsx        # Dashboard
        ├── login/
        ├── pos/
        ├── inventory/
        ├── prescriptions/
        ├── suppliers/
        ├── purchases/
        ├── customers/
        ├── reports/
        └── branches/
```

---

## Things to try after first run

1. **POS** → scan barcode `6281234500011` (Paracetamol) — notice it's added from the soonest-expiring batch first.
2. **POS** → try to sell `Amoxicillin` without a prescription → blocked. Pick the verified prescription `rx1` for Abdullah Al-Rashid → goes through, and the Rx is marked `dispensed`.
3. **Inventory → Expired tab** → see the `Hydrocortisone Cream` batch that's already expired.
4. **Purchases → New PO** → create an order, then click it and "Receive" → new batch appears in inventory and the supplier's outstanding balance grows.
5. **Reports → Inventory** → check valuation and potential profit per SKU.
