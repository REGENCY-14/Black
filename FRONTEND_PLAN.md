# Frontend Build Plan: China-to-Ghana Preorder Store

> Source material lives in `/reference` (SRS, client decisions, three design images). Read all of it before coding. Priority when sources conflict: `client-decisions.docx` > SRS > this plan's defaults. Never edit `/reference`.
>
> Stack note: the repo uses **Tailwind CSS v4** (CSS-first). Tokens live in `src/styles/tokens.css` and are mapped to utilities in `src/app/globals.css`. See `CLAUDE.md` for the utility names.

## 1. What we are building

A mobile-first storefront and admin area for a **single-vendor preorder store** selling goods sourced from China to customers in Ghana. Customers arrive from TikTok on mid-range phones over mobile data. They browse, preorder, pay a deposit (or in full), pay the balance later, and track the order. The owner (in China, on a phone) posts products and moves orders through statuses. A Ghana-side staff member has a limited login.

**Scope:** the entire frontend, including the admin UI, running against a **mock API layer** so the real backend can be plugged in later without touching components.
**Not in scope:** backend, database, gateway integration code, WhatsApp/SMS sending. We build the UI and typed contracts for them.

## 2. Decisions that shape the UI (client-decisions.docx)

| Topic | Decision | Frontend implication |
|---|---|---|
| Deposit | Customer can pay **70%** as deposit | `config.deposit.percent = 70`. Checkout offers "Pay 70% now" or "Pay in full" with exact cedi amounts. |
| Balance due | Balance paid **2 weeks before the container arrives in Ghana** | `dueDaysBeforeArrival = 14`. Show due date (batch arrival minus 14 days) at checkout, confirmation, tracking, complete-payment. |
| Statuses | Add **Delayed** (short note) and **Cancelled / Refunded** | 8 status values (section 7). Calm, distinct states. |
| Delivery | Fee and arrangement are **between customer and courier/rider** | No delivery fee line. Note: "Delivery is arranged directly with the rider after your goods arrive." |
| Pickup, GhanaPost GPS | Not answered | Flags: `features.pickup = false`, `features.ghanaPostGps = true` (optional field). |
| Ghana staff | Own login, **limited access** | `owner` sees everything; `ghana_staff` views orders, confirms payments, updates status only. |
| Branding | Client wants us to design logo and colours; name not in the documents | `config/brand.ts` placeholder `STORE_NAME`; swappable SVG wordmark. |
| Contact | +233 59 886 3540, +86 190 5725 6153, email later | `config.contact`; email hidden when empty; WhatsApp `https://wa.me/233598863540`. |
| Trust | Link TikTok and WhatsApp, real delivered-order photos | Home "Delivered orders" section; links in header/footer/contact. **No TikTok embeds on product pages.** |
| Notifications | WhatsApp primary, SMS fallback | UI only: "You'll get updates on WhatsApp at +233…". |

Defaults where undecided (all configurable): price includes shipping and duty (Q1-A); price locks when deposit paid (Q2-A); processing fee absorbed (Q6-A); unpaid balance cancelled after 14 days, deposit kept (Q5-A, placeholder policy); cancellation with full refund before "Shipped from China" (Q8-A); items arriving at different times become separate orders, cart warns (Q10-A); per-product and per-variant preorder limit with "N spots left" (Q13-A); all products preorder in v1 with `availability: "preorder" | "in_stock"` in the type (Q19); "Popular" = most ordered (Q20).

## 3. Design system

References: `1.jpeg` (hero/product card), `2.jpeg` (bento widgets), `3.jpeg` (design-system sheet).

- **Image 1:** very large outer radius with a **nested inner radius** on media (inner = outer − padding); white card on barely-off-white page; soft wide low-contrast shadow; faint ring; media on top, text below; two-tone sentence (muted grey words, near-black heavier key words) used for home hero headline and product card names only; deep teal photography.
- **Image 2:** bento grid of soft white tiles; avatar stacks with "+N"; segmented tabs (pill container, white active segment); compact date tile; list rows with avatar, title, subtitle, round "+"; black pill floating action; emoji pill bar. Home = bento on desktop, single column on mobile. "Next container arrives" = date tile; "People who preordered" = avatar stack; order status summary = list rows; floating WhatsApp = black pill; quantity stepper = pill; category and My orders/Track switchers = segmented tabs.
- **Image 3:** named colour tokens (primitive → semantic), accent blue ≈ `#2372F5`, 1440 desktop and 375 mobile widths, type scale S/M/XL/XXL, avatar stack tooltip, light/dark tokens, settings panel and list/table patterns for admin.

