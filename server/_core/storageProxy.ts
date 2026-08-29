import type { Express } from "express";
import { createContext } from "./context";
import { ENV, runtimeConfigStatus } from "./env";
import { hashToken } from "../auth-crypto";
import { getApprovedAgeVerification, getMediaByStorageKey, hasPremiumAccess } from "../db";

const AGE_COOKIE = "so_age_session";

function readCookie(header: string | undefined, name: string) {
  return header?.split(";").map(value => value.trim()).find(value => value.startsWith(`${name}=`))?.slice(name.length + 1);
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (!ENV.publicAccessEnabled || !runtimeConfigStatus().ageVerification) {
      res.status(403).send("Age verification is not available");
      return;
    }

    const media = await getMediaByStorageKey(key);
    if (!media || media.status !== "approved") {
      res.status(404).send("Media not found");
      return;
    }

    const ageToken = readCookie(req.headers.cookie, AGE_COOKIE);
    if (!ageToken || !(await getApprovedAgeVerification(hashToken(ageToken)))) {
      res.status(403).send("Age verification required");
      return;
    }

    if (media.isPremium) {
      const ctx = await createContext({ req, res } as any);
      if (!ctx.user || !(await hasPremiumAccess(ctx.user.id, media.id))) {
        res.status(403).send("Premium entitlement required");
        return;
      }
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL("v1/storage/presign/get", ENV.forgeApiUrl.replace(/\/+$/, "") + "/");
      forgeUrl.searchParams.set("path", key);
      const forgeResp = await fetch(forgeUrl, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` } });
      if (!forgeResp.ok) {
        console.error(`[StorageProxy] forge error: ${forgeResp.status}`);
        res.status(502).send("Storage backend error");
        return;
      }
      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }
      res.set("Cache-Control", "private, no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
