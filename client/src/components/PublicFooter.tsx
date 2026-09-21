import { Link } from "wouter";

export default function PublicFooter() {
  return (
    <footer className="studio-footer">
      <span> Só Models • Portfólios profissionais de modelos e criadores.</span>
      <nav aria-label="Informações da plataforma">
        <Link href="/termos">Termos</Link>
        <Link href="/privacidade">Privacidade</Link>
        <Link href="/seguranca">Segurança</Link>
        <Link href="/denuncia">Denúncias</Link>
        <Link href="/ajuda">Ajuda</Link>
        <Link href="/contato">Contato</Link>
      </nav>
    </footer>
  );
}
