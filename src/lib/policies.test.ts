import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { fillTemplate, isPolicySlug, parseFrontmatter, policySlugs, policyVars } from "./policies";

describe("policies", () => {
  it("parses frontmatter and body", () => {
    const { data, body } = parseFrontmatter("---\ntitle: Terms\nstatus: draft\n---\n\n## Hi\n\ntext");
    expect(data).toEqual({ title: "Terms", status: "draft" });
    expect(body).toBe("## Hi\n\ntext");
  });

  it("copes with Windows line endings and no frontmatter", () => {
    expect(parseFrontmatter("---\r\ntitle: A\r\n---\r\nbody").data.title).toBe("A");
    expect(parseFrontmatter("just text")).toEqual({ data: {}, body: "just text" });
  });

  it("fills known placeholders and leaves unknown ones visible", () => {
    expect(fillTemplate("{{ a }} and {{b.c}} and {{nope}}", { a: "1", "b.c": "2" })).toBe(
      "1 and 2 and {{nope}}",
    );
  });

  it("takes numbers from config, not from the markdown", () => {
    const v = policyVars();
    expect(v["deposit.percent"]).toBe("70");
    expect(v["balance.dueDays"]).toBe("14");
    expect(v.contactLines).toContain("+233 59 886 3540");
    expect(v.contactLines).toContain("+86 190 5725 6153");
    expect(v.contactLines).not.toContain("mailto:"); // no email configured
  });

  it("only knows the three policy slugs", () => {
    expect(policySlugs).toEqual(["terms", "refunds", "privacy"]);
    expect(isPolicySlug("terms")).toBe(true);
    expect(isPolicySlug("../etc/passwd")).toBe(false);
  });

  it.each(policySlugs)("%s.md is a marked draft whose placeholders all resolve", (slug) => {
    const raw = readFileSync(path.join(process.cwd(), "content", "policies", `${slug}.md`), "utf8");
    const { data, body } = parseFrontmatter(raw);
    expect(data.status).toBe("draft");
    expect(data.title).toBeTruthy();
    expect(body).toContain("To confirm with the owner"); // every draft flags what is undecided
    expect(fillTemplate(body, policyVars())).not.toMatch(/\{\{/);
    // numbers are never typed into the policy text itself
    expect(body).not.toMatch(/\b70%|14 days/);
  });
});
