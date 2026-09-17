import { describe, expect, it } from "vitest";
import {
  buildProfileContentDigest,
  currentPortfolioTerms,
  evaluateProfileTermsAcceptance,
} from "./profile-terms";

const profile = {
  id: 10,
  ownerId: 7,
  stageName: "Portfólio teste",
  slug: "portfolio-teste",
  age: 25,
  description: "Apresentação",
  city: "Brasília",
  region: "DF",
  locationNote: "Centro",
  categories: '["Modelo"]',
  attributes: "[]",
  contactOptions: "[]",
  preferences: "[]",
  languages: '["Português"]',
  availabilityLabel: "Projetos editoriais",
  isAvailableNow: false,
  phone: "+5561999999999",
  whatsapp: "+5561999999999",
  telegram: null,
};
const media = [
  {
    id: 1,
    kind: "photo",
    title: "Capa",
    description: null,
    storageHash: "abc",
    mimeType: "image/jpeg",
    sortOrder: 0,
  },
];
function accepted(p = profile, m = media) {
  const terms = currentPortfolioTerms();
  return {
    actorUserId: p.ownerId,
    createdAt: new Date(),
    metadata: JSON.stringify({
      termsVersion: terms.termsVersion,
      termsHash: terms.termsHash,
      contentDigest: buildProfileContentDigest(p, m),
      adultConfirmed: true,
      rightsConfirmed: true,
      responsibilityConfirmed: true,
    }),
  };
}

describe("profile terms acceptance", () => {
  it("accepts only the owner, current terms and exact current content", () => {
    expect(evaluateProfileTermsAcceptance(profile, media, accepted()).current).toBe(true);
  });
  it("requires a new acceptance after profile data changes", () => {
    const record = accepted();
    const changed = { ...profile, description: "Outra apresentação" };
    expect(evaluateProfileTermsAcceptance(changed, media, record)).toMatchObject({
      current: false,
      reason: "content_changed",
    });
  });
  it("requires a new acceptance after a new media file is added", () => {
    const record = accepted();
    const changedMedia = [
      ...media,
      { ...media[0], id: 2, storageHash: "def", title: "Segundo trabalho" },
    ];
    expect(evaluateProfileTermsAcceptance(profile, changedMedia, record)).toMatchObject({
      current: false,
      reason: "content_changed",
    });
  });
  it("rejects acceptance registered by somebody other than the owner", () => {
    const record = { ...accepted(), actorUserId: 99 };
    expect(evaluateProfileTermsAcceptance(profile, media, record)).toMatchObject({
      current: false,
      reason: "invalid_acceptance",
    });
  });
});

it("reports that the owner never accepted when no record exists", () => {
  expect(evaluateProfileTermsAcceptance(profile, media, null)).toMatchObject({
    current: false,
    reason: "never_accepted",
  });
});

it("invalidates acceptance when the terms version changes", () => {
  const record = accepted();
  const metadata = JSON.parse(record.metadata);
  metadata.termsVersion = "old-version";
  expect(evaluateProfileTermsAcceptance(profile, media, { ...record, metadata: JSON.stringify(metadata) })).toMatchObject({
    current: false,
    reason: "terms_updated",
  });
});

it("invalidates acceptance when the terms hash changes", () => {
  const record = accepted();
  const metadata = JSON.parse(record.metadata);
  metadata.termsHash = "tampered";
  expect(evaluateProfileTermsAcceptance(profile, media, { ...record, metadata: JSON.stringify(metadata) })).toMatchObject({
    current: false,
    reason: "terms_updated",
  });
});

it("requires the adult confirmation flag", () => {
  const record = accepted();
  const metadata = JSON.parse(record.metadata);
  metadata.adultConfirmed = false;
  expect(evaluateProfileTermsAcceptance(profile, media, { ...record, metadata: JSON.stringify(metadata) }).reason).toBe("invalid_acceptance");
});

it("requires the rights confirmation flag", () => {
  const record = accepted();
  const metadata = JSON.parse(record.metadata);
  metadata.rightsConfirmed = false;
  expect(evaluateProfileTermsAcceptance(profile, media, { ...record, metadata: JSON.stringify(metadata) }).reason).toBe("invalid_acceptance");
});

it("requires the responsibility confirmation flag", () => {
  const record = accepted();
  const metadata = JSON.parse(record.metadata);
  metadata.responsibilityConfirmed = false;
  expect(evaluateProfileTermsAcceptance(profile, media, { ...record, metadata: JSON.stringify(metadata) }).reason).toBe("invalid_acceptance");
});

it("invalidates acceptance when media ordering metadata changes", () => {
  const record = accepted();
  const changed = [{ ...media[0], sortOrder: 4 }];
  expect(evaluateProfileTermsAcceptance(profile, changed, record).reason).toBe("content_changed");
});

it("keeps the digest stable when the media array arrives in a different order", () => {
  const twoMedia = [...media, { ...media[0], id: 2, storageHash: "def" }];
  const record = accepted(profile, twoMedia);
  expect(evaluateProfileTermsAcceptance(profile, [...twoMedia].reverse(), record).current).toBe(true);
});

it("exposes the accepted terms version for auditing", () => {
  expect(evaluateProfileTermsAcceptance(profile, media, accepted()).acceptedVersion).toBe(currentPortfolioTerms().termsVersion);
});
