import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const THEMES = [
  { id: "grad-ocean", label: "Océano", hint: "Azul fresco, turquesa y cristal", group: "Recomendado" },
  { id: "dark", label: "Oscuro", hint: "El look clásico de CoreNetwork", group: "Básicos" },
  { id: "light", label: "Claro", hint: "Fondo blanco, alto contraste", group: "Básicos" },
  { id: "retro2012", label: "YouTube 2012 / Cosmic Panda", hint: "Composición retro inspirada en la era Cosmic Panda", group: "Clásicos" },
  { id: "gradients", label: "Aurora", hint: "Violeta, rojo y azul", group: "Degradados" },
  { id: "grad-sunset", label: "Atardecer", hint: "Naranja y magenta", group: "Degradados" },
  { id: "grad-neon", label: "Neón", hint: "Verde y cian eléctrico", group: "Degradados" },
  { id: "grad-candy", label: "Candy", hint: "Rosa suave y lavanda", group: "Degradados" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
const STORAGE_KEY = "corenetwork-theme";
const VALID: ThemeId[] = THEMES.map((t) => t.id);
const DEFAULT_THEME: ThemeId = "grad-ocean";

function readInitialTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
  return stored && VALID.includes(stored) ? stored : DEFAULT_THEME;
}

function apply(theme: ThemeId) {
  const root = document.documentElement;
  root.dataset.theme = theme;
  root.classList.toggle("dark", !(["light", "retro2012", "grad-candy"] as ThemeId[]).includes(theme));
}

type ThemeState = { theme: ThemeId; setTheme: (theme: ThemeId) => void };
const ThemeContext = createContext<ThemeState | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readInitialTheme);

  useEffect(() => {
    apply(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((next: ThemeId) => {
    if (!VALID.includes(next)) return;
    setThemeState(next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
