import { createFileRoute, Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notificaciones — CoreNetwork" },
      { name: "description", content: "Tus notificaciones de CoreNetwork." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { user } = useAuth();

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

  // TODO: cuando exista la tabla `notifications`, reemplazar este estado
  // por un useQuery real (nuevos subs, comentarios en tus videos, etc.)
  return (
    <AppShell>
      <h1 className="mb-4 text-xl font-bold">Notificaciones</h1>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center">
        <Bell className="mb-3 h-10 w-10 text-muted-foreground" />
        <p className="text-lg font-medium">No tienes notificaciones todavía</p>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          Aquí verás avisos cuando alguien comente tus videos o los creadores que sigues suban
          contenido nuevo.
        </p>
      </div>
    </AppShell>
  );
}
