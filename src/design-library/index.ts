export type DesignCategory = "normal" | "custom";
export type DesignKind = "theme" | "layout";
export type DesignPage = "home" | "watch" | "shorts" | "channel" | "community" | "settings" | "explore" | "playlists";

export type ThemeDefinition = {
  id: string;
  name: string;
  category: DesignCategory;
  kind: "theme";
  description: string;
  stylesheets: string[];
  family?: string;
  pages?: DesignPage[];
};

export type ChannelLayoutDefinition = {
  id: string;
  name: string;
  category: "historical" | "functional" | "special";
  kind: "layout";
  description: string;
  stylesheets: string[];
};

export const themes: ThemeDefinition[] = [
  { id: "dark", name: "Oscuro", category: "normal", kind: "theme", description: "Tema oscuro base de Cornet.", stylesheets: [] },
  { id: "light", name: "Claro", category: "normal", kind: "theme", description: "Tema claro base de Cornet.", stylesheets: [] },
  { id: "grad-ocean", name: "Océano", category: "normal", kind: "theme", description: "Degradado azul del sistema normal.", stylesheets: [] },
  { id: "grad-sunset", name: "Atardecer", category: "normal", kind: "theme", description: "Degradado cálido del sistema normal.", stylesheets: [] },
  { id: "grad-neon", name: "Neón", category: "normal", kind: "theme", description: "Degradado vibrante del sistema normal.", stylesheets: [] },
  { id: "grad-candy", name: "Candy", category: "normal", kind: "theme", description: "Degradado pastel del sistema normal.", stylesheets: [] },
  { id: "forest", name: "Bosque", category: "normal", kind: "theme", description: "Tema verde del sistema normal.", stylesheets: [] },
  { id: "midnight", name: "Medianoche", category: "normal", kind: "theme", description: "Tema nocturno del sistema normal.", stylesheets: [] },
  { id: "rose", name: "Rosa", category: "normal", kind: "theme", description: "Tema rosa del sistema normal.", stylesheets: [] },
  { id: "lavanda-oscuro", name: "Lavanda oscuro", category: "normal", kind: "theme", description: "Tema lavanda oscuro del sistema normal.", stylesheets: [] },
  { id: "retro2012", name: "Cosmic Panda 2012", category: "custom", kind: "theme", description: "Experiencia clara en contenido con guía oscura y chrome propio.", stylesheets: ["/cosmic-panda-theme.css"], family: "youtube-historical", pages: ["home", "watch", "shorts", "explore", "settings"] },
  { id: "feather2013", name: "Feather 2013", category: "normal", kind: "theme", description: "Tema claro ligero y autónomo; no activa layouts históricos adicionales.", stylesheets: ["/feather-2013.css"], family: "feather-light", pages: ["home", "watch", "shorts", "explore", "settings"] },
  { id: "youtube2019", name: "YouTube 2019 / Polymer", category: "custom", kind: "theme", description: "Tema claro e independiente con CSS propio y shell aislado.", stylesheets: ["/youtube-polymer-2019.css", "/youtube-polymer-2019-design-system.css", "/youtube-polymer-2019-home.css"], family: "youtube-polymer", pages: ["home", "watch", "shorts", "channel", "community", "settings", "explore", "playlists"] },
  { id: "windowsAero", name: "Windows Aero", category: "custom", kind: "theme", description: "Cristal, blur y chrome inspirado en Vista/7.", stylesheets: ["/custom-theme-packs.css"], family: "desktop-era", pages: ["home", "watch", "channel", "settings"] },
  { id: "frutigerAero", name: "Frutiger Aero", category: "custom", kind: "theme", description: "Naturaleza, agua, cielo y vidrio translúcido.", stylesheets: ["/custom-theme-packs.css"], family: "web-aesthetic", pages: ["home", "watch", "channel", "explore"] },
  { id: "web2Glossy", name: "Web 2.0 Glossy", category: "custom", kind: "theme", description: "Glossy, gradients, chrome y skeuomorfismo web.", stylesheets: ["/custom-theme-packs.css"], family: "web-aesthetic", pages: ["home", "watch", "channel", "explore"] },
  { id: "y2kChrome", name: "Y2K Chrome", category: "custom", kind: "theme", description: "Metal, azul eléctrico y estética tecnológica Y2K.", stylesheets: ["/custom-theme-packs.css"], family: "web-aesthetic", pages: ["home", "watch", "channel"] },
  { id: "xpLuna", name: "Windows XP Luna", category: "custom", kind: "theme", description: "Chrome azul, superficies plateadas y controles Luna.", stylesheets: ["/custom-theme-packs.css"], family: "desktop-era", pages: ["home", "watch", "channel", "settings"] },
  { id: "crtVhs", name: "CRT / VHS", category: "custom", kind: "theme", description: "Scanlines, fósforo, glow y estética de televisión antigua.", stylesheets: ["/custom-theme-packs.css"], family: "broadcast-era", pages: ["home", "watch"] },
];

const channelLayoutStyles = ["/custom-channel-layouts.css"];

