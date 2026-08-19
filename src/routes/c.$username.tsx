import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, SignedImage, VerifiedBadge } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { CommunityFeed } from "@/components/CommunityFeed";
import { ReportDialog } from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, type AppRole, type Profile, type ChannelInfoLayout } from "@/hooks/useAuth";
import { useSignedUrl } from "@/lib/storage";
import { fetchVideos } from "@/lib/queries";
import { useTheme } from "@/hooks/useTheme";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ChannelDistinctions } from "@/components/ChannelDistinctions";
import "@/cosmic-panda.css";
import { ChannelLayoutStyles } from "@/design-library/ChannelLayoutStyles";

export const Route = createFileRoute("/c/$username")({ head: () => ({ meta: [{ title: "Canal — Cornet" }] }), component: Channel });

type ChannelProfile = Profile & { channel_style?: string; subscriber_count?: number; channel_primary_color?: string; channel_secondary_color?: string; channel_surface_color?: string; channel_text_color?: string; channel_info_layout?: ChannelInfoLayout };

const CHANNEL_STYLE_LABELS: Record<string, string> = { corenetwork: "Cornet", "channel-1": "Channel 1.0", "channel-2": "Channel 2.0", "cosmic-panda": "Cosmic Panda" };

function getChannelVars(profile: ChannelProfile): React.CSSProperties {
  return {
    "--cn-channel-primary": profile.channel_primary_color ?? "#1f4fa3",
    "--cn-channel-secondary": profile.channel_secondary_color ?? "#2aa84a",
    "--cn-channel-surface": profile.channel_surface_color ?? "#ffffff",
    "--cn-channel-text": profile.channel_text_color ?? "#222222",
  } as React.CSSProperties;
}

