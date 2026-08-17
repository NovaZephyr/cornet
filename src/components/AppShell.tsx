import { useEffect, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Home, Users, Upload, Search, Menu, Shield, Sparkles, Settings, LogOut, User as UserIcon, Video, Compass, Bell, Palette, Check, Megaphone, ListVideo, Info, Wrench, MessageCircle, X, History, Clock3, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChannelAvatar } from "@/components/Media";
import { useAuth } from "@/hooks/useAuth";
import { THEMES, useTheme, type ThemeId } from "@/hooks/useTheme";
import { SiteBanner } from "@/components/SiteBanner";
import { cn } from "@/lib/utils";
import logoMark from "@/assets/corenetwork-mark.png";
import { supabase } from "@/integrations/supabase/client";
import { UploadSafetyBridge } from "@/components/UploadSafetyBridge";
import { TwemojiPicker } from "@/components/TwemojiTools";
import "@/retro2012.css";
import "@/retro2012-adaptation.css";

const THEME_GROUPS = Array.from(new Set(THEMES.map((t) => t.group)));
type NavItem = { to: string; label: string; icon: typeof Home };
type RetroSubscription = { id: string; username: string; display_name: string | null; avatar_path: string | null };

function ThemeMenu() {
  const { theme, setTheme } = useTheme();
  return <DropdownMenu>
    <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full" aria-label="Cambiar tema"><Palette className="h-5 w-5" /></Button></DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-72">
      {THEME_GROUPS.map((group, i) => <div key={group}>{i > 0 && <DropdownMenuSeparator />}<DropdownMenuLabel className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{group}</DropdownMenuLabel>{THEMES.filter((t) => t.group === group).map((t) => <DropdownMenuItem key={t.id} onClick={() => setTheme(t.id as ThemeId)} className="gap-2.5 py-2.5"><span className="flex-1"><span className="block text-sm">{t.label}</span><span className="block text-xs text-muted-foreground">{t.hint}</span></span>{theme === t.id && <Check className="h-4 w-4 shrink-0 text-primary" />}</DropdownMenuItem>)}</div>)}
    </DropdownMenuContent>
  </DropdownMenu>;
}

function Logo() {
  return <Link to="/" className="group flex items-center gap-2.5" aria-label="CoreNetwork — inicio"><span className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-cyan-400/20 via-primary/20 to-blue-500/20 ring-1 ring-white/10"><img src={logoMark} alt="Logo de CoreNetwork" width={512} height={512} className="h-8 w-8 rounded-lg transition-transform duration-200 group-hover:scale-105" /></span><span><span className="block text-[20px] font-black tracking-tight leading-none">CoreNetwork</span><span className="hidden text-[9px] font-semibold uppercase tracking-[0.22em] text-muted-foreground sm:block">video · comunidad · compartir</span></span></Link>;
}

