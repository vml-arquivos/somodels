import { Link, useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import Icon from "@/components/Icon";
import type { IconName } from "@/lib/home-content";

type Tab = {
  href: string;
  label: string;
  icon: IconName;
  active: boolean;
  highlight?: boolean;
  anchor?: string;
};

export function jumpTo(anchor: string, event: React.MouseEvent) {
  if (window.location.pathname !== "/") return;
  event.preventDefault();
  document.getElementById(anchor)?.scrollIntoView({ behavior: "smooth" });
  window.history.replaceState(null, "", `/#${anchor}`);
}

/** Barra de navegação fixa no rodapé do celular, no estilo de aplicativo. */
export default function MobileTabBar() {
  const [location] = useLocation();
  const { user } = useAuth();
  const tabs: Tab[] = [
    { href: "/", label: "Início", icon: "home", active: location === "/" },
    {
      href: "/#anuncios",
      label: "Buscar",
      icon: "search",
      active: false,
      anchor: "anuncios",
    },
    {
      href: user ? "/titular" : "/cadastro",
      label: "Anunciar",
      icon: "plus",
      active: location.startsWith("/titular") || location === "/cadastro",
      highlight: true,
    },
    {
      href: user ? "/conta" : "/login",
      label: user ? "Conta" : "Entrar",
      icon: "user",
      active: location === "/conta" || location === "/login",
    },
  ];
  return (
    <nav className="ep-tabbar" aria-label="Navegação do aplicativo">
      {tabs.map(tab => (
        <Link
          key={tab.label}
          href={tab.href}
          className={`ep-tab${tab.active ? " is-active" : ""}${tab.highlight ? " is-highlight" : ""}`}
          aria-current={tab.active ? "page" : undefined}
          onClick={event => tab.anchor && jumpTo(tab.anchor, event)}
        >
          <span className="ep-tab-icon">
            <Icon name={tab.icon} size={tab.highlight ? 24 : 22} />
          </span>
          <span className="ep-tab-label">{tab.label}</span>
        </Link>
      ))}
    </nav>
  );
}
