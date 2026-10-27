// Reduz as fotos que já estavam guardadas (JPG/PNG grandes) para WebP leve.
// Roda em pequenos lotes, pelo painel. Cada foto é trocada só depois de a nova
// versão ser gravada e as referências serem atualizadas; se algo falhar, a
// original continua como estava.
import { sql } from "drizzle-orm";
import { getDb, writeAuditLog } from "./db";
import { optimizePhoto } from "./image-optimize";
import { storageDelete, storagePut, storageRead } from "./storage";

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

export async function getMediaOptimizeStats() {
  const db = await database();
  const [a] = await rows(
    db,
    sql`SELECT COUNT(*) AS total FROM profile_media WHERE kind = 'photo' AND mimeType <> 'image/webp'`
  );
  const [b] = await rows(
    db,
    sql`SELECT COUNT(*) AS total FROM owner_media WHERE kind = 'photo' AND deletedAt IS NULL AND mimeType <> 'image/webp'
      AND storageKey NOT IN (SELECT storageKey FROM profile_media)`
  );
  const [c] = await rows(
    db,
    sql`SELECT COUNT(*) AS total FROM profile_media WHERE kind = 'photo' AND mimeType = 'image/webp'`
  );
  return {
    pending: num(a?.total) + num(b?.total),
    done: num(c?.total),
  };
}

type Candidate = { storageKey: string; url: string; mimeType: string };

export async function runMediaOptimize(adminId: number, limit = 10) {
  const db = await database();
  const size = Math.min(Math.max(limit, 1), 25);
  const fromProfiles = await rows<Candidate>(
    db,
    sql`SELECT DISTINCT storageKey, url, mimeType FROM profile_media
      WHERE kind = 'photo' AND mimeType <> 'image/webp' ORDER BY storageKey LIMIT ${size}`
  );
  const room = size - fromProfiles.length;
  const fromLibrary =
    room > 0
      ? await rows<Candidate>(
          db,
          sql`SELECT DISTINCT storageKey, url, mimeType FROM owner_media
            WHERE kind = 'photo' AND deletedAt IS NULL AND mimeType <> 'image/webp'
            AND storageKey NOT IN (SELECT storageKey FROM profile_media)
            ORDER BY storageKey LIMIT ${room}`
        )
      : [];
  let converted = 0;
  let failed = 0;
  let savedBytes = 0;
  for (const item of [...fromProfiles, ...fromLibrary]) {
    try {
      const original = await storageRead(item.storageKey);
      const result = await optimizePhoto(original, item.mimeType);
      if (!result.optimized) {
        failed += 1;
        continue;
      }
      const base = item.storageKey.replace(/\.[a-z0-9]+$/i, "");
      const stored = await storagePut(`${base}.webp`, result.buffer, "image/webp");
      try {
        await db.execute(
          sql`UPDATE profile_media SET storageKey = ${stored.key}, url = ${stored.url}, mimeType = 'image/webp'
            WHERE storageKey = ${item.storageKey}`
        );
        await db.execute(
          sql`UPDATE owner_media SET storageKey = ${stored.key}, url = ${stored.url}, mimeType = 'image/webp',
            sizeBytes = ${result.buffer.byteLength}
            WHERE storageKey = ${item.storageKey}`
        );
        await db.execute(
          sql`UPDATE profiles SET avatarUrl = ${stored.url} WHERE avatarUrl = ${item.url}`
        );
      } catch (error) {
        await storageDelete(stored.key).catch(() => undefined);
        throw error;
      }
      await storageDelete(item.storageKey).catch(() => undefined);
      converted += 1;
      savedBytes += Math.max(0, original.byteLength - result.buffer.byteLength);
    } catch {
      failed += 1;
    }
  }
  if (converted > 0)
    await writeAuditLog({
      actorUserId: adminId,
      action: "media.optimized",
      entityType: "media",
      metadata: { converted, failed, savedBytes },
    });
  return { converted, failed, savedBytes, ...(await getMediaOptimizeStats()) };
}
