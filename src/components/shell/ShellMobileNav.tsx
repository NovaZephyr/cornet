import { Compass, Home, MessageCircle, Upload, User as UserIcon, Users, PlaySquare } from "lucide-react";
import { Link } from "@tanstack/react-router";

type NavItem = { to: string; label: string; icon: typeof Home };

type ShellMobileNavProps = {
  user: unknown;
  username: string;
  active: (to: string) => boolean;
  shortsEnabled?: boolean;
};

export function ShellMobileNav({ user, username, active, shortsEnabled = false }: ShellMobileNavProps) {
  const items: NavItem[] = user
    ? [
        { to: "/", label: "Inicio", icon: Home },
        { to: "/explore", label: "Explorar", icon: Compass },
        ...(shortsEnabled ? [{ to: "/shorts", label: "Shorts", icon: PlaySquare }] : []),
        { to: "/community", label: "Comunidad", icon: Users },
        { to: "/messages", label: "Mensajes", icon: MessageCircle },
        { to: "/upload", label: "Subir", icon: Upload },
      ]
    : [
        { to: "/", label: "Inicio", icon: Home },
        { to: "/explore", label: "Explorar", icon: Compass },
        ...(shortsEnabled ? [{ to: "/shorts", label: "Shorts", icon: PlaySquare }] : []),
        { to: "/community", label: "Comunidad", icon: Users },
        { to: "/auth", label: "Tú", icon: UserIcon },
      ];

  return (
    <nav className="cn-shell-mobile-nav" aria-label="Navegación móvil">
      {items.map(({ to, label, icon: Icon }) => (
        <Link key={to} to={to} data-active={active(to) ? "true" : "false"}>
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
