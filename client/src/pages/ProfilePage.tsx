import { Link, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { contactLinks } from "@shared/portfolio";
import StudioHeader from "@/components/StudioHeader";
import Seo from "@/components/Seo";
export default function ProfilePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const result = trpc.profiles.bySlug.useQuery({ slug });
  const settings = trpc.management.settings.useQuery();
  const config = trpc.system.config.useQuery();
  const data = result.data;
  const links = contactLinks(data?.profile.phone, data?.profile.whatsapp);
  return (
    <div className="studio">
      <StudioHeader />
      <main className="studio-main">
        <Link href="/">← Voltar à vitrine</Link>
        {result.isLoading ? (
          <p>Carregando portfólio…</p>
        ) : result.error ? (
          <p role="alert">Não foi possível carregar o portfólio.</p>
        ) : !data ? (
          <section className="studio-panel">
            <h1>Portfólio indisponível</h1>
            <p>Este portfólio pode estar em revisão ou não estar publicado.</p>
          </section>
        ) : (
          <>
            <Seo
              title={`${data.profile.stageName} — Só Models`}
              description={data.profile.description || "Portfólio profissional"}
              path={`/perfil/${slug}`}
              image={data.profile.avatarUrl || undefined}
              noindex={Boolean(
                config.data?.robotsNoIndex || config.data?.ageVerificationRequired
              )}
            />
            <section className="studio-profile-hero">
              <div className="studio-cover">
                {data.profile.avatarUrl ? (
                  <img
                    src={data.profile.avatarUrl}
                    alt={data.profile.stageName}
                  />
                ) : (
                  <span>{data.profile.stageName.slice(0, 1)}</span>
                )}
              </div>
              <div>
                <p className="studio-kicker">
                  {data.profile.categories.join(" · ")}
                </p>
                <h1>{data.profile.stageName}</h1>
                <p>
                  {data.profile.city}{" "}
                  {data.profile.region ? `/ ${data.profile.region}` : ""}
                </p>
                <p className="studio-description">{data.profile.description}</p>
                <p>{data.profile.languages.join(" · ")}</p>
                <p>{data.profile.attributes.join(" · ")}</p>
                {settings.data?.showContact &&
                  !data.profile.demoContactDisabled && (
                    <div className="studio-actions">
                      {links.whatsapp && (
                        <a
                          className="studio-cta"
                          href={links.whatsapp}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Contato profissional pelo WhatsApp
                        </a>
                      )}
                      {links.tel && (
                        <a className="studio-cta secondary" href={links.tel}>
                          Ligar
                        </a>
                      )}
                    </div>
                  )}
              </div>
            </section>
            <h2>Trabalhos e apresentação</h2>
            <div className="studio-gallery">
              {data.media
                .filter(m => !m.isPremium)
                .map(m => (
                  <figure key={m.id}>
                    {m.kind === "photo" ? (
                      <img
                        src={m.url}
                        alt={m.title || `Trabalho de ${data.profile.stageName}`}
                        loading="lazy"
                      />
                    ) : (
                      <video src={m.url} controls preload="metadata" />
                    )}
                    {m.title && <figcaption>{m.title}</figcaption>}
                  </figure>
                ))}
            </div>
            {!data.media.length && (
              <p>Nenhum arquivo público neste portfólio.</p>
            )}
          </>
        )}
      </main>
    </div>
  );
}
