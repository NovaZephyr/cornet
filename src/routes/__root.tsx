import { createRootRoute, Outlet, useRouter } from "@tanstack/react-router";
import { QueryClientProvider, type QueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { RouteContentBoundary } from "@/components/root/RouteContentBoundary";
import { MaintenanceGate } from "@/components/root/MaintenanceGate";
import { GlobalMobileBottomBar } from "@/components/root/GlobalMobileBottomBar";
import { NotificationPermissionPrompt } from "@/components/root/NotificationPermissionPrompt";
import { DesignLibraryRuntime } from "@/design-library/DesignLibraryRuntime";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import "@/styles.css";

export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/corenetwork-mark.png" },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  const router = useRouter();
  const queryClient = (router.options.context as { queryClient: QueryClient }).queryClient;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <DesignLibraryRuntime />
          <MaintenanceGate>
            <AppShell>
              <RouteContentBoundary>
                <Outlet />
              </RouteContentBoundary>
              <GlobalMobileBottomBar />
              <NotificationPermissionPrompt />
            </AppShell>
          </MaintenanceGate>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
