import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  /** Páginas públicas ficam sempre claras, mesmo com tema escuro salvo no navegador. */
  setForceLight: (value: boolean) => void;
  forceLight: boolean;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  switchable?: boolean;
}

export function ThemeProvider({
  children,
  defaultTheme = "light",
  switchable = false,
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (switchable) {
      try { const stored = localStorage.getItem("ero-theme"); return stored === "light" || stored === "dark" ? stored : defaultTheme; } catch { return defaultTheme; }
    }
    return defaultTheme;
  });

  const [forceLight, setForceLight] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark" && !forceLight) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" && !forceLight ? "#2a2432" : "#ffffff");

    if (switchable) {
      try { localStorage.setItem("ero-theme", theme); } catch { /* Theme still works without storage. */ }
    }
  }, [theme, switchable, forceLight]);

  const toggleTheme = switchable
    ? () => {
        setTheme(prev => (prev === "light" ? "dark" : "light"));
      }
    : undefined;

  return (
    <ThemeContext.Provider
      value={{ theme, toggleTheme, switchable, setForceLight, forceLight }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

/**
 * Páginas públicas seguem a escolha do visitante (claro por padrão, escuro pelo botão do topo).
 * Mantida como gancho para que cada página continue declarando que é pública.
 */
export function usePublicLight() {
  useTheme();
}
