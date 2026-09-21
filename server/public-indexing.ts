export type PublicIndexingInput = {
  robotsNoIndex: boolean;
  publicAccessEnabled: boolean;
  publicLaunchEnabled: boolean;
  requireAgeVerification: boolean;
  showGallery: boolean;
};

export function isPublicIndexingEnabled(input: PublicIndexingInput) {
  return (
    !input.robotsNoIndex &&
    input.publicAccessEnabled &&
    input.publicLaunchEnabled &&
    !input.requireAgeVerification &&
    input.showGallery
  );
}
