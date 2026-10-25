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
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();
  const settings = trpc.management.settings.useQuery();
  const nav = (settings.data || defaultSiteSettings).home.nav;
  const isEditorialLanding =
    !minimal &&
    (window.location.pathname === "/" ||
      window.location.pathname.startsWith("/cidade/") ||
      window.location.pathname.startsWith("/categoria/"));
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(
    null
  );

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

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") setInstallPrompt(null);
  }
  return (
    <header className="studio-header">
      <Link href="/" className="studio-brand" aria-label="Ero Models — início">
        <img
          src={
            isEditorialLanding || theme !== "dark"
              ? "/brand/logo.svg"
              : "/brand/logo-light.svg"
          }
          alt="Ero Models"
          className="studio-brand-logo"
          width="180"
          height="56"
        />
      </Link>
      <div className="studio-header-menu">
        {!minimal && (
          <nav aria-label="Navegação principal">
            <Link href="/#anuncios">{nav.explore}</Link>
            <Link href="/#busca">{nav.search}</Link>
            <Link href="/#categorias">{nav.categories}</Link>
            {user ? (
              <>
                <Link href="/conta">{nav.account}</Link>
                <Link href="/titular">{nav.owner}</Link>
              </>
            ) : (
              <Link href="/login" className="studio-header-login">
                {nav.login}
              </Link>
            )}
          </nav>
        )}
        {children ? (
          <div className="studio-header-extra">{children}</div>
        ) : null}
        {installPrompt ? (
          <button
            className="studio-install-button"
            onClick={() => void installApp()}
          >
            {nav.install}
          </button>
        ) : null}
        {toggleTheme ? (
          <button
            className="studio-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Usar tema ${theme === "dark" ? nav.themeLight : nav.themeDark}`}
          >
            {theme === "dark" ? nav.themeLight : nav.themeDark}
          </button>
        ) : null}
      </div>
    </header>
  );
}
