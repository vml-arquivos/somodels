import { describe, expect, it } from "vitest";
import { hydrateProfile } from "./db";

describe("profile data", () => {
  it("hydrates JSON fields without exposing malformed values", () => {
    const profile = hydrateProfile({ id: 1, stageName: "Musa", categories: '["Modelo","Acompanhante"]', attributes: '["Com local"]', contactOptions: '["WhatsApp"]', description: null });
    expect(profile.categories).toEqual(["Modelo", "Acompanhante"]);
    expect(profile.attributes).toEqual(["Com local"]);
    expect(profile.contactOptions).toEqual(["WhatsApp"]);
    expect(profile.description).toBeNull();
  });

  it("uses empty arrays for invalid persisted JSON", () => {
    const profile = hydrateProfile({ categories: "{invalid", attributes: null, contactOptions: undefined });
    expect(profile.categories).toEqual([]);
    expect(profile.attributes).toEqual([]);
    expect(profile.contactOptions).toEqual([]);
  });
});
