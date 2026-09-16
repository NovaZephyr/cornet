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
  { id: "cosmic-panda", name: "Cosmic Panda", category: "custom", kind: "theme", description: "Tema Cosmic Panda fusionado con la implementación histórica Retro 2012.", stylesheets: ["/cosmic-panda-theme.css"], family: "cornet-historical", pages: ["home", "watch", "shorts", "explore", "settings"] },
  { id: "yt-2009", name: "YouTube 2009", category: "custom", kind: "theme", description: "Recreación visual del YouTube de 2009 con navegación histórica y shell propio.", stylesheets: ["/youtube2009.css"], family: "youtube-historical", pages: ["home", "watch", "shorts", "explore", "settings"] },
  { id: "yt-2013", name: "YouTube 2013", category: "custom", kind: "theme", description: "Recreación visual del YouTube de 2013 sin activar layouts históricos adicionales.", stylesheets: ["/feather-2013-enhanced.css"], family: "youtube-historical", pages: ["home", "watch", "shorts", "explore", "settings"] },
  { id: "yt-2019", name: "YouTube 2019 / Polymer", category: "custom", kind: "theme", description: "Tema claro e independiente con CSS propio y shell aislado.", stylesheets: ["/youtube-polymer-2019.css", "/youtube-polymer-2019-design-system.css", "/youtube-polymer-2019-home.css"], family: "youtube-polymer", pages: ["home", "watch", "shorts", "channel", "community", "settings", "explore", "playlists"] },
  { id: "liquid-glass", name: "Liquid Glass", category: "custom", kind: "theme", description: "Cristal translúcido, profundidad suave y capas inspirado en interfaces de Apple, con identidad Cornet.", stylesheets: ["/liquid-glass-theme.css"], family: "apple-inspired", pages: ["home", "watch", "shorts", "channel", "community", "settings", "explore", "playlists"] },
  { id: "windowsAero", name: "Windows Aero", category: "custom", kind: "theme", description: "Cristal, blur y chrome inspirado en Vista/7.", stylesheets: ["/custom-theme-packs.css"], family: "desktop-era", pages: ["home", "watch", "channel", "settings"] },
  { id: "frutigerAero", name: "Frutiger Aero", category: "custom", kind: "theme", description: "Naturaleza, agua, cielo y vidrio translúcido.", stylesheets: ["/custom-theme-packs.css"], family: "web-aesthetic", pages: ["home", "watch", "channel", "explore"] },
  { id: "web2Glossy", name: "Web 2.0 Glossy", category: "custom", kind: "theme", description: "Glossy, gradients, chrome y skeuomorfismo web.", stylesheets: ["/custom-theme-packs.css"], family: "web-aesthetic", pages: ["home", "watch", "channel", "explore"] },
  { id: "y2kChrome", name: "Y2K Chrome", category: "custom", kind: "theme", description: "Metal, azul eléctrico y estética tecnológica Y2K.", stylesheets: ["/custom-theme-packs.css"], family: "web-aesthetic", pages: ["home", "watch", "channel"] },
  { id: "xpLuna", name: "Windows XP Luna", category: "custom", kind: "theme", description: "Chrome azul, superficies plateadas y controles Luna.", stylesheets: ["/custom-theme-packs.css"], family: "desktop-era", pages: ["home", "watch", "channel", "settings"] },
  { id: "crtVhs", name: "CRT / VHS", category: "custom", kind: "theme", description: "Scanlines, fósforo, glow y estética de televisión antigua.", stylesheets: ["/custom-theme-packs.css"], family: "broadcast-era", pages: ["home", "watch"] },
];

const channelLayoutStyles = ["/custom-channel-layouts.css"];
const variantStyles = ["/channel-layout-variants.css"];
const historicalStyles = [...variantStyles, "/youtube-historical-layouts.css"];

