import { Link } from "wouter";

export default function PublicFooter() {
  return (
    <footer className="studio-footer studio-landing-footer">
      <div className="studio-footer-inner">
        <div className="studio-footer-brand">
          <img
            src="/brand/logo-light.svg"
            alt="Ero Models"
            width="148"
            height="46"
          />
          <p>
            Uma vitrine adulta para descobrir perfis com clareza, respeito e
            privacidade.
          </p>
          <span>Conteúdo exclusivo para maiores de 18 anos.</span>
        </div>
        <nav
          className="studio-footer-columns"
          aria-label="Navegação institucional"
        >
          <div>
            <h3>Explorar</h3>
            <Link href="/#anuncios">Ver anúncios</Link>
            <Link href="/#categorias">Categorias</Link>
            <Link href="/conta">Minha conta</Link>
          </div>
          <div>
            <h3>Para titulares</h3>
            <Link href="/cadastro">Criar meu perfil</Link>
            <Link href="/titular">Área do titular</Link>
            <Link href="/login">Entrar</Link>
          </div>
          <div>
            <h3>Segurança</h3>
            <Link href="/seguranca">Como funciona</Link>
            <Link href="/privacidade">Privacidade</Link>
            <Link href="/denuncia">Denúncias</Link>
          </div>
          <div>
            <h3>Institucional</h3>
            <Link href="/termos">Termos</Link>
            <Link href="/ajuda">Ajuda</Link>
            <Link href="/contato">Contato</Link>
          </div>
        </nav>
      </div>
      <div className="studio-footer-bottom">
        <span>Ero Models • Portal adulto de anúncios.</span>
        <span>Respeito, segurança e dignidade.</span>
      </div>
    </footer>
  );
}
