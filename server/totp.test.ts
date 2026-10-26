import { describe, expect, it } from "vitest";
import {
  base32Decode,
  base32Encode,
  decryptSecret,
  encryptSecret,
  generateTotpSecret,
  totpAt,
  verifyTotp,
} from "./totp";

// Vetores oficiais da RFC 6238 (segredo ASCII "12345678901234567890", SHA-1).
const rfcSecret = base32Encode(Buffer.from("12345678901234567890"));

describe("TOTP", () => {
  it("reproduz os vetores da RFC 6238", () => {
    expect(totpAt(rfcSecret, Math.floor(59 / 30), 8)).toBe("94287082");
    expect(totpAt(rfcSecret, Math.floor(1111111109 / 30), 8)).toBe("07081804");
    expect(totpAt(rfcSecret, Math.floor(20000000000 / 30), 8)).toBe("65353130");
  });

  it("codifica e decodifica base32", () => {
    const secret = generateTotpSecret();
    expect(base32Encode(base32Decode(secret))).toBe(secret);
    expect(() => base32Decode("!!!")).toThrow();
  });

  it("aceita o código atual e rejeita reuso e códigos errados", () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 1000 / 30);
    const code = totpAt(rfcSecret, step);
    expect(verifyTotp(rfcSecret, code, { nowMs: now })).toBe(step);
    expect(verifyTotp(rfcSecret, code, { nowMs: now, lastStep: step })).toBeNull();
    expect(verifyTotp(rfcSecret, "000000", { nowMs: now })).toBeNull();
    expect(verifyTotp(rfcSecret, "abc", { nowMs: now })).toBeNull();
  });

  it("tolera um passo de diferença de relógio, mas não mais", () => {
    const now = 1_700_000_000_000;
    const step = Math.floor(now / 1000 / 30);
    expect(verifyTotp(rfcSecret, totpAt(rfcSecret, step - 1), { nowMs: now })).toBe(step - 1);
    expect(verifyTotp(rfcSecret, totpAt(rfcSecret, step - 3), { nowMs: now })).toBeNull();
  });

  it("cifra o segredo em repouso e detecta adulteração", () => {
    const secret = generateTotpSecret();
    const payload = encryptSecret(secret, "segredo-da-aplicacao-com-32-caracteres!!");
    expect(payload).not.toContain(secret);
    expect(decryptSecret(payload, "segredo-da-aplicacao-com-32-caracteres!!")).toBe(secret);
    expect(() => decryptSecret(payload, "outro-segredo-qualquer-com-32-caracteres")).toThrow();
  });
});
