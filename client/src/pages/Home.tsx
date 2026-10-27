import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  defaultSiteSettings,
  portfolioCategories,
  portfolioPolicy,
} from "@shared/portfolio";
import {
  attendancePlaceOptions,
  priceBands,
  serviceOptions,
} from "@shared/discovery-options";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";
import Seo from "@/components/Seo";
import AdultGate, { useAdultAccess } from "@/components/AdultGate";
import ListingCard from "@/components/ListingCard";
import FeaturedCarousel from "@/components/FeaturedCarousel";
import Icon from "@/components/Icon";
import { usePublicLight } from "@/contexts/ThemeContext";
import {
  categoryCards,
  faqItems,
  holderBenefits,
  holderSteps,
  popularSearches,
  safetyTiles,
  shortcutLinks,
} from "@/lib/home-content";
import {
  buildDiscoverySearch,
  categoryPath,
  cityPath,
  DISCOVERY_PAGE_SIZE,
  parseDiscoverySearch,
  type DiscoveryFilters,
} from "@/lib/discovery";

const quickAttributes = ["Com local", "Atende externo", "Virtual"];

export function DiscoveryPage({
  fixedCity,
  fixedCategory,
}: {
  fixedCity?: string;
  fixedCategory?: string;
}) {
  usePublicLight();
  const adultAccess = useAdultAccess();
  const [filters, setFilters] = useState<DiscoveryFilters>(() =>
    parseDiscoverySearch(window.location.search, fixedCity, fixedCategory)
  );
  const settings = trpc.management.settings.useQuery();
  const site = settings.data || defaultSiteSettings;
  const copy = site.home;
  const config = trpc.system.config.useQuery();
  const activeCity = fixedCity || filters.city;
  const activeCategory = fixedCategory || filters.category;
  const open =
    adultAccess.ready &&
    !!settings.data &&
    site.showGallery &&
    !!config.data?.publicAccessEnabled &&
    !!config.data?.publicLaunchEnabled;
  const locations = trpc.profiles.locations.useQuery(undefined, {
    enabled: open,
  });
  const list = trpc.profiles.list.useQuery(
    {
      search: filters.search || undefined,
      city: activeCity || undefined,
      region: filters.region || undefined,
      category: activeCategory || undefined,
      attribute: filters.attribute || undefined,
      ageMin: filters.ageMin ? Number(filters.ageMin) : undefined,
      ageMax: filters.ageMax ? Number(filters.ageMax) : undefined,
      availableNow: filters.availableNow || undefined,
      priceMaxCents: filters.priceMax ? Number(filters.priceMax) : undefined,
      service: (filters.service || undefined) as
        | (typeof serviceOptions)[number]
        | undefined,
      place: (filters.place || undefined) as
        | (typeof attendancePlaceOptions)[number]
        | undefined,
      verifiedOnly: filters.verifiedOnly || undefined,
      sort: filters.sort,
      limit: DISCOVERY_PAGE_SIZE + 1,
      offset: filters.page * DISCOVERY_PAGE_SIZE,
    },
    { enabled: open }
  );
  const countQuery = trpc.profiles.count.useQuery(
    {
      search: filters.search || undefined,
      city: activeCity || undefined,
      region: filters.region || undefined,
      category: activeCategory || undefined,
      attribute: filters.attribute || undefined,
      ageMin: filters.ageMin ? Number(filters.ageMin) : undefined,
      ageMax: filters.ageMax ? Number(filters.ageMax) : undefined,
      availableNow: filters.availableNow || undefined,
      priceMaxCents: filters.priceMax ? Number(filters.priceMax) : undefined,
      service: (filters.service || undefined) as
        | (typeof serviceOptions)[number]
        | undefined,
      place: (filters.place || undefined) as
        | (typeof attendancePlaceOptions)[number]
        | undefined,
      verifiedOnly: filters.verifiedOnly || undefined,
    },
    { enabled: open }
  );
  const isHome = !fixedCity && !fixedCategory;
  const totalAllQuery = trpc.profiles.count.useQuery(
    {},
    { enabled: open && isHome }
  );
  const availableAllQuery = trpc.profiles.count.useQuery(
    { availableNow: true },
    { enabled: open && isHome }
  );
  const total = countQuery.data?.total;
  const totalPages =
    typeof total === "number"
      ? Math.max(1, Math.ceil(total / DISCOVERY_PAGE_SIZE))
      : null;
  const items = list.data?.slice(0, DISCOVERY_PAGE_SIZE) ?? [];
  const hasNext = (list.data?.length ?? 0) > DISCOVERY_PAGE_SIZE;
  const featuredQuery = trpc.profiles.list.useQuery(
    {
      city: fixedCity || undefined,
      category: fixedCategory || undefined,
      sort: "featured",
      limit: 10,
    },
    { enabled: open }
  );
  const featured = (featuredQuery.data ?? [])
    .filter(profile => Boolean(profile.avatarUrl))
    .slice(0, 8);
  const hasNonCanonicalFilter = Boolean(
    filters.search ||
      (!fixedCity && filters.city) ||
      filters.region ||
      (!fixedCategory && filters.category) ||
      filters.attribute ||
      filters.ageMin ||
      filters.ageMax ||
      filters.availableNow ||
      filters.priceMax ||
      filters.service ||
      filters.place ||
      filters.verifiedOnly ||
      filters.sort !== "featured"
  );
  const activeFiltersCount =
    [
      !fixedCity ? filters.city : "",
      filters.region,
      !fixedCategory ? filters.category : "",
      filters.attribute,
      filters.ageMin,
      filters.ageMax,
      filters.priceMax,
      filters.service,
      filters.place,
    ].filter(Boolean).length +
    (filters.availableNow ? 1 : 0) +
    (filters.verifiedOnly ? 1 : 0) +
    (filters.sort !== "featured" ? 1 : 0);
  const canonicalPath = fixedCity
    ? cityPath(fixedCity)
    : fixedCategory
      ? categoryPath(fixedCategory)
      : "/";
  const title = fixedCity
    ? `Anúncios de acompanhantes em ${fixedCity} — Ero Models`
    : fixedCategory
      ? `${fixedCategory} — Anúncios Ero Models`
      : `Ero Models — ${copy.hero.title}`;
  const description = fixedCity
    ? `Encontre anúncios de acompanhantes adultos em ${fixedCity}.`
    : fixedCategory
      ? `Veja os anúncios da categoria ${fixedCategory}.`
      : copy.hero.subtitle;
  const noindex = Boolean(
    config.data?.robotsNoIndex ||
      config.data?.ageVerificationRequired ||
      !config.data?.publicLaunchEnabled ||
      hasNonCanonicalFilter
  );

  useEffect(() => {
    const onPopState = () =>
      setFilters(
        parseDiscoverySearch(window.location.search, fixedCity, fixedCategory)
      );
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [fixedCity, fixedCategory]);

  useEffect(() => {
    const next = `${window.location.pathname}${buildDiscoverySearch(filters, fixedCity, fixedCategory)}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [filters, fixedCity, fixedCategory]);

  const updateFilter = (
    key: keyof Omit<DiscoveryFilters, "page">,
    value: string
  ) => setFilters(current => ({ ...current, [key]: value, page: 0 }));

  const updateAgeFilter = (key: "ageMin" | "ageMax", value: string) =>
    updateFilter(key, value.replace(/\D/g, "").slice(0, 2));

  const scrollToListings = () => {
    document.getElementById("anuncios")?.scrollIntoView({ behavior: "smooth" });
  };

  const runShortcut = (
    action: "availableNow" | "verified" | "virtual" | "local"
  ) => {
    setFilters(current => ({
      ...current,
      availableNow: action === "availableNow" ? true : current.availableNow,
      verifiedOnly: action === "verified" ? true : current.verifiedOnly,
      attribute:
        action === "virtual"
          ? "Virtual"
          : action === "local"
            ? "Com local"
            : current.attribute,
      page: 0,
    }));
    window.setTimeout(scrollToListings, 60);
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    scrollToListings();
  };

  const jsonLd =
    fixedCity || fixedCategory
      ? {
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "CollectionPage",
              name: fixedCity
                ? `Anúncios em ${fixedCity}`
                : `Anúncios ${fixedCategory}`,
              url: new URL(canonicalPath, window.location.origin).toString(),
            },
            {
              "@type": "BreadcrumbList",
              itemListElement: [
                {
                  "@type": "ListItem",
                  position: 1,
                  name: "Ero Models",
                  item: new URL("/", window.location.origin).toString(),
                },
                {
                  "@type": "ListItem",
                  position: 2,
                  name: fixedCity || fixedCategory,
                  item: new URL(
                    canonicalPath,
                    window.location.origin
                  ).toString(),
                },
              ],
            },
          ],
        }
      : {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map(item => ({
            "@type": "Question",
            name: item.q,
            acceptedAnswer: { "@type": "Answer", text: item.a },
          })),
        };

  if (!adultAccess.ready)
    return <AdultGate access={adultAccess}>{null}</AdultGate>;

  const heroTitle = fixedCity
    ? `Acompanhantes em ${fixedCity}`
    : fixedCategory
      ? fixedCategory
      : copy.hero.title;
  const heroLead =
    fixedCity || fixedCategory ? description : copy.hero.subtitle;
  const regionOptions = Array.from(
    new Set(
      (locations.data ?? [])
        .map(location => location.region)
        .filter((region): region is string => Boolean(region))
    )
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const totalAll = totalAllQuery.data?.total ?? 0;
  const availableAll = availableAllQuery.data?.total ?? 0;
  const cityCount = locations.data?.length ?? 0;
  const stats = [
    totalAll > 0 ? { label: "Anúncios no ar", value: String(totalAll) } : null,
    availableAll > 0
      ? { label: "Disponíveis agora", value: String(availableAll) }
      : null,
    cityCount > 0 ? { label: "Cidades", value: String(cityCount) } : null,
  ].filter((item): item is { label: string; value: string } => item !== null);
  const clearFilters = () =>
    setFilters({
      search: "",
      city: fixedCity || "",
      region: "",
      category: fixedCategory || "",
      attribute: "",
      ageMin: "",
      ageMax: "",
      availableNow: false,
      priceMax: "",
      service: "",
      place: "",
      verifiedOnly: false,
      sort: "featured",
      page: 0,
    });

  return (
    <div className="studio studio-public ep-page">
      <Seo
        title={title}
        description={description}
        path={canonicalPath}
        image="/images/hero/ero-models-hero.webp"
        noindex={noindex}
        jsonLd={jsonLd}
      />
      <StudioHeader />
      <main className="ep-main">
        <section className="ep-hero" aria-labelledby="hero-title">
          <div className="ep-wrap ep-hero-grid">
            <div className="ep-hero-copy">
              {(fixedCity || fixedCategory) && (
                <nav
                  className="ep-breadcrumb"
                  aria-label="Navegação estrutural"
                >
                  <Link href="/">Início</Link>
                  <span aria-hidden="true">/</span>
                  <span>{fixedCity || fixedCategory}</span>
                </nav>
              )}
              <p className="ep-eyebrow">{copy.hero.eyebrow} · 18+</p>
              <h1 id="hero-title">{heroTitle}</h1>
              <p className="ep-lead">{heroLead}</p>
              <form className="ep-search" onSubmit={submitSearch} role="search">
                <label className="ep-search-field">
                  <span className="ep-sr">{copy.hero.searchLabel}</span>
                  <input
                    aria-label="Buscar anúncios"
                    placeholder={copy.hero.searchPlaceholder}
                    value={filters.search}
                    onChange={event =>
                      updateFilter("search", event.target.value)
                    }
                  />
                </label>
                <label className="ep-search-field">
                  <span className="ep-sr">{copy.hero.locationLabel}</span>
                  <select
                    aria-label="Cidade"
                    value={fixedCity || filters.city}
                    disabled={Boolean(fixedCity)}
                    onChange={event => updateFilter("city", event.target.value)}
                  >
                    <option value="">{copy.hero.locationPlaceholder}</option>
                    {locations.data?.map(location => (
                      <option
                        key={`${location.city}-${location.region || ""}`}
                        value={location.city}
                      >
                        {location.city}
                        {location.region ? ` — ${location.region}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <button className="ep-btn ep-btn-primary" type="submit">
                  {copy.hero.buttonText}
                </button>
              </form>
              {isHome && (
                <div className="ep-hero-actions">
                  <Link className="ep-btn ep-btn-primary" href="/cadastro">
                    Anunciar grátis
                  </Link>
                  <a className="ep-btn ep-btn-ghost" href="#anuncios">
                    Ver anúncios
                  </a>
                </div>
              )}
              <ul className="ep-hero-notes" aria-label="Sobre a plataforma">
                {copy.hero.notes.map(note => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              {isHome && stats.length > 0 && (
                <dl className="ep-stats" aria-label="Números do site">
                  {stats.map(stat => (
                    <div key={stat.label}>
                      <dt>{stat.label}</dt>
                      <dd>{stat.value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
            <div className="ep-hero-visual">
              {isHome && featured.length > 0 && (
                <span className="ep-hero-badge">Em destaque</span>
              )}
              {featured.length ? (
                <FeaturedCarousel profiles={featured} />
              ) : (
                <div className="ep-hero-art">
                  <img
                    src="/images/hero/ero-models-hero.webp"
                    alt={copy.hero.imageAlt}
                    width="720"
                    height="900"
                  />
                  <span className="ep-slide-shade" aria-hidden="true" />
                  <p>
                    <strong>{copy.hero.visualTitle}</strong>
                    <span>{copy.hero.visualSubtitle}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>

        {isHome && (
          <section
            className="ep-section ep-shortcuts"
            aria-labelledby="shortcuts-title"
          >
            <div className="ep-wrap">
              <div className="ep-section-head">
                <h2 id="shortcuts-title">Links populares</h2>
              </div>
              <ul className="ep-shortcut-list">
                {shortcutLinks.map(item => (
                  <li key={item.label}>
                    {item.href ? (
                      <Link href={item.href} className="ep-shortcut">
                        <span className="ep-shortcut-icon">
                          <Icon name={item.icon} />
                        </span>
                        <span className="ep-shortcut-text">
                          <strong>{item.label}</strong>
                          <small>{item.hint}</small>
                        </span>
                        <span className="ep-chevron" aria-hidden="true">
                          ›
                        </span>
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="ep-shortcut"
                        onClick={() => item.action && runShortcut(item.action)}
                      >
                        <span className="ep-shortcut-icon">
                          <Icon name={item.icon} />
                        </span>
                        <span className="ep-shortcut-text">
                          <strong>{item.label}</strong>
                          <small>{item.hint}</small>
                        </span>
                        <span className="ep-chevron" aria-hidden="true">
                          ›
                        </span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section
          id="anuncios"
          className="ep-section ep-listings"
          aria-labelledby="listing-title"
        >
          <div className="ep-wrap">
            <div className="ep-section-head" id="busca">
              <div>
                <h2 id="listing-title">
                  {fixedCity
                    ? `Anúncios em ${fixedCity}`
                    : fixedCategory
                      ? `Anúncios: ${fixedCategory}`
                      : copy.catalog.title}
                </h2>
                {open && (
                  <p className="ep-count" aria-live="polite">
                    {list.isFetching
                      ? "Atualizando…"
                      : typeof total === "number"
                        ? `${total} anúncio${total === 1 ? "" : "s"}`
                        : `${items.length}${hasNext ? "+" : ""} anúncio${items.length === 1 ? "" : "s"}`}
                  </p>
                )}
              </div>
            </div>

            {settings.error ? (
              <p className="studio-error">{copy.catalog.errorText}</p>
            ) : !open ? (
              <div className="ep-empty">
                <h3>{copy.catalog.launchTitle}</h3>
                <p>{copy.catalog.launchText}</p>
                <Link className="ep-btn ep-btn-primary" href="/cadastro">
                  {copy.catalog.launchButton}
                </Link>
              </div>
            ) : (
              <>
                <div className="ep-filters">
                  <div className="ep-filter-row">
                    <input
                      aria-label="Buscar anúncios"
                      placeholder={copy.hero.searchPlaceholder}
                      value={filters.search}
                      onChange={event =>
                        updateFilter("search", event.target.value)
                      }
                    />
                    {!fixedCity && (
                      <select
                        aria-label="Cidade"
                        value={filters.city}
                        onChange={event =>
                          updateFilter("city", event.target.value)
                        }
                      >
                        <option value="">Todas as cidades</option>
                        {locations.data?.map(location => (
                          <option
                            key={`f-${location.city}-${location.region || ""}`}
                            value={location.city}
                          >
                            {location.city}
                          </option>
                        ))}
                      </select>
                    )}
                    {!fixedCategory && (
                      <select
                        aria-label="Categoria do anúncio"
                        value={filters.category}
                        onChange={event =>
                          updateFilter("category", event.target.value)
                        }
                      >
                        <option value="">Todas as categorias</option>
                        {portfolioCategories.map(category => (
                          <option key={category}>{category}</option>
                        ))}
                      </select>
                    )}
                  </div>

                  <div className="ep-chip-row" aria-label="Filtros rápidos">
                    <button
                      type="button"
                      className={`ep-chip ${filters.availableNow ? "is-on" : ""}`}
                      aria-pressed={filters.availableNow}
                      onClick={() =>
                        setFilters(current => ({
                          ...current,
                          availableNow: !current.availableNow,
                          page: 0,
                        }))
                      }
                    >
                      Disponível agora
                    </button>
                    <button
                      type="button"
                      className={`ep-chip ${filters.verifiedOnly ? "is-on" : ""}`}
                      aria-pressed={filters.verifiedOnly}
                      onClick={() =>
                        setFilters(current => ({
                          ...current,
                          verifiedOnly: !current.verifiedOnly,
                          page: 0,
                        }))
                      }
                    >
                      Verificada
                    </button>
                    {quickAttributes.map(attribute => (
                      <button
                        type="button"
                        className={`ep-chip ${filters.attribute === attribute ? "is-on" : ""}`}
                        aria-pressed={filters.attribute === attribute}
                        key={attribute}
                        onClick={() =>
                          updateFilter(
                            "attribute",
                            filters.attribute === attribute ? "" : attribute
                          )
                        }
                      >
                        {attribute}
                      </button>
                    ))}
                    {activeFiltersCount > 0 && (
                      <button
                        type="button"
                        className="ep-chip ep-chip-clear"
                        onClick={clearFilters}
                      >
                        Limpar filtros ({activeFiltersCount})
                      </button>
                    )}
                  </div>

                  <details
                    className="ep-more"
                    open={Boolean(
                      filters.region ||
                        filters.ageMin ||
                        filters.ageMax ||
                        filters.priceMax ||
                        filters.service ||
                        filters.place ||
                        filters.sort !== "featured"
                    )}
                  >
                    <summary>Mais filtros</summary>
                    <div className="ep-more-grid">
                      <select
                        aria-label="Estado"
                        value={filters.region}
                        onChange={event =>
                          updateFilter("region", event.target.value)
                        }
                      >
                        <option value="">Qualquer estado</option>
                        {regionOptions.map(region => (
                          <option key={region}>{region}</option>
                        ))}
                      </select>
                      <input
                        aria-label="Idade mínima"
                        placeholder="Idade mínima"
                        inputMode="numeric"
                        maxLength={2}
                        value={filters.ageMin}
                        onChange={event =>
                          updateAgeFilter("ageMin", event.target.value)
                        }
                      />
                      <input
                        aria-label="Idade máxima"
                        placeholder="Idade máxima"
                        inputMode="numeric"
                        maxLength={2}
                        value={filters.ageMax}
                        onChange={event =>
                          updateAgeFilter("ageMax", event.target.value)
                        }
                      />
                      <select
                        aria-label="Faixa de preço"
                        value={filters.priceMax}
                        onChange={event =>
                          updateFilter("priceMax", event.target.value)
                        }
                      >
                        <option value="">Qualquer preço</option>
                        {priceBands.map(band => (
                          <option
                            key={band.maxCents}
                            value={String(band.maxCents)}
                          >
                            {band.label}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label="Local de atendimento"
                        value={filters.place}
                        onChange={event =>
                          updateFilter("place", event.target.value)
                        }
                      >
                        <option value="">Qualquer local</option>
                        {attendancePlaceOptions.map(place => (
                          <option key={place}>{place}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Serviço oferecido"
                        value={filters.service}
                        onChange={event =>
                          updateFilter("service", event.target.value)
                        }
                      >
                        <option value="">Qualquer serviço</option>
                        {serviceOptions.map(service => (
                          <option key={service}>{service}</option>
                        ))}
                      </select>
                      <select
                        aria-label="Ordenar anúncios"
                        value={filters.sort}
                        onChange={event =>
                          updateFilter(
                            "sort",
                            event.target.value as typeof filters.sort
                          )
                        }
                      >
                        <option value="featured">Mais relevantes</option>
                        <option value="available">Disponíveis primeiro</option>
                        <option value="recent">Atualizados recentemente</option>
                        <option value="price_asc">Menor preço</option>
                      </select>
                    </div>
                  </details>
                </div>

                {(fixedCity || fixedCategory) && (
                  <p className="ep-page-intro">
                    {fixedCity
                      ? `Anúncios de acompanhantes adultos em ${fixedCity}. Filtre por idade, serviços, local de atendimento e valor.`
                      : `Anúncios da categoria ${fixedCategory}. Filtre por cidade, idade, serviços e valor.`}
                  </p>
                )}

                {list.isLoading ? (
                  <div className="ep-grid" aria-busy="true">
                    {[0, 1, 2, 3].map(index => (
                      <div className="ep-card ep-card-skeleton" key={index}>
                        <div className="ep-card-photo" />
                      </div>
                    ))}
                  </div>
                ) : list.error ? (
                  <p role="alert" className="studio-error">
                    {copy.catalog.listErrorText}
                  </p>
                ) : items.length ? (
                  <>
                    <div className="ep-grid">
                      {items.map(profile => (
                        <ListingCard key={profile.id} profile={profile} />
                      ))}
                    </div>
                    <nav
                      className="ep-pagination"
                      aria-label="Paginação de anúncios"
                    >
                      <button
                        type="button"
                        disabled={filters.page === 0 || list.isFetching}
                        onClick={() => {
                          setFilters(current => ({
                            ...current,
                            page: Math.max(0, current.page - 1),
                          }));
                          scrollToListings();
                        }}
                      >
                        Anterior
                      </button>
                      <span>
                        Página {filters.page + 1}
                        {totalPages ? ` de ${totalPages}` : ""}
                      </span>
                      <button
                        type="button"
                        disabled={!hasNext || list.isFetching}
                        onClick={() => {
                          setFilters(current => ({
                            ...current,
                            page: current.page + 1,
                          }));
                          scrollToListings();
                        }}
                      >
                        Próxima
                      </button>
                    </nav>
                  </>
                ) : (
                  <div className="ep-empty">
                    <h3>{copy.catalog.resultsEmptyTitle}</h3>
                    <p>
                      {activeFiltersCount > 0 || filters.search
                        ? "Nada encontrado com esses filtros. Tente tirar algum deles."
                        : copy.catalog.resultsEmptyText}
                    </p>
                    {activeFiltersCount > 0 || filters.search ? (
                      <button
                        type="button"
                        className="ep-btn ep-btn-ghost"
                        onClick={clearFilters}
                      >
                        Limpar filtros
                      </button>
                    ) : (
                      <Link className="ep-btn ep-btn-primary" href="/cadastro">
                        {copy.catalog.resultsEmptyButton}
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>

        {isHome ? (
          <>
            <section
              id="categorias"
              className="ep-section ep-browse"
              aria-labelledby="categories-title"
            >
              <div className="ep-wrap">
                <div className="ep-section-head">
                  <h2 id="categories-title">Escolha uma categoria</h2>
                </div>
                <ul className="ep-category-grid">
                  {categoryCards.map(card => (
                    <li key={card.name}>
                      <Link
                        href={categoryPath(card.name)}
                        className="ep-category-card"
                      >
                        <span className="ep-category-icon">
                          <Icon name={card.icon} size={24} />
                        </span>
                        <strong>{card.name}</strong>
                        <p>{card.text}</p>
                        <span className="ep-category-link">Ver anúncios ›</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {open && locations.data?.length ? (
              <section
                className="ep-section ep-cities"
                aria-labelledby="cities-title"
              >
                <div className="ep-wrap">
                  <div className="ep-section-head">
                    <h2 id="cities-title">Cidades com anúncios</h2>
                  </div>
                  <ul className="ep-city-grid">
                    {locations.data.slice(0, 24).map(location => (
                      <li key={`${location.city}-${location.region || ""}`}>
                        <Link href={cityPath(location.city)}>
                          <span>{location.city}</span>
                          {location.region ? (
                            <small>{location.region}</small>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                  <h3 className="ep-subhead">Buscas populares</h3>
                  <div className="ep-chip-row">
                    {popularSearches.map(service => (
                      <button
                        type="button"
                        className="ep-chip"
                        key={service}
                        onClick={() => {
                          updateFilter("service", service);
                          window.setTimeout(scrollToListings, 60);
                        }}
                      >
                        {service}
                      </button>
                    ))}
                  </div>
                </div>
              </section>
            ) : null}

            <section
              className="ep-section ep-trust"
              aria-labelledby="trust-title"
            >
              <div className="ep-wrap">
                <div className="ep-section-head">
                  <h2 id="trust-title">Mais segurança e privacidade</h2>
                </div>
                <ul className="ep-trust-grid">
                  {safetyTiles.map(tile => (
                    <li key={tile.title}>
                      <span className="ep-trust-mark" aria-hidden="true">
                        <Icon name={tile.icon} size={24} />
                      </span>
                      <div>
                        <h3>{tile.title}</h3>
                        <p>{tile.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="ep-holder" aria-labelledby="holder-title">
              <div className="ep-wrap">
                <div className="ep-holder-head">
                  <div>
                    <h2 id="holder-title">{copy.holder.title}</h2>
                    <p>{copy.holder.text}</p>
                  </div>
                  <Link className="ep-btn ep-btn-light" href="/cadastro">
                    {copy.holder.buttonText}
                  </Link>
                </div>
                <ol className="ep-hsteps">
                  {holderSteps.map((step, index) => (
                    <li key={step.title}>
                      <span className="ep-step-number">{index + 1}</span>
                      <div>
                        <strong>{step.title}</strong>
                        <p>{step.text}</p>
                      </div>
                    </li>
                  ))}
                </ol>
                <ul className="ep-holder-cards">
                  {holderBenefits.map(benefit => (
                    <li key={benefit.title}>
                      <Icon name={benefit.icon} size={22} />
                      <strong>{benefit.title}</strong>
                      <p>{benefit.text}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="ep-section ep-faq" aria-labelledby="faq-title">
              <div className="ep-wrap ep-faq-inner">
                <h2 id="faq-title">Perguntas frequentes</h2>
                <div className="ep-faq-list">
                  {faqItems.map(item => (
                    <details key={item.q}>
                      <summary>{item.q}</summary>
                      <p>{item.a}</p>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          </>
        ) : (
          <>
            <section
              id="categorias"
              className="ep-section ep-browse"
              aria-labelledby="categories-title"
            >
              <div className="ep-wrap">
                <div className="ep-section-head">
                  <h2 id="categories-title">{copy.categories.title}</h2>
                </div>
                <ul className="ep-pill-list">
                  {portfolioCategories.map(category => (
                    <li key={category}>
                      <Link href={categoryPath(category)}>{category}</Link>
                    </li>
                  ))}
                </ul>
                {open && locations.data?.length ? (
                  <>
                    <h3 className="ep-subhead">
                      {copy.categories.locationsKicker}
                    </h3>
                    <ul className="ep-pill-list">
                      {locations.data.slice(0, 24).map(location => (
                        <li key={`${location.city}-${location.region || ""}`}>
                          <Link href={cityPath(location.city)}>
                            {location.city}
                            {location.region ? ` · ${location.region}` : ""}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}
              </div>
            </section>

            <section
              className="ep-section ep-trust"
              aria-labelledby="trust-title"
            >
              <div className="ep-wrap">
                <div className="ep-section-head">
                  <h2 id="trust-title">{copy.trust.title}</h2>
                </div>
                <ul className="ep-trust-grid">
                  {copy.trust.points.map(point => (
                    <li key={point.title}>
                      <span className="ep-trust-mark" aria-hidden="true">
                        {point.marker}
                      </span>
                      <div>
                        <h3>{point.title}</h3>
                        <p>{point.text}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="ep-holder" aria-labelledby="holder-title">
              <div className="ep-wrap ep-holder-inner">
                <div>
                  <h2 id="holder-title">{copy.holder.title}</h2>
                  <p>{copy.holder.text}</p>
                  <ul className="ep-holder-benefits">
                    {copy.holder.benefits.map(benefit => (
                      <li key={benefit}>{benefit}</li>
                    ))}
                  </ul>
                </div>
                <Link className="ep-btn ep-btn-light" href="/cadastro">
                  {copy.holder.buttonText}
                </Link>
              </div>
            </section>
          </>
        )}

        {site.showAbout && !fixedCity && !fixedCategory ? (
          <section
            className="ep-section ep-about"
            aria-labelledby="about-title"
          >
            <div className="ep-wrap ep-about-inner">
              <h2 id="about-title">{copy.about.title}</h2>
              <div>
                <p>{copy.about.text}</p>
                <p className="ep-policy">{portfolioPolicy}</p>
                <Link href="/seguranca">{copy.about.policyLink}</Link>
              </div>
            </div>
          </section>
        ) : null}
      </main>
      <PublicFooter />
    </div>
  );
}

export default function Home() {
  return <DiscoveryPage />;
}
