import { describe, expect, it } from "vitest";
import { escapeHtml, getServerSeo, renderSeoHead } from "./seo";

describe("server SEO", () => {
  it("escapes metadata before placing it in HTML", () => {
    expect(escapeHtml(`<script>alert('x')</script>`)).toBe(
      "&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;"
    );
  });

  it("renders canonical, robots and JSON-LD safely", () => {
    const head = renderSeoHead({
      title: "Só Models",
      description: "Descrição segura",
      canonical: "https://example.com/",
      noindex: false,
      jsonLd: { "@context": "https://schema.org", name: "</script><script>alert(1)" },
    });
    expect(head).toContain('<link rel="canonical" href="https://example.com/" />');
    expect(head).toContain('content="index, follow"');
    expect(head).toContain("\\u003c/script>");
  });

  it("keeps private routes noindex", async () => {
    const seo = await getServerSeo("/login");
    expect(seo.noindex).toBe(true);
    expect(seo.title).toBe("Entrar — Só Models");
    expect(seo.canonical).toBe("https://somodels.buscarr.com.br/login");
  });
});
