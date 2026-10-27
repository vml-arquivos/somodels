// Conteúdo fixo da home (sem números nem depoimentos inventados).
export type IconName =
  | "bolt"
  | "shield"
  | "check"
  | "video"
  | "pin"
  | "plus"
  | "calc"
  | "book"
  | "lock"
  | "eye"
  | "flag"
  | "chat"
  | "user"
  | "users"
  | "heart"
  | "spark"
  | "camera";

export const categoryCards: {
  name: string;
  icon: IconName;
  text: string;
}[] = [
  {
    name: "Acompanhante feminina",
    icon: "user",
    text: "Anúncios de mulheres que atendem na sua cidade, com fotos, valores e horários.",
  },
  {
    name: "Acompanhante masculino",
    icon: "user",
    text: "Perfis masculinos para quem prefere esse tipo de companhia.",
  },
  {
    name: "Acompanhante trans",
    icon: "heart",
    text: "Anúncios de pessoas trans, com perfil completo e contato direto.",
  },
  {
    name: "Casal ou dupla",
    icon: "users",
    text: "Atendimento em casal ou dupla, combinado de forma clara antes do encontro.",
  },
  {
    name: "Massagem",
    icon: "spark",
    text: "Massagem relaxante e sensorial, com local e valores informados no anúncio.",
  },
  {
    name: "Virtual",
    icon: "video",
    text: "Chamada de vídeo e conteúdo à distância, sem sair de casa.",
  },
];

export const shortcutLinks: {
  label: string;
  hint: string;
  icon: IconName;
  action?: "availableNow" | "verified" | "virtual" | "local";
  href?: string;
}[] = [
  {
    label: "Disponíveis agora",
    hint: "Quem está atendendo neste momento",
    icon: "bolt",
    action: "availableNow",
  },
  {
    label: "Perfis verificados",
    hint: "Anúncios com verificação concluída",
    icon: "check",
    action: "verified",
  },
  {
    label: "Atendimento virtual",
    hint: "Chamada de vídeo e conteúdo online",
    icon: "video",
    action: "virtual",
  },
  {
    label: "Atende com local",
    hint: "Anunciantes com espaço próprio",
    icon: "pin",
    action: "local",
  },
  {
    label: "Anunciar grátis",
    hint: "Crie seu perfil em poucos minutos",
    icon: "plus",
    href: "/cadastro",
  },
  {
    label: "Calculadora de ganhos",
    hint: "Veja quanto você pode receber",
    icon: "calc",
    href: "/calculadora-de-ganhos",
  },
  {
    label: "Como anunciar",
    hint: "Passo a passo para publicar",
    icon: "book",
    href: "/como-anunciar",
  },
  {
    label: "Dicas de segurança",
    hint: "Cuidados para clientes e anunciantes",
    icon: "shield",
    href: "/seguranca",
  },
];

export const safetyTiles: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "eye",
    title: "Só para maiores de 18",
    text: "Confirmação de idade antes de ver qualquer anúncio e cadastro apenas para adultos.",
  },
  {
    icon: "lock",
    title: "Contato protegido",
    text: "O contato com a anunciante é liberado pelo site, sem expor dados do cliente.",
  },
  {
    icon: "flag",
    title: "Denúncia em um clique",
    text: "Algo errado em um anúncio? Qualquer pessoa pode denunciar, sem precisar de conta.",
  },
  {
    icon: "camera",
    title: "Fotos sob controle",
    text: "A anunciante escolhe quais fotos aparecem no anúncio e pode trocá-las quando quiser.",
  },
];

export const holderSteps: { title: string; text: string }[] = [
  {
    title: "Crie sua conta",
    text: "Cadastro rápido com e-mail e senha. Você precisa ter 18 anos ou mais.",
  },
  {
    title: "Monte seu anúncio",
    text: "Adicione fotos, descrição, cidade, valores e formas de contato.",
  },
  {
    title: "Seja encontrada",
    text: "O anúncio entra no ar e aparece nas buscas por cidade e categoria.",
  },
];

export const holderBenefits: { icon: IconName; title: string; text: string }[] =
  [
    {
      icon: "plus",
      title: "Anúncio grátis",
      text: "Comece sem pagar nada e escolha um plano só se quiser mais destaque.",
    },
    {
      icon: "chat",
      title: "Contato direto",
      text: "Os clientes falam com você, sem intermediários e sem taxa por conversa.",
    },
    {
      icon: "spark",
      title: "Você no controle",
      text: "Edite fotos, valores e disponibilidade quando quiser, pelo celular.",
    },
  ];

export const faqItems: { q: string; a: string }[] = [
  {
    q: "O que é a Ero Models?",
    a: "É um site de anúncios para adultos. Anunciantes publicam seus perfis e clientes encontram pessoas da própria cidade.",
  },
  {
    q: "Preciso pagar para anunciar?",
    a: "Não. Criar o perfil e publicar o anúncio é grátis. Os planos pagos servem para ganhar mais destaque.",
  },
  {
    q: "Como entro em contato com uma anunciante?",
    a: "Abra o anúncio e use os botões de contato. O pedido passa pelo site e a anunciante responde pelo canal que ela escolheu.",
  },
  {
    q: "Como sei se um perfil é verificado?",
    a: "Perfis com verificação concluída aparecem com o selo de verificado e podem ser filtrados na busca.",
  },
  {
    q: "Encontrei um anúncio com problema. O que faço?",
    a: "Use o botão de denúncia na página do anúncio ou a página de denúncia. Não é preciso ter conta.",
  },
  {
    q: "Menores de idade podem usar o site?",
    a: "Não. O acesso e o cadastro são só para maiores de 18 anos, e anúncios que envolvam menores são removidos.",
  },
];

export const popularSearches = [
  "Companhia para jantares e eventos",
  "Viagens",
  "Massagem",
  "Atendimento a casais",
  "Chamada de vídeo",
] as const;
