import { Link } from "wouter";

export default function PublicFooter() {
  return (
    <footer className="studio-footer">
      <span>Ero Models • Portfólios profissionais de modelos e criadores.</span>
      <nav aria-label="Informações da plataforma">
        <Link href="/cadastro">Criar meu portfólio</Link>
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
