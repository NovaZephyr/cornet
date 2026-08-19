import { createFileRoute, notFound, rootRouteId } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AdminAdsPanel } from "@/components/AdminAdsPanel";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin-campaigns")({ component: AdminCampaignsPage });

function AdminCampaignsPage() {
  const { user, roles, loading } = useAuth();
  const isStaff = roles.includes("admin") || roles.includes("moderator");
  if (loading) return <AppShell><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  if (!user || !isStaff) throw notFound({ routeId: rootRouteId, throw: true });
  return <AppShell><div className="mx-auto max-w-6xl space-y-6 pb-16"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Administración</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Campañas</h1><p className="mt-2 text-sm text-muted-foreground">Anuncios y eventos temporales están separados del Blog editorial.</p></div><AdminAdsPanel /></div></AppShell>;
}
