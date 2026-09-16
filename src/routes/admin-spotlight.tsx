import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { AdminSpotlightPanel } from "@/components/AdminSpotlightPanel";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin-spotlight")({
  head: () => ({ meta: [{ title: "YouTube 2009 Spotlight — Administración" }, { name: "robots", content: "noindex, nofollow, noarchive" }] }),
  component: AdminSpotlightPage,
});

function AdminSpotlightPage() {
  const { user, roles, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Comprobando acceso…</div>;
  if (!user || !roles.includes("admin")) throw notFound({ routeId: rootRouteId, throw: true });

  return <AppShell><div className="cn-admin-page"><header className="cn-admin-header"><div><div className="cn-admin-kicker">YouTube 2009</div><h1>Spotlight</h1><p>Configura el canal destacado y el texto editorial de la portada histórica.</p></div></header><AdminSpotlightPanel /></div></AppShell>;
}
