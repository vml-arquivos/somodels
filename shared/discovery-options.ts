// Vocabulário controlado de busca: preço, serviços e local de atendimento.
// Mantido em /shared para que servidor (validação/filtros) e cliente (formulários/filtros)
// usem exatamente as mesmas opções.

export const attendancePlaceOptions = [
  "Com local",
  "A domicílio",
  "Hotéis e motéis",
  "Eventos e viagens",
  "Atendimento virtual",
] as const;

export const serviceOptions = [
  "Companhia para jantares e eventos",
  "Viagens",
  "Massagem",
  "Atendimento a casais",
  "Chamada de vídeo",
  "Roleplay e fantasias (sob consulta)",
] as const;

export type AttendancePlace = (typeof attendancePlaceOptions)[number];
export type ServiceOption = (typeof serviceOptions)[number];

// Faixas rápidas exibidas na vitrine (valor máximo em centavos).
export const priceBands = [
  { label: "Até R$ 150", maxCents: 15000 },
  { label: "Até R$ 300", maxCents: 30000 },
  { label: "Até R$ 500", maxCents: 50000 },
  { label: "Até R$ 1.000", maxCents: 100000 },
] as const;

export const MAX_PRICE_CENTS = 10_000_000; // R$ 100.000,00

export function reaisToCents(
  value: string | number | null | undefined
): number | null {
  if (value === null || value === undefined) return null;
  const raw = typeof value === "number" ? String(value) : value.trim();
  if (!raw) return null;
  const normalized = raw
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  if (!/\d/.test(normalized)) return null;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  const cents = Math.round(parsed * 100);
  return cents > MAX_PRICE_CENTS ? null : cents;
}

export function centsToReais(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  const reais = cents / 100;
  return Number.isInteger(reais)
    ? String(reais)
    : reais.toFixed(2).replace(".", ",");
}

export function formatBRL(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: Number.isInteger(cents / 100) ? 0 : 2,
  });
}

// Calculadora de ganhos (página pública para anunciantes). Pura e testável.
export function estimateMonthlyEarnings(input: {
  hourlyRateCents: number;
  appointmentsPerWeek: number;
  hoursPerAppointment: number;
  weeksPerMonth?: number;
  monthlyCostsCents?: number;
}) {
  const weeks = input.weeksPerMonth ?? 4;
  const gross = Math.round(
    input.hourlyRateCents *
      input.hoursPerAppointment *
      input.appointmentsPerWeek *
      weeks
  );
  const costs = Math.max(0, Math.round(input.monthlyCostsCents ?? 0));
  return { grossCents: gross, costsCents: costs, netCents: gross - costs };
}
