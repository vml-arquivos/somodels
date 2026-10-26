import { describe, expect, it } from "vitest";
import { buildReadiness, type ReadinessInput } from "./readiness";

const ready: ReadinessInput = {
  publicAccessEnabled: true,
  publicLaunchEnabled: true,
  robotsNoIndex: false,
  testMode: false,
  allowFakeData: false,
  ageVerificationConfigured: true,
  requireIdentityVerification: false,
  storageConfigured: true,
  canonicalOriginSet: true,
  releaseKnown: true,
  adminMfaRequired: true,
  flags: {
    reportsEnabled: true,
    favoritesEnabled: true,
    blockingEnabled: true,
    secureContactEnabled: true,
    sponsoredListingsEnabled: false,
    paymentsEnabled: false,
  },
  counts: {
    publishedProfiles: 3,
    pendingProfiles: 0,
    pendingMedia: 0,
    pendingIdentity: 0,
    openReports: 0,
    pendingSubscriptions: 0,
    activePlans: 1,
    owners: 3,
  },
};

describe("buildReadiness", () => {
  it("não marca bloqueios quando o ambiente está pronto", () => {
    const items = buildReadiness(ready);
    expect(items.filter(item => item.level === "block")).toEqual([]);
  });

  it("bloqueia quando a vitrine está fechada", () => {
    const items = buildReadiness({ ...ready, publicLaunchEnabled: false });
    expect(items.find(item => item.id === "launch")?.level).toBe("block");
  });

  it("bloqueia com indexação desligada, modo de teste ou dados fictícios", () => {
    const items = buildReadiness({
      ...ready,
      robotsNoIndex: true,
      testMode: true,
    });
    expect(items.find(item => item.id === "indexing")?.level).toBe("block");
    expect(items.find(item => item.id === "fake-data")?.level).toBe("block");
  });

  it("tolera contadores indisponíveis", () => {
    expect(() => buildReadiness({ ...ready, counts: null })).not.toThrow();
  });

  it("devolve ids únicos", () => {
    const ids = buildReadiness(ready).map(item => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
