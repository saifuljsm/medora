# Medora — Build Spec

This is the authoritative build spec for Medora V1 (Pharmacy) + V2 (Ecommerce). It was originally
written as a self-contained initial task prompt (schema, stack, route map, build order) and is kept
here as the source of truth for the implementation in this repo.

---

## 1. What Medora is

A single-branch pharmacy in Kushtia, Bangladesh, run by Md Saiful Islam (ZAZ Technology), going digital in two parts built together:

- **Version 1 — Pharmacy**: real POS, inventory, and purchasing for the physical shop.
- **Version 2 — Ecommerce**: the same inventory sold online, Cash-on-Delivery only.

**Build only V1 + V2.** A Version 3 (doctor consultations, lab tests, health records) exists on paper but is explicitly out of scope — do not create any Doctor, Consultation, LabTest, or SupportInquiry models or routes. If you see references to healthcare services beyond pharmacy/ecommerce anywhere, ignore them.

Single-tenant. `orgId` stays on every operational table as cheap insurance against ever needing multi-tenant isolation, but do not build any multi-tenant logic — there is exactly one `Org` row.

---

## 2. Tech stack — do not substitute any of these

| Layer | Choice |
|---|---|
| Framework | Next.js 14, **App Router**, TypeScript |
| Hosting | Vercel (do not configure Docker/EC2 — that's a future migration, not now) |
| Database | PostgreSQL via **Neon** (managed) |
| ORM | Prisma |
| Search | Meilisearch |
| Background jobs | BullMQ + Upstash Redis |
| File storage | **Cloudflare R2** (S3-compatible API — use the S3 SDK pointed at R2's endpoint, not AWS S3 itself) |
| SMS (OTP only) | bdbulksms.com |
| Payment (V1) | Cash on Delivery only. `PaymentMethod.ONLINE_GATEWAY` exists in the schema for later — do not build a payment gateway integration now |
| Styling | Tailwind CSS + shadcn/ui |
| Forms & validation | React Hook Form + Zod |
| Auth — staff | NextAuth.js, Credentials provider |
| Auth — customer | Custom OTP verification + NextAuth Credentials/Google/Facebook providers |
| PDF generation | `@react-pdf/renderer`, server-side |
| Testing | Vitest (unit) + Playwright (e2e — prioritize checkout and POS sale flows) |
| Error tracking | Sentry — wire up before Phase 2.5 (checkout) goes live |

---

## 3. Design reference

A working HTML prototype of the customer-facing storefront lives at `reference/medora-prototype.html`
(mobile-first, 390px target) — screens: Home, Search, Category listing, Product detail, Cart, Checkout,
Order success, Account/Orders. **Match its visual language exactly** when building the real Next.js storefront:

- Soft blue primary (`#3E6FDB`), mint-green action color (`#1FA98A`), white cards, pale-blue section backgrounds (`#F5F8FC` / `#EEF4FD`).
- 12–16px card radius, 0.5px borders, minimal/no shadows.
- Plus Jakarta Sans (Latin) + Noto Sans Bengali (Bangla toggle), both via Google Fonts.
- Sticky bottom action bars on Product detail and Cart.
- Accordion product-info sections (Overview open by default): Overview, Key benefits, Composition, Dosage, Warnings, Side effects, Storage, Manufacturer, FAQ (4–6 Q&A).
- The exact disclaimer text at the bottom of every product page:
  > "Disclaimer: The information provided is accurate to the best of our knowledge. Product packaging, ingredients, specifications, and availability may change without notice. Please check the product packaging before use and consult the manufacturer, pharmacist, doctor, or other qualified professional if you have any questions or concerns."

Read `reference/medora-prototype.html` before building any storefront screen, and treat its component
structure (product cards, status chips, accordion pattern, bottom nav) as the source of truth for
markup and interaction, rebuilt properly in React/Tailwind rather than copied as raw HTML.

---

## 4. Prisma schema

See `prisma/schema.prisma` — it is the full, decided schema for V1 + V2. Every field reflects a
specific business decision already made — do not simplify, rename, or drop fields, and do not add
anything from Version 3 (no Doctor/Consultation/LabTest/SupportInquiry/HealthRecord).

---

## 5. Route tree — build to this exactly

```
app/
├─ (storefront)/
│  ├─ layout.tsx
│  ├─ page.tsx                          # homepage
│  ├─ [categorySlug]/page.tsx            # category listing (2.3)
│  ├─ medicines/[slug]/page.tsx          # product detail (2.3)
│  ├─ prescription-order/page.tsx        # standalone upload flow (2.11) — no cart required
│  ├─ search/page.tsx
│  ├─ cart/page.tsx                      # (2.4)
│  ├─ checkout/page.tsx                  # (2.5)
│  ├─ orders/[invoiceNumber]/page.tsx    # confirmation + tracking
│  └─ my-account/
│     ├─ layout.tsx                      # slide-in account menu (mobile)
│     ├─ profile/page.tsx
│     ├─ orders/page.tsx
│     ├─ orders/[id]/page.tsx            # includes invoice download
│     ├─ addresses/page.tsx              # Division → District → Upazila
│     └─ coupons/page.tsx
│
├─ (auth)/
│  ├─ @modal/(.)login/page.tsx           # intercepted — renders as overlay, preserves cart/scroll
│  └─ login/page.tsx                     # fallback full-page
│
├─ (admin)/
│  ├─ layout.tsx                         # role-gated shell — can()/assertCan()
│  ├─ dashboard/page.tsx
│  ├─ products/
│  │  ├─ page.tsx                        # list + expiry rollup
│  │  ├─ new/page.tsx
│  │  ├─ [id]/edit/page.tsx              # piece/pack pricing toggle
│  │  ├─ import/page.tsx                 # CSV/Excel bulk import (1.2)
│  │  ├─ categories/page.tsx
│  │  └─ dosage-forms/page.tsx
│  ├─ purchasing/
│  │  ├─ suppliers/page.tsx
│  │  ├─ orders/page.tsx
│  │  ├─ orders/new/page.tsx             # unit = piece or pack per line
│  │  ├─ orders/[id]/receive/page.tsx    # Receiving — pack→base-unit conversion live
│  │  ├─ quick-entry/page.tsx            # Quick Stock Entry — CASHIER can access
│  │  └─ transfers/page.tsx              # StockTransfer, dormant until Branch 2
│  ├─ inventory/
│  │  ├─ adjustments/page.tsx            # StockAdjustment — INVENTORY_MANAGER+ only
│  │  └─ expiry-alerts/page.tsx
│  ├─ pos/page.tsx                       # cashier terminal (1.5, 1.6 gate)
│  ├─ orders/                            # ecom order management, staff side
│  │  ├─ page.tsx
│  │  ├─ [id]/page.tsx                   # status update, packing slip print (COD amount editable, default 0)
│  │  └─ new/page.tsx                    # 2.13 staff-assisted order (WhatsApp/phone)
│  ├─ returns/
│  │  ├─ page.tsx
│  │  └─ new/page.tsx                    # CASHIER-accessible, no prescription split
│  ├─ reconciliation/page.tsx            # daily cash count vs expected
│  ├─ coupons/
│  │  ├─ page.tsx
│  │  └─ new/page.tsx
│  ├─ staff/
│  │  ├─ page.tsx
│  │  ├─ new/page.tsx
│  │  └─ [id]/edit/page.tsx
│  ├─ reports/
│  │  ├─ sales/page.tsx                  # POS vs Ecom split, by invoiceNumber prefix
│  │  └─ purchasing/page.tsx
│  └─ settings/
│     ├─ page.tsx
│     └─ domain/page.tsx                 # 2.10 custom domain
│
└─ api/
   ├─ auth/[...nextauth]/route.ts
   ├─ otp/send/route.ts
   ├─ otp/verify/route.ts
   ├─ upload/presign/route.ts            # R2 presigned URL
   ├─ webhooks/courier/route.ts          # stub only — real integration is post-V1
   └─ cron/
      ├─ expiry-check/route.ts
      └─ meilisearch-sync/route.ts
```

---

## 6. Shared lib/ modules — build these first, everything else depends on them

| Module | Responsibility |
|---|---|
| `lib/prisma.ts` | Singleton Prisma client |
| `lib/auth.ts` | NextAuth config — staff Credentials, customer OTP-backed Credentials + Google/Facebook |
| `lib/permissions.ts` | `can()` / `assertCan()` — the one shared permission-check function every server action calls, implementing the Role table in §7 |
| `lib/stock.ts` | Row-locked `Batch.quantity` increment/decrement — the ONE function used by Sale, StockTransfer, StockAdjustment, and Receiving. Also implements FEFO (first-expiry-first-out) batch selection for POS/checkout. |
| `lib/invoice.ts` | `getNextInvoiceNumber(orgId, channel)` — row-locked `InvoiceCounter` increment, returns `POS-2026-000123` / `ECOM-2026-000045` |
| `lib/pricing.ts` | Piece/pack price resolution and pack → base-unit conversion (`unitsPerPack` math), shared by Receiving, POS, and Checkout |
| `lib/sms.ts` | bdbulksms.com wrapper — `sendOtp()`, rate-limited: max 3 requests/hour per phone, max 5/hour per IP, 60s cooldown between resends, max 5 verification attempts per code, reCAPTCHA on the request-OTP action |
| `lib/r2.ts` | Presigned upload URLs (R2's S3-compatible API) for product images and prescription photos |
| `lib/meilisearch.ts` | Index sync helpers — called only from the background queue, never synchronously in-request |
| `lib/queue.ts` | BullMQ queue definitions |
| `lib/pdf.ts` | Renders the three print documents from one `Sale` record, branching on `channel` and `paymentMethod`: 80mm thermal POS receipt (cash/change, optional Customer line), A4 packing slip (delivery address, staff-entered COD amount, tracking ID, item list with no pricing breakdown), A4 customer invoice (itemized, `invoiceNumber`, no collection instruction) |

---

## 7. Role permission table — implement exactly

| Role | Scope |
|---|---|
| `OWNER` | Unconditional — bypasses every check |
| `ADMIN` | Staff, branches, pricing, catalog, purchasing |
| `PHARMACIST` | Prescription approval, branch-scoped |
| `INVENTORY_MANAGER` | Purchasing, stock, StockAdjustment write-offs, branch-scoped |
| `CASHIER` | POS at own branch; Quick Stock Entry; Returns (all, no prescription split) |

2FA required for `OWNER`/`ADMIN` only. Account lockout after repeated failed logins.

---

## 8. Business rules that MUST be enforced server-side, not just in the UI

1. **Prescription gate**: a `Sale` containing a `SaleItem` whose `Medicine.requiresPrescription` is true cannot reach a completed state until a linked `Prescription` is `APPROVED`. This is a hard check inside the sale-completion server action — never a UI-only nudge.
2. **Stock decrement concurrency**: every place `Batch.quantity` changes (POS sale, online checkout, StockTransfer, StockAdjustment, Receiving) goes through `lib/stock.ts`'s row-locked function. Two simultaneous checkouts must never oversell the same batch.
3. **FEFO**: POS and online checkout auto-select the soonest-expiring `Batch` for a given `Product`, not the first one found.
4. **Base-unit stock**: `Batch.quantity` is always tablets/vials/bottles — never strips or boxes. Piece and pack sales both decrement the same `Batch` correctly via `lib/pricing.ts` conversion.
5. **Invoice numbering**: every `Sale` gets an `invoiceNumber` from `lib/invoice.ts` at creation — channel-prefixed, per-org-per-year sequential, row-locked.
6. **Packing slip COD amount**: staff-entered at the packing-slip generation screen, pre-filled with `Sale.total` but editable, defaulting to 0 if cleared (0 = no collection needed). Written to `PaymentTransaction.amount` — never silently assumed from `Sale.total` at print time.
7. **Returns**: `CASHIER` can process every return directly — no manager approval step, regardless of whether the returned item required a prescription. Each `ReturnItem.restock` decides whether stock goes back to `Batch` or routes to a `StockAdjustment` write-off.
8. **Customer is one table across POS and ecommerce.** Three creation paths write to the same `Customer` model: self-service signup, guest checkout (bare record — name + phone, no password), and staff-initiated at the POS counter or via a staff-assisted order. If someone with an existing passwordless `Customer` row later signs up properly with the same phone number, let them claim it via OTP + password instead of failing the unique-phone constraint or creating a duplicate — they inherit their prior order history.
9. **Order status visibility**: no automated SMS on status change. Customers check status on `my-account/orders/[id]`. SMS stays scoped to OTP only.
10. **Courier is manual for V1**: `Courier.isApiIntegrated` stays `false`. Staff book and track with the courier directly; do not build any courier API integration.

---

## 9. Build order — follow this sequence, do not skip ahead

| Phase | Deliverable |
|---|---|
| 1.1 | Next.js project on Vercel, Prisma schema migrated to Neon, seed script (Org, Branch, bootstrap OWNER). `lib/prisma.ts`, `lib/auth.ts` skeleton. |
| 1.2 | `products/import/page.tsx` — CSV/Excel bulk import matching on barcode, preview before commit, row-level error reporting. Barcodes optional at import time. |
| 1.3 | `lib/auth.ts` Credentials provider for staff, `lib/permissions.ts`, `(admin)/layout.tsx` role gate, forced password change on first login, account lockout. |
| 1.4 | Purchasing: `purchasing/orders/*`, `receivePurchaseOrderItem` with live pack→base-unit conversion, `lib/pricing.ts`, `lib/stock.ts`. `PARTIALLY_RECEIVED` handling for short shipments. |
| 1.5 | `pos/page.tsx`, `createPosSale`, FEFO selection in `lib/stock.ts`. |
| 1.6 | Pharmacist review gate inside `completeSale`. |
| 1.7 | `reports/sales/page.tsx` (POS vs Ecom split by invoice prefix), expiry-alerts queue + page, `CashReconciliation` screen. |
| — | `Quick Stock Entry` (`purchasing/quick-entry/page.tsx`) — CASHIER-accessible, creates a `Batch` with `source: QUICK_ENTRY`, no `PurchaseOrder` required. |
| 2.1 | `products/[id]/edit/page.tsx` — description, images, slug, meta, piece/pack pricing fields. |
| 2.2 | `lib/r2.ts` presigned upload, `api/upload/presign/route.ts`. |
| 2.3 | Storefront home, category listing, product detail — match the HTML prototype exactly. |
| 2.4 | Cart — Redis-backed, not a Postgres table. |
| 2.5 | Checkout → `createOnlineSale`. Wire up Sentry before this ships. |
| 2.6 | `confirmOrderByPhone` — staff action, addresses COD no-show risk. |
| 2.7 | Packing slip generation with editable COD amount, `Delivery` row on dispatch. |
| 2.8 | Coupons — validate + `timesUsed` increment inside the Sale-write transaction. |
| 2.9 | `lib/meilisearch.ts`, sync queue. |
| 2.10 | Custom domain settings. |
| 2.11 | `prescription-order/page.tsx` — standalone upload, `Prescription.saleId` null at creation, no cart dependency. |
| 2.12 | Static `tel:` / `wa.me` links — no server logic. |
| 2.13 | `orders/new/page.tsx` (admin) — staff-assisted order creation for WhatsApp/phone orders, sets `Sale.orderSource`. |
| Cross-cutting | `StockAdjustment`, `Return`/`ReturnItem`, `Product.vatRate` + `Sale.taxAmount`, `CashReconciliation` — can be built in parallel with the phases above once `lib/stock.ts` exists. |

---

## 10. Guardrails

- Do not build anything from Version 3 (Doctor, Consultation, LabTest, HealthRecord, SupportInquiry) — if asked to extend scope there, stop and flag it rather than building it.
- Do not add a payment gateway integration — COD only for V1.
- Do not build a courier API integration — manual for V1.
- Do not deviate from the exact enum values and field names in §4 — other parts of the plan (reporting, invoicing) depend on them matching exactly.
- After each phase: run `tsc --noEmit`, `next build`, and relevant Playwright tests before considering it done. Report back with a diff summary, not just "done."
- Ask before any destructive migration (dropping a column/table) rather than running it autonomously.
