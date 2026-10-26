import { Link } from "wouter";
import Seo from "@/components/Seo";
import PublicShell from "@/components/PublicShell";

export default function NotFound() {
  return (
    <>
      <Seo
        title="Página não encontrada — Ero Models"
        description="Esta página não existe."
        noindex
      />
      <PublicShell narrow>
        <section className="ep-empty">
          <p className="ep-eyebrow">Erro 404</p>
          <h1>Página não encontrada</h1>
          <p>O endereço pode estar errado ou o anúncio saiu do ar.</p>
          <Link className="ep-btn ep-btn-primary" href="/">
            Ver os anúncios
          </Link>
        </section>
      </PublicShell>
    </>
  );
}
