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

  it("normalizes the former brand in persisted copy", () => {
    const settings = normalizeSiteSettings({
      home: {
        footer: {
          tagline: "Só Models · Classificados adultos legais",
          signature: "So Models — Portal adulto",
        },
      },
    });

    expect(settings.home.footer.tagline).toContain("Ero Models");
    expect(settings.home.footer.signature).toContain("Ero Models");
    expect(settings.home.footer.tagline).not.toMatch(/Só Models|So Models/i);
  });

  it("replaces former default copy with the plain-language defaults", () => {
    const settings = normalizeSiteSettings({
      home: {
        hero: {
          notes: [
            "Publicação revisada",
            "Contato autorizado",
            "Privacidade por padrão",
          ],
        },
        holder: {
          text: "Um cadastro guiado para apresentar seu trabalho, controlar suas informações e enviar o perfil para revisão.",
        },
      },
    });

    expect(settings.home.hero.notes[0]).toBe("Só para maiores de 18 anos");
    expect(settings.home.hero.notes[1]).toBe("Contato direto com quem anuncia");
    expect(settings.home.holder.text).toContain("Sem fila de aprovação");
    expect(settings.home.holder.text).not.toMatch(/revisão/i);
  });
});
