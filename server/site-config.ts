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
  const persisted = JSON.parse(row.value);
  const settings = siteSettingsSchema.parse({
    ...defaultSiteSettings,
    ...(persisted && typeof persisted === "object" ? persisted : {}),
  });
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
    };
  }
  return settings;
}
