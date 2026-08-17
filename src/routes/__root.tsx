import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useLocation, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { Toaster } from "@/components/ui/sonner";
import { Wrench, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() { return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-bold text-foreground">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">Esta página no existe</h2><p className="mt-2 text-sm text-muted-foreground">Puede que el enlace haya cambiado o ya no esté disponible.</p><div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Volver a Cornet</Link></div></div></div>; }
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) { console.error(error); const router = useRouter(); useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]); return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold tracking-tight text-foreground">No pudimos cargar esta página</h1><p className="mt-2 text-sm text-muted-foreground">Algo salió mal. Puedes intentarlo de nuevo o volver al inicio.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Intentar de nuevo</button><a href="/" className="inline-flex items-center justify-center rounded-full border border-input bg-background px-4 py-2 text-sm font-medium text-foreground">Ir al inicio</a></div></div></div>; }
function MaintenanceScreen({ message }: { message: string }) { return <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10"><div className="w-full max-w-xl rounded-3xl border border-border bg-surface p-8 text-center shadow-xl sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Wrench className="h-8 w-8" /></div><p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Cornet</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Estamos preparando algo nuevo</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">{message}</p><div className="mt-7 rounded-2xl border border-border bg-background/70 p-4 text-left"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold text-foreground">Acceso temporalmente limitado</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Los administradores mantienen acceso completo mientras terminamos las mejoras.</p></div></div></div><a href="/auth" className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Entrar como administrador</a></div></div>; }
function AuthLoadingScreen() { return <div className="flex min-h-screen items-center justify-center bg-background"><div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Comprobando acceso…</div></div>; }

function MaintenanceAwareContent() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const isAuthRoute = location.pathname === "/auth";
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);
  useEffect(() => {
    if (isAuthRoute) return;
    let cancelled = false; setSettingsLoading(true);
    void supabase.from("site_settings").select("maintenance_mode, maintenance_message").eq("id", true).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error) { console.error("[Cornet] maintenance settings failed", error); setMaintenance({ enabled: false, message: "" }); }
      else setMaintenance({ enabled: Boolean(data?.maintenance_mode), message: data?.maintenance_message ?? "" });
      setSettingsLoading(false);
    }).catch((error) => { if (cancelled) return; console.error("[Cornet] maintenance settings failed", error); setMaintenance({ enabled: false, message: "" }); setSettingsLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthRoute]);
  if (isAuthRoute) return <Outlet />;
  if (loading || settingsLoading || maintenance === null) return <AuthLoadingScreen />;
  if (maintenance.enabled && !isAdmin) return <MaintenanceScreen message={maintenance.message} />;
  return <Outlet />;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "Cornet — comparte lo que te importa" },
      { name: "description", content: "Videos, comunidad y espacios para compartir en Cornet." },
      { name: "author", content: "Cornet" }, { property: "og:title", content: "Cornet — comparte lo que te importa" }, { property: "og:description", content: "Una plataforma sencilla para ver videos, conversar y compartir." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss }, { rel: "stylesheet", href: "/retro2012.css" }, { rel: "stylesheet", href: "/explore.css" }, { rel: "stylesheet", href: "/messenger-theme.css" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" }, { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeBootstrap = `(function(){try{var t=localStorage.getItem('corenetwork-theme');var v=['dark','light','retro2012','gradients','grad-sunset','grad-ocean','grad-neon','grad-candy'];if(!t||v.indexOf(t)<0)t='dark';var r=document.documentElement;r.dataset.theme=t;if(t!=='light'&&t!=='retro2012'&&t!=='grad-candy')r.classList.add('dark');}catch(e){}})();`;
function RootShell({ children }: { children: ReactNode }) { return <html lang="es" data-theme="dark" className="dark" suppressHydrationWarning><head><HeadContent /><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head><body>{children}<Scripts /></body></html>; }
function RootComponent() { const { queryClient } = Route.useRouteContext(); return <QueryClientProvider client={queryClient}><ThemeProvider><AuthProvider><MaintenanceAwareContent /><Toaster position="bottom-center" /></AuthProvider></ThemeProvider></QueryClientProvider>; }
