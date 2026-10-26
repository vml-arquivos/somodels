import { describe, expect, it } from "vitest";
import {
  brazilianStateOptions,
  dfNeighborhoodOptions,
  genericNeighborhoodOptions,
  hasLegacyApprovedLocation,
  isStructuredLocation,
  loadCitiesForState,
  stateCodeByLabel,
} from "../shared/locations";

describe("structured locations", () => {
  it("contains exactly one entry for each Brazilian federation unit", () => {
    const codes = brazilianStateOptions.map(([code]) => code);
    const labels = brazilianStateOptions.map(([, label]) => label);
    expect(codes).toHaveLength(27);
    expect(new Set(codes).size).toBe(27);
    expect(new Set(labels).size).toBe(27);
    expect(stateCodeByLabel["Distrito Federal"]).toBe("DF");
  });

  it("loads Brasília and the requested DF regions from the DF chunk", async () => {
    const cities = await loadCitiesForState("DF");
    expect(cities).toContain("Brasília");
    expect(dfNeighborhoodOptions).toEqual(
      expect.arrayContaining([
        "Recanto das Emas",
        "Riacho Fundo I",
        "Samambaia",
      ])
    );
  });

  it("keeps generic regions available for states without a neighborhood dataset", () => {
    expect(genericNeighborhoodOptions).toEqual(
      expect.arrayContaining(["Centro", "Zona Norte", "Zona Sul", "Outros"])
    );
  });

  it("accepts only state, city and neighborhood combinations present in the lists", async () => {
    await expect(
      isStructuredLocation("Distrito Federal", "Brasília", "Recanto das Emas")
    ).resolves.toBe(true);
    await expect(
      isStructuredLocation("Distrito Federal", "Brasília", "Bairro inexistente")
    ).resolves.toBe(false);
  });

  it("preserves an approved legacy profile until its owner selects a structured neighborhood", () => {
    expect(
      hasLegacyApprovedLocation({
        status: "approved",
        portfolioReviewed: true,
        neighborhood: null,
      })
    ).toBe(true);
    expect(
      hasLegacyApprovedLocation({
        status: "draft",
        portfolioReviewed: false,
        neighborhood: null,
      })
    ).toBe(false);
  });
});
