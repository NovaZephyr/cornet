import { useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { useShellExperiments } from "@/hooks/useShellExperiments";
import { useShellNavigation } from "@/hooks/useShellNavigation";
import { useShellState } from "@/hooks/useShellState";
import { SiteBanner } from "@/components/SiteBanner";
import { UploadSafetyBridge } from "@/components/UploadSafetyBridge";
import { cn } from "@/lib/utils";
import { ShellFooter } from "./shell/ShellFooter";
import { ShellHeader, ShellLogo } from "./shell/ShellHeader";
import { ShellMobileNav } from "./shell/ShellMobileNav";
import { ShellSidebar } from "./shell/ShellSidebar";
import { ShellUserMenu } from "./shell/ShellUserMenu";
import "./app-shell.css";
import type { ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  hideSidebar?: boolean;
  fullscreen?: boolean;
};

export function AppShell({ children, hideSidebar = false, fullscreen = false }: AppShellProps) {
  const { user, profile, roles, isAdmin, signOut } = useAuth();
  const { theme } = useTheme();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { sidebarOpen, mobileOpen, handleMenuClick } = useShellState(pathname);
  const { shortsEnabled } = useShellExperiments();

  const username = profile?.username ?? "";
  const isStaff = isAdmin || roles.includes("moderator");
  const { items, active } = useShellNavigation({
    pathname,
    authenticated: Boolean(user),
    staff: isStaff,
    shortsEnabled,
  });

  return (
    <div
      className={cn(
        "cn-shell",
        mobileOpen && "cn-shell-mobile-open",
        fullscreen && "cn-shell--fullscreen",
      )}
      data-theme-id={theme}
    >
      <ShellHeader
        mobileOpen={mobileOpen}
        onMenuClick={handleMenuClick}
        logo={<ShellLogo />}
        actions={
          <ShellUserMenu
            user={user}
            profile={profile}
            username={username}
            signOut={signOut}
          />
        }
      />

      <div
        className={cn(
          "cn-shell-layout",
          hideSidebar && "cn-shell-layout--no-sidebar",
        )}
        data-sidebar-hidden={hideSidebar ? "true" : "false"}
      >
        {!hideSidebar && (
          <ShellSidebar
            user={user}
            profile={profile}
            username={username}
            items={items}
            sidebarOpen={sidebarOpen}
            active={active}
          />
        )}

        <main
          className={cn(
            "cn-shell-main",
            fullscreen && "cn-shell-main--fullscreen",
          )}
        >
          {!fullscreen && (
            <>
              <SiteBanner />
              <UploadSafetyBridge />
            </>
          )}
          {children}
          {!fullscreen && <ShellFooter />}
        </main>
      </div>

      {!fullscreen && (
        <ShellMobileNav
          user={user}
          username={username}
          active={active}
          shortsEnabled={shortsEnabled}
        />
      )}
    </div>
  );
}
