import { Compass, Home, MessageCircle, Upload, User as UserIcon, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { ChannelAvatar } from "@/components/Media";

type ShellMobileNavProps = {
  user: unknown;
  username: string;
  active: (to: string) => boolean;
};

export function ShellMobileNav({ user, username, active }: ShellMobileNavProps) {
  const items = user
    ? [
        { to: "/", label: "Inicio", icon: Home },
        { to: "/explore", label: "Explorar", icon: Compass },
        { to: "/community", label: "Comunidad", icon: Users },
        { to: "/messages", label: "Mensajes", icon: MessageCircle },
        { to: "/upload", label: "Subir", icon: Upload },
      ]
    : [
        { to: "/", label: "Inicio", icon: Home },
        { to: "/explore", label: "Explorar", icon: Compass },
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
