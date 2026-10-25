import { describe, expect, it } from "vitest";
import {
  defaultSiteSettings,
  normalizeSiteSettings,
} from "../shared/portfolio";

describe("site settings normalization", () => {
  it("preserves legacy custom copy in the corresponding home sections", () => {
    const settings = normalizeSiteSettings({
      eyebrow: "Uma chamada customizada",
      title: "Uma headline customizada",
      subtitle: "Um subtítulo customizado para a vitrine.",
      about: "Um texto institucional customizado para a página.",
      footer: "Uma assinatura customizada para o rodapé.",
    });

    expect(settings.home.hero.eyebrow).toBe("Uma chamada customizada");
    expect(settings.home.hero.title).toBe("Uma headline customizada");
    expect(settings.home.hero.subtitle).toBe(
      "Um subtítulo customizado para a vitrine."
    );
    expect(settings.home.about.text).toBe(
      "Um texto institucional customizado para a página."
    );
    expect(settings.home.footer.tagline).toBe(
      "Uma assinatura customizada para o rodapé."
    );
  });

  it("fills new sections from defaults when old records have no home block", () => {
    const settings = normalizeSiteSettings({ showGallery: false });

    expect(settings.home).toEqual(defaultSiteSettings.home);
    expect(settings.showGallery).toBe(false);
  });

  it("falls back to safe defaults for malformed editorial lists", () => {
    expect(() =>
      normalizeSiteSettings({
        home: {
          trust: {
            points: [{ title: "only one" }],
          },
        },
      })
    ).not.toThrow();
  });
});
