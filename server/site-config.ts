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
  const settings = normalizeSiteSettings(persisted);
  if (
    [
      "Talentos, histórias e novos projetos.",
      "Encontre talentos. Apresente seu trabalho. Abra novas oportunidades.",
    ].includes(settings.title)
  ) {
    return {
      ...settings,
      title: defaultSiteSettings.title,
      subtitle: defaultSiteSettings.subtitle,
      buttonText: defaultSiteSettings.buttonText,
      eyebrow: defaultSiteSettings.eyebrow,
      searchPlaceholder: defaultSiteSettings.searchPlaceholder,
      emptyTitle: defaultSiteSettings.emptyTitle,
      emptyText: defaultSiteSettings.emptyText,
      about: defaultSiteSettings.about,
      footer: defaultSiteSettings.footer,
      home:
        persisted &&
        typeof persisted === "object" &&
        persisted.home &&
        typeof persisted.home === "object"
          ? settings.home
          : defaultSiteSettings.home,
    };
  }
  return settings;
}
