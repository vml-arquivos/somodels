import { describe, expect, it } from "vitest";
import { evaluateListingQuality } from "./listing-quality";

describe("qualidade do anúncio", () => {
  it("pontua anúncio vazio como inicial e lista dicas", () => {
    const result = evaluateListingQuality({ photoCount: 0, videoCount: 0, identityVerified: false });
    expect(result.score).toBe(0);
    expect(result.level).toBe("inicial");
    expect(result.tips.length).toBe(result.checks.length);
  });

  it("pontua anúncio completo com 100", () => {
    const result = evaluateListingQuality({
      description: "x".repeat(250),
      avatarUrl: "/a.jpg",
      priceFromCents: 20000,
      services: ["Massagem"],
      attendancePlaces: ["Com local"],
      languages: ["Português"],
      availabilityLabel: "Todos os dias",
      locationNote: "Asa Sul",
      photoCount: 5,
      videoCount: 1,
      identityVerified: true,
    });
    expect(result.score).toBe(100);
    expect(result.level).toBe("otimo");
    expect(result.tips).toEqual([]);
  });

  it("soma parcialmente", () => {
    const result = evaluateListingQuality({ avatarUrl: "/a.jpg", photoCount: 4, videoCount: 0, identityVerified: false });
    expect(result.score).toBe(30);
  });
});