function SiteFooter() { const links: { to: "/about" | "/blog" | "/rules" | "/partner" | "/community" | "/playlists" | "/settings"; label: string }[] = [{ to: "/about", label: "Información" }, { to: "/blog", label: "Anuncios" }, { to: "/about", label: "Copyright" }, { to: "/partner", label: "Creadores y Partners" }, { to: "/playlists", label: "Playlists" }, { to: "/about", label: "Términos" }, { to: "/about", label: "Privacidad" }, { to: "/about", label: "Reportar un fallo" }, { to: "/settings", label: "Probar algo nuevo" }]; return <footer className="cn-2012-footer border-t border-border px-6 py-9 pb-24 md:pb-9"><div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center"><div className="flex items-center gap-2"><img src={logoMark} alt="" className="h-6 w-6 opacity-80" /><span className="text-sm font-bold tracking-tight">CoreNetwork</span></div><nav className="flex max-w-4xl flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">{links.map((l) => <Link key={`${l.to}-${l.label}`} to={l.to} className="transition-colors hover:text-foreground">{l.label}</Link>)}</nav><div className="flex flex-wrap justify-center gap-2 text-[11px]"><span className="rounded-full border border-border/70 bg-surface/60 px-2.5 py-1">Safety: On</span></div><p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} CoreNetwork.</p></div></footer>; }

function bottomBarItems(user: unknown): NavItem[] { const items: NavItem[] = [{ to: "/", label: "Inicio", icon: Home }, { to: "/explore", label: "Explorar", icon: Compass }, { to: "/community", label: "Comunidad", icon: Users }]; if (user) items.push({ to: "/messages", label: "Mensajes", icon: MessageCircle }, { to: "/upload", label: "Subir", icon: Upload }); else items.push({ to: "/auth", label: "Tú", icon: UserIcon }); return items; }

function RetroSidebar({ user, profile, isRecommendedChannelsPage, openSidebar }: { user: { id: string } | null; profile: any; isRecommendedChannelsPage: boolean; openSidebar: boolean }) {
  const subscriptionsQuery = useQuery({
    queryKey: ["retro-sidebar-subscriptions", user?.id],
    enabled: !!user && openSidebar,
    staleTime: 60_000,
    gcTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("subscriptions").select("channel_id").eq("subscriber_id", user!.id).limit(50);
      if (error) throw error;
      const ids = [...new Set((data ?? []).map((row) => row.channel_id).filter(Boolean))];
      if (!ids.length) return [] as RetroSubscription[];
      const { data: profiles, error: profileError } = await supabase.from("profiles").select("id,username,display_name,avatar_path").in("id", ids);
      if (profileError) throw profileError;
      const byId = new Map((profiles ?? []).map((item) => [item.id, item] as const));
      return ids.map((id) => byId.get(id)).filter(Boolean) as RetroSubscription[];
    },
  });

  const accountName = profile?.display_name || profile?.username || "Tu canal";
  const username = profile?.username || "";
  const accountItems = [
    { label: "Mi canal", icon: UserIcon, to: "/c/$username" as const },
    { label: "Videos", icon: Video, to: "/c/$username" as const },
    { label: "Lista de reproducciones", icon: ListVideo, to: "/playlists" as const },
  ];

  return <aside className={cn("cn-2012-sidebar cn-2012-sidebar--cosmic hidden shrink-0 md:block", openSidebar ? "is-open" : "is-collapsed")}>
    <div className="cn-2012-sidebar-inner">
      {isRecommendedChannelsPage && <Link to="/explore" search={{ view: "channels" }} className="cn-2012-sidebar-add"><PlusCircle className="h-4 w-4" /><span>Agregar suscriptores</span></Link>}

      {user && openSidebar && <>
        <div className="cn-2012-sidebar-account">
          <ChannelAvatar path={profile?.avatar_path} name={accountName} size={44} />
          <div className="min-w-0">
            <p className="truncate text-sm font-bold">{accountName}</p>
            <p className="truncate text-[11px] text-white/60">@{username}</p>
          </div>
        </div>
        <nav className="cn-2012-sidebar-account-nav" aria-label="Tu canal">
          {accountItems.map((item) => { const Icon = item.icon; return <Link key={item.label} to={item.to} params={item.label === "Mi canal" || item.label === "Videos" ? { username } : undefined} className="cn-2012-sidebar-link"><Icon className="h-4 w-4" /><span>{item.label}</span></Link>; })}
          <Link to="/watch" className="cn-2012-sidebar-link"><Clock3 className="h-4 w-4" /><span>Ver después</span></Link>
          <button type="button" className="cn-2012-sidebar-link cn-2012-sidebar-link--disabled" disabled title="Historial estará disponible aquí"><History className="h-4 w-4" /><span>Historial</span></button>
        </nav>

        <div className="cn-2012-sidebar-divider" />
        <div className="cn-2012-sidebar-section-title">Suscripciones</div>
        <nav className="cn-2012-sidebar-subscriptions" aria-label="Suscripciones">
          {subscriptionsQuery.isLoading ? <span className="cn-2012-sidebar-muted">Cargando…</span> : subscriptionsQuery.data && subscriptionsQuery.data.length > 0 ? subscriptionsQuery.data.map((subscription) => <Link key={subscription.id} to="/c/$username" params={{ username: subscription.username }} className="cn-2012-sidebar-subscription"><ChannelAvatar path={subscription.avatar_path} name={subscription.display_name || subscription.username} size={28} /><span className="truncate">{subscription.display_name || subscription.username}</span></Link>) : <span className="cn-2012-sidebar-muted">No tienes suscripciones todavía.</span>}
        </nav>
      </>}

      {!user && openSidebar && <div className="cn-2012-sidebar-guest"><p>Explora CoreNetwork</p><span>Inicia sesión para ver tu canal y tus suscripciones.</span></div>}

      {!openSidebar && <nav className="cn-2012-sidebar-collapsed-nav" aria-label="Navegación rápida">
        {user && <>
          <Link to="/c/$username" params={{ username }} className="cn-2012-sidebar-icon" title="Mi canal"><ChannelAvatar path={profile?.avatar_path} name={accountName} size={34} /></Link>
          <Link to="/playlists" className="cn-2012-sidebar-icon" title="Lista de reproducciones"><ListVideo className="h-5 w-5" /></Link>
          <Link to="/watch" className="cn-2012-sidebar-icon" title="Ver después"><Clock3 className="h-5 w-5" /></Link>
        </>}
        <Link to="/" className="cn-2012-sidebar-icon" title="Inicio"><Home className="h-5 w-5" /></Link>
        <Link to="/explore" className="cn-2012-sidebar-icon" title="Explorar"><Compass className="h-5 w-5" /></Link>
      </nav>}
    </div>
  </aside>;
}

