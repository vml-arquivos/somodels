import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    createLocalUser: vi.fn(),
    resetBootstrapDevAccount: vi.fn(),
  },
  env: {
    bootstrapSuperAdminEmail: "",
    bootstrapSuperAdminPassword: "",
    bootstrapDevEmail: "vilsonmarcio@gmail.com",
    bootstrapDevPassword: "A-valid-temporary-password-123",
    bootstrapDevResetExisting: true,
  },
}));

vi.mock("./db", () => mocks.db);
vi.mock("./_core/env", () => ({ ENV: mocks.env }));

describe("bootstrapLocalAccounts", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.db.createLocalUser.mockReset();
    mocks.db.resetBootstrapDevAccount.mockReset();
  });

  it("rotaciona a conta DEV quando a flag explícita está habilitada", async () => {
    const { bootstrapLocalAccounts } = await import("./auth");

    await bootstrapLocalAccounts();

    expect(mocks.db.resetBootstrapDevAccount).toHaveBeenCalledWith(
      "vilsonmarcio@gmail.com",
      "A-valid-temporary-password-123"
    );
    expect(mocks.db.createLocalUser).toHaveBeenCalledWith({
      email: "vilsonmarcio@gmail.com",
      password: "A-valid-temporary-password-123",
      name: "Ero Models — Desenvolvimento",
      role: "dev",
      mustChangePassword: true,
    });
  });

  it("mantém o bootstrap sem reset quando a flag está desligada", async () => {
    mocks.env.bootstrapDevResetExisting = false;
    const { bootstrapLocalAccounts } = await import("./auth");

    await bootstrapLocalAccounts();

    expect(mocks.db.resetBootstrapDevAccount).not.toHaveBeenCalled();
    expect(mocks.db.createLocalUser).toHaveBeenCalledTimes(1);
  });
});
