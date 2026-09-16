import { beforeEach, describe, expect, it, vi } from "vitest";
import { getTableName } from "drizzle-orm";
const state = vi.hoisted(() => ({
  rows: [] as any[],
  writes: [] as any[],
  hash: vi.fn(async () => "new-hash"),
  db: {} as any,
}));
vi.mock("./db", () => ({
  getDb: async () => state.db,
  getAdminProfile: vi.fn(),
  getUserById: vi.fn(),
  saveProfile: vi.fn(),
  createLocalUser: vi.fn(),
}));
vi.mock("./auth-crypto", () => ({
  createOpaqueToken: () => "a".repeat(64),
  hashToken: () => "token-hash",
  hashPassword: (p: string) => state.hash(p),
}));
import { managementRouter } from "./management";
const caller = () =>
  managementRouter.createCaller({ user: null, req: {}, res: {} } as any);
beforeEach(() => {
  state.rows = [];
  state.writes = [];
  state.hash.mockClear();
  state.db = {
    transaction: async (fn: any) => fn(state.db),
    select: () => ({
      from: () => ({
        where: () => {
          const value = state.rows.shift() || [];
          return {
            for: async () => value,
            then: (resolve: any) => Promise.resolve(value).then(resolve),
          };
        },
      }),
    }),
    update: (table: any) => ({
      set: (values: any) => ({
        where: async () => {
          state.writes.push({ table: getTableName(table), values });
        },
      }),
    }),
    insert: (table: any) => ({
      values: async (values: any) => {
        state.writes.push({ table: getTableName(table), values });
      },
    }),
  };
});
describe("one-use password reset", () => {
  it("rejects an unknown token without hashing or writing", async () => {
    state.rows = [[]];
    await expect(
      caller().resetPassword({
        token: "a".repeat(64),
        password: "NewPasswordValid2026",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.hash).not.toHaveBeenCalled();
    expect(state.writes).toHaveLength(0);
  });
  it("rejects an expired/consumed token without modifying the account", async () => {
    state.rows = [[{ userId: 2 }], [{ id: 2, accountStatus: "active" }], []];
    await expect(
      caller().resetPassword({
        token: "a".repeat(64),
        password: "NewPasswordValid2026",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.writes).toHaveLength(0);
  });
  it("refuses password reset for a suspended account", async () => {
    state.rows = [
      [{ userId: 2 }],
      [{ id: 2, accountStatus: "suspended" }],
      [{ id: 4, userId: 2 }],
    ];
    await expect(
      caller().resetPassword({
        token: "a".repeat(64),
        password: "NewPasswordValid2026",
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(state.hash).not.toHaveBeenCalled();
  });
  it("changes only the password state and invalidates tokens and local sessions", async () => {
    state.rows = [
      [{ userId: 2 }],
      [{ id: 2, accountStatus: "active" }],
      [{ id: 4, userId: 2 }],
    ];
    await expect(
      caller().resetPassword({
        token: "a".repeat(64),
        password: "NewPasswordValid2026",
      })
    ).resolves.toEqual({ success: true });
    expect(state.writes.find(w => w.table === "users").values).toEqual({
      passwordHash: "new-hash",
      mustChangePassword: false,
      loginMethod: "password",
    });
    expect(
      state.writes.find(w => w.table === "password_reset_tokens").values.usedAt
    ).toBeInstanceOf(Date);
    expect(
      state.writes.find(w => w.table === "auth_sessions").values.revokedAt
    ).toBeInstanceOf(Date);
    expect(JSON.stringify(state.writes)).not.toContain("NewPasswordValid2026");
  });
});
