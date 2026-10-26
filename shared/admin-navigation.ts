import {
  adminTabScopes,
  allowedAdminTabs,
  hasAnyScope,
  type AdminScope,
} from "./admin-access";

export const adminTabLabels = {
  overview: "Visão geral",
  users: "Usuários",
  profiles: "Anúncios",
  moderation: "Moderação",
  reports: "Denúncias",
  identity: "Verificações",
  plans: "Planos e assinaturas",
  messages: "Mensagens",
  readiness: "Prontidão",
  security: "Segurança",
  finance: "Financeiro",
  settings: "Página inicial",
  audit: "Auditoria",
} as const;

export type AdminTabKey = keyof typeof adminTabLabels;

export const adminTabPaths: Record<AdminTabKey, string> = {
  overview: "/admin",
  users: "/admin/usuarios",
  profiles: "/admin/anuncios",
  moderation: "/admin/moderacao",
  reports: "/admin/denuncias",
  identity: "/admin/verificacoes",
  plans: "/admin/planos",
  messages: "/admin/mensagens",
  readiness: "/admin/prontidao",
  security: "/admin/seguranca",
  finance: "/admin/financeiro",
  settings: "/admin/pagina-inicial",
  audit: "/admin/auditoria",
};

export const adminNavigationSections = [
  { key: "principal", label: "Principal", items: ["overview"] },
  { key: "people", label: "Pessoas", items: ["users"] },
  {
    key: "content",
    label: "Conteúdo",
    items: ["profiles", "moderation", "identity", "reports"],
  },
  { key: "support", label: "Atendimento", items: ["messages"] },
  { key: "commercial", label: "Comercial", items: ["plans", "finance"] },
  { key: "site", label: "Site", items: ["settings"] },
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
  return result;
}

export function adminTabFromPath(path: string): AdminTabKey | null {
  const normalized = path.split("?")[0].replace(/\/+$/, "") || "/";
  const entry = (Object.entries(adminTabPaths) as [AdminTabKey, string][]).find(
    ([, candidate]) => candidate === normalized
  );
  return entry?.[0] ?? null;
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
