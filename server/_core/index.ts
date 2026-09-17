import { getMediaById, getAdminProfile, getUserById } from "../db";
import { canManage } from "../management";
import { storageGetSignedUrl } from "../storage";
import { readSiteSettings } from "../site-config";
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic } from "./serve-static";
import { storagePut } from "../storage";
import { getIdentityVerification, isDatabaseReady, listPublishedProfiles } from "../db";
import { assertProductionConfig, ENV, runtimeConfigStatus } from "./env";
import { bootstrapLocalAccounts } from "../auth";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const probe = net.createServer();
    probe.once("error", () => resolve(false));
    probe.listen(port, () => probe.close(() => resolve(true)));
  });
}

function hasAllowedOrigin(req: express.Request) {
  const origin = req.headers.origin;
  if (!origin || !ENV.allowedOrigin) return true;
  return origin === ENV.allowedOrigin;
}

function hasMagicBytes(buffer: Buffer, kind: "photo" | "video", contentType: string) {
  if (kind === "photo") {
    if (contentType === "image/jpeg") return buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]));
    if (contentType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (contentType === "image/webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
    if (contentType === "image/avif") return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }
  if (kind === "video") {
    if (contentType === "video/webm") return buffer.subarray(0, 4).toString("ascii") === "\x1a\x45\xdf\xa3";
    if (contentType === "video/mp4" || contentType === "video/quicktime") return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  }
  return false;
}

