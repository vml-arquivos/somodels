export type PublicIndexingInput = {
  robotsNoIndex: boolean;
  publicAccessEnabled: boolean;
  publicLaunchEnabled: boolean;
  adultMarketplaceEnabled: boolean;
  escortListingsEnabled: boolean;
  requireAgeVerification: boolean;
  showGallery: boolean;
};

export function isPublicIndexingEnabled(input: PublicIndexingInput) {
  return (
    !input.robotsNoIndex &&
    input.publicAccessEnabled &&
    input.publicLaunchEnabled &&
    input.adultMarketplaceEnabled &&
    input.escortListingsEnabled &&
    !input.requireAgeVerification &&
    input.showGallery
  );
}
