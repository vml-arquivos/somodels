import { brazilianStateOptions } from "./discovery-options";

/**
 * Municípios em chunks por UF para não aumentar o bundle inicial.
 * Fonte de fallback: snapshot público versionado associado aos dados do IBGE
 * em https://gist.github.com/letanure/3012978 (referência de 2020).
 * Não é uma consulta ao endpoint IBGE em tempo real; atualizar os chunks quando
 * uma exportação oficial mais recente estiver disponível e validada.
 */
export { brazilianStateOptions };
export type StateCode = (typeof brazilianStateOptions)[number][0];
export const stateLabelByCode = Object.fromEntries(
  brazilianStateOptions
) as Record<StateCode, string>;
const stateCodes = new Set<StateCode>(
  brazilianStateOptions.map(([code]) => code)
);
export const stateCodeByLabel = Object.fromEntries(
  brazilianStateOptions.map(([code, label]) => [label, code])
) as Record<string, StateCode | undefined>;

export function resolveStateCode(value: string | null | undefined) {
  if (!value) return undefined;
  if (stateCodeByLabel[value]) return stateCodeByLabel[value];
  return stateCodes.has(value as StateCode) ? (value as StateCode) : undefined;
}

const cityLoaders: Record<
  StateCode,
  () => Promise<{ cities: readonly string[] }>
> = {
  AC: () => import("./locations/AC"),
  AL: () => import("./locations/AL"),
  AP: () => import("./locations/AP"),
  AM: () => import("./locations/AM"),
  BA: () => import("./locations/BA"),
  CE: () => import("./locations/CE"),
  DF: () => import("./locations/DF"),
  ES: () => import("./locations/ES"),
  GO: () => import("./locations/GO"),
  MA: () => import("./locations/MA"),
  MT: () => import("./locations/MT"),
  MS: () => import("./locations/MS"),
  MG: () => import("./locations/MG"),
  PA: () => import("./locations/PA"),
  PB: () => import("./locations/PB"),
  PR: () => import("./locations/PR"),
  PE: () => import("./locations/PE"),
  PI: () => import("./locations/PI"),
  RJ: () => import("./locations/RJ"),
  RN: () => import("./locations/RN"),
  RS: () => import("./locations/RS"),
  RO: () => import("./locations/RO"),
  RR: () => import("./locations/RR"),
  SC: () => import("./locations/SC"),
  SP: () => import("./locations/SP"),
  SE: () => import("./locations/SE"),
  TO: () => import("./locations/TO"),
};

export async function loadCitiesForState(code: StateCode) {
  return (await cityLoaders[code]()).cities;
}

export const dfNeighborhoodOptions = [
  "Brasília (Plano Piloto)",
  "Asa Sul",
  "Asa Norte",
  "Sudoeste/Octogonal",
  "Cruzeiro",
  "Lago Sul",
  "Lago Norte",
  "Park Way",
  "Taguatinga",
  "Ceilândia",
  "Samambaia",
  "Águas Claras",
  "Vicente Pires",
  "Guará",
  "Núcleo Bandeirante",
  "Candangolândia",
  "Riacho Fundo I",
  "Riacho Fundo II",
  "Recanto das Emas",
  "Gama",
  "Santa Maria",
  "Paranoá",
  "Itapoã",
  "São Sebastião",
  "Jardim Botânico",
  "Sobradinho",
  "Sobradinho II",
  "Planaltina",
  "Brazlândia",
  "Estrutural/SCIA",
  "Varjão",
  "Fercal",
  "Arniqueira",
  "Sol Nascente/Pôr do Sol",
  "SIA",
] as const;
export const genericNeighborhoodOptions = [
  "Centro",
  "Zona Norte",
  "Zona Sul",
  "Zona Leste",
  "Zona Oeste",
  "Outros",
] as const;
export function neighborhoodOptionsFor(
  code: StateCode | undefined,
  city: string
) {
  return code === "DF" && city === "Brasília"
    ? dfNeighborhoodOptions
    : genericNeighborhoodOptions;
}

export async function isStructuredLocation(
  region: string | null | undefined,
  city: string | null | undefined,
  neighborhood: string | null | undefined
) {
  const code = resolveStateCode(region);
  if (!code || !city || !neighborhood) return false;
  const cities = await loadCitiesForState(code);
  return (
    cities.includes(city) &&
    (neighborhoodOptionsFor(code, city) as readonly string[]).includes(
      neighborhood
    )
  );
}

/**
 * A migration adiciona o bairro sem alterar perfis já aprovados. Para não
 * retirar esses anúncios da vitrine em edição, reativação ou moderação de
 * mídia, mantemos a localização antiga até o titular escolher uma opção.
 * Um novo rascunho não chega a este estado sem o fluxo administrativo.
 */
export function hasLegacyApprovedLocation(profile: {
  status?: string | null;
  portfolioReviewed?: boolean | null;
  neighborhood?: string | null;
}) {
  return (
    profile.status === "approved" &&
    profile.portfolioReviewed === true &&
    !profile.neighborhood?.trim()
  );
}
