// Avaliações dos anúncios: envio pelo público, resposta do anunciante e moderação.
// Nada é publicado sem passar pela regra de texto (sem telefone, link ou e-mail) e,
// por padrão, pela aprovação da equipe.
import { eq, sql } from "drizzle-orm";
import { siteSettings } from "../drizzle/schema";
import {
  cleanReviewText,
  publicAuthorName,
  reviewLimits,
  reviewTextProblem,
  summarizeRatings,
  validateReviewInput,
  type ReviewSort,
  type ReviewStatus,
} from "../shared/reviews";
import { getDb, writeAuditLog } from "./db";

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
// Ajuste: aprovar sozinho ou passar pela equipe
// ---------------------------------------------------------------------------

const SETTINGS_ROW_ID = 3;
export type ReviewSettings = { autoApprove: boolean };

export async function readReviewSettings(): Promise<ReviewSettings> {
  try {
    const db = await getDb();
    if (!db) return { autoApprove: false };
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, SETTINGS_ROW_ID))
      .limit(1);
    const parsed = row ? JSON.parse(row.value) : {};
    return { autoApprove: parsed?.autoApprove === true };
  } catch {
    return { autoApprove: false };
  }
}

export async function saveReviewSettings(input: { autoApprove: boolean }) {
  const db = await database();
  const value = JSON.stringify({ autoApprove: input.autoApprove === true });
  await db
    .insert(siteSettings)
    .values({ id: SETTINGS_ROW_ID, value })
    .onDuplicateKeyUpdate({ set: { value } });
  return { autoApprove: input.autoApprove === true };
}

// ---------------------------------------------------------------------------
// Público
// ---------------------------------------------------------------------------

const publicProfileWhere = sql`p.status = 'approved' AND p.isPublished = 1
  AND p.portfolioReviewed = 1 AND p.isActive = 1 AND p.deletedAt IS NULL
  AND u.accountStatus = 'active'`;

async function findPublicProfile(db: Db, profileId: number) {
  const [row] = await rows<{ id: number; ownerId: number; stageName: string }>(
    db,
    sql`SELECT p.id, p.ownerId, p.stageName FROM profiles p
      JOIN users u ON u.id = p.ownerId
      WHERE p.id = ${profileId} AND ${publicProfileWhere} LIMIT 1`
  );
  return row ?? null;
}

const orderBy: Record<ReviewSort, ReturnType<typeof sql>> = {
  recent: sql`r.createdAt DESC, r.id DESC`,
  best: sql`r.rating DESC, r.createdAt DESC, r.id DESC`,
  worst: sql`r.rating ASC, r.createdAt DESC, r.id DESC`,
};

export async function getReviewsForProfile(input: {
  profileId: number;
  sort: ReviewSort;
  page: number;
  userId?: number | null;
}) {
  const db = await database();
  const profile = await findPublicProfile(db, input.profileId);
  if (!profile) return null;
  const distributionRows = await rows<{ rating: number; total: number }>(
    db,
    sql`SELECT rating, COUNT(*) AS total FROM profile_reviews
      WHERE profileId = ${input.profileId} AND status = 'approved' GROUP BY rating`
  );
  const ratings: number[] = [];
  for (const row of distributionRows)
    for (let i = 0; i < num(row.total); i += 1) ratings.push(num(row.rating));
  const summary = summarizeRatings(ratings);
  const size = reviewLimits.pageSize;
  const offset = Math.max(0, (input.page - 1) * size);
  const items = await rows(
    db,
    sql`SELECT r.id, r.rating, r.kind, r.title, r.body, r.authorName, r.createdAt,
        r.ownerReply, r.ownerReplyAt
      FROM profile_reviews r
      WHERE r.profileId = ${input.profileId} AND r.status = 'approved'
      ORDER BY ${orderBy[input.sort]} LIMIT ${size + 1} OFFSET ${offset}`
  );
  let mine = null;
  if (input.userId) {
    const [own] = await rows(
      db,
      sql`SELECT id, rating, kind, title, body, status, createdAt
        FROM profile_reviews WHERE profileId = ${input.profileId}
        AND authorId = ${input.userId} LIMIT 1`
    );
    mine = own ?? null;
  }
  return {
    summary,
    items: items.slice(0, size),
    hasMore: items.length > size,
    mine,
    isOwner: Boolean(input.userId && input.userId === profile.ownerId),
  };
}

