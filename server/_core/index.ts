import { getMediaById } from "../db";
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
import { getAdminProfile, getIdentityVerification, getUserById, isDatabaseReady, listPublishedProfiles } from "../db";
import { assertProductionConfig, ENV } from "./env";
import { bootstrapLocalAccounts } from "../auth";
import { isPublicIndexingEnabled } from "../public-indexing";
import { getServerSeo, renderSeoHead } from "../seo";
import { createInMemoryRateLimiter, rateLimitMessage, sensitiveRateLimits } from "../rate-limit";

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

function escapeXml(value: string) {
  return value.replace(/[<>&'\"]/g, character => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "'": "&apos;",
    "\"": "&quot;",
  })[character] ?? character);
}

function sitemapUrl(loc: string, lastmod?: Date) {
  const lastmodTag = lastmod ? `<lastmod>${escapeXml(lastmod.toISOString())}</lastmod>` : "";
  return `<url><loc>${escapeXml(loc)}</loc>${lastmodTag}</url>`;
}

const uploadRateLimiter = createInMemoryRateLimiter({
  ...sensitiveRateLimits.upload,
  maxKeys: 20_000,
});

async function getSitemapIndexingState() {
  let showGallery = false;
  try {
    showGallery = (await readSiteSettings()).showGallery;
  } catch {
    showGallery = false;
  }
  return isPublicIndexingEnabled({
    robotsNoIndex: ENV.robotsNoIndex,
    publicAccessEnabled: ENV.publicAccessEnabled,
    publicLaunchEnabled: ENV.publicLaunchEnabled,
    requireAgeVerification: ENV.requireAgeVerification,
    showGallery,
  });
}

function emptySitemap() {
  return '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>';
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
  app.get("/robots.txt", async (_req, res) => {
    const indexingEnabled = await getSitemapIndexingState();
    const body = indexingEnabled
      ? `User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /titular\nDisallow: /login\nDisallow: /redefinir-senha\nDisallow: /alterar-senha\nDisallow: /cadastro\nDisallow: /cadastro-teste\nDisallow: /api/\nDisallow: /manus-storage/\nSitemap: ${ENV.canonicalOrigin || "https://eromodels.com.br"}/sitemap.xml\n`
      : "User-agent: *\nDisallow: /\n";
    res.type("text/plain").send(body);
  });
  app.get("/sitemap.xml", async (_req, res) => {
    if (!(await getSitemapIndexingState())) {
      res.type("application/xml").send(emptySitemap());
      return;
    }
    const origin = ENV.canonicalOrigin || "https://eromodels.com.br";
    res
      .type("application/xml")
      .send(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><sitemap><loc>${escapeXml(`${origin}/sitemap-pages.xml`)}</loc></sitemap><sitemap><loc>${escapeXml(`${origin}/sitemap-profiles.xml`)}</loc></sitemap></sitemapindex>`);
  });
  app.get("/sitemap-pages.xml", async (_req, res) => {
    if (!(await getSitemapIndexingState())) {
      res.type("application/xml").send(emptySitemap());
      return;
    }
    const published = await listPublishedProfiles({ publicAllowed: true, limit: 60 });
    const cities = Array.from(new Set(published.map(profile => profile.city).filter(Boolean)));
    const categories = Array.from(new Set(published.flatMap(profile => profile.categories).filter(Boolean)));
    const origin = ENV.canonicalOrigin || "https://eromodels.com.br";
    const pages = ["/", "/termos", "/privacidade", "/seguranca", "/denuncia", "/ajuda", "/contato"];
    const urls = [
      ...pages,
      ...cities.map(city => `/cidade/${encodeURIComponent(city)}`),
      ...categories.map(category => `/categoria/${encodeURIComponent(category)}`),
    ]
      .map(pathname => sitemapUrl(`${origin}${pathname}`))
      .join("");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  });
  app.get("/sitemap-profiles.xml", async (_req, res) => {
    if (!(await getSitemapIndexingState())) {
      res.type("application/xml").send(emptySitemap());
      return;
    }
    const published = await listPublishedProfiles({ publicAllowed: true, limit: 60 });
    const origin = ENV.canonicalOrigin || "https://eromodels.com.br";
    const urls = published
      .map(profile => sitemapUrl(`${origin}/perfil/${encodeURIComponent(profile.slug)}`, new Date(profile.updatedAt)))
      .join("");
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
      const rate = uploadRateLimiter.consume(`user:${ctx.user.id}`);
      if (!rate.allowed) {
        res.setHeader("Retry-After", String(rate.retryAfterSeconds));
        return res.status(429).json({ error: rateLimitMessage(rate.retryAfterSeconds) });
      }
      const { profileId, kind, filename, contentType, data } = req.body ?? {};
      if (!profileId || !kind || !filename || !contentType || typeof data !== "string") return res.status(400).json({ error: "Dados de upload incompletos" });
      if (!["photo", "video"].includes(kind)) return res.status(400).json({ error: "Tipo de mídia inválido" });
      const managedProfile = await getAdminProfile(Number(profileId));
      const isAdmin = ["admin", "super_admin", "dev"].includes(ctx.user.role);
      if (!managedProfile) return res.status(404).json({ error: "Perfil não encontrado" });
      const ownerId = managedProfile.profile.ownerId;
      const owner = await getUserById(ownerId);
      if (!owner || owner.accountStatus !== "active") return res.status(403).json({ error: "O titular precisa estar ativo" });
      if (managedProfile.profile.ownerId !== ctx.user.id && !isAdmin)
        return res.status(403).json({ error: "Perfil não pertence à conta autenticada" });
      if (ENV.requireIdentityVerification && !isAdmin) {
        const identity = await getIdentityVerification(ownerId);
        if (identity?.status !== "approved" || (identity.expiresAt && identity.expiresAt <= new Date()))
          return res.status(403).json({ error: "Verificação de identidade obrigatória" });
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
      const safeKey = `profiles/${ownerId}/${profileId}/${kind}/${randomUUID()}${extension}`;
      const uploaded = await storagePut(safeKey, buffer, contentType);
      return res.json(uploaded);
    } catch (error) {
      console.error("[Upload] failed", error instanceof Error ? error.message : "unknown error");
      return res.status(500).json({ error: "Não foi possível armazenar a mídia" });
    }
  });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  if (ENV.nodeEnv === "development") {
    const { setupVite } = await import("./vite");
    await setupVite(app, server);
  } else {
    app.use(async (req, res, next) => {
      if (req.method !== "GET" || req.path.startsWith("/api/") || req.path.startsWith("/manus-storage/")) {
        next();
        return;
      }
      try {
        res.locals.seoHead = renderSeoHead(await getServerSeo(req.originalUrl));
      } catch {
        res.locals.seoHead = renderSeoHead({
          title: ENV.siteName,
          description: "Ero Models",
          canonical: ENV.canonicalOrigin || "https://eromodels.com.br",
          noindex: true,
        });
      }
      next();
    });
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
