// Ajustes de SEO feitos pelo painel. Só páginas públicas fixas podem ser
// alteradas; rotas privadas (/admin, /titular, /login...) ficam sempre fora.

export const seoEditablePages = [
  { path: "/", label: "Página inicial" },
  { path: "/planos", label: "Pacotes para anunciantes" },
  { path: "/como-anunciar", label: "Como anunciar" },
  { path: "/calculadora-de-ganhos", label: "Calculadora de ganhos" },
  { path: "/ajuda", label: "Ajuda" },
  { path: "/contato", label: "Contato" },
  { path: "/termos", label: "Termos" },
  { path: "/privacidade", label: "Privacidade" },
  { path: "/seguranca", label: "Segurança" },
  { path: "/denuncia", label: "Denúncias" },
] as const;

export const seoLimits = {
  title: 70,
  description: 170,
  suffix: 40,
  image: 300,
} as const;

export type SeoPageOverride = {
  title?: string;
  description?: string;
  noindex?: boolean;
};

export type SeoOverrides = {
  /** Imagem de compartilhamento da página inicial (caminho ou https). */
  image: string;
  pages: Record<string, SeoPageOverride>;
};

export const emptySeoOverrides: SeoOverrides = { image: "", pages: {} };

const clean = (value: unknown, max: number) =>
  typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
    : "";

const isEditablePath = (path: string) =>
  seoEditablePages.some(page => page.path === path);

export function isSafeSeoImage(value: string) {
  if (!value) return true;
  if (/^\/(?!\/)[\w./%-]+$/.test(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

export function normalizeSeoOverrides(input: unknown): SeoOverrides {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, any>;
  const image = clean(raw.image, seoLimits.image);
  const pages: Record<string, SeoPageOverride> = {};
  const source = raw.pages && typeof raw.pages === "object" ? raw.pages : {};
  for (const [path, value] of Object.entries(source as Record<string, any>)) {
    if (!isEditablePath(path) || !value || typeof value !== "object") continue;
    const title = clean(value.title, seoLimits.title);
    const description = clean(value.description, seoLimits.description);
    const noindex = value.noindex === true;
    if (!title && !description && !noindex) continue;
    pages[path] = {
      ...(title ? { title } : {}),
      ...(description ? { description } : {}),
      ...(noindex ? { noindex: true } : {}),
    };
  }
  return { image: isSafeSeoImage(image) ? image : "", pages };
}

/** Avisos simples de qualidade para ajudar quem edita. */
export function seoTips(title: string, description: string) {
  const tips: string[] = [];
  if (title && title.length < 25) tips.push("Título curto: use de 30 a 65 caracteres.");
  if (title.length > 65) tips.push("Título longo: o Google pode cortar depois de 65 caracteres.");
  if (description && description.length < 70)
    tips.push("Descrição curta: use de 100 a 160 caracteres.");
  if (description.length > 160)
    tips.push("Descrição longa: pode ser cortada depois de 160 caracteres.");
  return tips;
}
