export type DesignCategory = "normal" | "custom";
export type DesignKind = "theme" | "layout";

export type ThemeDefinition = {
  id: string;
  name: string;
  category: DesignCategory;
  kind: "theme";
  description: string;
  stylesheets: string[];
};

export type ChannelLayoutDefinition = {
  id: string;
  name: string;
  category: "historical" | "functional" | "special";
  kind: "layout";
  description: string;
  stylesheets: string[];
};

/** Single source of truth. Themes own global presentation; layouts own /c/:username. */
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
  { id: "retro2012", name: "Cosmic Panda 2012", category: "custom", kind: "theme", description: "Experiencia global inspirada en Cosmic Panda / YouTube 2012.", stylesheets: ["/cosmic-panda-theme.css"] },
  { id: "feather2013", name: "Feather 2013", category: "custom", kind: "theme", description: "Experiencia ligera y enfocada en vídeo.", stylesheets: ["/custom-theme-experiences.css"] },
  { id: "youtube2019", name: "YouTube 2019 / Polymer", category: "custom", kind: "theme", description: "Experiencia global basada en Polymer 2019.", stylesheets: ["/youtube-polymer-2019.css"] },
  { id: "windowsAero", name: "Windows Aero", category: "custom", kind: "theme", description: "Cristal, blur y chrome inspirado en Vista/7.", stylesheets: ["/custom-theme-experiences.css", "/aero-family-overrides.css"] },
  { id: "frutigerAero", name: "Frutiger Aero", category: "custom", kind: "theme", description: "Naturaleza, agua, cielo y vidrio translúcido.", stylesheets: ["/custom-theme-experiences.css", "/aero-family-overrides.css"] },
  { id: "web2Glossy", name: "Web 2.0 Glossy", category: "custom", kind: "theme", description: "Glossy, gradients, chrome y skeuomorfismo web.", stylesheets: ["/custom-theme-experiences.css", "/aero-family-overrides.css"] },
  { id: "y2kChrome", name: "Y2K Chrome", category: "custom", kind: "theme", description: "Metal, azul eléctrico y estética tecnológica Y2K.", stylesheets: ["/custom-theme-experiences.css"] },
  { id: "xpLuna", name: "Windows XP Luna", category: "custom", kind: "theme", description: "Chrome azul, superficies plateadas y controles Luna.", stylesheets: ["/custom-theme-experiences.css"] },
  { id: "crtVhs", name: "CRT / VHS", category: "custom", kind: "theme", description: "Scanlines, fósforo, glow y estética de televisión antigua.", stylesheets: ["/custom-theme-experiences.css"] },
];

export const channelLayouts: ChannelLayoutDefinition[] = [
  { id: "corenetwork", name: "Classic Channel", category: "historical", kind: "layout", description: "Layout base de Cornet.", stylesheets: [] },
  { id: "classic2009", name: "Classic 2009", category: "historical", kind: "layout", description: "Canal compacto inspirado en 2009.", stylesheets: [] },
  { id: "standard2012", name: "Standard 2012", category: "historical", kind: "layout", description: "Estructura general de YouTube alrededor de 2012.", stylesheets: ["/retro2012.css"] },
  { id: "cosmicPanda", name: "Cosmic Panda Channel", category: "historical", kind: "layout", description: "Layout de canal Cosmic Panda.", stylesheets: ["/cosmic-panda-channel-core.css", "/cosmic-panda-channel-fullpage.css", "/cosmic-panda-channel-layout.css"] },
  { id: "oneChannel2013", name: "One Channel 2013", category: "historical", kind: "layout", description: "Portada de canal centrada en el banner.", stylesheets: [] },
  { id: "featherProfile", name: "Feather Profile", category: "special", kind: "layout", description: "Perfil ligero y centrado en contenido.", stylesheets: [] },
  { id: "creatorStudio", name: "Creator Studio", category: "functional", kind: "layout", description: "Perfil orientado a creadores y estadísticas.", stylesheets: [] },
  { id: "profileCard", name: "Profile Card", category: "special", kind: "layout", description: "Perfil social compacto.", stylesheets: [] },
  { id: "communityProfile", name: "Community Profile", category: "functional", kind: "layout", description: "Perfil centrado en publicaciones y actividad.", stylesheets: [] },
  { id: "videoChannel", name: "Video Channel", category: "functional", kind: "layout", description: "Canal centrado en Featured y vídeos.", stylesheets: [] },
  { id: "musicChannel", name: "Music Channel", category: "functional", kind: "layout", description: "Canal para música, álbumes y playlists.", stylesheets: [] },
  { id: "gamingChannel", name: "Gaming Channel", category: "functional", kind: "layout", description: "Canal orientado a gaming.", stylesheets: [] },
  { id: "minimalProfile", name: "Minimal Profile", category: "special", kind: "layout", description: "Perfil limpio con poco chrome.", stylesheets: [] },
  { id: "channel2015", name: "2015 Channel", category: "historical", kind: "layout", description: "Intermedio entre el canal clásico y moderno.", stylesheets: [] },
  { id: "channel2019", name: "YouTube 2019 Channel", category: "historical", kind: "layout", description: "Canal con estructura de la era Polymer.", stylesheets: [] },
];

export function getTheme(themeId: string) { return themes.find((theme) => theme.id === themeId) ?? themes.find((theme) => theme.id === "grad-ocean")!; }
export function getChannelLayout(layoutId: string) { return channelLayouts.find((layout) => layout.id === layoutId) ?? channelLayouts[0]; }
export function getThemesByCategory(category: DesignCategory) { return themes.filter((theme) => theme.category === category); }
