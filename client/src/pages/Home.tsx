import { useEffect, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  defaultSiteSettings,
  portfolioCategories,
  portfolioPolicy,
} from "@shared/portfolio";
import StudioHeader from "@/components/StudioHeader";
import PublicFooter from "@/components/PublicFooter";
import Seo from "@/components/Seo";
import {
  buildDiscoverySearch,
  categoryPath,
  cityPath,
  DISCOVERY_PAGE_SIZE,
  parseDiscoverySearch,
  type DiscoveryFilters,
} from "@/lib/discovery";

export function DiscoveryPage({ fixedCity, fixedCategory }: { fixedCity?: string; fixedCategory?: string }) {
  const [filters, setFilters] = useState<DiscoveryFilters>(() =>
    parseDiscoverySearch(window.location.search, fixedCity, fixedCategory)
  );
  const settings = trpc.management.settings.useQuery();
  const site = settings.data || defaultSiteSettings;
  const config = trpc.system.config.useQuery();
  const age = trpc.age.status.useQuery();
  const open =
    !!settings.data &&
    site.showGallery &&
    !!config.data?.publicAccessEnabled &&
    !!config.data?.publicLaunchEnabled &&
    age.data?.status === "approved";
  const activeCity = fixedCity || filters.city;
  const activeCategory = fixedCategory || filters.category;
  const list = trpc.profiles.list.useQuery(
    {
      search: filters.search || undefined,
      city: activeCity || undefined,
      category: activeCategory || undefined,
      limit: DISCOVERY_PAGE_SIZE + 1,
      offset: filters.page * DISCOVERY_PAGE_SIZE,
    },
    { enabled: open }
  );
  const items = list.data?.slice(0, DISCOVERY_PAGE_SIZE) ?? [];
  const hasNext = (list.data?.length ?? 0) > DISCOVERY_PAGE_SIZE;
  const filtered = Boolean(filters.search || (!fixedCity && !fixedCategory && filters.city));
  const canonicalPath = fixedCity ? cityPath(fixedCity) : fixedCategory ? categoryPath(fixedCategory) : "/";
  const title = fixedCity
    ? `Portfólios profissionais em ${fixedCity} — Só Models`
    : fixedCategory
      ? `Portfólios de ${fixedCategory} — Só Models`
      : "Só Models — Portfólios profissionais";
  const description = fixedCity
    ? `Descubra portfólios profissionais de modelos e criadores em ${fixedCity}.`
    : fixedCategory
      ? `Explore portfólios profissionais na categoria ${fixedCategory}.`
      : site.subtitle;
  const noindex = Boolean(
    config.data?.robotsNoIndex ||
      config.data?.ageVerificationRequired ||
      !config.data?.publicLaunchEnabled ||
      filtered
  );

  useEffect(() => {
    const onPopState = () =>
      setFilters(parseDiscoverySearch(window.location.search, fixedCity, fixedCategory));
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [fixedCity, fixedCategory]);

  useEffect(() => {
    const next = `${window.location.pathname}${buildDiscoverySearch(filters, fixedCity, fixedCategory)}`;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) window.history.replaceState(null, "", next);
  }, [filters, fixedCity, fixedCategory]);

  const updateFilter = (key: "search" | "city" | "category", value: string) =>
    setFilters(current => ({ ...current, [key]: value, page: 0 }));

  const jsonLd = fixedCity || fixedCategory
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Só Models",
            item: new URL("/", window.location.origin).toString(),
          },
          {
            "@type": "ListItem",
            position: 2,
            name: fixedCity || fixedCategory,
            item: new URL(canonicalPath, window.location.origin).toString(),
          },
        ],
      }
    : undefined;

  return (
    <div className="studio">
      <Seo title={title} description={description} path={canonicalPath} noindex={noindex} jsonLd={jsonLd} />
      <StudioHeader>
        <Link href="/login">Entrar</Link>
        <Link href="/admin">Administração</Link>
      </StudioHeader>
      <main className="studio-main">
        {(fixedCity || fixedCategory) && (
          <nav className="studio-breadcrumb" aria-label="Navegação estrutural">
            <Link href="/">Vitrine</Link>
            <span aria-hidden="true">/</span>
            <span>{fixedCity || fixedCategory}</span>
          </nav>
        )}
        <section className="studio-hero">
          <div>
            <p className="studio-kicker">Modelos · Criadores · Projetos</p>
            <h1>
              {fixedCity
                ? `Talentos em ${fixedCity}`
                : fixedCategory
                  ? `Talentos de ${fixedCategory}`
                  : site.title}
            </h1>
            <p>{fixedCity || fixedCategory ? description : site.subtitle}</p>
            <a className="studio-cta" href="#portfolios">{site.buttonText}</a>
          </div>
          <div className="studio-hero-art" aria-hidden="true">
            <span>Seu<br />próximo<br /><em>projeto.</em></span>
          </div>
        </section>
        <section id="portfolios">
          <div className="studio-title">
            <div>
              <p className="studio-kicker">Descubra talentos</p>
              <h2>{fixedCity ? `Portfólios em ${fixedCity}` : fixedCategory ? `Portfólios de ${fixedCategory}` : "Portfólios profissionais"}</h2>
            </div>
          </div>
          {settings.error ? (
            <p className="studio-error">Não foi possível carregar a vitrine. Tente novamente mais tarde.</p>
          ) : !open ? (
            <div className="studio-panel">
              <p>{site.showGallery ? "A vitrine está temporariamente indisponível. O acesso segue as verificações e configurações de publicação da plataforma." : "A vitrine está temporariamente oculta."}</p>
            </div>
          ) : (
            <>
              <div className="studio-toolbar">
                <input aria-label="Buscar portfólio" placeholder="Nome ou especialidade" value={filters.search} onChange={e => updateFilter("search", e.target.value)} />
                {!fixedCity && !fixedCategory && (
                  <input aria-label="Cidade" placeholder="Cidade" value={filters.city} onChange={e => updateFilter("city", e.target.value)} />
                )}
                <select aria-label="Categoria" disabled={Boolean(fixedCategory)} value={filters.category} onChange={e => updateFilter("category", e.target.value)}>
                  <option value="">Todas as categorias</option>
                  {portfolioCategories.map(c => <option key={c}>{c}</option>)}
                </select>
                <button onClick={() => setFilters({ search: "", city: fixedCity || "", category: fixedCategory || "", page: 0 })}>Limpar</button>
              </div>
              {list.isLoading ? (
                <p>Carregando portfólios…</p>
              ) : list.error ? (
                <p role="alert">Não foi possível carregar os portfólios.</p>
              ) : items.length ? (
                <>
                  <div className="studio-cards">
                    {items.map((p: any) => (
                      <article className="studio-portfolio-card" key={p.id}>
                        <Link href={`/perfil/${p.slug}`} className="studio-card-main">
                          <div className="studio-cover">
                            {p.avatarUrl ? <img src={p.avatarUrl} alt={`Portfólio de ${p.stageName}`} loading="lazy" /> : <span>{p.stageName.slice(0, 1)}</span>}
                          </div>
                          <div>
                            <small>{p.categories.join(" · ")}</small>
                            <h3>{p.stageName}</h3>
                          </div>
                        </Link>
                        <Link href={cityPath(p.city)} className="studio-city-link">{p.city}{p.region ? ` / ${p.region}` : ""}</Link>
                      </article>
                    ))}
                  </div>
                  <nav className="studio-pagination" aria-label="Paginação de portfólios">
                    <button disabled={filters.page === 0 || list.isFetching} onClick={() => setFilters(current => ({ ...current, page: Math.max(0, current.page - 1) }))}>Anterior</button>
                    <span>Página {filters.page + 1}</span>
                    <button disabled={!hasNext || list.isFetching} onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))}>Próxima</button>
                  </nav>
                </>
              ) : (
                <div className="studio-panel"><h3>Nenhum portfólio encontrado</h3><p>Altere os filtros ou volte em outro momento.</p></div>
              )}
            </>
          )}
        </section>
        {site.showAbout && !fixedCity && !fixedCategory && (
          <section className="studio-about"><p className="studio-kicker">Sobre a plataforma</p><h2>Trabalhos que merecem ser vistos.</h2><p>{site.about}</p></section>
        )}
        <section className="studio-panel">
          <h3>Publicação responsável</h3>
          <p>{portfolioPolicy}</p>
          <p className="studio-muted">Dados de contato não são publicados na vitrine. Quando o contato seguro estiver habilitado, a saída para um canal externo exige conta autenticada, age gate válido, ausência de bloqueio e autorização vigente do titular. Documentos de identidade não fazem parte da vitrine.</p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function Home() {
  return <DiscoveryPage />;
}
