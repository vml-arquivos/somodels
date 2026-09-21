export type DemoProfile = {
  slug: string;
  stageName: string;
  city: string;
  region: string;
  categories: readonly string[];
  attributes: readonly string[];
  languages: readonly string[];
  availabilityLabel: string;
  avatarUrl: string;
  description: string;
};

/**
 * Static preview data only. These records are intentionally not persisted,
 * published as real profiles, or included in the sitemap.
 */
export const demoProfiles = [
  {
    slug: "demo-01-luna",
    stageName: "Luna",
    city: "São Paulo",
    region: "SP",
    categories: ["Modelo", "Criador de conteúdo"],
    attributes: ["Moda editorial", "Campanhas", "Lifestyle"],
    languages: ["Português", "Inglês"],
    availabilityLabel: "Agenda demonstrativa",
    avatarUrl: "/demo/demo-01.jpg",
    description:
      "Perfil demonstrativo para apresentar uma presença editorial, referências de moda e organização de portfólio.",
  },
  {
    slug: "demo-02-aurora",
    stageName: "Aurora",
    city: "Rio de Janeiro",
    region: "RJ",
    categories: ["Modelo", "Apresentador"],
    attributes: ["Audiovisual", "Eventos", "Lifestyle"],
    languages: ["Português", "Espanhol"],
    availabilityLabel: "Agenda demonstrativa",
    avatarUrl: "/demo/demo-02.jpg",
    description:
      "Perfil demonstrativo para explorar uma apresentação versátil em campanhas, eventos e projetos audiovisuais.",
  },
  {
    slug: "demo-03-maya",
    stageName: "Maya",
    city: "Belo Horizonte",
    region: "MG",
    categories: ["Modelo", "Ator"],
    attributes: ["Editorial", "Audiovisual", "Beleza"],
    languages: ["Português", "Inglês", "Espanhol"],
    availabilityLabel: "Agenda demonstrativa",
    avatarUrl: "/demo/demo-03.jpg",
    description:
      "Perfil demonstrativo em destaque para validar a hierarquia editorial e a apresentação de especialidades.",
  },
  {
    slug: "demo-04-clara",
    stageName: "Clara",
    city: "Brasília",
    region: "DF",
    categories: ["Modelo", "Apresentador"],
    attributes: ["Institucional", "Eventos", "Moda"],
    languages: ["Português", "Inglês"],
    availabilityLabel: "Agenda demonstrativa",
    avatarUrl: "/demo/demo-04.jpg",
    description:
      "Amostra fictícia de perfil profissional para testar filtros de cidade, categoria e apresentação pública.",
  },
  {
    slug: "demo-05-isis",
    stageName: "Isis",
    city: "Curitiba",
    region: "PR",
    categories: ["Modelo", "Criador de conteúdo"],
    attributes: ["Beleza", "Lifestyle", "Fotografia"],
    languages: ["Português"],
    availabilityLabel: "Agenda demonstrativa",
    avatarUrl: "/demo/demo-05.jpg",
    description:
      "Perfil demonstrativo para validar cards com atributos, idiomas e uma apresentação visual objetiva.",
  },
  {
    slug: "demo-06-olivia",
    stageName: "Olívia",
    city: "Salvador",
    region: "BA",
    categories: ["Modelo", "Artista"],
    attributes: ["Moda", "Cultura", "Campanhas"],
    languages: ["Português", "Inglês"],
    availabilityLabel: "Agenda demonstrativa",
    avatarUrl: "/demo/demo-06.jpg",
    description:
      "Perfil fictício para demonstrar diversidade regional e descoberta de portfólios por cidade.",
  },
] as const satisfies readonly DemoProfile[];

export function getDemoProfileBySlug(slug: string) {
  return demoProfiles.find(profile => profile.slug === slug) ?? null;
}
