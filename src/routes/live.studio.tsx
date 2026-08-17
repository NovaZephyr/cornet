import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Radio, Square, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/live/studio")({
  head: () => ({ meta: [{ title: "Panel de transmisión — CoreNetwork" }] }),
  component: StudioPage,
});

type LiveStream = {
  id: string;
  title: string;
  description: string | null;
  status: "offline" | "live" | "ended";
  cf_live_input_uid: string | null;
};

function StudioPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showKey, setShowKey] = useState(false);
  const [creds, setCreds] = useState<{ rtmpUrl: string; streamKey: string } | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: stream, refetch } = useQuery({
    queryKey: ["my-live-stream", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("live_streams").select("*").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data as LiveStream | null;
    },
  });

  useEffect(() => {
    if (stream) {
      setTitle(stream.title ?? "");
      setDescription(stream.description ?? "");
    }
  }, [stream]);

  const invoke = async (action: "start" | "status" | "end") => {
    const { data, error } = await supabase.functions.invoke("live-stream", { body: { action } });
    if (error) throw error;
    return data;
  };

  const goLive = async () => {
    if (!user) return;
    setBusy(true);
    try {
      const data = await invoke("start");
      setCreds({ rtmpUrl: data.rtmpUrl, streamKey: data.streamKey });
      await supabase.from("live_streams").update({ title, description }).eq("user_id", user.id);
      void qc.invalidateQueries({ queryKey: ["my-live-stream", user.id] });
      toast.success("Listo — pega estos datos en OBS y empieza a transmitir");

      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = setInterval(async () => {
        const res = await invoke("status");
        if (res.status !== stream?.status) void refetch();
      }, 8000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo iniciar la transmisión");
    } finally {
      setBusy(false);
    }
  };

  const endStream = async () => {
    if (!window.confirm("¿Finalizar la transmisión?")) return;
    setBusy(true);
    try {
      await invoke("end");
      if (pollRef.current) clearInterval(pollRef.current);
      void refetch();
      toast.success("Transmisión finalizada");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  if (!user) {
    return <AppShell><p className="py-24 text-center text-muted-foreground">Inicia sesión para transmitir en vivo.</p></AppShell>;
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6 pb-16">
        <div className="flex items-center gap-2">
          <Radio className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Panel de transmisión</h1>
          {stream?.status === "live" && (
            <span className="rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground">EN VIVO</span>
          )}
        </div>

        <div className="space-y-4 rounded-2xl bg-surface p-6">
          <div className="space-y-2">
            <Label>Título de la transmisión</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Jugando con la comunidad" />
          </div>
          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {stream?.status !== "live" ? (
            <Button onClick={() => void goLive()} disabled={busy} className="rounded-full">
              <Radio className="mr-2 h-4 w-4" /> Generar datos de transmisión
            </Button>
          ) : (
            <Button onClick={() => void endStream()} disabled={busy} variant="destructive" className="rounded-full">
              <Square className="mr-2 h-4 w-4" /> Finalizar transmisión
            </Button>
          )}
        </div>

        {creds && (
          <div className="space-y-4 rounded-2xl bg-surface p-6">
            <h2 className="font-medium">Configura OBS Studio</h2>
            <p className="text-sm text-muted-foreground">
              En OBS: Ajustes → Emisión → Servicio "Personalizado" → pega estos datos → Aplicar → Iniciar transmisión.
            </p>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">URL del servidor (RTMP)</Label>
              <div className="flex gap-2">
                <Input readOnly value={creds.rtmpUrl} className="font-mono text-xs" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => { navigator.clipboard.writeText(creds.rtmpUrl); toast.success("Copiado"); }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Clave de transmisión (Stream Key)</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  type={showKey ? "text" : "password"}
                  value={creds.streamKey}
                  className="font-mono text-xs"
                />
                <Button type="button" variant="outline" size="icon" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => { navigator.clipboard.writeText(creds.streamKey); toast.success("Copiado"); }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-destructive">Nunca compartas tu Stream Key — quien la tenga puede transmitir como si fuera tu canal.</p>
            </div>

            <p className="text-sm text-muted-foreground">
              {stream?.status === "live"
                ? "¡Ya estás en vivo! Tu canal lo muestra automáticamente."
                : "Esperando señal de OBS… esto se actualiza solo en cuanto empieces a transmitir."}
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
