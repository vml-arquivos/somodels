// Armazenamento de mídia com três opções, escolhidas por variável de ambiente:
//   local  — arquivos num volume do servidor (padrão; precisa de volume persistente)
//   s3     — S3, Cloudflare R2, DigitalOcean Spaces, MinIO etc.
//   forge  — serviço interno da plataforma original (legado)
// As rotas públicas continuam usando /manus-storage/<chave>; o controle de acesso
// (maioridade, aprovação, perfil público) fica em storageProxy.ts.

import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { Response } from "express";
import { ENV, resolveStorageDriver } from "./_core/env";

function normalizeKey(relKey: string): string {
  return relKey.replace(/^\/+/, "");
}

function appendHashSuffix(relKey: string): string {
  const hash = randomUUID().replace(/-/g, "").slice(0, 8);
  const lastDot = relKey.lastIndexOf(".");
  if (lastDot === -1) return `${relKey}_${hash}`;
  return `${relKey.slice(0, lastDot)}_${hash}${relKey.slice(lastDot)}`;
}

// ---------- local ----------

export function resolveLocalPath(key: string): string {
  const base = path.resolve(ENV.storageLocalDir);
  const target = path.resolve(base, normalizeKey(key));
  if (target !== base && !target.startsWith(base + path.sep)) {
    throw new Error("Chave de armazenamento inválida");
  }
  return target;
}

async function localPut(key: string, data: Buffer | Uint8Array | string) {
  const target = resolveLocalPath(key);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, typeof data === "string" ? Buffer.from(data) : data);
}

// O volume só é persistente se for um ponto de montagem. Sem isso, os arquivos
// somem a cada novo deploy. Usado pela aba Prontidão do admin.
export async function isLocalStoragePersistent(): Promise<boolean> {
  try {
    const target = path.resolve(ENV.storageLocalDir);
    const info = await fs.readFile("/proc/self/mountinfo", "utf8");
    return info
      .split("\n")
      .some(line => line.split(" ")[4] === target);
  } catch {
    return false;
  }
}

// ---------- s3 ----------

let s3Client: any = null;

async function getS3() {
  const { S3Client } = await import("@aws-sdk/client-s3");
  if (!s3Client) {
    s3Client = new S3Client({
      region: ENV.s3Region || "us-east-1",
      endpoint: ENV.s3Endpoint || undefined,
      forcePathStyle: ENV.s3ForcePathStyle || Boolean(ENV.s3Endpoint),
      credentials: {
        accessKeyId: ENV.s3AccessKeyId,
        secretAccessKey: ENV.s3SecretAccessKey,
      },
    });
  }
  return s3Client;
}

// ---------- forge (legado) ----------

function getForgeConfig() {
  const forgeUrl = ENV.forgeApiUrl;
  const forgeKey = ENV.forgeApiKey;
  if (!forgeUrl || !forgeKey) {
    throw new Error(
      "Storage config missing: set BUILT_IN_FORGE_API_URL and BUILT_IN_FORGE_API_KEY"
    );
  }
  return { forgeUrl: forgeUrl.replace(/\/+$/, ""), forgeKey };
}

async function forgePut(key: string, data: Buffer | Uint8Array | string, contentType: string) {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const presignUrl = new URL("v1/storage/presign/put", forgeUrl + "/");
  presignUrl.searchParams.set("path", key);
  const presignResp = await fetch(presignUrl, {
    headers: { Authorization: `Bearer ${forgeKey}` },
  });
  if (!presignResp.ok) {
    const msg = await presignResp.text().catch(() => presignResp.statusText);
    throw new Error(`Storage presign failed (${presignResp.status}): ${msg}`);
  }
  const { url: s3Url } = (await presignResp.json()) as { url: string };
  if (!s3Url) throw new Error("Forge returned empty presign URL");
  const blob =
    typeof data === "string"
      ? new Blob([data], { type: contentType })
      : new Blob([data as any], { type: contentType });
  const uploadResp = await fetch(s3Url, {
    method: "PUT",
    headers: { "Content-Type": contentType },
    body: blob,
  });
  if (!uploadResp.ok) throw new Error(`Storage upload to S3 failed (${uploadResp.status})`);
}

async function forgeSignedUrl(key: string): Promise<string> {
  const { forgeUrl, forgeKey } = getForgeConfig();
  const getUrl = new URL("v1/storage/presign/get", forgeUrl + "/");
  getUrl.searchParams.set("path", key);
  const resp = await fetch(getUrl, { headers: { Authorization: `Bearer ${forgeKey}` } });
  if (!resp.ok) {
    const msg = await resp.text().catch(() => resp.statusText);
    throw new Error(`Storage signed URL failed (${resp.status}): ${msg}`);
  }
  const { url } = (await resp.json()) as { url: string };
  return url;
}

// ---------- API pública do módulo ----------

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = appendHashSuffix(normalizeKey(relKey));
  const driver = resolveStorageDriver();
  if (driver === "local") {
    await localPut(key, data);
  } else if (driver === "s3") {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getS3();
    await client.send(
      new PutObjectCommand({
        Bucket: ENV.s3Bucket,
        Key: key,
        Body: typeof data === "string" ? Buffer.from(data) : data,
        ContentType: contentType,
      })
    );
  } else {
    await forgePut(key, data, contentType);
  }
  return { key, url: `/manus-storage/${key}` };
}

export async function storageDelete(relKey: string): Promise<void> {
  const key = normalizeKey(relKey);
  const driver = resolveStorageDriver();
  if (driver === "local") {
    await fs.rm(resolveLocalPath(key), { force: true });
    return;
  }
  if (driver === "s3") {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await getS3();
    await client.send(new DeleteObjectCommand({ Bucket: ENV.s3Bucket, Key: key }));
    return;
  }
  throw new Error("Remoção automática não está disponível para o storage legado");
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  const key = normalizeKey(relKey);
  return { key, url: `/manus-storage/${key}` };
}

// Link temporário (s3/forge). No modo local não existe link externo: use serveStoredObject.
export async function storageGetSignedUrl(relKey: string): Promise<string> {
  const key = normalizeKey(relKey);
  const driver = resolveStorageDriver();
  if (driver === "s3") {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
    const client = await getS3();
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: ENV.s3Bucket, Key: key }),
      { expiresIn: 300 }
    );
  }
  if (driver === "forge") return forgeSignedUrl(key);
  throw new Error("O armazenamento local não gera links temporários");
}

// Entrega o arquivo ao navegador: redireciona (s3/forge) ou envia do disco, com
// suporte a Range para vídeos (local).
export async function serveStoredObject(res: Response, relKey: string): Promise<void> {
  const key = normalizeKey(relKey);
  if (resolveStorageDriver() !== "local") {
    res.set("Cache-Control", "private, no-store");
    res.redirect(307, await storageGetSignedUrl(key));
    return;
  }
  let target: string;
  try {
    target = resolveLocalPath(key);
    await fs.access(target);
  } catch {
    res.status(404).send("Arquivo indisponível");
    return;
  }
  res.set("Cache-Control", "private, no-store");
  res.set("X-Content-Type-Options", "nosniff");
  res.sendFile(target, { dotfiles: "deny" }, error => {
    if (error && !res.headersSent) res.status(500).send("Não foi possível ler o arquivo");
  });
}
