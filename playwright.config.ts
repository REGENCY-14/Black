import { defineConfig } from "@playwright/test";

/**
 * Tests run against the PRODUCTION build (`npm run build` first), because the service worker,
 * caching and performance budgets only behave like the real site there.
 *
 * The port is configurable (E2E_PORT) so tests never collide with a `next dev` you have open on 3000.
 * An already-running server is only reused when you opt in with E2E_REUSE=1; by default a busy port
 * is an error, so a stray dev server can never be tested by accident.
 *
 * Two projects: "main" is everything, run in parallel. "perf" measures Core Web Vitals under CPU and
 * network throttling, so it waits for "main" to finish and then runs alone, one test at a time.
 * Otherwise other tests would steal CPU and the numbers would be noise.
 */
const port = Number(process.env.E2E_PORT ?? 3000);

export default defineConfig({
  testDir: "./e2e",
  webServer: {
    command: `npm run start -- -p ${port}`,
    url: `http://localhost:${port}`,
    reuseExistingServer: process.env.E2E_REUSE === "1",
    timeout: 120_000,
  },
  use: { baseURL: `http://localhost:${port}` },
  projects: [
    { name: "main", testIgnore: /perf\.spec\.ts/ },
    { name: "perf", testMatch: /perf\.spec\.ts/, dependencies: ["main"], fullyParallel: false },
  ],
});