async function startServer() {
  assertProductionConfig();
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  if (ENV.trustProxy) app.set("trust proxy", 1);
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    if (ENV.isProduction) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method) && !hasAllowedOrigin(req)) {
      res.status(403).json({ error: "Origem não permitida" });
      return;
    }
    next();
  });
  const healthHandler = async (_req: express.Request, res: express.Response) => {
    const database = await isDatabaseReady();
    const healthy = !ENV.isProduction || (database && Boolean(ENV.cookieSecret));
    res.status(healthy ? 200 : 503).json({ ok: healthy, service: "so-models", release: ENV.release, database });
  };
  app.get("/healthz", healthHandler);
  app.get("/health", healthHandler);
  app.get("/api/release", (_req, res) => res.json({ service: "so-models", release: ENV.release }));
  app.get("/robots.txt", (_req, res) => {
    const body = !ENV.robotsNoIndex && ENV.publicAccessEnabled && runtimeConfigStatus().ageVerification ? `User-agent: *\\nAllow: /\\nDisallow: /admin\\nDisallow: /titular\\nDisallow: /api/\\nSitemap: ${ENV.canonicalOrigin || "https://somodels.buscarr.com.br"}/sitemap.xml\\n` : "User-agent: *\\nDisallow: /\\n";
    res.type("text/plain").send(body);
  });
  app.get("/sitemap.xml", async (_req, res) => {
    if (ENV.robotsNoIndex || !ENV.publicAccessEnabled || !runtimeConfigStatus().ageVerification || !(await readSiteSettings()).showGallery) {
      res.type("application/xml").send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>');
      return;
    }
    const published = await listPublishedProfiles({ publicAllowed: true, limit: 5000 });
    const origin = ENV.canonicalOrigin || "https://somodels.buscarr.com.br";
    const urls = published.map(profile => `<url><loc>${origin}/perfil/${encodeURIComponent(profile.slug)}</loc><lastmod>${new Date(profile.updatedAt).toISOString()}</lastmod></url>`).join("");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  });
  app.use(express.json({ limit: "140mb", strict: true }));
  app.use(express.urlencoded({ limit: "140mb", extended: false }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.get("/api/media-preview/:id", async (req, res) => {
    try {
      res.setHeader("Cache-Control", "private, no-store");
      const ctx = await createContext({req,res} as any);
      if (!ctx.user || ctx.user.accountStatus !== "active" || ctx.user.mustChangePassword) return res.status(403).send("Acesso negado");
      const id = Number(req.params.id); if (!Number.isSafeInteger(id) || id <= 0) return res.status(400).send("Arquivo inválido");
      const media = await getMediaById(id);
      if (!media) return res.status(404).send("Arquivo indisponível");
      const profile = await getAdminProfile(media.profileId);
      if (!profile || (profile.profile.ownerId !== ctx.user.id && !["admin","super_admin","dev"].includes(ctx.user.role))) return res.status(403).send("Acesso negado");
      res.redirect(307, await storageGetSignedUrl(media.storageKey));
    } catch { res.status(503).send("Não foi possível visualizar o arquivo"); }
  });
  app.post("/api/upload/media", async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user || ctx.user.accountStatus !== "active") return res.status(401).json({ error: "Não autenticado" });
      if (ctx.user.mustChangePassword) return res.status(403).json({ error: "Altere sua senha antes de continuar" });
      const { profileId, kind, filename, contentType, data } = req.body ?? {};
      if (!profileId || !kind || !filename || !contentType || typeof data !== "string") return res.status(400).json({ error: "Dados de upload incompletos" });
      if (!["photo", "video"].includes(kind)) return res.status(400).json({ error: "Tipo de mídia inválido" });
      const numericProfileId = Number(profileId);
      if (!Number.isSafeInteger(numericProfileId) || numericProfileId <= 0)
        return res.status(400).json({ error: "Perfil inválido" });
      const targetProfile = await getAdminProfile(numericProfileId);
      if (!targetProfile) return res.status(404).json({ error: "Perfil não encontrado" });
      const owner = await getUserById(targetProfile.profile.ownerId);
      if (!owner || owner.accountStatus !== "active")
        return res.status(403).json({ error: "Titular indisponível" });
      const ownProfile = owner.id === ctx.user.id;
      if (!ownProfile && !canManage(ctx.user, owner))
        return res.status(403).json({ error: "Você não pode alterar este perfil" });
      if (ownProfile && ENV.requireIdentityVerification) {
        const identity = await getIdentityVerification(owner.id);
        if (identity?.status !== "approved") return res.status(403).json({ error: "Verificação de identidade obrigatória" });
      }
      const allowedPhoto = ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(contentType);
      const allowedVideo = ["video/mp4", "video/webm", "video/quicktime"].includes(contentType);
      if ((kind === "photo" && !allowedPhoto) || (kind === "video" && !allowedVideo)) return res.status(415).json({ error: "Formato de mídia não permitido" });
      const base64 = data.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64) || base64.length % 4 === 1) return res.status(400).json({ error: "Conteúdo base64 inválido" });
      const buffer = Buffer.from(base64, "base64");
      const maxBytes = kind === "video" ? 100 * 1024 * 1024 : 12 * 1024 * 1024;
      if (buffer.byteLength === 0 || buffer.byteLength > maxBytes) return res.status(413).json({ error: "Arquivo excede o limite permitido" });
      if (!hasMagicBytes(buffer, kind, contentType)) return res.status(415).json({ error: "Assinatura do arquivo não corresponde ao tipo declarado" });
      const extension = path.extname(String(filename)).toLowerCase().replace(/[^a-z0-9.]/g, "") || (kind === "photo" ? ".jpg" : ".mp4");
      const safeKey = `profiles/${owner.id}/${numericProfileId}/${kind}/${randomUUID()}${extension}`;
      const uploaded = await storagePut(safeKey, buffer, contentType);
      return res.json(uploaded);
    } catch (error) {
      console.error("[Upload] failed", error instanceof Error ? error.message : "unknown error");
      return res.status(500).json({ error: "Não foi possível armazenar a mídia" });
    }
  });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (ENV.nodeEnv === "development") {
    const { setupVite } = await import("./vite-dev");
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }
  const preferredPort = ENV.port;
  const port = (await isPortAvailable(preferredPort)) ? preferredPort : preferredPort + 1;
  server.listen(port, () => console.log(`[Startup] so-models listening on ${port} release=${ENV.release}`));
  if (ENV.databaseUrl) {
    bootstrapLocalAccounts().catch(error => console.error("[Bootstrap] account setup failed:", error instanceof Error ? error.message : "unknown error"));
  }
}

startServer().catch(error => {
  console.error("[Startup] failed:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
