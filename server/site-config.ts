import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { siteSettings } from "../drizzle/schema";
import { defaultSiteSettings, siteSettingsSchema } from "../shared/portfolio";
export async function readSiteSettings() {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const [row] = await db
    .select()
    .from(siteSettings)
    .where(eq(siteSettings.id, 1));
  if (!row) return defaultSiteSettings;
  const settings = siteSettingsSchema.parse(JSON.parse(row.value));
  if (settings.title === "Talentos, histórias e novos projetos.") {
    return {
      ...settings,
      title: defaultSiteSettings.title,
      subtitle: defaultSiteSettings.subtitle,
      buttonText: defaultSiteSettings.buttonText,
      about: defaultSiteSettings.about,
    };
  }
  return settings;
}
