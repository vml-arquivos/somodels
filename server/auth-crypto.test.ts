import { describe, expect, it } from "vitest";
import { createOpaqueToken, hashPassword, hashToken, verifyPassword } from "./auth-crypto";

describe("auth crypto", () => {
  it("hashes and verifies a password without storing it in plain text", async () => {
    const password = "TemporariaSegura2026";
    const encoded = await hashPassword(password);
    expect(encoded).toMatch(/^scrypt\$/);
    expect(encoded).not.toContain(password);
    await expect(verifyPassword(password, encoded)).resolves.toBe(true);
    await expect(verifyPassword("senha-incorreta", encoded)).resolves.toBe(false);
  });

  it("creates opaque tokens and stable hashes", () => {
    const first = createOpaqueToken();
    const second = createOpaqueToken();
    expect(first).not.toBe(second);
    expect(hashToken(first)).toHaveLength(64);
    expect(hashToken(first)).toBe(hashToken(first));
  });
});
