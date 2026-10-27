// Documentos e vídeo de verificação de identidade.
// Os arquivos ficam em pasta privada (verification/<id da conta>/...), nunca
// passam pela rota pública de mídia e só são abertos por endpoints que exigem
// login: o próprio titular ou quem tem a função de verificação (com registro).
import { createHash } from "node:crypto";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import {
  identityVerifications,
  users,
  verificationDocuments,
} from "../drizzle/schema";
import {
  ageFromBirthDate,
  isVerificationDocKind,
  missingVerificationFiles,
  verificationChecks,
  verificationDocKinds,
  verificationDocLabels,
  type VerificationDocKind,
} from "../shared/admin-crm";
import { maskCpf } from "../shared/owner-account";
import { storageDelete } from "./storage";
import {
  getDb,
  getIdentityVerification,
  requestIdentityVerification,
  writeAuditLog,
} from "./db";
import { getOwnerAccountRow, hasOwnerPersonalData } from "./owner-area";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
async function database(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  return db;
}

export const hashStorageKey = (key: string) =>
  createHash("sha256").update(key).digest("hex");

const docView = (row: typeof verificationDocuments.$inferSelect) => ({
  id: row.id,
  kind: row.kind as VerificationDocKind,
  label: isVerificationDocKind(row.kind) ? verificationDocLabels[row.kind] : row.kind,
  mimeType: row.mimeType,
  sizeBytes: row.sizeBytes,
  isVideo: row.mimeType.startsWith("video/"),
  createdAt: row.createdAt,
});

async function activeDocs(db: Db, userId: number) {
  return db
    .select()
    .from(verificationDocuments)
    .where(
      and(
        eq(verificationDocuments.userId, userId),
        isNull(verificationDocuments.deletedAt)
      )
    )
    .orderBy(asc(verificationDocuments.id));
}

/** Situação do titular: o que já enviou, o que falta e como está a análise. */
export async function getOwnerVerification(userId: number) {
  const db = await database();
  const [docs, current, personal] = await Promise.all([
    activeDocs(db, userId),
    getIdentityVerification(userId),
    hasOwnerPersonalData(userId),
  ]);
  const kinds = docs.map(d => d.kind);
  const missing = missingVerificationFiles(kinds);
  const now = new Date();
  const expired =
    current?.status === "approved" &&
    Boolean(current.expiresAt && current.expiresAt <= now);
  const status = !current
    ? "none"
    : expired
      ? "expired"
      : current.status;
  return {
    status: status as
      | "none"
      | "pending"
      | "approved"
      | "rejected"
      | "expired"
      | "error",
    reason: current?.reviewReason ?? null,
    approvedAt: current?.approvedAt ?? null,
    expiresAt: current?.expiresAt ?? null,
    submittedAt: current?.createdAt ?? null,
    personalComplete: personal,
    docs: docs.map(docView),
    missing: missing.map(kind => ({ kind, label: verificationDocLabels[kind] })),
    canSubmit:
      personal &&
      missing.length === 0 &&
      status !== "pending" &&
      status !== "approved",
    // Enquanto está em análise ou aprovada, os arquivos ficam travados.
    locked: status === "pending" || status === "approved",
  };
}

