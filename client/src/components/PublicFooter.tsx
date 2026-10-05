import { Link } from "wouter";

export default function PublicFooter() {
  return (
    <footer className="studio-footer">
      <span>Ero Models • Portal adulto de anúncios para maiores de 18 anos.</span>
      <nav aria-label="Informações da plataforma">
        <Link href="/cadastro">Anunciar meu perfil</Link>
        <Link href="/login">Entrar</Link>
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
