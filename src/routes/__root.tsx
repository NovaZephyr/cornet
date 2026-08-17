import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, useLocation, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { Toaster } from "@/components/ui/sonner";
import { Wrench, ShieldCheck, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function NotFoundComponent() { return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-bold text-foreground">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2><p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p><div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link></div></div></div>; }
function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) { console.error(error); const router = useRouter(); useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]); return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold tracking-tight text-foreground">This page didn't load</h1><p className="mt-2 text-sm text-muted-foreground">Something went wrong on our end. You can try refreshing or head back home.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Try again</button><a href="/" className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground">Go home</a></div></div></div>; }

function MaintenanceScreen({ message }: { message: string }) {
  return <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10"><div className="w-full max-w-xl rounded-3xl border border-border bg-surface p-8 text-center shadow-xl sm:p-12"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Wrench className="h-8 w-8" /></div><p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary">CoreNetwork</p><h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Estamos en mantenimiento</h1><p className="mx-auto mt-4 max-w-md text-sm leading-6 text-muted-foreground">{message}</p><div className="mt-7 rounded-2xl border border-border bg-background/70 p-4 text-left"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><p className="font-semibold text-foreground">Acceso restringido</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Durante el mantenimiento, solo las cuentas de administrador pueden acceder al sitio completo.</p></div></div></div><a href="/auth" className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Acceso de administrador</a></div></div>;
}

function AuthLoadingScreen() {
  return <div className="flex min-h-screen items-center justify-center bg-background"><div className="flex items-center gap-3 rounded-2xl border border-border bg-surface px-5 py-4 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin text-primary" />Comprobando acceso…</div></div>;
}

function MaintenanceAwareContent() {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const isAuthRoute = location.pathname === "/auth";
  const { data: settings, isLoading: settingsLoading } = useQuery({
    queryKey: ["site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("site_settings").select("maintenance_mode, maintenance_message").eq("id", true).maybeSingle();
      if (error) throw error;
      return data as { maintenance_mode: boolean; maintenance_message: string } | null;
    },
    staleTime: 15_000,
  });

  if (isAuthRoute) return <Outlet />;
  if (loading || settingsLoading) return <AuthLoadingScreen />;
  if (settings?.maintenance_mode && !isAdmin) return <MaintenanceScreen message={settings.maintenance_message} />;
  return <Outlet />;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "CoreNetwork — Free Yourself!" },
      { name: "description", content: "Watch videos, subscribe canales, join to the community in CoreNetwork." },
      { name: "author", content: "CoreNetwork" }, { property: "og:title", content: "CoreNetwork — Free Yourself" }, { property: "og:description", content: "La plataforma de video donde tu canal se ve como tú quieras." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "/retro2012.css" },
      { rel: "stylesheet", href: "/explore.css" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" },
      { rel: "icon", href: "/favicon.png", type: "image/png" },
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
