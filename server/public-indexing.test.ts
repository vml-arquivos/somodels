import { describe, expect, it } from "vitest";
import { isPublicIndexingEnabled } from "./public-indexing";

const enabled = {
  robotsNoIndex: false,
  publicAccessEnabled: true,
  requireAgeVerification: false,
  showGallery: true,
};

describe("public indexing gate", () => {
  it("allows indexing only when every public prerequisite is open", () => {
    expect(isPublicIndexingEnabled(enabled)).toBe(true);
  });

  it("closes indexing when robots noindex is active", () => {
    expect(isPublicIndexingEnabled({ ...enabled, robotsNoIndex: true })).toBe(false);
  });

  it("closes indexing when public access is disabled", () => {
    expect(isPublicIndexingEnabled({ ...enabled, publicAccessEnabled: false })).toBe(false);
  });

  it("closes indexing while the age gate is required", () => {
    expect(isPublicIndexingEnabled({ ...enabled, requireAgeVerification: true })).toBe(false);
  });

  it("closes indexing when the gallery is hidden", () => {
    expect(isPublicIndexingEnabled({ ...enabled, showGallery: false })).toBe(false);
  });

  it("stays fail-closed when multiple prerequisites are missing", () => {
    expect(
      isPublicIndexingEnabled({
        robotsNoIndex: true,
        publicAccessEnabled: false,
        requireAgeVerification: true,
        showGallery: false,
      })
    ).toBe(false);
  });
});
