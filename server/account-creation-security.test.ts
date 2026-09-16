import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ select: vi.fn(), insert: vi.fn(), update: vi.fn(), existing: null as any, values: vi.fn() }));
vi.mock("drizzle-orm/mysql2", () => ({ drizzle: () => mock }));
vi.mock("./_core/env", () => ({ ENV: { databaseUrl: "mysql://unused" } }));
vi.mock("./auth-crypto", () => ({ hashPassword: async () => "hashed" }));
import { createLocalUser } from "./db";
const input = { email: "test@example.invalid", name: "Test", password: "unused", role: "dev" as const };
beforeEach(() => {
  vi.clearAllMocks();
  mock.select.mockImplementation(() => ({ from: () => ({ where: () => ({ limit: async () => mock.existing ? [mock.existing] : [] }) }) }));
  mock.insert.mockReturnValue({ values: mock.values });
});
describe("account creation protections", () => {
  it("bootstrap does not reactivate or promote an existing account", async () => {
    mock.existing = { id: 1, role: "user", accountStatus: "suspended", mustChangePassword: true };
    expect(await createLocalUser(input)).toBe(mock.existing);
    expect(mock.update).not.toHaveBeenCalled();
    expect(mock.insert).not.toHaveBeenCalled();
  });
  it("registration refuses an existing account even after a concurrent precheck", async () => {
    mock.existing = { id: 1 };
    await expect(createLocalUser({ ...input, rejectExisting: true })).rejects.toThrow();
    expect(mock.insert).not.toHaveBeenCalled();
  });
  it("new accounts are not falsely marked as email verified", async () => {
    mock.existing = null;
    await createLocalUser(input);
    expect(mock.values).toHaveBeenCalledWith(expect.objectContaining({ emailVerifiedAt: null }));
  });
});
