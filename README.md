# China-to-Ghana preorder store (frontend)

A mobile-first storefront and admin area for a single-vendor preorder store. Customers in Ghana browse, preorder, pay a deposit (or in full), pay the balance later and track the order. The owner posts products and moves orders along; a Ghana-side staff member has a limited login.

This repository is the **whole frontend**. It runs against a built-in mock API, so you can use every screen with no backend. The typed contract for the real backend is in [`docs/BACKEND_CONTRACT.md`](docs/BACKEND_CONTRACT.md).

Built with Next.js (App Router, Cache Components), React 19, TypeScript (strict) and Tailwind CSS v4.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Production build and tests:

```bash
npm run build
npm start            # http://localhost:3000
npm run typecheck    # tsc --noEmit
npm run lint
npm test             # unit tests (Vitest)
npm run e2e          # end-to-end tests (Playwright, needs `npm run build` first)
```

Copy `.env.example` to `.env.local` to change settings. Nothing in it is secret.

## Try it

| What               | How                                                                               |
| ------------------ | --------------------------------------------------------------------------------- |
| Place an order     | Open the shop, choose a product, tap Preorder, check out. Pick MTN MoMo or card   |
| Track an order     | `/track`: order `ORD-DEMO01`, phone `024 123 4567`                                |
| Pay a balance      | `/pay?order=ORD-DEMO01`                                                           |
| Admin, owner       | `/admin`: `owner@example.com` / `owner123`                                        |
| Admin, Ghana staff | `/admin`: `staff@example.com` / `staff123` (sees only Dashboard, Orders, Batches) |

Mock payments, so every state can be seen: card succeeds at once. MoMo approves after about 4 seconds. A wallet number ending `00` is declined and one ending `99` never approves (the timeout screen). `NEXT_PUBLIC_MOCK_FAILURES=true` makes requests fail at random to show error states. Mock data lives in the browser's localStorage (`mock-db-v2`); clear it to reset.

## Where things are

```
src/
  app/                 routes. (store)/ is the storefront, admin/ the private area
  components/
    ui/                design system: Button, Card, Field, Select, Sheet, Toast ...
    store/             product, cart, checkout, tracking, payment components
    admin/             admin screens
    layout/            header, footer, offline notice, install prompt, error and 404 states
  config/              EDIT THESE: brand, contact, business rules, features, About copy, delivered photos
  lib/
    api/               types.ts (the contract), mock/, http/, client.ts
    money.ts dates.ts phone.ts status.ts checkout.ts   pure logic, all unit tested
  hooks/ stores/       data hooks (TanStack Query) and the cart (Zustand)
  styles/tokens.css    design tokens (colour, radius, spacing, type, dark theme)
content/policies/      Terms, Refunds and Privacy as markdown (all marked Draft)
public/                icons, brand files, placeholder images, service worker
e2e/                   Playwright tests
docs/                  backend contract
```

## Changing things

- **Business name, phones, email, TikTok link:** `src/config/brand.ts` and `contact.ts`. The name is Deen Imports and Logistics (from the supplied logo); the TikTok URL is still a placeholder.
- **Deposit %, balance due days, cancellation rules:** `src/config/business-rules.ts`. Nothing else hardcodes them, including the policy pages.
- **Pickup and GhanaPost GPS:** feature flags in `src/config/features.ts`.
- **Colours, radius, type:** `src/styles/tokens.css` only. Components use semantic Tailwind utilities (`bg-card`, `text-fg`, `rounded-btn`) and never raw values.
- **Logo and icons:** edit `public/brand/logo.svg`, then `node scripts/gen-icons.mjs` to rebuild the PNG icons.
- **Policy wording:** `content/policies/*.md`. Change `status: draft` to `final` once approved to remove the banner and allow indexing.
- **Delivered-order photos:** put files in `public/delivered` and list them in `src/config/trust.ts`.

## Going live

1. Build the backend to [`docs/BACKEND_CONTRACT.md`](docs/BACKEND_CONTRACT.md).
2. Set `NEXT_PUBLIC_USE_MOCKS=false`, `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_SITE_URL`.
3. Replace the admin photo data URLs with uploads to cloud storage.
4. Confirm the open items below, replace placeholders, and set the policies to `final`.
5. Add HSTS and a Content-Security-Policy at your host. The app already sends `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy`.

## Quality bar

- **Tests:** unit tests for money, dates, phone, status, checkout, the mock API rules (including who may call what) and the policy loader. Playwright covers every screen: purchase and payment states, tracking, balance payment, admin and roles, offline, install prompt, SEO.
- **Responsive:** every screen is swept at 360, 390, 768, 1024 and 1440 px for horizontal scroll, off-screen content, tap targets under 44 px and input text under 16 px.
- **Accessibility:** axe runs on every screen in light and dark with no serious or critical issues.
- **Performance** (production build, Slow 4G, 4x slower CPU): LCP under 2.5 s and CLS under 0.1 on home, shop, product, checkout and track. Home first-load JavaScript is checked against a 155 KB gzipped budget (React and Next alone are about 135 KB).
- **Offline:** a service worker keeps pages you have opened and shows an offline page for new ones. Tracking shows the last saved status. The admin area is never cached.

## Open items for the client

These do not block the build; each has a default behind config.

1. **Business name** (not in the documents; `STORE_NAME` placeholder) and approval of the proposed logo and colours.
2. **Email address** for the Contact page (hidden until set).
3. **Pickup** option and whether GhanaPost GPS should be required (currently optional).
4. **Unconfirmed policy defaults:** price composition, price locking, unpaid-balance rule, processing fee, cancellation and damaged-item policy, split orders, preorder limits, and all policy wording. Every undecided point is marked "To confirm with the owner" in `content/policies`.
5. **Balance timing:** the notes say "2 weeks to container arrival"; this is built as 14 days before arrival.
6. **Tracking verification:** the UI accepts order number plus phone or email.
7. **Ghana staff permissions:** staff can update status, delay, record payments and advance batches. Cancelling and refunding is owner-only (it involves money). Tell us if staff should cancel too.
8. **Customer accounts** (sign in, order history, saved addresses) are medium priority in the SRS and are not built yet.
