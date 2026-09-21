import { describe, expect, it } from "vitest";
import { demoProfiles, getDemoProfileBySlug } from "../shared/demo-profiles";

describe("demo profile catalog", () => {
  it("contains a small, explicit and local-only preview catalog", () => {
    expect(demoProfiles).toHaveLength(6);
    for (const profile of demoProfiles) {
      expect(profile.slug).toMatch(/^demo-/);
      expect(profile.avatarUrl).toMatch(/^\/demo\/demo-\d{2}\.jpg$/);
      expect(profile.description).toMatch(/demonstrativ|fictíci/i);
      expect(profile).not.toHaveProperty("phone");
      expect(profile).not.toHaveProperty("whatsapp");
      expect(profile).not.toHaveProperty("telegram");
    }
  });

  it("resolves only known demonstration slugs", () => {
    expect(getDemoProfileBySlug("demo-01-luna")?.stageName).toBe("Luna");
    expect(getDemoProfileBySlug("perfil-real")).toBeNull();
  });
});
