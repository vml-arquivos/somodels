import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { siteSettings } from "../drizzle/schema";
import {
  defaultSiteSettings,
  normalizeSiteSettings,
} from "../shared/portfolio";
export async function readSiteSettings() {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, 1));
  if (!row) return defaultSiteSettings;
  const persisted = JSON.parse(row.value);
  return normalizeSiteSettings(persisted);
}
