import { createRootRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RouteContentBoundary } from "@/components/root/RouteContentBoundary";
import { MaintenanceGate } from "@/components/root/MaintenanceGate";
import { GlobalMobileBottomBar } from "@/components/root/GlobalMobileBottomBar";
import { NotificationPermissionPrompt } from "@/components/root/NotificationPermissionPrompt";
import "@/styles.css";

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <MaintenanceGate>
      <AppShell>
        <RouteContentBoundary>
          <Outlet />
        </RouteContentBoundary>
        <GlobalMobileBottomBar />
        <NotificationPermissionPrompt />
      </AppShell>
    </MaintenanceGate>
  );
}
