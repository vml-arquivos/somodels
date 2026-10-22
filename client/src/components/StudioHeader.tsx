import { Link } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";

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
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

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
          src={theme === "dark" ? "/brand/logo-light.svg" : "/brand/logo.svg"}
          alt="Ero Models"
          className="studio-brand-logo"
          width="180"
          height="56"
        />
      </Link>
      <div className="studio-header-menu">
        {!minimal && (
          <nav aria-label="Navegação principal">
            <Link href="/#anuncios">Visualizar todos</Link>
            <Link href="/#busca">Buscar</Link>
            <Link href="/#categorias">Categorias</Link>
            {user ? (
              <>
                <Link href="/conta">Minha conta</Link>
                <Link href="/titular">Área do titular</Link>
              </>
            ) : (
              <Link href="/login" className="studio-header-login">Entrar</Link>
            )}
          </nav>
        )}
        {children ? <div className="studio-header-extra">{children}</div> : null}
        {installPrompt ? (
          <button className="studio-install-button" onClick={() => void installApp()}>
            Instalar app
          </button>
        ) : null}
        {toggleTheme ? (
          <button
            className="studio-theme-toggle"
            onClick={toggleTheme}
            aria-label={`Usar tema ${theme === "dark" ? "claro" : "escuro"}`}
          >
            {theme === "dark" ? "Tema claro" : "Tema escuro"}
          </button>
        ) : null}
      </div>
    </header>
  );
}
