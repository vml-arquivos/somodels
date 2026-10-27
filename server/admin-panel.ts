// Consultas do painel administrativo novo: visão geral, CRM dos anunciantes,
// pagamentos, relatórios e busca. Só leitura e anotações; nada aqui publica,
// aprova ou apaga anúncios (isso continua nos fluxos já existentes).
import { and, desc, eq, sql } from "drizzle-orm";
import {
  crmNotes,
  crmProfiles,
  payments,
  users,
} from "../drizzle/schema";
import {
  type CrmStage,
  crmStageLabels,
  crmStages,
  isCrmNoteKind,
  isCrmStage,
  listDays,
  monthlyEquivalentCents,
  normalizeTags,
  paymentBucket,
  parseTags,
  resolveRange,
  toCsv,
} from "../shared/admin-crm";
import { formatCpf, maskCpf } from "../shared/owner-account";
import { ENV } from "./_core/env";
import { decryptSecret } from "./totp";
import { getAccountTermsStatus, getDb, writeAuditLog } from "./db";
import { getOwnerAccountRow, listOwnerActivity } from "./owner-area";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function database(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  return db;
}

async function rows<T = Record<string, any>>(db: Db, query: any): Promise<T[]> {
  const result = (await db.execute(query)) as any;
  return (result?.[0] ?? []) as T[];
}

const num = (value: unknown) => Number(value ?? 0) || 0;

// ---------------------------------------------------------------------------
// Anunciantes (CRM)
// ---------------------------------------------------------------------------

function advertiserSql(now: Date) {
  return sql`
    SELECT t.*, COALESCE(t.crmStage, CASE
        WHEN t.overdue > 0 OR t.suspended > 0 THEN 'atencao'
        WHEN t.published > 0 OR t.planName IS NOT NULL THEN 'ativo'
        WHEN t.listings > 0 THEN 'negociacao'
        ELSE 'novo' END) AS stage
    FROM (
      SELECT u.id AS id, u.name AS name, u.email AS email,
        u.accountStatus AS accountStatus, u.createdAt AS createdAt,
        u.lastSignedIn AS lastSignedIn, u.emailVerifiedAt AS emailVerifiedAt,
        oa.fullName AS fullName, oa.cpfLast2 AS cpfLast2, oa.birthDate AS birthDate,
        oa.phone AS phone, oa.city AS personalCity, oa.state AS personalState,
        (oa.id IS NOT NULL) AS hasPersonal,
        (SELECT COUNT(*) FROM profiles p WHERE p.ownerId = u.id AND p.deletedAt IS NULL) AS listings,
        (SELECT COUNT(*) FROM profiles p WHERE p.ownerId = u.id AND p.deletedAt IS NULL AND p.isActive = 1 AND p.isPublished = 1 AND p.portfolioReviewed = 1 AND p.status = 'approved') AS published,
        (SELECT COUNT(*) FROM profiles p WHERE p.ownerId = u.id AND p.deletedAt IS NULL AND p.status = 'suspended') AS suspended,
        (SELECT MIN(p.createdAt) FROM profiles p WHERE p.ownerId = u.id AND p.deletedAt IS NULL) AS firstListingAt,
        (SELECT COUNT(*) FROM profile_media m INNER JOIN profiles p ON p.id = m.profileId WHERE p.ownerId = u.id AND p.deletedAt IS NULL) AS mediaCount,
        (SELECT COUNT(*) FROM owner_media om WHERE om.ownerId = u.id AND om.deletedAt IS NULL) AS libraryCount,
        (SELECT iv.status FROM identity_verifications iv WHERE iv.userId = u.id ORDER BY iv.id DESC LIMIT 1) AS identityStatus,
        (SELECT iv.expiresAt FROM identity_verifications iv WHERE iv.userId = u.id ORDER BY iv.id DESC LIMIT 1) AS identityExpiresAt,
        (SELECT pl.name FROM subscriptions s INNER JOIN plans pl ON pl.id = s.planId WHERE s.userId = u.id AND s.status = 'active' AND (s.currentPeriodEndsAt IS NULL OR s.currentPeriodEndsAt > ${now}) ORDER BY s.currentPeriodEndsAt DESC LIMIT 1) AS planName,
        (SELECT s.currentPeriodEndsAt FROM subscriptions s WHERE s.userId = u.id AND s.status = 'active' AND (s.currentPeriodEndsAt IS NULL OR s.currentPeriodEndsAt > ${now}) ORDER BY s.currentPeriodEndsAt DESC LIMIT 1) AS planEndsAt,
        (SELECT COUNT(*) FROM payments pay WHERE pay.userId = u.id AND pay.status = 'pending' AND pay.dueAt IS NOT NULL AND pay.dueAt < ${now}) AS overdue,
        (SELECT COUNT(*) FROM payments pay WHERE pay.userId = u.id AND pay.status = 'pending') AS pendingPayments,
        (SELECT COALESCE(SUM(pay.amountCents), 0) FROM payments pay WHERE pay.userId = u.id AND pay.status = 'paid') AS paidTotal,
        c.stage AS crmStage, c.tags AS tags, c.nextFollowUpAt AS nextFollowUpAt
      FROM users u
      LEFT JOIN owner_accounts oa ON oa.userId = u.id
      LEFT JOIN crm_profiles c ON c.userId = u.id
      WHERE u.role = 'user' AND u.openId NOT LIKE 'deleted:%'
        AND (oa.id IS NOT NULL OR c.id IS NOT NULL
          OR EXISTS (SELECT 1 FROM profiles p WHERE p.ownerId = u.id AND p.deletedAt IS NULL)
          OR EXISTS (SELECT 1 FROM subscriptions s WHERE s.userId = u.id)
          OR EXISTS (SELECT 1 FROM identity_verifications iv WHERE iv.userId = u.id))
    ) t`;
}

export type AdvertiserFilters = {
  search?: string;
  stage?: string;
  plan?: "all" | "with" | "without";
  payment?: "all" | "overdue" | "pending" | "paid" | "none";
  personal?: "all" | "complete" | "missing";
  identity?: "all" | "none" | "pending" | "approved" | "rejected";
  listings?: "all" | "none" | "published" | "unpublished";
  followUp?: "all" | "due";
  status?: "all" | "active" | "suspended";
  sort?: "recent" | "name" | "listings" | "login" | "paid";
  page?: number;
  pageSize?: number;
};

