import { Link } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { defaultSiteSettings } from "@shared/portfolio";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function StudioHeader({
  children,
  minimal = false,
}: {
  children?: React.ReactNode;
  minimal?: boolean;
}) {
  const { theme, toggleTheme, forceLight } = useTheme();
  const { user } = useAuth();
  const settings = trpc.management.settings.useQuery();
  const nav = (settings.data || defaultSiteSettings).home.nav;
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null
  );
  const darkChrome = theme === "dark" && !forceLight;

  useEffect(() => {
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onAppInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }

  const close = () => setMenuOpen(false);
  const links = (
    <>
      <Link href="/#anuncios" onClick={close}>
        {nav.explore}
      </Link>
      <Link href="/#categorias" onClick={close}>
        {nav.categories}
      </Link>
      <Link href="/planos" onClick={close}>
        Planos
      </Link>
      <Link href="/como-anunciar" onClick={close}>
        Como anunciar
      </Link>
    </>
  );

  return (
    <header className="ep-header">
      <div className="ep-header-inner">
        <Link href="/" className="ep-brand" aria-label="Ero Models — início">
          <img
            src={darkChrome ? "/brand/logo-light.svg" : "/brand/logo.svg"}
            alt="Ero Models"
            className="ep-brand-logo"
            width="180"
            height="56"
          />
        </Link>
        {!minimal && (
          <nav className="ep-nav" aria-label="Navegação principal">
            {links}
          </nav>
        )}
        <div className="ep-header-actions">
          {children ? <div className="ep-header-extra">{children}</div> : null}
          {installPrompt ? (
            <button
              type="button"
              className="ep-header-link"
              onClick={() => void installApp()}
            >
              {nav.install}
            </button>
          ) : null}
          {toggleTheme && !forceLight ? (
            <button
              type="button"
              className="ep-header-link"
              onClick={toggleTheme}
              aria-label={`Usar tema ${theme === "dark" ? nav.themeLight : nav.themeDark}`}
            >
              {theme === "dark" ? nav.themeLight : nav.themeDark}
            </button>
          ) : null}
          {!minimal &&
            (user ? (
              <>
                <Link href="/conta" className="ep-header-link ep-hide-sm">
                  {nav.account}
                </Link>
                <Link href="/titular" className="ep-header-cta">
                  {nav.owner}
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="ep-header-link">
                  {nav.login}
                </Link>
                <Link href="/cadastro" className="ep-header-cta">
                  {nav.createProfile}
                </Link>
              </>
            ))}
          {!minimal && (
            <button
              type="button"
              className="ep-menu-button"
              aria-expanded={menuOpen}
              aria-controls="ep-mobile-menu"
              aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
              onClick={() => setMenuOpen(open => !open)}
            >
              <span aria-hidden="true" />
              <span aria-hidden="true" />
              <span aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {!minimal && menuOpen && (
        <nav
          id="ep-mobile-menu"
          className="ep-mobile-menu"
          aria-label="Menu"
        >
          {links}
          {user ? (
            <Link href="/conta" onClick={close}>
              {nav.account}
            </Link>
          ) : (
            <Link href="/login" onClick={close}>
              {nav.login}
            </Link>
          )}
          <Link href="/contato" onClick={close}>
            Contato
          </Link>
        </nav>
      )}
    </header>
  );
}