**Tokens:** `src/styles/tokens.css` (implemented in Phase 0). Typography: Inter via `next/font`, weights 400/500/600, `-0.02em` heading tracking, body line-height 1.5, headings 1.1–1.2, line length < 70ch, no all-caps eyebrow labels. Brand mark: one-colour SVG wordmark plus square app icon in `/public/brand/`; PWA icons 192, 512, maskable 512.

### Buttons
- Radius `--radius-btn` (16px) on every button; pills only for chips, segmented tabs, tooltip pills, steppers.
- Heights: lg 56, md 48, sm 40; minimum touch target 44×44 at every size.
- Primary CTAs full width on mobile (`w-full md:w-auto`).
- Variants: primary (ink), accent (blue, pay actions), secondary (white + border), ghost, destructive, whatsapp.
- States: hover (only inside `@media (hover:hover)`), pressed (scale .98 + darker), focus-visible ring (2px offset), disabled, loading (spinner replaces label, no width jump).
- Icon-only buttons ≥ 44×44 with `aria-label`.
- Sticky bottom action bar on mobile for product ("Preorder") and checkout ("Pay GH₵ …"), padded with `env(safe-area-inset-bottom)`.

### Scaling and responsiveness
- Mobile-first, base 375, desktop reference 1440. Breakpoints sm 640, md 768, lg 1024, xl 1280, 2xl 1440. Container max 1280 with `--page-gutter`.
- Grid: 4 columns mobile, 8 tablet, 12 desktop.
- `rem`, `clamp()`, `%`, grid/flex. No fixed-pixel containers. No horizontal scroll from 320 up. Tables become stacked cards on mobile or scroll in their own container.
- `dvh`/`svh` not `vh`. Respect safe-area insets.
- Inputs ≥ 16px with correct `inputmode`/`autocomplete`.
- Images: `next/image`, explicit `sizes`, fixed aspect ratios (product 4:5, hero 16:10), blur placeholders, AVIF/WebP, no layout shift.
- Cards never rely on fixed height; survive long names and 200% text zoom.
- Respect `prefers-reduced-motion`. Motion small and meaningful only.

## 4. Tech stack
Next.js App Router, React, TypeScript strict · **Tailwind CSS** mapped to CSS variables, `clsx` + `tailwind-merge`, `class-variance-authority` · Radix UI primitives wrapped in our own components · lucide-react · react-hook-form + zod · TanStack Query · Zustand cart (persisted, versioned, safe hydration) · next-themes · Serwist (or `@ducanh2912/next-pwa`) for PWA · Vitest + Testing Library, Playwright, axe, optional Storybook · ESLint, Prettier, `tsc --noEmit`.

## 5. Architecture

```
src/
  app/
    (store)/ page, shop, shop/[slug], cart, checkout, checkout/success, track, pay, about, contact, policies/[slug], account
    admin/  layout (auth+role guard), login, dashboard, products(+new,[id]), categories, orders(+[id]), batches(+[id]), staff
    manifest.ts sitemap.ts robots.ts not-found.tsx error.tsx
  components/ ui/ store/ admin/ layout/
  config/    brand.ts contact.ts business-rules.ts features.ts
  lib/       api/ (types.ts, client.ts, mock/*, http/*)  money.ts dates.ts phone.ts status.ts
  hooks/ stores/ styles/ types/
public/brand/ public/icons/ e2e/ content/policies/
```

**API layer:** every endpoint typed in `lib/api/types.ts`, implemented in `mock/` (in-memory, realistic seed, artificial latency, occasional failures) and `http/` (`NEXT_PUBLIC_API_URL`). `NEXT_PUBLIC_USE_MOCKS=true` selects mocks. Components never call `fetch`; they use hooks. `PaymentAdapter` interface: `startPayment(orderId, amount, method) -> {status, reference}`; mock simulates MoMo approval wait, card success, failure. Seed: ~24 products over 5 categories, 3 batches with different arrival dates, ~15 orders in every status.

