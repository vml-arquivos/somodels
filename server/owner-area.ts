// Área do anunciante: dados pessoais, biblioteca de mídia, pagamentos, contrato,
// atividade e visão geral. Tudo aqui é por conta (ownerId) e nunca público.
import { createHash, createHmac, randomUUID } from "node:crypto";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  auditLogs,
  ownerAccounts,
  ownerMedia,
  payments,
  plans,
  profileMedia,
  profiles,
  subscriptions,
  analyticsDaily,
} from "../drizzle/schema";
import {
  formatCpf,
  maskCpf,
  onlyDigits,
  ownerPersonalUpdateSchema,
} from "../shared/owner-account";
import { ENV } from "./_core/env";
import { decryptSecret, encryptSecret } from "./totp";
import {
  getAccountTermsStatus,
  getDb,
  getIdentityVerification,
  writeAuditLog,
} from "./db";

const cpfHash = (digits: string) =>
  createHmac("sha256", ENV.cookieSecret || "ero-models")
    .update(digits)
    .digest("hex");

// ---------------------------------------------------------------------------
// Dados pessoais
// ---------------------------------------------------------------------------

export async function getOwnerAccountRow(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db
    .select()
    .from(ownerAccounts)
    .where(eq(ownerAccounts.userId, userId))
    .limit(1);
  return row;
}

async function identityLocked(userId: number) {
  const identity = await getIdentityVerification(userId);
  return Boolean(
    identity?.status === "approved" &&
      !(identity.expiresAt && identity.expiresAt <= new Date())
  );
}

export async function getOwnerPersonal(userId: number) {
  const row = await getOwnerAccountRow(userId);
  const locked = await identityLocked(userId);
  if (!row) return { complete: false as const, locked, data: null };
  return {
    complete: true as const,
    locked,
    data: {
      fullName: row.fullName,
      cpfMasked: maskCpf(row.cpfLast2),
      birthDate: row.birthDate,
      phone: row.phone ?? "",
      zipCode: row.zipCode ?? "",
      city: row.city ?? "",
      state: row.state ?? "",
      completedAt: row.completedAt,
      updatedAt: row.updatedAt,
    },
  };
}

export async function hasOwnerPersonalData(userId: number) {
  return Boolean(await getOwnerAccountRow(userId));
}

export async function saveOwnerPersonal(userId: number, rawInput: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const current = await getOwnerAccountRow(userId);
  const locked = current ? await identityLocked(userId) : false;

  // Com a conta já cadastrada, o CPF pode ficar em branco para manter o atual.
  const parsed = ownerPersonalUpdateSchema.safeParse(rawInput);
  if (!parsed.success)
    throw new Error(parsed.error.issues[0]?.message || "Dados inválidos");
  const input = parsed.data;
  const digits = input.cpf.trim() ? onlyDigits(input.cpf) : null;
  if (!current && !digits) throw new Error("Informe o CPF");
  if (locked && current) {
    const changedName = input.fullName !== current.fullName;
    const changedBirth = input.birthDate !== current.birthDate;
    const changedCpf = digits ? cpfHash(digits) !== current.cpfHash : false;
    if (changedName || changedBirth || changedCpf)
      throw new Error(
        "Nome, CPF e nascimento não podem ser alterados depois da verificação de identidade. Fale com o suporte."
      );
  }

  let cpfFields: { cpfEnc: string; cpfHash: string; cpfLast2: string } | null =
    null;
  if (digits) {
    const hash = cpfHash(digits);
    const [duplicate] = await db
      .select({ userId: ownerAccounts.userId })
      .from(ownerAccounts)
      .where(eq(ownerAccounts.cpfHash, hash))
      .limit(1);
    if (duplicate && duplicate.userId !== userId)
      throw new Error("Este CPF já está cadastrado em outra conta");
    cpfFields = {
      cpfEnc: encryptSecret(digits, ENV.cookieSecret),
      cpfHash: hash,
      cpfLast2: digits.slice(-2),
    };
  }

  const common = {
    fullName: input.fullName,
    birthDate: input.birthDate,
    phone: input.phone || null,
    zipCode: input.zipCode || null,
    city: input.city || null,
    state: input.state || null,
  };
  if (current) {
    await db
      .update(ownerAccounts)
      .set({ ...common, ...(cpfFields ?? {}) })
      .where(eq(ownerAccounts.userId, userId));
  } else {
    if (!cpfFields) throw new Error("Informe o CPF");
    await db.insert(ownerAccounts).values({ userId, ...common, ...cpfFields });
  }
  await writeAuditLog({
    actorUserId: userId,
    action: current ? "owner.personal.updated" : "owner.personal.created",
    entityType: "user",
    entityId: userId,
    metadata: { cpfChanged: Boolean(cpfFields && current) },
  });
  return getOwnerPersonal(userId);
}

