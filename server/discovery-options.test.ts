import { describe, expect, it } from "vitest";
import {
  centsToReais,
  estimateMonthlyEarnings,
  formatBRL,
  reaisToCents,
  serviceOptions,
  attendancePlaceOptions,
} from "../shared/discovery-options";
import { profileInputSchema } from "../shared/profile-schema";
import {
  assertIdentityReviewAllowed,
  identityValidityDays,
} from "./identity-review";

const baseProfile = {
  stageName: "Marina Alves",
  slug: "marina-alves",
  city: "Brasília",
  categories: ["Acompanhante" as const],
};

describe("valores em reais", () => {
  it("converte entradas comuns para centavos", () => {
    expect(reaisToCents("250")).toBe(25000);
    expect(reaisToCents("250,50")).toBe(25050);
    expect(reaisToCents("R$ 1.250,00")).toBe(125000);
    expect(reaisToCents("")).toBeNull();
    expect(reaisToCents("abc")).toBeNull();
    expect(reaisToCents("-5")).toBeNull();
    expect(reaisToCents("999999999")).toBeNull();
  });

  it("formata para exibição e para o campo do formulário", () => {
    expect(centsToReais(25000)).toBe("250");
    expect(centsToReais(25050)).toBe("250,50");
    expect(centsToReais(null)).toBe("");
    expect(formatBRL(25000).replace(/\s/g, " ")).toBe("R$ 250");
  });
});

describe("calculadora de ganhos", () => {
  it("estima receita e resultado mensal", () => {
    expect(
      estimateMonthlyEarnings({
        hourlyRateCents: 25000,
        hoursPerAppointment: 1,
        appointmentsPerWeek: 6,
        monthlyCostsCents: 100000,
      })
    ).toEqual({ grossCents: 600000, costsCents: 100000, netCents: 500000 });
  });
});

describe("entrada de perfil com preço, serviços e local", () => {
  it("aceita campos novos opcionais e mantém compatibilidade", () => {
    const legacy = profileInputSchema.parse(baseProfile);
    expect(legacy.services).toEqual([]);
    expect(legacy.attendancePlaces).toEqual([]);
    const full = profileInputSchema.parse({
      ...baseProfile,
      priceFromCents: 30000,
      services: [serviceOptions[0]],
      attendancePlaces: [attendancePlaceOptions[1]],
    });
    expect(full.priceFromCents).toBe(30000);
  });

  it("rejeita valores fora do vocabulário ou do limite", () => {
    expect(
      profileInputSchema.safeParse({ ...baseProfile, services: ["Qualquer"] })
        .success
    ).toBe(false);
    expect(
      profileInputSchema.safeParse({
        ...baseProfile,
        attendancePlaces: ["Outro"],
      }).success
    ).toBe(false);
    expect(
      profileInputSchema.safeParse({ ...baseProfile, priceFromCents: -1 })
        .success
    ).toBe(false);
    expect(
      profileInputSchema.safeParse({
        ...baseProfile,
        priceFromCents: 10_000_001,
      }).success
    ).toBe(false);
  });
});

describe("revisão manual de identidade", () => {
  const pending = { userId: 10, status: "pending" };

  it("permite aprovar ou recusar com motivo", () => {
    expect(() =>
      assertIdentityReviewAllowed({
        row: pending,
        actorUserId: 1,
        decision: "approved",
      })
    ).not.toThrow();
    expect(() =>
      assertIdentityReviewAllowed({
        row: pending,
        actorUserId: 1,
        decision: "rejected",
        reason: "Rosto não confere",
      })
    ).not.toThrow();
  });

  it("exige motivo para recusar", () => {
    expect(() =>
      assertIdentityReviewAllowed({
        row: pending,
        actorUserId: 1,
        decision: "rejected",
        reason: "  ",
      })
    ).toThrow("motivo");
  });

  it("bloqueia autoaprovação e decisões repetidas", () => {
    expect(() =>
      assertIdentityReviewAllowed({
        row: pending,
        actorUserId: 10,
        decision: "approved",
      })
    ).toThrow("própria verificação");
    expect(() =>
      assertIdentityReviewAllowed({
        row: { userId: 10, status: "approved" },
        actorUserId: 1,
        decision: "approved",
      })
    ).toThrow("já foi analisada");
    expect(() =>
      assertIdentityReviewAllowed({
        row: undefined,
        actorUserId: 1,
        decision: "approved",
      })
    ).toThrow("não encontrada");
  });

  it("limita a validade entre 30 e 730 dias", () => {
    expect(identityValidityDays()).toBe(365);
    expect(identityValidityDays(5)).toBe(30);
    expect(identityValidityDays(5000)).toBe(730);
  });
});
