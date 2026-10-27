// Rotas HTTP do painel: envio e abertura dos documentos de verificação e
// exportação de relatórios em CSV. Tudo exige login; os documentos só são
// abertos pelo próprio titular ou por quem tem a função de verificação.
import { randomUUID } from "node:crypto";
import path from "node:path";
import type { Express, Request, Response } from "express";
import {
  isVerificationDocKind,
  verificationLimits,
  type VerificationDocKind,
} from "../shared/admin-crm";
import { hasAnyScope, type AdminScope } from "../shared/admin-access";
import { createContext } from "./_core/context";
import { ENV } from "./_core/env";
import { adminScopesFor } from "./_core/trpc";
import { getUserMfa, writeAuditLog } from "./db";
import {
  createInMemoryRateLimiter,
  rateLimitMessage,
  sensitiveRateLimits,
} from "./rate-limit";
import { serveStoredObject, storageDelete, storagePut } from "./storage";
import { buildReport, reportKinds, reportToCsv, type ReportKind } from "./admin-panel";
import {
  getOwnerVerification,
  getVerificationDocFile,
  saveVerificationDoc,
} from "./verification";

const limiter = createInMemoryRateLimiter({
  ...sensitiveRateLimits.upload,
  maxKeys: 20_000,
});

const imageTypes = ["image/jpeg", "image/png", "image/webp"];
const videoTypes = ["video/mp4", "video/webm", "video/quicktime"];

export function hasVerificationMagicBytes(
  buffer: Buffer,
  contentType: string
) {
  if (contentType === "image/jpeg")
    return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
  if (contentType === "image/png")
    return buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  if (contentType === "image/webp")
    return (
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP"
    );
  if (contentType === "video/webm")
    return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  if (contentType === "video/mp4" || contentType === "video/quicktime")
    return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  return false;
}

const extensionFor = (contentType: string) =>
  ({
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
  })[contentType] ?? ".bin";

/** Administrador ativo, com senha em dia, MFA (se exigida) e a permissão pedida. */
async function adminWith(req: Request, res: Response, needed: AdminScope[]) {
  const ctx = await createContext({ req, res } as any);
  const user = ctx.user;
  if (!user || user.accountStatus !== "active" || user.mustChangePassword) return null;
  const configured = Boolean(
    user.email &&
      user.emailVerifiedAt &&
      ENV.adminEmails.includes(user.email.toLowerCase())
  );
  if (!["admin", "super_admin", "dev"].includes(user.role) && !configured) return null;
  if (ENV.adminMfaRequired) {
    const mfa = await getUserMfa(user.id);
    if (!mfa?.enabledAt) return null;
  }
  if (!hasAnyScope(adminScopesFor(user), needed)) return null;
  return user;
}

