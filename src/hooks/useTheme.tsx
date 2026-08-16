import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export const THEMES = [
  { id: "dark", label: "Oscuro", hint: "El look clásico de CoreNetwork", group: "Básicos" },
  { id: "light", label: "Claro", hint: "Fondo blanco, alto contraste", group: "Básicos" },
  { id: "retro2012", label: "2012", hint: "Nostalgia estilo YouTube 2012", group: "Básicos" },
  { id: "gradients", label: "Aurora", hint: "Violeta, rojo y azul", group: "Degradados" },
  { id: "grad-sunset", label: "Atardecer", hint: "Naranja y magenta", group: "Degradados" },
  { id: "grad-ocean", label: "Océano", hint: "Azul profundo y turquesa", group: "Degradados" },
  { id: "grad-neon", label: "Neón", hint: "Verde y cian eléctrico", group: "Degradados" },
  { id: "grad-candy", label: "Candy", hint: "Rosa suave y lavanda", group: "Degradados" },
] as const;

export type ThemeId = (typeof THEMES)[number]["id"];

const STORAGE_KEY = "corenetwork-theme";
const VALID: ThemeId[] = THEMES.map((t) => t.id);

function apply(theme: ThemeId) {
  const root = document.documentElement;
  root.dataset["theme"] = theme;
  // El variant `dark` de Tailwind sigue funcionando en los temas oscuros.
  root.classList.toggle("dark", theme !== "light" && theme !== "retro2012");
}

type ThemeState = {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
};

const ThemeContext = createContext<ThemeState | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("dark");

  useEffect(() => {
    const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    const initial = stored && VALID.includes(stored) ? stored : "dark";
    setThemeState(initial);
    apply(initial);
  }, []);

  const setTheme = useCallback((next: ThemeId) => {
    setThemeState(next);
    apply(next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
