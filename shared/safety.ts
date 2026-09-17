import { z } from "zod";

export const reportCategories = [
  "minor",
  "trafficking_exploitation_coercion",
  "fraud",
  "threat_extortion",
  "impersonation",
  "unauthorized_media",
  "copyright",
  "privacy",
  "spam",
  "illegal_content",
  "abuse",
  "other",
] as const;

export type ReportCategory = (typeof reportCategories)[number];
export type ReportPriority = "low" | "normal" | "high" | "urgent";

export const reportCategoryLabels: Record<ReportCategory, string> = {
  minor: "Possível menor de idade",
  trafficking_exploitation_coercion: "Exploração, tráfico ou coerção",
  fraud: "Fraude",
  threat_extortion: "Ameaça ou extorsão",
  impersonation: "Impersonação",
  unauthorized_media: "Imagem ou vídeo sem autorização",
  copyright: "Direitos autorais",
  privacy: "Privacidade",
  spam: "Spam ou abuso de contato",
  illegal_content: "Conteúdo ou atividade ilegal",
  abuse: "Abuso",
  other: "Outro",
};

const urgent = new Set<ReportCategory>([
  "minor",
  "trafficking_exploitation_coercion",
]);
const high = new Set<ReportCategory>([
  "threat_extortion",
  "impersonation",
  "unauthorized_media",
  "illegal_content",
]);

export function priorityForReport(category: ReportCategory): ReportPriority {
  if (urgent.has(category)) return "urgent";
  if (high.has(category)) return "high";
  return "normal";
}

export const reportProfileInputSchema = z.object({
  profileId: z.number().int().positive(),
  category: z.enum(reportCategories),
  description: z.string().trim().min(10).max(200),
});

export type ReportReasonPayload = {
  version: 1;
  category: ReportCategory;
  description: string;
  source: "profile";
};

export function encodeReportReason(input: {
  category: ReportCategory;
  description: string;
}): string {
  return JSON.stringify({
    version: 1,
    category: input.category,
    description: input.description.trim(),
    source: "profile",
  } satisfies ReportReasonPayload);
}

export function decodeReportReason(value: string | null | undefined): ReportReasonPayload {
  if (!value) {
    return { version: 1, category: "other", description: "", source: "profile" };
  }
  try {
    const parsed = JSON.parse(value) as Partial<ReportReasonPayload>;
    const category = reportCategories.includes(parsed.category as ReportCategory)
      ? (parsed.category as ReportCategory)
      : "other";
    return {
      version: 1,
      category,
      description: typeof parsed.description === "string" ? parsed.description : value,
      source: "profile",
    };
  } catch {
    return { version: 1, category: "other", description: value, source: "profile" };
  }
}

export const safetyFeatureFlagKeys = [
  "adultMarketplaceEnabled",
  "escortListingsEnabled",
  "ageAssuranceEnabled",
  "identityVerificationEnabled",
  "secureContactEnabled",
  "sponsoredListingsEnabled",
  "creatorContent18Enabled",
  "paymentsEnabled",
  "favoritesEnabled",
  "blockingEnabled",
  "reportsEnabled",
] as const;

export type SafetyFeatureFlags = Record<(typeof safetyFeatureFlagKeys)[number], boolean>;

export const defaultSafetyFeatureFlags: SafetyFeatureFlags = {
  adultMarketplaceEnabled: false,
  escortListingsEnabled: false,
  ageAssuranceEnabled: false,
  identityVerificationEnabled: false,
  secureContactEnabled: false,
  sponsoredListingsEnabled: false,
  creatorContent18Enabled: false,
  paymentsEnabled: false,
  favoritesEnabled: false,
  blockingEnabled: false,
  reportsEnabled: false,
};

export function canActOnProfile(userId: number, ownerId: number) {
  return Number.isInteger(userId) && Number.isInteger(ownerId) && userId > 0 && ownerId > 0 && userId !== ownerId;
}

export function externalContactAllowed(input: {
  featureEnabled: boolean;
  authenticated: boolean;
  ageApproved: boolean;
  blocked: boolean;
  authorizationCurrent: boolean;
}) {
  return (
    input.featureEnabled &&
    input.authenticated &&
    input.ageApproved &&
    !input.blocked &&
    input.authorizationCurrent
  );
}