function advertiserWhere(filters: AdvertiserFilters, now: Date) {
  const conditions: any[] = [sql`1 = 1`];
  const search = filters.search?.trim();
  if (search) {
    const like = `%${search.replace(/[%_\\]/g, m => `\\${m}`)}%`;
    const asId = /^#?\d+$/.test(search) ? Number(search.replace("#", "")) : -1;
    conditions.push(
      sql`(x.name LIKE ${like} OR x.email LIKE ${like} OR x.fullName LIKE ${like} OR x.id = ${asId})`
    );
  }
  if (filters.stage && isCrmStage(filters.stage))
    conditions.push(sql`x.stage = ${filters.stage}`);
  if (filters.plan === "with") conditions.push(sql`x.planName IS NOT NULL`);
  if (filters.plan === "without") conditions.push(sql`x.planName IS NULL`);
  if (filters.payment === "overdue") conditions.push(sql`x.overdue > 0`);
  if (filters.payment === "pending") conditions.push(sql`x.pendingPayments > 0`);
  if (filters.payment === "paid")
    conditions.push(sql`x.paidTotal > 0 AND x.pendingPayments = 0`);
  if (filters.payment === "none")
    conditions.push(sql`x.paidTotal = 0 AND x.pendingPayments = 0`);
  if (filters.personal === "complete") conditions.push(sql`x.hasPersonal = 1`);
  if (filters.personal === "missing") conditions.push(sql`x.hasPersonal = 0`);
  if (filters.identity === "none") conditions.push(sql`x.identityStatus IS NULL`);
  if (
    filters.identity === "pending" ||
    filters.identity === "approved" ||
    filters.identity === "rejected"
  )
    conditions.push(sql`x.identityStatus = ${filters.identity}`);
  if (filters.listings === "none") conditions.push(sql`x.listings = 0`);
  if (filters.listings === "published") conditions.push(sql`x.published > 0`);
  if (filters.listings === "unpublished")
    conditions.push(sql`x.listings > 0 AND x.published = 0`);
  if (filters.followUp === "due")
    conditions.push(sql`x.nextFollowUpAt IS NOT NULL AND x.nextFollowUpAt <= ${now}`);
  if (filters.status === "active" || filters.status === "suspended")
    conditions.push(sql`x.accountStatus = ${filters.status}`);
  return sql.join(conditions, sql` AND `);
}

const advertiserOrder = {
  recent: sql`x.createdAt DESC, x.id DESC`,
  name: sql`x.name ASC, x.id ASC`,
  listings: sql`x.listings DESC, x.id DESC`,
  login: sql`x.lastSignedIn DESC, x.id DESC`,
  paid: sql`x.paidTotal DESC, x.id DESC`,
} as const;

