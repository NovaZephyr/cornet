import { Bell, LogOut, User as UserIcon, UserRoundPlus, FlaskConical } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChannelAvatar } from "@/components/Media";
import { ShellThemeMenu } from "./ShellThemeMenu";

type ShellUserMenuProps = {
  user: unknown;
  profile: { avatar_path?: string | null; display_name?: string | null; username?: string | null } | null;
  username: string;
  signOut: () => Promise<unknown> | unknown;
  historical?: boolean;
  cosmephant?: boolean;
};

export function ShellUserMenu({ user, profile, username, signOut, historical = false, cosmephant = false }: ShellUserMenuProps) {
  if (historical) {
    return (
      <div className="cn-shell-actions cn-shell-actions--classic-links" aria-label="Enlaces de cuenta">
        <Link to="/auth">Sign Up</Link><span>|</span>
        {user ? <Link to="/c/$username" params={{ username }}>My Account</Link> : <Link to="/auth">My Account</Link>}
        <span>|</span><Link to="/history">History</Link><span>|</span>
        <Link to="/about">Help</Link><span>|</span>
        {user ? <button type="button" onClick={() => void signOut()}>Log Out</button> : <Link to="/auth">Log In</Link>}
        <span>|</span><Link to="/">Site</Link>
      </div>
    );
  }

  if (cosmephant) {
    return (
      <div className="cn-shell-actions cn-shell-actions--cosmephant">
        <Link to="/upload" className="cn-shell-cosmephant-upload"><span aria-hidden="true">+</span> Subir</Link>
        <Link to="/notifications" className="cn-shell-cosmephant-notifications" aria-label="Notificaciones" title="Notificaciones">
          <Bell className="h-5 w-5" aria-hidden="true" />
        </Link>
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="cn-shell-avatar-button cn-shell-cosmephant-avatar" aria-label="Abrir menú de usuario">
                <ChannelAvatar path={profile?.avatar_path} name={profile?.display_name || profile?.username || "U"} size={36} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>@{username || "usuario"}</DropdownMenuLabel>
              <DropdownMenuItem asChild><Link to="/c/$username" params={{ username }}><UserIcon className="mr-2 h-4 w-4" />Mi canal</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/notifications">Notificaciones</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/settings">Configuración</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/account-security"><UserRoundPlus className="mr-2 h-4 w-4" />Cambiar / agregar cuenta</Link></DropdownMenuItem>
              <DropdownMenuItem asChild><Link to="/experiments"><FlaskConical className="mr-2 h-4 w-4" />Experimentos</Link></DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link to="/auth" className="cn-shell-cosmephant-guest" aria-label="Iniciar sesión" title="Iniciar sesión" />
        )}
      </div>
    );
  }

  return (
    <div className="cn-shell-actions">
      <ShellThemeMenu />
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="cn-shell-avatar-button" aria-label="Abrir menú de usuario">
              <ChannelAvatar path={profile?.avatar_path} name={profile?.display_name || profile?.username || "U"} size={34} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>@{username || "usuario"}</DropdownMenuLabel>
            <DropdownMenuItem asChild><Link to="/c/$username" params={{ username }}><UserIcon className="mr-2 h-4 w-4" />Mi canal</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/notifications">Notificaciones</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/settings">Configuración</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/account-security"><UserRoundPlus className="mr-2 h-4 w-4" />Cambiar / agregar cuenta</Link></DropdownMenuItem>
            <DropdownMenuItem asChild><Link to="/experiments"><FlaskConical className="mr-2 h-4 w-4" />Experimentos</Link></DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Cerrar sesión</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button asChild size="sm"><Link to="/auth">Iniciar sesión</Link></Button>
      )}
    </div>
  );
}
