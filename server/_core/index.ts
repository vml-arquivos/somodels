import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { storagePut } from "../storage";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  registerStorageProxy(app);
  registerOAuthRoutes(app);
  app.post("/api/upload/media", async (req, res) => {
    try {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user) return res.status(401).json({ error: "Não autenticado" });
      const { profileId, kind, filename, contentType, data } = req.body ?? {};
      if (!profileId || !kind || !filename || !contentType || typeof data !== "string") return res.status(400).json({ error: "Dados de upload incompletos" });
      if (!["photo", "video"].includes(kind)) return res.status(400).json({ error: "Tipo de mídia inválido" });
      const base64 = data.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      const maxBytes = kind === "video" ? 100 * 1024 * 1024 : 12 * 1024 * 1024;
      if (buffer.byteLength > maxBytes) return res.status(413).json({ error: "Arquivo excede o limite permitido" });
      const safeName = String(filename).replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
      const uploaded = await storagePut(`profiles/${ctx.user.id}/${profileId}/${kind}/${safeName}`, buffer, contentType);
      return res.json(uploaded);
    } catch (error) {
      console.error("[Upload] failed", error);
      return res.status(500).json({ error: "Não foi possível armazenar a mídia" });
    }
  });
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
