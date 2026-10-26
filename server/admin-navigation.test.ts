import { describe, expect, it } from "vitest";
import {
  adminPathForTab,
  adminTabFromPath,
  adminNavigationBadges,
  adminNavigationCoversAllTabs,
  groupAdminNavigation,
} from "../shared/admin-navigation";
import { adminScopes, resolveAdminScopes } from "../shared/admin-access";

function shape(granted: readonly (typeof adminScopes)[number][]) {
  return groupAdminNavigation(granted).map(section => ({
    section: section.label,
    items: section.items.map(item => item.key),
  }));
}

describe("navegação administrativa", () => {
  it("mostra exatamente as áreas do moderador", () => {
    expect(
      shape(resolveAdminScopes({ role: "admin", adminFunction: "moderator" }))
    ).toEqual([
      { section: "Principal", items: ["overview"] },
      {
        section: "Conteúdo",
        items: ["profiles", "moderation", "identity", "reports"],
      },
      { section: "Sistema", items: ["security"] },
    ]);
  });

  it("mostra exatamente as áreas do suporte", () => {
    expect(
      shape(resolveAdminScopes({ role: "admin", adminFunction: "support" }))
    ).toEqual([
      { section: "Principal", items: ["overview"] },
      { section: "Pessoas", items: ["users"] },
      { section: "Conteúdo", items: ["profiles"] },
      { section: "Atendimento", items: ["messages"] },
      { section: "Sistema", items: ["security"] },
    ]);
  });

  it("mostra exatamente as áreas do financeiro", () => {
    expect(
      shape(resolveAdminScopes({ role: "admin", adminFunction: "finance" }))
    ).toEqual([
      { section: "Principal", items: ["overview"] },
      { section: "Pessoas", items: ["users"] },
      { section: "Conteúdo", items: ["profiles"] },
      { section: "Comercial", items: ["plans", "finance"] },
      { section: "Sistema", items: ["security"] },
    ]);
  });

  it("mantém auditoria somente leitura e inclui prontidão", () => {
    expect(
      shape(resolveAdminScopes({ role: "admin", adminFunction: "auditor" }))
    ).toEqual([
      { section: "Principal", items: ["overview"] },
      { section: "Pessoas", items: ["users"] },
      { section: "Conteúdo", items: ["profiles"] },
      { section: "Comercial", items: ["finance"] },
      { section: "Sistema", items: ["readiness", "audit", "security"] },
    ]);
  });

  it("mantém acesso completo e não cria seção vazia", () => {
    expect(shape(adminScopes)).toEqual([
      { section: "Principal", items: ["overview"] },
      { section: "Pessoas", items: ["users"] },
      {
        section: "Conteúdo",
        items: ["profiles", "moderation", "identity", "reports"],
      },
      { section: "Atendimento", items: ["messages"] },
      { section: "Comercial", items: ["plans", "finance"] },
      { section: "Site", items: ["settings"] },
      { section: "Sistema", items: ["readiness", "audit", "security"] },
    ]);
  });

  it("função desconhecida fica somente nas áreas sem escopo", () => {
    expect(
      shape(resolveAdminScopes({ role: "admin", adminFunction: "inventada" }))
    ).toEqual([
      { section: "Principal", items: ["overview"] },
      { section: "Sistema", items: ["security"] },
    ]);
  });

  it("cobre todas as chaves declaradas de aba", () => {
    expect(adminNavigationCoversAllTabs()).toBe(true);
  });

  it("entrega badges apenas para áreas autorizadas", () => {
    const counts = {
      pendingProfiles: 2,
      pendingMedia: 3,
      pendingIdentity: 4,
      openReports: 5,
      pendingSubscriptions: 6,
      newMessages: 7,
    };
    expect(
      adminNavigationBadges(
        resolveAdminScopes({ role: "admin", adminFunction: "moderator" }),
        counts
      )
    ).toEqual({ profiles: 2, moderation: 5, identity: 4, reports: 5 });
    expect(
      adminNavigationBadges(
        resolveAdminScopes({ role: "admin", adminFunction: "support" }),
        counts
      )
    ).toEqual({ profiles: 2, messages: 7 });
  });

  it("normaliza URLs diretas e rejeita slugs desconhecidos", () => {
    expect(adminTabFromPath("/admin")).toBe("overview");
    expect(adminTabFromPath("/admin/anuncios/?from=menu")).toBe("profiles");
    expect(adminTabFromPath("/admin/seguranca")).toBe("security");
    expect(adminTabFromPath("/admin/nao-existe")).toBeNull();
    expect(adminPathForTab("reports")).toBe("/admin/denuncias");
  });
});
