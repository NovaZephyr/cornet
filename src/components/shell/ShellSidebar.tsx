import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ChannelAvatar } from "@/components/Media";

type NavItem = { to: string; label: string; icon: LucideIcon };

type ShellSidebarProps = {
  user: unknown;
  profile: { avatar_path?: string | null; display_name?: string | null; username?: string | null } | null;
  username: string;
  items: NavItem[];
  sidebarOpen: boolean;
  active: (to: string) => boolean;
};

export function ShellSidebar({ user, profile, username, items, sidebarOpen, active }: ShellSidebarProps) {
  return (
    <aside className={`cn-shell-sidebar${sidebarOpen ? "" : " cn-shell-sidebar-collapsed"}`}>
      {user && sidebarOpen && (
        <div className="cn-shell-account">
          <ChannelAvatar path={profile?.avatar_path} name={profile?.display_name || profile?.username || "U"} size={42} />
          <div>
            <strong>{profile?.display_name || profile?.username || "Tu canal"}</strong>
            <span>@{username}</span>
          </div>
        </div>
      )}
      <nav aria-label="Navegación principal">
        {items.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} data-active={active(to) ? "true" : "false"} title={!sidebarOpen ? label : undefined}>
            <Icon className="h-4 w-4" />
            <span>{sidebarOpen && label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
