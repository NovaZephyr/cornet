import { useState } from "react";
import { Music2, Search } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ChannelAvatar } from "@/components/Media";

export function MusicChannelAdmin() {
  const [query, setQuery] = useState("");
  const qc = useQueryClient();
  const channels = useQuery({
    queryKey: ["admin-music-channel-search", query],
    enabled: query.trim().length >= 2,
    queryFn: async () => {
      const term = query.trim().replace(/^@+/, "");
      const [{ data: byUsername, error: usernameError }, { data: byName, error: nameError }] = await Promise.all([
        supabase.from("profiles").select("id,username,display_name,avatar_path,is_verified,is_music_channel").ilike("username", `%${term}%`).limit(15),
        supabase.from("profiles").select("id,username,display_name,avatar_path,is_verified,is_music_channel").ilike("display_name", `%${term}%`).limit(15),
      ]);
      if (usernameError) throw usernameError;
      if (nameError) throw nameError;
      const map = new Map<string, (typeof byUsername)[number]>();
      [...(byUsername ?? []), ...(byName ?? [])].forEach((profile) => map.set(profile.id, profile));
      return [...map.values()];
    },
  });
  const toggle = async (id: string, value: boolean) => {
    const { error } = await supabase.from("profiles").update({ is_music_channel: value }).eq("id", id);
    if (error) return void toast.error(error.message);
    toast.success(value ? "Canal marcado como música" : "Insignia de música retirada");
    void qc.invalidateQueries({ queryKey: ["admin-music-channel-search"] });
    void qc.invalidateQueries({ queryKey: ["channel"] });
    void qc.invalidateQueries({ queryKey: ["admin-users"] });
  };
  return <section className="rounded-2xl border border-border bg-surface p-4"><div className="mb-3 flex items-center gap-2"><Music2 className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Canales de música</h2><p className="text-xs text-muted-foreground">Marca canales para mostrar la insignia musical junto a sus demás distinciones.</p></div></div><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar canal por @usuario o nombre" className="pl-9" /></div><div className="mt-3 space-y-2">{query.trim().length >= 2 && channels.data?.map((channel) => <div key={channel.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 p-3"><ChannelAvatar path={channel.avatar_path} name={channel.display_name || channel.username} size={42} /><div className="min-w-0 flex-1"><p className="flex items-center gap-1 truncate font-medium">{channel.display_name || channel.username}</p><p className="truncate text-xs text-muted-foreground">@{channel.username}</p></div><Switch checked={channel.is_music_channel === true} onCheckedChange={(value) => void toggle(channel.id, value)} aria-label={`Canal de música de @${channel.username}`} /><Button variant="ghost" size="icon" title="Canal de música" aria-hidden="true" tabIndex={-1}><Music2 className="h-4 w-4" /></Button></div>)}{query.trim().length >= 2 && !channels.isLoading && !channels.data?.length && <p className="py-5 text-center text-sm text-muted-foreground">No encontramos canales.</p>}</div></section>;
}
