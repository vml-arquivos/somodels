import { afterEach, describe, expect, it, vi } from "vitest";

const originalMode = process.env.AGE_VERIFICATION_MODE;
const originalProvider = process.env.AGE_VERIFICATION_PROVIDER;
const originalApiKey = process.env.AGE_VERIFICATION_API_KEY;
const originalWebhookSecret = process.env.AGE_VERIFICATION_WEBHOOK_SECRET;

function restoreEnvironment() {
  for (const [key, value] of Object.entries({
    AGE_VERIFICATION_MODE: originalMode,
    AGE_VERIFICATION_PROVIDER: originalProvider,
    AGE_VERIFICATION_API_KEY: originalApiKey,
    AGE_VERIFICATION_WEBHOOK_SECRET: originalWebhookSecret,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

afterEach(() => {
  restoreEnvironment();
  vi.resetModules();
});

describe("age verification configuration", () => {
  it("treats explicit self-attestation as a configured local age gate", async () => {
    process.env.AGE_VERIFICATION_MODE = "self_attestation";
    delete process.env.AGE_VERIFICATION_PROVIDER;
    delete process.env.AGE_VERIFICATION_API_KEY;
    delete process.env.AGE_VERIFICATION_WEBHOOK_SECRET;

    const { ENV, isAgeVerificationConfigured, runtimeConfigStatus } = await import("./_core/env");

    expect(ENV.ageVerificationMode).toBe("self_attestation");
    expect(isAgeVerificationConfigured()).toBe(true);
    expect(runtimeConfigStatus().ageVerification).toBe(true);
  });

  it("keeps provider mode unavailable until all provider credentials exist", async () => {
    process.env.AGE_VERIFICATION_MODE = "provider";
    delete process.env.AGE_VERIFICATION_PROVIDER;
    delete process.env.AGE_VERIFICATION_API_KEY;
    delete process.env.AGE_VERIFICATION_WEBHOOK_SECRET;

    const { isAgeVerificationConfigured, runtimeConfigStatus } = await import("./_core/env");

    expect(isAgeVerificationConfigured()).toBe(false);
    expect(runtimeConfigStatus().ageVerification).toBe(false);
  });
});
