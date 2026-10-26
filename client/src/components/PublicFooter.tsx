import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { defaultSiteSettings } from "@shared/portfolio";

const footerPaths = [
  ["/#anuncios", "/#categorias", "/conta"],
  ["/cadastro", "/titular", "/login"],
  ["/seguranca", "/privacidade", "/denuncia"],
  ["/termos", "/ajuda", "/contato"],
] as const;

export default function PublicFooter() {
  const settings = trpc.management.settings.useQuery();
  const footer = (settings.data || defaultSiteSettings).home.footer;
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
          <p>{footer.tagline}</p>
          <span>{footer.ageNote}</span>
        </div>
        <nav
          className="studio-footer-columns"
          aria-label="Navegação institucional"
        >
          {footer.groups.map((group, groupIndex) => (
            <div key={`${group.title}-${groupIndex}`}>
              <h3>{group.title}</h3>
              {group.links.map((link, linkIndex) => (
                <Link
                  key={`${link.label}-${linkIndex}`}
                  href={footerPaths[groupIndex][linkIndex]}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
      <div className="studio-footer-bottom">
        <span>
          <Link href="/como-anunciar">Como anunciar</Link>
          {" · "}
          <Link href="/calculadora-de-ganhos">Calculadora de ganhos</Link>
          {" · "}
          <Link href="/planos">Planos</Link>
          {" · "}
          <a href="tel:100">Denunciar exploração sexual: Disque 100</a>
        </span>
        <span>{footer.signature}</span>
        <span>{footer.closing}</span>
      </div>
    </footer>
  );
}
