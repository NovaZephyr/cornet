import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ChannelAvatar, VerifiedBadge } from "@/components/Media";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

export function AdminSpotlightPanel() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [customText, setCustomText] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [saving, setSaving] = useState(false);

  const configQuery = useQuery({
    queryKey: ["admin-home-spotlight"],
    queryFn: async () => {
      const db = supabase as any;
      const { data, error } = await db.from("home_spotlight").select("channel_id,custom_text,enabled").eq("id", true).maybeSingle();
      if (error) throw error;
      return data as { channel_id: string; custom_text: string; enabled: boolean } | null;
    },
  });

  useEffect(() => {
    if (!configQuery.data) return;
    setSelectedChannel(configQuery.data.channel_id);
    setCustomText(configQuery.data.custom_text ?? "");
    setEnabled(Boolean(configQuery.data.enabled));
  }, [configQuery.data]);

  const channelsQuery = useQuery({
    queryKey: ["admin-spotlight-channels", search.trim()],
    queryFn: async () => {
      const db = supabase as any;
      let query = db.from("profiles").select("id,username,display_name,description,avatar_path,is_verified,subscriber_count").order("display_name", { ascending: true }).limit(20);
      if (search.trim()) query = query.or(`username.ilike.%${search.trim()}%,display_name.ilike.%${search.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 60_000,
  });

  const selected = channelsQuery.data?.find((channel: { id: string }) => channel.id === selectedChannel);

  const save = async () => {
    if (!selectedChannel) return toast.error("Selecciona un canal para el Spotlight");
    setSaving(true);
    try {
      const db = supabase as any;
      const { error } = await db.from("home_spotlight").upsert({ id: true, channel_id: selectedChannel, custom_text: customText.trim(), enabled, updated_at: new Date().toISOString() });
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["admin-home-spotlight"] });
      await qc.invalidateQueries({ queryKey: ["youtube-2009-spotlight"] });
      toast.success(enabled ? "Spotlight actualizado" : "Spotlight guardado y desactivado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo guardar el Spotlight");
    } finally {
      setSaving(false);
    }
  };

  return <section className="cn-admin-card space-y-5">
    <div className="cn-admin-card-title"><Sparkles size={16}/> YouTube 2009 · Spotlight</div>
    <p className="text-sm text-muted-foreground">Selecciona el canal que aparecerá en el Spotlight y escribe el texto editorial personalizado. Los cuatro videos mostrados se calculan automáticamente por número de vistas.</p>
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="space-y-3">
        <label className="text-sm font-medium">Canal destacado</label>
        <div className="flex items-center gap-2 rounded-md border border-border bg-background px-3"><Search size={15} className="text-muted-foreground"/><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar canal…" className="border-0 bg-transparent focus-visible:ring-0"/></div>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-md border border-border p-1">
          {(channelsQuery.data ?? []).map((channel: { id: string; username: string; display_name: string; avatar_path: string | null; is_verified: boolean; subscriber_count: number | null }) => <button key={channel.id} type="button" onClick={() => setSelectedChannel(channel.id)} className={`flex w-full items-center gap-3 rounded-md p-2 text-left ${selectedChannel === channel.id ? "bg-primary/10" : "hover:bg-muted"}`}><ChannelAvatar path={channel.avatar_path} name={channel.display_name || channel.username} size={38}/><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{channel.display_name || channel.username}{channel.is_verified && <VerifiedBadge className="ml-1 inline h-3.5 w-3.5"/>}</strong><small className="text-xs text-muted-foreground">@{channel.username} · {channel.subscriber_count ?? 0} suscriptores</small></span></button>)}
          {!channelsQuery.data?.length && <p className="p-5 text-center text-xs text-muted-foreground">No se encontraron canales.</p>}
        </div>
      </div>
      <div className="space-y-4">
        <div className="rounded-md border border-border bg-background p-3">{selected ? <div className="flex items-center gap-3"><ChannelAvatar path={selected.avatar_path} name={selected.display_name || selected.username} size={48}/><div className="min-w-0"><strong className="block truncate">{selected.display_name || selected.username}</strong><span className="text-xs text-muted-foreground">@{selected.username}</span></div></div> : <p className="text-sm text-muted-foreground">Selecciona un canal.</p>}</div>
        <div><label className="text-sm font-medium">Texto del Spotlight</label><Textarea value={customText} onChange={(event) => setCustomText(event.target.value)} placeholder="Escribe el mensaje que acompañará al canal…" className="mt-2 min-h-28" maxLength={500}/><p className="mt-1 text-right text-[11px] text-muted-foreground">{customText.length}/500</p></div>
        <div className="flex items-center justify-between rounded-md border border-border p-3"><div><strong className="text-sm">Activar Spotlight</strong><p className="text-xs text-muted-foreground">Solo se muestra en YouTube 2009.</p></div><Switch checked={enabled} onCheckedChange={setEnabled}/></div>
        <Button onClick={() => void save()} disabled={saving || !selectedChannel}>{saving ? "Guardando…" : "Guardar Spotlight"}</Button>
      </div>
    </div>
  </section>;
}
