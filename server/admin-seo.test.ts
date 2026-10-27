import { describe, expect, it } from "vitest";
import {
  isSafeSeoImage,
  normalizeSeoOverrides,
  seoLimits,
  seoTips,
} from "../shared/admin-seo";
import { hasVerificationMagicBytes } from "./panel-routes";

describe("ajustes de SEO do painel", () => {
  it("só aceita páginas públicas fixas e descarta o resto", () => {
    const result = normalizeSeoOverrides({
      image: "",
      pages: {
        "/": { title: "  Ero   Models  ", description: "Texto" },
        "/admin": { title: "Invasão", noindex: false },
        "/titular": { noindex: true },
        "/contato": { noindex: true },
        "/ajuda": { title: "", description: "", noindex: false },
      },
    });
    expect(Object.keys(result.pages).sort()).toEqual(["/", "/contato"]);
    expect(result.pages["/"].title).toBe("Ero Models");
    expect(result.pages["/contato"]).toEqual({ noindex: true });
  });

  it("limita tamanhos e remove caracteres de controle", () => {
    const result = normalizeSeoOverrides({
      pages: {
        "/": {
          title: "a".repeat(500),
          description: "linha\u0000um\n\ndois" + "b".repeat(500),
        },
      },
    });
    expect(result.pages["/"].title).toHaveLength(seoLimits.title);
    expect(result.pages["/"].description!.length).toBeLessThanOrEqual(
      seoLimits.description
    );
    expect(result.pages["/"].description).not.toMatch(/[\u0000-\u001f]/);
  });

  it("aceita imagem local ou https e recusa o resto", () => {
    expect(isSafeSeoImage("")).toBe(true);
    expect(isSafeSeoImage("/og.png")).toBe(true);
    expect(isSafeSeoImage("https://exemplo.com/og.png")).toBe(true);
    expect(isSafeSeoImage("http://exemplo.com/og.png")).toBe(false);
    expect(isSafeSeoImage("//exemplo.com/og.png")).toBe(false);
    expect(isSafeSeoImage("javascript:alert(1)")).toBe(false);
    expect(normalizeSeoOverrides({ image: "javascript:alert(1)" }).image).toBe("");
  });

  it("entradas inválidas viram um objeto vazio", () => {
    expect(normalizeSeoOverrides(null)).toEqual({ image: "", pages: {} });
    expect(normalizeSeoOverrides("x")).toEqual({ image: "", pages: {} });
  });

  it("avisa sobre título e descrição fora do tamanho ideal", () => {
    expect(seoTips("Oi", "")).toHaveLength(1);
    expect(seoTips("a".repeat(70), "b".repeat(200))).toHaveLength(2);
    expect(seoTips("a".repeat(40), "b".repeat(120))).toEqual([]);
  });
});

describe("arquivos de verificação", () => {
  it("confere o início real de cada tipo de arquivo", () => {
    expect(
      hasVerificationMagicBytes(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")
    ).toBe(true);
    expect(
      hasVerificationMagicBytes(Buffer.from("not an image"), "image/jpeg")
    ).toBe(false);
    expect(
      hasVerificationMagicBytes(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]),
        "image/png"
      )
    ).toBe(true);
    expect(
      hasVerificationMagicBytes(
        Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]),
        "image/webp"
      )
    ).toBe(true);
    expect(
      hasVerificationMagicBytes(
        Buffer.concat([Buffer.alloc(4), Buffer.from("ftypmp42")]),
        "video/mp4"
      )
    ).toBe(true);
    expect(
      hasVerificationMagicBytes(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), "video/webm")
    ).toBe(true);
    expect(
      hasVerificationMagicBytes(Buffer.from("<script>"), "text/html")
    ).toBe(false);
  });
});
