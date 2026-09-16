import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { THEME_REGISTRY, resolveThemeId, type ThemeId } from "@/themes/registry";

export type { ThemeId };

const THEME_GROUP_HINTS: Record<string, string> = { core: "Tema base de Cornet.", youtube: "Recreación histórica de YouTube.", custom: "Experiencia completa personalizada.", gradients: "Fondos con degradados animados.", community: "Paletas creadas por la comunidad.", accessibility: "Pensado para mayor legibilidad.", retro: "Estética retro de escritorio.", experimental: "Efectos visuales experimentales." };

export const THEMES = Object.entries(THEME_REGISTRY).map(([id, definition]) => ({ id, label: definition.label, group: definition.group, hint: THEME_GROUP_HINTS[definition.group] ?? definition.label, kind: definition.group === "custom" ? "custom" : "normal" })) as ReadonlyArray<{ id: ThemeId; label: string; group: string; hint: string; kind: string }>;
export type PresetThemeId = ThemeId | "system";
export type CustomTheme = { background: string; foreground: string; surface: string; surfaceHover: string; card: string; primary: string; secondary: string; accent: string; border: string; sidebar: string; gradientEnabled: boolean; gradientFrom: string; gradientTo: string; gradientAngle: number };
export const DEFAULT_CUSTOM_THEME: CustomTheme = { background: "#10131a", foreground: "#f5f7fb", surface: "#181d27", surfaceHover: "#222938", card: "#151a23", primary: "#5b8cff", secondary: "#2c3850", accent: "#7aa2ff", border: "#30394b", sidebar: "#0c0f15", gradientEnabled: false, gradientFrom: "#5b8cff", gradientTo: "#9b6cff", gradientAngle: 135 };
const STORAGE_KEY = "corenetwork-theme-v3";
const CUSTOM_STORAGE_KEY = "corenetwork-custom-theme-v1";
const DEFAULT_THEME: PresetThemeId = "grad-ocean";
const VALID: string[] = ["system", ...Object.keys(THEME_REGISTRY)];

function readInitialTheme(): PresetThemeId | "custom" {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem("corenetwork-theme-v2") || window.localStorage.getItem("corenetwork-theme");
  if (stored === "custom") return "custom";
  const resolved = stored ? resolveThemeId(stored) : undefined;
  return resolved || (stored === "system" ? "system" : DEFAULT_THEME);
}
function readCustomTheme(): CustomTheme {
  if (typeof window === "undefined") return DEFAULT_CUSTOM_THEME;
  try { return { ...DEFAULT_CUSTOM_THEME, ...(JSON.parse(window.localStorage.getItem(CUSTOM_STORAGE_KEY) || "null") || {}) }; } catch { return DEFAULT_CUSTOM_THEME; }
}

function apply(theme: PresetThemeId | "custom", customTheme: CustomTheme) {
  const root = document.documentElement;
  const resolved = theme === "custom" || theme === "system" ? theme : resolveThemeId(theme) || DEFAULT_THEME;
  const definition = resolved !== "custom" && resolved !== "system" ? THEME_REGISTRY[resolved] : undefined;
  const themeKind = theme === "custom" ? "custom" : definition?.group ?? "normal";
  const mediaDark = theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = resolved;
  root.dataset.themeKind = themeKind;
  root.classList.toggle("dark", theme === "system" ? mediaDark : theme !== "light" && theme !== "sepia" && theme !== "grayscale" && theme !== "solarized-light" && theme !== "yt-2009" && theme !== "yt-2013" && theme !== "yt-2019" && theme !== "liquid-glass" && theme !== "windows-aero" && theme !== "frutiger-aero" && theme !== "web2-glossy" && theme !== "windows-xp-luna");
  root.style.colorScheme = root.classList.contains("dark") ? "dark" : "light";
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

type ThemeState = { theme: PresetThemeId | "custom"; customTheme: CustomTheme; setTheme: (theme: PresetThemeId | "custom") => void; setCustomTheme: (theme: CustomTheme) => void };
const ThemeContext = createContext<ThemeState | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<PresetThemeId | "custom">(readInitialTheme);
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
  const setTheme = useCallback((next: PresetThemeId | "custom") => { if (next === "system" || next === "custom" || Boolean(resolveThemeId(next))) setThemeState(next); }, []);
  const setCustomTheme = useCallback((next: CustomTheme) => { setCustomThemeState(next); setThemeState("custom"); }, []);
  const value = useMemo(() => ({ theme, customTheme, setTheme, setCustomTheme }), [theme, customTheme, setTheme, setCustomTheme]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
export function useTheme() { const ctx = useContext(ThemeContext); if (!ctx) throw new Error("useTheme must be used within ThemeProvider"); return ctx; }