function mapAdvertiser(row: Record<string, any>, canSeeFinance: boolean) {
  const expired =
    row.identityStatus === "approved" &&
    row.identityExpiresAt &&
    new Date(row.identityExpiresAt).getTime() <= Date.now();
  return {
    id: num(row.id),
    name: (row.name as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    fullName: (row.fullName as string | null) ?? null,
    accountStatus: row.accountStatus as "active" | "suspended",
    createdAt: row.createdAt as Date,
    lastSignedIn: row.lastSignedIn as Date | null,
    hasPersonal: num(row.hasPersonal) === 1,
    cpfMasked: row.cpfLast2 ? maskCpf(String(row.cpfLast2)) : null,
    birthDate: (row.birthDate as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    city: (row.personalCity as string | null) ?? null,
    state: (row.personalState as string | null) ?? null,
    listings: num(row.listings),
    published: num(row.published),
    suspendedListings: num(row.suspended),
    firstListingAt: (row.firstListingAt as Date | null) ?? null,
    mediaCount: num(row.mediaCount),
    libraryCount: num(row.libraryCount),
    identityStatus: expired ? "expired" : ((row.identityStatus as string | null) ?? null),
    planName: canSeeFinance ? ((row.planName as string | null) ?? null) : null,
    planEndsAt: canSeeFinance ? ((row.planEndsAt as Date | null) ?? null) : null,
    overdue: canSeeFinance ? num(row.overdue) : 0,
    pendingPayments: canSeeFinance ? num(row.pendingPayments) : 0,
    paidTotalCents: canSeeFinance ? num(row.paidTotal) : 0,
    stage: (isCrmStage(row.stage) ? row.stage : "novo") as CrmStage,
    stageIsManual: Boolean(row.crmStage),
    tags: parseTags(row.tags as string | null),
    nextFollowUpAt: (row.nextFollowUpAt as Date | null) ?? null,
  };
}

export async function listAdvertisers(
  filters: AdvertiserFilters,
  options: { canSeeFinance: boolean }
) {
  const db = await database();
  const now = new Date();
  const pageSize = Math.min(Math.max(filters.pageSize ?? 20, 5), 100);
  const page = Math.max(filters.page ?? 0, 0);
  const base = advertiserSql(now);
  const where = advertiserWhere(filters, now);
  const order = advertiserOrder[filters.sort ?? "recent"] ?? advertiserOrder.recent;
  const [items, totals, facetRows, quick] = await Promise.all([
    rows(
      db,
      sql`SELECT x.* FROM (${base}) x WHERE ${where} ORDER BY ${order} LIMIT ${pageSize} OFFSET ${page * pageSize}`
    ),
    rows(db, sql`SELECT COUNT(*) AS total FROM (${base}) x WHERE ${where}`),
    rows(db, sql`SELECT x.stage AS stage, COUNT(*) AS total FROM (${base}) x GROUP BY x.stage`),
    rows(
      db,
      sql`SELECT COUNT(*) AS total,
        COALESCE(SUM(x.overdue > 0), 0) AS overdue,
        COALESCE(SUM(x.identityStatus = 'pending'), 0) AS verifying,
        COALESCE(SUM(x.nextFollowUpAt IS NOT NULL AND x.nextFollowUpAt <= ${now}), 0) AS followUps,
        COALESCE(SUM(x.hasPersonal = 0), 0) AS noPersonal
      FROM (${base}) x`
    ),
  ]);
  const stageCounts: Record<string, number> = {};
  for (const stage of crmStages) stageCounts[stage] = 0;
  for (const row of facetRows) stageCounts[String(row.stage)] = num(row.total);
  return {
    items: items.map(row => mapAdvertiser(row, options.canSeeFinance)),
    total: num(totals[0]?.total),
    page,
    pageSize,
    stageCounts,
    quick: {
      all: num(quick[0]?.total),
      overdue: options.canSeeFinance ? num(quick[0]?.overdue) : 0,
      verifying: num(quick[0]?.verifying),
      followUps: num(quick[0]?.followUps),
      noPersonal: num(quick[0]?.noPersonal),
    },
  };
}

export async function getAdvertiserDetail(
  userId: number,
  options: { canSeeFinance: boolean; canSeeIdentity: boolean }
) {
  const db = await database();
  const now = new Date();
  const [row] = await rows(
    db,
    sql`SELECT x.* FROM (${advertiserSql(now)}) x WHERE x.id = ${userId} LIMIT 1`
  );
  if (!row) return null;
  const advertiser = mapAdvertiser(row, options.canSeeFinance);

  const listings = await rows(
    db,
    sql`SELECT p.id, p.slug, p.stageName, p.city, p.region, p.status, p.isPublished, p.portfolioReviewed, p.isActive, p.createdAt, p.updatedAt, p.rejectionReason,
      (SELECT COUNT(*) FROM profile_media m WHERE m.profileId = p.id AND m.kind = 'photo') AS photos,
      (SELECT COUNT(*) FROM profile_media m WHERE m.profileId = p.id AND m.kind = 'video') AS videos,
      (SELECT COALESCE(SUM(a.total), 0) FROM analytics_daily a WHERE a.profileId = p.id AND a.eventName = 'profile_view') AS views,
      (SELECT COALESCE(SUM(a.total), 0) FROM analytics_daily a WHERE a.profileId = p.id AND a.eventName = 'contact_click') AS contacts
    FROM profiles p WHERE p.ownerId = ${userId} AND p.deletedAt IS NULL ORDER BY p.createdAt DESC LIMIT 50`
  );
  const subscriptionRows = options.canSeeFinance
    ? await rows(
        db,
        sql`SELECT s.id, s.status, s.currentPeriodEndsAt, s.source, s.note, s.createdAt, pl.name AS planName, pl.priceCents
        FROM subscriptions s INNER JOIN plans pl ON pl.id = s.planId
        WHERE s.userId = ${userId} ORDER BY s.createdAt DESC LIMIT 30`
      )
    : [];
  const paymentRows = options.canSeeFinance
    ? await db
        .select()
        .from(payments)
        .where(eq(payments.userId, userId))
        .orderBy(desc(payments.createdAt), desc(payments.id))
        .limit(50)
    : [];
  const noteRows = await rows(
    db,
    sql`SELECT n.id, n.kind, n.body, n.createdAt, n.authorId, u.name AS authorName
    FROM crm_notes n LEFT JOIN users u ON u.id = n.authorId
    WHERE n.userId = ${userId} ORDER BY n.createdAt DESC, n.id DESC LIMIT 100`
  );
  const verifications = options.canSeeIdentity
    ? await rows(
        db,
        sql`SELECT iv.id, iv.status, iv.reviewReason, iv.approvedAt, iv.expiresAt, iv.createdAt,
        (SELECT COUNT(*) FROM verification_documents d WHERE d.userId = iv.userId AND d.deletedAt IS NULL) AS documents
        FROM identity_verifications iv WHERE iv.userId = ${userId} ORDER BY iv.id DESC LIMIT 10`
      )
    : [];
  const [terms, activity, personalRow] = await Promise.all([
    getAccountTermsStatus(userId),
    listOwnerActivity(userId, 30),
    getOwnerAccountRow(userId),
  ]);
  return {
    advertiser,
    personal: personalRow
      ? {
          fullName: personalRow.fullName,
          cpfMasked: maskCpf(personalRow.cpfLast2),
          birthDate: personalRow.birthDate,
          phone: personalRow.phone ?? "",
          zipCode: personalRow.zipCode ?? "",
          city: personalRow.city ?? "",
          state: personalRow.state ?? "",
          completedAt: personalRow.completedAt,
        }
      : null,
    terms: { current: terms.current, acceptedAt: terms.acceptedAt },
    listings: listings.map(item => ({
      id: num(item.id),
      slug: String(item.slug),
      stageName: String(item.stageName),
      city: String(item.city ?? ""),
      region: (item.region as string | null) ?? null,
      status: String(item.status),
      isPublished: Boolean(item.isPublished) && Boolean(item.portfolioReviewed),
      isActive: Boolean(item.isActive),
      rejectionReason: (item.rejectionReason as string | null) ?? null,
      photos: num(item.photos),
      videos: num(item.videos),
      views: num(item.views),
      contacts: num(item.contacts),
      createdAt: item.createdAt as Date,
      updatedAt: item.updatedAt as Date,
    })),
    subscriptions: subscriptionRows.map(item => ({
      id: num(item.id),
      status: String(item.status),
      planName: String(item.planName),
      priceCents: num(item.priceCents),
      currentPeriodEndsAt: (item.currentPeriodEndsAt as Date | null) ?? null,
      source: (item.source as string | null) ?? null,
      note: (item.note as string | null) ?? null,
      createdAt: item.createdAt as Date,
    })),
    payments: paymentRows.map(item => ({
      id: item.id,
      description: item.description,
      amountCents: item.amountCents,
      status: item.status,
      bucket: paymentBucket(item.status, item.dueAt, now),
      method: item.method,
      invoiceNumber: item.invoiceNumber,
      dueAt: item.dueAt,
      paidAt: item.paidAt,
      createdAt: item.createdAt,
    })),
    notes: noteRows.map(item => ({
      id: num(item.id),
      kind: String(item.kind),
      body: String(item.body),
      authorId: (item.authorId as number | null) ?? null,
      authorName: (item.authorName as string | null) ?? null,
      createdAt: item.createdAt as Date,
    })),
    verifications: verifications.map(item => ({
      id: num(item.id),
      status: String(item.status),
      reviewReason: (item.reviewReason as string | null) ?? null,
      approvedAt: (item.approvedAt as Date | null) ?? null,
      expiresAt: (item.expiresAt as Date | null) ?? null,
      createdAt: item.createdAt as Date,
      documents: num(item.documents),
    })),
    activity,
  };
}

async function ensureAdvertiserUser(db: Db, userId: number) {
  const [user] = await db
    .select({ id: users.id, role: users.role })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  if (!user || user.role !== "user") throw new Error("Anunciante não encontrado");
}

async function upsertCrm(
  db: Db,
  userId: number,
  actorId: number,
  patch: Partial<{ stage: CrmStage; tags: string; nextFollowUpAt: Date | null }>
) {
  await ensureAdvertiserUser(db, userId);
  const [existing] = await db
    .select({ id: crmProfiles.id })
    .from(crmProfiles)
    .where(eq(crmProfiles.userId, userId))
    .limit(1);
  if (existing)
    await db
      .update(crmProfiles)
      .set({ ...patch, updatedBy: actorId })
      .where(eq(crmProfiles.id, existing.id));
  else
    await db.insert(crmProfiles).values({
      userId,
      stage: patch.stage ?? "novo",
      tags: patch.tags ?? null,
      nextFollowUpAt: patch.nextFollowUpAt ?? null,
      updatedBy: actorId,
    });
}

export async function setAdvertiserStage(
  userId: number,
  stage: CrmStage,
  actorId: number
) {
  const db = await database();
  await upsertCrm(db, userId, actorId, { stage });
  await db.insert(crmNotes).values({
    userId,
    authorId: actorId,
    kind: "sistema",
    body: `Etapa alterada para "${stage}"`,
  });
  await writeAuditLog({
    actorUserId: actorId,
    action: "crm.stage_changed",
    entityType: "user",
    entityId: userId,
    metadata: { stage },
  });
  return { success: true as const };
}

export async function setAdvertiserTags(
  userId: number,
  tags: unknown,
  actorId: number
) {
  const db = await database();
  const clean = normalizeTags(tags);
  await upsertCrm(db, userId, actorId, { tags: JSON.stringify(clean) });
  return { tags: clean };
}

export async function setAdvertiserFollowUp(
  userId: number,
  when: Date | null,
  actorId: number
) {
  const db = await database();
  await upsertCrm(db, userId, actorId, { nextFollowUpAt: when });
  await writeAuditLog({
    actorUserId: actorId,
    action: "crm.followup_set",
    entityType: "user",
    entityId: userId,
    metadata: { at: when?.toISOString() ?? null },
  });
  return { success: true as const };
}

export async function addAdvertiserNote(input: {
  userId: number;
  actorId: number;
  kind: string;
  body: string;
  followUpAt?: Date | null;
}) {
  const db = await database();
  await ensureAdvertiserUser(db, input.userId);
  const body = input.body.trim().slice(0, 2000);
  if (body.length < 2) throw new Error("Escreva a anotação");
  const kind = isCrmNoteKind(input.kind) ? input.kind : "nota";
  const inserted = await db.insert(crmNotes).values({
    userId: input.userId,
    authorId: input.actorId,
    kind,
    body,
  });
  if (input.followUpAt !== undefined)
    await upsertCrm(db, input.userId, input.actorId, {
      nextFollowUpAt: input.followUpAt,
    });
  await writeAuditLog({
    actorUserId: input.actorId,
    action: "crm.note_added",
    entityType: "user",
    entityId: input.userId,
    metadata: { kind },
  });
  return { id: Number(inserted[0].insertId) };
}

export async function deleteAdvertiserNote(noteId: number, actorId: number) {
  const db = await database();
  const [note] = await db
    .select()
    .from(crmNotes)
    .where(eq(crmNotes.id, noteId))
    .limit(1);
  if (!note) throw new Error("Anotação não encontrada");
  if (note.kind === "sistema")
    throw new Error("Registros do sistema não podem ser apagados");
  await db.delete(crmNotes).where(eq(crmNotes.id, noteId));
  await writeAuditLog({
    actorUserId: actorId,
    action: "crm.note_deleted",
    entityType: "user",
    entityId: note.userId,
  });
  return { success: true as const };
}

/** CPF completo: só para quem tem a função de verificação, sempre com registro. */
export async function revealAdvertiserCpf(userId: number, actorId: number) {
  const row = await getOwnerAccountRow(userId);
  if (!row) throw new Error("Este anunciante ainda não preencheu os dados pessoais");
  let cpf: string;
  try {
    cpf = formatCpf(decryptSecret(row.cpfEnc, ENV.cookieSecret));
  } catch {
    throw new Error("Não foi possível abrir o CPF");
  }
  await writeAuditLog({
    actorUserId: actorId,
    action: "owner.cpf.revealed",
    entityType: "user",
    entityId: userId,
  });
  return { cpf };
}

// ---------------------------------------------------------------------------
// Visão geral
// ---------------------------------------------------------------------------

export async function getPanelOverview(options: {
  canSeePeople: boolean;
  canSeeFinance: boolean;
}) {
  const db = await database();
  const now = new Date();
  const range = resolveRange({ days: 30, now });
  const prev = resolveRange({
    from: undefined,
    to: new Date(range.start.getTime() - 1000).toISOString().slice(0, 10),
    days: 30,
    now,
  });
  const days = listDays(range.from, range.to);

  const [people] = options.canSeePeople
    ? await rows(
        db,
        sql`SELECT
          (SELECT COUNT(*) FROM users WHERE role = 'user' AND openId NOT LIKE 'deleted:%') AS accounts,
          (SELECT COUNT(*) FROM users WHERE role = 'user' AND openId NOT LIKE 'deleted:%' AND createdAt >= ${range.start}) AS newAccounts,
          (SELECT COUNT(*) FROM users WHERE role = 'user' AND openId NOT LIKE 'deleted:%' AND createdAt >= ${prev.start} AND createdAt < ${range.start}) AS prevNewAccounts,
          (SELECT COUNT(DISTINCT ownerId) FROM profiles WHERE deletedAt IS NULL) AS advertisers,
          (SELECT COUNT(DISTINCT ownerId) FROM profiles WHERE deletedAt IS NULL AND createdAt >= ${range.start}) AS newAdvertisers,
          (SELECT COUNT(DISTINCT ownerId) FROM profiles WHERE deletedAt IS NULL AND createdAt >= ${prev.start} AND createdAt < ${range.start}) AS prevNewAdvertisers,
          (SELECT COUNT(*) FROM users WHERE accountStatus = 'suspended' AND role = 'user') AS suspended`
      )
    : [{}];
  const [listings] = await rows(
    db,
    sql`SELECT COUNT(*) AS total,
      COALESCE(SUM(isActive = 1 AND isPublished = 1 AND portfolioReviewed = 1 AND status = 'approved'), 0) AS published,
      COALESCE(SUM(status = 'pending'), 0) AS pending,
      COALESCE(SUM(status = 'suspended'), 0) AS suspended,
      COALESCE(SUM(createdAt >= ${range.start}), 0) AS created30,
      COALESCE(SUM(createdAt >= ${prev.start} AND createdAt < ${range.start}), 0) AS createdPrev
    FROM profiles WHERE deletedAt IS NULL`
  );

  const signupRows = options.canSeePeople
    ? await rows(
        db,
        sql`SELECT DATE(CONVERT_TZ(createdAt, '+00:00', '-03:00')) AS d, COUNT(*) AS total
        FROM users WHERE role = 'user' AND createdAt >= ${range.start} GROUP BY d`
      ).catch(() => [])
    : [];
  const listingRows = await rows(
    db,
    sql`SELECT DATE(CONVERT_TZ(createdAt, '+00:00', '-03:00')) AS d, COUNT(*) AS total
    FROM profiles WHERE deletedAt IS NULL AND createdAt >= ${range.start} GROUP BY d`
  ).catch(() => []);
  const dayKey = (value: unknown) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const signupMap = new Map(signupRows.map(r => [dayKey(r.d), num(r.total)]));
  const listingMap = new Map(listingRows.map(r => [dayKey(r.d), num(r.total)]));
  const series = days.map(date => ({
    date,
    signups: signupMap.get(date) ?? 0,
    listings: listingMap.get(date) ?? 0,
  }));

  const queues = {
    pendingIdentity: num(
      (await rows(db, sql`SELECT COUNT(*) AS total FROM identity_verifications WHERE status = 'pending'`))[0]?.total
    ),
    pendingMedia: num(
      (await rows(db, sql`SELECT COUNT(*) AS total FROM profile_media WHERE status = 'pending'`))[0]?.total
    ),
    pendingProfiles: num(
      (await rows(db, sql`SELECT COUNT(*) AS total FROM profiles WHERE status = 'pending' AND deletedAt IS NULL`))[0]?.total
    ),
    openReports: num(
      (await rows(db, sql`SELECT COUNT(*) AS total FROM moderation_cases WHERE status IN ('open','in_review')`))[0]?.total
    ),
    newMessages: num(
      (await rows(db, sql`SELECT COUNT(*) AS total FROM contact_messages WHERE status = 'new'`))[0]?.total
    ),
    pendingSubscriptions: num(
      (await rows(db, sql`SELECT COUNT(*) AS total FROM subscriptions WHERE status = 'pending'`))[0]?.total
    ),
    pendingReviews: num(
      (
        await rows(
          db,
          sql`SELECT COUNT(*) AS total FROM profile_reviews WHERE status = 'pending' OR (status = 'approved' AND ownerFlaggedAt IS NOT NULL)`
        ).catch(() => [])
      )[0]?.total
    ),
    followUps: options.canSeePeople
      ? num(
          (await rows(db, sql`SELECT COUNT(*) AS total FROM crm_profiles WHERE nextFollowUpAt IS NOT NULL AND nextFollowUpAt <= ${now}`))[0]?.total
        )
      : 0,
    overduePayments: options.canSeeFinance
      ? num(
          (await rows(db, sql`SELECT COUNT(*) AS total FROM payments WHERE status = 'pending' AND dueAt IS NOT NULL AND dueAt < ${now}`))[0]?.total
        )
      : 0,
  };

  let money: null | {
    paid30: number;
    paidPrev: number;
    pending: number;
    overdue: number;
    mrr: number;
    activeSubscriptions: number;
    daily: { date: string; cents: number }[];
  } = null;
  if (options.canSeeFinance) {
    const [m] = await rows(
      db,
      sql`SELECT
        COALESCE(SUM(CASE WHEN status = 'paid' AND paidAt >= ${range.start} THEN amountCents END), 0) AS paid30,
        COALESCE(SUM(CASE WHEN status = 'paid' AND paidAt >= ${prev.start} AND paidAt < ${range.start} THEN amountCents END), 0) AS paidPrev,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amountCents END), 0) AS pending,
        COALESCE(SUM(CASE WHEN status = 'pending' AND dueAt IS NOT NULL AND dueAt < ${now} THEN amountCents END), 0) AS overdue
      FROM payments`
    );
    const activePlans = await rows(
      db,
      sql`SELECT pl.priceCents, pl.billingPeriod, pl.durationDays FROM subscriptions s
      INNER JOIN plans pl ON pl.id = s.planId
      WHERE s.status = 'active' AND (s.currentPeriodEndsAt IS NULL OR s.currentPeriodEndsAt > ${now})`
    );
    const mrr = activePlans.reduce(
      (sum, p) =>
        sum +
        monthlyEquivalentCents(num(p.priceCents), String(p.billingPeriod), num(p.durationDays)),
      0
    );
    const dailyRows = await rows(
      db,
      sql`SELECT DATE(CONVERT_TZ(paidAt, '+00:00', '-03:00')) AS d, SUM(amountCents) AS total
      FROM payments WHERE status = 'paid' AND paidAt >= ${range.start} GROUP BY d`
    ).catch(() => []);
    const dailyMap = new Map(dailyRows.map(r => [dayKey(r.d), num(r.total)]));
    money = {
      paid30: num(m?.paid30),
      paidPrev: num(m?.paidPrev),
      pending: num(m?.pending),
      overdue: num(m?.overdue),
      mrr,
      activeSubscriptions: activePlans.length,
      daily: days.map(date => ({ date, cents: dailyMap.get(date) ?? 0 })),
    };
  }

  const cities = await rows(
    db,
    sql`SELECT city AS label, COUNT(*) AS total FROM profiles WHERE deletedAt IS NULL GROUP BY city ORDER BY total DESC LIMIT 6`
  );
  const recent = await rows(
    db,
    sql`SELECT a.id, a.action, a.entityType, a.entityId, a.createdAt, u.name AS actorName
    FROM audit_logs a LEFT JOIN users u ON u.id = a.actorUserId
    WHERE (u.role IS NULL OR u.role <> 'dev')
    ORDER BY a.id DESC LIMIT 8`
  );

  return {
    people: options.canSeePeople
      ? {
          accounts: num(people.accounts),
          newAccounts: num(people.newAccounts),
          prevNewAccounts: num(people.prevNewAccounts),
          advertisers: num(people.advertisers),
          newAdvertisers: num(people.newAdvertisers),
          prevNewAdvertisers: num(people.prevNewAdvertisers),
          suspended: num(people.suspended),
        }
      : null,
    listings: {
      total: num(listings?.total),
      published: num(listings?.published),
      pending: num(listings?.pending),
      suspended: num(listings?.suspended),
      created30: num(listings?.created30),
      createdPrev: num(listings?.createdPrev),
    },
    series,
    queues,
    money,
    cities: cities.map(c => ({ label: String(c.label || "—"), total: num(c.total) })),
    recent: recent.map(r => ({
      id: num(r.id),
      action: String(r.action),
      entityType: String(r.entityType),
      entityId: (r.entityId as number | null) ?? null,
      actorName: (r.actorName as string | null) ?? null,
      createdAt: r.createdAt as Date,
    })),
  };
}

// ---------------------------------------------------------------------------
// Pagamentos
// ---------------------------------------------------------------------------

export type PaymentFilters = {
  bucket?: "all" | "paid" | "pending" | "overdue" | "failed" | "refunded" | "cancelled";
  method?: string;
  from?: string | null;
  to?: string | null;
  search?: string;
  page?: number;
  pageSize?: number;
};

function paymentWhere(filters: PaymentFilters, now: Date) {
  const c: any[] = [sql`1 = 1`];
  if (filters.bucket === "overdue")
    c.push(sql`p.status = 'pending' AND p.dueAt IS NOT NULL AND p.dueAt < ${now}`);
  else if (filters.bucket === "pending")
    c.push(sql`p.status = 'pending' AND (p.dueAt IS NULL OR p.dueAt >= ${now})`);
  else if (
    filters.bucket === "paid" ||
    filters.bucket === "failed" ||
    filters.bucket === "refunded" ||
    filters.bucket === "cancelled"
  )
    c.push(sql`p.status = ${filters.bucket}`);
  if (filters.method && filters.method !== "all")
    c.push(sql`p.method = ${filters.method}`);
  if (filters.from || filters.to) {
    const range = resolveRange({ from: filters.from, to: filters.to, now });
    c.push(sql`COALESCE(p.paidAt, p.createdAt) >= ${range.start} AND COALESCE(p.paidAt, p.createdAt) < ${range.end}`);
  }
  const search = filters.search?.trim();
  if (search) {
    const like = `%${search.replace(/[%_\\]/g, m => `\\${m}`)}%`;
    c.push(
      sql`(u.name LIKE ${like} OR u.email LIKE ${like} OR p.invoiceNumber LIKE ${like} OR p.description LIKE ${like})`
    );
  }
  return sql.join(c, sql` AND `);
}

export async function listPaymentsAdmin(filters: PaymentFilters) {
  const db = await database();
  const now = new Date();
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 5), 100);
  const page = Math.max(filters.page ?? 0, 0);
  const where = paymentWhere(filters, now);
  const [items, totals, overall] = await Promise.all([
    rows(
      db,
      sql`SELECT p.id, p.userId, p.description, p.amountCents, p.status, p.method, p.invoiceNumber,
        p.dueAt, p.paidAt, p.createdAt, p.subscriptionId, u.name AS userName, u.email AS userEmail
      FROM payments p LEFT JOIN users u ON u.id = p.userId
      WHERE ${where} ORDER BY p.createdAt DESC, p.id DESC LIMIT ${pageSize} OFFSET ${page * pageSize}`
    ),
    rows(
      db,
      sql`SELECT COUNT(*) AS total FROM payments p LEFT JOIN users u ON u.id = p.userId WHERE ${where}`
    ),
    rows(
      db,
      sql`SELECT
        COALESCE(SUM(CASE WHEN p.status = 'paid' THEN p.amountCents END), 0) AS paid,
        COALESCE(SUM(CASE WHEN p.status = 'pending' AND (p.dueAt IS NULL OR p.dueAt >= ${now}) THEN p.amountCents END), 0) AS pending,
        COALESCE(SUM(CASE WHEN p.status = 'pending' AND p.dueAt IS NOT NULL AND p.dueAt < ${now} THEN p.amountCents END), 0) AS overdue,
        COALESCE(SUM(CASE WHEN p.status = 'refunded' THEN p.amountCents END), 0) AS refunded,
        COALESCE(SUM(p.status = 'paid'), 0) AS paidCount,
        COALESCE(SUM(p.status = 'pending' AND (p.dueAt IS NULL OR p.dueAt >= ${now})), 0) AS pendingCount,
        COALESCE(SUM(p.status = 'pending' AND p.dueAt IS NOT NULL AND p.dueAt < ${now}), 0) AS overdueCount
      FROM payments p LEFT JOIN users u ON u.id = p.userId WHERE ${where}`
    ),
  ]);
  const o = overall[0] ?? {};
  return {
    items: items.map(row => ({
      id: num(row.id),
      userId: num(row.userId),
      userName: (row.userName as string | null) ?? null,
      userEmail: (row.userEmail as string | null) ?? null,
      description: String(row.description),
      amountCents: num(row.amountCents),
      status: String(row.status),
      bucket: paymentBucket(String(row.status), row.dueAt as Date | null, now),
      method: String(row.method),
      invoiceNumber: (row.invoiceNumber as string | null) ?? null,
      dueAt: (row.dueAt as Date | null) ?? null,
      paidAt: (row.paidAt as Date | null) ?? null,
      createdAt: row.createdAt as Date,
      subscriptionId: (row.subscriptionId as number | null) ?? null,
    })),
    total: num(totals[0]?.total),
    page,
    pageSize,
    totals: {
      paid: num(o.paid),
      pending: num(o.pending),
      overdue: num(o.overdue),
      refunded: num(o.refunded),
      paidCount: num(o.paidCount),
      pendingCount: num(o.pendingCount),
      overdueCount: num(o.overdueCount),
    },
  };
}

