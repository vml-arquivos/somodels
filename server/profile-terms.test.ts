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