function RetroChannel({ profile, videos, roles, subs, isSubscribed, isPartnerChannel, partnerGif, background, onSubscribe, onReport }: { profile: ChannelProfile; videos: Awaited<ReturnType<typeof fetchVideos>>; roles?: AppRole[]; subs: { subscriber_id: string }[]; isSubscribed: boolean; isPartnerChannel: boolean; partnerGif: string | null; background: string | null; onSubscribe: () => void; onReport: () => void }) {
  const style = profile.channel_style ?? "corenetwork";
  const infoLayout = profile.channel_info_layout ?? "left";
  const styleClass = `cn-2012-channel cn-2012-channel--${style} cn-2012-info--${infoLayout}`;
  const hero = videos[0];
  const channelVars = getChannelVars(profile);
  const channelBackground = background ? { ...channelVars, backgroundImage: `url(${background})` } : channelVars;
  const heroVideoUrl = useSignedUrl(hero?.video_path);
  const heroPosterUrl = useSignedUrl(hero?.thumbnail_path);

  const InfoPanel = infoLayout === "hidden" ? null : (
    <aside className="cn-2012-about">
      <h2>Información del canal</h2>
      <p>{profile.description || "Este canal todavía no tiene descripción."}</p>
      <div className="mt-3 space-y-1 text-xs opacity-80">
        <p>Suscriptores: {profile.subscriber_count ?? subs.length}</p>
        <p>Videos: {videos.length}</p>
        <p>Estilo: {CHANNEL_STYLE_LABELS[style]}</p>
      </div>
    </aside>
  );

  if (style === "cosmic-panda") {
    return (
      <div className="cn-cosmic-channel" style={channelBackground}>
        <div className="cn-cosmic-channel-inner">
          <div className="cn-cosmic-topbar"><span>Cornet</span><span className="cn-cosmic-topbar-right">/{profile.username}</span></div>
          <div className="cn-cosmic-banner-wrap">
            <div className="cn-cosmic-cover"><SignedImage path={profile.banner_path} alt={`Banner de ${profile.display_name}`} className="h-full w-full object-cover" /></div>
            <div className="cn-cosmic-title-strip">
              <div className="flex min-w-0 items-center gap-3">
                <div className="relative"><ChannelAvatar path={profile.avatar_path} name={profile.display_name || profile.username} size={56} />{isPartnerChannel && partnerGif && <img src={partnerGif} alt="Distintivo animado Partner" className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border object-cover" />}</div>
                <div className="min-w-0"><h1 className="truncate text-[20px] font-bold">{profile.display_name || profile.username}<ChannelDistinctions className="ml-2" isVerified={profile.is_verified} isMusic={profile.is_music_channel} roles={roles} /></h1><p className="text-[11px] opacity-70">@{profile.username} · {profile.subscriber_count ?? subs.length} suscriptores · {videos.length} videos</p></div>
              </div>
              <div className="flex gap-2"><Button onClick={onSubscribe} className="cn-2012-retro-button" variant={isSubscribed ? "secondary" : "default"}>{isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button onClick={onReport} variant="outline" className="cn-2012-retro-button"><Flag className="mr-2 h-4 w-4" />Denunciar</Button></div>
            </div>
            <div className="cn-cosmic-tabs"><span className="is-active">CANAL</span><span>VIDEOS</span><span>COMUNIDAD</span><span>PLAYLISTS</span><span>INFORMACIÓN</span></div>
          </div>
          <div className="cn-cosmic-columns">
            <aside className="cn-cosmic-left">
              <section className="cn-cosmic-panel"><h2>Información</h2>{infoLayout !== "hidden" ? <p>{profile.description || "Este canal todavía no tiene descripción."}</p> : <p className="opacity-60">Información oculta por el creador.</p>}<dl className="cn-cosmic-stats"><div><dt>Suscriptores</dt><dd>{profile.subscriber_count ?? subs.length}</dd></div><div><dt>Videos</dt><dd>{videos.length}</dd></div><div><dt>En Cornet</dt><dd>{new Date(profile.created_at).toLocaleDateString("es")}</dd></div></dl></section>
              {(roles?.length ?? 0) > 0 || profile.is_music_channel || profile.is_verified ? <section className="cn-cosmic-panel"><h2>Distinciones</h2><ChannelDistinctions isVerified={profile.is_verified} isMusic={profile.is_music_channel} roles={roles} /></section> : null}
              <section className="cn-cosmic-panel"><h2>Navegación</h2><div className="cn-cosmic-navlinks"><a href="#featured">Featured</a><a href="#uploads">Uploads</a><a href="#community">Comunidad</a><a href="#about">Información</a></div></section>
            </aside>
            <main className="cn-cosmic-center">
              <section id="featured" className="cn-cosmic-panel cn-cosmic-featured"><div className="cn-cosmic-panel-title"><span>Featured</span>{hero && <a href={`/watch?v=${hero.code}`}>Ver video <ExternalLink className="inline h-3 w-3" /></a>}</div>{hero ? <><div className="cn-cosmic-player">{heroVideoUrl ? <VideoPlayer src={heroVideoUrl} poster={heroPosterUrl ?? undefined} /> : <div className="aspect-video bg-black" />}</div><h2 className="mt-3 text-[18px] font-bold">{hero.title}</h2><p className="mt-1 text-xs text-muted-foreground">{hero.views.toLocaleString("es-ES")} vistas</p><p className="mt-2 text-sm">{hero.description || "Sin descripción."}</p></> : <p className="cn-2012-empty">Este canal todavía no tiene un video destacado.</p>}</section>
              <section id="uploads" className="cn-cosmic-panel"><div className="cn-cosmic-panel-title"><span>Uploads</span><span className="text-[11px] opacity-70">{videos.length} videos</span></div>{videos.length > 1 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{videos.slice(1, 9).map((video) => <VideoCard key={video.id} video={video} />)}</div> : <p className="cn-2012-empty">Este canal todavía no tiene videos.</p>}</section>
            </main>
            <aside className="cn-cosmic-right">
              <section className="cn-cosmic-panel"><h2>Channel</h2><div className="cn-cosmic-profile-mini"><div className="relative shrink-0"><ChannelAvatar path={profile.avatar_path} name={profile.display_name || profile.username} size={52} />{isPartnerChannel && partnerGif && <img src={partnerGif} alt="" className="absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border object-cover" />}</div><div><strong>{profile.display_name || profile.username}</strong><span>@{profile.username}</span></div></div><Button className="mt-3 w-full cn-2012-retro-button" onClick={onSubscribe} variant={isSubscribed ? "secondary" : "default"}>{isSubscribed ? "Suscrito" : "Suscribirse"}</Button></section>
              <section className="cn-cosmic-panel"><h2>Últimos videos</h2><div className="space-y-3">{videos.slice(0, 5).map((video) => <VideoCard key={video.id} video={video} compact />)}</div></section>
              <section id="community" className="cn-cosmic-panel"><h2>Comunidad</h2><CommunityFeed channelId={profile.id} /></section>
            </aside>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styleClass} style={channelBackground}>
      <div className="cn-2012-channel-inner">
        <div className="cn-2012-cover"><SignedImage path={profile.banner_path} alt={`Banner de ${profile.display_name}`} className="h-full w-full object-cover" /></div>
        <div className="cn-2012-titlebar"><div className="flex items-center gap-3"><div className="relative"><ChannelAvatar path={profile.avatar_path} name={profile.display_name || profile.username} size={64} />{isPartnerChannel && partnerGif && <img src={partnerGif} alt="Distintivo animado Partner" className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border object-cover" />}</div><div className="min-w-0"><h1 className="flex items-center text-xl font-bold">{profile.display_name || profile.username}<ChannelDistinctions className="ml-2" isVerified={profile.is_verified} isMusic={profile.is_music_channel} roles={roles} /></h1><p className="text-xs opacity-75">@{profile.username} · {profile.subscriber_count ?? subs.length} suscriptores · {videos.length} videos</p></div></div><div className="flex gap-2"><Button onClick={onSubscribe} variant={isSubscribed ? "secondary" : "default"} className="cn-2012-retro-button">{isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button onClick={onReport} variant="outline" className="cn-2012-retro-button"><Flag className="mr-2 h-4 w-4" />Denunciar</Button></div></div>
        <div className="cn-2012-tabs"><span className="is-active">Videos</span><span>Información</span><span>Comunidad</span><span>Playlists</span></div>
        {style === "channel-1" && hero ? <div className="cn-2012-feature cn-2012-feature--channel-1"><div className="cn-2012-feature-main"><VideoCard video={hero} compact /></div><div className="cn-2012-feature-side">{videos.slice(1, 5).map((video) => <VideoCard key={video.id} video={video} compact />)}</div></div> : null}
        {style === "channel-2" && hero ? <div className="cn-2012-feature cn-2012-feature--channel-2"><VideoCard video={hero} compact /></div> : null}
        {infoLayout === "top" && InfoPanel}
        <div className="cn-2012-body">{infoLayout === "left" && InfoPanel}<section className="cn-2012-video-column"><div className="cn-2012-section-title"><span>{style === "channel-2" ? "Videos" : "Uploads"}</span><span>Ver todos</span></div>{videos.length > 0 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{videos.slice(style === "channel-2" || style === "channel-1" ? 1 : 0).map((video) => <VideoCard key={video.id} video={video} />)}</div> : <p className="cn-2012-empty">Este canal todavía no tiene videos.</p>}</section>{infoLayout === "right" && InfoPanel}</div>
        <div className="cn-2012-badges"><ChannelDistinctions isVerified={profile.is_verified} isMusic={profile.is_music_channel} roles={roles} /></div>
      </div>
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
  const toggleSub = async () => { if (!user || !profile) return void toast.error("Inicia sesión para suscribirte"); if (isSubscribed) await supabase.from("subscriptions").delete().eq("subscriber_id", user.id).eq("channel_id", profile.id); else await supabase.from("subscriptions").insert({ subscriber_id: user.id, channel_id: profile.id }); void qc.invalidateQueries({ queryKey: ["channel-subs", profile.id] }); void qc.invalidateQueries({ queryKey: ["videos"] }); };
  const openReport = () => { if (!user) return toast.error("Inicia sesión para denunciar"); setReportOpen(true); };
  if (isLoading) return <AppShell><p className="py-24 text-center text-muted-foreground">Cargando canal…</p></AppShell>;
  if (!profile) return <AppShell><p className="py-24 text-center text-muted-foreground">Este canal no existe.</p></AppShell>;
  const channelVideos = videos ?? [];
  const style = profile.channel_style ?? "corenetwork";
  const channelVars = getChannelVars(profile);
  const retroLayout = style !== "corenetwork";
  if (retroLayout) return <AppShell hideSidebar={style !== "corenetwork"}><ChannelLayoutStyles layoutId={style} /><div className="cn-retro-scope"><RetroChannel profile={profile} videos={channelVideos} roles={roles} subs={subs ?? []} isSubscribed={isSubscribed} isPartnerChannel={isPartnerChannel} partnerGif={partnerGif} background={background} onSubscribe={() => void toggleSub()} onReport={openReport} /></div><ReportDialog target={{ type: "channel", id: profile.id, name: profile.display_name || profile.username }} open={reportOpen} onOpenChange={setReportOpen} /></AppShell>;
  return (<AppShell><div className={`cn-modern-channel cn-modern-channel--${style}`} style={background ? { ...channelVars, backgroundImage: `url(${background})` } : channelVars}><div className="cn-modern-channel-overlay" aria-hidden="true" /><div className="cn-modern-channel-content"><div className="mx-auto max-w-6xl rounded-2xl bg-background/90 p-2 shadow-2xl backdrop-blur-[2px] sm:p-4"><div className="aspect-[6/1] w-full overflow-hidden rounded-2xl bg-surface"><SignedImage path={profile.banner_path} alt={`Banner de ${profile.display_name}`} className="h-full w-full object-cover" /></div><div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center"><div className="relative shrink-0"><ChannelAvatar path={profile.avatar_path} name={profile.display_name || profile.username} size={112} />{isPartnerChannel && partnerGif && <img src={partnerGif} alt="Distintivo animado Partner" className="absolute bottom-1 right-1 h-6 w-6 rounded-full border-2 border-background object-cover shadow-sm" />}</div><div className="min-w-0 flex-1"><h1 className="flex items-center gap-2 text-2xl font-bold">{profile.display_name || profile.username}<ChannelDistinctions isVerified={profile.is_verified} isMusic={profile.is_music_channel} roles={roles} /></h1><p className="text-sm text-muted-foreground">@{profile.username} · {profile.subscriber_count ?? subs?.length ?? 0} suscriptores · {channelVideos.length} videos</p>{profile.description && <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">{profile.description}</p>}</div><div className="flex gap-2"><Button onClick={() => void toggleSub()} variant={isSubscribed ? "secondary" : "default"} className="rounded-full cn-modern-channel-button">{isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button onClick={openReport} variant="outline" className="rounded-full"><Flag className="mr-2 h-4 w-4" />Denunciar</Button></div></div><Tabs defaultValue="videos" className="mt-6"><TabsList className="cn-modern-channel-tabs"><TabsTrigger value="videos">Videos</TabsTrigger><TabsTrigger value="community">Comunidad</TabsTrigger><TabsTrigger value="about">Información</TabsTrigger></TabsList><TabsContent value="videos" className="pt-6">{channelVideos.length > 0 ? <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{channelVideos.map((v) => <VideoCard key={v.id} video={v} />)}</div> : <p className="py-12 text-center text-muted-foreground">Este canal todavía no tiene videos.</p>}</TabsContent><TabsContent value="community" className="pt-6"><CommunityFeed channelId={profile.id} /></TabsContent><TabsContent value="about" className="pt-6"><div className="max-w-2xl rounded-xl border p-5 text-sm" style={{ background: profile.channel_surface_color ?? "var(--surface)", color: profile.channel_text_color ?? "inherit", borderColor: profile.channel_secondary_color ?? "currentColor" }}><p className="whitespace-pre-wrap">{profile.description || "Este canal aún no escribió una descripción."}</p><p className="mt-4 opacity-70">En Cornet desde {new Date(profile.created_at).toLocaleDateString("es")}</p></div></TabsContent></Tabs></div></div></div><ReportDialog target={{ type: "channel", id: profile.id, name: profile.display_name || profile.username }} open={reportOpen} onOpenChange={setReportOpen} /></AppShell>);
}
