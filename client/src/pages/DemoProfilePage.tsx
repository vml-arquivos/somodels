import { Link, useParams } from "wouter";
import PublicFooter from "@/components/PublicFooter";
import Seo from "@/components/Seo";
import StudioHeader from "@/components/StudioHeader";
import { getDemoProfileBySlug } from "@shared/demo-profiles";

export default function DemoProfilePage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const profile = getDemoProfileBySlug(slug);

  if (!profile) {
    return (
      <div className="studio">
        <Seo
          title="Prévia demonstrativa indisponível — Ero Models"
          description="Esta prévia demonstrativa não está disponível."
          path={`/demo/perfil/${slug}`}
          noindex
        />
        <StudioHeader />
        <main className="studio-main">
          <section className="studio-panel">
            <p className="studio-kicker">Prévia demonstrativa</p>
            <h1>Perfil indisponível</h1>
            <p>Esta demonstração não está disponível ou foi removida do catálogo.</p>
            <Link className="studio-cta" href="/">Voltar à vitrine</Link>
          </section>
        </main>
        <PublicFooter />
      </div>
    );
  }

  return (
    <div className="studio">
      <Seo
        title={`${profile.stageName} — Prévia demonstrativa | Ero Models`}
        description={`${profile.description} Perfil fictício, sem contato real e fora da publicação oficial.`}
        path={`/demo/perfil/${profile.slug}`}
        image={profile.avatarUrl}
        noindex
      />
      <StudioHeader />
      <main className="studio-main">
        <Link href="/">← Voltar à vitrine</Link>
        <div className="studio-demo-banner" role="note">
          <strong>Perfil demonstrativo</strong>
          <span>Conteúdo fictício para apresentar a experiência da plataforma. Não representa uma pessoa real e não possui contato acionável.</span>
        </div>
        <section className="studio-profile-hero">
          <div className="studio-cover">
            <img src={profile.avatarUrl} alt={`Imagem demonstrativa de ${profile.stageName}`} />
          </div>
          <div>
            <p className="studio-kicker">{profile.categories.join(" · ")}</p>
            <h1>{profile.stageName}</h1>
            <p>{profile.city} / {profile.region}</p>
            <p className="studio-description">{profile.description}</p>
            <p>{profile.languages.join(" · ")}</p>
            <p>{profile.attributes.join(" · ")}</p>
            <span className="studio-demo-badge">{profile.availabilityLabel}</span>
          </div>
        </section>
        <section className="studio-panel">
          <h2>Como funciona um perfil publicado</h2>
          <p>Perfis reais só entram na vitrine depois de cadastro, aceite dos termos, revisão de conteúdo e aprovação. Dados de contato não ficam expostos publicamente por padrão.</p>
          <Link className="studio-cta" href="/cadastro">Criar meu portfólio</Link>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
