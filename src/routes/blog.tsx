import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, SignedImage } from "@/components/Media";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { timeAgo } from "@/lib/format";
import { fetchProfilesByIds } from "@/lib/queries";

export const Route = createFileRoute("/blog")({
  head: () => ({
    meta: [
      { title: "Anuncios — Cornet" },
      { name: "description", content: "Novedades y anuncios oficiales del equipo de Cornet." },
      { property: "og:title", content: "Anuncios — Cornet" },
    ],
  }),
  component: BlogPage,
});

type Announcement = { id: string; author_id: string; title: string; body: string | null; image_path: string | null; post_type: "text" | "image" | "poll"; created_at: string };
type PollOption = { id: string; announcement_id: string; label: string; position: number };
type PollResult = { option_id: string; label: string; votes: number };

function PollBlock({ announcementId }: { announcementId: string }) {
  const { user } = useAuth(); const qc = useQueryClient();
  const { data: options } = useQuery({ queryKey: ["poll-options", announcementId], queryFn: async () => { const { data } = await supabase.from("announcement_poll_options").select("*").eq("announcement_id", announcementId).order("position"); return (data ?? []) as PollOption[]; } });
  const { data: results } = useQuery({ queryKey: ["poll-results", announcementId], queryFn: async () => { const { data, error } = await supabase.rpc("get_poll_results", { _announcement_id: announcementId }); if (error) throw error; return (data ?? []) as PollResult[]; } });
  const { data: myVote } = useQuery({ queryKey: ["my-poll-vote", announcementId, user?.id], enabled: !!user, queryFn: async () => { const { data, error } = await supabase.rpc("get_my_poll_vote", { _announcement_id: announcementId }); if (error) throw error; return data as string | null; } });
  const vote = async (optionId: string) => { if (!user) return void toast.error("Inicia sesión para votar"); const { error } = await supabase.from("announcement_poll_votes").insert({ announcement_id: announcementId, option_id: optionId, user_id: user.id }); if (error) return void toast.error(error.message); void qc.invalidateQueries({ queryKey: ["poll-results", announcementId] }); void qc.invalidateQueries({ queryKey: ["my-poll-vote", announcementId, user.id] }); };
  const totalVotes = results?.reduce((sum, r) => sum + Number(r.votes), 0) ?? 0;
  return <div className="mt-3 space-y-2">{options?.map((opt) => { const result = results?.find((r) => r.option_id === opt.id); const votes = result ? Number(result.votes) : 0; const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0; const isMine = myVote === opt.id; const alreadyVoted = !!myVote; return <button key={opt.id} type="button" disabled={alreadyVoted} onClick={() => void vote(opt.id)} className="relative w-full overflow-hidden rounded-lg border border-border p-2.5 text-left text-sm disabled:cursor-default">{alreadyVoted && <div className="absolute inset-y-0 left-0 bg-primary/15" style={{ width: `${pct}%` }} />}<div className="relative flex items-center justify-between"><span className={isMine ? "font-semibold" : ""}>{opt.label}</span>{alreadyVoted && <span className="text-xs text-muted-foreground">{pct}% ({votes})</span>}</div></button>; })}{totalVotes > 0 && <p className="text-xs text-muted-foreground">{totalVotes} voto{totalVotes === 1 ? "" : "s"} en total</p>}</div>;
}

function BlogPage() {
  const { data: announcements, isLoading } = useQuery({ queryKey: ["announcements"], queryFn: async () => { const { data, error } = await supabase.from("announcements").select("*").order("created_at", { ascending: false }); if (error) throw error; const rows = (data ?? []) as Announcement[]; const profiles = await fetchProfilesByIds(rows.map((r) => r.author_id)); return rows.map((r) => ({ ...r, author: profiles.get(r.author_id) ?? null })); } });
  return <AppShell><div className="mx-auto max-w-2xl"><h1 className="mb-6 flex items-center gap-2 text-xl font-bold"><Megaphone className="h-5 w-5 text-primary" /> Anuncios</h1>{isLoading ? <p className="py-12 text-center text-muted-foreground">Cargando…</p> : announcements && announcements.length > 0 ? <div className="space-y-5">{announcements.map((a) => <article key={a.id} className="rounded-2xl bg-surface p-5"><div className="flex items-center gap-3"><ChannelAvatar path={a.author?.avatar_path ?? null} name={a.author?.display_name || "Cornet"} size={36} /><div><p className="text-sm font-medium">{a.author?.display_name || "Equipo Cornet"}</p><p className="text-xs text-muted-foreground">{timeAgo(a.created_at)}</p></div></div><h2 className="mt-3 text-lg font-semibold">{a.title}</h2>{a.body && <p className="mt-1 whitespace-pre-wrap text-sm">{a.body}</p>}{a.post_type === "image" && a.image_path && <div className="mt-3 overflow-hidden rounded-xl bg-background"><SignedImage path={a.image_path} alt={a.title} className="w-full object-cover" /></div>}{a.post_type === "poll" && <PollBlock announcementId={a.id} />}</article>)}</div> : <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-24 text-center"><Megaphone className="mb-3 h-10 w-10 text-muted-foreground" /><p className="text-lg font-medium">Todavía no hay anuncios</p><p className="mt-1 text-sm text-muted-foreground">Aquí verás las novedades oficiales de Cornet.</p></div>}</div></AppShell>;
}
