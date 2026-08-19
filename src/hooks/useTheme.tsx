import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const THEMES = [
  { id: "grad-ocean", label: "Océano", hint: "Azul fresco, turquesa y cristal", group: "Recomendado", kind: "normal" },
  { id: "system", label: "Sistema", hint: "Sigue automáticamente el modo del sistema", group: "Básicos", kind: "normal" },
  { id: "dark", label: "Oscuro", hint: "El look clásico de CoreNetwork", group: "Básicos", kind: "normal" },
  { id: "light", label: "Claro", hint: "Fondo blanco, alto contraste", group: "Básicos", kind: "normal" },
  { id: "youtube-2009", label: "YouTube 2009", hint: "Blanco, azul y rojo clásico", group: "Históricos", kind: "custom" },
  { id: "retro2012", label: "YouTube 2012 / Cosmic Panda", hint: "Custom claro inspirado en Cosmic Panda", group: "Históricos", kind: "custom" },
  { id: "youtube-2013", label: "YouTube 2013", hint: "Blanco, rojo y superficies suaves", group: "Históricos", kind: "custom" },
  { id: "youtube2019", label: "YouTube 2019 / Polymer", hint: "Polymer claro e independiente", group: "Históricos", kind: "custom" },
  { id: "feather2013", label: "Feather 2013", hint: "Tema claro ligero y autónomo", group: "Clásicos", kind: "normal" },
  { id: "dracula", label: "Dracula", hint: "Morado oscuro con acentos vivos", group: "Comunidad", kind: "custom" },
  { id: "nord", label: "Nord", hint: "Azules fríos y gris nórdico", group: "Comunidad", kind: "custom" },
  { id: "solarized-light", label: "Solarized Light", hint: "Crema cálido para lectura", group: "Comunidad", kind: "custom" },
  { id: "solarized-dark", label: "Solarized Dark", hint: "Azul petróleo y tonos Solarized", group: "Comunidad", kind: "custom" },
  { id: "gruvbox", label: "Gruvbox", hint: "Retro cálido y terroso", group: "Comunidad", kind: "custom" },
  { id: "tokyo-night", label: "Tokyo Night", hint: "Azul noche con neón suave", group: "Comunidad", kind: "custom" },
  { id: "catppuccin", label: "Catppuccin", hint: "Pasteles oscuros suaves", group: "Comunidad", kind: "custom" },
  { id: "high-contrast", label: "Alto contraste", hint: "Máxima separación entre texto y fondo", group: "Accesibilidad", kind: "custom" },
  { id: "sepia", label: "Sepia / Papel", hint: "Crema y marrón para lectura prolongada", group: "Accesibilidad", kind: "custom" },
  { id: "grayscale", label: "Escala de grises", hint: "Sin color, solo contraste y tono", group: "Accesibilidad", kind: "custom" },
  { id: "oled", label: "OLED Puro", hint: "Negro absoluto y acentos mínimos", group: "Confort", kind: "custom" },
  { id: "night-blue", label: "Modo Noche Azul", hint: "Azul oscuro para ver de noche", group: "Confort", kind: "custom" },
  { id: "forest", label: "Bosque", hint: "Verde profundo y natural", group: "Sólidos", kind: "normal" },
  { id: "midnight", label: "Medianoche", hint: "Azul noche y superficies suaves", group: "Sólidos", kind: "normal" },
  { id: "rose", label: "Rosa", hint: "Rosa oscuro con superficies cálidas", group: "Sólidos", kind: "normal" },
  { id: "lavanda-oscuro", label: "Lavanda Oscuro", hint: "Violeta oscuro", group: "Oscuros", kind: "normal" },
  { id: "vaporwave", label: "Vaporwave / Synthwave", hint: "Magenta, cian y retrofuturo", group: "Creativos", kind: "custom" },
  { id: "terminal-green", label: "Terminal Verde", hint: "Negro y fósforo verde", group: "Creativos", kind: "custom" },
  { id: "apple-silhouette", label: "Apple Silhouette", hint: "Colores vivos con siluetas negras", group: "Creativos", kind: "custom" },
  { id: "liquid-glass", label: "Liquid Glass", hint: "Cristal translúcido inspirado en Apple, con identidad Cornet", group: "Creativos", kind: "custom" },
  { id: "windowsAero", label: "Windows Aero", hint: "Vidrio azul y transparencias", group: "Retro", kind: "custom" },
  { id: "frutigerAero", label: "Frutiger Aero", hint: "Cielo, agua, naturaleza y brillo", group: "Retro", kind: "custom" },
  { id: "web2Glossy", label: "Web 2.0 Glossy", hint: "Gradientes brillantes y botones clásicos", group: "Retro", kind: "custom" },
  { id: "y2kChrome", label: "Y2K Chrome", hint: "Metal, azul eléctrico y tecnología", group: "Retro", kind: "custom" },
  { id: "xpLuna", label: "Windows XP Luna", hint: "Azul XP, verde y superficies clásicas", group: "Retro", kind: "custom" },
  { id: "crtVhs", label: "CRT / VHS", hint: "Scanlines, fósforo verde y monitor antiguo", group: "Experimental", kind: "custom" },
  { id: "gradients", label: "Aurora", hint: "Violeta, rojo y azul", group: "Degradados", kind: "normal" },
  { id: "grad-sunset", label: "Atardecer", hint: "Naranja y magenta", group: "Degradados", kind: "normal" },
  { id: "grad-neon", label: "Neón", hint: "Verde y cian eléctrico", group: "Degradados", kind: "normal" },
  { id: "grad-candy", label: "Candy", hint: "Rosa suave y lavanda", group: "Degradados", kind: "normal" },
] as const;

