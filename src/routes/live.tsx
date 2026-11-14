import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight, Check, CircleHelp, Copy, Eye, EyeOff, Radio,
  RefreshCw, ShieldCheck, Signal, Square, Video, Wifi,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/live")({
  head: () => ({
    meta: [
      { title: "Cornet Live Studio" },
      { name: "description", content: "Prepara y administra tus transmisiones en vivo en Cornet." },
    ],
  }),
  component: LiveStudio,
});

type LiveStream = {
  id: string;
  title: string;
  description: string | null;
  status: "offline" | "live" | "ended";
  cf_live_input_uid: string | null;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
};

type StreamCredentials = { rtmpUrl: string; streamKey: string };

function LiveStudio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const hydrated = useRef(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [credentials, setCredentials] = useState<StreamCredentials | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<"url" | "key" | null>(null);

  const streamQuery = useQuery({
    queryKey: ["my-live-stream", user?.id],
    enabled: !!user,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_streams")
        .select("id, title, description, status, cf_live_input_uid, started_at, ended_at, created_at")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as LiveStream | null;
    },
  });

  const statusQuery = useQuery({
    queryKey: ["my-live-stream-status", user?.id],
    enabled: !!user && !!streamQuery.data?.cf_live_input_uid,
    refetchInterval: 8_000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("live-stream", { body: { action: "status" } });
      if (error) throw error;
      return data.status as LiveStream["status"];
    },
  });

  const stream = streamQuery.data;
  const status = statusQuery.data ?? stream?.status ?? "offline";
  const isLive = status === "live";

  useEffect(() => {
    if (stream && !hydrated.current) {
      setTitle(stream.title ?? "");
      setDescription(stream.description ?? "");
      hydrated.current = true;
    }
  }, [stream]);

  useEffect(() => {
    if (statusQuery.data && statusQuery.data !== stream?.status) {
      void streamQuery.refetch();
    }
  }, [statusQuery.data, stream?.status, streamQuery]);

  const invoke = async (action: "start" | "end") => {
    const { data, error } = await supabase.functions.invoke("live-stream", {
      body: { action, title: title.trim(), description: description.trim() },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const prepareStream = async () => {
    if (!user || !title.trim()) {
      toast.error("Añade un título antes de preparar tu transmisión.");
      return;
    }
    setBusy(true);
    try {
      const data = await invoke("start");
      if (!data?.rtmpUrl || !data?.streamKey) throw new Error("No se recibieron las credenciales de OBS.");
      const { error } = await supabase
        .from("live_streams")
        .update({ title: title.trim(), description: description.trim() })
        .eq("user_id", user.id);
      if (error) throw error;
      setCredentials({ rtmpUrl: data.rtmpUrl, streamKey: data.streamKey });
      setShowKey(false);
      await queryClient.invalidateQueries({ queryKey: ["my-live-stream", user.id] });
      toast.success("Tu transmisión está preparada. Configura OBS para comenzar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo preparar la transmisión.");
    } finally {
      setBusy(false);
    }
  };

  const revealCredentials = async () => {
    setBusy(true);
    try {
      const data = await invoke("start");
      if (!data?.rtmpUrl || !data?.streamKey) throw new Error("No se pudieron recuperar las credenciales.");
      setCredentials({ rtmpUrl: data.rtmpUrl, streamKey: data.streamKey });
      setShowKey(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudieron recuperar las credenciales.");
    } finally {
      setBusy(false);
    }
  };

  const finishStream = async () => {
    setBusy(true);
    try {
      await invoke("end");
      setCredentials(null);
      await queryClient.invalidateQueries({ queryKey: ["my-live-stream", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["my-live-stream-status", user?.id] });
      toast.success("La transmisión se ha marcado como finalizada.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo finalizar la transmisión.");
    } finally {
      setBusy(false);
    }
  };

  const copyValue = async (value: string, field: "url" | "key") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(field);
      window.setTimeout(() => setCopied(null), 1500);
      toast.success(field === "url" ? "Servidor copiado" : "Clave copiada");
    } catch {
      toast.error("No se pudo copiar. Selecciona el valor manualmente.");
    }
  };

  if (!user) {
    return (
      <AppShell>
        <div className="mx-auto flex max-w-xl flex-col items-center py-24 text-center">
          <div className="mb-5 grid h-16 w-16 place-items-center rounded-2xl border border-border bg-card">
            <Radio className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">Cornet Live Studio</h1>
          <p className="mt-2 text-sm text-muted-foreground">Inicia sesión para configurar y administrar tus transmisiones.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl space-y-7 px-1 pb-16">
        <header className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
            CREATOR STUDIO
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Cornet Live</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
                Prepara tu directo, conecta OBS y controla tu transmisión desde un solo lugar.
              </p>
            </div>
            <Link to="/live/" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Explorar directos <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="grid gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.8fr)]">
          <div className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="border-b border-border px-5 py-4 sm:px-6">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Detalles de la transmisión</h2>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Cuéntale a tu audiencia qué vas a transmitir.</p>
            </div>
            <div className="space-y-5 p-5 sm:p-6">
              <div className="space-y-2">
                <Label htmlFor="live-title">Título</Label>
                <Input id="live-title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="¿Qué vas a transmitir?" maxLength={200} className="h-11 rounded-xl" />
                <p className="text-right text-xs text-muted-foreground">{title.length}/200</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="live-description">Descripción</Label>
                <Textarea id="live-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Añade contexto para quienes se unan a tu directo…" maxLength={5000} rows={5} className="min-h-28 resize-y rounded-xl" />
              </div>
              <div className="flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 shrink-0" />
                  Tu clave de emisión solo se muestra a ti.
                </p>
                {isLive ? (
                  <Button variant="destructive" onClick={() => void finishStream()} disabled={busy} className="rounded-xl">
                    <Square className="mr-2 h-4 w-4" /> Finalizar directo
                  </Button>
                ) : (
                  <Button onClick={() => void prepareStream()} disabled={busy || !title.trim()} className="rounded-xl">
                    {busy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Radio className="mr-2 h-4 w-4" />}
                    {busy ? "Preparando…" : stream?.cf_live_input_uid ? "Guardar y conectar OBS" : "Preparar transmisión"}
                  </Button>
                )}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="overflow-hidden rounded-3xl border border-border bg-card">
              <div className="relative flex aspect-video flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background px-5 text-center">
                <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] [background-size:28px_28px]" />
                <div className="relative grid h-14 w-14 place-items-center rounded-2xl border border-border bg-background/80 shadow-lg backdrop-blur">
                  <Radio className="h-7 w-7 text-primary" />
                </div>
                <p className="relative mt-4 text-sm font-semibold">{isLive ? "Estás en directo" : "Tu vista previa aparecerá aquí"}</p>
                <p className="relative mt-1 text-xs text-muted-foreground">{isLive ? "Cloudflare Stream está recibiendo señal." : "Conecta OBS para comenzar a emitir."}</p>
              </div>
              <div className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium">Estado de emisión</span>
                  <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${isLive ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${isLive ? "animate-pulse bg-destructive" : "bg-muted-foreground"}`} />
                    {isLive ? "EN VIVO" : status === "ended" ? "FINALIZADO" : "SIN SEÑAL"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><Wifi className="h-4 w-4" /> Conexión OBS</span>
                  <span>{isLive ? "Conectado" : "Esperando señal"}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4" /> Actualización</span>
                  <span>Automática</span>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5">
              <div className="flex items-center gap-2">
                <CircleHelp className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Antes de salir en vivo</h2>
              </div>
              <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
                <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground">1</span><span>Completa el título y la descripción de tu directo.</span></li>
                <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground">2</span><span>Prepara la transmisión y copia los datos RTMPS.</span></li>
                <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground">3</span><span>En OBS, selecciona «Servicio personalizado» y pega servidor y clave.</span></li>
                <li className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs font-semibold text-foreground">4</span><span>Pulsa «Iniciar transmisión» en OBS. Cornet detectará la señal.</span></li>
              </ol>
            </div>
          </aside>
        </section>

        {credentials && (
          <section className="rounded-3xl border border-primary/20 bg-card p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Signal className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Conecta tu software de emisión</h2>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">Copia estos datos en OBS Studio → Ajustes → Emisión → Servicio personalizado.</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">RTMPS seguro</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label>Servidor</Label>
                <div className="flex gap-2">
                  <Input readOnly value={credentials.rtmpUrl} className="h-11 min-w-0 rounded-xl font-mono text-xs" />
                  <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={() => void copyValue(credentials.rtmpUrl, "url")} aria-label="Copiar servidor">
                    {copied === "url" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="min-w-0 space-y-2">
                <Label>Clave de transmisión</Label>
                <div className="flex gap-2">
                  <Input readOnly type={showKey ? "text" : "password"} value={credentials.streamKey} className="h-11 min-w-0 rounded-xl font-mono text-xs" />
                  <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? "Ocultar clave" : "Mostrar clave"}>
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-xl" onClick={() => void copyValue(credentials.streamKey, "key")} aria-label="Copiar clave">
                    {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              No compartas tu clave. Cualquier persona que la tenga podría emitir contenido en tu canal.
            </p>
          </section>
        )}

        <section className="rounded-3xl border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4 sm:px-6">
            <div>
              <h2 className="font-semibold">Tu canal en vivo</h2>
              <p className="mt-1 text-xs text-muted-foreground">Estado y actividad de tu configuración de emisión.</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => void streamQuery.refetch()} disabled={streamQuery.isFetching} className="rounded-xl">
              <RefreshCw className={`mr-2 h-4 w-4 ${streamQuery.isFetching ? "animate-spin" : ""}`} /> Actualizar
            </Button>
          </div>
          {streamQuery.isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Cargando tu canal…</p>
          ) : stream ? (
            <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div className="min-w-0">
                <p className="truncate font-medium">{stream.title || "Tu transmisión"}</p>
                <p className="mt-1 text-xs text-muted-foreground">{stream.status === "live" ? "Transmitiendo ahora" : stream.status === "ended" ? "Última transmisión finalizada" : "Configuración creada; esperando señal de OBS"}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {!credentials && <Button variant="outline" size="sm" onClick={() => void revealCredentials()} disabled={busy} className="rounded-xl">Ver datos de OBS</Button>}
                {isLive && <span className="inline-flex items-center rounded-full bg-destructive/10 px-3 py-1.5 text-xs font-semibold text-destructive">EN VIVO</span>}
              </div>
            </div>
          ) : (
            <div className="p-6 text-sm text-muted-foreground">Todavía no has configurado una transmisión.</div>
          )}
        </section>

        <p className="text-center text-xs text-muted-foreground">
          La grabación automática y la publicación del vídeo después del directo todavía requieren activar y conectar el flujo VOD de Cloudflare Stream.
        </p>
      </main>
    </AppShell>
  );
}