export async function updatePaymentStatus(input: {
  id: number;
  status: "paid" | "pending" | "failed" | "refunded" | "cancelled";
  method?: "pix" | "card" | "boleto" | "manual" | "courtesy";
  dueAt?: Date | null;
  actorId: number;
}) {
  const db = await database();
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.id, input.id))
    .limit(1);
  if (!payment) throw new Error("Pagamento não encontrado");
  if (payment.status === input.status && !input.dueAt && !input.method)
    return { success: true as const };
  if (payment.status === "refunded" && input.status !== "refunded")
    throw new Error("Um pagamento reembolsado não pode voltar atrás");
  if (input.status === "refunded" && payment.status !== "paid")
    throw new Error("Só é possível reembolsar um pagamento que foi pago");
  const set: Record<string, unknown> = { status: input.status };
  if (input.status === "paid" && payment.status !== "paid") set.paidAt = new Date();
  if (input.method) set.method = input.method;
  if (input.dueAt !== undefined) set.dueAt = input.dueAt;
  await db.update(payments).set(set).where(eq(payments.id, input.id));
  await writeAuditLog({
    actorUserId: input.actorId,
    action: "payment.status_changed",
    entityType: "payment",
    entityId: input.id,
    metadata: { from: payment.status, to: input.status, userId: payment.userId },
  });
  return { success: true as const };
}

