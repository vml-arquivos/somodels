export type PublicIndexingInput = {
  robotsNoIndex: boolean;
  publicAccessEnabled: boolean;
  requireAgeVerification: boolean;
  showGallery: boolean;
};

export function isPublicIndexingEnabled(input: PublicIndexingInput) {
  return (
    !input.robotsNoIndex &&
    input.publicAccessEnabled &&
    !input.requireAgeVerification &&
    input.showGallery
  );
}
