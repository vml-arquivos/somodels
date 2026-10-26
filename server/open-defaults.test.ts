import { afterEach, describe, expect, it, vi } from "vitest";

const keys = [
  "SECURE_CONTACT_ENABLED",
  "REPORTS_ENABLED",
  "BLOCKING_ENABLED",
  "FAVORITES_ENABLED",
  "REQUIRE_IDENTITY_VERIFICATION",
  "KYC_REQUIRED",
  "AUTO_PUBLISH_ENABLED",
  "OWNER_MEDIA_AUTO_APPROVE",
] as const;

async function loadEnv(overrides: Partial<Record<(typeof keys)[number], string>> = {}) {
  vi.resetModules();
  for (const key of keys) vi.stubEnv(key, "");
  for (const [key, value] of Object.entries(overrides)) vi.stubEnv(key, value);
  return (await import("./_core/env")).ENV;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("padrões do ambiente de produção", () => {
  it("deixa contato, denúncia e publicação sem travas manuais por padrão", async () => {
    const env = await loadEnv();
    expect(env.secureContactEnabled).toBe(true);
    expect(env.reportsEnabled).toBe(true);
    expect(env.blockingEnabled).toBe(true);
    expect(env.favoritesEnabled).toBe(true);
    expect(env.autoPublishEnabled).toBe(true);
    expect(env.ownerMediaAutoApprove).toBe(true);
  });

  it("não exige verificação de identidade para publicar por padrão", async () => {
    const env = await loadEnv();
    expect(env.requireIdentityVerification).toBe(false);
    expect(env.kycRequired).toBe(false);
  });

  it("continua obedecendo quando a variável é definida de forma explícita", async () => {
    const env = await loadEnv({
      SECURE_CONTACT_ENABLED: "false",
      REPORTS_ENABLED: "false",
      REQUIRE_IDENTITY_VERIFICATION: "true",
      AUTO_PUBLISH_ENABLED: "false",
    });
    expect(env.secureContactEnabled).toBe(false);
    expect(env.reportsEnabled).toBe(false);
    expect(env.requireIdentityVerification).toBe(true);
    expect(env.autoPublishEnabled).toBe(false);
  });
});

describe("regra de senha", () => {
  it("aceita 10 caracteres com letras e números e recusa senhas fracas", async () => {
    const { assertPasswordPolicy } = await import("./auth");
    expect(() => assertPasswordPolicy("casa12345x")).not.toThrow();
    expect(() => assertPasswordPolicy("curta1")).toThrow(/10 caracteres/);
    expect(() => assertPasswordPolicy("somenteletras")).toThrow(/letras e números/);
    expect(() => assertPasswordPolicy("1234567890123")).toThrow(/letras e números/);
  });
});