// ---------------------------------------------------------------------------
// Relatórios (tabela + CSV)
// ---------------------------------------------------------------------------

export const reportKinds = [
  "advertisers",
  "listings",
  "payments",
  "verifications",
] as const;
export type ReportKind = (typeof reportKinds)[number];

export type ReportResult = {
  kind: ReportKind;
  title: string;
  from: string;
  to: string;
  columns: string[];
  rows: (string | number | null)[][];
  summary: { label: string; value: string }[];
  series: { date: string; value: number }[];
  truncated: boolean;
};

const ROW_LIMIT = 5000;
const fmtDate = (value: unknown) =>
  value
    ? new Date(value as string).toLocaleDateString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })
    : "";
const fmtDateTime = (value: unknown) =>
  value
    ? new Date(value as string).toLocaleString("pt-BR", {
        timeZone: "America/Sao_Paulo",
      })
    : "";
const identityText: Record<string, string> = {
  approved: "Verificada",
  pending: "Em análise",
  rejected: "Recusada",
  expired: "Vencida",
  error: "Com erro",
};
const bucketText: Record<string, string> = {
  paid: "Pago",
  pending: "Aguardando",
  overdue: "Atrasado",
  failed: "Falhou",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};
const methodText: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  boleto: "Boleto",
  manual: "Outro",
  courtesy: "Cortesia",
};
const listingStatusText: Record<string, string> = {
  approved: "Aprovado",
  pending: "Em análise",
  draft: "Rascunho",
  rejected: "Recusado",
  suspended: "Suspenso",
};
const money = (cents: unknown) =>
  (num(cents) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

export async function buildReport(
  kind: ReportKind,
  input: { from?: string | null; to?: string | null; days?: number },
  options: { canSeeFinance: boolean }
): Promise<ReportResult> {
  const db = await database();
  const now = new Date();
  const range = resolveRange({ ...input, now });
  const days = listDays(range.from, range.to);
  const dayKey = (value: unknown) =>
    value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
  const toSeries = (data: Record<string, any>[]) => {
    const map = new Map(data.map(r => [dayKey(r.d), num(r.total)]));
    return days.map(date => ({ date, value: map.get(date) ?? 0 }));
  };

  if (kind === "advertisers") {
    const data = await rows(
      db,
      sql`SELECT x.* FROM (${advertiserSql(now)}) x
      WHERE x.createdAt >= ${range.start} AND x.createdAt < ${range.end}
      ORDER BY x.createdAt DESC LIMIT ${ROW_LIMIT + 1}`
    );
    const truncated = data.length > ROW_LIMIT;
    const list = data.slice(0, ROW_LIMIT).map(r => mapAdvertiser(r, options.canSeeFinance));
    const perDay = await rows(
      db,
      sql`SELECT DATE(CONVERT_TZ(x.createdAt, '+00:00', '-03:00')) AS d, COUNT(*) AS total
      FROM (${advertiserSql(now)}) x WHERE x.createdAt >= ${range.start} AND x.createdAt < ${range.end} GROUP BY d`
    ).catch(() => []);
    const withListing = list.filter(a => a.listings > 0).length;
    return {
      kind,
      title: "Quem anunciou e quando",
      from: range.from,
      to: range.to,
      columns: [
        "ID",
        "Nome da conta",
        "Nome completo",
        "E-mail",
        "Cadastro",
        "Primeiro anúncio",
        "Anúncios",
        "No ar",
        "Fotos e vídeos",
        "Dados pessoais",
        "Verificação",
        ...(options.canSeeFinance ? ["Plano", "Total pago"] : []),
        "Etapa",
      ],
      rows: list.map(a => [
        a.id,
        a.name,
        a.fullName,
        a.email,
        fmtDate(a.createdAt),
        fmtDate(a.firstListingAt),
        a.listings,
        a.published,
        a.mediaCount,
        a.hasPersonal ? "Sim" : "Não",
        a.identityStatus ? (identityText[a.identityStatus] ?? a.identityStatus) : "Não enviada",
        ...(options.canSeeFinance ? [a.planName ?? "—", money(a.paidTotalCents)] : []),
        crmStageLabels[a.stage],
      ]),
      summary: [
        { label: "Cadastros no período", value: String(list.length) },
        { label: "Já criaram anúncio", value: String(withListing) },
        { label: "Com anúncio no ar", value: String(list.filter(a => a.published > 0).length) },
        { label: "Dados pessoais completos", value: String(list.filter(a => a.hasPersonal).length) },
      ],
      series: toSeries(perDay),
      truncated,
    };
  }

  if (kind === "listings") {
    const data = await rows(
      db,
      sql`SELECT p.id, p.stageName, p.city, p.status, p.isPublished, p.portfolioReviewed, p.isActive, p.createdAt, p.updatedAt,
        u.id AS ownerId, u.name AS ownerName, u.email AS ownerEmail,
        (SELECT COUNT(*) FROM profile_media m WHERE m.profileId = p.id) AS media,
        (SELECT COALESCE(SUM(a.total), 0) FROM analytics_daily a WHERE a.profileId = p.id AND a.eventName = 'profile_view') AS views
      FROM profiles p LEFT JOIN users u ON u.id = p.ownerId
      WHERE p.deletedAt IS NULL AND p.createdAt >= ${range.start} AND p.createdAt < ${range.end}
      ORDER BY p.createdAt DESC LIMIT ${ROW_LIMIT + 1}`
    );
    const perDay = await rows(
      db,
      sql`SELECT DATE(CONVERT_TZ(createdAt, '+00:00', '-03:00')) AS d, COUNT(*) AS total
      FROM profiles WHERE deletedAt IS NULL AND createdAt >= ${range.start} AND createdAt < ${range.end} GROUP BY d`
    ).catch(() => []);
    const list = data.slice(0, ROW_LIMIT);
    const live = (r: Record<string, any>) =>
      Boolean(r.isPublished) && Boolean(r.portfolioReviewed) && Boolean(r.isActive) && r.status === "approved";
    return {
      kind,
      title: "Anúncios criados",
      from: range.from,
      to: range.to,
      columns: ["ID", "Anúncio", "Cidade", "Situação", "No ar", "Fotos e vídeos", "Visitas", "Criado em", "Titular (ID)", "Titular", "E-mail"],
      rows: list.map(r => [
        num(r.id),
        String(r.stageName),
        String(r.city ?? ""),
        listingStatusText[String(r.status)] ?? String(r.status),
        live(r) ? "Sim" : "Não",
        num(r.media),
        num(r.views),
        fmtDateTime(r.createdAt),
        num(r.ownerId),
        (r.ownerName as string | null) ?? "",
        (r.ownerEmail as string | null) ?? "",
      ]),
      summary: [
        { label: "Anúncios criados", value: String(list.length) },
        { label: "No ar agora", value: String(list.filter(live).length) },
        { label: "Aguardando análise", value: String(list.filter(r => r.status === "pending").length) },
        { label: "Suspensos", value: String(list.filter(r => r.status === "suspended").length) },
      ],
      series: toSeries(perDay),
      truncated: data.length > ROW_LIMIT,
    };
  }

  if (kind === "payments") {
    if (!options.canSeeFinance) throw new Error("Sem acesso ao financeiro");
    const data = await rows(
      db,
      sql`SELECT p.id, p.description, p.amountCents, p.status, p.method, p.invoiceNumber, p.dueAt, p.paidAt, p.createdAt,
        u.id AS userId, u.name AS userName, u.email AS userEmail
      FROM payments p LEFT JOIN users u ON u.id = p.userId
      WHERE COALESCE(p.paidAt, p.createdAt) >= ${range.start} AND COALESCE(p.paidAt, p.createdAt) < ${range.end}
      ORDER BY COALESCE(p.paidAt, p.createdAt) DESC LIMIT ${ROW_LIMIT + 1}`
    );
    const perDay = await rows(
      db,
      sql`SELECT DATE(CONVERT_TZ(paidAt, '+00:00', '-03:00')) AS d, SUM(amountCents) AS total
      FROM payments WHERE status = 'paid' AND paidAt >= ${range.start} AND paidAt < ${range.end} GROUP BY d`
    ).catch(() => []);
    const list = data.slice(0, ROW_LIMIT);
    const sum = (bucket: string) =>
      list
        .filter(r => paymentBucket(String(r.status), r.dueAt as Date | null, now) === bucket)
        .reduce((acc, r) => acc + num(r.amountCents), 0);
    return {
      kind,
      title: "Pagamentos",
      from: range.from,
      to: range.to,
      columns: ["Fatura", "Descrição", "Anunciante (ID)", "Anunciante", "E-mail", "Forma", "Valor", "Situação", "Vencimento", "Pago em", "Criado em"],
      rows: list.map(r => [
        (r.invoiceNumber as string | null) ?? `#${r.id}`,
        String(r.description),
        num(r.userId),
        (r.userName as string | null) ?? "",
        (r.userEmail as string | null) ?? "",
        methodText[String(r.method)] ?? String(r.method),
        money(r.amountCents),
        bucketText[paymentBucket(String(r.status), r.dueAt as Date | null, now)] ?? "",
        fmtDate(r.dueAt),
        fmtDate(r.paidAt),
        fmtDate(r.createdAt),
      ]),
      summary: [
        { label: "Recebido", value: money(sum("paid")) },
        { label: "A receber", value: money(sum("pending")) },
        { label: "Atrasado", value: money(sum("overdue")) },
        { label: "Reembolsado", value: money(sum("refunded")) },
      ],
      series: toSeries(perDay).map(item => ({ ...item, value: item.value / 100 })),
      truncated: data.length > ROW_LIMIT,
    };
  }

  const data = await rows(
    db,
    sql`SELECT iv.id, iv.userId, iv.status, iv.reviewReason, iv.createdAt, iv.approvedAt, iv.expiresAt, u.name AS userName, u.email AS userEmail
    FROM identity_verifications iv LEFT JOIN users u ON u.id = iv.userId
    WHERE iv.createdAt >= ${range.start} AND iv.createdAt < ${range.end}
    ORDER BY iv.createdAt DESC LIMIT ${ROW_LIMIT + 1}`
  );
  const perDay = await rows(
    db,
    sql`SELECT DATE(CONVERT_TZ(createdAt, '+00:00', '-03:00')) AS d, COUNT(*) AS total
    FROM identity_verifications WHERE createdAt >= ${range.start} AND createdAt < ${range.end} GROUP BY d`
  ).catch(() => []);
  const list = data.slice(0, ROW_LIMIT);
  return {
    kind: "verifications",
    title: "Verificações de identidade",
    from: range.from,
    to: range.to,
    columns: ["ID", "Anunciante (ID)", "Anunciante", "E-mail", "Situação", "Motivo", "Enviada em", "Aprovada em", "Vale até"],
    rows: list.map(r => [
      num(r.id),
      num(r.userId),
      (r.userName as string | null) ?? "",
      (r.userEmail as string | null) ?? "",
      identityText[String(r.status)] ?? String(r.status),
      (r.reviewReason as string | null) ?? "",
      fmtDateTime(r.createdAt),
      fmtDate(r.approvedAt),
      fmtDate(r.expiresAt),
    ]),
    summary: [
      { label: "Solicitações", value: String(list.length) },
      { label: "Aprovadas", value: String(list.filter(r => r.status === "approved").length) },
      { label: "Recusadas", value: String(list.filter(r => r.status === "rejected").length) },
      { label: "Em análise", value: String(list.filter(r => r.status === "pending").length) },
    ],
    series: toSeries(perDay),
    truncated: data.length > ROW_LIMIT,
  };
}

export function reportToCsv(report: ReportResult) {
  return toCsv(report.columns, report.rows);
}

// ---------------------------------------------------------------------------
// Busca rápida (Ctrl+K)
// ---------------------------------------------------------------------------

export async function searchPanel(
  query: string,
  options: { canSeePeople: boolean; canSeeListings: boolean }
) {
  const q = query.trim();
  if (q.length < 2) return { advertisers: [], listings: [], clients: [] };
  const db = await database();
  const like = `%${q.replace(/[%_\\]/g, m => `\\${m}`)}%`;
  const asId = /^#?\d+$/.test(q) ? Number(q.replace("#", "")) : -1;
  const people = options.canSeePeople
    ? await rows(
        db,
        sql`SELECT u.id, u.name, u.email,
          (EXISTS (SELECT 1 FROM profiles p WHERE p.ownerId = u.id AND p.deletedAt IS NULL)
            OR EXISTS (SELECT 1 FROM owner_accounts oa WHERE oa.userId = u.id)) AS isAdvertiser
        FROM users u
        WHERE u.role = 'user' AND u.openId NOT LIKE 'deleted:%'
          AND (u.name LIKE ${like} OR u.email LIKE ${like} OR u.id = ${asId}
            OR EXISTS (SELECT 1 FROM owner_accounts oa WHERE oa.userId = u.id AND oa.fullName LIKE ${like}))
        ORDER BY u.id DESC LIMIT 12`
      )
    : [];
  const listings = options.canSeeListings
    ? await rows(
        db,
        sql`SELECT id, stageName, slug, city, status FROM profiles
        WHERE deletedAt IS NULL AND (stageName LIKE ${like} OR slug LIKE ${like} OR id = ${asId})
        ORDER BY id DESC LIMIT 6`
      )
    : [];
  const mapPerson = (r: Record<string, any>) => ({
    id: num(r.id),
    name: (r.name as string | null) ?? null,
    email: (r.email as string | null) ?? null,
  });
  return {
    advertisers: people.filter(r => num(r.isAdvertiser) === 1).slice(0, 6).map(mapPerson),
    clients: people.filter(r => num(r.isAdvertiser) !== 1).slice(0, 4).map(mapPerson),
    listings: listings.map(r => ({
      id: num(r.id),
      stageName: String(r.stageName),
      city: String(r.city ?? ""),
      status: String(r.status),
    })),
  };
}

// ---------------------------------------------------------------------------
// Pacotes: quantos assinantes e quanto cada plano rende
// ---------------------------------------------------------------------------

export async function getPlanStats() {
  const db = await database();
  const now = new Date();
  const data = await rows(
    db,
    sql`SELECT pl.id AS planId,
      COALESCE(SUM(s.status = 'active' AND (s.currentPeriodEndsAt IS NULL OR s.currentPeriodEndsAt > ${now})), 0) AS active,
      COALESCE(SUM(s.status = 'pending'), 0) AS pending,
      COUNT(s.id) AS total
    FROM plans pl LEFT JOIN subscriptions s ON s.planId = pl.id GROUP BY pl.id`
  );
  const revenue = await rows(
    db,
    sql`SELECT planId, COALESCE(SUM(amountCents), 0) AS total FROM payments WHERE status = 'paid' AND planId IS NOT NULL GROUP BY planId`
  );
  const revenueMap = new Map(revenue.map(r => [num(r.planId), num(r.total)]));
  return data.map(r => ({
    planId: num(r.planId),
    active: num(r.active),
    pending: num(r.pending),
    total: num(r.total),
    revenueCents: revenueMap.get(num(r.planId)) ?? 0,
  }));
}

// ---------------------------------------------------------------------------
// Pedido de pacote personalizado (vem do próprio anunciante)
// ---------------------------------------------------------------------------

export async function registerCustomPlanRequest(userId: number, message: string) {
  const db = await database();
  const body = message.trim().slice(0, 1500);
  if (body.length < 10) throw new Error("Conte em poucas palavras o que você precisa");
  await upsertCrm(db, userId, userId, {
    stage: "negociacao",
    nextFollowUpAt: new Date(),
  });
  await db.insert(crmNotes).values({
    userId,
    authorId: userId,
    kind: "pedido",
    body: `Pacote personalizado: ${body}`,
  });
  await writeAuditLog({
    actorUserId: userId,
    action: "plan.custom_requested",
    entityType: "user",
    entityId: userId,
  });
  return { success: true as const };
}
