# Project rules

- Frontend only. Next.js App Router + TypeScript (strict) + Tailwind CSS. No backend code.
- Read /FRONTEND_PLAN.md before any work. Follow the phases in order.
- /reference holds the SRS, the client decisions and the design images. Read it all first and re-check it when in doubt. Never modify it.
- Priority when sources conflict: client-decisions.docx > SRS > FRONTEND_PLAN.md defaults.
- Design source of truth: the images in /reference + section 3 of the plan.
- Never hardcode colours, radii, spacing or font sizes in components. Use tokens (src/styles/tokens.css) via Tailwind utilities mapped in src/app/globals.css (bg-card, text-fg, rounded-btn, text-xl, ...).
- Never hardcode the business name, phone numbers, deposit %, or due-date rules. Use /src/config.
- Mobile-first. Test every screen at 360, 390, 768, 1024, 1440 px before calling it done.
- All money is stored as integer pesewas and formatted as GHS (GH₵).
- Commit after each phase with a clear message.
- This Next.js version has breaking changes: check node_modules/next/dist/docs/ before using unfamiliar APIs.

# Tailwind notes

- Tailwind v4, CSS-first config in globals.css. Default colour palette is removed; only token colours exist.
- text-xs..text-3xl are the fluid token scale. Radius utilities: rounded-btn, rounded-input, rounded-card, rounded-card-lg, rounded-media, rounded-pill. Shadows: shadow-card, shadow-float. Heights: h-control-lg/md/sm. Hit area: min-h-hit / min-w-hit.
- Dark mode: `dark:` variant follows `[data-theme="dark"]`; prefer semantic tokens so most components need no `dark:` at all.
- Merge classes with `cn()` from src/lib/cn.ts.

# Mock API notes

- Mocks are the default (`NEXT_PUBLIC_USE_MOCKS=false` + `NEXT_PUBLIC_API_URL` switches to HTTP). `NEXT_PUBLIC_MOCK_FAILURES=true` injects random errors.
- Demo order for tracking: `ORD-DEMO01` with phone `024 123 4567` or `demo@example.com`. All seeded orders are in `src/lib/api/mock/seed.ts`.
- Mock MoMo: approves after ~4s. Wallet number ending `00` is declined, ending `99` never approves (timeout path). Card succeeds immediately.
- Browser orders persist in localStorage key `mock-db-v1`. Clear it to reset.
- Server pages read data through `src/lib/catalog.ts` (`use cache`); client screens use hooks in `src/hooks/api.ts`.
- With Cache Components, `new Date()`/`Math.random()` in server components must be inside `use cache` or a client component.

# Checkout notes

- Cart lines group by batch (`lib/checkout.ts`): one order per arrival window. Deposit is rounded per order, so "pay now" is the sum of per-order deposits.
- `PaymentFlow` (components/store) drives any payment: starting, waiting for MoMo approval (90s timeout from `businessRules.payment`), processing, failed, success. Reuse it for `/pay` and Track.
- After a failed payment the created orders are reused on retry (no duplicate orders). Orders stay unpaid (no history) until a payment succeeds.
- The confirmation page reads `sessionStorage["last-checkout"]` (`lib/lastCheckout.ts`).
- `Field` clones its single child to add id/aria props, so wrap any non-native control in a component that forwards them (see `AreaSelect`).
- Cache Components: never call `new Date()` as a default parameter on a path that runs during prerender; evaluate it lazily.

# Tracking notes

- Statuses live in `lib/status.ts`; `OrderTimeline` renders the six steps (`data-state` = done/current/upcoming). Delayed keeps `order.step` and adds `DelayedBanner`; Cancelled swaps the timeline for a summary with refund status.
- Track and /pay verify ownership with order number + phone/email (`OrderLookupForm`). Both can pay a balance through `BalancePayment` (which reuses `PaymentFlow`).
- The last tracked order (plus a snapshot for offline) is kept in localStorage `last-tracked-v1`. React Query runs with `networkMode: "always"` so offline failures reach our API layer, which throws a clear network error.
- Cancellation request is offered only while `canRequestCancellation` (before "Shipped from China").
- e2e: `getByRole("alert")` also matches Next's route announcer; scope alerts to a container or use text.

# Admin notes

