import { cacheLife } from "next/cache";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { brand, businessRules, contact } from "@/config";

export const policySlugs = ["terms", "refunds", "privacy"] as const;
export type PolicySlug = (typeof policySlugs)[number];
export const isPolicySlug = (s: string): s is PolicySlug => (policySlugs as readonly string[]).includes(s);

export interface Policy {
  slug: PolicySlug;
  title: string;
  summary: string;
  /** "draft" pages show a banner and are kept out of search engines. */
  status: "draft" | "final";
  updated: string;
  body: string;
}

/** Splits `---` frontmatter (simple `key: value` lines) from the markdown body. */
export function parseFrontmatter(raw: string): { data: Record<string, string>; body: string } {
  const text = raw.replace(/\r\n/g, "\n");
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data: Record<string, string> = {};
  for (const line of m[1]!.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) data[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { data, body: m[2]!.trim() };
}

/** Replaces {{name}} placeholders. Unknown names are left visible so a typo is easy to spot. */
export function fillTemplate(md: string, vars: Record<string, string>): string {
  return md.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (whole, key: string) => vars[key] ?? whole);
}

/** Policy numbers and contact details come from /src/config, never from the markdown. */
export function policyVars(): Record<string, string> {
  const lines = [
    ...contact.phones.map((p) => `- ${p.label}: [${p.display}](tel:${p.e164})`),
    `- WhatsApp: [Message us](${contact.whatsapp})`,
    ...(contact.email ? [`- Email: [${contact.email}](mailto:${contact.email})`] : []),
  ];
  return {
    "brand.name": brand.name,
    "deposit.percent": String(businessRules.deposit.percent),
    "balance.dueDays": String(businessRules.balance.dueDaysBeforeArrival),
    "balance.unpaidCancelDays": String(businessRules.balance.unpaidCancelAfterDays),
    contactLines: lines.join("\n"),
  };
}

export async function loadPolicy(slug: string): Promise<Policy | null> {
  "use cache";
  cacheLife("days");
  if (!isPolicySlug(slug)) return null;
  let raw: string;
  try {
    raw = await readFile(path.join(process.cwd(), "content", "policies", `${slug}.md`), "utf8");
  } catch {
    return null;
  }
  const { data, body } = parseFrontmatter(raw);
  return {
    slug,
    title: data.title ?? slug,
    summary: data.summary ?? "",
    status: data.status === "final" ? "final" : "draft",
    updated: data.updated ?? "",
    body: fillTemplate(body, policyVars()),
  };
}
