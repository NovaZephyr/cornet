import { Bell, Check, LogOut, User as UserIcon, UserRoundPlus, FlaskConical } from "lucide-react";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChannelAvatar } from "@/components/Media";
import { ShellThemeMenu } from "./ShellThemeMenu";
import { supabase } from "@/integrations/supabase/client";
import { timeAgo } from "@/lib/format";


type ShellNotification = { id: string; title: string; body: string; link: string | null; created_at: string; read_at: string | null };

function ShellNotificationsMenu({ userId }: { userId: string | null }) {
  const qc = useQueryClient();
  const key = ["notifications", userId];
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("id,title,body,link,created_at,read_at").order("created_at", { ascending: false }).limit(6);
      if (error) throw error;
      return (data ?? []) as ShellNotification[];
    },
  });
  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel("header-notifications-" + userId).on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications", filter: "user_id=eq." + userId }, () => void qc.invalidateQueries({ queryKey: key })).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [qc, userId]);
  const unread = notifications.filter((item) => !item.read_at).length;
  const markAllRead = async () => {
    if (!userId || !unread) return;
    const readAt = new Date().toISOString();
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("user_id", userId).is("read_at", null);
    if (error) return;
    qc.setQueryData<ShellNotification[]>(key, (items = []) => items.map((item) => ({ ...item, read_at: item.read_at ?? readAt })));
    void qc.invalidateQueries({ queryKey: key });
  };
  const markRead = async (item: ShellNotification) => {
    if (!userId || item.read_at) return;
    const readAt = new Date().toISOString();
    qc.setQueryData<ShellNotification[]>(key, (items = []) => items.map((row) => row.id === item.id ? { ...row, read_at: readAt } : row));
    const { error } = await supabase.from("notifications").update({ read_at: readAt }).eq("id", item.id).eq("user_id", userId);
    if (error) void qc.invalidateQueries({ queryKey: key });
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="cn-shell-cosmephant-notifications cn-cosmephant-notification-trigger" aria-label={unread ? "Notificaciones, " + unread + " sin leer" : "Notificaciones"} title="Notificaciones">
          <Bell className="h-5 w-5" aria-hidden="true" />
          {unread > 0 && <span className="cn-cosmephant-notification-count">{unread > 9 ? "9+" : unread}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={10} className="cn-cosmephant-notification-popover">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <DropdownMenuLabel className="p-0 text-base font-semibold">Notificaciones</DropdownMenuLabel>
          {unread > 0 && <button type="button" onClick={() => void markAllRead()} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Check className="h-3.5 w-3.5" />Marcar como leídas</button>}
        </div>
        <DropdownMenuSeparator className="m-0" />
        {!userId ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground"><p>Inicia sesión para ver tus notificaciones.</p><Link to="/auth" className="mt-3 inline-block font-medium text-foreground">Iniciar sesión</Link></div>
        ) : isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">Cargando notificaciones…</div>
        ) : notifications.length ? (
          <div className="max-h-[min(70vh,420px)] overflow-y-auto py-1">
            {notifications.map((item) => <Link key={item.id} to={item.link ?? "/notifications"} onClick={() => void markRead(item)} className={"flex items-start gap-3 px-4 py-3 transition-colors hover:bg-white/5 " + (item.read_at ? "" : "bg-white/[0.035]")}>
              <span className={"mt-1.5 h-2 w-2 shrink-0 rounded-full " + (item.read_at ? "bg-transparent" : "bg-primary")} />
              <span className="min-w-0 flex-1"><span className="block text-sm font-medium leading-5">{item.title}</span>{item.body && <span className="mt-0.5 block line-clamp-2 text-xs leading-4 text-muted-foreground">{item.body}</span>}<span className="mt-1 block text-[11px] text-muted-foreground">{timeAgo(item.created_at)}</span></span>
            </Link>)}
          </div>
        ) : (
          <div className="px-4 py-9 text-center text-sm text-muted-foreground">No tienes notificaciones nuevas.</div>
        )}
        <DropdownMenuSeparator className="m-0" />
        <Link to="/notifications" className="block px-4 py-3 text-center text-sm font-medium text-foreground hover:bg-white/5">Ver todas las notificaciones</Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type ShellUserMenuProps = {
  user: unknown;
  profile: { avatar_path?: string | null; display_name?: string | null; username?: string | null } | null;
  username: string;
  signOut: () => Promise<unknown> | unknown;
  historical?: boolean;
  cosmephant?: boolean;
  studio?: boolean;
};

export function ShellUserMenu({ user, profile, username, signOut, historical = false, cosmephant = false, studio = false }: ShellUserMenuProps) {
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

  const userId = typeof user === "object" && user !== null && "id" in user && typeof (user as { id?: unknown }).id === "string" ? (user as { id: string }).id : null;

  if (cosmephant) {
    return (
      <div className="cn-shell-actions cn-shell-actions--cosmephant">
        <Link to="/studio" search={{ create: true }} className="cn-shell-cosmephant-upload"><span aria-hidden="true">+</span> {studio ? "Crear" : "Subir"}</Link>
        <ShellNotificationsMenu userId={userId} />
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
