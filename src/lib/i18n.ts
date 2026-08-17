export type LanguageId = "es" | "en" | "pt" | "fr" | "de" | "ja";

export const LANGUAGES: { id: LanguageId; label: string; nativeLabel: string }[] = [
  { id: "es", label: "Spanish", nativeLabel: "Español" },
  { id: "en", label: "English", nativeLabel: "English" },
  { id: "pt", label: "Portuguese", nativeLabel: "Português" },
  { id: "fr", label: "French", nativeLabel: "Français" },
  { id: "de", label: "German", nativeLabel: "Deutsch" },
  { id: "ja", label: "Japanese", nativeLabel: "日本語" },
];

const DICT: Record<LanguageId, Record<string, string>> = {
  es: {},
  en: {
    "Inicio": "Home", "Explorar": "Explore", "Anuncios": "Announcements", "Comunidad": "Community", "Información": "About",
    "Programa Partner": "Partner Program", "Guidelines": "Guidelines", "Subir video": "Upload video", "Mis playlists": "My playlists",
    "Notificaciones": "Notifications", "Personalizar canal": "Customize channel", "Administración": "Administration", "Mi canal": "My channel",
    "Personalizar": "Customize", "Cerrar sesión": "Sign out", "Iniciar sesión": "Sign in", "Buscar videos y canales": "Search videos and channels",
    "Tus videos": "Your videos", "Administra, edita y revisa todo lo que has publicado.": "Manage, edit, and review everything you've published.",
    "Playlists": "Playlists", "Todavía no has subido videos": "You haven't uploaded any videos yet",
    "Publica tu primer video y aparecerá aquí para administrarlo.": "Upload your first video and it will appear here to manage.",
    "Subir mi primer video": "Upload my first video", "Videos": "Videos", "Público": "Public", "Privado": "Private", "Editar": "Edit", "Ver": "Watch", "Eliminar": "Delete",
    "Cargando tus videos…": "Loading your videos…", "Cargando editor…": "Loading editor…", "No se encontró ese video.": "That video could not be found.",
    "Publicación nueva": "New upload", "Título": "Title", "Categoría": "Category", "Descripción": "Description", "Visibilidad": "Visibility",
    "Miniatura": "Thumbnail", "Subtítulos": "Subtitles", "Capítulos / secciones": "Chapters / sections", "Añadir archivos": "Add files", "Sin capítulos.": "No chapters.",
    "Guardar cambios": "Save changes", "Publicar video": "Publish video", "Cancelar": "Cancel", "Principal": "Primary", "principal": "primary",
    "Idioma": "Language", "Cambio de idioma": "Language", "Preferencias": "Preferences", "Tema": "Theme", "Cuenta": "Account",
    "Diseño del canal": "Channel design", "Perfil": "Profile", "Imágenes": "Images", "Partner": "Partner",
    "Nombre visible": "Display name", "Nombre de usuario": "Username", "Color de acento general": "General accent color", "Guardar diseño": "Save design",
    "Información del canal": "Channel information", "Suscriptores": "Subscribers", "Estilo": "Style",
    "Más vistos": "Most viewed", "Recientes": "Recent", "Música": "Music", "Descubre videos de toda la comunidad de CoreNetwork.": "Discover videos from the entire CoreNetwork community.",
    "Recientes de la comunidad": "Recent from the community", "Ver todo": "See all", "Todavía no hay videos en esta sección.": "There are no videos in this section yet.",
    "Guardar": "Save", "Denunciar": "Report", "Suscribirse": "Subscribe", "Suscrito": "Subscribed", "comentarios": "comments",
    "Añade un comentario…": "Add a comment…", "Comentar": "Comment", "Siguiente": "Up next", "Sin descripción.": "No description.",
    "About": "About", "Press & Blogs": "Press & Blogs", "Copyright": "Copyright", "Creators & Partners": "Creators & Partners",
    "Advertising": "Advertising", "Terms": "Terms", "Privacy": "Privacy", "Report a bug": "Report a bug", "Worldwide": "Worldwide", "Safety: On": "Safety: On",
    "Español": "English", "Información a la izquierda": "Information on the left", "Información a la derecha": "Information on the right", "Información arriba": "Information on top", "Ocultar información": "Hide information",
    "Los diseños de época solo afectan al canal cuando está activo el tema global YouTube 2012 / Cosmic Panda.": "Era designs only affect your channel when the YouTube 2012 / Cosmic Panda global theme is active.",
    "El idioma de la interfaz cambia inmediatamente y se guarda en este dispositivo.": "The interface language changes immediately and is saved on this device.",
  },
  pt: {
    "Inicio": "Início", "Explorar": "Explorar", "Anuncios": "Anúncios", "Comunidad": "Comunidade", "Información": "Informações", "Programa Partner": "Programa Partner",
    "Subir video": "Enviar vídeo", "Mis playlists": "Minhas playlists", "Notificaciones": "Notificações", "Personalizar canal": "Personalizar canal", "Administración": "Administração",
    "Mi canal": "Meu canal", "Cerrar sesión": "Sair", "Iniciar sesión": "Entrar", "Buscar videos y canales": "Buscar vídeos e canais", "Público": "Público", "Privado": "Privado",
    "Guardar": "Salvar", "Denunciar": "Denunciar", "Suscribirse": "Inscrever-se", "Suscrito": "Inscrito", "Más vistos": "Mais vistos", "Recientes": "Recentes", "Música": "Música",
    "Descripción": "Descrição", "Visibilidad": "Visibilidade", "Miniatura": "Miniatura", "Subtítulos": "Legendas", "Capítulos / secciones": "Capítulos / seções", "Guardar cambios": "Salvar alterações", "Publicar video": "Publicar vídeo",
    "Cancelar": "Cancelar", "Cuenta": "Conta", "Idioma": "Idioma", "Tema": "Tema", "Preferencias": "Preferências", "Perfil": "Perfil", "Imágenes": "Imagens", "Partner": "Partner",
    "Español": "Português", "Worldwide": "Mundial", "Safety: On": "Segurança: Ativa",
  },
  fr: {
    "Inicio": "Accueil", "Explorar": "Explorer", "Anuncios": "Annonces", "Comunidad": "Communauté", "Información": "Informations", "Programa Partner": "Programme Partner",
    "Subir video": "Mettre en ligne", "Mis playlists": "Mes playlists", "Notificaciones": "Notifications", "Personalizar canal": "Personnaliser la chaîne", "Administración": "Administration",
    "Mi canal": "Ma chaîne", "Cerrar sesión": "Se déconnecter", "Iniciar sesión": "Se connecter", "Buscar videos y canales": "Rechercher des vidéos et des chaînes", "Público": "Public", "Privado": "Privé",
    "Guardar": "Enregistrer", "Denunciar": "Signaler", "Suscribirse": "S'abonner", "Suscrito": "Abonné", "Más vistos": "Les plus vus", "Recientes": "Récent", "Música": "Musique",
    "Descripción": "Description", "Visibilidad": "Visibilité", "Miniatura": "Miniature", "Subtítulos": "Sous-titres", "Guardar cambios": "Enregistrer les modifications", "Cancelar": "Annuler", "Idioma": "Langue",
    "Español": "Français", "Worldwide": "Monde entier", "Safety: On": "Sécurité : activée",
  },
  de: {
    "Inicio": "Startseite", "Explorar": "Entdecken", "Anuncios": "Ankündigungen", "Comunidad": "Community", "Información": "Info", "Programa Partner": "Partnerprogramm",
    "Subir video": "Video hochladen", "Mis playlists": "Meine Playlists", "Notificaciones": "Benachrichtigungen", "Personalizar canal": "Kanal anpassen", "Administración": "Verwaltung",
    "Mi canal": "Mein Kanal", "Cerrar sesión": "Abmelden", "Iniciar sesión": "Anmelden", "Buscar videos y canales": "Videos und Kanäle suchen", "Público": "Öffentlich", "Privado": "Privat",
    "Guardar": "Speichern", "Denunciar": "Melden", "Suscribirse": "Abonnieren", "Suscrito": "Abonniert", "Más vistos": "Meistgesehen", "Recientes": "Neueste", "Música": "Musik",
    "Descripción": "Beschreibung", "Visibilidad": "Sichtbarkeit", "Miniatura": "Thumbnail", "Subtítulos": "Untertitel", "Guardar cambios": "Änderungen speichern", "Cancelar": "Abbrechen", "Idioma": "Sprache",
    "Español": "Deutsch", "Worldwide": "Weltweit", "Safety: On": "Sicherheit: An",
  },
  ja: {
    "Inicio": "ホーム", "Explorar": "探索", "Anuncios": "お知らせ", "Comunidad": "コミュニティ", "Información": "情報", "Programa Partner": "パートナープログラム",
    "Subir video": "動画をアップロード", "Mis playlists": "マイプレイリスト", "Notificaciones": "通知", "Personalizar canal": "チャンネルをカスタマイズ", "Administración": "管理",
    "Mi canal": "マイチャンネル", "Cerrar sesión": "ログアウト", "Iniciar sesión": "ログイン", "Buscar videos y canales": "動画とチャンネルを検索", "Público": "公開", "Privado": "非公開",
    "Guardar": "保存", "Denunciar": "報告", "Suscribirse": "チャンネル登録", "Suscrito": "登録済み", "Más vistos": "人気", "Recientes": "最新", "Música": "音楽",
    "Descripción": "説明", "Visibilidad": "公開設定", "Miniatura": "サムネイル", "Subtítulos": "字幕", "Guardar cambios": "変更を保存", "Cancelar": "キャンセル", "Idioma": "言語",
    "Español": "日本語", "Worldwide": "全世界", "Safety: On": "安全機能: オン",
  },
};

export function getLanguage(): LanguageId {
  const value = typeof window !== "undefined" ? window.localStorage.getItem("corenetwork-language") : null;
  return LANGUAGES.some((l) => l.id === value) ? (value as LanguageId) : "es";
}

export function setLanguage(language: LanguageId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem("corenetwork-language", language);
  window.dispatchEvent(new CustomEvent("corenetwork-language-change", { detail: language }));
  document.documentElement.lang = language;
  translatePage(language);
}

export function translateText(text: string, language = getLanguage()): string {
  const exact = DICT[language]?.[text];
  return exact ?? text;
}

export function translatePage(language = getLanguage()) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = language;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  for (const node of nodes) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script,style,textarea,[data-no-translate]")) continue;
    const raw = node.nodeValue ?? "";
    const trimmed = raw.trim();
    if (!trimmed) continue;
    const translated = translateText(trimmed, language);
    if (translated !== trimmed) node.nodeValue = raw.replace(trimmed, translated);
  }
}

export function installTranslationObserver() {
  if (typeof window === "undefined") return () => {};
  let scheduled = false;
  const run = () => {
    scheduled = false;
    translatePage();
  };
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(run);
  });
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  translatePage();
  return () => observer.disconnect();
}
