import { eq } from "drizzle-orm";
import { siteSettings } from "../drizzle/schema";
import {
  emptySeoOverrides,
  normalizeSeoOverrides,
  type SeoOverrides,
} from "../shared/admin-seo";
import { getDb } from "./db";

const SEO_ROW_ID = 2;
const CACHE_MS = 60_000;
let cache: { at: number; value: SeoOverrides } | null = null;

export function resetSeoOverridesCache() {
  cache = null;
}

/** Nunca derruba a página: se o banco falhar, usa os textos padrão. */
export async function readSeoOverrides(): Promise<SeoOverrides> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.value;
  try {
    const db = await getDb();
    if (!db) return emptySeoOverrides;
    const [row] = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.id, SEO_ROW_ID))
      .limit(1);
    const value = row ? normalizeSeoOverrides(JSON.parse(row.value)) : emptySeoOverrides;
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return emptySeoOverrides;
  }
}

export async function saveSeoOverrides(input: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const value = normalizeSeoOverrides(input);
  await db
    .insert(siteSettings)
    .values({ id: SEO_ROW_ID, value: JSON.stringify(value) })
    .onDuplicateKeyUpdate({ set: { value: JSON.stringify(value) } });
  cache = { at: Date.now(), value };
  return value;
}
