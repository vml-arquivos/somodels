import { describe, expect, it } from "vitest";
import {
  profileDraftInputSchema,
  profileInputSchema,
} from "../shared/profile-schema";

describe("profile draft contract", () => {
  it("accepts an empty first draft without consent or publication fields", () => {
    const result = profileDraftInputSchema.safeParse({
      stageName: "",
      slug: "",
      city: "",
      categories: [],
      phone: "",
      whatsapp: "",
    });

    expect(result.success).toBe(true);
  });

  it("keeps publication validation strict", () => {
    const result = profileInputSchema.safeParse({
      stageName: "",
      slug: "",
      city: "",
      categories: [],
    });

    expect(result.success).toBe(false);
  });

  it("accepts a partial draft with valid optional content", () => {
    const result = profileDraftInputSchema.safeParse({
      stageName: "Marina Alves",
      description: "Rascunho inicial",
      categories: ["Acompanhante"],
      services: [],
      attendancePlaces: [],
      paymentMethods: ["Pix", "Dinheiro"],
    });

    expect(result.success).toBe(true);
  });

  it("rejects malformed phone data instead of saving a broken contact", () => {
    const result = profileDraftInputSchema.safeParse({
      phone: "telefone sem DDI",
    });

    expect(result.success).toBe(false);
  });
});
