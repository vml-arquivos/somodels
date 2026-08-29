import { describe, expect, it } from "vitest";
import { profileInputSchema } from "./routers";

describe("profileInputSchema", () => {
  it("accepts a valid public profile payload", () => {
    const result = profileInputSchema.safeParse({ stageName: "Musa Exemplo", slug: "musa-exemplo", city: "São Paulo", categories: ["Modelo"], attributes: ["Com local"], contactOptions: ["WhatsApp"] });
    expect(result.success).toBe(true);
  });
  it("rejects unsafe slugs and missing city", () => {
    const result = profileInputSchema.safeParse({ stageName: "A", slug: "Musa Exemplo", city: "" });
    expect(result.success).toBe(false);
  });
});