export function AppShell({ children, hideSidebar = false }: { children: ReactNode; hideSidebar?: boolean }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [openSidebar, setOpenSidebar] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const routeSearch = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  useEffect(() => { setMobileNavOpen(false); }, [pathname]);

  const isCosmic = theme === "retro2012";
  const isRecommendedChannelsPage = isCosmic && pathname === "/explore" && routeSearch.view === "channels";
  const items: NavItem[] = [{ to: "/", label: "Inicio", icon: Home }, { to: "/explore", label: "Explorar", icon: Compass }, { to: "/blog", label: "Anuncios", icon: Megaphone }, { to: "/community", label: "Comunidad", icon: Users }, ...(user ? [{ to: "/messages", label: "Mensajes", icon: MessageCircle } as NavItem] : []), { to: "/about", label: "Información", icon: Info }, { to: "/partner", label: "Programa Partner", icon: Sparkles }, { to: "/rules", label: "Guidelines", icon: Sparkles }];
  if (user) items.push({ to: "/upload", label: "Subir video", icon: Upload }, { to: "/playlists", label: "Mis playlists", icon: ListVideo });
  if (isAdmin) items.push({ to: "/admin", label: "Administración", icon: Shield }, { to: "/admin-maintenance", label: "Mantenimiento", icon: Wrench });

  return <div className="cn-2012-app min-h-screen bg-background">
    <SiteBanner />
    <header className="cn-2012-topbar sticky top-0 z-50 flex h-16 items-center gap-2 border-b border-border/60 px-2 backdrop-blur-xl sm:px-4">
      <Button variant="ghost" size="icon" className="rounded-full" aria-label="Menú" onClick={() => { setOpenSidebar((v) => !v); setMobileNavOpen((v) => !v); }}><Menu className="h-5 w-5" /></Button>
      <Logo />
      <form className="mx-auto flex w-full max-w-2xl items-center px-1 sm:px-3" onSubmit={(e) => { e.preventDefault(); void navigate({ to: "/", search: query ? { q: query } : {} }); }}>
        <div className="relative flex w-full items-center"><Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Busca videos, canales o temas…" className="h-11 rounded-full border-border/70 bg-background/55 pl-11 pr-24 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/35" /><Button type="submit" variant="secondary" className="absolute right-1 h-9 rounded-full px-4" aria-label="Buscar">Buscar</Button></div>
      </form>
      <div className="ml-auto flex items-center gap-1">
        <div className="hidden sm:flex items-center gap-1"><TwemojiPicker /><ThemeMenu /></div>
        {user ? <><Button asChild variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex"><Link to="/upload" aria-label="Subir video"><Video className="h-5 w-5" /></Link></Button><Button asChild variant="ghost" size="icon" className="rounded-full"><Link to="/notifications" aria-label="Notificaciones"><Bell className="h-5 w-5" /></Link></Button><Button asChild variant="ghost" size="icon" className="hidden rounded-full sm:inline-flex"><Link to="/settings" aria-label="Ajustes"><Settings className="h-5 w-5" /></Link></Button><DropdownMenu><DropdownMenuTrigger className="rounded-full outline-none"><ChannelAvatar path={profile?.avatar_path} name={profile?.display_name || profile?.username || "U"} size={34} /></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-60"><DropdownMenuLabel>@{profile?.username ?? "usuario"}</DropdownMenuLabel><DropdownMenuItem asChild><Link to="/c/$username" params={{ username: profile?.username ?? "" }}><UserIcon className="mr-2 h-4 w-4" />Mi canal</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/messages"><MessageCircle className="mr-2 h-4 w-4" />Mensajes y amigos</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/playlists"><ListVideo className="mr-2 h-4 w-4" />Mis playlists</Link></DropdownMenuItem>{isAdmin && <><DropdownMenuItem asChild><Link to="/admin"><Shield className="mr-2 h-4 w-4" />Administración</Link></DropdownMenuItem><DropdownMenuItem asChild><Link to="/admin-maintenance"><Wrench className="mr-2 h-4 w-4" />Mantenimiento</Link></DropdownMenuItem></>}<DropdownMenuSeparator /><DropdownMenuItem onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</DropdownMenuItem></DropdownMenuContent></DropdownMenu></> : <Button asChild variant="outline" className="rounded-full"><Link to="/auth">Entrar</Link></Button>}
      </div>
    </header>

    <div className={cn("cn-2012-shell-body grid w-full items-start gap-0", hideSidebar ? "grid-cols-1" : "grid-cols-[auto_minmax(0,1fr)]", isCosmic && !hideSidebar && "cn-2012-shell-body--cosmic")}>
      {!hideSidebar && (isCosmic ? <RetroSidebar user={user} profile={profile} isRecommendedChannelsPage={isRecommendedChannelsPage} openSidebar={openSidebar} /> : <aside className={cn("cn-2012-sidebar hidden w-[236px] md:block", openSidebar ? "is-open" : "is-collapsed w-[76px]")}><nav className="flex flex-col gap-1">{items.map((item) => { const Icon = item.icon; const active = pathname === item.to; return <Link key={item.to} to={item.to} title={openSidebar ? undefined : item.label} className={cn("flex items-center rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-surface/80", active && "bg-surface/80 font-semibold text-foreground", openSidebar ? "gap-3" : "flex-col gap-1 text-[10px]")}><Icon className="h-5 w-5 shrink-0" /><span className={cn(!openSidebar && "text-center")}>{item.label}</span></Link>; })}</nav></aside>)}
      {mobileNavOpen && !hideSidebar && <div className="fixed inset-0 z-40 md:hidden"><button aria-label="Cerrar menú" className="absolute inset-0 bg-black/45 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} /><aside className="relative h-full w-[82vw] max-w-[320px] overflow-y-auto border-r border-border/60 bg-background/96 p-4 shadow-2xl backdrop-blur-xl"><div className="mb-5 flex items-center justify-between"><span className="text-sm font-semibold">Navegación</span><Button variant="ghost" size="icon" className="rounded-full" onClick={() => setMobileNavOpen(false)} aria-label="Cerrar"><X className="h-5 w-5" /></Button></div><nav className="flex flex-col gap-1">{items.map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-surface"><Icon className="h-5 w-5" />{item.label}</Link>; })}</nav></aside></div>}
      <main className="cn-2012-main min-w-0">{pathname === "/upload" ? <><UploadSafetyBridge />{children}</> : children}</main>
    </div>
    <SiteFooter />
    <nav className="cn-2012-mobile-bar fixed inset-x-0 bottom-0 z-50 flex h-16 items-center border-t border-border md:hidden">{bottomBarItems(user).map((item) => { const Icon = item.icon; return <Link key={item.to} to={item.to} className={cn("flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] text-muted-foreground", pathname === item.to && "font-semibold text-foreground")}><Icon className="h-5 w-5" /><span>{item.label}</span></Link>})}</nav>
  </div>;
}
