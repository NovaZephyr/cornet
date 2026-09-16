import { useRouterState } from "@tanstack/react-router";
import { useTheme } from "@/hooks/useTheme";
import { useShellExperiments } from "@/hooks/useShellExperiments";
import { useShellNavigation } from "@/hooks/useShellNavigation";
import { useShellState } from "@/hooks/useShellState";
import { useShellUser } from "@/hooks/useShellUser";
import { SiteBanner } from "@/components/SiteBanner";
import { UploadSafetyBridge } from "@/components/UploadSafetyBridge";
import { cn } from "@/lib/utils";
import { ShellErrorBoundary } from "./shell/ShellErrorBoundary";
import { ShellFooter } from "./shell/ShellFooter";
import { ShellHeader, ShellLogo } from "./shell/ShellHeader";
import { ShellMobileNav } from "./shell/ShellMobileNav";
import { ShellSidebar } from "./shell/ShellSidebar";
import { ShellUserMenu } from "./shell/ShellUserMenu";
import "./app-shell.css";
import { createContext, useContext, type ReactNode } from "react";

type AppShellProps = {
  children: ReactNode;
  hideSidebar?: boolean;
  fullscreen?: boolean;
};

// Only one complete shell is allowed in a rendered subtree. This prevents
// nested route/content components from cloning the header/sidebar/footer.
const AppShellContext = createContext(false);

export function AppShell({ children, hideSidebar = false, fullscreen = false }: AppShellProps) {
  if (useContext(AppShellContext)) return <>{children}</>;

  return (
    <AppShellContext.Provider value={true}>
      <AppShellFrame hideSidebar={hideSidebar} fullscreen={fullscreen}>
        {children}
      </AppShellFrame>
    </AppShellContext.Provider>
  );
}

function AppShellFrame({ children, hideSidebar = false, fullscreen = false }: AppShellProps) {
  const { user, profile, username, isStaff, signOut } = useShellUser();
  const { theme } = useTheme();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { sidebarOpen, mobileOpen, handleMenuClick } = useShellState(pathname);
  const { shortsEnabled } = useShellExperiments();

  const { items, active } = useShellNavigation({
    pathname,
    authenticated: Boolean(user),
    staff: isStaff,
    shortsEnabled,
  });

  const isYoutube2009 = theme === "yt-2009";
  const historicalNavItems = isYoutube2009
    ? items
        .filter(({ to }) => ["/", "/explore", "/series", "/community", "/upload"].includes(to))
        .map(({ to, label }) => ({
          to,
          label: to === "/" ? "Home" : to === "/explore" ? "Videos" : to === "/series" ? "Shows" : to === "/community" ? "Community" : "Upload",
        }))
    : [];

  return (
    <div
      className={cn(
        "cn-shell",
        mobileOpen && "cn-shell-mobile-open",
        fullscreen && "cn-shell--fullscreen",
      )}
      data-theme-id={theme}
    >
      <ShellErrorBoundary label="header">
        <ShellHeader
          mobileOpen={mobileOpen}
          onMenuClick={handleMenuClick}
          logo={<ShellLogo />}
          historicalNavItems={historicalNavItems}
          actions={
            <ShellUserMenu
              user={user}
              profile={profile}
              username={username}
              signOut={signOut}
            />
          }
        />
      </ShellErrorBoundary>

      <div
        className={cn(
          "cn-shell-layout",
          (hideSidebar || isYoutube2009) && "cn-shell-layout--no-sidebar",
        )}
        data-sidebar-hidden={hideSidebar || isYoutube2009 ? "true" : "false"}
      >
        {!hideSidebar && !isYoutube2009 && (
          <ShellErrorBoundary label="sidebar">
            <ShellSidebar
              user={user}
              profile={profile}
              username={username}
              items={items}
              sidebarOpen={sidebarOpen}
              active={active}
            />
          </ShellErrorBoundary>
        )}

        <main
          className={cn(
            "cn-shell-main",
            fullscreen && "cn-shell-main--fullscreen",
          )}
        >
          {!fullscreen && (
            <>
              <ShellErrorBoundary label="site banner">
                <SiteBanner />
              </ShellErrorBoundary>
              <ShellErrorBoundary label="upload safety bridge">
                <UploadSafetyBridge />
              </ShellErrorBoundary>
            </>
          )}
          {children}
        </main>
      </div>

      {!fullscreen && (
        <ShellErrorBoundary label="footer">
          <ShellFooter />
        </ShellErrorBoundary>
      )}

      {!fullscreen && (
        <ShellErrorBoundary label="mobile navigation">
          <ShellMobileNav
            user={user}
            username={username}
            active={active}
            shortsEnabled={shortsEnabled}
          />
        </ShellErrorBoundary>
      )}
    </div>
  );
}
