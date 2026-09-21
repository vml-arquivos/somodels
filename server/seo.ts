import { ENV } from "./_core/env";
import { readSiteSettings } from "./site-config";
import { getPublicProfile } from "./db";
import { isPublicIndexingEnabled } from "./public-indexing";
import { getDemoProfileBySlug } from "../shared/demo-profiles";

export type ServerSeo = {
  title: string;
  description: string;
  canonical: string;
  noindex: boolean;
  image?: string;
  jsonLd?: Record<string, unknown>;
};

const defaultOrigin = "https://eromodels.com.br";
const privatePrefixes = [
  "/login",
  "/redefinir-senha",
  "/alterar-senha",
  "/cadastro",
  "/cadastro-teste",
  "/titular",
  "/admin",
  "/admin/portfolio/novo",
  "/404",
  "/api/",
  "/manus-storage/",
];

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character] ?? character);
}

function decodeSegment(value: string, max: number) {
  try {
    return decodeURIComponent(value).trim().slice(0, max);
  } catch {
    return value.trim().slice(0, max);
  }
}

function canonicalUrl(pathname: string) {
  const origin = ENV.canonicalOrigin || defaultOrigin;
  return new URL(pathname || "/", `${origin}/`).toString();
}

function staticSeo(pathname: string) {
  if (pathname === "/") {
    return {
      title: `${ENV.siteName} — Encontre talentos e apresente seu trabalho`,
      description: "Uma vitrine de portfólios profissionais para modelos e criadores, organizada por cidade e especialidade, com publicação revisada e respeito à privacidade.",
      image: "/images/hero/ero-models-hero.png",
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: ENV.siteName,
        url: canonicalUrl("/"),
        inLanguage: "pt-BR",
      },
    };
  }
  const pages: Record<string, { title: string; description: string }> = {
    "/login": {
      title: `Entrar — ${ENV.siteName}`,
      description: "Acesso privado à conta da plataforma.",
    },
    "/redefinir-senha": {
      title: `Redefinir senha — ${ENV.siteName}`,
      description: "Área privada de redefinição de senha.",
    },
    "/alterar-senha": {
      title: `Alterar senha — ${ENV.siteName}`,
      description: "Área privada de alteração de senha.",
    },
    "/cadastro-teste": {
      title: `Cadastro de homologação — ${ENV.siteName}`,
      description: "Cadastro privado de ambiente de testes.",
    },
    "/cadastro": {
      title: `Criar conta de titular — ${ENV.siteName}`,
      description: "Crie sua conta para preparar um portfólio profissional.",
    },
    "/titular": {
      title: `Meu portfólio — ${ENV.siteName}`,
      description: "Área privada do titular do portfólio.",
    },
    "/admin": {
      title: `Administração — ${ENV.siteName}`,
      description: "Área privada de administração da plataforma.",
    },
    "/admin/portfolio/novo": {
      title: `Novo portfólio administrativo — ${ENV.siteName}`,
      description: "Área privada para preparar um portfólio para um titular.",
    },
    "/404": {
      title: `Página não encontrada — ${ENV.siteName}`,
      description: "A rota solicitada não existe.",
    },
    "/termos": {
      title: `Termos da plataforma — ${ENV.siteName}`,
      description: "Regras de uso, publicação e moderação da plataforma.",
    },
    "/privacidade": {
      title: `Privacidade — ${ENV.siteName}`,
      description: "Como a plataforma minimiza, protege e utiliza dados.",
    },
    "/seguranca": {
      title: `Segurança e confiança — ${ENV.siteName}`,
      description: "Orientações de segurança, consentimento e contato responsável.",
    },
    "/denuncia": {
      title: `Denúncias e remoção — ${ENV.siteName}`,
      description: "Como denunciar perfil, mídia ou comportamento irregular.",
    },
    "/ajuda": {
      title: `Ajuda — ${ENV.siteName}`,
      description: "Orientações para titulares, visitantes e publicação.",
    },
    "/contato": {
      title: `Contato — ${ENV.siteName}`,
      description: "Orientações para contato com a plataforma.",
    },
  };
  return pages[pathname];
}

