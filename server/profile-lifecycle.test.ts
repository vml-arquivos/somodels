import { describe, expect, it } from "vitest";
import { profileOperationalLabel } from "../shared/portfolio";

describe("profile operational lifecycle", () => {
  it("distinguishes active and inactive profiles from editorial publication", () => {
    expect(profileOperationalLabel({ isActive: true, deletedAt: null })).toBe("Ativo");
    expect(profileOperationalLabel({ isActive: false, deletedAt: null })).toBe("Inativo");
  });

  it("always prioritizes logical deletion", () => {
    expect(profileOperationalLabel({ isActive: true, deletedAt: new Date() })).toBe("Excluído");
  });
});