export async function createReview(input: {
  userId: number;
  userName: string | null;
  profileId: number;
  rating: unknown;
  kind: unknown;
  title?: unknown;
  body: unknown;
}) {
  const clean = validateReviewInput(input);
  const db = await database();
  const profile = await findPublicProfile(db, input.profileId);
  if (!profile) throw new Error("Este anúncio não está disponível para avaliação.");
  if (profile.ownerId === input.userId)
    throw new Error("Você não pode avaliar o seu próprio anúncio.");
  const [existing] = await rows(
    db,
    sql`SELECT id FROM profile_reviews WHERE profileId = ${input.profileId}
      AND authorId = ${input.userId} LIMIT 1`
  );
  if (existing)
    throw new Error("Você já avaliou este anúncio. Apague a avaliação para enviar outra.");
  const [recent] = await rows<{ total: number }>(
    db,
    sql`SELECT COUNT(*) AS total FROM profile_reviews WHERE authorId = ${input.userId}
      AND createdAt > (NOW() - INTERVAL 1 DAY)`
  );
  if (num(recent?.total) >= reviewLimits.perDay)
    throw new Error("Você enviou muitas avaliações hoje. Tente de novo amanhã.");
  const settings = await readReviewSettings();
  const status: ReviewStatus = settings.autoApprove ? "approved" : "pending";
  const authorName = publicAuthorName(input.userName);
  try {
    await db.execute(
      sql`INSERT INTO profile_reviews
        (profileId, authorId, authorName, rating, kind, title, body, status)
        VALUES (${input.profileId}, ${input.userId}, ${authorName}, ${clean.rating},
          ${clean.kind}, ${clean.title || null}, ${clean.body}, ${status})`
    );
  } catch (error) {
    if (/duplicate/i.test(String((error as Error)?.message)))
      throw new Error("Você já avaliou este anúncio.");
    throw error;
  }
  return { status };
}

