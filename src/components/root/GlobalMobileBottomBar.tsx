import { Compass, Home, MessageCircle, Upload, User as UserIcon, Users } from "lucide-react";
import { Link, useLocation, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export function GlobalMobileBottomBar() {
  const { user } = useAuth();
  const location = useLocation();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  if (location.pathname === "/shorts") return null;

  const items = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/explore", label: "Explorar", icon: Compass },
    { to: "/community", label: "Comunidad", icon: Users },
    ...(user
      ? [
          { to: "/messages", label: "Mensajes", icon: MessageCircle },
          { to: "/upload", label: "Subir", icon: Upload },
        ]
      : [{ to: "/auth", label: "Tú", icon: UserIcon }]),
  ];

  return (
    <nav className="cn-global-mobile-bar" aria-label="Navegación móvil">
      {items.map((item) => {
        const Icon = item.icon;
        const active = pathname === item.to || (item.to !== "/" && pathname.startsWith(`${item.to}/`));
        return (
          <Link key={item.to} to={item.to} data-active={active ? "true" : "false"} aria-current={active ? "page" : undefined}>
            <Icon />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
