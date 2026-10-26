import { z } from "zod";

export const portfolioCategories = [
  "Acompanhante",
  "Acompanhante feminina",
  "Acompanhante masculino",
  "Acompanhante trans",
  "Casal ou dupla",
  "Massagem",
  "Virtual",
  "Anfitriã",
] as const;

export const portfolioPolicy =
  "Portal adulto para anúncios legais de acompanhantes. Não são permitidos menores, exploração, coerção, violência, fraude, conteúdo não consensual ou uso de imagens sem autorização.";

export const portfolioTermsVersion = "2026-10-05";
export const portfolioTermsTitle =
  "Termo de anúncio adulto, responsabilidade e publicação";
export const portfolioTermsClauses = [
  "Declaro ter 18 anos ou mais e capacidade legal para administrar este anúncio.",
  "Declaro ser o titular responsável pelo anúncio ou possuir autorização expressa para administrar seus dados, imagens, vídeos, nome artístico e canais de contato.",
  "Assumo responsabilidade pela veracidade, legalidade e atualização das informações que envio ou autorizo publicar.",
  "Anúncios adultos e conteúdos sexualmente explícitos somente podem ser publicados quando forem legais, consensuais, destinados exclusivamente a maiores de 18 anos e compatíveis com as regras da plataforma e da legislação aplicável.",
  "Não publicarei conteúdo envolvendo menores, exploração, tráfico, coerção, violência, ameaça, fraude, impersonação, violação de privacidade, mídia não consensual, atividade ilegal ou material sem autorização.",
  "Autorizo a Ero Models a armazenar, exibir, moderar, ocultar ou remover o anúncio e seus arquivos conforme estes termos, as regras da plataforma e a legislação aplicável.",
  "Compreendo que a plataforma fornece infraestrutura de anúncio e moderação, não intermedeia a negociação externa e não garante a conduta, identidade ou segurança de terceiros.",
  "Compreendo que alterações relevantes nos dados, fotos ou vídeos exigem novo aceite antes da próxima aprovação ou publicação.",
] as const;

export const portfolioTermsText = [
  portfolioTermsTitle,
  `Versão ${portfolioTermsVersion}`,
  ...portfolioTermsClauses.map((clause, index) => `${index + 1}. ${clause}`),
].join("\n\n");

const brazilianAreaCodes = new Set([
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "21",
  "22",
  "24",
  "27",
  "28",
  "31",
  "32",
  "33",
  "34",
  "35",
  "37",
  "38",
  "41",
  "42",
  "43",
  "44",
  "45",
  "46",
  "47",
  "48",
  "49",
  "51",
  "53",
  "54",
  "55",
  "61",
  "62",
  "63",
  "64",
  "65",
  "66",
  "67",
  "68",
  "69",
  "71",
  "73",
  "74",
  "75",
  "77",
  "79",
  "81",
  "82",
  "83",
  "84",
  "85",
  "86",
  "87",
  "88",
  "89",
  "91",
  "92",
  "93",
  "94",
  "95",
  "96",
  "97",
  "98",
  "99",
]);

export function normalizePhone(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (!/^[+\d\s().-]+$/.test(raw)) throw new Error("Telefone inválido");
  let digits = raw.replace(/\D/g, "");
  if (!raw.startsWith("+") && (digits.length === 10 || digits.length === 11))
    digits = `55${digits}`;
  if (!/^[1-9]\d{9,14}$/.test(digits))
    throw new Error("Informe DDI, DDD e telefone válidos");
  if (
    digits.startsWith("55") &&
    (digits.length === 12 || digits.length === 13)
  ) {
    const areaCode = digits.slice(2, 4);
    const subscriber = digits.slice(4);
    if (!brazilianAreaCodes.has(areaCode))
      throw new Error("Informe um DDD brasileiro válido");
    if (subscriber.length === 9 && !subscriber.startsWith("9"))
      throw new Error("Celular brasileiro deve ter 9 dígitos e começar com 9");
  }
  return `+${digits}`;
}

