import { Compass, History, Home, Info, ListVideo, MessageCircle, PlaySquare, Settings, Shield, Sparkles, Upload, Users } from "lucide-react";
import type { ComponentType } from "react";

export type ShellNavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

type UseShellNavigationOptions = {
  pathname: string;
  authenticated: boolean;
  staff: boolean;
  shortsEnabled: boolean;
};

export function useShellNavigation({ pathname, authenticated, staff, shortsEnabled }: UseShellNavigationOptions) {
  const items: ShellNavItem[] = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/explore", label: "Explorar", icon: Compass },
    ...(shortsEnabled ? [{ to: "/shorts", label: "Shorts", icon: PlaySquare }] : []),
    { to: "/series", label: "Series", icon: PlaySquare },
    { to: "/community", label: "Comunidad", icon: Users },
    { to: "/history", label: "Historial", icon: History },
    { to: "/playlists", label: "Playlists", icon: ListVideo },
    ...(authenticated ? [
      { to: "/messages", label: "Mensajes", icon: MessageCircle },
      { to: "/upload", label: "Subir video", icon: Upload },
    ] : []),
    { to: "/partner", label: "Partners", icon: Sparkles },
    { to: "/settings", label: "Configuración", icon: Settings },
    { to: "/about", label: "Información", icon: Info },
    ...(staff ? [{ to: "/admin", label: "Administración", icon: Shield }] : []),
  ];

  const active = (to: string) =>
    to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`);

  return { items, active };
}
