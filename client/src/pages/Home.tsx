import { useState } from "react";
import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  defaultSiteSettings,
  portfolioCategories,
  portfolioPolicy,
} from "@shared/portfolio";
import StudioHeader from "@/components/StudioHeader";
import Seo from "@/components/Seo";
export default function Home() {
  const params = useParams<{ city?: string }>();
  const [search, setSearch] = useState(""),
    [city, setCity] = useState(params.city || ""),
    [category, setCategory] = useState("");
  const settings = trpc.management.settings.useQuery();
  const site = settings.data || defaultSiteSettings;
  const config = trpc.system.config.useQuery();
  const age = trpc.age.status.useQuery();
  const open =
    !!settings.data &&
    site.showGallery &&
    !!config.data?.publicAccessEnabled &&
    age.data?.status === "approved";
  const list = trpc.profiles.list.useQuery(
    {
      search: search || undefined,
      city: city || undefined,
      category: category || undefined,
    },
    { enabled: open }
  );
  return (
    <div className="studio">
      <Seo
        title="Só Models — Portfólios profissionais"
        description={site.subtitle}
        path="/"
      />
      <StudioHeader>
        <Link href="/login">Entrar</Link>
        <Link href="/admin">Administração</Link>
      </StudioHeader>
      <main className="studio-main">
        <section className="studio-hero">
          <div>
            <p className="studio-kicker">Modelos · Criadores · Projetos</p>
            <h1>{site.title}</h1>
            <p>{site.subtitle}</p>
            <a className="studio-cta" href="#portfolios">
              {site.buttonText}
            </a>
          </div>
          <div className="studio-hero-art" aria-hidden="true">
            <span>
              Seu
              <br />
              próximo
              <br />
              <em>projeto.</em>
            </span>
          </div>
        </section>
        <section id="portfolios">
          <div className="studio-title">
            <div>
              <p className="studio-kicker">Descubra talentos</p>
              <h2>Portfólios profissionais</h2>
            </div>
          </div>
          {settings.error ? (
            <p className="studio-error">
              Não foi possível carregar a vitrine. Tente novamente mais tarde.
            </p>
          ) : !open ? (
            <div className="studio-panel">
              <p>
                {site.showGallery
                  ? "A vitrine está temporariamente indisponível. O acesso segue as verificações e configurações de publicação da plataforma."
                  : "A vitrine está temporariamente oculta."}
              </p>
            </div>
          ) : (
            <>
              <div className="studio-toolbar">
                <input
                  aria-label="Buscar portfólio"
                  placeholder="Nome ou especialidade"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <input
                  aria-label="Cidade"
                  placeholder="Cidade"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
                <select
                  aria-label="Categoria"
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                >
                  <option value="">Todas as categorias</option>
                  {portfolioCategories.map(c => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setSearch("");
                    setCity("");
                    setCategory("");
                  }}
                >
                  Limpar
                </button>
              </div>
              {list.isLoading ? (
                <p>Carregando portfólios…</p>
              ) : list.error ? (
                <p role="alert">Não foi possível carregar os portfólios.</p>
              ) : list.data?.length ? (
                <div className="studio-cards">
                  {list.data.map((p: any) => (
                    <Link
                      href={`/perfil/${p.slug}`}
                      className="studio-portfolio-card"
                      key={p.id}
                    >
                      <div className="studio-cover">
                        {p.avatarUrl ? (
                          <img
                            src={p.avatarUrl}
                            alt={`Portfólio de ${p.stageName}`}
                            loading="lazy"
                          />
                        ) : (
                          <span>{p.stageName.slice(0, 1)}</span>
                        )}
                      </div>
                      <div>
                        <small>{p.categories.join(" · ")}</small>
                        <h3>{p.stageName}</h3>
                        <p>
                          {p.city}
                          {p.region ? ` / ${p.region}` : ""}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="studio-panel">
                  <h3>Nenhum portfólio encontrado</h3>
                  <p>Altere os filtros ou volte em outro momento.</p>
                </div>
              )}
            </>
          )}
        </section>
        {site.showAbout && (
          <section className="studio-about">
            <p className="studio-kicker">Sobre a plataforma</p>
            <h2>Trabalhos que merecem ser vistos.</h2>
            <p>{site.about}</p>
          </section>
        )}
        <section className="studio-panel">
          <h3>Publicação responsável</h3>
          <p>{portfolioPolicy}</p>
          <p className="studio-muted">
            Os dados de contato são publicados pelo titular. Documentos de
            identidade não fazem parte da vitrine.
          </p>
        </section>
      </main>
      <footer className="studio-footer">{site.footer}</footer>
    </div>
  );
}