**Rendering:** Home, shop, product static with revalidation; Server Components by default. Track, pay, account, admin client-driven, no-store. Budget: LCP < 2.5s, CLS < 0.1 on Slow 4G mid-range phone; home first-load JS ≲ 150 KB gzipped.

## 6. Screens and behaviour
Each screen works at 360px first. Every list has loading (skeleton), empty and error states.

**Storefront**
1. **Home:** hero card (image 1 style, deep teal, two-tone headline, CTA "Browse preorders"); bento grid: Next container arrives (date tile), Preorders open now (strip), How it works (3 steps), Delivered orders gallery, Order updates on WhatsApp, social links. Trust: price includes shipping and duty, real delivered photos, track any order.
2. **Shop:** search, category segmented tabs (scrollable on mobile), sort (Newest, Price, Most ordered), mobile filter sheet; grid 2/3/4 columns; load more.
3. **Product:** gallery (swipe / thumbnails), name, GH₵ price, preorder badge with expected delivery window, "Price includes shipping from China and duty", spots left, variant pickers, quantity stepper, deposit preview ("Pay GH₵ X now, GH₵ Y by {date}"), description, sticky mobile "Preorder" bar, WhatsApp "Ask about this item". No TikTok video.
4. **Cart:** lines grouped by arrival window with split-order note; edit quantity, remove, itemised subtotal.
5. **Checkout:** single page, stepped on mobile: (a) name, phone, optional email, delivery area/address, optional GhanaPost GPS (flag), optional pickup (flag); (b) plan: Pay 70% now or in full, with balance due date; (c) method: MTN MoMo, Telecel Cash, AirtelTigo Money, Card; (d) itemised summary, "Price is locked once your deposit is paid", delivery note, terms checkbox. Guest default.
6. **Payment states:** waiting for phone approval (timeout, retry), success, failed (reason, retry), pending. Never a blank screen.
7. **Confirmation:** large order number (copy, share to WhatsApp), amount paid, balance and due date, what happens next, track link.
8. **Track:** order number + phone/email; status path with dates; Delayed note; Cancelled/Refunded state; balance banner with "Pay balance"; "Request cancellation" only before Shipped from China; remember last order in `localStorage`.
9. **/pay:** order number, balance and due date, same payment flow; deep link `?order=`.
10. **Account (medium):** register/sign in, order history, saved addresses (low).
11. **About, Contact, Policies:** both phone numbers, WhatsApp, TikTok, email only if configured; policies rendered from `/content/policies/*.md`, clearly marked "Draft".

**Admin (private, noindex, mobile-friendly)**
12. Login (role from session: `owner` | `ghana_staff`).
13. Dashboard: orders awaiting action, balances outstanding, next batch arrival.
14. Add/edit product (owner): stepped thumb-friendly flow: photos (camera/gallery, multi-upload, reorder, client compression) → name, description, price → category, variants → limit and preorder window → review → Publish. Draft, hide, delete with confirmation.
15. Categories (owner): create, rename, reorder.
16. Orders (owner + staff): list with status and paid amount; filter by status, outstanding balance, batch; search by order number or phone; cards on mobile, table on desktop. Detail: items, customer, payments, history. "Advance to next status", menu for Delayed (note required) and Cancelled/Refunded. Staff cannot see product editing, pricing, categories or staff pages.
17. Batches (owner; staff read/advance): advance whole batch with confirmation sheet showing customers notified.
18. Staff (owner): add/disable Ghana-side login.

## 7. Order status model

```ts
type OrderStatus =
  | "confirmed" | "sourcing" | "shipped_from_china" | "arrived_in_ghana"
  | "out_for_delivery" | "delivered"
  | "delayed"     // overlay: keeps the underlying step, adds a note
  | "cancelled";  // includes refunded; show refund state in detail
```
Six progress steps form the timeline. Delayed keeps position and adds an amber banner with note and date. Cancelled replaces the timeline with a neutral summary and refund status. Label, icon, colour and "what this means" text live in `lib/status.ts`. Every history entry shows date/time in `Africa/Accra`.

