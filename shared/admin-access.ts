// Funções da equipe administrativa e as áreas que cada uma pode usar.
// Regras:
//  - dev e super_admin sempre têm acesso total.
//  - role "admin" sem função definida (campo vazio) tem acesso total, como antes.
//  - role "admin" com função usa só as áreas da função.
//  - função desconhecida não recebe nenhuma área (falha fechada).

export const adminScopes = [
  "users:read",
  "users:write",
  "users:delete",
  "profiles:read",
  "profiles:write",
  "moderation",
  "reports",
  "identity",
  "messages",
  "plans",
  "finance:read",
  "finance:write",
  "settings",
  "readiness",
  "audit",
] as const;

export type AdminScope = (typeof adminScopes)[number];

export const adminFunctionKeys = [
  "moderator",
  "support",
  "finance",
  "auditor",
] as const;

export type AdminFunction = (typeof adminFunctionKeys)[number];

export const adminFunctions: Record<
  AdminFunction,
  { label: string; text: string; scopes: readonly AdminScope[] }
> = {
  moderator: {
    label: "Moderador",
    text: "Aprova ou recusa anúncios e mídias, trata denúncias e verificações.",
    scopes: [
      "profiles:read",
      "profiles:write",
      "moderation",
      "reports",
      "identity",
    ],
  },
  support: {
    label: "Suporte",
    text: "Atende as mensagens do Fale conosco e cuida das contas (suspender, link de senha).",
    scopes: ["users:read", "users:write", "profiles:read", "messages"],
  },
  finance: {
    label: "Financeiro",
    text: "Gerencia planos, assinaturas e o caixa. Consulta contas e anúncios.",
    scopes: [
      "users:read",
      "profiles:read",
      "plans",
      "finance:read",
      "finance:write",
    ],
  },
  auditor: {
    label: "Auditoria",
    text: "Somente leitura: contas, anúncios, caixa, prontidão e registro de auditoria.",
    scopes: [
      "users:read",
      "profiles:read",
      "finance:read",
      "readiness",
      "audit",
    ],
  },
};

export function isAdminFunction(value: unknown): value is AdminFunction {
  return (
    typeof value === "string" &&
    (adminFunctionKeys as readonly string[]).includes(value)
  );
}

/**
 * Áreas liberadas para um administrador.
 * `configuredAdmin` = e-mail verificado listado em ADMIN_EMAILS (acesso total).
 */
export function resolveAdminScopes(input: {
  role: string;
  adminFunction?: string | null;
  configuredAdmin?: boolean;
}): readonly AdminScope[] {
  if (input.role === "dev" || input.role === "super_admin") return adminScopes;
  if (input.role === "admin") {
    const fn = input.adminFunction;
    if (fn === null || fn === undefined || fn === "") return adminScopes;
    return isAdminFunction(fn) ? adminFunctions[fn].scopes : [];
  }
  return input.configuredAdmin ? adminScopes : [];
}

export function hasAnyScope(
  granted: readonly AdminScope[],
  needed: readonly AdminScope[]
) {
  return needed.length === 0 || needed.some(scope => granted.includes(scope));
}

// Áreas do painel: quais permissões liberam cada aba (vazio = qualquer admin).
export const adminTabScopes: Record<string, readonly AdminScope[]> = {
  overview: [],
  advertisers: ["users:read"],
  identity: ["identity"],
  profiles: ["profiles:read"],
  moderation: ["moderation"],
  reviews: ["moderation"],
  reports: ["reports"],
  plans: ["plans"],
  payments: ["finance:read", "plans"],
  finance: ["finance:read"],
  analytics: ["users:read", "profiles:read", "finance:read", "plans", "identity"],
  messages: ["messages"],
  clients: ["users:read"],
  team: ["users:read"],
  settings: ["settings"],
  seo: ["settings"],
  readiness: ["readiness"],
  audit: ["audit"],
  security: [],
};

export type AdminTabKey = keyof typeof adminTabScopes;

export function allowedAdminTabs(granted: readonly AdminScope[]): AdminTabKey[] {
  return (Object.keys(adminTabScopes) as AdminTabKey[]).filter(key =>
    hasAnyScope(granted, adminTabScopes[key])
  );
}
