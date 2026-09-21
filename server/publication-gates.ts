export type PublicationGateInput = {
  ownerActive: boolean;
  identityApproved: boolean;
  termsCurrent: boolean;
  termsReason?: "never_accepted" | "terms_updated" | "content_changed" | "invalid_acceptance" | null;
  profileComplete: boolean;
  categoriesValid: boolean;
  approvedMediaCount: number;
  pendingMediaCount: number;
  isDemo: boolean;
  isTest: boolean;
  publicAccessEnabled: boolean;
  publicLaunchEnabled: boolean;
  robotsNoIndex: boolean;
  requireAgeVerification: boolean;
  showGallery: boolean;
  reportsEnabled: boolean;
  blockingEnabled: boolean;
};

export function getPublicationGateBlockers(input: PublicationGateInput) {
  const approvalBlockers: string[] = [];
  const publicationBlockers: string[] = [];
  if (!input.ownerActive) approvalBlockers.push("Titular inativo");
  if (!input.identityApproved) approvalBlockers.push("Verificação de identidade válida pendente");
  if (!input.termsCurrent) {
    approvalBlockers.push(
      input.termsReason === "terms_updated"
        ? "Aceite do termo precisa ser renovado"
        : "Titular ainda não aceitou o termo aplicável"
    );
  }
  if (!input.profileComplete)
    approvalBlockers.push("Complete nome profissional, endereço público, cidade e descrição");
  if (!input.categoriesValid)
    approvalBlockers.push("Escolha pelo menos uma categoria profissional");
  if (input.approvedMediaCount < 1) approvalBlockers.push("Aprove pelo menos uma mídia pública");
  if (input.pendingMediaCount > 0) approvalBlockers.push("Ainda há mídia aguardando moderação");
  if (input.isDemo || input.isTest)
    publicationBlockers.push("Dados de teste ou demonstração não podem ser publicados");
  if (!input.publicAccessEnabled) publicationBlockers.push("Acesso público está fechado");
  if (!input.publicLaunchEnabled) publicationBlockers.push("Lançamento público ainda não foi aberto");
  if (input.robotsNoIndex) publicationBlockers.push("Indexação pública está bloqueada");
  if (input.requireAgeVerification)
    publicationBlockers.push("Age assurance real ainda é necessária para abrir a vitrine");
  if (!input.showGallery) publicationBlockers.push("A galeria está oculta nas configurações");
  if (!input.reportsEnabled) publicationBlockers.push("Denúncias ainda não estão habilitadas para a vitrine");
  if (!input.blockingEnabled) publicationBlockers.push("Bloqueios ainda não estão habilitados para a vitrine");
  const blockers = [...approvalBlockers, ...publicationBlockers];
  return {
    ready: blockers.length === 0,
    blockers,
    approvalBlockers,
    publicationBlockers,
  };
}