export async function getServerSeo(pathname: string): Promise<ServerSeo> {
  const cleanPath = pathname.split("?")[0] || "/";
  const canonical = canonicalUrl(cleanPath);
  const hasQuery = pathname.includes("?");
  const privateRoute = privatePrefixes.some(prefix => cleanPath === prefix || cleanPath.startsWith(prefix));
  const base = staticSeo(cleanPath);

  let showGallery = false;
  try {
    showGallery = (await readSiteSettings()).showGallery;
  } catch {
    showGallery = false;
  }
  const indexable = isPublicIndexingEnabled({
    robotsNoIndex: ENV.robotsNoIndex,
    publicAccessEnabled: ENV.publicAccessEnabled,
    publicLaunchEnabled: ENV.publicLaunchEnabled,
    requireAgeVerification: ENV.requireAgeVerification,
    showGallery,
  });

  if (base) {
    return {
      ...base,
      canonical,
      noindex: privateRoute || hasQuery || !indexable,
    };
  }

  if (cleanPath.startsWith("/cidade/")) {
    const city = decodeSegment(cleanPath.slice("/cidade/".length), 120);
    return {
      title: `Portfólios profissionais em ${city} — ${ENV.siteName}`,
      description: `Descubra portfólios profissionais de modelos e criadores em ${city}.`,
      canonical,
      noindex: !city || hasQuery || !indexable,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `Portfólios em ${city}`,
        url: canonical,
      },
    };
  }

  if (cleanPath.startsWith("/categoria/")) {
    const category = decodeSegment(cleanPath.slice("/categoria/".length), 60);
    return {
      title: `Portfólios de ${category} — ${ENV.siteName}`,
      description: `Explore portfólios profissionais na categoria ${category}.`,
      canonical,
      noindex: !category || hasQuery || !indexable,
      jsonLd: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: `Portfólios de ${category}`,
        url: canonical,
      },
    };
  }

  if (cleanPath.startsWith("/demo/perfil/")) {
    const slug = decodeSegment(cleanPath.slice("/demo/perfil/".length), 160);
    const demo = getDemoProfileBySlug(slug);
    return {
      title: demo
        ? `${demo.stageName} — Prévia demonstrativa | ${ENV.siteName}`
        : `Prévia demonstrativa indisponível — ${ENV.siteName}`,
      description: demo
        ? `${demo.description} Perfil fictício, sem contato real e fora da publicação oficial.`
        : "Esta prévia demonstrativa não está disponível.",
      canonical,
      noindex: true,
      image: demo?.avatarUrl,
    };
  }

  if (cleanPath.startsWith("/perfil/")) {
    const slug = decodeSegment(cleanPath.slice("/perfil/".length), 160);
    if (indexable && slug) {
      try {
        const profile = await getPublicProfile(slug, true);
        if (profile) {
          return {
            title: `${profile.profile.stageName} — ${ENV.siteName}`,
            description: profile.profile.description || "Portfólio profissional",
            canonical,
            noindex: hasQuery,
            image: profile.profile.avatarUrl || undefined,
            jsonLd: {
              "@context": "https://schema.org",
              "@type": "ProfilePage",
              name: profile.profile.stageName,
              url: canonical,
              dateModified: new Date(profile.profile.updatedAt).toISOString(),
            },
          };
        }
      } catch {
        // An unavailable profile must remain noindex rather than leaking fallback data.
      }
    }
    return {
      title: `Portfólio — ${ENV.siteName}`,
      description: "Portfólio profissional indisponível ou em revisão.",
      canonical,
      noindex: true,
    };
  }

  return {
    title: ENV.siteName,
    description: "Página não encontrada.",
    canonical,
    noindex: true,
  };
}

export function renderSeoHead(seo: ServerSeo) {
  const tags = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta name="description" content="${escapeHtml(seo.description)}" />`,
    `<meta name="robots" content="${seo.noindex ? "noindex, nofollow" : "index, follow"}" />`,
    `<link rel="canonical" href="${escapeHtml(seo.canonical)}" />`,
    `<meta property="og:title" content="${escapeHtml(seo.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(seo.description)}" />`,
    `<meta property="og:site_name" content="Ero Models" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:url" content="${escapeHtml(seo.canonical)}" />`,
    `<meta name="twitter:card" content="${seo.image ? "summary_large_image" : "summary"}" />`,
    `<meta name="twitter:title" content="${escapeHtml(seo.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(seo.description)}" />`,
  ];
  if (seo.image) {
    const image = new URL(seo.image, seo.canonical).toString();
    tags.push(`<meta property="og:image" content="${escapeHtml(image)}" />`);
    tags.push(`<meta name="twitter:image" content="${escapeHtml(image)}" />`);
  }
  if (seo.jsonLd) {
    const serialized = JSON.stringify(seo.jsonLd).replace(/</g, "\\u003c");
    tags.push(`<script type="application/ld+json">${serialized}</script>`);
  }
  return tags.join("\n    ");
}
