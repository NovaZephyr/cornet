import "./core/dark.css";
import "./core/light.css";
import "./youtube/2005.css";
import "./youtube/2007.css";
import "./youtube/2009.css";
import "./youtube/2012.css";
import "./youtube/2013.css";
import "./youtube/2019.css";
import "./custom/cosmic-panda.css";
import "./gradients/ocean.css";
import "./gradients/sunset.css";
import "./gradients/neon.css";
import "./gradients/candy.css";

/**
 * Cornet theme registry.
 * Themes are visual skins only. Channel/page layout remains owned by the
 * application and by the user's saved layout preferences.
 */
export const THEME_REGISTRY = {
  dark: { group: "core", label: "Cornet Dark" },
  light: { group: "core", label: "Cornet Light" },
  "yt-2005": { group: "youtube", label: "YouTube 2005" },
  "yt-2007": { group: "youtube", label: "YouTube 2007" },
  "yt-2009": { group: "youtube", label: "YouTube 2009" },
  "yt-2012": { group: "youtube", label: "YouTube 2012" },
  "yt-2013": { group: "youtube", label: "YouTube 2013" },
  "yt-2019": { group: "youtube", label: "YouTube 2019" },
  "cosmic-panda": { group: "custom", label: "Cosmic Panda" },
  "grad-ocean": { group: "gradients", label: "Ocean" },
  "grad-sunset": { group: "gradients", label: "Sunset" },
  "grad-neon": { group: "gradients", label: "Neon" },
  "grad-candy": { group: "gradients", label: "Candy" },
} as const;

export type ThemeId = keyof typeof THEME_REGISTRY;

export function isThemeId(value: string): value is ThemeId {
  return value in THEME_REGISTRY;
}
