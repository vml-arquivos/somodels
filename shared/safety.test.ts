import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  canActOnProfile,
  decodeReportReason,
  defaultSafetyFeatureFlags,
  encodeReportReason,
  externalContactAllowed,
  priorityForReport,
  reportCategories,
  reportCategoryLabels,
  safetyFeatureFlagKeys,
  type ReportCategory,
} from "./safety";

describe("safety report policy", () => {
  it.each([
    ["minor", "urgent"],
    ["trafficking_exploitation_coercion", "urgent"],
    ["threat_extortion", "high"],
    ["impersonation", "high"],
    ["unauthorized_media", "high"],
    ["illegal_content", "high"],
    ["fraud", "normal"],
    ["copyright", "normal"],
    ["privacy", "normal"],
    ["spam", "normal"],
    ["abuse", "normal"],
    ["other", "normal"],
  ] as const)("maps %s to %s priority", (category, priority) => {
    expect(priorityForReport(category)).toBe(priority);
  });

  it.each(reportCategories)("has a human label for %s", category => {
    expect(reportCategoryLabels[category].length).toBeGreaterThan(2);
  });

  it.each(reportCategories)("round-trips %s report payloads", category => {
    const encoded = encodeReportReason({ category, description: "Descrição válida de segurança" });
    expect(decodeReportReason(encoded)).toMatchObject({
      category,
      description: "Descrição válida de segurança",
      source: "profile",
    });
  });

  it("falls back safely for legacy plain-text reasons", () => {
    expect(decodeReportReason("motivo legado")).toEqual({
      version: 1,
      category: "other",
      description: "motivo legado",
      source: "profile",
    });
  });

  it("falls back safely for malformed JSON", () => {
    expect(decodeReportReason("{bad-json").category).toBe("other");
  });
});

describe("safety feature defaults", () => {
  it.each(safetyFeatureFlagKeys)("keeps %s disabled by default", key => {
    expect(defaultSafetyFeatureFlags[key]).toBe(false);
  });
});

describe("secure external contact policy", () => {
  const base = {
    featureEnabled: true,
    authenticated: true,
    ageApproved: true,
    blocked: false,
    authorizationCurrent: true,
  };

  it("allows contact only when every gate is satisfied", () => {
    expect(externalContactAllowed(base)).toBe(true);
  });

  it.each([
    "featureEnabled",
    "authenticated",
    "ageApproved",
    "authorizationCurrent",
  ] as const)("fails closed when %s is false", key => {
    expect(externalContactAllowed({ ...base, [key]: false })).toBe(false);
  });

  it("fails closed when a block exists", () => {
    expect(externalContactAllowed({ ...base, blocked: true })).toBe(false);
  });

  it("allows account actions against a different profile owner", () => {
    expect(canActOnProfile(10, 20)).toBe(true);
  });

  it("rejects actions against the account owner's own profile", () => {
    expect(canActOnProfile(10, 10)).toBe(false);
  });

  it.each(reportCategories.slice(0, 5))("accepts declared category %s at runtime", category => {
    expect(reportCategories.includes(category as ReportCategory)).toBe(true);
  });
});


describe("safety router authorization wiring", () => {
  const source = readFileSync(new URL("../server/routers.ts", import.meta.url), "utf8");

  it("keeps favorite mutations behind protectedProcedure", () => {
    expect(source).toMatch(/favorite:\s*protectedProcedure/);
  });

  it("keeps secure contact authenticated and age-gated", () => {
    expect(source).toMatch(/contactIntent:\s*protectedProcedure/);
    expect(source).toContain("hasValidAgeSession(ctx.req)");
  });

  it("keeps the report queue behind adminProcedure", () => {
    expect(source).toMatch(/adminReports:\s*adminProcedure/);
  });
});
