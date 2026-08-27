import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useLocation, useRouterState, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Compass, Home, MessageCircle, Upload, User as UserIcon, Users } from "lucide-react";
import appCss from "../styles.css?url";
import "../global-mobile-bar.css";
import { DesignLibraryRuntime } from "../design-library/DesignLibraryRuntime";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { Toaster } from "@/components/ui/sonner";
import { Wrench, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_SITE_EMBED_IMAGE = "https://mvwpxnszcpyayofqgtmv.supabase.co/storage/v1/object/public/media/61fe7d8d-f53f-4838-a870-4588c16e474b/announcement-7871ca44-f13f-45e5-a3c1-7908f0c348a9.png";

function NotFoundComponent() { return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-bold text-foreground">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">Esta página no existe</h2><p className="mt-2 text-sm text-muted-foreground">Puede que el enlace haya cambiado o ya no esté disponible.</p><div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Volver a Cornet</Link></div></div></div>; }
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) { console.error(error); const router = useRouter(); useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]); return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold tracking-tight text-foreground">No pudimos cargar esta página</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Algo salió mal. Puedes intentarlo de nuevo o volver al inicio.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Intentar de nuevo</button><a href="/" className="inline-flex items-center justify-center rounded-full border border-input bg-background px-4 py-2 text-sm text-foreground">Ir al inicio</a></div></div></div>; }
function MaintenanceScreen({ message }: { message: string }) { return (<div className="flex min-h-screen items-center justify-center bg-background px-4 relative"><div className="maintenance-3d-scene absolute inset-0" aria-hidden="true">{[1,2,3].map(i => (<div key={i} className="cube"><div></div><div></div><div></div><div></div><div></div><div></div></div>))}</div><div className="relative z-10 flex flex-col items-center text-center px-4"><div className="mt-8"><img src="/favicon.png" alt="Cornet logo" className="h-12 w-12 mx-auto" /></div><p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Cornet</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Estamos trabajando para ti</h1><p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground mx-auto">{message}</p><div className="mt-7 rounded-2xl border border-border bg-background/70 p-4 text-left"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold text-foreground">Acceso temporalmente limitado</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Los administradores mantienen acceso completo mientras terminamos las mejoras.</p></div></div></div><a href="/auth" className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Entrar como administrador</a></div></div>); }
function AuthLoadingScreen() { return <div className="flex min-h-screen items-center justify-center bg-background"><div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Cargando....</div></div>; }

function MaintenanceAwareContent() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const isAuthRoute = location.pathname === "/auth";
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);
  useEffect(() => {
    if (isAuthRoute) return;
    let cancelled = false; setSettingsLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase.from("site_settings").select("maintenance_mode, maintenance_message").eq("id", true).maybeSingle();
        if (cancelled) return;
        if (error) { console.error("[Cornet] maintenance settings failed", error); setMaintenance({ enabled: false, message: "" }); }
        else setMaintenance({ enabled: Boolean(data?.maintenance_mode), message: data?.maintenance_message ?? "" });
      } catch (error) {
        if (cancelled) return;
        console.error("[Cornet] maintenance settings failed", error);
        setMaintenance({ enabled: false, message: "" });
      }
      if (!cancelled) setSettingsLoading(false);
    })();
    return () => { cancelled = true; };
  }, [isAuthRoute]);
  if (isAuthRoute) return <Outlet />;
  if (loading || settingsLoading || maintenance === null) return <AuthLoadingScreen />;
  if (maintenance.enabled && !isAdmin) return <MaintenanceScreen message={maintenance.message} />;
  return <Outlet />;
}

function GlobalMobileBottomBar() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/explore", label: "Explorar", icon: Compass },
    { to: "/community", label: "Comunidad", icon: Users },
    ...(user ? [{ to: "/messages", label: "Mensajes", icon: MessageCircle }, { to: "/upload", label: "Subir", icon: Upload }] : [{ to: "/auth", label: "Tú", icon: UserIcon }]),
  ];
  return <nav className="cn-global-mobile-bar" aria-label="Navegación móvil">{items.map((item) => { const Icon = item.icon; const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(`${item.to}/`)); return <Link key={item.to} to={item.to} data-active={active ? "true" : "false"} aria-current={active ? "page" : undefined}><Icon /><span>{item.label}</span></Link>; })}</nav>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "Cornet — comparte lo que te importa" },
      { name: "description", content: "Videos, comunidad y espacios para compartir en Cornet." },
      { name: "author", content: "Cornet" }, { property: "og:title", content: "Cornet — comparte lo que te importa" }, { property: "og:description", content: "Una plataforma sencilla para ver videos, conversar y compartir." }, { property: "og:type", content: "website" }, { property: "og:url", content: "/" }, { property: "og:image", content: DEFAULT_SITE_EMBED_IMAGE }, { property: "og:image:alt", content: "Cornet — comparte lo que te importa" }, { property: "og:site_name", content: "Cornet" }, { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:title", content: "Cornet — comparte lo que te importa" }, { name: "twitter:description", content: "Una plataforma sencilla para ver videos, conversar y compartir." }, { name: "twitter:image", content: DEFAULT_SITE_EMBED_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss }, { rel: "stylesheet", href: "/explore.css" }, { rel: "stylesheet", href: "/messenger-theme.css" }, { rel: "stylesheet", href: "/user-themes.css" }, { rel: "stylesheet", href: "/cosmic-panda-channel-fullpage.css" }, { rel: "stylesheet", href: "/cosmic-panda-channel-layout.css" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" }, { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap" }, { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeBootstrap = `(function(){try{var t=localStorage.getItem('corenetwork-theme-v3');var v=['dark','light','retro2012','feather2013','youtube2019','windowsAero','frutigerAero','web2Glossy','y2kChrome','xpLuna','crtVhs','gradients','grad-sunset','grad-ocean','grad-neon','grad-candy','lavanda-oscuro','forest','midnight','rose','neon-pink','cyberpunk','crt-vhs','yt-2009','yt-2012','yt-2013','yt-2019','custom'];if(!t||v.indexOf(t)<0)t='grad-ocean';var r=document.documentElement;var light=['light','retro2012','feather2013','youtube2019','windowsAero','frutigerAero','web2Glossy','xpLuna','grad-candy','yt-2009','yt-2012','yt-2013','yt-2019'].indexOf(t)>=0;r.dataset.theme=t;r.classList.toggle('dark',!light);r.style.colorScheme=light?'light':'dark';}catch(e){}})();`;
function RootShell({ children }: { children: ReactNode }) { return <html lang="es" data-theme="dark" className="dark" suppressHydrationWarning><head><HeadContent /><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head><body>{children}<Scripts /></body></html>; }
function RootComponent() { const { queryClient } = Route.useRouteContext(); return <QueryClientProvider client={queryClient}><ThemeProvider><AuthProvider><DesignLibraryRuntime /><MaintenanceAwareContent /><GlobalMobileBottomBar /><Toaster position="bottom-center" /></AuthProvider></ThemeProvider></QueryClientProvider>; }
