import { describe, it, expect } from "vitest";
import {
  contactLinks,
  normalizePhone,
  portfolioPublicationLabel,
  siteSettingsSchema,
  defaultSiteSettings,
} from "../shared/portfolio";
import { profileInputSchema } from "../shared/profile-schema";
import { canManage } from "./management";

describe("portfolios and contacts", () => {
  it("normalizes Brazilian phone numbers and produces only fixed safe protocols", () => {
    expect(normalizePhone("(11) 91234-5678")).toBe("+5511912345678");
    expect(contactLinks("(11) 91234-5678", "")).toEqual({
      tel: "tel:+5511912345678",
      whatsapp: "https://wa.me/5511912345678",
    });
    expect(normalizePhone("+351 912345678")).toBe("+351912345678");
    expect(contactLinks("(11) 91234-5678", "")).toEqual({
      tel: "tel:+5511912345678",
      whatsapp: "https://wa.me/5511912345678",
    });
  });
  it("rejects unsafe or incomplete phone values", () => {
    expect(() => normalizePhone("javascript:alert(1)")).toThrow();
    expect(() => normalizePhone("123")).toThrow();
    expect(contactLinks("<script>", "123")).toEqual({
      tel: null,
      whatsapp: null,
    });
  });
  it("accepts professional categories and rejects legacy service categories", () => {
    const base = {
      stageName: "Portfolio",
      slug: "portfolio",
      city: "Brasília",
      categories: ["Modelo"],
    };
    expect(profileInputSchema.safeParse(base).success).toBe(true);
    expect(
      profileInputSchema.safeParse({ ...base, categories: ["Acompanhante"] })
        .success
    ).toBe(false);
    expect(
      profileInputSchema.safeParse({ ...base, categories: [] }).success
    ).toBe(false);
  });
  it("requires actual boolean visibility settings and bounds the headline", () => {
    expect(siteSettingsSchema.safeParse(defaultSiteSettings).success).toBe(
      true
    );
    expect(
      siteSettingsSchema.safeParse({
        ...defaultSiteSettings,
        showGallery: "false",
      }).success
    ).toBe(false);
    expect(
      siteSettingsSchema.safeParse({
        ...defaultSiteSettings,
        title: "x".repeat(121),
      }).success
    ).toBe(false);
  });
  it("labels the operational publication state", () => {
    expect(portfolioPublicationLabel({ status: "draft" })).toBe("Rascunho");
    expect(portfolioPublicationLabel({ status: "rejected" })).toBe("Ajustes solicitados");
    expect(portfolioPublicationLabel({ status: "approved", isPublished: false })).toBe("Aprovado oculto");
    expect(portfolioPublicationLabel({ status: "approved", isPublished: true, portfolioReviewed: true })).toBe("Publicado na vitrine");
  });
});
describe("administrative hierarchy", () => {
  it("never allows editing oneself or another developer", () => {
    expect(canManage({ id: 1, role: "dev" }, { id: 1, role: "dev" })).toBe(
      false
    );
    expect(canManage({ id: 1, role: "dev" }, { id: 2, role: "dev" })).toBe(
      false
    );
  });
  it("limits administrators to ordinary users", () => {
    expect(canManage({ id: 1, role: "admin" }, { id: 2, role: "user" })).toBe(
      true
    );
    for (const role of ["admin", "super_admin", "dev"] as const)
      expect(canManage({ id: 1, role: "admin" }, { id: 2, role })).toBe(false);
  });
  it("respects super administrator scope and denies ordinary users", () => {
    expect(
      canManage({ id: 1, role: "super_admin" }, { id: 2, role: "admin" })
    ).toBe(true);
    expect(
      canManage({ id: 1, role: "super_admin" }, { id: 2, role: "dev" })
    ).toBe(false);
    expect(canManage({ id: 1, role: "user" }, { id: 2, role: "user" })).toBe(
      false
    );
  });
});
