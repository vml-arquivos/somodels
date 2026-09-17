import { z } from "zod";
import { portfolioCategories, normalizePhone } from "./portfolio";
const phoneSchema = z
  .string()
  .max(40)
  .transform((v, ctx) => {
    try {
      return normalizePhone(v);
    } catch {
      ctx.addIssue({
        code: "custom",
        message: "Telefone inválido: informe DDI, DDD e número",
      });
      return z.NEVER;
    }
  });
export const profileInputSchema = z.object({
  stageName: z.string().trim().min(2).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(160)
    .regex(/^[a-z0-9-]+$/),
  description: z.string().trim().max(5000).optional(),
  city: z.string().trim().min(2).max(120),
  region: z.string().trim().max(80).optional(),
  locationNote: z.string().trim().max(180).optional(),
  categories: z.array(z.enum(portfolioCategories)).min(1).max(6),
  attributes: z.array(z.string().trim().min(1).max(60)).max(30).default([]),
  contactOptions: z.array(z.string().trim().min(1).max(60)).max(10).default([]),
  age: z.number().int().min(18).max(99).optional(),
  avatarUrl: z
    .string()
    .url()
    .or(z.string().startsWith("/manus-storage/"))
    .optional(),
  preferences: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  languages: z.array(z.string().trim().min(1).max(60)).max(12).default([]),
  availabilityLabel: z.string().trim().max(160).optional(),
  isAvailableNow: z.boolean().default(false),
  phone: phoneSchema.optional(),
  whatsapp: phoneSchema.optional(),
  telegram: z.string().trim().max(80).optional(),
});