export async function deleteOwnReview(userId: number, reviewId: number) {
  const db = await database();
  await db.execute(
    sql`DELETE FROM profile_reviews WHERE id = ${reviewId} AND authorId = ${userId}`
  );
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Anunciante: ver o que foi publicado e responder
// ---------------------------------------------------------------------------

export async function listOwnerReviews(ownerId: number) {
  const db = await database();
  const list = await rows(
    db,
    sql`SELECT r.id, r.profileId, p.stageName, p.slug, r.rating, r.kind, r.title, r.body,
        r.authorName, r.createdAt, r.ownerReply, r.ownerReplyAt, r.ownerFlaggedAt
      FROM profile_reviews r JOIN profiles p ON p.id = r.profileId
      WHERE p.ownerId = ${ownerId} AND r.status = 'approved' AND p.deletedAt IS NULL
      ORDER BY r.createdAt DESC, r.id DESC LIMIT 200`
  );
  const summary = summarizeRatings(list.map(item => num(item.rating)));
  return { summary, items: list };
}

async function ownedApprovedReview(db: Db, ownerId: number, reviewId: number) {
  const [row] = await rows<{ id: number; profileId: number }>(
    db,
    sql`SELECT r.id, r.profileId FROM profile_reviews r
      JOIN profiles p ON p.id = r.profileId
      WHERE r.id = ${reviewId} AND p.ownerId = ${ownerId} AND r.status = 'approved' LIMIT 1`
  );
  if (!row) throw new Error("Avaliação não encontrada.");
  return row;
}

export async function replyToReview(ownerId: number, reviewId: number, text: unknown) {
  const db = await database();
  await ownedApprovedReview(db, ownerId, reviewId);
  const reply = cleanReviewText(text, reviewLimits.replyMax);
  if (!reply) {
    await db.execute(
      sql`UPDATE profile_reviews SET ownerReply = NULL, ownerReplyAt = NULL WHERE id = ${reviewId}`
    );
    return { ok: true };
  }
  if (reply.length < 3) throw new Error("Escreva uma resposta um pouco maior.");
  const problem = reviewTextProblem(reply);
  if (problem) throw new Error(problem);
  await db.execute(
    sql`UPDATE profile_reviews SET ownerReply = ${reply}, ownerReplyAt = NOW() WHERE id = ${reviewId}`
  );
  await writeAuditLog({
    actorUserId: ownerId,
    action: "review.replied",
    entityType: "profile_review",
    entityId: reviewId,
  });
  return { ok: true };
}

export async function flagReview(ownerId: number, reviewId: number) {
  const db = await database();
  await ownedApprovedReview(db, ownerId, reviewId);
  await db.execute(
    sql`UPDATE profile_reviews SET ownerFlaggedAt = NOW() WHERE id = ${reviewId} AND ownerFlaggedAt IS NULL`
  );
  await writeAuditLog({
    actorUserId: ownerId,
    action: "review.flagged",
    entityType: "profile_review",
    entityId: reviewId,
  });
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Equipe: fila de moderação
// ---------------------------------------------------------------------------

export type AdminReviewFilter = ReviewStatus | "flagged" | "all";

export async function listAdminReviews(input: {
  status: AdminReviewFilter;
  q?: string;
  page: number;
  pageSize?: number;
}) {
  const db = await database();
  const size = Math.min(Math.max(input.pageSize ?? 20, 5), 50);
  const offset = Math.max(0, (input.page - 1) * size);
  const where: any[] = [sql`1 = 1`];
  if (input.status === "flagged")
    where.push(sql`r.status = 'approved' AND r.ownerFlaggedAt IS NOT NULL`);
  else if (input.status !== "all") where.push(sql`r.status = ${input.status}`);
  const q = (input.q ?? "").trim().slice(0, 80);
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
    where.push(
      sql`(r.body LIKE ${like} OR r.authorName LIKE ${like} OR p.stageName LIKE ${like})`
    );
  }
  const condition = sql.join(where, sql` AND `);
  const [total] = await rows<{ total: number }>(
    db,
    sql`SELECT COUNT(*) AS total FROM profile_reviews r
      JOIN profiles p ON p.id = r.profileId WHERE ${condition}`
  );
  const items = await rows(
    db,
    sql`SELECT r.id, r.profileId, p.stageName, p.slug, r.authorId, r.authorName,
        r.rating, r.kind, r.title, r.body, r.status, r.ownerReply, r.ownerReplyAt,
        r.ownerFlaggedAt, r.moderationNote, r.moderatedAt, r.createdAt
      FROM profile_reviews r JOIN profiles p ON p.id = r.profileId
      WHERE ${condition}
      ORDER BY (r.status = 'pending') DESC, r.createdAt DESC, r.id DESC
      LIMIT ${size} OFFSET ${offset}`
  );
  return { items, total: num(total?.total), page: input.page, pageSize: size };
}

export async function getReviewCounts() {
  const db = await getDb();
  if (!db) return { pending: 0, flagged: 0 };
  try {
    const [row] = await rows<{ pending: number; flagged: number }>(
      db,
      sql`SELECT
        SUM(status = 'pending') AS pending,
        SUM(status = 'approved' AND ownerFlaggedAt IS NOT NULL) AS flagged
        FROM profile_reviews`
    );
    return { pending: num(row?.pending), flagged: num(row?.flagged) };
  } catch {
    return { pending: 0, flagged: 0 };
  }
}

export async function moderateReview(input: {
  id: number;
  status: ReviewStatus;
  note?: string;
  adminId: number;
}) {
  const db = await database();
  const [row] = await rows<{ id: number; status: string; profileId: number }>(
    db,
    sql`SELECT id, status, profileId FROM profile_reviews WHERE id = ${input.id} LIMIT 1`
  );
  if (!row) throw new Error("Avaliação não encontrada.");
  const note = cleanReviewText(input.note, 300) || null;
  await db.execute(
    sql`UPDATE profile_reviews SET status = ${input.status}, moderationNote = ${note},
      moderatedBy = ${input.adminId}, moderatedAt = NOW(), ownerFlaggedAt = NULL
      WHERE id = ${input.id}`
  );
  await writeAuditLog({
    actorUserId: input.adminId,
    action: "review.moderated",
    entityType: "profile_review",
    entityId: input.id,
    metadata: { from: row.status, to: input.status, profileId: row.profileId },
  });
  return { ok: true };
}

export async function clearReviewReply(id: number, adminId: number) {
  const db = await database();
  await db.execute(
    sql`UPDATE profile_reviews SET ownerReply = NULL, ownerReplyAt = NULL WHERE id = ${id}`
  );
  await writeAuditLog({
    actorUserId: adminId,
    action: "review.reply_removed",
    entityType: "profile_review",
    entityId: id,
  });
  return { ok: true };
}
