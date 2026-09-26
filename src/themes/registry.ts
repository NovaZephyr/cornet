import "./core/theme-bridge.css";
import "./core/dark.css";
import "./core/light.css";
import "./youtube/2005.css";
import "./youtube/2007.css";
import "./youtube/2009.css";
import "./youtube/2013.css";
import "./youtube/2019.css";
import "./youtube/classic-2006-2007.css";
import "./custom/cosmic-panda.css";
import "./gradients/ocean.css";
import "./gradients/sunset.css";
import "./gradients/neon.css";
import "./gradients/candy.css";
import "./community/dracula.css";
import "./community/nord.css";
import "./community/solarized.css";
import "./community/modern-dark.css";
import "./accessibility/high-contrast.css";
import "./accessibility/sepia.css";
import "./accessibility/grayscale.css";
import "./retro/windows-aero.css";
import "./retro/frutiger-aero.css";
import "./retro/web2-glossy.css";
import "./retro/y2k-chrome.css";
import "./retro/xp-luna.css";
import "./experimental/crt.css";
import "./experimental/vhs.css";

/** Visual theme registry. Themes never own structural/channel layout. */
export const THEME_REGISTRY = {
  dark:{group:"core",label:"Cornet Dark"}, light:{group:"core",label:"Cornet Light"},
  "yt-2005":{group:"youtube",label:"YouTube 2005"}, "yt-2007":{group:"youtube",label:"YouTube 2007"},
  "yt-classic":{group:"youtube",label:"YouTube Classic (2006–2007)"},
  "yt-2009":{group:"youtube",label:"YouTube 2009"},
  "yt-2013":{group:"youtube",label:"YouTube 2013"}, "yt-2019":{group:"youtube",label:"YouTube 2019"},
  "cosmic-panda":{group:"custom",label:"Cosmic Panda"},
  "cornet-2016":{group:"custom",label:"Cornet 2016"},
  "liquid-glass":{group:"custom",label:"Liquid Glass"},
  "grad-ocean":{group:"gradients",label:"Ocean"}, "grad-sunset":{group:"gradients",label:"Sunset"},
  "grad-neon":{group:"gradients",label:"Neon"}, "grad-candy":{group:"gradients",label:"Candy"},
  dracula:{group:"community",label:"Dracula"}, nord:{group:"community",label:"Nord"},
  "solarized-light":{group:"community",label:"Solarized Light"}, "solarized-dark":{group:"community",label:"Solarized Dark"},
  gruvbox:{group:"community",label:"Gruvbox"}, "tokyo-night":{group:"community",label:"Tokyo Night"},
  catppuccin:{group:"community",label:"Catppuccin"},
  "high-contrast":{group:"accessibility",label:"High Contrast"}, sepia:{group:"accessibility",label:"Sepia"}, grayscale:{group:"accessibility",label:"Grayscale"},
  "windows-aero":{group:"retro",label:"Windows Aero"}, "frutiger-aero":{group:"retro",label:"Frutiger Aero"},
  "web2-glossy":{group:"retro",label:"Web 2.0 Glossy"}, "y2k-chrome":{group:"retro",label:"Y2K Chrome"},
  "windows-xp-luna":{group:"retro",label:"Windows XP Luna"},
  crt:{group:"experimental",label:"CRT"}, vhs:{group:"experimental",label:"VHS"},
} as const;

export type ThemeId=keyof typeof THEME_REGISTRY;
export const LEGACY_THEME_ALIASES={
  "cornet-2009":"yt-2009",
  youtube2009:"yt-2009",
  "youtube-2009":"yt-2009",
  "youtube-2013":"yt-2013",
  youtube2013:"yt-2013",
  feather2013:"yt-2013",
  youtube2019:"yt-2019",
  retro2012:"cosmic-panda",
  "youtube-2012":"cosmic-panda",
  "yt-2012":"cosmic-panda",
} as const;
export type LegacyThemeId=keyof typeof LEGACY_THEME_ALIASES;
export type ResolvableThemeId=ThemeId|LegacyThemeId;
export function resolveThemeId(value:string):ThemeId|undefined{return value in THEME_REGISTRY?value as ThemeId:value in LEGACY_THEME_ALIASES?LEGACY_THEME_ALIASES[value as LegacyThemeId]:undefined;}
export function isThemeId(value:string):value is ResolvableThemeId{return Boolean(resolveThemeId(value));}
