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

export const portfolioTermsVersion = "2026-09-16.1";
export const portfolioTermsTitle = "Termo de responsabilidade e publicação";
export const portfolioTermsClauses = [
  "Declaro ter 18 anos ou mais e capacidade legal para administrar este portfólio.",
  "Declaro ser responsável pelo perfil e possuir os direitos, licenças e autorizações necessários para usar nomes, dados, imagens, voz, fotos, vídeos e demais materiais enviados, inclusive autorizações de terceiros quando aplicáveis.",
  "Assumo responsabilidade pela veracidade, legalidade e origem do conteúdo que envio ou autorizo publicar no meu perfil e comprometo-me a manter essas informações atualizadas.",
  "Não publicarei conteúdo ilegal, envolvendo menores, não consensual, sexual explícito, oferta de serviços sexuais, exploração, fraude, violação de privacidade, propriedade intelectual ou material sem autorização.",
  "Autorizo a Só Models a armazenar, exibir, moderar, ocultar ou remover o conteúdo do portfólio conforme estes termos, as regras da plataforma e a legislação aplicável.",
  "Reconheço que a plataforma fornece infraestrutura de portfólio e moderação e não endossa declarações individuais dos titulares. Este termo não exclui deveres ou responsabilidades da plataforma que não possam ser afastados pela legislação aplicável.",
  "Compreendo que alterações relevantes nos dados, fotos ou vídeos do perfil podem exigir um novo aceite antes da próxima aprovação ou publicação.",
] as const;
export const portfolioTermsText = [
  portfolioTermsTitle,
  `Versão ${portfolioTermsVersion}`,
  ...portfolioTermsClauses.map((clause, index) => `${index + 1}. ${clause}`),
].join("\n\n");
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
