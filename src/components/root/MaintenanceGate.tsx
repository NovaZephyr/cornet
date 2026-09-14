import { useEffect, useState, type ReactNode } from "react";
import { ShieldCheck } from "lucide-react";
import { Outlet, useLocation } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

function MaintenanceScreen({ message }: { message: string }) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,hsl(var(--primary)/0.12),transparent_48%)]" aria-hidden="true" />
      <section className="relative z-10 flex max-w-lg flex-col items-center text-center">
        <img src="/favicon.png" alt="Cornet logo" className="h-14 w-14" />
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Cornet</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Estamos trabajando para ti</h1>
        <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">{message}</p>
        <div className="mt-7 rounded-2xl border border-border bg-background/70 p-4 text-left">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div><p className="font-semibold text-foreground">Acceso temporalmente limitado</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Los administradores mantienen acceso completo mientras terminamos las mejoras.</p></div>
          </div>
        </div>
        <a href="/auth" className="mt-7 inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90">Entrar como administrador</a>
      </section>
    </main>
  );
}

function LoadingScreen() {
  return <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Cargando" />;
}

export function MaintenanceGate({ children }: { children?: ReactNode }) {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const isAuthRoute = location.pathname === "/auth";
  const forceMaintenance = typeof window !== "undefined" && window.location.search.includes("forceMaintenance=true");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [maintenance, setMaintenance] = useState<{ enabled: boolean; message: string } | null>(null);

  useEffect(() => {
    if (isAuthRoute) return;
    let cancelled = false;
    setSettingsLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase.from("site_settings").select("maintenance_mode, maintenance_message").eq("id", true).maybeSingle();
        if (cancelled) return;
        if (error) {
          console.error("[Cornet] maintenance settings failed", error);
          setMaintenance({ enabled: false, message: "" });
        } else {
          setMaintenance({ enabled: Boolean(data?.maintenance_mode), message: data?.maintenance_message ?? "" });
        }
      } catch (error) {
        if (cancelled) return;
        console.error("[Cornet] maintenance settings failed", error);
        setMaintenance({ enabled: false, message: "" });
      } finally {
        if (!cancelled) setSettingsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthRoute]);

  const content = children ?? <Outlet />;
  if (isAuthRoute) return <>{content}</>;
  if (loading || settingsLoading || maintenance === null) return <LoadingScreen />;
  if ((maintenance.enabled || forceMaintenance) && !isAdmin) return <MaintenanceScreen message={maintenance.message} />;
  return <>{content}</>;
}
