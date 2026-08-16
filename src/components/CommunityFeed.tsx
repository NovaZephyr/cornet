import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, ImagePlus, MessageCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ChannelAvatar, SignedImage, VerifiedBadge } from "@/components/Media";
import { FormattedText } from "@/components/FormattedText";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile } from "@/lib/storage";
import { fetchProfilesByIds } from "@/lib/queries";
import { timeAgo } from "@/lib/format";
import { syncCommunityPostHashtags } from "@/lib/hashtags";

type PostRow = { id: string; user_id: string; content: string; image_path: string | null; created_at: string };
type CommentRow = { id: string; post_id: string; user_id: string; content: string; created_at: string };

export function CommunityFeed({ channelId }: { channelId?: string | undefined }) {
  const { user, profile, isAdmin } = useAuth();
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const key = ["community", channelId ?? "all"];

  const { data: posts } = useQuery({ queryKey: key, queryFn: async () => { let q = supabase.from("community_posts").select("id, user_id, content, image_path, created_at").order("created_at", { ascending: false }).limit(50); if (channelId) q = q.eq("user_id", channelId); const { data, error } = await q; if (error) throw error; const rows = (data ?? []) as PostRow[]; const profiles = await fetchProfilesByIds(rows.map((r) => r.user_id)); return rows.map((r) => ({ ...r, author: profiles.get(r.user_id) ?? null })); } });
  const { data: likes } = useQuery({ queryKey: ["post-likes", channelId ?? "all"], queryFn: async () => { const { data, error } = await supabase.from("post_likes").select("post_id, user_id"); if (error) throw error; return (data ?? []) as { post_id: string; user_id: string }[]; } });
  const { data: comments } = useQuery({ queryKey: ["post-comments", channelId ?? "all"], queryFn: async () => { const { data, error } = await supabase.from("community_post_comments").select("id, post_id, user_id, content, created_at").order("created_at", { ascending: true }); if (error) throw error; const rows = (data ?? []) as CommentRow[]; const profiles = await fetchProfilesByIds(rows.map((r) => r.user_id)); return rows.map((r) => ({ ...r, author: profiles.get(r.user_id) ?? null })); } });

  const publish = async (e: React.FormEvent) => {
    e.preventDefault(); if (!user) return void toast.error("Inicia sesión para publicar"); if (!content.trim()) return; setBusy(true);
    try {
      let imagePath: string | null = null; if (image) imagePath = await uploadFile("media", user.id, image, "post-");
      const { data: post, error } = await supabase.from("community_posts").insert({ user_id: user.id, content: content.trim(), image_path: imagePath }).select("id").single();
      if (error) throw error;
      try { await syncCommunityPostHashtags(post.id, content.trim()); } catch (error) { console.error("[Community] Hashtag sync failed", error); }
      setContent(""); setImage(null); void qc.invalidateQueries({ queryKey: key }); toast.success("Publicado en la comunidad");
    } catch (err) { toast.error(err instanceof Error ? err.message : "No se pudo publicar"); } finally { setBusy(false); }
  };
  const toggleLike = async (postId: string) => { if (!user) return void toast.error("Inicia sesión para reaccionar"); const liked = likes?.some((l) => l.post_id === postId && l.user_id === user.id); const result = liked ? await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id) : await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id }); if (result.error) return void toast.error(result.error.message); void qc.invalidateQueries({ queryKey: ["post-likes", channelId ?? "all"] }); };
  const addComment = async (postId: string) => { if (!user) return void toast.error("Inicia sesión para comentar"); const draft = commentDrafts[postId]?.trim(); if (!draft) return; const { error } = await supabase.from("community_post_comments").insert({ post_id: postId, user_id: user.id, content: draft }); if (error) return void toast.error(error.message); setCommentDrafts((current) => ({ ...current, [postId]: "" })); setOpenComments((current) => ({ ...current, [postId]: true })); void qc.invalidateQueries({ queryKey: ["post-comments", channelId ?? "all"] }); };
  const deleteComment = async (commentId: string) => { if (!user) return; const { error } = await supabase.from("community_post_comments").delete().eq("id", commentId); if (error) return void toast.error(error.message); void qc.invalidateQueries({ queryKey: ["post-comments", channelId ?? "all"] }); };
  const canPost = !!user && (!channelId || channelId === user.id);

  return <div className="mx-auto max-w-2xl space-y-6">
    {canPost && <form onSubmit={publish} className="rounded-2xl bg-surface p-4"><div className="flex gap-3"><ChannelAvatar path={profile?.avatar_path} name={profile?.display_name || "U"} size={40} /><Textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Comparte algo con tu comunidad… 😊 #CoreNetwork" rows={3} className="flex-1 border-0 bg-transparent focus-visible:ring-0" /></div><div className="mt-3 flex items-center justify-between"><label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ImagePlus className="h-4 w-4" />{image ? image.name.slice(0, 22) : "Añadir imagen"}<input type="file" accept="image/*" className="hidden" onChange={(e) => setImage(e.target.files?.[0] ?? null)} /></label><Button type="submit" disabled={busy} className="rounded-full">Publicar</Button></div></form>}
    {posts && posts.length > 0 ? posts.map((p) => { const count = likes?.filter((l) => l.post_id === p.id).length ?? 0; const liked = likes?.some((l) => l.post_id === p.id && l.user_id === user?.id); const postComments = comments?.filter((c) => c.post_id === p.id) ?? []; const expanded = openComments[p.id] ?? false; return <article key={p.id} className="rounded-2xl bg-surface p-4"><div className="flex items-center gap-3"><Link to="/c/$username" params={{ username: p.author?.username ?? "" }}><ChannelAvatar path={p.author?.avatar_path} name={p.author?.display_name ?? "U"} size={40} /></Link><div className="min-w-0 flex-1"><p className="flex items-center gap-1 text-sm font-medium">{p.author?.display_name || p.author?.username || "Usuario"}{p.author?.is_verified && <VerifiedBadge className="h-3.5 w-3.5" />}</p><p className="text-xs text-muted-foreground">{timeAgo(p.created_at)}</p></div>{(user?.id === p.user_id || isAdmin) && <Button variant="ghost" size="icon" onClick={async () => { const { error } = await supabase.from("community_posts").delete().eq("id", p.id); if (error) toast.error(error.message); else void qc.invalidateQueries({ queryKey: key }); }}><Trash2 className="h-4 w-4" /></Button>}</div><p className="mt-3 whitespace-pre-wrap text-sm"><FormattedText text={p.content} /></p>{p.image_path && <SignedImage path={p.image_path} alt="Imagen de la publicación" className="mt-3 max-h-[480px] w-full rounded-xl object-cover" />}<div className="mt-3 flex items-center gap-2"><button onClick={() => void toggleLike(p.id)} className="flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm hover:bg-surface-hover"><Heart className={`h-4 w-4 ${liked ? "fill-primary text-primary" : ""}`} />{count}</button><button onClick={() => setOpenComments((current) => ({ ...current, [p.id]: !expanded }))} className="flex items-center gap-2 rounded-full bg-background px-3 py-1.5 text-sm hover:bg-surface-hover"><MessageCircle className="h-4 w-4" />{postComments.length}</button></div>{expanded && <div className="mt-4 space-y-3 border-t border-border pt-4"><div className="space-y-3">{postComments.map((comment) => <div key={comment.id} className="flex gap-2"><ChannelAvatar path={comment.author?.avatar_path} name={comment.author?.display_name || "U"} size={32} /><div className="min-w-0 flex-1"><div className="text-xs"><span className="font-medium">{comment.author?.display_name || comment.author?.username || "Usuario"}</span> · <span className="text-muted-foreground">{timeAgo(comment.created_at)}</span></div><p className="text-sm"><FormattedText text={comment.content} /></p></div>{(user?.id === comment.user_id || isAdmin) && <Button variant="ghost" size="icon" onClick={() => void deleteComment(comment.id)}><Trash2 className="h-4 w-4" /></Button>}</div>)}</div><div className="flex gap-2"><ChannelAvatar path={profile?.avatar_path} name={profile?.display_name || "U"} size={32} /><Textarea value={commentDrafts[p.id] ?? ""} onChange={(e) => setCommentDrafts((current) => ({ ...current, [p.id]: e.target.value }))} placeholder="Escribe un comentario… 😊 #hashtag" rows={2} /><Button type="button" onClick={() => void addComment(p.id)}>Comentar</Button></div></div>}</article>; }) : <p className="py-12 text-center text-muted-foreground">Todavía no hay publicaciones de comunidad.</p>}
  </div>;
}
