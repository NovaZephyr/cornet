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
  studio?: boolean;
};

const AppShellContext = createContext(false);

export function AppShell({ children, hideSidebar = false, fullscreen = false, studio = false }: AppShellProps) {
  if (useContext(AppShellContext)) return <>{children}</>;

  return (
    <AppShellContext.Provider value={true}>
      <AppShellFrame hideSidebar={hideSidebar} fullscreen={fullscreen} studio={studio}>
        {children}
      </AppShellFrame>
    </AppShellContext.Provider>
  );
}

function AppShellFrame({ children, hideSidebar = false, fullscreen = false, studio = false }: AppShellProps) {
  const { user, profile, username, isStaff, signOut } = useShellUser();
  const { theme } = useTheme();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { sidebarOpen, mobileOpen, handleMenuClick } = useShellState(pathname, theme);
  const { shortsEnabled } = useShellExperiments();
  const studioMode = studio || pathname === "/upload";

  const { items, active } = useShellNavigation({
    pathname,
    authenticated: Boolean(user),
    staff: isStaff,
    shortsEnabled,
  });

  const isYoutube2009 = theme === "yt-2009";
  const isYoutubeClassic = theme === "yt-classic";
  const historicalNavItems = isYoutubeClassic
    ? [
        { to: "/explore", label: "Videos" },
        { to: "/explore", label: "Categories", search: { view: "videos" as const } },
        { to: "/explore", label: "Channels", search: { view: "channels" as const } },
        { to: "/community", label: "Community" },
      ]
    : isYoutube2009
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
        sidebarOpen && "cn-shell-sidebar-open",
        fullscreen && "cn-shell--fullscreen",
      )}
      data-theme-id={theme}
    >
      <ShellErrorBoundary label="header">
        <ShellHeader
          mobileOpen={mobileOpen}
          cosmephant={theme === "cosmephant-2"}
          onMenuClick={handleMenuClick}
          menuHidden={studioMode}
          logo={<ShellLogo studio={studioMode} />}
          historicalNavItems={historicalNavItems}
          historicalNavMode={isYoutubeClassic ? "row" : "inline"}
          historicalSearch={isYoutubeClassic}
          actions={
            <ShellUserMenu
              user={user}
              profile={profile}
              username={username}
              signOut={signOut}
              historical={isYoutubeClassic}
              cosmephant={theme === "cosmephant-2"}
            />
          }
        />
      </ShellErrorBoundary>

      <div
        className={cn(
          "cn-shell-layout",
          (hideSidebar || studioMode || isYoutube2009 || isYoutubeClassic) && "cn-shell-layout--no-sidebar",
        )}
        data-sidebar-hidden={hideSidebar || studioMode || isYoutube2009 || isYoutubeClassic ? "true" : "false"}
      >
        {!hideSidebar && !studioMode && !isYoutube2009 && !isYoutubeClassic && (
          <ShellErrorBoundary label="sidebar">
            <ShellSidebar
              user={user}
              profile={profile}
              username={username}
              items={items}
              sidebarOpen={sidebarOpen || mobileOpen}
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

      {!fullscreen && !studioMode && (
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
