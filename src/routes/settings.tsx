import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Palette, LayoutTemplate, Puzzle, UserRound, ImageIcon, SlidersHorizontal, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, SignedImage } from "@/components/Media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, type ChannelInfoLayout, type ChannelStyle } from "@/hooks/useAuth";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { DEFAULT_CUSTOM_THEME, THEMES, useTheme, type CustomTheme } from "@/hooks/useTheme";
import { EXTENSIONS, readExtensions, saveExtensions, type ExtensionKey, type ExtensionState } from "@/extensions";
import "@/settings.css";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

const CHANNEL_STYLES: { value: ChannelStyle; label: string; description: string; group: string }[] = [
  { value: "corenetwork", label: "CoreNetwork", description: "Diseño propio actual.", group: "CoreNetwork" },
  { value: "classic-2009", label: "Classic 2009", description: "Canal compacto de finales de los 2000.", group: "Históricos" },
  { value: "standard-2012", label: "Standard 2012", description: "Canal general de la era 2012.", group: "Históricos" },
  { value: "cosmic-panda", label: "Cosmic Panda", description: "Layout custom inspirado en YouTube 2011/2012.", group: "Históricos" },
  { value: "onechannel-2013", label: "One Channel 2013", description: "Banner protagonista y navegación editorial.", group: "Históricos" },
  { value: "feather-profile", label: "Feather Profile", description: "Minimalista y ligero.", group: "Especiales" },
  { value: "creator-studio", label: "Creator Studio", description: "Pensado para creadores y estadísticas.", group: "Especiales" },
  { value: "profile-card", label: "Profile Card", description: "Perfil social centrado.", group: "Especiales" },
  { value: "community-profile", label: "Community Profile", description: "La comunidad es el contenido principal.", group: "Especiales" },
  { value: "video-channel", label: "Video Channel", description: "El vídeo destacado es el protagonista.", group: "Especiales" },
  { value: "music-channel", label: "Music Channel", description: "Álbumes, canciones y playlists.", group: "Especiales" },
  { value: "gaming-channel", label: "Gaming Channel", description: "Estética de canal gaming.", group: "Especiales" },
  { value: "minimal-profile", label: "Minimal Profile", description: "Muy poco chrome, mucho contenido.", group: "Modernos" },
  { value: "channel-2015", label: "Channel 2015", description: "Puente entre clásico y moderno.", group: "Históricos" },
  { value: "channel-2019", label: "Channel 2019", description: "Canal limpio y centrado en contenido.", group: "Históricos" },
];
const INFO_LAYOUTS: { value: ChannelInfoLayout; label: string }[] = [
  { value: "left", label: "Izquierda" },
  { value: "right", label: "Derecha" },
  { value: "top", label: "Arriba" },
  { value: "hidden", label: "Oculta" },
];
const LANGUAGES = ["es|Español","en|English","pt|Português","fr|Français","de|Deutsch","ja|日本語"].map((x) => { const [value,label] = x.split("|"); return { value, label }; });

type SectionKey = "profile" | "appearance" | "channel" | "images" | "extensions" | "preferences" | "account";

function ThemePreview({ id, custom }: { id?: string; custom?: CustomTheme }) {
  const style = custom ? { background: custom.gradientEnabled ? `linear-gradient(${custom.gradientAngle}deg,${custom.gradientFrom},${custom.gradientTo})` : custom.background } : undefined;
  return <div className="cn-theme-preview" style={style}><div className="cn-theme-preview-top" style={{ background: custom?.sidebar }} /><div className="cn-theme-preview-body"><div className="cn-theme-preview-side" style={{ background: custom?.sidebar }} /><div className="cn-theme-preview-main"><i /><i /><i /></div></div></div>;
}

