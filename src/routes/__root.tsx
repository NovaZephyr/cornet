import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import appCss from "../styles.css?url";
import "../global-mobile-bar.css";
import "@/cornet-reference-pages.css";
import { DesignLibraryRuntime } from "../design-library/DesignLibraryRuntime";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { Toaster } from "@/components/ui/sonner";
import { ShellErrorBoundary } from "@/components/shell/ShellErrorBoundary";
import { MaintenanceGate } from "@/components/root/MaintenanceGate";
import { AccountModerationGate } from "@/components/root/AccountModerationGate";
import { GlobalMobileBottomBar } from "@/components/root/GlobalMobileBottomBar";
import { RouteContentBoundary } from "@/components/root/RouteContentBoundary";

const DEFAULT_SITE_EMBED_IMAGE = "https://mvwpxnszcpyayofqgtmv.supabase.co/storage/v1/object/public/media/61fe7d8d-f53f-4838-a870-4588c16e474b/announcement-7871ca44-f13f-45e5-a3c1-7908f0c348a9.png";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function NotFoundComponent() {
  return (
    <main className="cn-cosmephant-status cn-cosmephant-not-found grid min-h-screen place-items-center px-4 py-10">
      <section className="cn-cosmephant-status-card cn-cosmephant-not-found-layout w-full max-w-5xl">
        <div className="cn-cosmephant-not-found-mark" aria-hidden="true">
          <img src="/favicon.png" alt="" />
        </div>
        <div className="cn-cosmephant-not-found-copy">
          <h1>404 — ¿Qué haces aquí?</h1>
          <p>
            Los Cornits están perdidos y nadie sabe qué hay en esta página. Por ahora, puedes volver a Cornet.
          </p>
          <Link to="/" className="cn-cosmephant-not-found-link">
            Volver a Cornet
          </Link>
        </div>
      </section>
    </main>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => { reportLovableError(error, { boundary: "tanstack_root_error_component" }); }, [error]);
  return <div className="cn-cosmephant-status flex min-h-screen items-center justify-center bg-background px-4"><div className="cn-cosmephant-status-card max-w-md text-center"><h1 className="text-2xl font-bold text-foreground">Algo salió mal</h1><p className="mt-3 text-sm text-muted-foreground">Ha ocurrido un error y no se pudo cargar esta vista.</p><button onClick={() => reset()} className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Reintentar</button></div></div>;
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" }, { name: "viewport", content: "width=device-width, initial-scale=1" }, { title: "Cornet — comparte lo que te importa" },
      { name: "description", content: "Videos, comunidad y espacios para compartir en Cornet." }, { name: "author", content: "Cornet" },
      { property: "og:title", content: "Cornet — comparte lo que te importa" }, { property: "og:description", content: "Una plataforma sencilla para ver videos, conversar y compartir." }, { property: "og:type", content: "website" },
      { property: "og:image", content: DEFAULT_SITE_EMBED_IMAGE }, { property: "og:site_name", content: "Cornet" },
      { name: "twitter:card", content: "summary_large_image" }, { name: "twitter:title", content: "Cornet — comparte lo que te importa" }, { name: "twitter:description", content: "Una plataforma para vivir comunidad, contenido y entretenimiento." },
      { name: "theme-color", content: "#0f172a" }, { name: "apple-mobile-web-app-capable", content: "yes" }, { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" }, { name: "apple-mobile-web-app-title", content: "Cornet" },
    ],
    links: [
      { rel: "stylesheet", href: appCss }, { rel: "stylesheet", href: "/explore.css" }, { rel: "stylesheet", href: "/messenger-theme.css" }, { rel: "stylesheet", href: "/user-themes.css" },
      { rel: "manifest", href: "/manifest.webmanifest" }, { rel: "apple-touch-icon", href: "/corenetwork-mark.png" }, { rel: "icon", href: "/favicon.png" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" }, { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

const themeBootstrap = `(function(){try{var t=localStorage.getItem('corenetwork-theme-v3');var alias={retro2012:'cosmic-panda','youtube-2012':'cosmic-panda','yt-2012':'cosmic-panda',youtube2009:'cosmic-panda',youtube2019:'cornet'};var value=t&&alias[t] ? alias[t] : (t||'cornet');document.documentElement.dataset.theme = value;}catch(e){document.documentElement.dataset.theme='cornet';}})();`;

function RootShell({ children }: { children: ReactNode }) {
  return <html lang="es" suppressHydrationWarning><head><HeadContent /><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head><body>{children}<Scripts /></body></html>;
}

function InstallPromptButton() {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/" });
      } catch (error) {
        console.warn("PWA service worker registration failed", error);
      }
    };

    void registerServiceWorker();

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  if (!promptEvent) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        await promptEvent.prompt();
        setPromptEvent(null);
      }}
      className="fixed bottom-4 right-4 z-50 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg"
    >
      Instalar app
    </button>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <DesignLibraryRuntime />
          <ShellErrorBoundary label="maintenance gate">
            <AccountModerationGate>
              <MaintenanceGate>
                <RouteContentBoundary>
                  <Outlet />
                </RouteContentBoundary>
              </MaintenanceGate>
            </AccountModerationGate>
          </ShellErrorBoundary>
          <GlobalMobileBottomBar />
          <Toaster />
          <InstallPromptButton />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
