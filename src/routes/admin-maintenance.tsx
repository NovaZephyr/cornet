import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShieldCheck, Wrench } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin-maintenance")({ component: AdminMaintenancePage });

function AdminMaintenancePage() {
  const { isAdmin, loading } = useAuth();
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("Estamos realizando mejoras y pruebas en la plataforma. Volveremos a estar disponibles muy pronto.");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    void supabase
      .from("site_settings")
      .select("maintenance_mode, maintenance_message")
      .eq("id", true)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) {
          toast.error(error.message);
          return;
        }
        if (data) {
          setEnabled(Boolean(data.maintenance_mode));
          setMessage(data.maintenance_message || message);
        }
        setLoaded(true);
      });
  }, [isAdmin]);

  const save = async () => {
    if (!isAdmin) return;
    setBusy(true);
    const { error } = await supabase
      .from("site_settings")
      .update({
        maintenance_mode: enabled,
        maintenance_message: message.trim() || "Estamos realizando mejoras y pruebas en la plataforma. Volveremos a estar disponibles muy pronto.",
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(enabled ? "Modo mantenimiento activado" : "Modo mantenimiento desactivado");
  };

  if (loading) {
    return <AppShell><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  }

  if (!isAdmin) {
    return <AppShell><div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center"><ShieldCheck className="h-10 w-10 text-muted-foreground" /><h1 className="mt-4 text-xl font-semibold">Acceso restringido</h1><p className="mt-2 text-sm text-muted-foreground">Esta sección solo está disponible para administradores.</p><Button asChild className="mt-5"><Link to="/">Volver al inicio</Link></Button></div></AppShell>;
  }

  return <AppShell><div className="mx-auto max-w-3xl space-y-6 pb-16"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Administración</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Modo mantenimiento</h1><p className="mt-2 text-sm text-muted-foreground">Controla el acceso global a CoreNetwork. Los administradores mantienen acceso completo mientras el mantenimiento está activo.</p></div><section className="rounded-2xl border border-border bg-surface p-6 shadow-sm"><div className="flex items-center justify-between gap-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Wrench className="h-5 w-5" /></div><div><Label className="text-base">Mantenimiento global</Label><p className="mt-1 text-sm text-muted-foreground">{enabled ? "La web está cerrada para usuarios normales." : "La web está disponible para todos."}</p></div></div><Switch checked={enabled} onCheckedChange={setEnabled} /></div><div className="mt-6 space-y-2"><Label>Mensaje que verán los usuarios</Label><Textarea rows={5} maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Escribe el mensaje de mantenimiento…" /><p className="text-xs text-muted-foreground">{message.length}/500 caracteres</p></div><div className="mt-6 flex flex-wrap items-center gap-3"><Button onClick={() => void save()} disabled={busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{busy ? "Guardando…" : "Guardar cambios"}</Button><Button variant="outline" asChild><Link to="/admin">Volver al panel</Link></Button></div></section><section className="rounded-2xl border border-border bg-background p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary" /><div><p className="font-medium">Comportamiento durante el mantenimiento</p><ul className="mt-2 space-y-1 text-sm text-muted-foreground"><li>• Los visitantes y usuarios normales ven la pantalla de mantenimiento.</li><li>• Los administradores pueden usar toda la plataforma.</li><li>• La página de inicio de sesión permanece disponible.</li><li>• El estado se guarda en Supabase y no depende del código del frontend.</li></ul></div></div></section></div></AppShell>;
}