// Contrato: só o próprio anunciante vê o CPF completo.
export async function getOwnerContract(userId: number) {
  const row = await getOwnerAccountRow(userId);
  const terms = await getAccountTermsStatus(userId);
  let cpf: string | null = null;
  if (row) {
    try {
      cpf = formatCpf(decryptSecret(row.cpfEnc, ENV.cookieSecret));
    } catch {
      cpf = maskCpf(row.cpfLast2);
    }
  }
  return {
    holder: row
      ? {
          fullName: row.fullName,
          cpf,
          birthDate: row.birthDate,
          city: row.city,
          state: row.state,
        }
      : null,
    terms: {
      version: terms.version,
      current: terms.current,
      acceptedAt: terms.acceptedAt,
      text: terms.text,
      clauses: terms.clauses,
    },
  };
}

// ---------------------------------------------------------------------------
// Biblioteca de mídia
// ---------------------------------------------------------------------------

export const LIBRARY_LIMIT = 300;

export async function countLibraryItems(ownerId: number) {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db
    .select({ total: sql<number>`count(*)` })
    .from(ownerMedia)
    .where(and(eq(ownerMedia.ownerId, ownerId), isNull(ownerMedia.deletedAt)));
  return Number(row?.total ?? 0);
}

export async function createLibraryItem(input: {
  ownerId: number;
  kind: "photo" | "video";
  title?: string | null;
  storageKey: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  if (!input.storageKey.startsWith(`library/${input.ownerId}/`))
    throw new Error("Arquivo não pertence à biblioteca da conta");
  const storageHash = createHash("sha256")
    .update(input.storageKey)
    .digest("hex");
  const inserted = await db.insert(ownerMedia).values({
    ownerId: input.ownerId,
    kind: input.kind,
    title: input.title?.trim().slice(0, 160) || null,
    storageKey: input.storageKey,
    storageHash,
    url: input.url,
    mimeType: input.mimeType,
    sizeBytes: Math.max(0, Math.floor(input.sizeBytes)),
  });
  const id = Number(inserted[0].insertId);
  await writeAuditLog({
    actorUserId: input.ownerId,
    action: "library.added",
    entityType: "library",
    entityId: id,
    metadata: { kind: input.kind },
  });
  return id;
}

export async function listLibrary(ownerId: number) {
  const db = await getDb();
  if (!db) return [];
  const items = await db
    .select()
    .from(ownerMedia)
    .where(and(eq(ownerMedia.ownerId, ownerId), isNull(ownerMedia.deletedAt)))
    .orderBy(desc(ownerMedia.createdAt), desc(ownerMedia.id))
    .limit(LIBRARY_LIMIT);
  if (!items.length) return [];
  const keys = items.map(item => item.storageKey);
  const usage = await db
    .select({
      storageKey: profileMedia.storageKey,
      profileId: profileMedia.profileId,
      stageName: profiles.stageName,
    })
    .from(profileMedia)
    .innerJoin(profiles, eq(profiles.id, profileMedia.profileId))
    .where(
      and(
        inArray(profileMedia.storageKey, keys),
        eq(profiles.ownerId, ownerId),
        isNull(profiles.deletedAt)
      )
    );
  return items.map(item => ({
    id: item.id,
    kind: item.kind,
    title: item.title,
    mimeType: item.mimeType,
    sizeBytes: item.sizeBytes,
    createdAt: item.createdAt,
    usedIn: usage
      .filter(row => row.storageKey === item.storageKey)
      .map(row => ({ profileId: row.profileId, stageName: row.stageName })),
  }));
}

export async function getLibraryItem(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const [row] = await db
    .select()
    .from(ownerMedia)
    .where(
      and(
        eq(ownerMedia.id, id),
        eq(ownerMedia.ownerId, ownerId),
        isNull(ownerMedia.deletedAt)
      )
    )
    .limit(1);
  return row;
}

export async function renameLibraryItem(
  ownerId: number,
  id: number,
  title: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const item = await getLibraryItem(ownerId, id);
  if (!item) throw new Error("Arquivo não encontrado na biblioteca");
  await db
    .update(ownerMedia)
    .set({ title: title.trim().slice(0, 160) || null })
    .where(eq(ownerMedia.id, id));
  return { success: true as const };
}

// Tirar da biblioteca não remove o arquivo dos anúncios que já o usam.
export async function deleteLibraryItem(ownerId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const item = await getLibraryItem(ownerId, id);
  if (!item) throw new Error("Arquivo não encontrado na biblioteca");
  await db
    .update(ownerMedia)
    .set({ deletedAt: new Date() })
    .where(eq(ownerMedia.id, id));
  await writeAuditLog({
    actorUserId: ownerId,
    action: "library.removed",
    entityType: "library",
    entityId: id,
  });
  return { success: true as const };
}

export async function attachLibraryItems(
  ownerId: number,
  profileId: number,
  libraryIds: number[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const ids = Array.from(new Set(libraryIds)).slice(0, 50);
  if (!ids.length) throw new Error("Escolha pelo menos um arquivo");
  const [profile] = await db
    .select()
    .from(profiles)
    .where(
      and(
        eq(profiles.id, profileId),
        eq(profiles.ownerId, ownerId),
        isNull(profiles.deletedAt)
      )
    )
    .limit(1);
  if (!profile)
    throw new Error("Anúncio não pertence à conta ou foi arquivado");
  if (!profile.isActive) throw new Error("O anúncio está inativo");
  const terms = await getAccountTermsStatus(ownerId);
  if (!terms.current)
    throw new Error(
      "Aceite os termos da conta antes de usar arquivos no anúncio"
    );
  if (ENV.requireIdentityVerification) {
    const identity = await getIdentityVerification(ownerId);
    if (identity?.status !== "approved")
      throw new Error("Verificação de identidade obrigatória");
  }
  const items = await db
    .select()
    .from(ownerMedia)
    .where(
      and(
        inArray(ownerMedia.id, ids),
        eq(ownerMedia.ownerId, ownerId),
        isNull(ownerMedia.deletedAt)
      )
    );
  if (items.length !== ids.length)
    throw new Error("Algum arquivo não está mais na biblioteca");
  const existing = await db
    .select({ storageKey: profileMedia.storageKey })
    .from(profileMedia)
    .where(eq(profileMedia.profileId, profileId));
  const present = new Set(existing.map(row => row.storageKey));
  const toAdd = items.filter(item => !present.has(item.storageKey));
  if (!toAdd.length)
    return { added: 0, skipped: items.length, autoApproved: false };
  const autoApproved = ENV.autoPublishEnabled && ENV.ownerMediaAutoApprove;
  let sortOrder = existing.length;
  for (const item of toAdd) {
    await db.insert(profileMedia).values({
      profileId,
      kind: item.kind,
      title: item.title,
      storageKey: item.storageKey,
      storageHash: createHash("sha256")
        .update(`${item.storageKey}#${profileId}#${randomUUID()}`)
        .digest("hex"),
      url: item.url,
      mimeType: item.mimeType,
      isPremium: false,
      status: autoApproved ? "approved" : "pending",
      sortOrder: sortOrder++,
    });
  }
  if (profile.isPublished && !autoApproved) {
    await db
      .update(profiles)
      .set({
        isPublished: false,
        portfolioReviewed: false,
        rejectionReason: "Novo conteúdo aguardando moderação",
      })
      .where(eq(profiles.id, profileId));
  }
  await writeAuditLog({
    actorUserId: ownerId,
    action: "media.attached_from_library",
    entityType: "profile",
    entityId: profileId,
    metadata: { count: toAdd.length },
  });
  return {
    added: toAdd.length,
    skipped: items.length - toAdd.length,
    autoApproved,
  };
}

// ---------------------------------------------------------------------------
// Pagamentos e plano
// ---------------------------------------------------------------------------

export async function listOwnerPayments(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: payments.id,
      description: payments.description,
      amountCents: payments.amountCents,
      status: payments.status,
      method: payments.method,
      invoiceNumber: payments.invoiceNumber,
      dueAt: payments.dueAt,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
    })
    .from(payments)
    .where(eq(payments.userId, userId))
    .orderBy(desc(payments.createdAt), desc(payments.id))
    .limit(100);
}

