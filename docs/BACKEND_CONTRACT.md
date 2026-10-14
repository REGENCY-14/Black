# Backend contract

The frontend talks to the backend only through the typed `Api` interface in `src/lib/api/types.ts`.
Two implementations exist: `src/lib/api/mock` (default) and `src/lib/api/http` (the routes below).
To go live, build these endpoints, set `NEXT_PUBLIC_USE_MOCKS=false` and `NEXT_PUBLIC_API_URL`.
No component needs to change.

Conventions

- JSON in and out. Money is an **integer number of pesewas** (1 GH₵ = 100). Dates are ISO 8601 strings.
- Errors return a non-2xx status and `{ "code": "not_found" | "validation" | "forbidden" | "network" | "unknown", "message": "..." }`.
  `message` is shown to people, so write it in plain English.
- Admin calls send the session cookie (`credentials: "include"`). **Every admin route must authorise by role on the server**; hiding a button is not security.

## Storefront

| Method and path                                       | Purpose                                                                                                                                                                                                  |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /categories`                                     | Categories, ordered by `sortOrder`                                                                                                                                                                       |
| `GET /products?search&categorySlug&sort&cursor&limit` | Published products only. `sort`: `newest`, `price_asc`, `price_desc`, `popular` (most ordered). Returns `{ items, nextCursor, total }`                                                                   |
| `GET /products/:slug`                                 | One published product (404 for draft or hidden)                                                                                                                                                          |
| `GET /batches`                                        | Containers with `expectedArrival` and `status`                                                                                                                                                           |
| `GET /batches/:id`                                    | One container                                                                                                                                                                                            |
| `POST /orders`                                        | Body `CreateOrderInput`. Validates stock and phone. **Splits items by container into one order each**, returns `{ orders, amountDueMinor }`. Rejects a deposit plan when the balance due date has passed |
| `POST /orders/lookup`                                 | Body `{ orderNumber, contact }`. `contact` is the phone (+233) or email. Return the order only if it matches; otherwise the same 404 message whichever part was wrong                                    |
| `POST /orders/cancel-request`                         | Same body. Allowed only before status reaches `shipped_from_china`. Sets `cancelled` and a pending refund                                                                                                |

## Payments (`PaymentAdapter`)

| Method and path            | Purpose                                                                                                                                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /payments`           | Body `StartPaymentInput` (`orderIds`, `amountMinor`, `kind`, `method`, `phone`). Returns `{ reference, status, awaitingApproval }`. The amount must equal what is due for that `kind`; otherwise reject |
| `GET /payments/:reference` | Poll status: `pending`, `success`, `failed` (with `failureReason`)                                                                                                                                      |

A Paystack, Hubtel or Moolre adapter sits behind these two routes. Confirm payments from the gateway **webhook**, not from the browser.
On the first successful payment of an order, set status `confirmed` and write the first history entry. Card numbers and MoMo PINs must never reach or be stored by this system.

## Admin

Roles: `owner` (everything) and `ghana_staff` (dashboard, view orders, record payments, update status, advance batches).

| Method and path                                                                                     | Role      | Purpose                                                                                                          |
| --------------------------------------------------------------------------------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------- |
| `POST /admin/login` `{ email, password }`                                                           | public    | Starts a session. Same message for a wrong email or password. Disabled accounts get `forbidden`                  |
| `POST /admin/logout`, `GET /admin/session`                                                          | any       | End the session; return `{ user: { id, name, email, role } }` or `null`                                          |
| `GET /admin/dashboard`                                                                              | both      | Counts and recent orders                                                                                         |
| `GET /admin/orders?status&balanceOutstanding=1&batchId&search`                                      | both      | Search matches order number, name, phone                                                                         |
| `GET /admin/orders/:id`                                                                             | both      |                                                                                                                  |
| `POST /admin/orders/:id/advance`                                                                    | both      | Next progress step. Refuse when unpaid, delayed, cancelled or delivered                                          |
| `POST /admin/orders/:id/delay` `{ note, delayedUntil? }`                                            | both      | Note required. Keeps the underlying step                                                                         |
| `POST /admin/orders/:id/resume`                                                                     | both      | Clears a delay                                                                                                   |
| `POST /admin/orders/:id/payments` `{ amountMinor, method, note? }`                                  | both      | Manual payment (cash, bank transfer, MoMo). Cannot exceed the balance                                            |
| `POST /admin/orders/:id/cancel` `{ note? }`                                                         | **owner** | Cancels and starts a refund                                                                                      |
| `POST /admin/orders/:id/refunded`                                                                   | **owner** | Marks the refund done                                                                                            |
| `GET /admin/batches`                                                                                | both      | Each batch with order, customer and delayed counts                                                               |
| `POST /admin/batches/:id/advance`                                                                   | both      | Moves every paid, active, non-delayed order one stage and returns `{ batch, updated, skippedDelayed, notified }` |
| `GET/POST /admin/products`, `GET/PUT/DELETE /admin/products/:id`, `POST /admin/products/:id/status` | **owner** | A product with orders cannot be deleted. Publishing needs at least one photo                                     |
| `POST /admin/categories`, `PUT/DELETE /admin/categories/:id`, `POST /admin/categories/:id/move`     | **owner** | Delete is refused while products use the category                                                                |
| `GET/POST /admin/staff`, `POST /admin/staff/:id/active`                                             | **owner** | Creates `ghana_staff` logins only. The owner cannot be disabled                                                  |

Every status change must write a history entry and attempt a notification (WhatsApp first, SMS as the fallback), retrying on failure (SRS NFR-5).

Photos: the frontend currently sends product photos as compressed JPEG data URLs inside the product JSON. Replace this with an upload to cloud storage (store the URLs) before launch.

## Rules the backend must enforce too

These are in `src/config/business-rules.ts` on the frontend. The server is the source of truth.

- Deposit is 70% of each order total, rounded to the nearest pesewa. Balance is due 14 days before the container arrives in Ghana.
- The price is locked once the deposit is paid.
- Unpaid balance: cancelled 14 days after the due date, deposit kept (**draft rule, not yet confirmed by the client**).
- Cancellation with a full refund is allowed only before goods ship from China.
