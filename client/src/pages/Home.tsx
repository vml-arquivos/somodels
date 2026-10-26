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
import {
  buildDiscoverySearch,
  categoryPath,
  cityPath,
  DISCOVERY_PAGE_SIZE,
  parseDiscoverySearch,
  type DiscoveryFilters,
} from "@/lib/discovery";

const quickAttributes = [
  "Com local",
  "Atende externo",
  "Virtual",
  "Casal ou dupla",
];

function LandingHeading({
  kicker,
  title,
  text,
  align = "left",
  id,
}: {
  kicker: string;
  title: string;
  text?: string;
  align?: "left" | "center";
  id?: string;
}) {
  return (
    <div className={`studio-landing-heading studio-landing-heading-${align}`}>
      <p className="studio-kicker">{kicker}</p>
      <h2 id={id}>{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  );
}

function ProfilePreviewCard({ profile }: { profile: any }) {
  return (
    <Link
      href={`/perfil/${profile.slug}`}
      className="studio-profile-preview-card"
    >
      <div className="studio-profile-preview-image">
        {profile.avatarUrl ? (
          <img src={profile.avatarUrl} alt="" loading="lazy" />
        ) : (
          <span>{String(profile.stageName || "E").slice(0, 1)}</span>
        )}
        {profile.isAvailableNow ? <b>Disponível agora</b> : null}
      </div>
      <div>
        <strong>{profile.stageName}</strong>
        <span>
          {[profile.city, profile.region].filter(Boolean).join(" / ") ||
            "Localização não informada"}
        </span>
      </div>
    </Link>
  );
}

export function DiscoveryPage({
  fixedCity,
  fixedCategory,
}: {
  fixedCity?: string;
  fixedCategory?: string;
}) {
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
  const items = list.data?.slice(0, DISCOVERY_PAGE_SIZE) ?? [];
  const hasNext = (list.data?.length ?? 0) > DISCOVERY_PAGE_SIZE;
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
      ? `Explore anúncios adultos na categoria ${fixedCategory}.`
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
      : undefined;

  if (!adultAccess.ready)
    return <AdultGate access={adultAccess}>{null}</AdultGate>;

  return (
    <div className="studio studio-landing">
      <Seo
        title={title}
        description={description}
        path={canonicalPath}
        image="/images/hero/ero-models-hero.webp"
        noindex={noindex}
        jsonLd={jsonLd}
      />
      <StudioHeader />
      <main>
        {(fixedCity || fixedCategory) && (
          <div className="studio-main studio-landing-breadcrumb-wrap">
            <nav
              className="studio-breadcrumb"
              aria-label="Navegação estrutural"
            >
              <Link href="/">Início</Link>
              <span aria-hidden="true">/</span>
              <span>{fixedCity || fixedCategory}</span>
            </nav>
          </div>
        )}

        <section className="studio-landing-hero" aria-labelledby="hero-title">
          <div className="studio-landing-hero-inner">
            <div className="studio-landing-hero-copy">
              <p className="studio-landing-overline">
                {copy.hero.eyebrow} <span>•</span> 18+
              </p>
              <h1 id="hero-title">
                {fixedCity
                  ? `Perfis em ${fixedCity}`
                  : fixedCategory
                    ? `Perfis de ${fixedCategory}`
                    : copy.hero.title}
              </h1>
              <p className="studio-landing-hero-lead">
                {fixedCity || fixedCategory ? description : copy.hero.subtitle}
              </p>
              <form className="studio-landing-search" onSubmit={submitSearch}>
                <label>
                  <span>{copy.hero.searchLabel}</span>
                  <input
                    aria-label="Buscar anúncios"
                    placeholder={copy.hero.searchPlaceholder}
                    value={filters.search}
                    onChange={event =>
                      updateFilter("search", event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>{copy.hero.locationLabel}</span>
                  <input
                    aria-label="Cidade"
                    list="ero-location-options"
                    placeholder={copy.hero.locationPlaceholder}
                    value={fixedCity || filters.city}
                    disabled={Boolean(fixedCity)}
                    onChange={event => updateFilter("city", event.target.value)}
                  />
                  <datalist id="ero-location-options">
                    {locations.data?.map(location => (
                      <option
                        key={`${location.city}-${location.region || ""}`}
                        value={location.city}
                      >
                        {location.region || ""}
                      </option>
                    ))}
                  </datalist>
                </label>
                <button className="primary" type="submit">
                  {copy.hero.buttonText}
                </button>
              </form>
              <div
                className="studio-landing-hero-note"
                aria-label="Características da plataforma"
              >
                {copy.hero.notes.map(note => (
                  <span key={note}>{note}</span>
                ))}
              </div>
            </div>
            <div className="studio-landing-hero-visual">
              <img
                src="/images/hero/ero-models-hero.webp"
                alt={copy.hero.imageAlt}
              />
              <div className="studio-landing-hero-badge">
                <strong>{copy.hero.visualTitle}</strong>
                <span>{copy.hero.visualSubtitle}</span>
              </div>
              <span className="studio-landing-hero-line" aria-hidden="true" />
            </div>
          </div>
        </section>

        <section
          className="studio-landing-popular studio-main"
          aria-labelledby="popular-title"
        >
          <div>
            <p className="studio-kicker">{copy.quickLinks.kicker}</p>
            <h2 id="popular-title">{copy.quickLinks.title}</h2>
          </div>
          <div className="studio-popular-links">
            <a
              href="#anuncios"
              onClick={event => {
                event.preventDefault();
                scrollToListings();
              }}
            >
              <span>01</span>
              <strong>{copy.quickLinks.items[0].label}</strong>
              <b aria-hidden="true">↗</b>
            </a>
            <Link href={categoryPath("Acompanhante")}>
              <span>02</span>
              <strong>{copy.quickLinks.items[1].label}</strong>
              <b aria-hidden="true">↗</b>
            </Link>
            <Link href="/conta">
              <span>03</span>
              <strong>{copy.quickLinks.items[2].label}</strong>
              <b aria-hidden="true">↗</b>
            </Link>
            <Link href="/cadastro">
              <span>04</span>
              <strong>{copy.quickLinks.items[3].label}</strong>
              <b aria-hidden="true">↗</b>
            </Link>
          </div>
        </section>

        <section
          className="studio-landing-section studio-landing-trust"
          aria-labelledby="trust-title"
        >
          <LandingHeading
            id="trust-title"
            kicker={copy.trust.kicker}
            title={copy.trust.title}
            text={copy.trust.text}
            align="center"
          />
          <div className="studio-main studio-trust-grid">
            {copy.trust.points.map(point => (
              <article key={point.title} className="studio-trust-card">
                <span className="studio-trust-marker">{point.marker}</span>
                <h3>{point.title}</h3>
                <p>{point.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="studio-landing-holder-cta"
          aria-labelledby="holder-title"
        >
          <div className="studio-main studio-holder-cta-inner">
            <div>
              <p className="studio-kicker">{copy.holder.kicker}</p>
              <h2 id="holder-title">{copy.holder.title}</h2>
              <p>{copy.holder.text}</p>
            </div>
            <Link className="studio-cta" href="/cadastro">
              {copy.holder.buttonText}
            </Link>
            <div
              className="studio-holder-benefits"
              aria-label={copy.holder.title}
            >
              {copy.holder.benefits.map(benefit => (
                <span key={benefit}>{benefit}</span>
              ))}
            </div>
          </div>
        </section>

        {open && items.length > 0 && (
          <section
            className="studio-main studio-profile-rail"
            aria-labelledby="featured-title"
          >
            <LandingHeading
              id="featured-title"
              kicker={copy.featured.kicker}
              title={copy.featured.title}
              text={copy.featured.text}
            />
            <div className="studio-profile-preview-grid">
              {items.slice(0, 4).map(profile => (
                <ProfilePreviewCard key={profile.id} profile={profile} />
              ))}
            </div>
          </section>
        )}

        <section
          id="anuncios"
          className="studio-main studio-discovery-section"
          aria-labelledby="listing-title"
        >
          <div className="studio-title" id="busca">
            <div>
              <p className="studio-kicker">{copy.catalog.kicker}</p>
              <h2 id="listing-title">
                {fixedCity
                  ? `Anúncios em ${fixedCity}`
                  : fixedCategory
                    ? `Anúncios: ${fixedCategory}`
                    : copy.catalog.title}
              </h2>
            </div>
            {open && items.length > 0 ? (
              <span className="studio-catalog-status">
                {copy.catalog.status}
              </span>
            ) : null}
          </div>

          {settings.error ? (
            <p className="studio-error">{copy.catalog.errorText}</p>
          ) : !open ? (
            <div className="studio-panel studio-launch-panel studio-landing-empty">
              <p className="studio-kicker">{copy.catalog.launchKicker}</p>
              <h3>{copy.catalog.launchTitle}</h3>
              <p>{copy.catalog.launchText}</p>
              <Link className="studio-cta" href="/cadastro">
                {copy.catalog.launchButton}
              </Link>
            </div>
          ) : (
            <>
              <div className="studio-discovery-controls">
                <div className="studio-toolbar studio-toolbar-primary">
                  <input
                    aria-label="Buscar anúncios"
                    placeholder={copy.hero.searchPlaceholder}
                    value={filters.search}
                    onChange={event =>
                      updateFilter("search", event.target.value)
                    }
                  />
                  {!fixedCity && !fixedCategory ? (
                    <input
                      aria-label="Cidade"
                      list="ero-location-options"
                      placeholder="Cidade ou região"
                      value={filters.city}
                      onChange={event =>
                        updateFilter("city", event.target.value)
                      }
                    />
                  ) : null}
                </div>

                <div
                  className="studio-filter-chips"
                  aria-label="Filtros rápidos"
                >
                  <button
                    type="button"
                    className={filters.availableNow ? "active" : ""}
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
                    className={filters.verifiedOnly ? "active" : ""}
                    aria-pressed={filters.verifiedOnly}
                    onClick={() =>
                      setFilters(current => ({
                        ...current,
                        verifiedOnly: !current.verifiedOnly,
                        page: 0,
                      }))
                    }
                  >
                    Identidade verificada
                  </button>
                  {quickAttributes.slice(0, 3).map(attribute => (
                    <button
                      type="button"
                      className={
                        filters.attribute === attribute ? "active" : ""
                      }
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
                </div>

                <details
                  className="studio-filter-details"
                  open={activeFiltersCount > 0}
                >
                  <summary>
                    Filtros avançados
                    {activeFiltersCount > 0 ? (
                      <span>{activeFiltersCount} ativos</span>
                    ) : null}
                  </summary>
                  <div className="studio-toolbar studio-toolbar-advanced">
                    <select
                      aria-label="Categoria do anúncio"
                      disabled={Boolean(fixedCategory)}
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
                    <input
                      aria-label="Estado ou região"
                      placeholder="Estado / região"
                      value={filters.region}
                      onChange={event =>
                        updateFilter("region", event.target.value)
                      }
                    />
                    <select
                      aria-label="Característica do anúncio"
                      value={filters.attribute}
                      onChange={event =>
                        updateFilter("attribute", event.target.value)
                      }
                    >
                      <option value="">Qualquer característica</option>
                      {quickAttributes.map(attribute => (
                        <option key={attribute}>{attribute}</option>
                      ))}
                      <option value="Viagens">Viagens</option>
                      <option value="Bilíngue">Bilíngue</option>
                    </select>
                    <input
                      aria-label="Idade mínima"
                      placeholder="Idade mín."
                      inputMode="numeric"
                      maxLength={2}
                      value={filters.ageMin}
                      onChange={event =>
                        updateAgeFilter("ageMin", event.target.value)
                      }
                    />
                    <input
                      aria-label="Idade máxima"
                      placeholder="Idade máx."
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
                        <option key={band.maxCents} value={String(band.maxCents)}>
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
                      <option value="">Qualquer local de atendimento</option>
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
                    <button
                      type="button"
                      className="secondary"
                      onClick={() =>
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
                        })
                      }
                    >
                      Limpar filtros
                    </button>
                  </div>
                </details>

                <div className="studio-result-meta" aria-live="polite">
                  <span>
                    {list.isFetching
                      ? "Atualizando resultados…"
                      : `${items.length}${hasNext ? "+" : ""} anúncio${items.length === 1 ? "" : "s"}`}
                  </span>
                  <span>
                    {locations.data?.length
                      ? `${locations.data.length} localidades com anúncios publicados`
                      : "Localizações atualizadas conforme a publicação"}
                  </span>
                </div>
              </div>

              {list.isLoading ? (
                <p>{copy.catalog.loadingText}</p>
              ) : list.error ? (
                <p role="alert">{copy.catalog.listErrorText}</p>
              ) : items.length ? (
                <>
                  <div className="studio-cards">
                    {items.map(profile => (
                      <ListingCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                  <nav
                    className="studio-pagination"
                    aria-label="Paginação de anúncios"
                  >
                    <button
                      disabled={filters.page === 0 || list.isFetching}
                      onClick={() =>
                        setFilters(current => ({
                          ...current,
                          page: Math.max(0, current.page - 1),
                        }))
                      }
                    >
                      Anterior
                    </button>
                    <span>Página {filters.page + 1}</span>
                    <button
                      disabled={!hasNext || list.isFetching}
                      onClick={() =>
                        setFilters(current => ({
                          ...current,
                          page: current.page + 1,
                        }))
                      }
                    >
                      Próxima
                    </button>
                  </nav>
                </>
              ) : (
                <div className="studio-panel studio-landing-empty">
                  <h3>{copy.catalog.resultsEmptyTitle}</h3>
                  <p>{copy.catalog.resultsEmptyText}</p>
                  <Link href="/cadastro">
                    {copy.catalog.resultsEmptyButton}
                  </Link>
                </div>
              )}
            </>
          )}
        </section>

        <section
          className="studio-landing-search-band"
          aria-labelledby="personal-search-title"
        >
          <div className="studio-main studio-search-band-inner">
            <div className="studio-search-band-copy">
              <p className="studio-kicker">{copy.searchBand.kicker}</p>
              <h2 id="personal-search-title">{copy.searchBand.title}</h2>
              <p>{copy.searchBand.text}</p>
              <div className="studio-search-band-chips">
                {quickAttributes.map(attribute => (
                  <button
                    type="button"
                    key={attribute}
                    className={filters.attribute === attribute ? "active" : ""}
                    onClick={() => {
                      updateFilter("attribute", attribute);
                      scrollToListings();
                    }}
                  >
                    {attribute}
                  </button>
                ))}
              </div>
              <button
                className="studio-cta studio-cta-light"
                type="button"
                onClick={scrollToListings}
              >
                {copy.searchBand.buttonText}
              </button>
            </div>
            <div className="studio-search-band-art" aria-hidden="true">
              <div className="studio-search-window">
                <span>{copy.searchBand.artLabel}</span>
                <strong>{filters.city || copy.searchBand.artFallback}</strong>
                <small>{copy.searchBand.artCaption}</small>
              </div>
              <span className="studio-search-orbit studio-search-orbit-one" />
              <span className="studio-search-orbit studio-search-orbit-two" />
            </div>
          </div>
        </section>

        <section
          className="studio-main studio-landing-catalog"
          aria-labelledby="catalog-title"
        >
          <LandingHeading
            id="catalog-title"
            kicker={copy.categories.kicker}
            title={copy.categories.title}
            text={copy.categories.text}
          />
          {locations.isLoading || locations.data?.length ? (
            <div className="studio-category-card-grid" id="categorias">
              {portfolioCategories.slice(0, 6).map((category, index) => (
                <Link
                  key={category}
                  href={categoryPath(category)}
                  className="studio-category-card"
                >
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{category}</strong>
                  <b aria-hidden="true">↗</b>
                </Link>
              ))}
            </div>
          ) : (
            <div className="studio-panel studio-landing-empty">
              <h3>{copy.categories.emptyTitle}</h3>
              <p>{copy.categories.emptyText}</p>
              <Link href="/cadastro">{copy.categories.emptyButton}</Link>
            </div>
          )}
          {open && locations.data?.length ? (
            <div
              className="studio-city-cloud"
              aria-label="Localidades com anúncios publicados"
            >
              <p className="studio-kicker">{copy.categories.locationsKicker}</p>
              <div>
                {locations.data.slice(0, 16).map(location => (
                  <Link
                    key={`${location.city}-${location.region || ""}`}
                    href={cityPath(location.city)}
                  >
                    {location.city}
                    {location.region ? ` / ${location.region}` : ""}
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {site.showAbout && !fixedCity && !fixedCategory ? (
          <section
            className="studio-landing-about"
            aria-labelledby="about-title"
          >
            <div className="studio-main studio-landing-about-inner">
              <div>
                <p className="studio-kicker">{copy.about.kicker}</p>
                <h2 id="about-title">{copy.about.title}</h2>
              </div>
              <div>
                <p>{copy.about.text}</p>
                <p className="studio-landing-policy">{portfolioPolicy}</p>
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
