import { describe, expect, it } from "vitest";
import { getPublicationGateBlockers, type PublicationGateInput } from "./publication-gates";

const ready: PublicationGateInput = {
  ownerActive: true,
  profileActive: true,
  identityApproved: true,
  termsCurrent: true,
  termsReason: null,
  profileComplete: true,
  categoriesValid: true,
  approvedMediaCount: 1,
  pendingMediaCount: 0,
  isDemo: false,
  isTest: false,
  publicAccessEnabled: true,
  publicLaunchEnabled: true,
  adultMarketplaceEnabled: true,
  escortListingsEnabled: true,
  robotsNoIndex: false,
  requireAgeVerification: false,
  showGallery: true,
  reportsEnabled: true,
  blockingEnabled: true,
};

describe("publication gates", () => {
  it("allows publication only when every gate is ready", () => {
    expect(getPublicationGateBlockers(ready)).toEqual({
      ready: true,
      blockers: [],
      approvalBlockers: [],
      publicationBlockers: [],
    });
  });

  it.each([
    ["ownerActive", "Titular inativo"],
    ["profileActive", "Perfil inativo ou excluído"],
    ["identityApproved", "Verificação de identidade válida pendente"],
    ["termsCurrent", "Titular ainda não aceitou o termo aplicável"],
    ["profileComplete", "Complete nome artístico, cidade e descrição do anúncio"],
    ["categoriesValid", "Escolha pelo menos uma categoria do anúncio"],
  ] as const)("blocks approval when %s is not ready", (key, message) => {
    const input = { ...ready, [key]: false } as PublicationGateInput;
    expect(getPublicationGateBlockers(input).approvalBlockers).toContain(message);
  });

  it("blocks approval with no public media or pending moderation", () => {
    const result = getPublicationGateBlockers({ ...ready, approvedMediaCount: 0, pendingMediaCount: 1 });
    expect(result.approvalBlockers).toEqual([
      "Aprove pelo menos uma mídia pública",
      "Ainda há mídia aguardando moderação",
    ]);
  });

  it.each([
    ["publicAccessEnabled", "Acesso público está fechado"],
    ["publicLaunchEnabled", "Lançamento público ainda não foi aberto"],
    ["adultMarketplaceEnabled", "Marketplace adulto ainda não foi habilitado"],
    ["escortListingsEnabled", "Classificados de acompanhantes ainda não foram habilitados"],
    ["robotsNoIndex", "Indexação pública está bloqueada"],
    ["requireAgeVerification", "Age assurance real ainda é necessária para abrir a vitrine"],
    ["showGallery", "A galeria está oculta nas configurações"],
    ["reportsEnabled", "Denúncias ainda não estão habilitadas para a vitrine"],
    ["blockingEnabled", "Bloqueios ainda não estão habilitados para a vitrine"],
  ] as const)("keeps publication hidden when %s is unsafe", (key, message) => {
    const input = { ...ready, [key]: key === "robotsNoIndex" || key === "requireAgeVerification" ? true : false } as PublicationGateInput;
    expect(getPublicationGateBlockers(input).publicationBlockers).toContain(message);
  });

  it("rejects non-production data from publication", () => {
    const result = getPublicationGateBlockers({ ...ready, isDemo: true, isTest: true });
    expect(result.ready).toBe(false);
    expect(result.publicationBlockers).toEqual([
      "Dados não produtivos não podem ser publicados",
    ]);
  });
});
