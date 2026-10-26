// Checklist de prontidão para receber cadastros e divulgar a vitrine.
// Função pura: recebe o estado e devolve itens com severidade, fácil de testar.
export type ReadinessInput = {
  publicAccessEnabled: boolean;
  publicLaunchEnabled: boolean;
  robotsNoIndex: boolean;
  testMode: boolean;
  allowFakeData: boolean;
  ageVerificationConfigured: boolean;
  requireIdentityVerification: boolean;
  storageConfigured: boolean;
  canonicalOriginSet: boolean;
  releaseKnown: boolean;
  contactChannelSet: boolean;
  operatorIdentified: boolean;
  adminMfaRequired: boolean;
  flags: {
    reportsEnabled: boolean;
    favoritesEnabled: boolean;
    blockingEnabled: boolean;
    secureContactEnabled: boolean;
    sponsoredListingsEnabled: boolean;
    paymentsEnabled: boolean;
  };
  counts: {
    publishedProfiles: number;
    pendingProfiles: number;
    pendingMedia: number;
    pendingIdentity: number;
    openReports: number;
    pendingSubscriptions: number;
    activePlans: number;
    owners: number;
  } | null;
};

export type ReadinessItem = {
  id: string;
  level: "ok" | "warn" | "block";
  title: string;
  detail: string;
};

export function buildReadiness(input: ReadinessInput): ReadinessItem[] {
  const items: ReadinessItem[] = [];
  const add = (id: string, level: ReadinessItem["level"], title: string, detail: string) =>
    items.push({ id, level, title, detail });

  add(
    "launch",
    input.publicAccessEnabled && input.publicLaunchEnabled ? "ok" : "block",
    "Vitrine aberta ao público",
    input.publicAccessEnabled && input.publicLaunchEnabled
      ? "PUBLIC_ACCESS_ENABLED e PUBLIC_LAUNCH_ENABLED ativos."
      : "Ative PUBLIC_ACCESS_ENABLED e PUBLIC_LAUNCH_ENABLED para receber cadastros e exibir anúncios."
  );
  add(
    "fake-data",
    input.testMode || input.allowFakeData ? "block" : "ok",
    "Sem modo de teste ou dados fictícios",
    input.testMode || input.allowFakeData
      ? "Desative TEST_MODE/ALLOW_FAKE_DATA em produção."
      : "Produção sem dados de demonstração."
  );
  add(
    "indexing",
    input.robotsNoIndex ? "block" : "ok",
    "Indexação nos buscadores",
    input.robotsNoIndex ? "ROBOTS_NOINDEX está ativo: o site não aparecerá no Google." : "Indexação liberada."
  );
  add(
    "canonical",
    input.canonicalOriginSet ? "ok" : "block",
    "Origem canônica",
    input.canonicalOriginSet ? "CANONICAL_ORIGIN definido." : "Defina CANONICAL_ORIGIN."
  );
  add(
    "age",
    input.ageVerificationConfigured ? "ok" : "block",
    "Confirmação de maioridade",
    input.ageVerificationConfigured ? "Configurada." : "Configure AGE_VERIFICATION_MODE."
  );
  add(
    "contact-channel",
    input.contactChannelSet ? "ok" : "block",
    "Canal de contato e privacidade",
    input.contactChannelSet
      ? "CONTACT_EMAIL definido; aparece em /contato e /privacidade."
      : "Defina CONTACT_EMAIL (e PRIVACY_EMAIL, se for outro). Sem canal, as páginas de contato e privacidade ficam incompletas."
  );
  add(
    "operator",
    input.operatorIdentified ? "ok" : "warn",
    "Identificação do responsável",
    input.operatorIdentified
      ? "Responsável identificado nas páginas legais."
      : "Defina OPERATOR_NAME e OPERATOR_DOCUMENT (nome/razão social e CPF/CNPJ) para a política de privacidade."
  );
  add(
    "storage",
    input.storageConfigured ? "ok" : "block",
    "Armazenamento de fotos e vídeos",
    input.storageConfigured ? "Configurado." : "Sem armazenamento, anunciantes não conseguem enviar mídia."
  );
  add(
    "reports",
    input.flags.reportsEnabled ? "ok" : "warn",
    "Denúncias",
    input.flags.reportsEnabled
      ? "Ativas. Defina quem atende a fila e em quanto tempo."
      : "Desligadas. Ligue REPORTS_ENABLED antes de divulgar o site."
  );
  add(
    "contact",
    input.flags.secureContactEnabled ? "ok" : "warn",
    "Contato com o anunciante",
    input.flags.secureContactEnabled ? "Ativo para contas logadas." : "SECURE_CONTACT_ENABLED desligado: visitantes não conseguem falar com anunciantes."
  );
  add(
    "client-features",
    input.flags.favoritesEnabled && input.flags.blockingEnabled ? "ok" : "warn",
    "Favoritos e bloqueios",
    input.flags.favoritesEnabled && input.flags.blockingEnabled
      ? "Ativos."
      : "Desligados. Ligue FAVORITES_ENABLED e BLOCKING_ENABLED para a área do cliente ficar completa."
  );
  add(
    "admin-mfa",
    input.adminMfaRequired ? "ok" : "warn",
    "Verificação em duas etapas do admin",
    input.adminMfaRequired
      ? "Obrigatória para administradores."
      : "Opcional. Cadastre o autenticador de cada admin e depois ligue ADMIN_MFA_REQUIRED."
  );
  add(
    "identity",
    input.requireIdentityVerification ? "ok" : "warn",
    "Verificação de identidade obrigatória",
    input.requireIdentityVerification
      ? "Exigida para enviar anúncio à revisão."
      : "Opcional. O selo 'identidade verificada' só aparece para quem passou pela verificação."
  );
  add(
    "release",
    input.releaseKnown ? "ok" : "warn",
    "Versão publicada identificada",
    input.releaseKnown ? "Release identificado." : "Versão em execução não identificada."
  );

  if (input.counts) {
    const c = input.counts;
    add(
      "plans",
      c.activePlans > 0 ? "ok" : "warn",
      "Planos cadastrados",
      c.activePlans > 0
        ? `${c.activePlans} plano(s) ativo(s).`
        : "Nenhum plano ativo. Cadastre na aba Planos e ligue SPONSORED_LISTINGS_ENABLED para o destaque valer."
    );
    add(
      "plans-sponsored",
      input.flags.sponsoredListingsEnabled || c.activePlans === 0 ? "ok" : "warn",
      "Destaque patrocinado",
      input.flags.sponsoredListingsEnabled
        ? "Ligado: planos em destaque sobem na vitrine, com rótulo."
        : "SPONSORED_LISTINGS_ENABLED desligado: planos em destaque não alteram a ordem."
    );
    add(
      "supply",
      c.publishedProfiles > 0 ? "ok" : "warn",
      "Anúncios publicados",
      c.publishedProfiles > 0
        ? `${c.publishedProfiles} anúncio(s) na vitrine.`
        : "Nenhum anúncio publicado ainda: a vitrine aparece vazia para o público."
    );
    const backlog = c.pendingProfiles + c.pendingMedia + c.pendingIdentity + c.pendingSubscriptions + c.openReports;
    add(
      "backlog",
      backlog === 0 ? "ok" : c.openReports > 0 ? "warn" : "ok",
      "Fila de trabalho",
      `${c.pendingProfiles} anúncio(s), ${c.pendingMedia} mídia(s), ${c.pendingIdentity} verificação(ões), ${c.pendingSubscriptions} pedido(s) de plano e ${c.openReports} denúncia(s) aguardando.`
    );
  }
  return items;
}
