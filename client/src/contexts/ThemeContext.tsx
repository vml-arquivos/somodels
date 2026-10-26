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
      try { const stored = localStorage.getItem("theme"); return stored === "light" || stored === "dark" ? stored : defaultTheme; } catch { return defaultTheme; }
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

    if (switchable) {
      try { localStorage.setItem("theme", theme); } catch { /* Theme still works without storage. */ }
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

/** Use nas páginas públicas: força o visual claro enquanto a página está aberta. */
export function usePublicLight() {
  const { setForceLight } = useTheme();
  useEffect(() => {
    setForceLight(true);
    return () => setForceLight(false);
  }, [setForceLight]);
}
