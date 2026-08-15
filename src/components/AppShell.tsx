import { useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Users,
  Upload,
  Search,
  Menu,
  Shield,
  Sparkles,
  Settings,
  LogOut,
  User as UserIcon,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChannelAvatar } from "@/components/Media";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <img
        src={logoMark}
        alt="Logo de CoreNetwork"
        width={512}
        height={512}
        className="h-8 w-8 rounded-lg"
      />
      <span className="text-xl font-bold tracking-tighter">CoreNetwork</span>
    </Link>
  );
}

type NavItem = { to: string; label: string; icon: typeof Home };

export function AppShell({ children }: { children: ReactNode }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [openSidebar, setOpenSidebar] = useState(true);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items: NavItem[] = [
    { to: "/", label: "Inicio", icon: Home },
    { to: "/community", label: "Comunidad", icon: Users },
    { to: "/partner", label: "Programa Partner", icon: Sparkles },
    { to: "/rules", label: "Guidelines", icon: Sparkles },
  ];
  if (user) {
    items.push({ to: "/upload", label: "Subir video", icon: Upload });
    items.push({ to: "/settings", label: "Personalizar canal", icon: Settings });
  }
  if (isAdmin) items.push({ to: "/admin", label: "Administración", icon: Shield });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 flex h-14 items-center gap-2 bg-background px-2 sm:px-4">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          aria-label="Menú"
          onClick={() => setOpenSidebar((v) => !v)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        <Logo />

        <form
          className="mx-auto flex w-full max-w-xl items-center px-2"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ to: "/", search: query ? { q: query } : {} });
          }}
        >
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar"
            className="h-10 rounded-l-full rounded-r-none border-border bg-input px-4 focus-visible:ring-0"
          />
          <Button
            type="submit"
            variant="secondary"
            className="h-10 rounded-l-none rounded-r-full px-5"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Button asChild variant="ghost" size="icon" className="rounded-full">
                <Link to="/upload" aria-label="Subir video">
                  <Video className="h-5 w-5" />
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full outline-none">
                  <ChannelAvatar
                    path={profile?.avatar_path}
                    name={profile?.display_name || profile?.username || "U"}
                    size={32}
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link to="/c/$username" params={{ username: profile?.username ?? "" }}>
                      <UserIcon className="mr-2 h-4 w-4" /> Mi canal
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to="/settings">
                      <Settings className="mr-2 h-4 w-4" /> Personalizar
                    </Link>
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem asChild>
                      <Link to="/admin">
                        <Shield className="mr-2 h-4 w-4" /> Administración
                      </Link>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      void signOut();
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" /> Cerrar sesión
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/auth">Iniciar sesión</Link>
            </Button>
          )}
        </div>
      </header>

      <div className="flex">
        <aside
          className={cn(
            "sticky top-14 hidden h-[calc(100vh-3.5rem)] shrink-0 overflow-y-auto p-3 scrollbar-none md:block",
            openSidebar ? "w-60" : "w-20",
          )}
        >
          <nav className="flex flex-col gap-1">
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex items-center rounded-xl px-3 py-2.5 text-sm transition-colors hover:bg-surface",
                    active && "bg-surface font-medium",
                    openSidebar ? "gap-5" : "flex-col gap-1 text-[10px]",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className={cn(!openSidebar && "text-center")}>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-4 pb-16 pt-2">{children}</main>
      </div>
    </div>
  );
}