- Mock logins: owner `owner@example.com` / `owner123`; Ghana staff `staff@example.com` / `staff123`. The login page lists them only while mocks are on. Mock state (orders, products, categories, batches, staff) persists in localStorage `mock-db-v2`; the session is `mock-session`.
- Roles are enforced twice: the menu is built per role and owner-only pages are wrapped in `RoleGate` (no data fetched for staff), AND the API itself refuses (`mock/admin.ts` `requireRole`; the real backend must do the same). Staff: dashboard, orders (advance, delay, record payment), batches. Owner only: cancel/refund, products, categories, staff.
- Admin lives in `src/app/admin/(panel)` (guarded by `AdminShell`); `/admin/login` is outside the guard. All admin pages are noindex.
- Mock limitation: server-rendered storefront pages read the seed, not the browser's localStorage, so a product created in the admin shows in the shop list but its own `/shop/<slug>` page is a not-found until a real backend is connected.
- Toasts render their text twice (visible + Radix live region); in e2e use `getByText(..., { exact: true })`.

# Content and brand notes

- Policies live in `content/policies/*.md` (frontmatter + markdown). Numbers and contact lines are `{{placeholders}}` filled from `/src/config` by `lib/policies.ts`; never type 70% or 14 days into the markdown (a unit test enforces it). Every draft must keep `status: draft` and a "To confirm with the owner" note for each undecided point. Set `status: final` to remove the banner and allow indexing.
- Markdown links go through a strict allowlist (`allowedUrl` in PolicyDocument): web, mailto, tel, in-site, in-page. `javascript:` etc. are dropped.
- About copy is `src/config/about.ts`; delivered-order photos are `src/config/trust.ts` (drop real files in `/public/delivered`). TikTok URL in `config/brand.ts` is a PLACEHOLDER.
- Logo: the cube mark is name-independent (`LogoMark`/`Wordmark`). To change the brand, edit `config/brand.ts`, then `public/brand/logo.svg` text, then run `node scripts/gen-icons.mjs` to regenerate the PNG icons (192, 512, maskable 512, apple-icon). `app/manifest.ts` and `app/icon.svg` are the install/favicon entry points.

# Phase 8 notes (hardening)

- **Tests need a production build** (`npm run build`), and run on their own port so they never touch a `next dev` on 3000: `E2E_PORT=3210 npm run e2e`. A busy port is an error on purpose (`E2E_REUSE=1` to reuse). `npm run e2e` runs the "main" project in parallel; `npm run e2e:perf` runs the throttled Core Web Vitals project alone (median of 3 cold runs), because parallel tests steal the CPU being measured. `npm run e2e:all` runs both.
- **Do not kill all node processes** (`taskkill /IM node.exe`): it can take down the developer's own dev server. Stop servers by port.
- Budgets: LCP < 2.5 s and CLS < 0.1 on Slow 4G + 4x CPU for home, shop, product, checkout, track; home first-load JS <= 155 KB gzipped (React + Next are ~135 KB of that). `<script nomodule>` is not counted.
- Keep the home page's first load small: global `Providers` only has the theme and the service worker. Data fetching (`QueryProvider`) and toasts (`AppProviders`) are provided per page. Rarely used UI loads on demand through `components/layout/Lazy.tsx` (plain `import()`; `next/dynamic` adds its chunks to the first load). Do not import `Button`, `Card`, `Container` or `cn` (tailwind-merge) from always-loaded client code such as the header, footer helpers or error boundaries.
- Error boundaries (`error.tsx`) ship with every page, so `ErrorState` uses plain markup. In this Next version the prop is `retry`, not `reset`.
- Admin links use `prefetch={false}`: the dashboard otherwise fires a dozen route prefetches at once.
- Service worker: `public/sw.js` (bump `VERSION` to clear caches). It never caches `/admin`, non-GET, other origins or RSC requests. It is only registered in production.
- Install prompt: an inline script in the root layout captures `beforeinstallprompt` before React hydrates; `InstallPrompt` reads it, and `InstallCard` loads only when shown.
- Verified-by-test facts: tap targets >= 44px and fields >= 16px on every screen at 360/390/768/1024/1440 (`e2e/responsive.spec.ts`); axe clean in light and dark.
