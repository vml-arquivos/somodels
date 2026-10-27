import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import MobileTabBar from "@/components/MobileTabBar";
import InstallBanner from "@/components/InstallBanner";
import { useTheme } from "@/contexts/ThemeContext";
import { defaultSiteSettings } from "@shared/portfolio";

const footerPaths = [
  ["/#anuncios", "/#categorias", "/conta"],
  ["/cadastro", "/titular", "/login"],
  ["/seguranca", "/privacidade", "/denuncia"],
  ["/termos", "/ajuda", "/contato"],
] as const;

export default function PublicFooter() {
  const { theme } = useTheme();
  const settings = trpc.management.settings.useQuery();
  const footer = (settings.data || defaultSiteSettings).home.footer;
  return (
    <>
      <footer className="ep-footer">
        <div className="ep-footer-inner">
          <div className="ep-footer-brand">
            <img
              src={
                theme === "dark" ? "/brand/logo-light.svg" : "/brand/logo.svg"
              }
              alt="Ero Models"
              width="196"
              height="72"
              loading="lazy"
            />
            <p>{footer.tagline}</p>
            <span className="ep-footer-age">{footer.ageNote}</span>
          </div>
          <nav
            className="ep-footer-columns"
            aria-label="Navegação institucional"
          >
            {footer.groups.map((group, groupIndex) => (
              <div key={`${group.title}-${groupIndex}`}>
                <h3>{group.title}</h3>
                <ul>
                  {group.links.map((link, linkIndex) => (
                    <li key={`${link.label}-${linkIndex}`}>
                      <Link href={footerPaths[groupIndex][linkIndex]}>
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <div className="ep-footer-bottom">
          <span>{footer.signature}</span>
          <span>
            <Link href="/planos">Planos</Link>
            <Link href="/como-anunciar">Como anunciar</Link>
            <Link href="/calculadora-de-ganhos">Calculadora de ganhos</Link>
            <a href="tel:100">Disque 100: denúncia de exploração sexual</a>
          </span>
        </div>
      </footer>
      <MobileTabBar />
      <InstallBanner />
    </>
  );
}
