import { Link } from "wouter";
import { useTheme } from "@/contexts/ThemeContext";

export default function StudioHeader({
  children,
}: {
  children?: React.ReactNode;
}) {
  const { theme, toggleTheme } = useTheme();
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
        <nav aria-label="Navegação principal">
          <Link href="/#portfolios">Visualizar todos</Link>
          <Link href="/#busca">Buscar</Link>
          <Link href="/#categorias">Categorias</Link>
          <Link href="/login" className="studio-header-login">Entrar</Link>
        </nav>
        {children ? <div className="studio-header-extra">{children}</div> : null}
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
