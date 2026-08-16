import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell, CheckCheck, Eye, MessageCircle, ShieldAlert, UserPlus, Heart, Video, Megaphone, Flag } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notificaciones — CoreNetwork" }, { name: "description", content: "Tus notificaciones de CoreNetwork." }] }),
  component: NotificationsPage,
});

type NotificationRow = { id: string; type: string; title: string; body: string; link: string | null; created_at: string; read_at: string | null };
const icons: Record<string, typeof Bell> = { warning: ShieldAlert, video_comment: MessageCircle, post_comment: MessageCircle, video_milestone: Eye, new_subscriber: UserPlus, video_like: Heart, new_video: Video, partner_update: Megaphone, report_update: Flag, system: Bell };
function timeAgo(value: string) { const s = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (s < 60) return "ahora"; if (s < 3600) return `${Math.floor(s / 60)} min`; if (s < 86400) return `${Math.floor(s / 3600)} h`; return `${Math.floor(s / 86400)} d`; }

function NotificationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);

  const unread = useMemo(() => items.filter((n) => !n.read_at).length, [items]);
  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await (supabase as any).from("notifications").select("id,type,title,body,link,created_at,read_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(100);
    setItems((data ?? []) as NotificationRow[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, [user?.id]);

  const markRead = async (id: string) => {
    const now = new Date().toISOString();
    await (supabase as any).from("notifications").update({ read_at: now }).eq("id", id).eq("user_id", user?.id);
    setItems((current) => current.map((n) => n.id === id ? { ...n, read_at: now } : n));
  };
  const markAllRead = async () => {
    if (!user) return;
    const now = new Date().toISOString();
    await (supabase as any).from("notifications").update({ read_at: now }).eq("user_id", user.id).is("read_at", null);
    setItems((current) => current.map((n) => n.read_at ? n : { ...n, read_at: now }));
  };

  if (!user) return <AppShell><div className="flex flex-col items-center justify-center py-24 text-center"><p className="text-muted-foreground">Inicia sesión para ver tus notificaciones.</p><Button asChild className="mt-4 rounded-full"><Link to="/auth">Iniciar sesión</Link></Button></div></AppShell>;

  return <AppShell><div className="mx-auto max-w-3xl py-4"><div className="mb-5 flex items-center justify-between gap-3"><div><h1 className="text-xl font-bold">Notificaciones</h1><p className="text-sm text-muted-foreground">{unread ? `${unread} sin leer` : "Todo al día"}</p></div>{unread > 0 && <Button variant="outline" size="sm" onClick={() => void markAllRead()}><CheckCheck className="mr-2 h-4 w-4" />Marcar todo como leído</Button>}</div>{loading ? <div className="py-16 text-center text-sm text-muted-foreground">Cargando...</div> : items.length === 0 ? <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center"><Bell className="mb-3 h-10 w-10 text-muted-foreground" /><p className="text-lg font-medium">No tienes notificaciones todavía</p><p className="mt-1 max-w-sm text-sm text-muted-foreground">Aquí aparecerán advertencias, comentarios, suscriptores, Me gusta, nuevos vídeos y logros de vistas.</p></div> : <div className="divide-y overflow-hidden rounded-2xl border border-border">{items.map((n) => { const Icon = icons[n.type] ?? Bell; const content = <><Icon className="mt-0.5 h-5 w-5 shrink-0" /><div className="min-w-0 flex-1"><div className="flex gap-2"><p className="font-medium">{n.title}</p>{!n.read_at && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" />}</div>{n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}<p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p></div></>; return n.link ? <Link key={n.id} to={n.link as any} onClick={() => { if (!n.read_at) void markRead(n.id); }} className={`flex gap-3 p-4 transition-colors hover:bg-surface ${!n.read_at ? "bg-surface/50" : ""}`}>{content}</Link> : <button key={n.id} onClick={() => { if (!n.read_at) void markRead(n.id); }} className={`flex w-full gap-3 p-4 text-left transition-colors hover:bg-surface ${!n.read_at ? "bg-surface/50" : ""}`}>{content}</button>; })}</div>}</div></AppShell>;
}
