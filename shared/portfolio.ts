import { z } from "zod";
export const portfolioCategories = [
  "Modelo",
  "Criador de conteúdo",
  "Fotógrafo",
  "Ator",
  "Artista",
  "Apresentador",
] as const;
export const portfolioPolicy =
  "Somente portfólios profissionais. Não são permitidos anúncios de serviços sexuais, conteúdo sexual explícito ou uso de imagens sem autorização.";
export function normalizePhone(value: string): string {
  const raw = value.trim();
  if (!raw) return "";
  if (!/^[+\d\s().-]+$/.test(raw)) throw new Error("Telefone inválido");
  let digits = raw.replace(/\D/g, "");
  if (!raw.startsWith("+") && (digits.length === 10 || digits.length === 11))
    digits = `55${digits}`;
  if (!/^[1-9]\d{9,14}$/.test(digits))
    throw new Error("Informe DDI, DDD e telefone válidos");
  return `+${digits}`;
}
export function contactLinks(phone?: string | null, whatsapp?: string | null) {
  try {
    const p = normalizePhone(phone || "");
    const w = normalizePhone(whatsapp || phone || "");
    return {
      tel: p ? `tel:${p}` : null,
      whatsapp: w ? `https://wa.me/${w.slice(1)}` : null,
    };
  } catch {
    return { tel: null, whatsapp: null };
  }
}
export const siteSettingsSchema = z.object({
  title: z.string().trim().min(3).max(120),
  subtitle: z.string().trim().min(3).max(400),
  buttonText: z.string().trim().min(2).max(50),
  about: z.string().trim().min(3).max(1200),
  footer: z.string().trim().min(2).max(250),
  showGallery: z.boolean(),
  showAbout: z.boolean(),
  showContact: z.boolean(),
});
export const defaultSiteSettings = {
  title: "Talentos, histórias e novos projetos.",
  subtitle:
    "Conheça portfólios profissionais de modelos e criadores. Explore trabalhos, especialidades e trajetórias.",
  buttonText: "Explorar portfólios",
  about:
    "Um espaço para apresentar trabalhos e conectar profissionais a projetos criativos. Cada portfólio passa por revisão antes da publicação.",
  footer: "Só Models • Portfólios profissionais de modelos e criadores.",
  showGallery: true,
  showAbout: true,
  showContact: true,
};
export type SiteSettings = z.infer<typeof siteSettingsSchema>;
