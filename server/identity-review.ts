// Regras puras da revisão manual de identidade, isoladas para teste unitário.
export type IdentityReviewRow = { userId: number; status: string };

export const IDENTITY_DEFAULT_VALIDITY_DAYS = 365;

export function assertIdentityReviewAllowed(input: {
  row: IdentityReviewRow | undefined;
  actorUserId: number;
  decision: "approved" | "rejected";
  reason?: string | null;
}) {
  if (!input.row) throw new Error("Solicitação de verificação não encontrada");
  if (input.row.status !== "pending")
    throw new Error("Esta solicitação já foi analisada");
  // Quem decide nunca pode ser a própria pessoa verificada.
  if (input.row.userId === input.actorUserId)
    throw new Error("Você não pode analisar a própria verificação");
  if (input.decision === "rejected" && !input.reason?.trim())
    throw new Error("Informe o motivo da recusa");
}

export function identityValidityDays(requested?: number) {
  return Math.min(
    Math.max(requested ?? IDENTITY_DEFAULT_VALIDITY_DAYS, 30),
    730
  );
}