export function contactLinks(phone?: string | null, whatsapp?: string | null) {
  try {
    const p = normalizePhone(phone || "");
    const w = normalizePhone(whatsapp || phone || "");
    return {
      tel: p ? `tel:${p}` : null,
      whatsapp: w ? `https://wa.me/${w.slice(1)}` : null,
    };
  } catch {
    return { tel: null, whatsapp: null };
  }
}

export const portfolioStatusLabels = {
  draft: "Rascunho",
  pending: "Aguardando moderação",
  approved: "Aprovado oculto",
  rejected: "Ajustes solicitados",
  suspended: "Suspenso",
} as const;

export function portfolioPublicationLabel(profile: {
  status?: keyof typeof portfolioStatusLabels;
  isPublished?: boolean;
  portfolioReviewed?: boolean;
}) {
  if (profile.status === "suspended") return portfolioStatusLabels.suspended;
  if (profile.isPublished && profile.portfolioReviewed)
    return "Publicado na vitrine";
  if (profile.status && profile.status in portfolioStatusLabels)
    return portfolioStatusLabels[profile.status];
  return "Ainda não publicado";
}

export function profileOperationalLabel(profile: {
  isActive?: boolean | null;
  deletedAt?: Date | string | null;
}) {
  if (profile.deletedAt) return "Excluído";
  return profile.isActive === false ? "Inativo" : "Ativo";
}

const homeCopySchema = z.object({
  nav: z.object({
    explore: z.string().trim().min(2).max(40),
    search: z.string().trim().min(2).max(40),
    categories: z.string().trim().min(2).max(40),
    login: z.string().trim().min(2).max(40),
    theme: z.string().trim().min(2).max(40),
    themeLight: z.string().trim().min(2).max(40),
    themeDark: z.string().trim().min(2).max(40),
    install: z.string().trim().min(2).max(40),
    account: z.string().trim().min(2).max(40),
    owner: z.string().trim().min(2).max(40),
    createProfile: z.string().trim().min(2).max(50),
  }),
  hero: z.object({
    eyebrow: z.string().trim().min(2).max(80),
    title: z.string().trim().min(3).max(140),
    subtitle: z.string().trim().min(3).max(400),
    searchLabel: z.string().trim().min(2).max(80),
    searchPlaceholder: z.string().trim().min(2).max(80),
    locationLabel: z.string().trim().min(2).max(80),
    locationPlaceholder: z.string().trim().min(2).max(80),
    buttonText: z.string().trim().min(2).max(60),
    notes: z.array(z.string().trim().min(2).max(80)).length(3),
    visualTitle: z.string().trim().min(3).max(160),
    visualSubtitle: z.string().trim().min(3).max(140),
    imageAlt: z.string().trim().min(3).max(180),
  }),
  quickLinks: z.object({
    kicker: z.string().trim().min(2).max(80),
    title: z.string().trim().min(3).max(120),
    items: z
      .array(z.object({ label: z.string().trim().min(2).max(60) }))
      .length(4),
  }),
  trust: z.object({
    kicker: z.string().trim().min(2).max(80),
    title: z.string().trim().min(3).max(140),
    text: z.string().trim().min(3).max(260),
    points: z
      .array(
        z.object({
          marker: z.string().trim().min(1).max(12),
          title: z.string().trim().min(2).max(80),
          text: z.string().trim().min(3).max(180),
        })
      )
      .length(4),
  }),
  holder: z.object({
    kicker: z.string().trim().min(2).max(80),
    title: z.string().trim().min(3).max(140),
    text: z.string().trim().min(3).max(300),
    buttonText: z.string().trim().min(2).max(60),
    benefits: z.array(z.string().trim().min(2).max(60)).length(4),
  }),
  featured: z.object({
    kicker: z.string().trim().min(2).max(80),
    title: z.string().trim().min(3).max(140),
    text: z.string().trim().min(3).max(260),
  }),
  catalog: z.object({
    kicker: z.string().trim().min(2).max(80),
    title: z.string().trim().min(3).max(140),
    status: z.string().trim().min(2).max(100),
    loadingText: z.string().trim().min(2).max(100),
    listErrorText: z.string().trim().min(3).max(180),
    resultsEmptyTitle: z.string().trim().min(3).max(140),
    resultsEmptyText: z.string().trim().min(3).max(300),
    resultsEmptyButton: z.string().trim().min(2).max(60),
    launchKicker: z.string().trim().min(2).max(80),
    launchTitle: z.string().trim().min(3).max(140),
    launchText: z.string().trim().min(3).max(300),
    launchButton: z.string().trim().min(2).max(60),
    errorText: z.string().trim().min(3).max(180),
  }),
  searchBand: z.object({
    kicker: z.string().trim().min(2).max(80),
    title: z.string().trim().min(3).max(120),
    text: z.string().trim().min(3).max(260),
    buttonText: z.string().trim().min(2).max(60),
    artLabel: z.string().trim().min(2).max(60),
    artFallback: z.string().trim().min(2).max(80),
    artCaption: z.string().trim().min(2).max(120),
  }),
  categories: z.object({
    kicker: z.string().trim().min(2).max(80),
    title: z.string().trim().min(3).max(140),
    text: z.string().trim().min(3).max(260),
    emptyTitle: z.string().trim().min(3).max(140),
    emptyText: z.string().trim().min(3).max(300),
    emptyButton: z.string().trim().min(2).max(60),
    locationsKicker: z.string().trim().min(2).max(80),
  }),
  about: z.object({
    kicker: z.string().trim().min(2).max(80),
    title: z.string().trim().min(3).max(160),
    text: z.string().trim().min(3).max(1200),
    policyLink: z.string().trim().min(2).max(100),
  }),
  footer: z.object({
    tagline: z.string().trim().min(3).max(260),
    ageNote: z.string().trim().min(3).max(120),
    signature: z.string().trim().min(2).max(160),
    closing: z.string().trim().min(2).max(160),
    groups: z
      .array(
        z.object({
          title: z.string().trim().min(2).max(60),
          links: z
            .array(z.object({ label: z.string().trim().min(2).max(60) }))
            .length(3),
        })
      )
      .length(4),
  }),
});