export type PresetThemeId = (typeof THEMES)[number]["id"];
export type ThemeId = PresetThemeId | "custom";
export type CustomTheme = { background: string; foreground: string; surface: string; surfaceHover: string; card: string; primary: string; secondary: string; accent: string; border: string; sidebar: string; gradientEnabled: boolean; gradientFrom: string; gradientTo: string; gradientAngle: number };
export const DEFAULT_CUSTOM_THEME: CustomTheme = { background: "#10131a", foreground: "#f5f7fb", surface: "#181d27", surfaceHover: "#222938", card: "#151a23", primary: "#5b8cff", secondary: "#2c3850", accent: "#7aa2ff", border: "#30394b", sidebar: "#0c0f15", gradientEnabled: false, gradientFrom: "#5b8cff", gradientTo: "#9b6cff", gradientAngle: 135 };
const STORAGE_KEY = "corenetwork-theme-v3";
const CUSTOM_STORAGE_KEY = "corenetwork-custom-theme-v1";
const DEFAULT_THEME: ThemeId = "grad-ocean";
const VALID: ThemeId[] = [...THEMES.map((t) => t.id), "custom"];

function readInitialTheme(): ThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = (window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem("corenetwork-theme-v2") || window.localStorage.getItem("corenetwork-theme")) as ThemeId | null;
  return stored && VALID.includes(stored) ? stored : DEFAULT_THEME;
}

function readCustomTheme(): CustomTheme {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_THEME;
  try { return { ...DEFAULT_CUSTOM_THEME, ...(JSON.parse(window.localStorage.getItem(CUSTOM_STORAGE_KEY) || "null") || {}) }; }
  catch { return DEFAULT_CUSTOM_THEME; }
}

function apply(theme: ThemeId, customTheme: CustomTheme) {
  const root = document.documentElement;
  const definition = THEMES.find((item) => item.id === theme);
  const themeKind = theme === "custom" ? "custom" : definition?.kind ?? "normal";
  const isSystem = theme === "system";
  const mediaDark = isSystem && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const isLightTheme = !mediaDark && ["light", "system", "youtube-2009", "youtube-2013", "youtube2019", "feather2013", "solarized-light", "sepia", "grayscale", "apple-silhouette", "grad-candy"].includes(theme);
  root.dataset.theme = theme;
  root.dataset.themeKind = themeKind;
  root.classList.toggle("dark", !isLightTheme);
  root.style.colorScheme = isLightTheme ? "light" : "dark";
  if (theme !== "custom") {
    ["--background","--foreground","--surface","--surface-hover","--card","--card-foreground","--popover","--popover-foreground","--primary","--primary-foreground","--secondary","--secondary-foreground","--muted","--muted-foreground","--accent","--accent-foreground","--border","--input","--ring","--sidebar","--sidebar-foreground","--sidebar-primary","--sidebar-primary-foreground","--sidebar-accent","--sidebar-accent-foreground","--sidebar-border","--sidebar-ring","--verified","--partner","--cn-custom-gradient"].forEach((name) => root.style.removeProperty(name));
    return;
  }
  const vars: Record<string, string> = { "--background": customTheme.background, "--foreground": customTheme.foreground, "--surface": customTheme.surface, "--surface-hover": customTheme.surfaceHover, "--card": customTheme.card, "--card-foreground": customTheme.foreground, "--popover": customTheme.surface, "--popover-foreground": customTheme.foreground, "--primary": customTheme.primary, "--primary-foreground": "#fff", "--secondary": customTheme.secondary, "--secondary-foreground": customTheme.foreground, "--muted": customTheme.secondary, "--muted-foreground": `color-mix(in srgb, ${customTheme.foreground} 65%, transparent)`, "--accent": customTheme.accent, "--accent-foreground": "#fff", "--border": customTheme.border, "--input": customTheme.surface, "--ring": customTheme.accent, "--sidebar": customTheme.sidebar, "--sidebar-foreground": customTheme.foreground, "--sidebar-primary": customTheme.primary, "--sidebar-primary-foreground": "#fff", "--sidebar-accent": customTheme.surfaceHover, "--sidebar-accent-foreground": customTheme.foreground, "--sidebar-border": customTheme.border, "--sidebar-ring": customTheme.accent };
  Object.entries(vars).forEach(([name, value]) => root.style.setProperty(name, value));
  root.style.setProperty("--verified", customTheme.accent);
  root.style.setProperty("--partner", customTheme.primary);
  root.style.setProperty("--cn-custom-gradient", customTheme.gradientEnabled ? `linear-gradient(${customTheme.gradientAngle}deg, ${customTheme.gradientFrom}, ${customTheme.gradientTo})` : customTheme.background);
}

type ThemeState = { theme: ThemeId; customTheme: CustomTheme; setTheme: (theme: ThemeId) => void; setCustomTheme: (theme: CustomTheme) => void };
const ThemeContext = createContext<ThemeState | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(readInitialTheme);
  const [customTheme, setCustomThemeState] = useState<CustomTheme>(readCustomTheme);
  useEffect(() => {
    apply(theme, customTheme);
    window.localStorage.setItem(STORAGE_KEY, theme);
    window.localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(customTheme));
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system", customTheme);
    media.addEventListener?.("change", onChange);
    return () => media.removeEventListener?.("change", onChange);
  }, [theme, customTheme]);
  const setTheme = useCallback((next: ThemeId) => { if (VALID.includes(next)) setThemeState(next); }, []);
  const setCustomTheme = useCallback((next: CustomTheme) => { setCustomThemeState(next); setThemeState("custom"); }, []);
  const value = useMemo(() => ({ theme, customTheme, setTheme, setCustomTheme }), [theme, customTheme, setTheme, setCustomTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() { const ctx = useContext(ThemeContext); if (!ctx) throw new Error("useTheme must be used within ThemeProvider"); return ctx; }
