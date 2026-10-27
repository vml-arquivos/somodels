import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  adminFunctionKeys,
  adminFunctions,
  adminScopes,
  adminTabScopes,
  allowedAdminTabs,
  hasAnyScope,
  resolveAdminScopes,
} from "../shared/admin-access";
import { router, scopedProcedure } from "./_core/trpc";
import { ENV } from "./_core/env";
import type { TrpcContext } from "./_core/context";

const routes = router({
  moderate: scopedProcedure("moderation").query(() => "ok"),
  money: scopedProcedure("finance:read", "plans").query(() => "ok"),
  settings: scopedProcedure("settings").query(() => "ok"),
});
function caller(overrides: Record<string, unknown> = {}) {
  return routes.createCaller({
    user: {
      id: 1,
      role: "admin",
      adminFunction: null,
      accountStatus: "active",
      mustChangePassword: false,
      email: "equipe@example.invalid",
      emailVerifiedAt: null,
      ...overrides,
    },
    req: {},
    res: {},
  } as TrpcContext);
}

describe("funções da equipe", () => {
  it("mantém acesso total para dev, super admin e admin sem função", () => {
    for (const role of ["dev", "super_admin"])
      expect(resolveAdminScopes({ role, adminFunction: "auditor" })).toEqual(adminScopes);
    expect(resolveAdminScopes({ role: "admin", adminFunction: null })).toEqual(adminScopes);
    expect(resolveAdminScopes({ role: "admin" })).toEqual(adminScopes);
    expect(resolveAdminScopes({ role: "user", configuredAdmin: true })).toEqual(adminScopes);
  });

  it("função desconhecida e conta comum não recebem nada", () => {
    expect(resolveAdminScopes({ role: "admin", adminFunction: "inventada" })).toEqual([]);
    expect(resolveAdminScopes({ role: "user" })).toEqual([]);
  });

  it("cada função tem só as áreas esperadas", () => {
    const tabs = (fn: string) =>
      allowedAdminTabs(resolveAdminScopes({ role: "admin", adminFunction: fn }));
    expect(tabs("moderator")).toEqual(
      expect.arrayContaining(["overview", "profiles", "moderation", "reports", "identity", "security"])
    );
    expect(tabs("moderator")).not.toContain("finance");
    expect(tabs("moderator")).not.toContain("clients");
    expect(tabs("moderator")).not.toContain("advertisers");
    expect(tabs("support")).toEqual(
      expect.arrayContaining(["clients", "advertisers", "profiles", "messages"])
    );
    expect(tabs("support")).not.toContain("finance");
    expect(tabs("finance")).toEqual(expect.arrayContaining(["plans", "payments", "finance", "advertisers"]));
    expect(tabs("finance")).not.toContain("moderation");
    expect(tabs("auditor")).toEqual(
      expect.arrayContaining(["audit", "finance", "readiness", "clients", "profiles"])
    );
  });

  it("auditoria é somente leitura", () => {
    const granted = resolveAdminScopes({ role: "admin", adminFunction: "auditor" });
    for (const scope of granted) expect(scope).not.toMatch(/:write$|:delete$/);
    expect(hasAnyScope(granted, ["moderation"])).toBe(false);
  });

  it("só o acesso completo muda configurações e exclui contas", () => {
    for (const key of adminFunctionKeys) {
      const granted = adminFunctions[key].scopes;
      expect(granted).not.toContain("settings");
      expect(granted).not.toContain("users:delete");
    }
  });

  it("toda função só usa áreas que existem", () => {
    for (const key of adminFunctionKeys)
      for (const scope of adminFunctions[key].scopes)
        expect(adminScopes).toContain(scope);
    for (const needed of Object.values(adminTabScopes))
      for (const scope of needed) expect(adminScopes).toContain(scope);
  });
});

describe("bloqueio no servidor por área", () => {
  it("admin sem função passa em tudo", async () => {
    await expect(caller().moderate()).resolves.toBe("ok");
    await expect(caller().settings()).resolves.toBe("ok");
  });

  it("moderador usa moderação e é barrado em financeiro e configurações", async () => {
    const api = caller({ adminFunction: "moderator" });
    await expect(api.moderate()).resolves.toBe("ok");
    await expect(api.money()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(api.settings()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("basta uma das áreas listadas", async () => {
    await expect(caller({ adminFunction: "finance" }).money()).resolves.toBe("ok");
    await expect(caller({ adminFunction: "auditor" }).money()).resolves.toBe("ok");
    await expect(caller({ adminFunction: "support" }).money()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("função desconhecida é barrada", async () => {
    await expect(caller({ adminFunction: "x" }).moderate()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("conta comum continua sem acesso", async () => {
    await expect(caller({ role: "user" }).moderate()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("e-mail da lista ADMIN_EMAILS verificado tem acesso total", async () => {
    const before = ENV.adminEmails;
    ENV.adminEmails = ["equipe@example.invalid"];
    try {
      await expect(
        caller({ role: "user", emailVerifiedAt: new Date() }).settings()
      ).resolves.toBe("ok");
    } finally {
      ENV.adminEmails = before;
    }
  });
});

describe("cobertura das rotas administrativas", () => {
  it("nenhuma rota do admin usa adminProcedure sem escopo, exceto as liberadas", () => {
    const allowedPlain = new Set(["overview", "assertPasswordPolicy"]);
    for (const file of ["server/routers.ts", "server/management.ts", "server/_core/systemRouter.ts"]) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/\n\s+(\w+): adminProcedure\b/g))
        expect(allowedPlain.has(match[1]), `${file}: ${match[1]}`).toBe(true);
    }
  });
});