/** Registra um arquivo já gravado no storage. Substitui o anterior do mesmo tipo. */
export async function saveVerificationDoc(input: {
  userId: number;
  kind: VerificationDocKind;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const db = await database();
  const state = await getOwnerVerification(input.userId);
  if (state.locked) {
    await storageDelete(input.storageKey).catch(() => undefined);
    throw new Error(
      state.status === "approved"
        ? "Sua identidade já foi aprovada"
        : "Seus documentos estão em análise e não podem ser trocados agora"
    );
  }
  const previous = (await activeDocs(db, input.userId)).filter(
    d => d.kind === input.kind
  );
  const inserted = await db.insert(verificationDocuments).values({
    userId: input.userId,
    kind: input.kind,
    storageKey: input.storageKey,
    storageHash: hashStorageKey(input.storageKey),
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });
  for (const old of previous) {
    await db
      .update(verificationDocuments)
      .set({ deletedAt: new Date() })
      .where(eq(verificationDocuments.id, old.id));
    await storageDelete(old.storageKey).catch(() => undefined);
  }
  await writeAuditLog({
    actorUserId: input.userId,
    action: "verification.document_uploaded",
    entityType: "user",
    entityId: input.userId,
    metadata: { kind: input.kind },
  });
  return { id: Number(inserted[0].insertId) };
}

export async function deleteOwnerVerificationDoc(userId: number, id: number) {
  const db = await database();
  const state = await getOwnerVerification(userId);
  if (state.locked) throw new Error("Os arquivos estão travados durante a análise");
  const [doc] = await db
    .select()
    .from(verificationDocuments)
    .where(
      and(
        eq(verificationDocuments.id, id),
        eq(verificationDocuments.userId, userId),
        isNull(verificationDocuments.deletedAt)
      )
    )
    .limit(1);
  if (!doc) throw new Error("Arquivo não encontrado");
  await db
    .update(verificationDocuments)
    .set({ deletedAt: new Date() })
    .where(eq(verificationDocuments.id, id));
  await storageDelete(doc.storageKey).catch(() => undefined);
  await writeAuditLog({
    actorUserId: userId,
    action: "verification.document_deleted",
    entityType: "user",
    entityId: userId,
    metadata: { kind: doc.kind },
  });
  return { success: true as const };
}

export async function submitOwnerVerification(userId: number) {
  const db = await database();
  const state = await getOwnerVerification(userId);
  if (!state.personalComplete)
    throw new Error("Preencha seus dados pessoais antes de enviar para análise");
  if (state.missing.length)
    throw new Error(`Falta enviar: ${state.missing.map(m => m.label).join(", ")}`);
  if (state.status === "pending") return { id: null, status: "pending" as const };
  if (state.status === "approved")
    throw new Error("Sua identidade já está aprovada");
  const created = await requestIdentityVerification(userId);
  if (!created) throw new Error("Não foi possível iniciar a análise");
  await db
    .update(verificationDocuments)
    .set({ verificationId: created.id })
    .where(
      and(
        eq(verificationDocuments.userId, userId),
        isNull(verificationDocuments.deletedAt)
      )
    );
  await writeAuditLog({
    actorUserId: userId,
    action: "verification.submitted",
    entityType: "user",
    entityId: userId,
    metadata: { verificationId: created.id },
  });
  return { id: created.id, status: "pending" as const };
}

/** Documento do titular (para a prévia dele) ou de qualquer conta (admin). */
export async function getVerificationDocFile(id: number) {
  const db = await database();
  const [doc] = await db
    .select()
    .from(verificationDocuments)
    .where(
      and(eq(verificationDocuments.id, id), isNull(verificationDocuments.deletedAt))
    )
    .limit(1);
  return doc ?? null;
}

// ---------------------------------------------------------------------------
// Lado do administrador
// ---------------------------------------------------------------------------

export async function listVerificationQueue(
  status: "pending" | "approved" | "rejected" | "all" = "pending"
) {
  const db = await database();
  const query = db
    .select({
      id: identityVerifications.id,
      userId: identityVerifications.userId,
      status: identityVerifications.status,
      reviewReason: identityVerifications.reviewReason,
      approvedAt: identityVerifications.approvedAt,
      expiresAt: identityVerifications.expiresAt,
      createdAt: identityVerifications.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(identityVerifications)
    .innerJoin(users, eq(users.id, identityVerifications.userId));
  const list = await (status === "all"
    ? query
    : query.where(eq(identityVerifications.status, status))
  )
    .orderBy(
      status === "pending"
        ? asc(identityVerifications.createdAt)
        : desc(identityVerifications.createdAt)
    )
    .limit(200);
  const out = [];
  for (const item of list) {
    const [docs, personal] = await Promise.all([
      activeDocs(db, item.userId),
      getOwnerAccountRow(item.userId),
    ]);
    out.push({
      ...item,
      fullName: personal?.fullName ?? null,
      birthDate: personal?.birthDate ?? null,
      age: personal ? ageFromBirthDate(personal.birthDate) : null,
      documents: docs.length,
      hasVideo: docs.some(d => d.kind === "video"),
    });
  }
  return out;
}

export async function getVerificationDetail(id: number) {
  const db = await database();
  const [row] = await db
    .select()
    .from(identityVerifications)
    .where(eq(identityVerifications.id, id))
    .limit(1);
  if (!row) throw new Error("Solicitação não encontrada");
  const [user] = await db.select().from(users).where(eq(users.id, row.userId)).limit(1);
  const [docs, personal] = await Promise.all([
    activeDocs(db, row.userId),
    getOwnerAccountRow(row.userId),
  ]);
  const age = personal ? ageFromBirthDate(personal.birthDate) : null;
  return {
    id: row.id,
    userId: row.userId,
    status: row.status,
    reviewReason: row.reviewReason,
    createdAt: row.createdAt,
    approvedAt: row.approvedAt,
    expiresAt: row.expiresAt,
    account: { name: user?.name ?? null, email: user?.email ?? null },
    personal: personal
      ? {
          fullName: personal.fullName,
          cpfMasked: maskCpf(personal.cpfLast2),
          birthDate: personal.birthDate,
          age,
          phone: personal.phone ?? "",
          city: personal.city ?? "",
          state: personal.state ?? "",
        }
      : null,
    docs: docs.map(docView),
    checks: verificationChecks.map(item => ({ ...item })),
    suggested: { adult: age !== null && age >= 18 },
    docKinds: verificationDocKinds.map(kind => ({
      kind,
      label: verificationDocLabels[kind],
    })),
  };
}

/** Apaga os arquivos do storage e marca como removidos (depois da decisão). */
export async function purgeVerificationDocs(userId: number, actorId: number) {
  const db = await database();
  const docs = await activeDocs(db, userId);
  for (const doc of docs) {
    await storageDelete(doc.storageKey).catch(() => undefined);
    await db
      .update(verificationDocuments)
      .set({ deletedAt: new Date() })
      .where(eq(verificationDocuments.id, doc.id));
  }
  if (docs.length)
    await writeAuditLog({
      actorUserId: actorId,
      action: "verification.documents_purged",
      entityType: "user",
      entityId: userId,
      metadata: { count: docs.length },
    });
  return { removed: docs.length };
}
