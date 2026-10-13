import { describe, expect, it } from "vitest";
import { allowedUrl } from "./PolicyDocument";

describe("policy link allowlist", () => {
  it.each([
    "https://wa.me/233598863540",
    "http://example.com",
    "mailto:hello@example.com",
    "tel:+233598863540",
    "/track",
    "#top",
  ])("keeps %s", (url) => {
    expect(allowedUrl(url)).toBe(url);
  });

  it.each([
    "javascript:alert(1)",
    "JavaScript:alert(1)",
    "data:text/html;base64,AAAA",
    "vbscript:x",
    "file:///etc/passwd",
    "ftp://x",
  ])("drops %s", (url) => {
    expect(allowedUrl(url)).toBe("");
  });
});
