export type ExtensionKey = "compact-mode" | "cinema-player" | "classic-navigation" | "reduced-motion" | "dense-feed" | "channel-badges" | "experimental-layouts";

export type ExtensionDefinition = {
  key: ExtensionKey;
  name: string;
  description: string;
  category: "Interface" | "Playback" | "Channels" | "Accessibility";
};

export const EXTENSIONS: ExtensionDefinition[] = [
  { key: "compact-mode", name: "Modo compacto", description: "Reduce espacios y hace más densa la interfaz.", category: "Interface" },
  { key: "cinema-player", name: "Reproductor cine", description: "Amplía el reproductor en páginas de vídeo.", category: "Playback" },
  { key: "classic-navigation", name: "Navegación clásica", description: "Usa controles y navegación más cercanos a las interfaces históricas.", category: "Interface" },
  { key: "reduced-motion", name: "Reducir movimiento", description: "Reduce transiciones y animaciones de la interfaz.", category: "Accessibility" },
  { key: "dense-feed", name: "Feed denso", description: "Muestra más contenido por fila en listados y canales.", category: "Interface" },
  { key: "channel-badges", name: "Badges de canal", description: "Mantiene visibles distintivos y roles del canal.", category: "Channels" },
  { key: "experimental-layouts", name: "Layouts experimentales", description: "Permite usar layouts nuevos antes de que sean recomendados.", category: "Channels" },
];

const STORAGE_KEY = "corenetwork-extensions-v1";
export type ExtensionState = Record<ExtensionKey, boolean>;
export const DEFAULT_EXTENSIONS: ExtensionState = {
  "compact-mode": false,
  "cinema-player": false,
  "classic-navigation": false,
  "reduced-motion": false,
  "dense-feed": false,
  "channel-badges": true,
  "experimental-layouts": false,
};

export function readExtensions(): ExtensionState {
  if (typeof window === "undefined") return DEFAULT_EXTENSIONS;
  try {
    return { ...DEFAULT_EXTENSIONS, ...(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {}) };
  } catch {
    return DEFAULT_EXTENSIONS;
  }
}

export function saveExtensions(state: ExtensionState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  document.documentElement.dataset.extensions = Object.entries(state).filter(([, enabled]) => enabled).map(([key]) => key).join(" ");
}
