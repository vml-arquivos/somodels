// Regras puras do painel administrativo (CRM, financeiro, relatórios e verificação).
// Ficam fora do React e do banco para poderem ser testadas sem infraestrutura.

export const crmStages = [
  "novo",
  "contato",
  "negociacao",
  "ativo",
  "atencao",
  "inativo",
  "perdido",
] as const;
export type CrmStage = (typeof crmStages)[number];

export const crmStageLabels: Record<CrmStage, string> = {
  novo: "Novo",
  contato: "Em contato",
  negociacao: "Negociando",
  ativo: "Ativo",
  atencao: "Precisa de atenção",
  inativo: "Inativo",
  perdido: "Perdido",
};

export const crmStageHints: Record<CrmStage, string> = {
  novo: "Acabou de se cadastrar",
  contato: "A equipe já falou com a pessoa",
  negociacao: "Escolhendo ou combinando um pacote",
  ativo: "Anunciando normalmente",
  atencao: "Pagamento atrasado ou problema no anúncio",
  inativo: "Sem anúncio no ar há algum tempo",
  perdido: "Desistiu ou foi encerrado",
};

export function isCrmStage(value: unknown): value is CrmStage {
  return (
    typeof value === "string" && (crmStages as readonly string[]).includes(value)
  );
}

export const crmNoteKinds = [
  "nota",
  "ligacao",
  "whatsapp",
  "email",
  "pedido",
  "sistema",
] as const;
export type CrmNoteKind = (typeof crmNoteKinds)[number];

export const crmNoteKindLabels: Record<CrmNoteKind, string> = {
  nota: "Anotação",
  ligacao: "Ligação",
  whatsapp: "WhatsApp",
  email: "E-mail",
  pedido: "Pedido do anunciante",
  sistema: "Sistema",
};

export function isCrmNoteKind(value: unknown): value is CrmNoteKind {
  return (
    typeof value === "string" &&
    (crmNoteKinds as readonly string[]).includes(value)
  );
}

/** Etiquetas livres: minúsculas, sem repetição, no máximo 8 de até 24 caracteres. */
export function normalizeTags(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") continue;
    const tag = raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9 -]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 24);
    if (tag.length >= 2) seen.add(tag);
    if (seen.size >= 8) break;
  }
  return Array.from(seen);
}

