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

export function normalizePhone(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (!/^[+\d\s().-]+$/.test(raw)) throw new Error("Telefone inválido");
  let digits = raw.replace(/\D/g, "");
  if (!raw.startsWith("+") && (digits.length === 10 || digits.length === 11))
    digits = `55${digits}`;
  if (!/^[1-9]\d{9,14}$/.test(digits))
    throw new Error("Informe DDI, DDD e telefone válidos");
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
});

export const defaultSiteSettings = {
  eyebrow: "Portal adulto de anúncios",
  title: "Encontre acompanhantes na sua cidade.",
  subtitle:
    "Anúncios para maiores de 18 anos, com fotos, vídeos, informações públicas e contato direto quando autorizado pelo titular.",
  heroVisualTitle: "Anúncios adultos com informação e privacidade.",
  heroVisualSubtitle: "Imagem ilustrativa da experiência da vitrine.",
  buttonText: "Encontrar acompanhantes",
  searchPlaceholder: "Nome, cidade ou palavra-chave",
  emptyTitle: "Nenhum anúncio publicado ainda",
  emptyText:
    "A vitrine está pronta para receber os primeiros anúncios aprovados. O conteúdo publicado é cadastrado e revisado pelo painel administrativo.",
  about:
    "A Ero Models é uma plataforma adulta de anúncios. Cada titular controla o que deseja publicar, e a operação mantém revisão, age gate, privacidade, moderação e canais de denúncia antes da abertura pública.",
  footer: "Ero Models • Portal adulto de anúncios para maiores de 18 anos.",
  showGallery: true,
  showAbout: true,
  showContact: true,
};

export type SiteSettings = z.infer<typeof siteSettingsSchema>;
