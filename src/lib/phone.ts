export type MomoNetwork = "mtn" | "telecel" | "airteltigo";

export const networkLabels: Record<MomoNetwork, string> = {
  mtn: "MTN MoMo",
  telecel: "Telecel Cash",
  airteltigo: "AirtelTigo Money",
};

const networkByPrefix: Record<string, MomoNetwork> = {
  "24": "mtn",
  "25": "mtn",
  "53": "mtn",
  "54": "mtn",
  "55": "mtn",
  "59": "mtn",
  "20": "telecel",
  "50": "telecel",
  "26": "airteltigo",
  "27": "airteltigo",
  "56": "airteltigo",
  "57": "airteltigo",
};

/**
 * Accepts 0XXXXXXXXX, +233XXXXXXXXX, 233XXXXXXXXX or the 9-digit national number.
 * Returns +233XXXXXXXXX, or null when it is not a valid Ghana mobile number.
 */
export function normalizeGhPhone(input: string): string | null {
  let d = input.replace(/[\s\-().]/g, "");
  if (d.startsWith("+233")) d = d.slice(4);
  else if (d.startsWith("00233")) d = d.slice(5);
  else if (d.startsWith("233")) d = d.slice(3);
  else if (d.startsWith("0")) d = d.slice(1);
  return /^[25]\d{8}$/.test(d) ? `+233${d}` : null;
}

export function isValidGhPhone(input: string): boolean {
  return normalizeGhPhone(input) !== null;
}

/** Network from the number's prefix, used to preselect the MoMo provider (the customer can change it). */
export function detectNetwork(input: string): MomoNetwork | null {
  const n = normalizeGhPhone(input);
  return n ? (networkByPrefix[n.slice(4, 6)] ?? null) : null;
}

/** "+233 24 123 4567" */
export function formatGhPhone(input: string): string {
  const n = normalizeGhPhone(input);
  return n ? `+233 ${n.slice(4, 6)} ${n.slice(6, 9)} ${n.slice(9)}` : input;
}

/** Forgiving order-number input: trim, uppercase, drop spaces. */
export function normalizeOrderNumber(input: string): string {
  return input.replace(/\s+/g, "").toUpperCase();
}
