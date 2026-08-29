import "dotenv/config";
import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { ENV } from "../server/_core/env";
import { hashPassword } from "../server/auth-crypto";
import { profileMedia, profiles, users } from "../drizzle/schema";

const DEMO_PASSWORD_PLACEHOLDER = "seed-account-disabled";

const demoProfiles = [
  {
    index: 1,
    stageName: "Luna",
    city: "São Paulo",
    region: "SP",
    locationNote: "Região central — localização exata não publicada",
    categories: ["Companhia", "Jantar", "Conversas"],
    attributes: ["Elegante", "Culta", "Discreta"],
    preferences: ["Conversas", "Gastronomia", "Eventos"],
    languages: ["Português", "Inglês"],
    availabilityLabel: "Agenda sob consulta",
    isAvailableNow: false,
    description: "Perfil fictício para testar navegação, filtros e apresentação de mídia em ambiente de homologação.",
  },
  {
    index: 2,
    stageName: "Aurora",
    city: "Rio de Janeiro",
    region: "RJ",
    locationNote: "Zona sul — localização exata não publicada",
    categories: ["Companhia", "Praia", "Cultura"],
    attributes: ["Leve", "Comunicativa", "Sofisticada"],
    preferences: ["Arte", "Passeios", "Conversas"],
    languages: ["Português", "Espanhol"],
    availabilityLabel: "Disponível esta semana",
    isAvailableNow: false,
    description: "Demonstração de card rico com cidade, preferências e disponibilidade sem contato acionável.",
  },
  {
    index: 3,
    stageName: "Maya",
    city: "Belo Horizonte",
    region: "MG",
    locationNote: "Savassi — localização exata não publicada",
    categories: ["Companhia", "Jantar", "Viagens"],
    attributes: ["Carismática", "Atenciosa", "Autêntica"],
    preferences: ["Jantares", "Música", "Viagens"],
    languages: ["Português", "Inglês", "Espanhol"],
    availabilityLabel: "Agenda aberta",
    isAvailableNow: false,
    description: "Perfil fictício em destaque para validar a hierarquia editorial e o selo de curadoria.",
  },
  {
    index: 4,
    stageName: "Clara",
    city: "Brasília",
    region: "DF",
    locationNote: "Asa sul — localização exata não publicada",
    categories: ["Companhia", "Eventos", "Conversas"],
    attributes: ["Profissional", "Acolhedora", "Discreta"],
    preferences: ["Eventos", "Cafés", "Conversas"],
    languages: ["Português", "Inglês"],
    availabilityLabel: "Disponível em horários flexíveis",
    isAvailableNow: false,
    description: "Amostra de perfil editorial para testar o filtro de categoria e a página de cidade.",
  },
  {
    index: 5,
    stageName: "Isis",
    city: "Curitiba",
    region: "PR",
    locationNote: "Batel — localização exata não publicada",
    categories: ["Companhia", "Bem-estar", "Jantar"],
    attributes: ["Espontânea", "Elegante", "Bem-humorada"],
    preferences: ["Bem-estar", "Gastronomia", "Cinema"],
    languages: ["Português"],
    availabilityLabel: "Disponível agora no ambiente de teste",
    isAvailableNow: true,
    description: "Perfil fictício marcado como disponível agora para validar o filtro de disponibilidade.",
  },
  {
    index: 6,
    stageName: "Olívia",
    city: "Salvador",
    region: "BA",
    locationNote: "Rio Vermelho — localização exata não publicada",
    categories: ["Companhia", "Cultura", "Praia"],
    attributes: ["Solar", "Criativa", "Culta"],
    preferences: ["Música", "Arte", "Passeios"],
    languages: ["Português", "Inglês"],
    availabilityLabel: "Agenda sob consulta",
    isAvailableNow: false,
    description: "Perfil demonstrativo para validar diversidade de cidades e atributos na busca pública.",
  },
  {
    index: 7,
    stageName: "Valentina",
    city: "Recife",
    region: "PE",
    locationNote: "Boa Viagem — localização exata não publicada",
    categories: ["Companhia", "Viagens", "Jantar"],
    attributes: ["Receptiva", "Vibrante", "Discreta"],
    preferences: ["Viagens", "Gastronomia", "Conversas"],
    languages: ["Português", "Espanhol"],
    availabilityLabel: "Disponível esta semana",
    isAvailableNow: false,
    description: "Amostra fictícia com dados estruturados para testar a experiência de descoberta.",
  },
  {
    index: 8,
    stageName: "Helena",
    city: "São Paulo",
    region: "SP",
    locationNote: "Pinheiros — localização exata não publicada",
    categories: ["Companhia", "Arte", "Conversas"],
    attributes: ["Sofisticada", "Curiosa", "Tranquila"],
    preferences: ["Museus", "Livros", "Cafés"],
    languages: ["Português", "Inglês", "Francês"],
    availabilityLabel: "Agenda aberta",
    isAvailableNow: false,
    description: "Perfil fictício associado a São Paulo para testar relacionados por cidade.",
  },
  {
    index: 9,
    stageName: "Nina",
    city: "Rio de Janeiro",
    region: "RJ",
    locationNote: "Botafogo — localização exata não publicada",
    categories: ["Companhia", "Eventos", "Cultura"],
    attributes: ["Atenciosa", "Criativa", "Bem-humorada"],
    preferences: ["Eventos", "Cinema", "Música"],
    languages: ["Português", "Inglês"],
    availabilityLabel: "Disponível em horários flexíveis",
    isAvailableNow: false,
    description: "Demonstração de card e detalhe público com contatos desativados.",
  },
  {
    index: 10,
    stageName: "Estela",
    city: "Belo Horizonte",
    region: "MG",
    locationNote: "Lourdes — localização exata não publicada",
    categories: ["Companhia", "Gastronomia", "Jantar"],
    attributes: ["Elegante", "Comunicativa", "Acolhedora"],
    preferences: ["Jantares", "Cafés", "Conversas"],
    languages: ["Português", "Inglês"],
    availabilityLabel: "Agenda sob consulta",
    isAvailableNow: false,
    description: "Perfil fictício com mídia local para validar galeria e miniaturas.",
  },
  {
    index: 11,
    stageName: "Bianca",
    city: "Brasília",
    region: "DF",
    locationNote: "Lago sul — localização exata não publicada",
    categories: ["Companhia", "Viagens", "Eventos"],
    attributes: ["Discreta", "Autêntica", "Profissional"],
    preferences: ["Viagens", "Eventos", "Arte"],
    languages: ["Português", "Inglês", "Espanhol"],
    availabilityLabel: "Disponível esta semana",
    isAvailableNow: false,
    description: "Perfil demonstrativo final da vitrine pública em estado aprovado.",
  },
  {
    index: 12,
    stageName: "Rafaela",
    city: "São Paulo",
    region: "SP",
    locationNote: "Localização exata não publicada",
    categories: ["Companhia", "Cultura"],
    attributes: ["Fictícia", "Em preparação"],
    preferences: ["Conversas"],
    languages: ["Português"],
    availabilityLabel: "Rascunho de homologação",
    isAvailableNow: false,
    description: "Perfil fictício em rascunho para testar o fluxo do anunciante.",
  },
  {
    index: 13,
    stageName: "Beatriz",
    city: "Rio de Janeiro",
    region: "RJ",
    locationNote: "Localização exata não publicada",
    categories: ["Companhia", "Eventos"],
    attributes: ["Fictícia", "Em análise"],
    preferences: ["Eventos"],
    languages: ["Português", "Inglês"],
    availabilityLabel: "Aguardando moderação",
    isAvailableNow: false,
    description: "Perfil fictício pendente para testar a fila administrativa.",
  },
  {
    index: 14,
    stageName: "Manuela",
    city: "Belo Horizonte",
    region: "MG",
    locationNote: "Localização exata não publicada",
    categories: ["Companhia", "Jantar"],
    attributes: ["Fictícia", "Revisão solicitada"],
    preferences: ["Gastronomia"],
    languages: ["Português"],
    availabilityLabel: "Ajustes solicitados",
    isAvailableNow: false,
    description: "Perfil fictício rejeitado para testar a exibição de motivo e reenvio.",
  },
  {
    index: 15,
    stageName: "Cecília",
    city: "Curitiba",
    region: "PR",
    locationNote: "Localização exata não publicada",
    categories: ["Companhia", "Conversas"],
    attributes: ["Fictícia", "Pausada"],
    preferences: ["Conversas"],
    languages: ["Português"],
    availabilityLabel: "Perfil pausado para teste",
    isAvailableNow: false,
    description: "Perfil fictício suspenso para testar controles administrativos.",
  },
] as const;

