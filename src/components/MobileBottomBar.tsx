import { Link, useRouterState } from "@tanstack/react-router";
import { Compass, Home, MessageCircle, Upload, User, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export function MobileBottomBar() {
  const { user } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
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
        { to: "/auth", label: "Tú", icon: User },
      ];

  return (
    <nav aria-label="Navegación móvil" className="fixed inset-x-0 bottom-0 z-[60] flex border-t border-border/70 bg-background/95 px-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl md:hidden">
      <div className="mx-auto flex w-full max-w-xl items-stretch justify-around">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.to === "/" ? pathname === "/" : pathname === item.to || pathname.startsWith(`${item.to}/`);
          return (
            <Link key={item.to} to={item.to} aria-current={active ? "page" : undefined} className={cn("flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-xl px-1 py-1.5 text-[10px] font-medium text-muted-foreground transition-colors", active ? "bg-primary/10 text-primary" : "hover:bg-muted/70 hover:text-foreground")}>
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