function SettingsPage() {
  const { user, profile, refresh, isPartner, isAdmin } = useAuth();
  const { theme, customTheme, setTheme, setCustomTheme } = useTheme();
  const [section, setSection] = useState<SectionKey>("profile");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [description, setDescription] = useState("");
  const [accent, setAccent] = useState("#ff0033");
  const [language, setLanguage] = useState("es");
  const [channelStyle, setChannelStyle] = useState<ChannelStyle>("corenetwork");
  const [primaryColor, setPrimaryColor] = useState("#1f4fa3");
  const [secondaryColor, setSecondaryColor] = useState("#2aa84a");
  const [surfaceColor, setSurfaceColor] = useState("#ffffff");
  const [textColor, setTextColor] = useState("#222222");
  const [infoLayout, setInfoLayout] = useState<ChannelInfoLayout>("left");
  const [customDraft, setCustomDraft] = useState<CustomTheme>(customTheme);
  const [extensions, setExtensions] = useState<ExtensionState>(readExtensions);
  const [busy, setBusy] = useState(false);
  const [styleBusy, setStyleBusy] = useState(false);

  useEffect(() => { if (!profile) return; setDisplayName(profile.display_name ?? ""); setUsername(profile.username ?? ""); setDescription(profile.description ?? ""); setAccent(profile.accent_color ?? "#ff0033"); setChannelStyle(profile.channel_style ?? "corenetwork"); setPrimaryColor(profile.channel_primary_color ?? "#1f4fa3"); setSecondaryColor(profile.channel_secondary_color ?? "#2aa84a"); setSurfaceColor(profile.channel_surface_color ?? "#ffffff"); setTextColor(profile.channel_text_color ?? "#222222"); setInfoLayout(profile.channel_info_layout ?? "left"); }, [profile]);
  useEffect(() => { setLanguage(localStorage.getItem("corenetwork-language") || "es"); }, []);
  useEffect(() => { setCustomDraft(customTheme); }, [customTheme]);
  useEffect(() => { saveExtensions(extensions); }, [extensions]);

  if (!user || !profile) return <AppShell><p className="py-24 text-center text-muted-foreground">Inicia sesión para personalizar tu cuenta.</p></AppShell>;

  const saveProfile = async (e: React.FormEvent) => { e.preventDefault(); setBusy(true); try { const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_]/g, ""); const { error } = await supabase.from("profiles").update({ display_name: displayName, username: cleanUsername, description, accent_color: accent }).eq("id", user.id); if (error) throw error; localStorage.setItem("corenetwork-language", language); await refresh(); toast.success("Perfil guardado"); } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo guardar"); } finally { setBusy(false); } };
  const saveChannel = async () => { setStyleBusy(true); try { const { error } = await supabase.from("profiles").update({ channel_style: channelStyle, channel_primary_color: primaryColor, channel_secondary_color: secondaryColor, channel_surface_color: surfaceColor, channel_text_color: textColor, channel_info_layout: infoLayout } as never).eq("id", user.id); if (error) throw error; await refresh(); toast.success("Layout de canal guardado"); } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo guardar el layout"); } finally { setStyleBusy(false); } };
  const updateCustom = (patch: Partial<CustomTheme>) => { const next = { ...customDraft, ...patch }; setCustomDraft(next); setCustomTheme(next); };
  const toggleExt = (key: ExtensionKey) => setExtensions((current) => ({ ...current, [key]: !current[key] }));
  const upload = async (field: "avatar_path" | "banner_path", file: File) => { setBusy(true); try { const path = await uploadToCloudinary(file, user.id, "image"); const { error } = await supabase.from("profiles").update({ [field]: path } as never).eq("id", user.id); if (error) throw error; await refresh(); toast.success("Imagen actualizada"); } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo subir"); } finally { setBusy(false); } };
  const deactivate = async () => { if (!confirm("¿Desactivar tu cuenta?")) return; const { error } = await supabase.from("profiles").update({ account_status: "deactivated" } as never).eq("id", user.id); if (error) return toast.error(error.message); await supabase.auth.signOut(); };
  const deleteAccount = async () => { if (prompt("Escribe BORRAR para confirmar") !== "BORRAR") return; const { error } = await supabase.rpc("request_account_deletion"); if (error) return toast.error(error.message); await supabase.auth.signOut(); };

  const nav: { key: SectionKey; label: string; icon: typeof UserRound }[] = [
    { key: "profile", label: "Perfil", icon: UserRound }, { key: "appearance", label: "Temas", icon: Palette }, { key: "channel", label: "Layouts", icon: LayoutTemplate }, { key: "images", label: "Imágenes", icon: ImageIcon }, { key: "extensions", label: "Extensiones", icon: Puzzle }, { key: "preferences", label: "Preferencias", icon: SlidersHorizontal }, { key: "account", label: "Cuenta", icon: ShieldCheck },
  ];

  return <AppShell><div className="cn-settings-page"><div className="cn-settings-hero"><div><h1>Configuración</h1><p className="cn-settings-muted">Personaliza tu cuenta, tu tema, tu layout y las extensiones de Cornet.</p></div><div className="cn-settings-muted">{isPartner || isAdmin ? "Personalización avanzada" : "Personalización estándar"}</div></div><div className="cn-settings-shell"><nav className="cn-settings-nav" aria-label="Secciones de configuración">{nav.map(({ key,label,icon:Icon }) => <button key={key} type="button" data-active={section===key} onClick={() => setSection(key)}><Icon size={16}/>{label}</button>)}</nav><main className="cn-settings-content">
    {section === "profile" && <section className="cn-settings-card"><h2>Perfil</h2><p className="help">Tu identidad pública en Cornet.</p><form onSubmit={saveProfile} className="mt-5 space-y-4"><div className="cn-settings-grid"><div><Label>Nombre visible</Label><Input className="mt-2" value={displayName} onChange={(e)=>setDisplayName(e.target.value)} /></div><div><Label>Usuario</Label><Input className="mt-2" value={username} onChange={(e)=>setUsername(e.target.value)} /></div></div><div><Label>Descripción</Label><Textarea className="mt-2" rows={5} value={description} onChange={(e)=>setDescription(e.target.value)} /></div><div className="cn-settings-grid"><div><Label>Color de acento</Label><input type="color" value={accent} onChange={(e)=>setAccent(e.target.value)} className="mt-2 h-10 w-20 rounded-md border bg-transparent" /></div><div><Label>Idioma</Label><Select value={language} onValueChange={setLanguage}><SelectTrigger className="mt-2"><SelectValue/></SelectTrigger><SelectContent>{LANGUAGES.map((x)=><SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>)}</SelectContent></Select></div></div><div className="cn-settings-actions"><Button type="submit" disabled={busy}>{busy?"Guardando…":"Guardar perfil"}</Button></div></form></section>}

    {section === "appearance" && <section className="cn-settings-card"><h2>Temas</h2><p className="help">Los temas cambian la apariencia global; los layouts cambian únicamente tu canal.</p>{["Básicos","Clásicos","Retro","Experimental","Degradados"].map((group)=><div key={group} className="cn-theme-group"><div className="cn-theme-group-title">{group}</div><div className="cn-theme-grid">{THEMES.filter((t)=>t.group===group).map((t)=><button className="cn-theme-card" data-active={theme===t.id} type="button" key={t.id} onClick={()=>setTheme(t.id)}><ThemePreview id={t.id}/><h3>{t.label}</h3><p>{t.hint}</p></button>)}</div></div>)}<div className="cn-theme-group"><div className="cn-theme-group-title">Temas Custom</div><button className="cn-theme-card" data-active={theme==="custom"} type="button" onClick={()=>setTheme("custom")}><ThemePreview custom={customDraft}/><h3>Custom actual</h3><p>Edita colores y degradados abajo.</p></button></div><div className="cn-settings-card" style={{marginTop:16}}><h2>Editor Custom</h2><p className="help">Este editor modifica solo tu tema Custom.</p><div className="cn-settings-grid mt-4">{(["background","foreground","surface","surfaceHover","card","primary","secondary","accent","border","sidebar"] as const).map((key)=><div key={key}><Label>{key}</Label><div className="mt-2 flex gap-2"><input type="color" value={customDraft[key]} onChange={(e)=>updateCustom({[key]:e.target.value} as Partial<CustomTheme>)} className="h-10 w-12 rounded border bg-transparent"/><Input value={customDraft[key]} onChange={(e)=>updateCustom({[key]:e.target.value} as Partial<CustomTheme>)} /></div></div>)}</div><div className="cn-settings-grid mt-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={customDraft.gradientEnabled} onChange={(e)=>updateCustom({gradientEnabled:e.target.checked})}/> Usar degradado</label><Input type="number" min={0} max={360} value={customDraft.gradientAngle} onChange={(e)=>updateCustom({gradientAngle:Number(e.target.value)})}/></div></div></section>}

    {section === "channel" && <section className="cn-settings-card"><h2>Layouts de canal</h2><p className="help">Elige una estructura independiente del tema global. Puedes combinar ambos.</p>{["CoreNetwork","Históricos","Especiales","Modernos"].map((group)=><div key={group} className="cn-theme-group"><div className="cn-theme-group-title">{group}</div><div className="cn-layout-grid">{CHANNEL_STYLES.filter((x)=>x.group===group).map((style)=><button key={style.value} type="button" className="cn-layout-card" data-active={channelStyle===style.value} onClick={()=>setChannelStyle(style.value)}><strong>{style.label}</strong><span>{style.description}</span></button>)}</div></div>)}<div className="mt-5 grid gap-3 sm:grid-cols-4">{INFO_LAYOUTS.map((x)=><button key={x.value} type="button" className="cn-layout-card" data-active={infoLayout===x.value} onClick={()=>setInfoLayout(x.value)}><strong>{x.label}</strong></button>)}</div><div className="cn-settings-actions"><Button onClick={saveChannel} disabled={styleBusy}>{styleBusy?"Guardando…":"Guardar layout"}</Button></div></section>}

    {section === "images" && <section className="cn-settings-card"><h2>Imágenes</h2><p className="help">Gestiona el banner y avatar de tu canal.</p><div className="mt-5 space-y-5"><div><Label>Banner</Label><div className="mt-2 aspect-[6/1] w-full overflow-hidden rounded-lg border bg-background">{profile.banner_path?<SignedImage path={profile.banner_path} alt="Banner" className="h-full w-full object-cover"/>:<div className="grid h-full place-items-center text-xs text-muted-foreground">Sin banner</div>}</div><Input type="file" accept="image/*" className="cn-settings-file mt-2" disabled={busy} onChange={(e)=>{const f=e.target.files?.[0];if(f)void upload("banner_path",f)}}/></div><div className="flex items-center gap-4 rounded-xl border p-4"><ChannelAvatar path={profile.avatar_path} name={profile.display_name||profile.username} size={72}/><div><Label>Avatar</Label><Input type="file" accept="image/png,image/jpeg,image/webp" className="cn-settings-file mt-2" disabled={busy} onChange={(e)=>{const f=e.target.files?.[0];if(f)void upload("avatar_path",f)}}/></div></div></div></section>}

    {section === "extensions" && <section className="cn-settings-card"><h2>Extensiones</h2><p className="help">Pequeñas funciones opcionales que se aplican a tu interfaz localmente.</p><div className="cn-extension-list mt-5">{EXTENSIONS.map((ext)=><div className="cn-extension-item" key={ext.key}><div><strong>{ext.name}</strong><p>{ext.description} · {ext.category}</p></div><button type="button" className="cn-switch" data-on={extensions[ext.key]} aria-pressed={extensions[ext.key]} onClick={()=>toggleExt(ext.key)} aria-label={`Activar ${ext.name}`}/></div>)}</div></section>}

    {section === "preferences" && <section className="cn-settings-card"><h2>Preferencias</h2><p className="help">Ajustes adicionales de la experiencia.</p><div className="mt-5 space-y-4"><label className="block"><span className="text-sm font-medium">Tema actual</span><p className="cn-settings-muted mt-1">{THEMES.find((x)=>x.id===theme)?.label ?? "Custom"}</p></label><label className="block"><span className="text-sm font-medium">Experimental</span><p className="cn-settings-muted mt-1">Activa “Layouts experimentales” en Extensiones para probar estructuras nuevas.</p></label></div></section>}

    {section === "account" && <><section className="cn-settings-card"><h2>Cuenta</h2><p className="help">Estado y acciones de la cuenta.</p><div className="mt-5 flex items-start gap-3"><ShieldCheck className="text-primary"/><div><strong>{isAdmin?"Administrador":isPartner?"Partner":"Usuario"}</strong><p className="cn-settings-muted mt-1">Tu rol controla algunas opciones avanzadas de personalización.</p></div></div></section><section className="cn-settings-card cn-danger-card"><h2>Zona de peligro</h2><p className="help">Estas acciones afectan directamente a tu cuenta.</p><div className="cn-settings-actions"><Button variant="outline" onClick={deactivate}>Desactivar</Button><Button variant="destructive" onClick={deleteAccount}><Trash2 className="mr-2 h-4 w-4"/>Solicitar eliminación</Button></div></section></>}
  </main></div></div></AppShell>;
}