export const siteSettingsSchema = z.object({
  eyebrow: z.string().trim().min(3).max(80),
  title: z.string().trim().min(3).max(120),
  subtitle: z.string().trim().min(3).max(400),
  heroVisualTitle: z.string().trim().min(3).max(160),
  heroVisualSubtitle: z.string().trim().min(3).max(120),
  buttonText: z.string().trim().min(2).max(50),
  searchPlaceholder: z.string().trim().min(2).max(80),
  emptyTitle: z.string().trim().min(3).max(120),
  emptyText: z.string().trim().min(3).max(400),
  about: z.string().trim().min(3).max(1200),
  footer: z.string().trim().min(2).max(250),
  showGallery: z.boolean(),
  showAbout: z.boolean(),
  showContact: z.boolean(),
  home: homeCopySchema,
});

export const defaultSiteSettings = {
  eyebrow: "Ero Models",
  title: "Encontre o perfil certo para o seu momento.",
  subtitle: "Descubra perfis adultos por cidade, categoria e preferência.",
  heroVisualTitle: "Respeito, segurança e privacidade.",
  heroVisualSubtitle: "Uma vitrine adulta com informação clara.",
  buttonText: "Buscar perfis",
  searchPlaceholder: "Nome, cidade ou palavra-chave",
  emptyTitle: "Nenhum anúncio publicado ainda",
  emptyText:
    "A vitrine está pronta para receber os primeiros anúncios que concluírem os critérios automáticos de segurança.",
  about:
    "A Ero Models é uma plataforma adulta de anúncios. Cada titular controla o que deseja publicar, com age gate, privacidade, moderação e canais de denúncia disponíveis.",
  footer: "Ero Models • Portal adulto de anúncios para maiores de 18 anos.",
  showGallery: true,
  showAbout: true,
  showContact: true,
  home: {
    nav: {
      explore: "Visualizar todos",
      search: "Buscar",
      categories: "Categorias",
      login: "Entrar",
      theme: "Tema claro",
      themeLight: "Tema claro",
      themeDark: "Tema escuro",
      install: "Instalar app",
      account: "Minha conta",
      owner: "Área do titular",
      createProfile: "Criar meu perfil",
    },
    hero: {
      eyebrow: "Ero Models",
      title: "Encontre acompanhantes com privacidade e clareza.",
      subtitle:
        "Pesquise perfis adultos por cidade, categoria e disponibilidade. Veja informações públicas, critérios de publicação e contato autorizado quando disponível.",
      searchLabel: "O que você procura?",
      searchPlaceholder: "Nome, cidade ou palavra-chave",
      locationLabel: "Onde?",
      locationPlaceholder: "Sua cidade",
      buttonText: "Encontrar acompanhantes",
      notes: [
        "Publicação automática",
        "Contato autorizado",
        "Privacidade por padrão",
      ],
      visualTitle: "Respeito, segurança e privacidade.",
      visualSubtitle: "Uma vitrine adulta com informação clara.",
      imageAlt: "Atmosfera editorial da Ero Models",
    },
    quickLinks: {
      kicker: "Explore a plataforma",
      title: "Comece pelo que procura.",
      items: [
        { label: "Ver anúncios" },
        { label: "Explorar categorias" },
        { label: "Minha conta" },
        { label: "Criar meu perfil" },
      ],
    },
    trust: {
      kicker: "Uma experiência mais clara",
      title: "Escolha com informação e tranquilidade.",
      text: "A Ero Models organiza a descoberta para que cada pessoa encontre o que procura sem excesso de ruído.",
      points: [
        {
          marker: "18+",
          title: "Acesso adulto",
          text: "Uma experiência exclusiva para maiores de idade.",
        },
        {
          marker: "01",
          title: "Publicação com controles",
          text: "Perfis e mídias passam pelos critérios automáticos e podem ser moderados.",
        },
        {
          marker: "02",
          title: "Privacidade por padrão",
          text: "Contato e dados sensíveis só aparecem quando autorizados.",
        },
        {
          marker: "03",
          title: "Denúncia e cuidado",
          text: "Ferramentas de segurança acompanham a experiência pública.",
        },
      ],
    },
    holder: {
      kicker: "Para titulares",
      title: "Crie seu perfil e seja encontrado.",
      text: "Um cadastro guiado para apresentar seu trabalho, controlar suas informações e publicar quando estiver pronto.",
      buttonText: "Começar cadastro",
      benefits: [
        "Nome artístico",
        "Galeria própria",
        "Localização aproximada",
        "Controle no painel",
      ],
    },
    featured: {
      kicker: "Perfis publicados",
      title: "Veja quem já está na vitrine.",
      text: "Uma seleção do catálogo público disponível agora.",
    },
    catalog: {
      kicker: "Catálogo público",
      title: "Encontre perfis do seu jeito",
      status: "Atualizado conforme a publicação",
      loadingText: "Carregando anúncios…",
      listErrorText: "Não foi possível carregar os anúncios.",
      resultsEmptyTitle: "Nenhum anúncio publicado ainda",
      resultsEmptyText:
        "A vitrine está pronta para receber os primeiros anúncios publicados.",
      resultsEmptyButton: "Quero criar um perfil",
      launchKicker: "Em preparação",
      launchTitle: "Os primeiros perfis publicados chegam aqui.",
      launchText:
        "A vitrine está pronta para receber cadastros e publicar somente o que passar pelos critérios do ambiente.",
      launchButton: "Criar um perfil",
      errorText: "Não foi possível carregar a configuração da vitrine.",
    },
    searchBand: {
      kicker: "Busca personalizada",
      title: "Filtre pelo que importa.",
      text: "Use características, disponibilidade, categoria e localização para chegar ao anúncio certo em poucos passos.",
      buttonText: "Abrir busca completa",
      artLabel: "Buscando em",
      artFallback: "todo o Brasil",
      artCaption: "Perfis, categorias e disponibilidade",
    },
    categories: {
      kicker: "Navegue por afinidade",
      title: "Categorias e localidades para começar.",
      text: "Escolha um caminho e explore somente o catálogo disponível para publicação pública.",
      emptyTitle: "O catálogo está sendo preparado.",
      emptyText:
        "As categorias e localidades aparecem aqui conforme os primeiros perfis aprovados entram na vitrine.",
      emptyButton: "Criar um perfil",
      locationsKicker: "Localidades",
    },
    about: {
      kicker: "Sobre a Ero Models",
      title: "Uma vitrine adulta para encontrar e ser encontrado.",
      text: "A Ero Models é uma plataforma adulta de anúncios. Cada titular controla o que deseja publicar, com age gate, privacidade, moderação e canais de denúncia disponíveis.",
      policyLink: "Conheça as regras de segurança",
    },
    footer: {
      tagline:
        "Uma vitrine adulta para descobrir perfis com clareza, respeito e privacidade.",
      ageNote: "Conteúdo exclusivo para maiores de 18 anos.",
      signature: "Ero Models • Portal adulto de anúncios.",
      closing: "Respeito, segurança e dignidade.",
      groups: [
        {
          title: "Explorar",
          links: [
            { label: "Ver anúncios" },
            { label: "Categorias" },
            { label: "Minha conta" },
          ],
        },
        {
          title: "Para titulares",
          links: [
            { label: "Criar meu perfil" },
            { label: "Área do titular" },
            { label: "Entrar" },
          ],
        },
        {
          title: "Segurança",
          links: [
            { label: "Como funciona" },
            { label: "Privacidade" },
            { label: "Denúncias" },
          ],
        },
        {
          title: "Institucional",
          links: [
            { label: "Termos" },
            { label: "Ajuda" },
            { label: "Contato" },
          ],
        },
      ],
    },
  },
};

