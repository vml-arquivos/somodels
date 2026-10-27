// Avaliações dos anúncios: regras puras (sem banco e sem React) para poderem ser testadas.

export const reviewKinds = ["elogio", "comentario", "reclamacao"] as const;
export type ReviewKind = (typeof reviewKinds)[number];

export const reviewKindLabels: Record<ReviewKind, string> = {
  elogio: "Elogio",
  comentario: "Comentário",
  reclamacao: "Reclamação",
};

export const reviewStatuses = ["pending", "approved", "rejected", "hidden"] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

export const reviewStatusLabels: Record<ReviewStatus, string> = {
  pending: "Aguardando",
  approved: "Publicada",
  rejected: "Recusada",
  hidden: "Oculta",
};

export const reviewLimits = {
  titleMax: 80,
  bodyMin: 10,
  bodyMax: 1000,
  replyMax: 600,
  /** Quantas avaliações a mesma conta pode enviar a cada 24 horas. */
  perDay: 5,
  pageSize: 5,
} as const;

export const reviewSorts = ["recent", "best", "worst"] as const;
export type ReviewSort = (typeof reviewSorts)[number];

export const reviewSortLabels: Record<ReviewSort, string> = {
  recent: "Mais recentes",
  best: "Melhores notas",
  worst: "Piores notas",
};

export function isReviewKind(value: unknown): value is ReviewKind {
  return typeof value === "string" && (reviewKinds as readonly string[]).includes(value);
}

export function isReviewStatus(value: unknown): value is ReviewStatus {
  return typeof value === "string" && (reviewStatuses as readonly string[]).includes(value);
}

/** Remove espaços repetidos e caracteres de controle. */
export function cleanReviewText(value: unknown, max: number) {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim()
        .slice(0, max)
    : "";
}

const phonePattern = /(?:\+?\d[\s().-]*){9,}/;
const urlPattern =
  /(?:https?:\/\/|www\.|\b[a-z0-9-]{2,}\.(?:com|net|org|br|me|app|io|link|ly|xyz|club|vip)\b)/i;
const emailPattern = /[^\s@]+@[^\s@]+\.[^\s@]+/;
const handlePattern = /(?:^|\s)@[a-z0-9_.]{3,}/i;

/** Texto público não pode levar contato, link ou perfil de rede social. */
export function reviewTextProblem(text: string): string | null {
  if (phonePattern.test(text))
    return "Não escreva telefone ou WhatsApp na avaliação.";
  if (emailPattern.test(text)) return "Não escreva e-mail na avaliação.";
  if (urlPattern.test(text)) return "Não coloque links ou endereços de site.";
  if (handlePattern.test(text))
    return "Não coloque perfis de redes sociais na avaliação.";
  return null;
}

export type ReviewDraftInput = {
  rating: unknown;
  kind: unknown;
  title?: unknown;
  body: unknown;
};

export function validateReviewInput(input: ReviewDraftInput) {
  const rating = Number(input.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5)
    throw new Error("Escolha uma nota de 1 a 5.");
  if (!isReviewKind(input.kind)) throw new Error("Escolha o tipo da avaliação.");
  const title = cleanReviewText(input.title, reviewLimits.titleMax).replace(/\s*\n\s*/g, " ");
  const body = cleanReviewText(input.body, reviewLimits.bodyMax);
  if (body.length < reviewLimits.bodyMin)
    throw new Error(`Escreva pelo menos ${reviewLimits.bodyMin} letras.`);
  const problem = reviewTextProblem(`${title}\n${body}`);
  if (problem) throw new Error(problem);
  return { rating, kind: input.kind, title, body };
}

/** "Maria Souza Lima" vira "Maria S."; sem nome vira "Cliente". */
export function publicAuthorName(name: string | null | undefined) {
  const parts = String(name ?? "")
    .normalize("NFC")
    .replace(/[^A-Za-zÀ-ÖØ-öø-ÿ\s'-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "Cliente";
  const first = parts[0].charAt(0).toLocaleUpperCase("pt-BR") + parts[0].slice(1).toLocaleLowerCase("pt-BR");
  const last = parts.length > 1 ? parts[parts.length - 1] : "";
  return last ? `${first.slice(0, 20)} ${last.charAt(0).toLocaleUpperCase("pt-BR")}.` : first.slice(0, 20);
}

export type ReviewSummary = {
  count: number;
  average: number;
  distribution: [number, number, number, number, number];
};

export function summarizeRatings(ratings: readonly number[]): ReviewSummary {
  const distribution: ReviewSummary["distribution"] = [0, 0, 0, 0, 0];
  let total = 0;
  let count = 0;
  for (const value of ratings) {
    if (!Number.isInteger(value) || value < 1 || value > 5) continue;
    distribution[value - 1] += 1;
    total += value;
    count += 1;
  }
  return {
    count,
    average: count ? Math.round((total / count) * 10) / 10 : 0,
    distribution,
  };
}

export function ratingLabel(average: number) {
  if (average >= 4.5) return "Muito satisfeito(a)";
  if (average >= 3.5) return "Satisfeito(a)";
  if (average >= 2.5) return "Regular";
  if (average >= 1.5) return "Insatisfeito(a)";
  return "Muito insatisfeito(a)";
}

export const reviewRules = [
  "Conte como foi a sua experiência, com respeito.",
  "Não escreva telefone, e-mail, link nem rede social.",
  "Não ofenda nem exponha dados pessoais de ninguém.",
  "A equipe confere antes de publicar e pode recusar o que fugir dessas regras.",
] as const;
