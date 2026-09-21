import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { profileOperationalLabel } from "../shared/portfolio";

const routerSource = readFileSync(new URL("./routers.ts", import.meta.url), "utf8");
const deleteProfileBlock = routerSource.slice(
  routerSource.indexOf("deleteProfile: adminProcedure"),
  routerSource.indexOf("restoreProfile: adminProcedure")
);

describe("profile operational lifecycle", () => {
  it("distinguishes active and inactive profiles from editorial publication", () => {
    expect(profileOperationalLabel({ isActive: true, deletedAt: null })).toBe("Ativo");
    expect(profileOperationalLabel({ isActive: false, deletedAt: null })).toBe("Inativo");
  });

  it("always prioritizes logical deletion", () => {
    expect(profileOperationalLabel({ isActive: true, deletedAt: new Date() })).toBe("Excluído");
  });

  it("keeps profile deletion direct and free of slug confirmation", () => {
    expect(deleteProfileBlock).toContain("softDeleteProfile(input.id, ctx.user.id, input.reason)");
    expect(deleteProfileBlock).not.toContain("confirmation");
    expect(deleteProfileBlock).not.toContain("min(3)");
  });
});
