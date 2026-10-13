/**
 * Splits a product name for the two-tone treatment (reference 1):
 * descriptive words are muted, the product noun phrase is dark and heavier, and a
 * spec after a comma ("6L", "ANC") is muted again.
 * "Stainless steel air fryer, 6L" -> { muted: "Stainless steel", key: "air fryer", spec: "6L" }
 */
export function splitProductName(name: string): { muted: string; key: string; spec: string } {
  const [main = "", ...rest] = name.split(",");
  const words = main.trim().split(/\s+/);
  const keyCount = words.length > 2 ? 2 : words.length;
  return {
    muted: words.slice(0, words.length - keyCount).join(" "),
    key: words.slice(-keyCount).join(" "),
    spec: rest.join(",").trim(),
  };
}