export const channelLayouts: ChannelLayoutDefinition[] = [
  { id: "corenetwork", name: "Cosmephant", category: "special", kind: "layout", description: "Diseño original de Cornet.", stylesheets: [] },
  { id: "classic-2009", name: "Channel 1.0", category: "historical", kind: "layout", description: "Layout de canal basado en la referencia histórica Channel 1.0; conserva el ID classic-2009 por compatibilidad.", stylesheets: historicalStyles },
  { id: "standard-2012", name: "Channel 2.0", category: "historical", kind: "layout", description: "Layout de canal basado en la referencia histórica Channel 2.0; conserva el ID standard-2012 por compatibilidad.", stylesheets: variantStyles },
  { id: "cosmic-panda", name: "Cosmic Panda", category: "historical", kind: "layout", description: "Layout de canal Cosmic Panda; independiente del tema global.", stylesheets: ["/cosmic-panda-channel-core.css", "/youtube-historical-layouts.css"] },
  { id: "liquid-glass", name: "Liquid Glass", category: "special", kind: "layout", description: "Canal translúcido con profundidad, tarjetas flotantes y estética inspirada en Apple.", stylesheets: ["/liquid-glass-layout.css"] },
  { id: "early-youtube-2005", name: "Early YouTube 2005–2006", category: "historical", kind: "layout", description: "Canal mínimo de la era temprana: tabla simple, enlaces y poco chrome.", stylesheets: variantStyles },
  { id: "star-rating-2007", name: "Star Rating 2007–2008", category: "historical", kind: "layout", description: "Canal clásico con paneles grises y referencias a la era de estrellas.", stylesheets: variantStyles },
  { id: "transition-2010", name: "Transition 2010", category: "historical", kind: "layout", description: "Etapa de transición con sidebar gris, cajas y chrome redondeado.", stylesheets: variantStyles },
  { id: "onechannel-2013", name: "One Channel 2013", category: "historical", kind: "layout", description: "Portada de canal de 2013 con banner, navegación blanca y tarjetas compactas.", stylesheets: historicalStyles },
  { id: "material-lite-2015", name: "Material Lite 2015–2016", category: "historical", kind: "layout", description: "Tarjetas limpias, sombras suaves y superficies planas.", stylesheets: variantStyles },
  { id: "channel-2015", name: "2015 Channel", category: "historical", kind: "layout", description: "Intermedio entre el canal clásico y moderno.", stylesheets: variantStyles },
  { id: "channel-2019", name: "YouTube 2019 Channel", category: "historical", kind: "layout", description: "Canal compacto de la era Polymer con Material Design y poco radio.", stylesheets: historicalStyles },
  { id: "modern-minimal-2020", name: "Modern Minimal 2020–2023", category: "special", kind: "layout", description: "Canal amplio y minimalista con poco chrome.", stylesheets: variantStyles },
  { id: "terminal", name: "Terminal / CLI", category: "special", kind: "layout", description: "Canal con estética de terminal y navegación monoespaciada.", stylesheets: channelLayoutStyles },
  { id: "bento-grid", name: "Bento Grid", category: "special", kind: "layout", description: "Canal modular con superficies tipo bento y jerarquía de tarjetas.", stylesheets: channelLayoutStyles },
  { id: "magazine", name: "Magazine / Editorial", category: "special", kind: "layout", description: "Canal editorial con tipografía de revista y divisores fuertes.", stylesheets: variantStyles },
  { id: "cinephile", name: "Cinephile / Sala oscura", category: "special", kind: "layout", description: "Canal inmersivo orientado a cine y cortometrajes.", stylesheets: variantStyles },
  { id: "feather-profile", name: "Feather Profile", category: "special", kind: "layout", description: "Perfil ligero, monocromo y centrado en contenido.", stylesheets: historicalStyles },
  { id: "creator-studio", name: "Creator Studio", category: "functional", kind: "layout", description: "Perfil orientado a creadores y estadísticas.", stylesheets: variantStyles },
  { id: "profile-card", name: "Profile Card", category: "special", kind: "layout", description: "Perfil social compacto.", stylesheets: variantStyles },
  { id: "community-profile", name: "Community Profile", category: "functional", kind: "layout", description: "Perfil centrado en publicaciones y actividad.", stylesheets: variantStyles },
  { id: "video-channel", name: "Video Channel", category: "functional", kind: "layout", description: "Canal centrado en Featured y vídeos.", stylesheets: variantStyles },
  { id: "music-channel", name: "Music Channel", category: "functional", kind: "layout", description: "Canal para música, álbumes y playlists.", stylesheets: variantStyles },
  { id: "gaming-channel", name: "Gaming Channel", category: "functional", kind: "layout", description: "Canal orientado a gaming.", stylesheets: variantStyles },
  { id: "minimal-profile", name: "Minimal Profile", category: "special", kind: "layout", description: "Perfil limpio con poco chrome.", stylesheets: variantStyles },
];

export function getTheme(themeId: string) { return themes.find((theme) => theme.id === themeId) ?? themes.find((theme) => theme.id === "grad-ocean")!; }
export function getChannelLayout(layoutId: string) { return channelLayouts.find((layout) => layout.id === layoutId) ?? channelLayouts[0]; }
export function getThemesByCategory(category: DesignCategory) { return themes.filter((theme) => theme.category === category); }
export function getThemesByFamily(family: string) { return themes.filter((theme) => theme.category === "custom" && theme.family === family); }
