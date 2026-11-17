import { describe, expect, it } from "vitest";
import { planFromStripeStatus, resolveBillingMode } from "@/domain/billing";
import { parseIsoDate } from "@/domain/dates";
import { invoiceCanBeDeleted, linesAreEditable, transitionError } from "@/domain/invoices";
import { formatUsd, invoiceTotalCents, parseUsdToCents } from "@/domain/money";
import { noticeMessage } from "@/domain/notices";
import { can, inviteRoleError, memberChangeError } from "@/domain/permissions";
import { assertCapacity, LimitError, opensTaskSlot, PLAN_LIMITS } from "@/domain/plans";
import { signupSchema } from "@/domain/schemas";
import { nextSlug, slugify } from "@/domain/slug";
import { safeQueryMessage } from "@/domain/text";

describe("money", () => {
  it("parses dollar strings into cents without binary floating point", () => {
    expect(parseUsdToCents("150.50")).toBe(15050);
    expect(parseUsdToCents("0.1")).toBe(10);
    expect(parseUsdToCents("1800")).toBe(180000);
  });

  it("rejects empty, zero, and extra precision", () => {
    expect(() => parseUsdToCents("0")).toThrow(/between/);
    expect(() => parseUsdToCents("1.234")).toThrow(/dollar amount/);
    expect(() => parseUsdToCents("-5")).toThrow(/dollar amount/);
  });

  it("sums line totals and formats USD", () => {
    expect(invoiceTotalCents([{ quantity: 2, unitAmountCents: 15050 }])).toBe(30100);
    expect(formatUsd(30100)).toBe("$301.00");
    expect(formatUsd(180000)).toBe("$1,800.00");
    expect(formatUsd(-50)).toBe("-$0.50");
  });
});

describe("slugs", () => {
  it("slugifies names and avoids taken values", () => {
    expect(slugify("Acme & Co.")).toBe("acme-co");
    expect(slugify("  ???  ")).toBe("workspace");
    expect(nextSlug("sample", new Set(["sample", "sample-2"]))).toBe("sample-3");
  });
});

describe("permissions", () => {
  it("lets members move tasks and keeps billing with the owner", () => {
    expect(can("MEMBER", "task:write")).toBe(true);
    expect(can("MEMBER", "invoice:write")).toBe(false);
    expect(can("ADMIN", "invoice:write")).toBe(true);
    expect(can("ADMIN", "billing:manage")).toBe(false);
    expect(can("OWNER", "org:delete")).toBe(true);
    expect(can("ADMIN", "org:delete")).toBe(false);
  });

  it("protects the last owner and stops admins from editing owners", () => {
    const owner = { id: "m1", userId: "u1", role: "OWNER" as const };
    const admin = { id: "m2", userId: "u2", role: "ADMIN" as const };
    expect(
      memberChangeError({ actor: admin, target: owner, nextRole: "MEMBER", ownerCount: 1 }),
    ).toMatch(/admin cannot change an owner/);
    expect(
      memberChangeError({ actor: owner, target: owner, remove: true, ownerCount: 1 }),
    ).toMatch(/at least one owner/);
    expect(
      memberChangeError({
        actor: owner,
        target: { id: "m3", userId: "u3", role: "OWNER" },
        nextRole: "ADMIN",
        ownerCount: 2,
      }),
    ).toBeNull();
    expect(inviteRoleError("ADMIN", "OWNER")).toMatch(/Only an owner/);
    expect(inviteRoleError("MEMBER", "MEMBER")).toMatch(/cannot invite/);
  });
});

describe("plans", () => {
  it("blocks the next record once a plan limit is reached", () => {
    expect(() => assertCapacity("FREE", "members", PLAN_LIMITS.FREE.members)).toThrow(LimitError);
    expect(() => assertCapacity("PRO", "members", PLAN_LIMITS.FREE.members)).not.toThrow();
  });

  it("counts a task against the open-task limit only when it becomes open", () => {
    expect(opensTaskSlot(null, "TODO")).toBe(true);
    expect(opensTaskSlot(null, "DONE")).toBe(false);
    expect(opensTaskSlot("DONE", "IN_PROGRESS")).toBe(true);
    expect(opensTaskSlot("TODO", "IN_PROGRESS")).toBe(false);
    expect(opensTaskSlot("IN_PROGRESS", "DONE")).toBe(false);
  });
});

describe("invoices", () => {
  it("allows draft to sent or void, and locks paid invoices", () => {
    expect(transitionError("DRAFT", "SENT")).toBeNull();
    expect(transitionError("SENT", "PAID")).toBeNull();
    expect(transitionError("PAID", "VOID")).toMatch(/cannot move/);
    expect(transitionError("DRAFT", "DRAFT")).toBeNull();
    expect(linesAreEditable("DRAFT")).toBe(true);
    expect(linesAreEditable("SENT")).toBe(false);
    expect(invoiceCanBeDeleted("DRAFT")).toBe(true);
    expect(invoiceCanBeDeleted("SENT")).toBe(false);
  });
});

describe("billing mode", () => {
  it("stays on the mock unless Stripe is explicitly selected or fully configured", () => {
    expect(resolveBillingMode({})).toBe("mock");
    expect(
      resolveBillingMode({
        STRIPE_SECRET_KEY: "sk_test_example",
        STRIPE_WEBHOOK_SECRET: "whsec_example",
        STRIPE_PRICE_ID: "price_example",
      }),
    ).toBe("stripe");
    expect(
      resolveBillingMode({
        BILLING_MODE: "mock",
        STRIPE_SECRET_KEY: "sk_test_example",
        STRIPE_WEBHOOK_SECRET: "whsec_example",
        STRIPE_PRICE_ID: "price_example",
      }),
    ).toBe("mock");
    expect(resolveBillingMode({ BILLING_MODE: "stripe" })).toBe("stripe");
  });

  it("grants Pro only for active or trialing Stripe subscriptions", () => {
    expect(planFromStripeStatus("active")).toEqual({ plan: "PRO", subscriptionStatus: "ACTIVE" });
    expect(planFromStripeStatus("trialing")).toEqual({ plan: "PRO", subscriptionStatus: "ACTIVE" });
    expect(planFromStripeStatus("past_due")).toEqual({
      plan: "PRO",
      subscriptionStatus: "PAST_DUE",
    });
    expect(planFromStripeStatus("canceled").plan).toBe("FREE");
    expect(planFromStripeStatus("incomplete").plan).toBe("FREE");
  });
});

describe("dates, notices, and signup", () => {
  it("accepts real calendar dates", () => {
    expect(parseIsoDate("2026-11-17")?.toISOString()).toBe("2026-11-17T00:00:00.000Z");
    expect(parseIsoDate("")).toBeNull();
    expect(() => parseIsoDate("2026-02-31")).toThrow(/not valid/);
    expect(() => parseIsoDate("17-11-2026")).toThrow(/YYYY-MM-DD/);
  });

  it("ignores unknown notice codes and markup in query messages", () => {
    expect(noticeMessage("mock-pro")).toMatch(/No card was charged/);
    expect(noticeMessage("nope")).toBeNull();
    expect(safeQueryMessage("<script>")).toBeNull();
    expect(safeQueryMessage("Choose a client")).toBe("Choose a client");
  });

  it("rejects short passwords", () => {
    const result = signupSchema.safeParse({
      name: "Ada",
      email: "ada@example.com",
      password: "password",
      organizationName: "Studio",
    });
    expect(result.success).toBe(false);
  });
});