export type SiteSettings = z.infer<typeof siteSettingsSchema>;

function normalizeLegacyBrand(value: unknown): unknown {
  if (typeof value === "string") {
    const branded = value
      .replace(/Só Models/gi, "Ero Models")
      .replace(/So Models/gi, "Ero Models");
    const legacyDefaults: Record<string, string> = {
      "Publicação revisada": "Publicação automática",
      "Perfis e mídias passam por etapas de publicação e moderação.":
        "Perfis e mídias passam pelos critérios automáticos e podem ser moderados.",
      "Um cadastro guiado para apresentar seu trabalho, controlar suas informações e enviar o perfil para revisão.":
        "Um cadastro guiado para apresentar seu trabalho, controlar suas informações e publicar quando estiver pronto.",
      "A vitrine está pronta para receber os primeiros anúncios aprovados.":
        "A vitrine está pronta para receber os primeiros anúncios publicados.",
      "Os primeiros perfis aprovados chegam aqui.":
        "Os primeiros perfis publicados chegam aqui.",
      "A Ero Models é uma plataforma adulta de anúncios. Cada titular controla o que deseja publicar, e a operação mantém revisão, age gate, privacidade, moderação e canais de denúncia antes da abertura pública.":
        "A Ero Models é uma plataforma adulta de anúncios. Cada titular controla o que deseja publicar, com age gate, privacidade, moderação e canais de denúncia disponíveis.",
    };
    return legacyDefaults[branded] ?? branded;
  }
  if (Array.isArray(value)) return value.map(normalizeLegacyBrand);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        normalizeLegacyBrand(entry),
      ])
    );
  }
  return value;
}