export async function recordPayment(input: {
  userId: number;
  subscriptionId?: number | null;
  planId?: number | null;
  description: string;
  amountCents: number;
  status?: "pending" | "paid" | "failed" | "refunded" | "cancelled";
  method?: "pix" | "card" | "boleto" | "manual" | "courtesy";
  provider?: string | null;
  providerReference?: string | null;
  dueAt?: Date | null;
  paidAt?: Date | null;
  actorUserId?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const status = input.status ?? "pending";
  const inserted = await db.insert(payments).values({
    userId: input.userId,
    subscriptionId: input.subscriptionId ?? null,
    planId: input.planId ?? null,
    description: input.description.trim().slice(0, 200),
    amountCents: Math.max(0, Math.floor(input.amountCents)),
    status,
    method: input.method ?? "manual",
    provider: input.provider ?? null,
    providerReference: input.providerReference ?? null,
    dueAt: input.dueAt ?? null,
    paidAt: status === "paid" ? (input.paidAt ?? new Date()) : null,
  });
  const id = Number(inserted[0].insertId);
  const invoiceNumber = `EM-${new Date().getUTCFullYear()}-${String(id).padStart(6, "0")}`;
  await db.update(payments).set({ invoiceNumber }).where(eq(payments.id, id));
  await writeAuditLog({
    actorUserId: input.actorUserId ?? null,
    action: "payment.recorded",
    entityType: "payment",
    entityId: id,
    metadata: { userId: input.userId, status, amountCents: input.amountCents },
  });
  return { id, invoiceNumber };
}

export async function getOwnerPlanSummary(userId: number) {
  const db = await getDb();
  if (!db) return { current: null, history: [] as any[] };
  const rows = await db
    .select({
      id: subscriptions.id,
      planId: subscriptions.planId,
      planName: plans.name,
      priceCents: plans.priceCents,
      billingPeriod: plans.billingPeriod,
      benefits: plans.benefits,
      isFeatured: plans.isFeatured,
      status: subscriptions.status,
      currentPeriodEndsAt: subscriptions.currentPeriodEndsAt,
      createdAt: subscriptions.createdAt,
    })
    .from(subscriptions)
    .innerJoin(plans, eq(plans.id, subscriptions.planId))
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(20);
  const now = new Date();
  const current =
    rows.find(
      row =>
        row.status === "active" &&
        (!row.currentPeriodEndsAt || row.currentPeriodEndsAt > now)
    ) ?? null;
  const parseBenefits = (value: unknown) => {
    if (Array.isArray(value)) return value as string[];
    if (typeof value === "string") {
      try {
        const parsed = JSON.parse(value);
        return Array.isArray(parsed) ? (parsed as string[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  };
  return {
    current: current
      ? { ...current, benefits: parseBenefits(current.benefits) }
      : null,
    history: rows.map(row => ({
      id: row.id,
      planName: row.planName,
      status: row.status,
      currentPeriodEndsAt: row.currentPeriodEndsAt,
      createdAt: row.createdAt,
    })),
  };
}

// ---------------------------------------------------------------------------
// Atividade (histórico da conta)
// ---------------------------------------------------------------------------

const activityLabels: Record<string, string> = {
  "owner.personal.created": "Dados pessoais cadastrados",
  "owner.personal.updated": "Dados pessoais atualizados",
  "account.terms.accepted": "Termos da conta aceitos",
  "user.name_updated": "Nome da conta alterado",
  "profile.created": "Anúncio criado",
  "profile.updated": "Anúncio atualizado",
  "profile.submitted": "Anúncio enviado para análise",
  "profile.published_by_owner": "Anúncio publicado",
  "profile.unpublished": "Anúncio saiu do ar",
  "profile.archived": "Anúncio arquivado",
  "media.created": "Arquivo enviado para um anúncio",
  "media.attached_from_library": "Arquivos da biblioteca usados em um anúncio",
  "library.added": "Arquivo enviado para a biblioteca",
  "library.removed": "Arquivo removido da biblioteca",
  "payment.recorded": "Pagamento registrado",
  "auth.password_changed": "Senha alterada",
  "verification.document_uploaded": "Documento de verificação enviado",
  "verification.document_deleted": "Documento de verificação removido",
  "verification.submitted": "Documentos enviados para análise",
  "identity.approved": "Identidade aprovada",
  "identity.rejected": "Verificação de identidade recusada",
  "plan.custom_requested": "Pacote personalizado solicitado",
  "review.replied": "Resposta a uma avaliação publicada",
  "review.flagged": "Revisão de uma avaliação solicitada",
};

export async function listOwnerActivity(userId: number, limit = 60) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      createdAt: auditLogs.createdAt,
    })
    .from(auditLogs)
    .where(
      or(
        eq(auditLogs.actorUserId, userId),
        and(eq(auditLogs.entityType, "user"), eq(auditLogs.entityId, userId))
      )
    )
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(Math.min(Math.max(limit, 1), 200));
  return rows
    .filter(row => activityLabels[row.action])
    .map(row => ({
      id: row.id,
      label: activityLabels[row.action],
      entityType: row.entityType,
      entityId: row.entityId,
      createdAt: row.createdAt,
    }));
}

// ---------------------------------------------------------------------------
// Visão geral
// ---------------------------------------------------------------------------

function dateKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(date);
}

export async function getOwnerOverview(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const listings = await db
    .select()
    .from(profiles)
    .where(and(eq(profiles.ownerId, userId), isNull(profiles.deletedAt)))
    .orderBy(desc(profiles.updatedAt));
  const ids = listings.map(row => row.id);

  const mediaRows = ids.length
    ? await db
        .select({
          profileId: profileMedia.profileId,
          kind: profileMedia.kind,
          status: profileMedia.status,
          total: sql<number>`count(*)`,
        })
        .from(profileMedia)
        .where(inArray(profileMedia.profileId, ids))
        .groupBy(profileMedia.profileId, profileMedia.kind, profileMedia.status)
    : [];

  const span = 30;
  const since = dateKey(new Date(Date.now() - (span * 2 - 1) * 86400000));
  const statRows = ids.length
    ? await db
        .select({
          profileId: analyticsDaily.profileId,
          dateKey: analyticsDaily.dateKey,
          eventName: analyticsDaily.eventName,
          total: analyticsDaily.total,
        })
        .from(analyticsDaily)
        .where(
          and(
            inArray(analyticsDaily.profileId, ids),
            sql`${analyticsDaily.dateKey} >= ${since}`
          )
        )
    : [];
  const keys: string[] = [];
  for (let i = span * 2 - 1; i >= 0; i -= 1)
    keys.push(dateKey(new Date(Date.now() - i * 86400000)));
  const recent = new Set(keys.slice(span));
  const previous = new Set(keys.slice(0, span));
  const daily = new Map(
    keys.slice(span).map(key => [key, { date: key, views: 0, contacts: 0 }])
  );
  const totals = { views: 0, contacts: 0, prevViews: 0, prevContacts: 0 };
  const perListing = new Map<number, { views: number; contacts: number }>();
  for (const row of statRows) {
    const isView = row.eventName === "profile_view";
    const isContact = row.eventName === "contact_click";
    if (!isView && !isContact) continue;
    if (recent.has(row.dateKey)) {
      const day = daily.get(row.dateKey)!;
      if (isView) {
        day.views += row.total;
        totals.views += row.total;
      } else {
        day.contacts += row.total;
        totals.contacts += row.total;
      }
      const entry = perListing.get(row.profileId as number) ?? {
        views: 0,
        contacts: 0,
      };
      if (isView) entry.views += row.total;
      else entry.contacts += row.total;
      perListing.set(row.profileId as number, entry);
    } else if (previous.has(row.dateKey)) {
      if (isView) totals.prevViews += row.total;
      else totals.prevContacts += row.total;
    }
  }

  const photoCount = (profileId: number, onlyApproved = false) =>
    mediaRows
      .filter(
        row =>
          row.profileId === profileId &&
          row.kind === "photo" &&
          (!onlyApproved || row.status === "approved")
      )
      .reduce((sum, row) => sum + Number(row.total), 0);
  const videoCount = (profileId: number) =>
    mediaRows
      .filter(row => row.profileId === profileId && row.kind === "video")
      .reduce((sum, row) => sum + Number(row.total), 0);

  const [libraryTotal, personal, terms, identity, plan, lastPayment] =
    await Promise.all([
      countLibraryItems(userId),
      hasOwnerPersonalData(userId),
      getAccountTermsStatus(userId),
      getIdentityVerification(userId),
      getOwnerPlanSummary(userId),
      listOwnerPayments(userId).then(rows => rows[0] ?? null),
    ]);

  const published = listings.filter(row => row.isPublished).length;
  const summary = {
    total: listings.length,
    published,
    drafts: listings.filter(row => row.status === "draft").length,
    pending: listings.filter(row => row.status === "pending").length,
    suspended: listings.filter(row => row.status === "suspended").length,
  };
  const approvedPhotos = mediaRows
    .filter(row => row.kind === "photo" && row.status === "approved")
    .reduce((sum, row) => sum + Number(row.total), 0);
  const videos = mediaRows
    .filter(row => row.kind === "video")
    .reduce((sum, row) => sum + Number(row.total), 0);

  const steps = [
    {
      key: "personal",
      label: "Preencher seus dados pessoais",
      done: personal,
      href: "/titular/dados",
    },
    {
      key: "terms",
      label: "Aceitar os termos da conta",
      done: terms.current,
      href: "/titular/contrato",
    },
    {
      key: "library",
      label: "Enviar fotos para a biblioteca",
      done: libraryTotal > 0 || approvedPhotos > 0,
      href: "/titular/midia",
    },
    {
      key: "listing",
      label: "Criar seu primeiro anúncio",
      done: listings.length > 0,
      href: "/titular/anuncios?novo=1",
    },
    {
      key: "published",
      label: "Publicar o anúncio",
      done: published > 0,
      href: "/titular/anuncios",
    },
  ];

  return {
    listings: listings.map(row => ({
      id: row.id,
      slug: row.slug,
      stageName: row.stageName,
      city: row.city,
      region: row.region,
      status: row.status,
      isPublished: row.isPublished,
      isActive: row.isActive,
      isAvailableNow: row.isAvailableNow,
      rejectionReason: row.rejectionReason,
      avatarUrl: row.avatarUrl,
      photos: photoCount(row.id),
      approvedPhotos: photoCount(row.id, true),
      videos: videoCount(row.id),
      views: perListing.get(row.id)?.views ?? 0,
      contacts: perListing.get(row.id)?.contacts ?? 0,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt,
    })),
    summary,
    media: {
      library: libraryTotal,
      approvedPhotos,
      videos,
      pending: mediaRows
        .filter(row => row.status === "pending")
        .reduce((sum, row) => sum + Number(row.total), 0),
    },
    stats: { ...totals, daily: Array.from(daily.values()) },
    plan: plan.current,
    lastPayment,
    personal: { complete: personal },
    terms: { current: terms.current, acceptedAt: terms.acceptedAt },
    identityStatus: identity?.status ?? null,
    steps,
    paymentsEnabled: ENV.paymentsEnabled,
  };
}
