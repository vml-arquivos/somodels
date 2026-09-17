import { createHash } from "node:crypto";
import {
  portfolioTermsText,
  portfolioTermsVersion,
} from "../shared/portfolio";

const sha256 = (value: string) =>
  createHash("sha256").update(value, "utf8").digest("hex");

export function currentPortfolioTerms() {
  return {
    termsVersion: portfolioTermsVersion,
    termsText: portfolioTermsText,
    termsHash: sha256(`${portfolioTermsVersion}\n${portfolioTermsText}`),
  };
}

export function buildProfileContentDigest(profile: any, media: any[]) {
  const normalizedProfile = {
    ownerId: profile.ownerId ?? null,
    stageName: profile.stageName ?? null,
    slug: profile.slug ?? null,
    age: profile.age ?? null,
    description: profile.description ?? null,
    city: profile.city ?? null,
    region: profile.region ?? null,
    locationNote: profile.locationNote ?? null,
    categories: profile.categories ?? null,
    attributes: profile.attributes ?? null,
    contactOptions: profile.contactOptions ?? null,
    preferences: profile.preferences ?? null,
    languages: profile.languages ?? null,
    availabilityLabel: profile.availabilityLabel ?? null,
    isAvailableNow: Boolean(profile.isAvailableNow),
    phone: profile.phone ?? null,
    whatsapp: profile.whatsapp ?? null,
    telegram: profile.telegram ?? null,
  };
  const normalizedMedia = [...media]
    .map(item => ({
      id: Number(item.id),
      kind: item.kind,
      title: item.title ?? null,
      description: item.description ?? null,
      storageHash: item.storageHash,
      mimeType: item.mimeType,
      sortOrder: Number(item.sortOrder ?? 0),
    }))
    .sort((a, b) => a.id - b.id);
  return sha256(JSON.stringify({ profile: normalizedProfile, media: normalizedMedia }));
}

function parseMetadata(value: unknown): Record<string, any> {
  if (typeof value !== "string" || !value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function evaluateProfileTermsAcceptance(
  profile: any,
  media: any[],
  latest?: { actorUserId?: number | null; metadata?: string | null; createdAt?: Date | string | null } | null
) {
  const terms = currentPortfolioTerms();
  const contentDigest = buildProfileContentDigest(profile, media);
  const metadata = parseMetadata(latest?.metadata);
  const validActor = Number(latest?.actorUserId) === Number(profile.ownerId);
  const validFlags =
    metadata.adultConfirmed === true &&
    metadata.rightsConfirmed === true &&
    metadata.responsibilityConfirmed === true;
  const validTerms =
    metadata.termsVersion === terms.termsVersion &&
    metadata.termsHash === terms.termsHash;
  const validContent = metadata.contentDigest === contentDigest;
  const current = Boolean(latest && validActor && validFlags && validTerms && validContent);
  let reason: "never_accepted" | "terms_updated" | "content_changed" | "invalid_acceptance" | null = null;
  if (!current) {
    if (!latest) reason = "never_accepted";
    else if (!validActor || !validFlags) reason = "invalid_acceptance";
    else if (!validTerms) reason = "terms_updated";
    else reason = "content_changed";
  }
  return {
    current,
    reason,
    acceptedAt: latest?.createdAt ?? null,
    acceptedVersion: typeof metadata.termsVersion === "string" ? metadata.termsVersion : null,
    termsVersion: terms.termsVersion,
    termsHash: terms.termsHash,
    contentDigest,
  };
}