## 8. Money, dates and phone
- Money: integer pesewas; `Intl.NumberFormat("en-GH", {style:"currency", currency:"GHS"})` shown as "GH₵"; no floating-point totals.
- Deposit = `round(total * 0.70)` from config; balance = total − deposit; show both before payment.
- Balance due = `batch.expectedArrival − 14 days`. If already passed at order time, require full payment.
- Phone: accept `0XXXXXXXXX` and `+233XXXXXXXXX`, normalise to `+233…`, detect network prefix to preselect MoMo provider (editable).
- Order number format is owned by the backend; tracking input is forgiving (trim, uppercase, ignore spaces).

## 9. Accessibility, SEO, quality
WCAG AA on light and dark; keyboard navigable; visible focus; landmarks; labelled inputs; errors via `aria-live`; status never by colour alone. Page metadata, OG images, `Product` JSON-LD (`priceCurrency: "GHS"`), sitemap, robots (admin disallowed). Error boundaries per route group; friendly 404. Plain-English sentence-case copy, active voice. Offline: cached shell, "You're offline" notice, tracking shows last known status.

## 10. Phases (commit after each)
- **Phase 0 Foundations:** project, strict TS, Tailwind wired to tokens, fonts, lint/format, folders, config, CLAUDE.md, theme provider. *Done when* `/_design` renders the tokens.
- **Phase 1 Design system components:** Button, Input/Select/PhoneInput, Card (standard + large with nested radius), Badge, SegmentedControl/Tabs, Stepper, AvatarStack, Tooltip/FloatingPill, Sheet, Toast, Skeleton. *Done when* each renders correctly at 360/768/1440, light and dark, with keyboard focus.
- **Phase 2 Layout and API layer:** Header, mobile nav, footer, floating WhatsApp pill, container/grid; typed API contracts, mocks, seed; money/date/phone utilities with unit tests. *Done when* utilities pass tests and mock data is queryable via hooks.
- **Phase 3 Browse:** Home, Shop, Product. *Done when* a user reaches "Preorder" in under four taps on a phone.
- **Phase 4 Cart, checkout, payment:** cart store, split grouping, checkout, payment adapter + mock states, confirmation. *Done when* a guest completes a mock preorder with correct deposit, balance, due date.
- **Phase 5 Tracking and balance:** Track, timeline with Delayed/Cancelled, `/pay`, cancellation rule. *Done when* every status renders and balance is payable from Track and `/pay`.
- **Phase 6 Admin:** login + role guard, dashboard, product flow, categories, orders, status advance, batches, staff. *Done when* `ghana_staff` cannot reach or see owner-only screens (e2e).
- **Phase 7 Content and trust:** About, Contact, policies, delivered gallery, social links, logo and PWA icons. *Done when* placeholders are marked and swappable from `config/`.
- **Phase 8 Polish:** PWA install, offline shell, SEO, a11y audit, performance pass, Playwright at 360/390/768/1024/1440.

## 11. Definition of done (every screen)
- [ ] No horizontal scroll 320–1920px.
- [ ] Buttons use `--radius-btn`, ≥ 44px hit area, all five states.
- [ ] No hardcoded colours, radii, spacing or font sizes outside token files.
- [ ] Loading, empty, error states.
- [ ] Light and dark both work.
- [ ] Inputs ≥ 16px with correct `inputmode`.
- [ ] Money formatted as GH₵ from integer pesewas.
- [ ] Axe: no serious/critical issues.
- [ ] Lighthouse mobile meets section 5 budgets on public pages.
- [ ] Matches reference images in spirit: large soft-radius white cards, quiet shadows, sparing two-tone type, bento tiles, black pill accents.

## 12. Open items to confirm with the client (do not block)
1. Business name (not in the documents; `STORE_NAME` placeholder).
2. Logo and colour approval.
3. Email address.
4. Pickup option; whether GhanaPost GPS is required.
5. Defaults applied to unanswered questions: Q1, Q2, Q5, Q6, Q8, Q9, Q10, Q13, Q18.
6. Confirm "2 weeks before container arrival" reading of the balance rule.
7. Whether tracking verifies by order number + phone or + email (UI supports both).
