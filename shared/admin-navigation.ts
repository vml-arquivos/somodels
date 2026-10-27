import {
  adminTabScopes,
  allowedAdminTabs,
  hasAnyScope,
  type AdminScope,
} from "./admin-access";

export const adminTabLabels = {
  overview: "Visão geral",
  advertisers: "Anunciantes",
  identity: "Verificações",
  profiles: "Anúncios",
  moderation: "Moderação",
  reports: "Denúncias",
  plans: "Pacotes",
  payments: "Pagamentos",
  finance: "Caixa",
  analytics: "Relatórios",
  messages: "Mensagens",
  clients: "Clientes",
  team: "Equipe",
  settings: "Página inicial",
  seo: "SEO",
  readiness: "Prontidão",
  audit: "Auditoria",
  security: "Segurança",
} as const;

export type AdminTabKey = keyof typeof adminTabLabels;

export const adminTabPaths: Record<AdminTabKey, string> = {
  overview: "/admin",
  advertisers: "/admin/anunciantes",
  identity: "/admin/verificacoes",
  profiles: "/admin/anuncios",
  moderation: "/admin/moderacao",
  reports: "/admin/denuncias",
  plans: "/admin/pacotes",
  payments: "/admin/pagamentos",
  finance: "/admin/financeiro",
  analytics: "/admin/relatorios",
  messages: "/admin/mensagens",
  clients: "/admin/clientes",
  team: "/admin/equipe",
  settings: "/admin/pagina-inicial",
  seo: "/admin/seo",
  readiness: "/admin/prontidao",
  audit: "/admin/auditoria",
  security: "/admin/seguranca",
};

// Endereços antigos continuam funcionando (favoritos e links já enviados).
export const adminLegacyPaths: Record<string, AdminTabKey> = {
  "/admin/usuarios": "clients",
  "/admin/planos": "plans",
};

export const adminNavigationSections = [
  { key: "principal", label: "Principal", items: ["overview"] },
  {
    key: "advertisers",
    label: "Anunciantes",
    items: ["advertisers", "identity", "profiles", "moderation", "reports"],
  },
  { key: "commercial", label: "Comercial", items: ["plans", "payments", "finance"] },
  { key: "analytics", label: "Análises", items: ["analytics"] },
  { key: "support", label: "Atendimento", items: ["messages"] },
  { key: "people", label: "Contas", items: ["clients", "team"] },
  { key: "site", label: "Site", items: ["settings", "seo"] },
  {
    key: "system",
    label: "Sistema",
    items: ["readiness", "audit", "security"],
  },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  items: readonly AdminTabKey[];
}>;

export type AdminOperationalCounts = {
  pendingProfiles: number;
  pendingMedia: number;
  pendingIdentity: number;
  openReports: number;
  pendingSubscriptions: number;
  newMessages: number;
  followUps: number;
  overduePayments: number;
};

export type AdminNavigationBadgeCounts = Partial<Record<AdminTabKey, number>>;

export type AdminNavigationItem = {
  key: AdminTabKey;
  label: string;
  path: string;
  badge?: number;
};

export type AdminNavigationGroup = {
  key: string;
  label: string;
  items: AdminNavigationItem[];
};

/**
 * Produz a árvore visível do menu sem conhecer React ou o DOM.
 * Uma seção vazia desaparece para funções administrativas limitadas.
 */
export function groupAdminNavigation(
  granted: readonly AdminScope[],
  badges: AdminNavigationBadgeCounts = {}
): AdminNavigationGroup[] {
  const visible = new Set(allowedAdminTabs(granted) as AdminTabKey[]);
  return adminNavigationSections
    .map(section => ({
      key: section.key,
      label: section.label,
      items: section.items
        .filter(key => visible.has(key))
        .map(key => ({
          key,
          label: adminTabLabels[key],
          path: adminTabPaths[key],
          ...(badges[key] && badges[key]! > 0 ? { badge: badges[key] } : {}),
        })),
    }))
    .filter(section => section.items.length > 0);
}

/**
 * Mantém o contador fora da resposta quando o administrador não tem a área.
 * Assim a UI não vira um canal lateral para dados de outra função.
 */
export function adminNavigationBadges(
  granted: readonly AdminScope[],
  counts?: Partial<AdminOperationalCounts> | null
): AdminNavigationBadgeCounts {
  if (!counts) return {};
  const result: AdminNavigationBadgeCounts = {};
  if (hasAnyScope(granted, ["profiles:read"]))
    result.profiles = Number(counts.pendingProfiles ?? 0);
  if (hasAnyScope(granted, ["moderation"]))
    result.moderation =
      Number(counts.pendingProfiles ?? 0) + Number(counts.pendingMedia ?? 0);
  if (hasAnyScope(granted, ["identity"]))
    result.identity = Number(counts.pendingIdentity ?? 0);
  if (hasAnyScope(granted, ["reports"]))
    result.reports = Number(counts.openReports ?? 0);
  if (hasAnyScope(granted, ["plans"]))
    result.plans = Number(counts.pendingSubscriptions ?? 0);
  if (hasAnyScope(granted, ["messages"]))
    result.messages = Number(counts.newMessages ?? 0);
  if (hasAnyScope(granted, ["users:read"]))
    result.advertisers = Number(counts.followUps ?? 0);
  if (hasAnyScope(granted, ["finance:read", "plans"]))
    result.payments = Number(counts.overduePayments ?? 0);
  return result;
}

export function adminTabFromPath(path: string): AdminTabKey | null {
  const normalized = path.split("?")[0].replace(/\/+$/, "") || "/";
  const entry = (Object.entries(adminTabPaths) as [AdminTabKey, string][]).find(
    ([, candidate]) => candidate === normalized
  );
  return entry?.[0] ?? adminLegacyPaths[normalized] ?? null;
}

export function adminPathForTab(tab: AdminTabKey) {
  return adminTabPaths[tab];
}

export function adminNavigationCoversAllTabs() {
  const covered = new Set(
    adminNavigationSections.flatMap(section => section.items)
  );
  return Object.keys(adminTabScopes).every(key =>
    covered.has(key as AdminTabKey)
  );
}
