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
  pending: "Em análise",
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
  /** Versão dos textos padrão. Textos salvos em versões antigas são trocados pelos novos. */
  copyRevision: z.number().int().min(0).optional(),
  home: homeCopySchema,
});

export const SITE_COPY_REVISION = 3;

export const defaultSiteSettings = {
  eyebrow: "Ero Models",
  title: "Encontre acompanhantes na sua cidade.",
  subtitle: "Veja fotos, valores e informações de cada anúncio.",
  heroVisualTitle: "Anúncios de todo o Brasil.",
  heroVisualSubtitle: "Fotos, valores e contato direto.",
  buttonText: "Buscar",
  searchPlaceholder: "Nome, cidade ou palavra-chave",
  emptyTitle: "Nenhum anúncio publicado ainda",
  emptyText:
    "Ainda não há anúncios por aqui. Seja a primeira pessoa a anunciar.",
  about:
    "A Ero Models é um portal de anúncios de acompanhantes para maiores de 18 anos. Cada pessoa cuida do próprio perfil, e qualquer anúncio pode ser denunciado.",
  footer: "Ero Models • Anúncios para maiores de 18 anos.",
  showGallery: true,
  showAbout: true,
  showContact: true,
  home: {
    nav: {
      explore: "Anúncios",
      search: "Buscar",
      categories: "Categorias",
      login: "Entrar",
      theme: "Tema claro",
      themeLight: "Tema claro",
      themeDark: "Tema escuro",
      install: "Instalar app",
      account: "Minha conta",
      owner: "Meu painel",
      createProfile: "Criar meu perfil",
    },
    hero: {
      eyebrow: "Ero Models",
      title: "Encontre acompanhantes na sua cidade.",
      subtitle:
        "Veja fotos, valores e informações de cada anúncio. Filtre por cidade, bairro e categoria.",
      searchLabel: "O que você procura?",
      searchPlaceholder: "Nome, cidade ou palavra-chave",
      locationLabel: "Onde?",
      locationPlaceholder: "Sua cidade",
      buttonText: "Buscar",
      notes: [
        "Só para maiores de 18 anos",
        "Contato direto com quem anuncia",
        "Denúncia em todos os perfis",
      ],
      visualTitle: "Anúncios de todo o Brasil.",
      visualSubtitle: "Fotos, valores e contato direto.",
      imageAlt: "Atmosfera editorial da Ero Models",
    },
    quickLinks: {
      kicker: "Explore a plataforma",
      title: "Comece pelo que procura.",
      items: [
        { label: "Anúncios" },
        { label: "Explorar categorias" },
        { label: "Minha conta" },
        { label: "Criar meu perfil" },
      ],
    },
    trust: {
      kicker: "Ero Models",
      title: "Como funciona",
      text: "Direto ao ponto: confirme a idade, escolha a cidade e veja os anúncios.",
      points: [
        {
          marker: "18+",
          title: "Só para maiores de 18",
          text: "Todo visitante confirma a idade antes de ver os anúncios.",
        },
        {
          marker: "01",
          title: "Anúncios na hora",
          text: "Quem anuncia publica o perfil sem fila de aprovação. As denúncias são analisadas depois.",
        },
        {
          marker: "02",
          title: "Endereço protegido",
          text: "O endereço exato nunca aparece. Só cidade e bairro.",
        },
        {
          marker: "03",
          title: "Denúncia em todo perfil",
          text: "Viu algo errado? Denuncie direto no anúncio.",
        },
      ],
    },
    holder: {
      kicker: "Para quem anuncia",
      title: "Anuncie na Ero Models",
      text: "Crie sua conta, monte seu perfil com várias fotos e publique. Sem fila de aprovação.",
      buttonText: "Criar meu perfil",
      benefits: [
        "Várias fotos de uma vez",
        "Escolha cidade e bairro",
        "Edite quando quiser",
        "Painel simples",
      ],
    },
    featured: {
      kicker: "Em destaque",
      title: "Anúncios em destaque",
      text: "Perfis publicados agora.",
    },
    catalog: {
      kicker: "Todos os anúncios",
      title: "Anúncios",
      status: "Atualizado o tempo todo",
      loadingText: "Carregando anúncios…",
      listErrorText: "Não foi possível carregar os anúncios.",
      resultsEmptyTitle: "Nenhum anúncio publicado ainda",
      resultsEmptyText:
        "Ainda não há anúncios por aqui. Seja a primeira pessoa a anunciar.",
      resultsEmptyButton: "Criar meu perfil",
      launchKicker: "Em breve",
      launchTitle: "Em breve, os primeiros anúncios.",
      launchText:
        "Estamos abrindo a vitrine. Cadastre seu perfil para sair na frente.",
      launchButton: "Criar meu perfil",
      errorText: "Não foi possível carregar a página. Tente de novo.",
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
      kicker: "Explore",
      title: "Categorias e cidades",
      text: "Escolha uma categoria ou uma cidade.",
      emptyTitle: "Ainda não há categorias por aqui.",
      emptyText:
        "Elas aparecem assim que os primeiros anúncios forem publicados.",
      emptyButton: "Criar meu perfil",
      locationsKicker: "Cidades",
    },
    about: {
      kicker: "Quem somos",
      title: "Sobre a Ero Models",
      text: "A Ero Models é um portal de anúncios de acompanhantes para maiores de 18 anos. Cada pessoa cuida do próprio perfil, e qualquer anúncio pode ser denunciado.",
      policyLink: "Ver as regras",
    },
    footer: {
      tagline:
        "Portal de anúncios para maiores de 18 anos.",
      ageNote: "Conteúdo exclusivo para maiores de 18 anos.",
      signature: "Ero Models • Anúncios para maiores de 18 anos.",
      closing: "Respeito entre todos.",
      groups: [
        {
          title: "Explorar",
          links: [
            { label: "Anúncios" },
            { label: "Categorias" },
            { label: "Minha conta" },
          ],
        },
        {
          title: "Para quem anuncia",
          links: [
            { label: "Criar meu perfil" },
            { label: "Meu painel" },
            { label: "Entrar" },
          ],
        },
        {
          title: "Regras",
          links: [
            { label: "Como funciona" },
            { label: "Privacidade" },
            { label: "Denunciar" },
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
      "Encontre o perfil certo para o seu momento.": "Encontre acompanhantes na sua cidade.",
      "Descubra perfis adultos por cidade, categoria e preferência.": "Veja fotos, valores e informações de cada anúncio.",
      "Respeito, segurança e privacidade.": "Anúncios de todo o Brasil.",
      "Uma vitrine adulta com informação clara.": "Fotos, valores e contato direto.",
      "Buscar perfis": "Buscar",
      "A vitrine está pronta para receber os primeiros anúncios que concluírem os critérios automáticos de segurança.": "Ainda não há anúncios por aqui. Seja a primeira pessoa a anunciar.",
      "Ero Models • Portal adulto de anúncios para maiores de 18 anos.": "Ero Models • Anúncios para maiores de 18 anos.",
      "Ero Models • Portal adulto de anúncios.": "Ero Models • Anúncios para maiores de 18 anos.",
      "Uma experiência mais clara": "Ero Models",
      "A Ero Models organiza a descoberta para que cada pessoa encontre o que procura sem excesso de ruído.": "Direto ao ponto: confirme a idade, escolha a cidade e veja os anúncios.",
      "Para titulares": "Para quem anuncia",
      "Veja quem já está na vitrine.": "Anúncios em destaque",
      "Uma seleção do catálogo público disponível agora.": "Perfis publicados agora.",
      "Perfis publicados": "Em destaque",
      "Catálogo público": "Todos os anúncios",
      "Atualizado conforme a publicação": "Atualizado o tempo todo",
      "Quero criar um perfil": "Criar meu perfil",
      "Criar um perfil": "Criar meu perfil",
      "Em preparação": "Em breve",
      "Não foi possível carregar a configuração da vitrine.": "Não foi possível carregar a página. Tente de novo.",
      "Navegue por afinidade": "Explore",
      "Escolha um caminho e explore somente o catálogo disponível para publicação pública.": "Escolha uma categoria ou uma cidade.",
      "O catálogo está sendo preparado.": "Ainda não há categorias por aqui.",
      "As categorias e localidades aparecem aqui conforme os primeiros perfis aprovados entram na vitrine.": "Elas aparecem assim que os primeiros anúncios forem publicados.",
      "Conheça as regras de segurança": "Ver as regras",
      "Respeito, segurança e dignidade.": "Respeito entre todos.",
      "Ver anúncios": "Anúncios",
      "Área do titular": "Meu painel",
      "Denúncias": "Denunciar",
      "Segurança": "Regras",
      "Visualizar todos": "Anúncios",
      "Encontre acompanhantes com privacidade e clareza.": "Encontre acompanhantes na sua cidade.",
      "Pesquise perfis adultos por cidade, categoria e disponibilidade. Veja informações públicas, critérios de publicação e contato autorizado quando disponível.": "Veja fotos, valores e informações de cada anúncio. Filtre por cidade, bairro e categoria.",
      "Encontrar acompanhantes": "Buscar",
      "Escolha com informação e tranquilidade.": "Como funciona",
      "Acesso adulto": "Só para maiores de 18",
      "Uma experiência exclusiva para maiores de idade.": "Todo visitante confirma a idade antes de ver os anúncios.",
      "Publicação com controles": "Anúncios na hora",
      "Perfis e mídias passam pelos critérios automáticos e podem ser moderados.": "Quem anuncia publica o perfil sem fila de aprovação. As denúncias são analisadas depois.",
      "Privacidade por padrão": "Endereço protegido",
      "Contato e dados sensíveis só aparecem quando autorizados.": "O endereço exato nunca aparece. Só cidade e bairro.",
      "Denúncia e cuidado": "Denúncia em todo perfil",
      "Ferramentas de segurança acompanham a experiência pública.": "Viu algo errado? Denuncie direto no anúncio.",
      "Crie seu perfil e seja encontrado.": "Anuncie na Ero Models",
      "Um cadastro guiado para apresentar seu trabalho, controlar suas informações e publicar quando estiver pronto.": "Crie sua conta, monte seu perfil com várias fotos e publique. Sem fila de aprovação.",
      "Começar cadastro": "Criar meu perfil",
      "Encontre perfis do seu jeito": "Anúncios",
      "A vitrine está pronta para receber os primeiros anúncios publicados.": "Ainda não há anúncios por aqui. Seja a primeira pessoa a anunciar.",
      "Os primeiros perfis publicados chegam aqui.": "Em breve, os primeiros anúncios.",
      "A vitrine está pronta para receber cadastros e publicar somente o que passar pelos critérios do ambiente.": "Estamos abrindo a vitrine. Cadastre seu perfil para sair na frente.",
      "Categorias e localidades para começar.": "Categorias e cidades",
      "Uma vitrine adulta para encontrar e ser encontrado.": "Sobre a Ero Models",
      "A Ero Models é uma plataforma adulta de anúncios. Cada titular controla o que deseja publicar, com age gate, privacidade, moderação e canais de denúncia disponíveis.": "A Ero Models é um portal de anúncios de acompanhantes para maiores de 18 anos. Cada pessoa cuida do próprio perfil, e qualquer anúncio pode ser denunciado.",
      "Uma vitrine adulta para descobrir perfis com clareza, respeito e privacidade.": "Portal de anúncios para maiores de 18 anos.",
      "Publicação automática": "Só para maiores de 18 anos",
      "Contato autorizado": "Contato direto com quem anuncia",
      "Nome artístico": "Várias fotos de uma vez",
      "Galeria própria": "Escolha cidade e bairro",
      "Localização aproximada": "Edite quando quiser",
      "Controle no painel": "Painel simples",
      "Publicação revisada": "Só para maiores de 18 anos",
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
    let current = branded;
    for (let step = 0; step < 4 && legacyDefaults[current]; step += 1) {
      current = legacyDefaults[current];
    }
    return current;
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
  const rawPersisted =
    normalizedValue && typeof normalizedValue === "object"
      ? (normalizedValue as Record<string, unknown>)
      : {};
  // Textos salvos antes da revisão atual são descartados: só as chaves liga/desliga ficam.
  const current =
    typeof rawPersisted.copyRevision === "number" &&
    rawPersisted.copyRevision >= SITE_COPY_REVISION;
  const persisted: Record<string, unknown> = current
    ? rawPersisted
    : {
        ...(typeof rawPersisted.showGallery === "boolean"
          ? { showGallery: rawPersisted.showGallery }
          : {}),
        ...(typeof rawPersisted.showAbout === "boolean"
          ? { showAbout: rawPersisted.showAbout }
          : {}),
        ...(typeof rawPersisted.showContact === "boolean"
          ? { showContact: rawPersisted.showContact }
          : {}),
      };
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
    copyRevision: SITE_COPY_REVISION,
    home,
  });
}
