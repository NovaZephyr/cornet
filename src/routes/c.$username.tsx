import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, SignedImage, VerifiedBadge } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { CommunityFeed } from "@/components/CommunityFeed";
import { ReportDialog } from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, type AppRole, type Profile } from "@/hooks/useAuth";
import { useSignedUrl } from "@/lib/storage";
import { fetchVideos } from "@/lib/queries";
import { useTheme } from "@/hooks/useTheme";

export const Route = createFileRoute("/c/$username")({ head: () => ({ meta: [{ title: "Canal — CoreNetwork" }] }), component: Channel });

type ChannelProfile = Profile & { channel_style?: "corenetwork" | "channel-1" | "channel-2" | "cosmic-panda"; subscriber_count?: number };

function RetroChannel({ profile, videos, roles, subs, isSubscribed, isPartnerChannel, partnerGif, onSubscribe, onReport }: { profile: ChannelProfile; videos: Awaited<ReturnType<typeof fetchVideos>>; roles?: AppRole[]; subs: { subscriber_id: string }[]; isSubscribed: boolean; isPartnerChannel: boolean; partnerGif: string | null; onSubscribe: () => void; onReport: () => void }) {
  const style = profile.channel_style ?? "corenetwork";
  const styleClass = `cn-2012-channel cn-2012-channel--${style}`;
  const hero = videos[0];
  return (
    <div className={styleClass}>
      <div className="cn-2012-cover"><SignedImage path={profile.banner_path} alt={`Banner de ${profile.display_name}`} className="h-full w-full object-cover" /></div>
      <div className="cn-2012-titlebar"><div className="flex items-center gap-3"><div className="relative"><ChannelAvatar path={profile.avatar_path} name={profile.display_name || profile.username} size={64} />{isPartnerChannel && partnerGif && <img src={partnerGif} alt="" className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border border-white object-cover" />}</div><div className="min-w-0"><h1 className="truncate text-xl font-bold">{profile.display_name || profile.username}{profile.is_verified && <VerifiedBadge className="ml-1 inline h-4 w-4" />}</h1><p className="text-xs text-muted-foreground">@{profile.username} · {profile.subscriber_count ?? subs.length} suscriptores · {videos.length} videos</p></div></div><div className="flex gap-2"><Button onClick={onSubscribe} variant={isSubscribed ? "secondary" : "default"}>{isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button onClick={onReport} variant="outline"><Flag className="mr-2 h-4 w-4" />Denunciar</Button></div></div>
      <div className="cn-2012-tabs"><span className="is-active">Videos</span><span>Información</span><span>Comunidad</span><span>Playlists</span></div>
      {style === "channel-2" && hero ? <div className="cn-2012-feature"><VideoCard video={hero} compact /></div> : null}
      <div className="cn-2012-body">
        {(style === "channel-1" || style === "cosmic-panda") && <aside className="cn-2012-about"><h2>Sobre este canal</h2><p>{profile.description || "Este canal todavía no tiene descripción."}</p><div className="mt-3 space-y-1 text-xs text-muted-foreground"><p>Suscriptores: {profile.subscriber_count ?? subs.length}</p><p>Videos: {videos.length}</p><p>Estilo: {style === "cosmic-panda" ? "Cosmic Panda" : "Channel 1.0"}</p></div></aside>}
        <section className="min-w-0 flex-1"><div className="cn-2012-section-title"><span>{style === "cosmic-panda" ? "Videos recientes" : style === "channel-2" ? "Videos destacados" : "Videos"}</span><span className="text-[11px] text-muted-foreground">Ver todos</span></div>{videos.length > 0 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{videos.slice(style === "channel-2" ? 1 : 0).map((video) => <VideoCard key={video.id} video={video} />)}</div> : <p className="py-12 text-center text-sm text-muted-foreground">Este canal todavía no tiene videos.</p>}</section>
      </div>
      {(roles?.length ?? 0) > 0 && <div className="cn-2012-badges">{roles?.includes("partner") && <Badge>Partner</Badge>}{roles?.includes("admin") && <Badge variant="secondary">Administrador</Badge>}{roles?.includes("moderator") && <Badge variant="secondary">Moderador</Badge>}</div>}
    </div>
  );
}

function Channel() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { theme } = useTheme();
  const [reportOpen, setReportOpen] = useState(false);
  const { data: profile, isLoading } = useQuery({ queryKey: ["channel", username], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle(); if (error) throw error; return (data as ChannelProfile) ?? null; } });
  const { data: roles } = useQuery({ queryKey: ["channel-roles", profile?.id], enabled: !!profile?.id, queryFn: async () => { const { data, error } = await supabase.rpc("get_public_badges", { _user_id: profile!.id }); if (error) throw error; return (data ?? []) as AppRole[]; } });
  const { data: videos } = useQuery({ queryKey: ["channel-videos", profile?.id], enabled: !!profile?.id, queryFn: () => fetchVideos({ userId: profile!.id }) });
  const { data: subs } = useQuery({ queryKey: ["channel-subs", profile?.id], enabled: !!profile?.id, queryFn: async () => { const { data } = await supabase.from("subscriptions").select("subscriber_id").eq("channel_id", profile!.id); return (data ?? []) as { subscriber_id: string }[]; } });
  const background = useSignedUrl(profile?.background_path);
  const partnerGif = useSignedUrl(profile?.gif_path);
  const isSubscribed = !!subs?.some((s) => s.subscriber_id === user?.id);
  const isPartnerChannel = !!roles?.includes("partner");

  const toggleSub = async () => {
    if (!user || !profile) return void toast.error("Inicia sesión para suscribirte");
    if (isSubscribed) await supabase.from("subscriptions").delete().eq("subscriber_id", user.id).eq("channel_id", profile.id);
    else await supabase.from("subscriptions").insert({ subscriber_id: user.id, channel_id: profile.id });
    void qc.invalidateQueries({ queryKey: ["channel-subs", profile.id] });
    void qc.invalidateQueries({ queryKey: ["videos"] });
  };

  const openReport = () => { if (!user) return toast.error("Inicia sesión para denunciar"); setReportOpen(true); };

  if (isLoading) return <AppShell><p className="py-24 text-center text-muted-foreground">Cargando canal…</p></AppShell>;
  if (!profile) return <AppShell><p className="py-24 text-center text-muted-foreground">Este canal no existe.</p></AppShell>;
  const channelVideos = videos ?? [];

  if (theme === "retro2012") return <AppShell><RetroChannel profile={profile} videos={channelVideos} roles={roles} subs={subs ?? []} isSubscribed={isSubscribed} isPartnerChannel={isPartnerChannel} partnerGif={partnerGif} onSubscribe={() => void toggleSub()} onReport={openReport} /><ReportDialog target={{ type: "channel", id: profile.id, name: profile.display_name || profile.username }} open={reportOpen} onOpenChange={setReportOpen} /></AppShell>;

  return <AppShell><div className="mx-auto max-w-6xl rounded-2xl" style={background ? { backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.95)), url(${background})`, backgroundSize: "cover", backgroundAttachment: "fixed" } : undefined}><div className="p-2 sm:p-4"><div className="aspect-[6/1] w-full overflow-hidden rounded-2xl bg-surface"><SignedImage path={profile.banner_path} alt={`Banner de ${profile.display_name}`} className="h-full w-full object-cover" /></div><div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center"><ChannelAvatar path={profile.avatar_path} name={profile.display_name || profile.username} size={112} /><div className="min-w-0 flex-1"><h1 className="flex items-center gap-2 text-2xl font-bold">{profile.display_name || profile.username}{profile.is_verified && <VerifiedBadge className="h-5 w-5" />}</h1><p className="text-sm text-muted-foreground">@{profile.username} · {profile.subscriber_count ?? subs?.length ?? 0} suscriptores · {channelVideos.length} videos</p>{profile.description && <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">{profile.description}</p>}<div className="mt-2 flex gap-2">{roles?.includes("partner") && <Badge className="bg-partner text-background">Partner</Badge>}{roles?.includes("admin") && <Badge variant="secondary">Administrador</Badge>}{roles?.includes("moderator") && <Badge variant="secondary">Moderador</Badge>}</div></div><div className="flex gap-2"><Button onClick={() => void toggleSub()} variant={isSubscribed ? "secondary" : "default"} className="rounded-full" style={!isSubscribed ? { backgroundColor: profile.accent_color } : undefined}>{isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button onClick={openReport} variant="outline" className="rounded-full"><Flag className="mr-2 h-4 w-4" />Denunciar</Button></div></div><Tabs defaultValue="videos" className="mt-6"><TabsList><TabsTrigger value="videos">Videos</TabsTrigger><TabsTrigger value="community">Comunidad</TabsTrigger><TabsTrigger value="about">Información</TabsTrigger></TabsList><TabsContent value="videos" className="pt-6">{channelVideos.length > 0 ? <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{channelVideos.map((v) => <VideoCard key={v.id} video={v} />)}</div> : <p className="py-12 text-center text-muted-foreground">Este canal todavía no tiene videos.</p>}</TabsContent><TabsContent value="community" className="pt-6"><CommunityFeed channelId={profile.id} /></TabsContent><TabsContent value="about" className="pt-6"><div className="max-w-2xl rounded-xl bg-surface p-5 text-sm"><p className="whitespace-pre-wrap">{profile.description || "Este canal aún no escribió una descripción."}</p><p className="mt-4 text-muted-foreground">En CoreNetwork desde {new Date(profile.created_at).toLocaleDateString("es")}</p></div></TabsContent></Tabs></div></div><ReportDialog target={{ type: "channel", id: profile.id, name: profile.display_name || profile.username }} open={reportOpen} onOpenChange={setReportOpen} /></AppShell>;
}
