import { describe, expect, it } from "vitest";
import {
  ageFromBirthDate,
  allChecksPassed,
  csvCell,
  dateKey,
  dueDateFrom,
  isDateKey,
  listDays,
  missingVerificationFiles,
  monthlyEquivalentCents,
  normalizeTags,
  paymentBucket,
  resolveRange,
  suggestStage,
  toCsv,
} from "../shared/admin-crm";

describe("etiquetas do CRM", () => {
  it("normaliza, remove repetidas e limita", () => {
    expect(normalizeTags(["VIP", "vip", " Pagou Adiantado ", "a", 5, "çã!!"])).toEqual([
      "vip",
      "pagou-adiantado",
      "ca",
    ]);
    expect(normalizeTags(Array.from({ length: 20 }, (_, i) => `tag${i}`))).toHaveLength(8);
    expect(normalizeTags("x")).toEqual([]);
  });
});

describe("etapa sugerida", () => {
  const base = {
    listings: 0,
    published: 0,
    hasActivePlan: false,
    overduePayments: 0,
    suspendedListings: 0,
    daysSinceSignup: 2,
    daysSinceLastLogin: 1,
  };
  it("segue a prioridade: atenção > ativo > negociando > inativo > novo", () => {
    expect(suggestStage({ ...base, overduePayments: 1, published: 2 })).toBe("atencao");
    expect(suggestStage({ ...base, suspendedListings: 1 })).toBe("atencao");
    expect(suggestStage({ ...base, published: 1 })).toBe("ativo");
    expect(suggestStage({ ...base, hasActivePlan: true })).toBe("ativo");
    expect(suggestStage({ ...base, listings: 1 })).toBe("negociacao");
    expect(suggestStage({ ...base, daysSinceLastLogin: 90 })).toBe("inativo");
    expect(suggestStage(base)).toBe("novo");
  });
});

describe("pagamentos", () => {
  const now = new Date("2026-10-26T12:00:00Z");
  it("pendente vencido vira atrasado", () => {
    expect(paymentBucket("pending", new Date("2026-10-25T00:00:00Z"), now)).toBe("overdue");
    expect(paymentBucket("pending", new Date("2026-10-27T00:00:00Z"), now)).toBe("pending");
    expect(paymentBucket("pending", null, now)).toBe("pending");
    expect(paymentBucket("paid", new Date("2020-01-01"), now)).toBe("paid");
    expect(paymentBucket("refunded", null, now)).toBe("refunded");
  });
  it("calcula o valor mensal equivalente", () => {
    expect(monthlyEquivalentCents(9900, "month", 30)).toBe(9900);
    expect(monthlyEquivalentCents(120000, "year", 365)).toBe(10000);
    expect(monthlyEquivalentCents(5000, "none", 15)).toBe(10000);
    expect(monthlyEquivalentCents(0, "month", 30)).toBe(0);
  });
  it("vencimento padrão em 3 dias", () => {
    expect(dueDateFrom(now).toISOString()).toBe("2026-10-29T12:00:00.000Z");
  });
});

describe("períodos", () => {
  it("valida datas", () => {
    expect(isDateKey("2026-02-28")).toBe(true);
    expect(isDateKey("2026-02-30")).toBe(false);
    expect(isDateKey("26-02-01")).toBe(false);
  });
  it("resolve intervalo por dias e por datas", () => {
    const now = new Date("2026-10-26T15:00:00Z");
    const byDays = resolveRange({ days: 7, now });
    expect(byDays.to).toBe("2026-10-26");
    expect(byDays.from).toBe("2026-10-20");
    expect(byDays.spanDays).toBe(7);
    const swapped = resolveRange({ from: "2026-10-10", to: "2026-10-01", now });
    expect(swapped.from).toBe("2026-10-01");
    expect(swapped.to).toBe("2026-10-10");
    expect(() => resolveRange({ from: "2020-01-01", to: "2026-10-01", now })).toThrow();
  });
  it("lista todos os dias do período", () => {
    expect(listDays("2026-10-01", "2026-10-03")).toEqual([
      "2026-10-01",
      "2026-10-02",
      "2026-10-03",
    ]);
    expect(dateKey(new Date("2026-10-26T02:00:00Z"))).toBe("2026-10-25");
  });
  it("calcula idade", () => {
    const now = new Date("2026-10-26T12:00:00Z");
    expect(ageFromBirthDate("2000-10-26", now)).toBe(26);
    expect(ageFromBirthDate("2000-10-27", now)).toBe(25);
    expect(ageFromBirthDate("lixo", now)).toBeNull();
  });
});

describe("CSV", () => {
  it("escapa aspas, quebras de linha e fórmulas", () => {
    expect(csvCell('a;b')).toBe('"a;b"');
    expect(csvCell('diz "oi"')).toBe('"diz ""oi"""');
    expect(csvCell("=SOMA(A1)")).toBe("'=SOMA(A1)");
    expect(csvCell("linha1\nlinha2")).toBe("linha1 linha2");
    expect(csvCell(null)).toBe("");
  });
  it("monta com BOM e ponto e vírgula", () => {
    const csv = toCsv(["a", "b"], [[1, "x;y"]]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("a;b\r\n1;\"x;y\"\r\n");
  });
});

describe("verificação de documentos", () => {
  it("exige frente do documento e selfie ou vídeo", () => {
    expect(missingVerificationFiles([])).toEqual(["doc_front", "selfie"]);
    expect(missingVerificationFiles(["doc_front"])).toEqual(["selfie"]);
    expect(missingVerificationFiles(["doc_front", "video"])).toEqual([]);
    expect(missingVerificationFiles(["doc_front", "selfie", "doc_back"])).toEqual([]);
  });
  it("só aprova com todos os itens conferidos", () => {
    const all = { name: true, cpf: true, birth: true, adult: true, face: true, valid: true };
    expect(allChecksPassed(all)).toBe(true);
    expect(allChecksPassed({ ...all, face: false })).toBe(false);
    expect(allChecksPassed({})).toBe(false);
  });
});
