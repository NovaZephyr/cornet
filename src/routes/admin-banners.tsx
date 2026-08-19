import { createFileRoute, Link, notFound, rootRouteId } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ExternalLink, Loader2, Megaphone, Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/admin-banners")({ component: AdminBannersPage });

type Banner = { message: string; color: string; icon: string | null; dismissible: boolean; is_active: boolean; updated_at: string; link_url?: string | null; link_label?: string | null };

function AdminBannersPage() {
  const { user, roles, loading } = useAuth();
  const isAdmin = roles.includes("admin");
  const [banner, setBanner] = useState<Banner | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAdmin || !user) return;
    void supabase.from("site_banner").select("*").eq("id", true).maybeSingle().then(({ data, error }) => {
      if (error) return void toast.error(error.message);
      if (data) setBanner(data as Banner);
    });
  }, [isAdmin, user]);

  if (loading) return <AppShell><div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  if (!user || !isAdmin) throw notFound({ routeId: rootRouteId, throw: true });
  if (!banner) return <AppShell><div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Cargando banner…</div></AppShell>;

  const update = <K extends keyof Banner>(key: K, value: Banner[K]) => setBanner((current) => current ? { ...current, [key]: value } : current);
  const save = async () => {
    if (!banner) return;
    setBusy(true);
    const link = banner.link_url?.trim() || null;
    if (link && !/^https?:\/\//i.test(link) && !link.startsWith("/")) {
      setBusy(false);
      toast.error("El enlace debe empezar por https://, http:// o /.");
      return;
    }
    const { error } = await supabase.from("site_banner").update({ message: banner.message.trim(), link_url: link, link_label: banner.link_label?.trim() || "Ver más", icon: banner.icon, color: banner.color, dismissible: banner.dismissible, is_active: banner.is_active, updated_at: new Date().toISOString() }).eq("id", true);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Banner actualizado");
  };

  return <AppShell><div className="mx-auto max-w-3xl space-y-6 pb-16"><div><p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">Administración</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Banner oficial</h1><p className="mt-2 text-sm text-muted-foreground">Un aviso corto para destacar novedades, actualizaciones y enlaces importantes de Cornet.</p></div><section className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-6"><div className="flex items-start justify-between gap-4"><div className="flex items-start gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Megaphone className="h-5 w-5" /></div><div><Label className="text-base">Mostrar banner</Label><p className="mt-1 text-sm text-muted-foreground">Se muestra en el shell global de Cornet mientras esté activo.</p></div></div><Switch checked={banner.is_active} onCheckedChange={(value) => update("is_active", value)} /></div><div className="space-y-2"><Label>Texto del aviso</Label><Textarea value={banner.message} onChange={(event) => update("message", event.target.value)} maxLength={220} rows={3} placeholder="Cornet se ha actualizado!" /><p className="text-xs text-muted-foreground">{banner.message.length}/220</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label>Texto del enlace</Label><Input value={banner.link_label ?? ""} onChange={(event) => update("link_label", event.target.value)} maxLength={60} placeholder="Revisa el blog" /></div><div className="space-y-2"><Label>URL de destino</Label><Input value={banner.link_url ?? ""} onChange={(event) => update("link_url", event.target.value)} placeholder="/blog o https://..." /></div></div><div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/60 p-4"><div><p className="text-sm font-medium">Permitir cerrar el aviso</p><p className="text-xs text-muted-foreground">Cada usuario puede ocultarlo hasta que cambie el banner.</p></div><Switch checked={banner.dismissible} onCheckedChange={(value) => update("dismissible", value)} /></div><div className="rounded-xl border border-border bg-background/50 p-4"><p className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vista previa</p><div className="cn-site-banner" style={{ "--cn-banner-color": banner.color } as React.CSSProperties}><span className="cn-site-banner-mark" aria-hidden="true"/><span className="cn-site-banner-label">AVISO</span><span className="cn-site-banner-message">{banner.message || "Cornet se ha actualizado!"}</span>{banner.link_url && <a href={banner.link_url} target={banner.link_url.startsWith("http") ? "_blank" : undefined} rel={banner.link_url.startsWith("http") ? "noopener noreferrer" : undefined} className="cn-site-banner-link">{banner.link_label || "Ver más"}<ExternalLink className="h-3.5 w-3.5"/></a>}</div></div><div className="flex flex-wrap gap-3"><Button onClick={() => void save()} disabled={busy}><Save className="mr-2 h-4 w-4"/>{busy ? "Guardando…" : "Guardar banner"}</Button><Button variant="outline" asChild><Link to="/admin">Volver al panel</Link></Button></div></section><section className="rounded-2xl border border-border bg-background p-5"><div className="flex gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary"/><div><p className="font-medium">Comportamiento</p><p className="mt-1 text-sm text-muted-foreground">Los enlaces internos usan la navegación de Cornet; los externos se abren en una pestaña nueva. El texto y el destino pueden cambiarse sin desplegar código.</p></div></div></section></div></AppShell>;
}
