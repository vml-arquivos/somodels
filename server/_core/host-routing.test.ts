import { describe, expect, it } from "vitest";
import {
  ACCOUNT_HOST,
  ADMIN_HOST,
  getPrivateHostLanding,
  isAllowedApplicationOrigin,
  isPrivateHost,
  normalizeRequestHost,
} from "./host-routing";

describe("private host routing", () => {
  it("normalizes forwarded hosts and ports", () => {
    expect(
      normalizeRequestHost(" Conta.EroModels.com.br:443, proxy.internal ")
    ).toBe(ACCOUNT_HOST);
  });

  it("routes the account host to the client area", () => {
    expect(getPrivateHostLanding(ACCOUNT_HOST)).toBe("/conta");
    expect(isPrivateHost(ACCOUNT_HOST)).toBe(true);
  });

  it("routes the admin host to the admin area", () => {
    expect(getPrivateHostLanding(ADMIN_HOST)).toBe("/admin");
    expect(isPrivateHost(ADMIN_HOST)).toBe(true);
  });

  it("leaves the public host and unknown hosts untouched", () => {
    expect(getPrivateHostLanding("eromodels.com.br")).toBeNull();
    expect(getPrivateHostLanding("preview.eromodels.com.br")).toBeNull();
    expect(isPrivateHost("eromodels.com.br")).toBe(false);
  });

  it("allows the three official application origins only", () => {
    const canonical = "https://eromodels.com.br";
    expect(isAllowedApplicationOrigin(canonical, canonical)).toBe(true);
    expect(
      isAllowedApplicationOrigin("https://conta.eromodels.com.br", canonical)
    ).toBe(true);
    expect(
      isAllowedApplicationOrigin("https://admin.eromodels.com.br", canonical)
    ).toBe(true);
    expect(isAllowedApplicationOrigin("https://evil.example", canonical)).toBe(
      false
    );
  });

  it("does not add private origins for an unrelated canonical domain", () => {
    expect(
      isAllowedApplicationOrigin(
        "https://admin.eromodels.com.br",
        "https://example.com"
      )
    ).toBe(false);
  });
});
