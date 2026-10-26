import { describe, expect, it } from "vitest";
import { profileInputSchema } from "./routers";

describe("profileInputSchema", () => {
  it("accepts a valid public profile payload", () => {
    const result = profileInputSchema.safeParse({
      stageName: "Musa Exemplo",
      slug: "musa-exemplo",
      city: "São Paulo",
      categories: ["Acompanhante"],
      attributes: ["Com local"],
      contactOptions: ["WhatsApp"],
    });
    expect(result.success).toBe(true);
  });
  it("rejects unsafe slugs and missing city", () => {
    const result = profileInputSchema.safeParse({
      stageName: "A",
      slug: "Musa Exemplo",
      city: "",
    });
    expect(result.success).toBe(false);
  });

  it.each([
    ["61999999999", "+5561999999999"],
    ["(61) 99999-9999", "+5561999999999"],
    ["6133334444", "+556133334444"],
    ["+5561999999999", "+5561999999999"],
  ])("accepts a Brazilian phone with DDD: %s", (phone, expected) => {
    const result = profileInputSchema.safeParse({
      stageName: "Musa Exemplo",
      slug: "musa-exemplo",
      city: "Brasília",
      categories: ["Acompanhante"],
      phone,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.phone).toBe(expected);
  });

  it.each(["00999999999", "619999999", "61888888888"])(
    "rejects an invalid Brazilian telephone: %s",
    phone => {
      const result = profileInputSchema.safeParse({
        stageName: "Musa Exemplo",
        slug: "musa-exemplo",
        city: "Brasília",
        categories: ["Acompanhante"],
        phone,
      });
      expect(result.success).toBe(false);
    }
  );
});