export function registerPanelRoutes(app: Express) {
  // Envio pelo titular: documento (frente e verso), selfie e vídeo.
  app.post("/api/upload/verification", async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user || ctx.user.accountStatus !== "active")
        return res.status(401).json({ error: "Não autenticado" });
      if (ctx.user.mustChangePassword)
        return res.status(403).json({ error: "Altere sua senha antes de continuar" });
      const rate = limiter.consume(`user:${ctx.user.id}`);
      if (!rate.allowed) {
        res.setHeader("Retry-After", String(rate.retryAfterSeconds));
        return res.status(429).json({ error: rateLimitMessage(rate.retryAfterSeconds) });
      }
      const { kind, contentType, data } = req.body ?? {};
      if (!isVerificationDocKind(kind) || typeof contentType !== "string" || typeof data !== "string")
        return res.status(400).json({ error: "Dados de envio incompletos" });
      const isVideo = kind === "video";
      if (!(isVideo ? videoTypes : imageTypes).includes(contentType))
        return res.status(415).json({
          error: isVideo
            ? "Envie o vídeo em MP4, MOV ou WebM"
            : "Envie a foto em JPG, PNG ou WebP",
        });
      const state = await getOwnerVerification(ctx.user.id);
      if (state.locked)
        return res.status(409).json({
          error:
            state.status === "approved"
              ? "Sua identidade já foi aprovada"
              : "Seus documentos estão em análise e não podem ser trocados agora",
        });
      const base64 = data.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 === 1)
        return res.status(400).json({ error: "Conteúdo inválido" });
      const buffer = Buffer.from(base64, "base64");
      const maxBytes = isVideo
        ? verificationLimits.videoBytes
        : verificationLimits.imageBytes;
      if (buffer.byteLength === 0 || buffer.byteLength > maxBytes)
        return res.status(413).json({
          error: `O arquivo passa do limite de ${Math.round(maxBytes / 1024 / 1024)} MB`,
        });
      if (!hasVerificationMagicBytes(buffer, contentType))
        return res.status(415).json({
          error: "O arquivo não corresponde ao formato informado",
        });
      const key = `verification/${ctx.user.id}/${kind}-${randomUUID()}${extensionFor(contentType)}`;
      const stored = await storagePut(key, buffer, contentType);
      try {
        const saved = await saveVerificationDoc({
          userId: ctx.user.id,
          kind: kind as VerificationDocKind,
          storageKey: stored.key,
          mimeType: contentType,
          sizeBytes: buffer.byteLength,
        });
        return res.json({ id: saved.id });
      } catch (error) {
        await storageDelete(stored.key).catch(() => undefined);
        const message =
          error instanceof Error ? error.message : "Não foi possível guardar o arquivo";
        return res.status(409).json({ error: message });
      }
    } catch (error) {
      console.error(
        "[Upload] verification failed",
        error instanceof Error ? error.message : "unknown error"
      );
      return res.status(500).json({ error: "Não foi possível guardar o arquivo; tente novamente" });
    }
  });

  // Abertura do arquivo: dono ou verificador. Nunca fica em cache.
  app.get("/api/verification-doc/:id", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "private, no-store");
      const id = Number(req.params.id);
      if (!Number.isSafeInteger(id) || id <= 0)
        return res.status(400).send("Arquivo inválido");
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user || ctx.user.accountStatus !== "active" || ctx.user.mustChangePassword)
        return res.status(403).send("Acesso negado");
      const doc = await getVerificationDocFile(id);
      if (!doc) return res.status(404).send("Arquivo indisponível");
      if (doc.userId !== ctx.user.id) {
        const admin = await adminWith(req, res, ["identity"]);
        if (!admin) return res.status(403).send("Acesso negado");
        await writeAuditLog({
          actorUserId: admin.id,
          action: "verification.document_viewed",
          entityType: "user",
          entityId: doc.userId,
          metadata: { documentId: doc.id, kind: doc.kind },
        });
      }
      await serveStoredObject(res, doc.storageKey);
    } catch {
      if (!res.headersSent) res.status(503).send("Não foi possível abrir o arquivo");
    }
  });

  // Relatórios em CSV (abre direto no Excel).
  app.get("/api/admin/export/:kind.csv", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "private, no-store");
      const kind = req.params.kind as ReportKind;
      if (!(reportKinds as readonly string[]).includes(kind))
        return res.status(404).send("Relatório inexistente");
      const needed: Record<ReportKind, AdminScope[]> = {
        advertisers: ["users:read"],
        listings: ["profiles:read", "moderation"],
        payments: ["finance:read", "plans"],
        verifications: ["identity"],
      };
      const admin = await adminWith(req, res, needed[kind]);
      if (!admin) return res.status(403).send("Acesso negado");
      const finance = hasAnyScope(adminScopesFor(admin), ["finance:read", "plans"]);
      const text = (value: unknown) => (typeof value === "string" ? value.slice(0, 10) : null);
      const days = Number(req.query.days);
      const report = await buildReport(
        kind,
        {
          from: text(req.query.from),
          to: text(req.query.to),
          days: Number.isInteger(days) && days > 0 && days <= 366 ? days : undefined,
        },
        { canSeeFinance: finance }
      );
      await writeAuditLog({
        actorUserId: admin.id,
        action: "report.exported",
        entityType: "report",
        entityId: null,
        metadata: { kind, from: report.from, to: report.to, rows: report.rows.length },
      });
      const filename = `ero-${path.basename(kind)}-${report.from}_${report.to}.csv`;
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(reportToCsv(report));
    } catch (error) {
      console.error(
        "[Export] failed",
        error instanceof Error ? error.message : "unknown error"
      );
      if (!res.headersSent) res.status(500).send("Não foi possível gerar o relatório");
    }
  });
}
