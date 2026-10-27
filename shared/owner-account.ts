import { z } from "zod";

export const onlyDigits = (value: string) => value.replace(/\D/g, "");

export function formatCpf(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1-$2");
}

export function maskCpf(last2: string) {
  return `***.***.***-${last2}`;
}

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const check = (length: number) => {
    let sum = 0;
    for (let i = 0; i < length; i += 1)
      sum += Number(cpf[i]) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return check(9) === Number(cpf[9]) && check(10) === Number(cpf[10]);
}

export function formatCep(value: string) {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.length > 5
    ? `${digits.slice(0, 5)}-${digits.slice(5)}`
    : digits;
}

export function formatPhone(value: string) {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return { year, month, day };
}

export function isValidBirthDate(value: string) {
  const parsed = parseIsoDate(value);
  return Boolean(parsed && parsed.year >= 1900);
}

export function isAdultBirthDate(value: string, now = new Date()) {
  const parsed = parseIsoDate(value);
  if (!parsed) return false;
  let age = now.getUTCFullYear() - parsed.year;
  const beforeBirthday =
    now.getUTCMonth() + 1 < parsed.month ||
    (now.getUTCMonth() + 1 === parsed.month && now.getUTCDate() < parsed.day);
  if (beforeBirthday) age -= 1;
  return age >= 18 && age <= 110;
}

export const brazilianStates = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
] as const;

const realNamePattern = /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'’.\- ]*$/;

export const ownerPersonalSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(5, "Informe o nome completo, igual ao documento")
    .max(160)
    .refine(
      value => realNamePattern.test(value),
      "Use somente letras no nome completo"
    )
    .refine(
      value => value.split(/\s+/).filter(part => part.length > 1).length >= 2,
      "Informe nome e sobrenome, igual ao documento"
    ),
  cpf: z.string().refine(isValidCpf, "CPF inválido"),
  birthDate: z
    .string()
    .refine(isValidBirthDate, "Data de nascimento inválida")
    .refine(value => isAdultBirthDate(value), "É preciso ter 18 anos ou mais"),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine(
      value => !value || [10, 11].includes(onlyDigits(value).length),
      "Telefone inválido: use DDD e número"
    )
    .optional()
    .default(""),
  zipCode: z
    .string()
    .trim()
    .refine(value => !value || onlyDigits(value).length === 8, "CEP inválido")
    .optional()
    .default(""),
  city: z.string().trim().max(120).optional().default(""),
  state: z
    .string()
    .trim()
    .toUpperCase()
    .refine(
      value => !value || (brazilianStates as readonly string[]).includes(value),
      "Estado inválido"
    )
    .optional()
    .default(""),
});

export type OwnerPersonalInput = z.infer<typeof ownerPersonalSchema>;

// Na atualização, o CPF pode ficar em branco para manter o que já está salvo.
export const ownerPersonalUpdateSchema = ownerPersonalSchema.extend({
  cpf: z
    .string()
    .optional()
    .default("")
    .refine(value => !value.trim() || isValidCpf(value), "CPF inválido"),
});
