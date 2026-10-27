import { readFileSync } from "node:fs";
import path from "node:path";
import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { profileReviews } from "../drizzle/schema";
import {
  publicAuthorName,
  ratingLabel,
  reviewTextProblem,
  summarizeRatings,
  validateReviewInput,
} from "../shared/reviews";

describe("texto da avaliação", () => {
  it("recusa telefone, e-mail, link e rede social", () => {
    expect(reviewTextProblem("me chama no 61 99999-9999")).toBeTruthy();
    expect(reviewTextProblem("zap +55 (61) 9 9999 9999")).toBeTruthy();
    expect(reviewTextProblem("escreve pra fulano@gmail.com")).toBeTruthy();
    expect(reviewTextProblem("veja em www.site.com.br")).toBeTruthy();
    expect(reviewTextProblem("tem no exemplo.com")).toBeTruthy();
    expect(reviewTextProblem("segue @fulana_oficial")).toBeTruthy();
  });

  it("aceita texto normal, inclusive com números curtos", () => {
    expect(reviewTextProblem("Atendimento ótimo, chegou às 20h e ficou 2 horas.")).toBeNull();
    expect(reviewTextProblem("Nota 10, recomendo muito!")).toBeNull();
  });

  it("valida nota, tipo e tamanho", () => {
    const ok = validateReviewInput({
      rating: 5,
      kind: "elogio",
      title: "  Muito bom ",
      body: "Pessoa educada e pontual, tudo como combinado.",
    });
    expect(ok).toMatchObject({ rating: 5, kind: "elogio", title: "Muito bom" });
    expect(() =>
      validateReviewInput({ rating: 0, kind: "elogio", body: "texto longo o bastante" })
    ).toThrow();
    expect(() =>
      validateReviewInput({ rating: 3, kind: "outro", body: "texto longo o bastante" })
    ).toThrow();
    expect(() =>
      validateReviewInput({ rating: 3, kind: "comentario", body: "curto" })
    ).toThrow();
    expect(() =>
      validateReviewInput({
        rating: 3,
        kind: "comentario",
        body: "me ligue 61999998888 depois",
      })
    ).toThrow();
  });
});

describe("nome e notas", () => {
  it("mostra só o primeiro nome e a inicial do último", () => {
    expect(publicAuthorName("maria souza LIMA")).toBe("Maria L.");
    expect(publicAuthorName("João")).toBe("João");
    expect(publicAuthorName("")).toBe("Cliente");
    expect(publicAuthorName(null)).toBe("Cliente");
    expect(publicAuthorName("12345")).toBe("Cliente");
  });

  it("resume as notas", () => {
    expect(summarizeRatings([])).toEqual({
      count: 0,
      average: 0,
      distribution: [0, 0, 0, 0, 0],
    });
    const summary = summarizeRatings([5, 5, 4, 1, 9, 0]);
    expect(summary.count).toBe(4);
    expect(summary.average).toBe(3.8);
    expect(summary.distribution).toEqual([1, 0, 0, 1, 2]);
    expect(ratingLabel(4.8)).toBe("Muito satisfeito(a)");
    expect(ratingLabel(1)).toBe("Muito insatisfeito(a)");
  });
});

describe("migration 0015 (avaliações)", () => {
  const sql = readFileSync(
    path.resolve(__dirname, "../drizzle/0015_profile_reviews.sql"),
    "utf8"
  );
  it("SQL e schema têm as mesmas colunas", () => {
    const start = sql.indexOf("CREATE TABLE `profile_reviews`");
    const block = sql.slice(start, sql.indexOf(");", start));
    const sqlColumns = Array.from(block.matchAll(/^\t`(\w+)` /gm)).map(m => m[1]);
    const schemaColumns = Object.values(getTableColumns(profileReviews)).map(c => c.name);
    expect(sqlColumns.sort()).toEqual(schemaColumns.sort());
  });
  it("só cria tabela nova", () => {
    expect(sql).not.toMatch(/DROP\s|ALTER TABLE|DELETE\s|TRUNCATE/i);
  });
});
