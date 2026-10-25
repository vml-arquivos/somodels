import type { SiteSettings } from "@shared/portfolio";

type HomeCopy = SiteSettings["home"];

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
};

function Field({ label, value, onChange, rows = 2 }: FieldProps) {
  return (
    <label>
      {label}
      <textarea
        rows={rows}
        value={value}
        onChange={event => onChange(event.target.value)}
      />
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details className="studio-settings-section" open>
      <summary>{title}</summary>
      <div className="studio-settings-fields">{children}</div>
    </details>
  );
}

export default function HomeCopyEditor({
  value,
  onChange,
}: {
  value: HomeCopy;
  onChange: (value: HomeCopy) => void;
}) {
  const update = (section: keyof HomeCopy, key: string, next: string) => {
    const current = value[section] as Record<string, unknown>;
    onChange({
      ...value,
      [section]: { ...current, [key]: next },
    } as HomeCopy);
  };

  const updateList = (
    section: keyof HomeCopy,
    key: string,
    index: number,
    next: string,
    itemKey?: string
  ) => {
    const current = value[section] as Record<string, unknown>;
    const items = current[key] as unknown[];
    const nextItems = items.map((item, itemIndex) =>
      itemIndex !== index
        ? item
        : itemKey
          ? { ...(item as Record<string, unknown>), [itemKey]: next }
          : next
    );
    onChange({
      ...value,
      [section]: { ...current, [key]: nextItems },
    } as HomeCopy);
  };

  return (
    <div className="studio-settings-editor">
      <p className="studio-muted">
        Edite somente texto. Os links, gates de publicação, filtros e regras de
        segurança continuam protegidos pelo sistema.
      </p>

      <Section title="Navegação e tema">
        <Field
          label="Visualizar todos"
          value={value.nav.explore}
          onChange={next => update("nav", "explore", next)}
        />
        <Field
          label="Buscar"
          value={value.nav.search}
          onChange={next => update("nav", "search", next)}
        />
        <Field
          label="Categorias"
          value={value.nav.categories}
          onChange={next => update("nav", "categories", next)}
        />
        <Field
          label="Entrar"
          value={value.nav.login}
          onChange={next => update("nav", "login", next)}
        />
        <Field
          label="Minha conta"
          value={value.nav.account}
          onChange={next => update("nav", "account", next)}
        />
        <Field
          label="Área do titular"
          value={value.nav.owner}
          onChange={next => update("nav", "owner", next)}
        />
        <Field
          label="Criar perfil"
          value={value.nav.createProfile}
          onChange={next => update("nav", "createProfile", next)}
        />
        <Field
          label="Instalar app"
          value={value.nav.install}
          onChange={next => update("nav", "install", next)}
        />
        <Field
          label="Tema claro"
          value={value.nav.themeLight}
          onChange={next => update("nav", "themeLight", next)}
        />
        <Field
          label="Tema escuro"
          value={value.nav.themeDark}
          onChange={next => update("nav", "themeDark", next)}
        />
      </Section>

      <Section title="Hero e busca principal">
        <Field
          label="Eyebrow"
          value={value.hero.eyebrow}
          onChange={next => update("hero", "eyebrow", next)}
        />
        <Field
          label="Headline"
          value={value.hero.title}
          onChange={next => update("hero", "title", next)}
          rows={3}
        />
        <Field
          label="Subtítulo"
          value={value.hero.subtitle}
          onChange={next => update("hero", "subtitle", next)}
          rows={4}
        />
        <Field
          label="Label da busca"
          value={value.hero.searchLabel}
          onChange={next => update("hero", "searchLabel", next)}
        />
        <Field
          label="Placeholder da busca"
          value={value.hero.searchPlaceholder}
          onChange={next => update("hero", "searchPlaceholder", next)}
        />
        <Field
          label="Label da localização"
          value={value.hero.locationLabel}
          onChange={next => update("hero", "locationLabel", next)}
        />
        <Field
          label="Placeholder da localização"
          value={value.hero.locationPlaceholder}
          onChange={next => update("hero", "locationPlaceholder", next)}
        />
        <Field
          label="Botão principal"
          value={value.hero.buttonText}
          onChange={next => update("hero", "buttonText", next)}
        />
        {value.hero.notes.map((note, index) => (
          <Field
            key={`hero-note-${index}`}
            label={`Nota curta ${index + 1}`}
            value={note}
            onChange={next => updateList("hero", "notes", index, next)}
          />
        ))}
        <Field
          label="Título sobre a imagem"
          value={value.hero.visualTitle}
          onChange={next => update("hero", "visualTitle", next)}
        />
        <Field
          label="Legenda sobre a imagem"
          value={value.hero.visualSubtitle}
          onChange={next => update("hero", "visualSubtitle", next)}
        />
        <Field
          label="Texto alternativo da imagem"
          value={value.hero.imageAlt}
          onChange={next => update("hero", "imageAlt", next)}
        />
      </Section>

      <Section title="Links rápidos">
        <Field
          label="Eyebrow"
          value={value.quickLinks.kicker}
          onChange={next => update("quickLinks", "kicker", next)}
        />
        <Field
          label="Título"
          value={value.quickLinks.title}
          onChange={next => update("quickLinks", "title", next)}
        />
        {value.quickLinks.items.map((item, index) => (
          <Field
            key={`quick-link-${index}`}
            label={`Link ${index + 1}`}
            value={item.label}
            onChange={next =>
              updateList("quickLinks", "items", index, next, "label")
            }
          />
        ))}
      </Section>

      <Section title="Segurança e confiança">
        <Field
          label="Eyebrow"
          value={value.trust.kicker}
          onChange={next => update("trust", "kicker", next)}
        />
        <Field
          label="Título"
          value={value.trust.title}
          onChange={next => update("trust", "title", next)}
        />
        <Field
          label="Subtítulo"
          value={value.trust.text}
          onChange={next => update("trust", "text", next)}
          rows={3}
        />
        {value.trust.points.map((point, index) => (
          <div className="studio-settings-card" key={`trust-${index}`}>
            <strong>Bloco {index + 1}</strong>
            <Field
              label="Marcador"
              value={point.marker}
              onChange={next =>
                updateList("trust", "points", index, next, "marker")
              }
            />
            <Field
              label="Título"
              value={point.title}
              onChange={next =>
                updateList("trust", "points", index, next, "title")
              }
            />
            <Field
              label="Texto"
              value={point.text}
              onChange={next =>
                updateList("trust", "points", index, next, "text")
              }
            />
          </div>
        ))}
      </Section>

      <Section title="Cadastro de titulares">
        <Field
          label="Eyebrow"
          value={value.holder.kicker}
          onChange={next => update("holder", "kicker", next)}
        />
        <Field
          label="Título"
          value={value.holder.title}
          onChange={next => update("holder", "title", next)}
        />
        <Field
          label="Texto"
          value={value.holder.text}
          onChange={next => update("holder", "text", next)}
          rows={3}
        />
        <Field
          label="Botão"
          value={value.holder.buttonText}
          onChange={next => update("holder", "buttonText", next)}
        />
        {value.holder.benefits.map((benefit, index) => (
          <Field
            key={`benefit-${index}`}
            label={`Benefício ${index + 1}`}
            value={benefit}
            onChange={next => updateList("holder", "benefits", index, next)}
          />
        ))}
      </Section>

      <Section title="Perfis e catálogo">
        <Field
          label="Eyebrow de perfis publicados"
          value={value.featured.kicker}
          onChange={next => update("featured", "kicker", next)}
        />
        <Field
          label="Título de perfis publicados"
          value={value.featured.title}
          onChange={next => update("featured", "title", next)}
        />
        <Field
          label="Texto de perfis publicados"
          value={value.featured.text}
          onChange={next => update("featured", "text", next)}
        />
        <Field
          label="Eyebrow do catálogo"
          value={value.catalog.kicker}
          onChange={next => update("catalog", "kicker", next)}
        />
        <Field
          label="Título do catálogo"
          value={value.catalog.title}
          onChange={next => update("catalog", "title", next)}
        />
        <Field
          label="Status do catálogo"
          value={value.catalog.status}
          onChange={next => update("catalog", "status", next)}
        />
        <Field
          label="Mensagem de carregamento"
          value={value.catalog.loadingText}
          onChange={next => update("catalog", "loadingText", next)}
        />
        <Field
          label="Mensagem de erro"
          value={value.catalog.errorText}
          onChange={next => update("catalog", "errorText", next)}
        />
        <Field
          label="Título sem resultados"
          value={value.catalog.resultsEmptyTitle}
          onChange={next => update("catalog", "resultsEmptyTitle", next)}
        />
        <Field
          label="Texto sem resultados"
          value={value.catalog.resultsEmptyText}
          onChange={next => update("catalog", "resultsEmptyText", next)}
          rows={3}
        />
        <Field
          label="Botão sem resultados"
          value={value.catalog.resultsEmptyButton}
          onChange={next => update("catalog", "resultsEmptyButton", next)}
        />
        <Field
          label="Eyebrow de preparação"
          value={value.catalog.launchKicker}
          onChange={next => update("catalog", "launchKicker", next)}
        />
        <Field
          label="Título de preparação"
          value={value.catalog.launchTitle}
          onChange={next => update("catalog", "launchTitle", next)}
        />
        <Field
          label="Texto de preparação"
          value={value.catalog.launchText}
          onChange={next => update("catalog", "launchText", next)}
          rows={3}
        />
        <Field
          label="Botão de preparação"
          value={value.catalog.launchButton}
          onChange={next => update("catalog", "launchButton", next)}
        />
      </Section>

      <Section title="Busca avançada">
        <Field
          label="Eyebrow"
          value={value.searchBand.kicker}
          onChange={next => update("searchBand", "kicker", next)}
        />
        <Field
          label="Título"
          value={value.searchBand.title}
          onChange={next => update("searchBand", "title", next)}
        />
        <Field
          label="Texto"
          value={value.searchBand.text}
          onChange={next => update("searchBand", "text", next)}
          rows={3}
        />
        <Field
          label="Botão"
          value={value.searchBand.buttonText}
          onChange={next => update("searchBand", "buttonText", next)}
        />
        <Field
          label="Rótulo da arte"
          value={value.searchBand.artLabel}
          onChange={next => update("searchBand", "artLabel", next)}
        />
        <Field
          label="Localização padrão da arte"
          value={value.searchBand.artFallback}
          onChange={next => update("searchBand", "artFallback", next)}
        />
        <Field
          label="Legenda da arte"
          value={value.searchBand.artCaption}
          onChange={next => update("searchBand", "artCaption", next)}
        />
      </Section>

      <Section title="Categorias, localidades e sobre">
        <Field
          label="Eyebrow de categorias"
          value={value.categories.kicker}
          onChange={next => update("categories", "kicker", next)}
        />
        <Field
          label="Título de categorias"
          value={value.categories.title}
          onChange={next => update("categories", "title", next)}
        />
        <Field
          label="Texto de categorias"
          value={value.categories.text}
          onChange={next => update("categories", "text", next)}
          rows={3}
        />
        <Field
          label="Título sem catálogo"
          value={value.categories.emptyTitle}
          onChange={next => update("categories", "emptyTitle", next)}
        />
        <Field
          label="Texto sem catálogo"
          value={value.categories.emptyText}
          onChange={next => update("categories", "emptyText", next)}
          rows={3}
        />
        <Field
          label="Botão sem catálogo"
          value={value.categories.emptyButton}
          onChange={next => update("categories", "emptyButton", next)}
        />
        <Field
          label="Eyebrow de localidades"
          value={value.categories.locationsKicker}
          onChange={next => update("categories", "locationsKicker", next)}
        />
        <Field
          label="Eyebrow sobre"
          value={value.about.kicker}
          onChange={next => update("about", "kicker", next)}
        />
        <Field
          label="Título sobre"
          value={value.about.title}
          onChange={next => update("about", "title", next)}
        />
        <Field
          label="Texto sobre"
          value={value.about.text}
          onChange={next => update("about", "text", next)}
          rows={5}
        />
        <Field
          label="Link de segurança"
          value={value.about.policyLink}
          onChange={next => update("about", "policyLink", next)}
        />
      </Section>

      <Section title="Rodapé">
        <Field
          label="Descrição"
          value={value.footer.tagline}
          onChange={next => update("footer", "tagline", next)}
          rows={3}
        />
        <Field
          label="Aviso de idade"
          value={value.footer.ageNote}
          onChange={next => update("footer", "ageNote", next)}
        />
        <Field
          label="Assinatura"
          value={value.footer.signature}
          onChange={next => update("footer", "signature", next)}
        />
        <Field
          label="Fechamento"
          value={value.footer.closing}
          onChange={next => update("footer", "closing", next)}
        />
        {value.footer.groups.map((group, groupIndex) => (
          <div
            className="studio-settings-card"
            key={`footer-group-${groupIndex}`}
          >
            <strong>Grupo {groupIndex + 1}</strong>
            <Field
              label="Título do grupo"
              value={group.title}
              onChange={next =>
                updateList("footer", "groups", groupIndex, next, "title")
              }
            />
            {group.links.map((link, linkIndex) => (
              <Field
                key={`footer-link-${groupIndex}-${linkIndex}`}
                label={`Link ${linkIndex + 1}`}
                value={link.label}
                onChange={next => {
                  const groups = value.footer.groups.map(
                    (currentGroup, currentGroupIndex) =>
                      currentGroupIndex === groupIndex
                        ? {
                            ...currentGroup,
                            links: currentGroup.links.map(
                              (currentLink, currentLinkIndex) =>
                                currentLinkIndex === linkIndex
                                  ? { label: next }
                                  : currentLink
                            ),
                          }
                        : currentGroup
                  );
                  onChange({ ...value, footer: { ...value.footer, groups } });
                }}
              />
            ))}
          </div>
        ))}
      </Section>
    </div>
  );
}