export function normalizeSiteSettings(value: unknown): SiteSettings {
  const normalizedValue = normalizeLegacyBrand(value);
  const persisted =
    normalizedValue && typeof normalizedValue === "object"
      ? (normalizedValue as Record<string, unknown>)
      : {};
  const persistedHome =
    persisted.home && typeof persisted.home === "object"
      ? (persisted.home as Record<string, any>)
      : {};
  const legacyText = (key: string) =>
    typeof persisted[key] === "string" ? { [key]: persisted[key] } : {};
  const legacyHero = {
    ...legacyText("eyebrow"),
    ...legacyText("title"),
    ...legacyText("subtitle"),
    ...legacyText("searchPlaceholder"),
    ...legacyText("buttonText"),
    ...(typeof persisted.heroVisualTitle === "string"
      ? { visualTitle: persisted.heroVisualTitle }
      : {}),
    ...(typeof persisted.heroVisualSubtitle === "string"
      ? { visualSubtitle: persisted.heroVisualSubtitle }
      : {}),
  };
  const legacyCatalog = {
    ...(typeof persisted.emptyTitle === "string"
      ? { launchTitle: persisted.emptyTitle }
      : {}),
    ...(typeof persisted.emptyText === "string"
      ? { launchText: persisted.emptyText }
      : {}),
  };
  const legacyAbout =
    typeof persisted.about === "string" ? { text: persisted.about } : {};
  const legacyFooter =
    typeof persisted.footer === "string" ? { tagline: persisted.footer } : {};
  const listOrDefault = (value: unknown, fallback: unknown[]) =>
    Array.isArray(value) && value.length === fallback.length ? value : fallback;
  const home = {
    ...defaultSiteSettings.home,
    ...persistedHome,
    nav: { ...defaultSiteSettings.home.nav, ...(persistedHome.nav || {}) },
    hero: {
      ...defaultSiteSettings.home.hero,
      ...legacyHero,
      ...(persistedHome.hero || {}),
      notes: listOrDefault(
        persistedHome.hero?.notes,
        defaultSiteSettings.home.hero.notes
      ),
    },
    quickLinks: {
      ...defaultSiteSettings.home.quickLinks,
      ...(persistedHome.quickLinks || {}),
      items: listOrDefault(
        persistedHome.quickLinks?.items,
        defaultSiteSettings.home.quickLinks.items
      ),
    },
    trust: {
      ...defaultSiteSettings.home.trust,
      ...(persistedHome.trust || {}),
      points: listOrDefault(
        persistedHome.trust?.points,
        defaultSiteSettings.home.trust.points
      ),
    },
    holder: {
      ...defaultSiteSettings.home.holder,
      ...(persistedHome.holder || {}),
      benefits: listOrDefault(
        persistedHome.holder?.benefits,
        defaultSiteSettings.home.holder.benefits
      ),
    },
    featured: {
      ...defaultSiteSettings.home.featured,
      ...(persistedHome.featured || {}),
    },
    catalog: {
      ...defaultSiteSettings.home.catalog,
      ...legacyCatalog,
      ...(persistedHome.catalog || {}),
    },
    searchBand: {
      ...defaultSiteSettings.home.searchBand,
      ...(persistedHome.searchBand || {}),
    },
    categories: {
      ...defaultSiteSettings.home.categories,
      ...(persistedHome.categories || {}),
    },
    about: {
      ...defaultSiteSettings.home.about,
      ...legacyAbout,
      ...(persistedHome.about || {}),
    },
    footer: {
      ...defaultSiteSettings.home.footer,
      ...legacyFooter,
      ...(persistedHome.footer || {}),
      groups: listOrDefault(
        persistedHome.footer?.groups,
        defaultSiteSettings.home.footer.groups
      ),
    },
  };
  return siteSettingsSchema.parse({
    ...defaultSiteSettings,
    ...persisted,
    home,
  });
}
