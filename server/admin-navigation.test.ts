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
        section: "Anunciantes",
        items: ["identity", "profiles", "moderation", "reviews", "reports"],
      },
      { section: "Análises", items: ["analytics"] },
      { section: "Sistema", items: ["security"] },
    ]);
  });

  it("mostra exatamente as áreas do suporte", () => {
    expect(
      shape(resolveAdminScopes({ role: "admin", adminFunction: "support" }))
    ).toEqual([
      { section: "Principal", items: ["overview"] },
      { section: "Anunciantes", items: ["advertisers", "profiles"] },
      { section: "Análises", items: ["analytics"] },
      { section: "Atendimento", items: ["messages"] },
      { section: "Contas", items: ["clients", "team"] },
      { section: "Sistema", items: ["security"] },
    ]);
  });

  it("mostra exatamente as áreas do financeiro", () => {
    expect(
      shape(resolveAdminScopes({ role: "admin", adminFunction: "finance" }))
    ).toEqual([
      { section: "Principal", items: ["overview"] },
      { section: "Anunciantes", items: ["advertisers", "profiles"] },
      { section: "Comercial", items: ["plans", "payments", "finance"] },
      { section: "Análises", items: ["analytics"] },
      { section: "Contas", items: ["clients", "team"] },
      { section: "Sistema", items: ["security"] },
    ]);
  });

  it("mantém auditoria somente leitura e inclui prontidão", () => {
    expect(
      shape(resolveAdminScopes({ role: "admin", adminFunction: "auditor" }))
    ).toEqual([
      { section: "Principal", items: ["overview"] },
      { section: "Anunciantes", items: ["advertisers", "profiles"] },
      { section: "Comercial", items: ["payments", "finance"] },
      { section: "Análises", items: ["analytics"] },
      { section: "Contas", items: ["clients", "team"] },
      { section: "Sistema", items: ["readiness", "audit", "security"] },
    ]);
  });

  it("mantém acesso completo e não cria seção vazia", () => {
    expect(shape(adminScopes)).toEqual([
      { section: "Principal", items: ["overview"] },
      {
        section: "Anunciantes",
        items: [
          "advertisers",
          "identity",
          "profiles",
          "moderation",
          "reviews",
          "reports",
        ],
      },
      { section: "Comercial", items: ["plans", "payments", "finance"] },
      { section: "Análises", items: ["analytics"] },
      { section: "Atendimento", items: ["messages"] },
      { section: "Contas", items: ["clients", "team"] },
      { section: "Site", items: ["settings", "seo"] },
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
      followUps: 8,
      overduePayments: 9,
      pendingReviews: 11,
    };
    expect(
      adminNavigationBadges(
        resolveAdminScopes({ role: "admin", adminFunction: "moderator" }),
        counts
      )
    ).toEqual({ profiles: 2, moderation: 5, reviews: 11, identity: 4, reports: 5 });
    expect(
      adminNavigationBadges(
        resolveAdminScopes({ role: "admin", adminFunction: "support" }),
        counts
      )
    ).toEqual({ profiles: 2, messages: 7, advertisers: 8 });
    expect(
      adminNavigationBadges(
        resolveAdminScopes({ role: "admin", adminFunction: "finance" }),
        counts
      )
    ).toEqual({ profiles: 2, plans: 6, advertisers: 8, payments: 9 });
  });

  it("normaliza URLs diretas e rejeita slugs desconhecidos", () => {
    expect(adminTabFromPath("/admin")).toBe("overview");
    expect(adminTabFromPath("/admin/anuncios/?from=menu")).toBe("profiles");
    expect(adminTabFromPath("/admin/seguranca")).toBe("security");
    expect(adminTabFromPath("/admin/usuarios")).toBe("clients");
    expect(adminTabFromPath("/admin/planos")).toBe("plans");
    expect(adminTabFromPath("/admin/relatorios")).toBe("analytics");
    expect(adminTabFromPath("/admin/nao-existe")).toBeNull();
    expect(adminPathForTab("reports")).toBe("/admin/denuncias");
  });
});
