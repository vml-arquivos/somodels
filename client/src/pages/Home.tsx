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
  const config = trpc.system.config.useQuery();
  const activeCity = fixedCity || filters.city;
  const activeCategory = fixedCategory || filters.category;
  const open =
    adultAccess.ready &&
    !!settings.data &&
    site.showGallery &&
    !!config.data?.publicAccessEnabled &&
    !!config.data?.publicLaunchEnabled;
  const list = trpc.profiles.list.useQuery(
    {
      search: filters.search || undefined,
      city: activeCity || undefined,
      region: filters.region || undefined,
      category: activeCategory || undefined,
      attribute: filters.attribute || undefined,
      ageMin: filters.ageMin ? Number(filters.ageMin) : undefined,
      ageMax: filters.ageMax ? Number(filters.ageMax) : undefined,
      limit: DISCOVERY_PAGE_SIZE + 1,
      offset: filters.page * DISCOVERY_PAGE_SIZE,
    },
    { enabled: open }
  );
  const items = list.data?.slice(0, DISCOVERY_PAGE_SIZE) ?? [];
  const hasNext = (list.data?.length ?? 0) > DISCOVERY_PAGE_SIZE;
  const filtered = Boolean(
    filters.search ||
    filters.city ||
    filters.region ||
    filters.attribute ||
    filters.ageMin ||
    filters.ageMax
  );
  const canonicalPath = fixedCity
    ? cityPath(fixedCity)
    : fixedCategory
      ? categoryPath(fixedCategory)
      : "/";
  const title = fixedCity
    ? `Anúncios de acompanhantes em ${fixedCity} — Ero Models`
    : fixedCategory
      ? `${fixedCategory} — Anúncios Ero Models`
      : "Ero Models — Anúncios de acompanhantes";
  const description = fixedCity
    ? `Encontre anúncios de acompanhantes adultos em ${fixedCity}.`
    : fixedCategory
      ? `Explore anúncios adultos na categoria ${fixedCategory}.`
      : site.subtitle;
  const noindex = Boolean(
    config.data?.robotsNoIndex ||
      config.data?.ageVerificationRequired ||
      !config.data?.publicLaunchEnabled ||
      filtered
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
  ) =>
    setFilters(current => ({ ...current, [key]: value, page: 0 }));

  const jsonLd = fixedCity || fixedCategory
    ? {
        "@context": "https://schema.org",
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
            item: new URL(canonicalPath, window.location.origin).toString(),
          },
        ],
      }
    : undefined;

  if (!adultAccess.ready) return <AdultGate access={adultAccess}>{null}</AdultGate>;

  return (
    <div className="studio">
      <Seo
        title={title}
        description={description}
        path={canonicalPath}
        image="/images/hero/ero-models-hero.webp"
        noindex={noindex}
        jsonLd={jsonLd}
      />
      <StudioHeader />
      <main className="studio-main">
        {(fixedCity || fixedCategory) && (
          <nav className="studio-breadcrumb" aria-label="Navegação estrutural">
            <Link href="/">Início</Link>
            <span aria-hidden="true">/</span>
            <span>{fixedCity || fixedCategory}</span>
          </nav>
        )}
        <section className="studio-hero">
          <div>
            <p className="studio-kicker">{site.eyebrow}</p>
            <h1>
              {fixedCity
                ? `Acompanhantes em ${fixedCity}`
                : fixedCategory
                  ? `Acompanhantes: ${fixedCategory}`
                  : site.title}
            </h1>
            <p>{fixedCity || fixedCategory ? description : site.subtitle}</p>
            <div className="studio-actions">
              <a className="studio-cta" href="#busca">
                {site.buttonText}
              </a>
              <Link className="studio-cta studio-cta-secondary" href="/cadastro">
                Anunciar meu perfil
              </Link>
            </div>
          </div>
          <div className="studio-hero-art">
            <img src="/images/hero/ero-models-hero.webp" alt="" />
            <div className="studio-hero-art-overlay">
              <span>
                {site.heroVisualTitle}
              </span>
              <small>{site.heroVisualSubtitle}</small>
            </div>
          </div>
        </section>

        <section id="anuncios" aria-labelledby="listing-title">
          <div className="studio-title" id="busca">
            <div>
              <p className="studio-kicker">Encontre seu próximo contato</p>
              <h2 id="listing-title">
                {fixedCity
                  ? `Anúncios em ${fixedCity}`
                  : fixedCategory
                    ? `Anúncios: ${fixedCategory}`
                    : "Anúncios de acompanhantes"}
              </h2>
            </div>
          </div>
          {settings.error ? (
            <p className="studio-error">
              Não foi possível carregar a configuração da vitrine.
            </p>
          ) : !open ? (
            <div className="studio-panel studio-launch-panel">
              <h3>A vitrine ainda não está aberta</h3>
              <p>
                A plataforma está pronta para receber anúncios, mas a publicação
                pública depende das configurações de lançamento, age assurance,
                moderação e segurança do ambiente.
              </p>
            </div>
          ) : (
            <>
              <div className="studio-toolbar">
                <input
                  aria-label="Buscar anúncios"
                  placeholder={site.searchPlaceholder}
                  value={filters.search}
                  onChange={e => updateFilter("search", e.target.value)}
                />
                {!fixedCity && !fixedCategory && (
                  <input
                    aria-label="Cidade"
                    placeholder="Cidade"
                    value={filters.city}
                    onChange={e => updateFilter("city", e.target.value)}
                  />
                )}
                <select
                  aria-label="Categoria do anúncio"
                  disabled={Boolean(fixedCategory)}
                  value={filters.category}
                  onChange={e => updateFilter("category", e.target.value)}
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
                  onChange={e => updateFilter("region", e.target.value)}
                />
                <select
                  aria-label="Característica do anúncio"
                  value={filters.attribute}
                  onChange={e => updateFilter("attribute", e.target.value)}
                >
                  <option value="">Qualquer característica</option>
                  <option value="Com local">Com local</option>
                  <option value="Atende externo">Atende externo</option>
                  <option value="Virtual">Virtual</option>
                  <option value="Casal ou dupla">Casal ou dupla</option>
                  <option value="Viagens">Viagens</option>
                  <option value="Bilíngue">Bilíngue</option>
                </select>
                <input
                  aria-label="Idade mínima"
                  placeholder="Idade mín."
                  inputMode="numeric"
                  maxLength={2}
                  value={filters.ageMin}
                  onChange={e => updateFilter("ageMin", e.target.value)}
                />
                <input
                  aria-label="Idade máxima"
                  placeholder="Idade máx."
                  inputMode="numeric"
                  maxLength={2}
                  value={filters.ageMax}
                  onChange={e => updateFilter("ageMax", e.target.value)}
                />
                <button
                  onClick={() =>
                    setFilters({
                      search: "",
                      city: fixedCity || "",
                      region: "",
                      category: fixedCategory || "",
                      attribute: "",
                      ageMin: "",
                      ageMax: "",
                      page: 0,
                    })
                  }
                >
                  Limpar
                </button>
              </div>
              {list.isLoading ? (
                <p>Carregando anúncios…</p>
              ) : list.error ? (
                <p role="alert">Não foi possível carregar os anúncios.</p>
              ) : items.length ? (
                <>
                  <div className="studio-cards">
                    {items.map(profile => (
                      <ListingCard key={profile.id} profile={profile} />
                    ))}
                  </div>
                  <nav className="studio-pagination" aria-label="Paginação de anúncios">
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
                <div className="studio-panel">
                  <h3>{site.emptyTitle}</h3>
                  <p>{site.emptyText}</p>
                </div>
              )}
            </>
          )}
        </section>

        {!fixedCity && !fixedCategory && (
          <section id="categorias" className="studio-category-strip" aria-labelledby="category-title">
            <div>
              <p className="studio-kicker">Navegue por categoria</p>
              <h2 id="category-title">Encontre o tipo de anúncio</h2>
              <p className="studio-muted">
                Use as categorias e a cidade para chegar aos anúncios publicados.
              </p>
            </div>
            <div className="studio-category-links">
              {portfolioCategories.map(category => (
                <Link key={category} href={categoryPath(category)}>
                  {category}
                </Link>
              ))}
            </div>
          </section>
        )}

        {site.showAbout && !fixedCity && !fixedCategory && (
          <section className="studio-about">
            <p className="studio-kicker">Sobre a Ero Models</p>
            <h2>Uma plataforma adulta para anúncios de acompanhantes.</h2>
            <p>{site.about}</p>
          </section>
        )}

        {!fixedCity && !fixedCategory && (
          <section className="studio-home-grid" aria-label="Como a Ero Models funciona">
            <article className="studio-panel">
              <p className="studio-kicker">Para anunciantes</p>
              <h2>Crie e controle o seu anúncio</h2>
              <p>
                Cadastre nome artístico, fotos, vídeos, localização aproximada,
                disponibilidade e canais de contato. O painel mantém o controle
                do titular e o conteúdo passa por revisão.
              </p>
              <Link href="/cadastro">Criar meu anúncio</Link>
            </article>
            <article className="studio-panel">
              <p className="studio-kicker">Para quem busca</p>
              <h2>Veja informações antes de entrar em contato</h2>
              <p>
                Abra a página individual, consulte as especificações públicas,
                percorra a galeria e use WhatsApp ou telefone somente quando o
                canal estiver autorizado.
              </p>
              <a href="#anuncios">Ver anúncios</a>
            </article>
            <article className="studio-panel">
              <p className="studio-kicker">Segurança adulta</p>
              <h2>Maioridade, privacidade e denúncia</h2>
              <p>
                Acesso adulto com age gate, publicação moderada, preservação de
                dados sensíveis e ferramentas de denúncia e bloqueio.
              </p>
              <Link href="/seguranca">Conhecer a segurança</Link>
            </article>
          </section>
        )}

        <section className="studio-panel">
          <h3>Publicação adulta responsável</h3>
          <p>{portfolioPolicy}</p>
          <p className="studio-muted">
            O telefone bruto não aparece na listagem. Quando o contato estiver
            habilitado, a saída para WhatsApp ou ligação passa pelos controles do
            ambiente e pela autorização vigente do titular.
          </p>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}

export default function Home() {
  return <DiscoveryPage />;
}
