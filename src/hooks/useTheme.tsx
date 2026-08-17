import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

// Theme catalog — keep new themes here so they are available in every selector.
export const THEMES = [
  { id: "grad-ocean", label: "Océano", hint: "Azul fresco, turquesa y cristal", group: "Recomendado" },
  { id: "dark", label: "Oscuro", hint: "El look clásico de CoreNetwork", group: "Básicos" },
  { id: "light", label: "Claro", hint: "Fondo blanco, alto contraste", group: "Básicos" },
  { id: "lavanda-oscuro", label: "Lavanda Oscuro", hint: "Violeta oscuro basado en #4B3B61", group: "Oscuros" },
  { id: "retro2012", label: "YouTube 2012 / Cosmic Panda", hint: "Composición retro inspirada en la era Cosmic Panda", group: "Clásicos" },
  { id: "gradients", label: "Aurora", hint: "Violeta, rojo y azul", group: "Degradados" },
  { id: "grad-sunset", label: "Atardecer", hint: "Naranja y magenta", group: "Degradados" },
  { id: "grad-neon", label: "Neón", hint: "Verde y cian eléctrico", group: "Degradados" },
  { id: "grad-candy", label: "Candy", hint: "Rosa suave y lavanda", group: "Degradados" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];
// Bump the storage key when adding themes so an older cached theme selection cannot hide new options.
const STORAGE_KEY = "corenetwork-theme-v2";
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
  root.classList.toggle("dark", !("light" === theme || "retro2012" === theme || "grad-candy" === theme));

  if (theme === "lavanda-oscuro") {
    const colors: Record<string, string> = {
      "--background": "#241d30",
      "--foreground": "#f7f3fb",
      "--surface": "#302642",
      "--surface-hover": "#3a2e4b",
      "--card": "#2b2238",
      "--card-foreground": "#f7f3fb",
      "--popover": "#2d243b",
      "--popover-foreground": "#f7f3fb",
      "--primary": "#4B3B61",
      "--primary-foreground": "#ffffff",
      "--secondary": "#3a2e4b",
      "--secondary-foreground": "#f7f3fb",
      "--muted": "#352a46",
      "--muted-foreground": "#c7bdd2",
      "--accent": "#5b4974",
      "--accent-foreground": "#ffffff",
      "--border": "#514364",
      "--input": "#332940",
      "--ring": "#80669f",
      "--sidebar": "#211a2c",
      "--sidebar-foreground": "#f7f3fb",
      "--sidebar-primary": "#4B3B61",
      "--sidebar-primary-foreground": "#ffffff",
      "--sidebar-accent": "#302642",
      "--sidebar-accent-foreground": "#f7f3fb",
      "--sidebar-border": "#514364",
      "--sidebar-ring": "#80669f",
    };
    Object.entries(colors).forEach(([name, value]) => root.style.setProperty(name, value));
    root.style.setProperty("--verified", "#8eb8ff");
    root.style.setProperty("--partner", "#e2c56b");
  } else {
    const lavandaVariables = [
      "--background", "--foreground", "--surface", "--surface-hover", "--card", "--card-foreground",
      "--popover", "--popover-foreground", "--primary", "--primary-foreground", "--secondary",
      "--secondary-foreground", "--muted", "--muted-foreground", "--accent", "--accent-foreground",
      "--border", "--input", "--ring", "--sidebar", "--sidebar-foreground", "--sidebar-primary",
      "--sidebar-primary-foreground", "--sidebar-accent", "--sidebar-accent-foreground", "--sidebar-border",
      "--sidebar-ring", "--verified", "--partner",
    ];
    lavandaVariables.forEach((name) => root.style.removeProperty(name));
  }
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
