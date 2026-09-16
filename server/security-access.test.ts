import { describe, expect, it } from "vitest";
import { router, authenticatedProcedure, protectedProcedure, adminProcedure } from "./_core/trpc";
import { ENV } from "./_core/env";
import type { TrpcContext } from "./_core/context";

const routes = router({
  rotate: authenticatedProcedure.mutation(() => true),
  privateData: protectedProcedure.query(() => true),
  administration: adminProcedure.query(() => true),
});
function caller(overrides: Record<string, unknown> = {}) {
  return routes.createCaller({ user: { id: 1, role: "user", accountStatus: "active", mustChangePassword: false, email: "test@example.invalid", emailVerifiedAt: null, ...overrides }, req: {}, res: {} } as TrpcContext);
}
describe("server-side access boundaries", () => {
  it("denies suspended users, including administrators", async () => {
    const api = caller({ accountStatus: "suspended", role: "admin" });
    await expect(api.privateData()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(api.administration()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(api.rotate()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
  it("allows password rotation but denies all protected data until rotation", async () => {
    const api = caller({ mustChangePassword: true, role: "admin" });
    await expect(api.rotate()).resolves.toBe(true);
    await expect(api.privateData()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(api.administration()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
  it("retains ordinary and privileged access for eligible accounts", async () => {
    await expect(caller().privateData()).resolves.toBe(true);
    await expect(caller().administration()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller({ role: "admin" }).administration()).resolves.toBe(true);
  });
  it("does not grant admin by an unverified email address", async () => {
    const before = ENV.adminEmails;
    ENV.adminEmails = ["test@example.invalid"];
    try {
      await expect(caller().administration()).rejects.toMatchObject({ code: "FORBIDDEN" });
      await expect(caller({ emailVerifiedAt: new Date() }).administration()).resolves.toBe(true);
    } finally { ENV.adminEmails = before; }
  });
});