const stateFor = (index: number) => {
  if (index <= 11) return { status: "approved" as const, isPublished: true, rejectionReason: null };
  if (index === 12) return { status: "draft" as const, isPublished: false, rejectionReason: null };
  if (index === 13) return { status: "pending" as const, isPublished: false, rejectionReason: null };
  if (index === 14) return { status: "rejected" as const, isPublished: false, rejectionReason: "Amostra de homologação: revise a descrição antes de reenviar." };
  return { status: "suspended" as const, isPublished: false, rejectionReason: null };
};

async function upsertUser(db: any, item: (typeof demoProfiles)[number]) {
  const openId = `demo-owner-${String(item.index).padStart(2, "0")}`;
  const email = `${openId}@demo.somodels.local`;
  const existing = await db.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1);
  const values = {
    openId,
    name: `Conta demonstrativa ${item.stageName}`,
    email,
    loginMethod: "demo-seed",
    passwordHash: await hashPassword(DEMO_PASSWORD_PLACEHOLDER),
    mustChangePassword: false,
    role: "user" as const,
    accountStatus: "active" as const,
  };
  if (existing[0]) {
    await db.update(users).set(values).where(eq(users.id, existing[0].id));
    return existing[0].id;
  }
  const inserted = await db.insert(users).values(values);
  return Number(inserted[0].insertId);
}

