"use client";

/**
 * Last resort: replaces the root layout, so it has no theme, fonts or Tailwind of its own.
 * It follows the OS light/dark setting and keeps to plain, readable styling.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          colorScheme: "light dark",
          lineHeight: 1.5,
        }}
      >
        <main style={{ maxWidth: "32rem" }}>
          <title>Something went wrong</title>
          <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.5rem" }}>Something went wrong on our side</h1>
          <p style={{ margin: "0 0 1.25rem" }}>
            Nothing you entered has been lost. Try again, and if it keeps happening, message us on WhatsApp.
          </p>
          {error.digest && <p style={{ margin: "0 0 1.25rem", opacity: 0.7 }}>Reference: {error.digest}</p>}
          <button
            type="button"
            onClick={() => retry()}
            style={{
              minHeight: "3rem",
              padding: "0 1.5rem",
              borderRadius: "16px",
              border: "none",
              font: "inherit",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
