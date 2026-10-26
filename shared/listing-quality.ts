// Qualidade do anúncio: regras objetivas (sem IA) que orientam o anunciante.
export type QualityInput = {
  description?: string | null;
  avatarUrl?: string | null;
  priceFromCents?: number | null;
  services?: unknown[] | null;
  attendancePlaces?: unknown[] | null;
  languages?: unknown[] | null;
  availabilityLabel?: string | null;
  locationNote?: string | null;
  age?: number | null;
  photoCount: number;
  videoCount: number;
  identityVerified: boolean;
};

export type QualityCheck = {
  id: string;
  points: number;
  ok: boolean;
  tip: string;
};

const filled = (value: unknown[] | null | undefined) =>
  Array.isArray(value) && value.length > 0;

export function evaluateListingQuality(input: QualityInput) {
  const checks: QualityCheck[] = [
    { id: "cover", points: 10, ok: Boolean(input.avatarUrl), tip: "Defina uma foto de capa." },
    { id: "photos", points: 20, ok: input.photoCount >= 4, tip: "Envie pelo menos 4 fotos aprovadas." },
    { id: "video", points: 10, ok: input.videoCount >= 1, tip: "Um vídeo curto aumenta a confiança." },
    { id: "description", points: 15, ok: (input.description?.trim().length ?? 0) >= 200, tip: "Escreva uma descrição com pelo menos 200 caracteres." },
    { id: "price", points: 10, ok: typeof input.priceFromCents === "number", tip: "Informe o valor a partir de." },
    { id: "services", points: 8, ok: filled(input.services), tip: "Marque os serviços que oferece." },
    { id: "places", points: 7, ok: filled(input.attendancePlaces), tip: "Marque onde atende." },
    { id: "availability", points: 5, ok: Boolean(input.availabilityLabel?.trim()), tip: "Informe seus horários." },
    { id: "location", points: 3, ok: Boolean(input.locationNote?.trim()), tip: "Informe a região de atendimento (sem endereço)." },
    { id: "languages", points: 2, ok: filled(input.languages), tip: "Informe os idiomas." },
    { id: "identity", points: 10, ok: input.identityVerified, tip: "Solicite a verificação de identidade para ganhar o selo." },
  ];
  const total = checks.reduce((sum, check) => sum + check.points, 0);
  const score = Math.round(
    (checks.reduce((sum, check) => sum + (check.ok ? check.points : 0), 0) / total) * 100
  );
  return {
    score,
    level: score >= 80 ? "otimo" : score >= 50 ? "bom" : "inicial",
    tips: checks.filter(check => !check.ok).map(check => check.tip),
    checks,
  } as const;
}