export const channelLayouts: ChannelLayoutDefinition[] = [
  { id: "corenetwork", name: "Classic Channel", category: "historical", kind: "layout", description: "Layout base de Cornet.", stylesheets: [] },
  { id: "classic-2009", name: "Classic 2009", category: "historical", kind: "layout", description: "Canal compacto inspirado en 2009.", stylesheets: ["/custom-channel-layouts.css"] },
  { id: "standard-2012", name: "Standard 2012", category: "historical", kind: "layout", description: "Estructura general de YouTube alrededor de 2012.", stylesheets: ["/retro2012.css"] },
  { id: "cosmic-panda", name: "Cosmic Panda", category: "historical", kind: "layout", description: "Layout de canal Cosmic Panda; independiente del tema global.", stylesheets: ["/cosmic-panda-channel-core.css"] },
  { id: "early-youtube-2005", name: "Early YouTube 2005–2006", category: "historical", kind: "layout", description: "Canal mínimo de la era temprana: tabla simple, enlaces y poco chrome.", stylesheets: channelLayoutStyles },
  { id: "star-rating-2007", name: "Star Rating 2007–2008", category: "historical", kind: "layout", description: "Canal clásico con paneles grises y referencias a la era de estrellas.", stylesheets: channelLayoutStyles },
  { id: "transition-2010", name: "Transition 2010", category: "historical", kind: "layout", description: "Etapa de transición con sidebar gris, cajas y chrome redondeado.", stylesheets: channelLayoutStyles },
  { id: "onechannel-2013", name: "One Channel 2013", category: "historical", kind: "layout", description: "Portada de canal centrada en banner y navegación por pestañas.", stylesheets: channelLayoutStyles },
  { id: "material-lite-2015", name: "Material Lite 2015–2016", category: "historical", kind: "layout", description: "Tarjetas limpias, sombras suaves y superficies planas.", stylesheets: channelLayoutStyles },
  { id: "channel-2015", name: "2015 Channel", category: "historical", kind: "layout", description: "Intermedio entre el canal clásico y moderno.", stylesheets: ["/custom-channel-layouts.css"] },
  { id: "channel-2019", name: "YouTube 2019 Channel", category: "historical", kind: "layout", description: "Canal con estructura de la era Polymer.", stylesheets: ["/custom-channel-layouts.css"] },
  { id: "modern-minimal-2020", name: "Modern Minimal 2020–2023", category: "special", kind: "layout", description: "Canal amplio y minimalista con poco chrome.", stylesheets: channelLayoutStyles },
  { id: "terminal", name: "Terminal / CLI", category: "special", kind: "layout", description: "Canal con estética de terminal y navegación monoespaciada.", stylesheets: channelLayoutStyles },
  { id: "bento-grid", name: "Bento Grid", category: "special", kind: "layout", description: "Canal modular con superficies tipo bento y jerarquía de tarjetas.", stylesheets: channelLayoutStyles },
  { id: "magazine", name: "Magazine / Editorial", category: "special", kind: "layout", description: "Canal editorial con tipografía de revista y divisores fuertes.", stylesheets: channelLayoutStyles },
  { id: "cinephile", name: "Cinephile / Sala oscura", category: "special", kind: "layout", description: "Canal inmersivo orientado a cine y cortometrajes.", stylesheets: channelLayoutStyles },
  { id: "feather-profile", name: "Feather Profile", category: "special", kind: "layout", description: "Perfil ligero y centrado en contenido.", stylesheets: [] },
  { id: "creator-studio", name: "Creator Studio", category: "functional", kind: "layout", description: "Perfil orientado a creadores y estadísticas.", stylesheets: [] },
  { id: "profile-card", name: "Profile Card", category: "special", kind: "layout", description: "Perfil social compacto.", stylesheets: [] },
  { id: "community-profile", name: "Community Profile", category: "functional", kind: "layout", description: "Perfil centrado en publicaciones y actividad.", stylesheets: [] },
  { id: "video-channel", name: "Video Channel", category: "functional", kind: "layout", description: "Canal centrado en Featured y vídeos.", stylesheets: [] },
  { id: "music-channel", name: "Music Channel", category: "functional", kind: "layout", description: "Canal para música, álbumes y playlists.", stylesheets: [] },
  { id: "gaming-channel", name: "Gaming Channel", category: "functional", kind: "layout", description: "Canal orientado a gaming.", stylesheets: [] },
  { id: "minimal-profile", name: "Minimal Profile", category: "special", kind: "layout", description: "Perfil limpio con poco chrome.", stylesheets: [] },
];

export function getTheme(themeId: string) { return themes.find((theme) => theme.id === themeId) ?? themes.find((theme) => theme.id === "grad-ocean")!; }
export function getChannelLayout(layoutId: string) { return channelLayouts.find((layout) => layout.id === layoutId) ?? channelLayouts[0]; }
export function getThemesByCategory(category: DesignCategory) { return themes.filter((theme) => theme.category === category); }
export function getThemesByFamily(family: string) { return themes.filter((theme) => theme.category === "custom" && theme.family === family); }