export function parseTags(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    return normalizeTags(JSON.parse(value));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Etapa sugerida: o que o sistema consegue deduzir sozinho dos dados da conta.
// A equipe pode sobrescrever, mas a sugestão ajuda a não deixar ninguém esquecido.
// ---------------------------------------------------------------------------

export type StageSignals = {
  listings: number;
  published: number;
  hasActivePlan: boolean;
  overduePayments: number;
  suspendedListings: number;
  daysSinceSignup: number;
  daysSinceLastLogin: number | null;
};

export function suggestStage(signals: StageSignals): CrmStage {
  if (signals.overduePayments > 0 || signals.suspendedListings > 0)
    return "atencao";
  if (signals.published > 0) return "ativo";
  if (signals.hasActivePlan) return "ativo";
  if (signals.listings > 0) return "negociacao";
  if (signals.daysSinceLastLogin !== null && signals.daysSinceLastLogin > 45)
    return "inativo";
  return "novo";
}

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------

export const paymentStatusLabels = {
  paid: "Pago",
  pending: "Aguardando",
  overdue: "Atrasado",
  failed: "Falhou",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
} as const;
export type PaymentBucket = keyof typeof paymentStatusLabels;

/** Um pagamento pendente vira "atrasado" quando passa do vencimento. */
export function paymentBucket(
  status: string,
  dueAt: Date | string | null | undefined,
  now = new Date()
): PaymentBucket {
  if (status === "pending") {
    if (dueAt && new Date(dueAt).getTime() < now.getTime()) return "overdue";
    return "pending";
  }
  if (
    status === "paid" ||
    status === "failed" ||
    status === "refunded" ||
    status === "cancelled"
  )
    return status;
  return "pending";
}

/** Valor mensal equivalente de um plano, para estimar a receita recorrente. */
export function monthlyEquivalentCents(
  priceCents: number,
  billingPeriod: string,
  durationDays: number
) {
  if (priceCents <= 0) return 0;
  if (billingPeriod === "year") return Math.round(priceCents / 12);
  if (billingPeriod === "month") return priceCents;
  const days = Math.max(1, durationDays || 30);
  return Math.round((priceCents * 30) / days);
}

export const defaultPaymentDueDays = 3;

export function dueDateFrom(now = new Date(), days = defaultPaymentDueDays) {
  return new Date(now.getTime() + days * 86_400_000);
}

// ---------------------------------------------------------------------------
// Datas e períodos de relatório
// ---------------------------------------------------------------------------

export const reportPresets = [
  { key: "7d", label: "Últimos 7 dias", days: 7 },
  { key: "30d", label: "Últimos 30 dias", days: 30 },
  { key: "90d", label: "Últimos 90 dias", days: 90 },
  { key: "365d", label: "Últimos 12 meses", days: 365 },
] as const;

export function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export function isDateKey(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

/** Início do dia (00:00 em Brasília) como instante UTC. */
export function startOfDaySaoPaulo(key: string) {
  return new Date(`${key}T00:00:00-03:00`);
}

/** Fim do período (exclusivo): começo do dia seguinte em Brasília. */
export function endOfDaySaoPaulo(key: string) {
  return new Date(startOfDaySaoPaulo(key).getTime() + 86_400_000);
}

export function resolveRange(input: {
  from?: string | null;
  to?: string | null;
  days?: number;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  let to: string = isDateKey(input.to) ? input.to : dateKey(now);
  let from: string;
  if (isDateKey(input.from)) from = input.from;
  else {
    const days = Math.min(Math.max(input.days ?? 30, 1), 730);
    from = dateKey(
      new Date(endOfDaySaoPaulo(to).getTime() - days * 86_400_000)
    );
  }
  if (from > to) [from, to] = [to, from] as [string, string];
  const start = startOfDaySaoPaulo(from);
  const end = endOfDaySaoPaulo(to);
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  if (spanDays > 731) throw new Error("O período pode ter no máximo 2 anos");
  return { from, to, start, end, spanDays };
}

/** Lista cada dia do período (YYYY-MM-DD), para completar séries com zero. */
export function listDays(from: string, to: string) {
  const days: string[] = [];
  let cursor = startOfDaySaoPaulo(from).getTime();
  const end = endOfDaySaoPaulo(to).getTime();
  while (cursor < end && days.length < 800) {
    days.push(dateKey(new Date(cursor + 3_600_000)));
    cursor += 86_400_000;
  }
  return days;
}

export function ageFromBirthDate(value: string, now = new Date()) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || "");
  if (!match) return null;
  const [year, month, day] = [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
  ];
  let age = now.getUTCFullYear() - year;
  const beforeBirthday =
    now.getUTCMonth() + 1 < month ||
    (now.getUTCMonth() + 1 === month && now.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age >= 0 && age < 130 ? age : null;
}

// ---------------------------------------------------------------------------
// CSV (abre direto no Excel em português: ponto e vírgula e BOM)
// ---------------------------------------------------------------------------

export function csvCell(value: unknown) {
  if (value === null || value === undefined) return "";
  let text =
    value instanceof Date ? value.toISOString() : String(value).replace(/\r?\n/g, " ");
  // Evita que o Excel execute fórmulas vindas de texto digitado por usuários.
  if (/^[=+\-@\t]/.test(text)) text = `'${text}`;
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(columns: string[], rows: unknown[][]) {
  const lines = [columns, ...rows].map(row => row.map(csvCell).join(";"));
  return `﻿${lines.join("\r\n")}\r\n`;
}

// ---------------------------------------------------------------------------
// Verificação de documentos
// ---------------------------------------------------------------------------

export const verificationDocKinds = [
  "doc_front",
  "doc_back",
  "selfie",
  "video",
] as const;
export type VerificationDocKind = (typeof verificationDocKinds)[number];

export const verificationDocLabels: Record<VerificationDocKind, string> = {
  doc_front: "Documento (frente)",
  doc_back: "Documento (verso)",
  selfie: "Selfie com o documento",
  video: "Vídeo de verificação",
};

export function isVerificationDocKind(
  value: unknown
): value is VerificationDocKind {
  return (
    typeof value === "string" &&
    (verificationDocKinds as readonly string[]).includes(value)
  );
}

/** O que precisa ter sido enviado para a análise poder começar. */
export function missingVerificationFiles(kinds: readonly string[]) {
  const set = new Set(kinds);
  const missing: VerificationDocKind[] = [];
  if (!set.has("doc_front")) missing.push("doc_front");
  if (!set.has("selfie") && !set.has("video")) missing.push("selfie");
  return missing;
}

export const verificationChecks = [
  { key: "name", label: "O nome do documento confere com o cadastro" },
  { key: "cpf", label: "O CPF está legível e confere" },
  { key: "birth", label: "A data de nascimento confere" },
  { key: "adult", label: "A pessoa tem 18 anos ou mais" },
  { key: "face", label: "O rosto confere com a foto do documento" },
  { key: "valid", label: "O documento está dentro da validade e sem adulteração" },
] as const;
export type VerificationCheckKey = (typeof verificationChecks)[number]["key"];

export function allChecksPassed(checks: Partial<Record<string, boolean>>) {
  return verificationChecks.every(item => checks[item.key] === true);
}

export const verificationLimits = {
  imageBytes: 8 * 1024 * 1024,
  videoBytes: 40 * 1024 * 1024,
  maxFilesPerKind: 1,
} as const;
