import { describe, expect, it } from "vitest";
import {
  formatCpf,
  isAdultBirthDate,
  isValidCpf,
  ownerPersonalSchema,
} from "../shared/owner-account";

describe("CPF", () => {
  it("aceita CPF válido com ou sem máscara", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
    expect(isValidCpf("52998224725")).toBe(true);
  });
  it("recusa dígito errado, repetido e tamanho errado", () => {
    expect(isValidCpf("529.982.247-24")).toBe(false);
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("123")).toBe(false);
  });
  it("formata durante a digitação", () => {
    expect(formatCpf("52998224725")).toBe("529.982.247-25");
    expect(formatCpf("5299")).toBe("529.9");
  });
});

describe("maioridade", () => {
  const now = new Date("2026-10-26T12:00:00Z");
  it("exige 18 anos completos", () => {
    expect(isAdultBirthDate("2008-10-26", now)).toBe(true);
    expect(isAdultBirthDate("2008-10-27", now)).toBe(false);
    expect(isAdultBirthDate("2010-01-01", now)).toBe(false);
  });
  it("recusa datas inexistentes", () => {
    expect(isAdultBirthDate("1990-02-31", now)).toBe(false);
  });
});

describe("dados pessoais", () => {
  const base = {
    fullName: "Maria da Silva Santos",
    cpf: "529.982.247-25",
    birthDate: "1995-04-12",
  };
  it("aceita o mínimo obrigatório", () => {
    const parsed = ownerPersonalSchema.safeParse(base);
    expect(parsed.success).toBe(true);
  });
  it("recusa nome sem sobrenome e nome com números", () => {
    expect(ownerPersonalSchema.safeParse({ ...base, fullName: "Maria" }).success).toBe(false);
    expect(ownerPersonalSchema.safeParse({ ...base, fullName: "Maria 123 Silva" }).success).toBe(false);
  });
  it("recusa menor de idade e CPF inválido", () => {
    expect(ownerPersonalSchema.safeParse({ ...base, birthDate: "2015-01-01" }).success).toBe(false);
    expect(ownerPersonalSchema.safeParse({ ...base, cpf: "000.000.000-00" }).success).toBe(false);
  });
  it("valida telefone, CEP e estado quando informados", () => {
    expect(ownerPersonalSchema.safeParse({ ...base, phone: "(61) 99999-0000", zipCode: "70000-000", state: "df" }).success).toBe(true);
    expect(ownerPersonalSchema.safeParse({ ...base, phone: "123" }).success).toBe(false);
    expect(ownerPersonalSchema.safeParse({ ...base, state: "XX" }).success).toBe(false);
  });
});
