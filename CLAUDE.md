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
