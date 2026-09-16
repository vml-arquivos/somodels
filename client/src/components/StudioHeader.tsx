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
      <Link href="/" className="studio-brand">
        Só<span>Models</span>
      </Link>
      <nav>
        <Link href="/">Vitrine</Link>
        <Link href="/titular">Meu portfólio</Link>
        <button
          onClick={toggleTheme}
          aria-label={`Usar tema ${theme === "dark" ? "claro" : "escuro"}`}
        >
          {theme === "dark" ? "Tema claro" : "Tema escuro"}
        </button>
        {children}
      </nav>
    </header>
  );
}
