import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/format";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notificaciones — CoreNetwork" },
      { name: "description", content: "Tus notificaciones de CoreNetwork." },
    ],
  }),
  component: NotificationsPage,
});

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  link: string | null;
  created_at: string;
  read_at: string | null;
};

function NotificationsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Notification[];
    },
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("my-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void qc.invalidateQueries({ queryKey: ["notifications", user.id] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, qc]);

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
    void qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).is("read_at", null);
    void qc.invalidateQueries({ queryKey: ["notifications", user.id] });
  };

  const remove = async (id: string) => {
    await supabase.from("notifications").delete().eq("id", id);
    void qc.invalidateQueries({ queryKey: ["notifications", user?.id] });
  };

  if (!user) {
    return (
      <AppShell>
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <p className="text-muted-foreground">Inicia sesión para ver tus notificaciones.</p>
          <Button asChild className="mt-4 rounded-full">
            <Link to="/auth">Iniciar sesión</Link>
          </Button>
        </div>
      </AppShell>
    );
  }

  const unreadCount = notifications?.filter((n) => !n.read_at).length ?? 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Notificaciones</h1>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => void markAllRead()}>
              <Check className="mr-1.5 h-3.5 w-3.5" /> Marcar todas como leídas
            </Button>
          )}
        </div>

        {notifications && notifications.length > 0 ? (
          <div className="space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 rounded-xl p-4 ${n.read_at ? "bg-surface/50" : "bg-surface"}`}
              >
                {!n.read_at && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />}
                <Link
                  to={n.link ?? "/notifications"}
                  onClick={() => !n.read_at && void markRead(n.id)}
                  className="min-w-0 flex-1"
                >
                  <p className="text-sm font-medium">{n.title}</p>
                  {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted-foreground">{timeAgo(n.created_at)}</p>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => void remove(n.id)} aria-label="Eliminar">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
            <Bell className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-lg font-medium">No tienes notificaciones todavía</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Aquí verás avisos cuando alguien comente tus videos, te siga, o los creadores que sigues suban
              contenido nuevo.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