async function upsertProfile(db: any, ownerId: number, item: (typeof demoProfiles)[number]) {
  const slug = `demo-${String(item.index).padStart(2, "0")}-${item.stageName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-")}`;
  const state = stateFor(item.index);
  const values = {
    ownerId,
    slug,
    stageName: item.stageName,
    age: 25 + (item.index % 8),
    description: item.description,
    city: item.city,
    region: item.region,
    locationNote: item.locationNote,
    categories: JSON.stringify(item.categories),
    attributes: JSON.stringify(item.attributes),
    contactOptions: JSON.stringify(["contato demonstrativo desativado"]),
    preferences: JSON.stringify(item.preferences),
    languages: JSON.stringify(item.languages),
    availabilityLabel: item.availabilityLabel,
    isAvailableNow: item.isAvailableNow,
    phone: null,
    whatsapp: null,
    telegram: null,
    avatarUrl: `/demo/demo-${String(item.index).padStart(2, "0")}.jpg`,
    status: state.status,
    isFeatured: item.index === 3 && state.isPublished,
    isPublished: state.isPublished,
    isTest: true,
    isDemo: true,
    rejectionReason: state.rejectionReason,
  };
  const existing = await db.select({ id: profiles.id }).from(profiles).where(eq(profiles.slug, slug)).limit(1);
  if (existing[0]) {
    await db.update(profiles).set(values).where(eq(profiles.id, existing[0].id));
    return { id: existing[0].id, slug, state };
  }
  const inserted = await db.insert(profiles).values(values);
  return { id: Number(inserted[0].insertId), slug, state };
}

async function upsertMedia(db: any, profileId: number, item: (typeof demoProfiles)[number]) {
  const index = String(item.index).padStart(2, "0");
  const url = `/demo/demo-${index}.jpg`;
  const storageKey = `demo/profile-${index}/photo-01.jpg`;
  const storageHash = createHash("sha256").update(storageKey).digest("hex");
  const profileState = stateFor(item.index);
  const mediaStatus = profileState.status === "approved" ? "approved" : profileState.status === "rejected" ? "rejected" : profileState.status === "suspended" ? "private" : "pending";
  const values = {
    profileId,
    kind: "photo" as const,
    title: `Imagem demonstrativa ${index}`,
    description: "Imagem gerada para homologação; não representa uma pessoa real.",
    storageKey,
    storageHash,
    url,
    mimeType: "image/jpeg",
    isPremium: false,
    status: mediaStatus as "pending" | "approved" | "rejected" | "private",
    sortOrder: 0,
  };
  const existing = await db.select({ id: profileMedia.id }).from(profileMedia).where(eq(profileMedia.storageHash, storageHash)).limit(1);
  if (existing[0]) {
    await db.update(profileMedia).set(values).where(eq(profileMedia.id, existing[0].id));
    return existing[0].id;
  }
  const inserted = await db.insert(profileMedia).values(values);
  return Number(inserted[0].insertId);
}

async function main() {
  if (!ENV.allowDemoSeed || !ENV.allowFakeData || !ENV.testMode) {
    throw new Error("Seed bloqueado: requer APP_MODE=test, ALLOW_FAKE_DATA=true e ALLOW_DEMO_SEED=true.");
  }
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const results: Array<{ slug: string; ownerId: number; profileId: number; status: string; mediaId: number }> = [];
  for (const item of demoProfiles) {
    const ownerId = await upsertUser(db, item);
    const profile = await upsertProfile(db, ownerId, item);
    const mediaId = await upsertMedia(db, profile.id, item);
    results.push({ slug: profile.slug, ownerId, profileId: profile.id, status: profile.state.status, mediaId });
  }

  const counts = results.reduce<Record<string, number>>((acc, item) => {
    acc[item.status] = (acc[item.status] ?? 0) + 1;
    return acc;
  }, {});
  console.log(JSON.stringify({ seeded: results.length, counts, profileIds: results.map(item => item.profileId) }, null, 2));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
