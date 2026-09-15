import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import appCss from "../styles.css?url";
import "../global-mobile-bar.css";
import { DesignLibraryRuntime } from "../design-library/DesignLibraryRuntime";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { Toaster } from "@/components/ui/sonner";
import { ShellErrorBoundary } from "@/components/shell/ShellErrorBoundary";
import { MaintenanceGate } from "@/components/root/MaintenanceGate";
import { GlobalMobileBottomBar } from "@/components/root/GlobalMobileBottomBar";
import { RouteContentBoundary } from "@/components/root/RouteContentBoundary";

const DEFAULT_SITE_EMBED_IMAGE = "https://mvwpxnszcpyayofqgtmv.supabase.co/storage/v1/object/public/media/61fe7d8d-f53f-4838-a870-4588c16e474b/announcement-7871ca44-f13f-45e5-a3c1-7908f0c348a9.png";

function NotFoundComponent() {
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-7xl font-bold text-foreground">404</h1><h2 className="mt-4 text-xl font-semibold text-foreground">Esta página no existe</h2><p className="mt-2 text-sm text-muted-foreground">Puede que el enlace haya cambiado o ya no esté disponible.</p><div className="mt-6"><Link to="/" className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Volver a Cornet</Link></div></div></div>;
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return <div className="flex min-h-screen items-center justify-center bg-background px-4"><div className="max-w-md text-center"><h1 className="text-xl font-semibold tracking-tight text-foreground">No pudimos cargar esta página</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Algo salió mal. Puedes intentarlo de nuevo o volver al inicio.</p><div className="mt-6 flex flex-wrap justify-center gap-2"><button onClick={() => { router.invalidate(); reset(); }} className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Intentar de nuevo</button><a href="/" className="inline-flex items-center justify-center rounded-full border border-input bg-background px-4 py-2 text-sm text-foreground">Ir al inicio</a></div></div></div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "Cornet — comparte lo que te importa" },
      { name: "description", content: "Videos, comunidad y espacios para compartir en Cornet." }, { name: "author", content: "Cornet" },
      { property: "og:title", content: "Cornet — comparte lo que te importa" }, { property: "og:description", content: "Una plataforma sencilla para ver videos, conversar y compartir." }, { property: "og:type", content: "website" }, { property: "og:url", content: "/" }, { property: "og:image", content: DEFAULT_SITE_EMBED_IMAGE }, { property: "og:image:alt", content: "Cornet — comparte lo que te importa" }, { property: "og:site_name", content: "Cornet" },
      { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:title", content: "Cornet — comparte lo que te importa" }, { name: "twitter:description", content: "Una plataforma sencilla para ver videos, conversar y compartir." }, { name: "twitter:image", content: DEFAULT_SITE_EMBED_IMAGE },
    ],
    links: [
      { rel: "stylesheet", href: appCss }, { rel: "stylesheet", href: "/explore.css" }, { rel: "stylesheet", href: "/messenger-theme.css" }, { rel: "stylesheet", href: "/user-themes.css" }, { rel: "stylesheet", href: "/cosmic-panda-channel-fullpage.css" }, { rel: "stylesheet", href: "/cosmic-panda-channel-layout.css" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" }, { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" }, { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700&display=swap" }, { rel: "icon", href: "/favicon.png", type: "image/png" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeBootstrap = `(function(){try{var t=localStorage.getItem('corenetwork-theme-v3');var alias={retro2012:'cosmic-panda',youtube2019:'yt-2019','youtube-2013':'yt-2013','cornet-2009':'yt-2009',feather2013:'yt-2013',windowsAero:'windows-aero',frutigerAero:'frutiger-aero',web2Glossy:'web2-glossy',y2kChrome:'y2k-chrome',xpLuna:'windows-xp-luna',crtVhs:'crt'};if(t&&alias[t])t=alias[t];var v=['dark','light','yt-2005','yt-2007','yt-2009','yt-2012','yt-2013','yt-2019','cosmic-panda','grad-ocean','grad-sunset','grad-neon','grad-candy','dracula','nord','solarized-light','solarized-dark','gruvbox','tokyo-night','catppuccin','high-contrast','sepia','grayscale','windows-aero','frutiger-aero','web2-glossy','y2k-chrome','windows-xp-luna','crt','vhs','custom','system'];if(!t||v.indexOf(t)<0)t='grad-ocean';var r=document.documentElement;var light=['light','cosmic-panda','sepia','grayscale','solarized-light','grad-candy','yt-2005','yt-2007','yt-2009','yt-2012','yt-2013','yt-2019','windows-aero','frutiger-aero','web2-glossy','windows-xp-luna'].indexOf(t)>=0;r.dataset.theme=t;r.classList.toggle('dark',!light);r.style.colorScheme=light?'light':'dark';}catch(e){}})();`;

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="es" suppressHydrationWarning><head><HeadContent /><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head><body>{children}<Scripts /></body></html>;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return <QueryClientProvider client={queryClient}><ThemeProvider><AuthProvider><DesignLibraryRuntime /><ShellErrorBoundary label="maintenance gate"><MaintenanceGate><RouteContentBoundary><Outlet /></RouteContentBoundary></MaintenanceGate></ShellErrorBoundary><ShellErrorBoundary label="mobile navigation"><GlobalMobileBottomBar /></ShellErrorBoundary><Toaster position="bottom-center" /></AuthProvider></ThemeProvider></QueryClientProvider>;
}
