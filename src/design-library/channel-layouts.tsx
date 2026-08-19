import type { CSSProperties } from "react";
import { Flag, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChannelAvatar, SignedImage } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { CommunityFeed } from "@/components/CommunityFeed";
import { VideoPlayer } from "@/components/VideoPlayer";
import { ChannelDistinctions } from "@/components/ChannelDistinctions";
import { useSignedUrl } from "@/lib/storage";
import type { ChannelData, ChannelLayoutProps } from "./channel-data";

function channelVars(data: ChannelData): CSSProperties {
  return {
    "--cn-channel-primary": data.profile.channel_primary_color ?? "#1f4fa3",
    "--cn-channel-secondary": data.profile.channel_secondary_color ?? "#2aa84a",
    "--cn-channel-surface": data.profile.channel_surface_color ?? "#ffffff",
    "--cn-channel-text": data.profile.channel_text_color ?? "#222222",
  } as CSSProperties;
}

function ChannelIdentity({ data, size = 64 }: { data: ChannelData; size?: number }) {
  return (
    <div className="relative shrink-0">
      <ChannelAvatar path={data.profile.avatar_path} name={data.profile.display_name || data.profile.username} size={size} />
      {data.isPartnerChannel && data.partnerGif ? <img src={data.partnerGif} alt="Distintivo animado Partner" className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border object-cover" /> : null}
    </div>
  );
}

export function CosmicPandaChannel({ data, onSubscribe, onReport }: ChannelLayoutProps) {
  const hero = data.videos[0];
  const heroVideoUrl = useSignedUrl(hero?.video_path);
  const heroPosterUrl = useSignedUrl(hero?.thumbnail_path);
  const infoLayout = data.profile.channel_info_layout ?? "left";
  const styleVars = channelVars(data);
  const background = data.background ? { ...styleVars, backgroundImage: `url(${data.background})` } : styleVars;

  return (
    <div className="cn-cosmic-channel" style={background}>
      <div className="cn-cosmic-channel-inner">
        <div className="cn-cosmic-topbar"><span>Cornet</span><span className="cn-cosmic-topbar-right">/{data.profile.username}</span></div>
        <div className="cn-cosmic-banner-wrap">
          <div className="cn-cosmic-cover"><SignedImage path={data.profile.banner_path} alt={`Banner de ${data.profile.display_name}`} className="h-full w-full object-cover" /></div>
          <div className="cn-cosmic-title-strip">
            <div className="flex min-w-0 items-center gap-3"><ChannelIdentity data={data} size={56} /><div className="min-w-0"><h1 className="truncate text-[20px] font-bold">{data.profile.display_name || data.profile.username}<ChannelDistinctions className="ml-2" isVerified={data.profile.is_verified} isMusic={data.profile.is_music_channel} roles={data.roles} /></h1><p className="text-[11px] opacity-70">@{data.profile.username} · {data.profile.subscriber_count ?? data.subscriptions.length} suscriptores · {data.videos.length} videos</p></div></div>
            <div className="flex gap-2"><Button onClick={onSubscribe} className="cn-2012-retro-button" variant={data.isSubscribed ? "secondary" : "default"}>{data.isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button onClick={onReport} variant="outline" className="cn-2012-retro-button"><Flag className="mr-2 h-4 w-4" />Denunciar</Button></div>
          </div>
          <div className="cn-cosmic-tabs"><span className="is-active">CANAL</span><span>VIDEOS</span><span>COMUNIDAD</span><span>PLAYLISTS</span><span>INFORMACIÓN</span></div>
        </div>
        <div className="cn-cosmic-columns">
          <aside className="cn-cosmic-left">
            <section className="cn-cosmic-panel"><h2>Información</h2>{infoLayout !== "hidden" ? <p>{data.profile.description || "Este canal todavía no tiene descripción."}</p> : <p className="opacity-60">Información oculta por el creador.</p>}<dl className="cn-cosmic-stats"><div><dt>Suscriptores</dt><dd>{data.profile.subscriber_count ?? data.subscriptions.length}</dd></div><div><dt>Videos</dt><dd>{data.videos.length}</dd></div><div><dt>En Cornet</dt><dd>{new Date(data.profile.created_at).toLocaleDateString("es")}</dd></div></dl></section>
            {data.roles.length > 0 || data.profile.is_music_channel || data.profile.is_verified ? <section className="cn-cosmic-panel"><h2>Distinciones</h2><ChannelDistinctions isVerified={data.profile.is_verified} isMusic={data.profile.is_music_channel} roles={data.roles} /></section> : null}
            <section className="cn-cosmic-panel"><h2>Navegación</h2><div className="cn-cosmic-navlinks"><a href="#featured">Featured</a><a href="#uploads">Uploads</a><a href="#community">Comunidad</a><a href="#about">Información</a></div></section>
          </aside>
          <main className="cn-cosmic-center">
            <section id="featured" className="cn-cosmic-panel cn-cosmic-featured"><div className="cn-cosmic-panel-title"><span>Featured</span>{hero && <a href={`/watch?v=${hero.code}`}>Ver video <ExternalLink className="inline h-3 w-3" /></a>}</div>{hero ? <><div className="cn-cosmic-player">{heroVideoUrl ? <VideoPlayer src={heroVideoUrl} poster={heroPosterUrl ?? undefined} /> : <div className="aspect-video bg-black" />}</div><h2 className="mt-3 text-[18px] font-bold">{hero.title}</h2><p className="mt-1 text-xs text-muted-foreground">{hero.views.toLocaleString("es-ES")} vistas</p><p className="mt-2 text-sm">{hero.description || "Sin descripción."}</p></> : <p className="cn-2012-empty">Este canal todavía no tiene un video destacado.</p>}</section>
            <section id="uploads" className="cn-cosmic-panel"><div className="cn-cosmic-panel-title"><span>Uploads</span><span className="text-[11px] opacity-70">{data.videos.length} videos</span></div>{data.videos.length > 1 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{data.videos.slice(1, 9).map((video) => <VideoCard key={video.id} video={video} />)}</div> : <p className="cn-2012-empty">Este canal todavía no tiene videos.</p>}</section>
          </main>
          <aside className="cn-cosmic-right">
            <section className="cn-cosmic-panel"><h2>Channel</h2><div className="cn-cosmic-profile-mini"><ChannelIdentity data={data} size={52} /><div><strong>{data.profile.display_name || data.profile.username}</strong><span>@{data.profile.username}</span></div></div><Button className="mt-3 w-full cn-2012-retro-button" onClick={onSubscribe} variant={data.isSubscribed ? "secondary" : "default"}>{data.isSubscribed ? "Suscrito" : "Suscribirse"}</Button></section>
            <section className="cn-cosmic-panel"><h2>Últimos videos</h2><div className="space-y-3">{data.videos.slice(0, 5).map((video) => <VideoCard key={video.id} video={video} compact />)}</div></section>
            <section id="community" className="cn-cosmic-panel"><h2>Comunidad</h2><CommunityFeed channelId={data.profile.id} /></section>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function HistoricalChannel({ data, onSubscribe, onReport }: ChannelLayoutProps) {
  const style = data.profile.channel_style ?? "standard2012";
  const infoLayout = data.profile.channel_info_layout ?? "left";
  const hero = data.videos[0];
  const styleClass = `cn-2012-channel cn-2012-channel--${style} cn-2012-info--${infoLayout}`;
  const vars = channelVars(data);
  const background = data.background ? { ...vars, backgroundImage: `url(${data.background})` } : vars;
  const InfoPanel = infoLayout === "hidden" ? null : <aside className="cn-2012-about"><h2>Información del canal</h2><p>{data.profile.description || "Este canal todavía no tiene descripción."}</p><div className="mt-3 space-y-1 text-xs opacity-80"><p>Suscriptores: {data.profile.subscriber_count ?? data.subscriptions.length}</p><p>Videos: {data.videos.length}</p><p>Estilo: {style}</p></div></aside>;
  return <div className={styleClass} style={background}><div className="cn-2012-channel-inner"><div className="cn-2012-cover"><SignedImage path={data.profile.banner_path} alt={`Banner de ${data.profile.display_name}`} className="h-full w-full object-cover" /></div><div className="cn-2012-titlebar"><div className="flex items-center gap-3"><ChannelIdentity data={data} /><div className="min-w-0"><h1 className="flex items-center text-xl font-bold">{data.profile.display_name || data.profile.username}<ChannelDistinctions className="ml-2" isVerified={data.profile.is_verified} isMusic={data.profile.is_music_channel} roles={data.roles} /></h1><p className="text-xs opacity-75">@{data.profile.username} · {data.profile.subscriber_count ?? data.subscriptions.length} suscriptores · {data.videos.length} videos</p></div></div><div className="flex gap-2"><Button onClick={onSubscribe} variant={data.isSubscribed ? "secondary" : "default"} className="cn-2012-retro-button">{data.isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button onClick={onReport} variant="outline" className="cn-2012-retro-button"><Flag className="mr-2 h-4 w-4" />Denunciar</Button></div></div><div className="cn-2012-tabs"><span className="is-active">Videos</span><span>Información</span><span>Comunidad</span><span>Playlists</span></div>{style === "channel-1" && hero ? <div className="cn-2012-feature cn-2012-feature--channel-1"><div className="cn-2012-feature-main"><VideoCard video={hero} compact /></div><div className="cn-2012-feature-side">{data.videos.slice(1, 5).map((video) => <VideoCard key={video.id} video={video} compact />)}</div></div> : null}{style === "channel-2" && hero ? <div className="cn-2012-feature cn-2012-feature--channel-2"><VideoCard video={hero} compact /></div> : null}{infoLayout === "top" && InfoPanel}<div className="cn-2012-body">{infoLayout === "left" && InfoPanel}<section className="cn-2012-video-column"><div className="cn-2012-section-title"><span>{style === "channel-2" ? "Videos" : "Uploads"}</span><span>Ver todos</span></div>{data.videos.length > 0 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.videos.slice(style === "channel-2" || style === "channel-1" ? 1 : 0).map((video) => <VideoCard key={video.id} video={video} />)}</div> : <p className="cn-2012-empty">Este canal todavía no tiene videos.</p>}</section>{infoLayout === "right" && InfoPanel}</div><div className="cn-2012-badges"><ChannelDistinctions isVerified={data.profile.is_verified} isMusic={data.profile.is_music_channel} roles={data.roles} /></div></div></div>;
}

export function ClassicChannel({ data, onSubscribe, onReport }: ChannelLayoutProps) {
  const background = data.background ? { ...channelVars(data), backgroundImage: `url(${data.background})` } : channelVars(data);
  return <div className={`cn-modern-channel cn-modern-channel--${data.profile.channel_style ?? "corenetwork"}`} style={background}><div className="cn-modern-channel-overlay" aria-hidden="true" /><div className="cn-modern-channel-content"><div className="mx-auto max-w-6xl rounded-2xl bg-background/90 p-2 shadow-2xl backdrop-blur-[2px] sm:p-4"><div className="aspect-[6/1] w-full overflow-hidden rounded-2xl bg-surface"><SignedImage path={data.profile.banner_path} alt={`Banner de ${data.profile.display_name}`} className="h-full w-full object-cover" /></div><div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center"><ChannelIdentity data={data} size={112} /><div className="min-w-0 flex-1"><h1 className="flex items-center gap-2 text-2xl font-bold">{data.profile.display_name || data.profile.username}<ChannelDistinctions isVerified={data.profile.is_verified} isMusic={data.profile.is_music_channel} roles={data.roles} /></h1><p className="text-sm text-muted-foreground">@{data.profile.username} · {data.profile.subscriber_count ?? data.subscriptions.length} suscriptores · {data.videos.length} videos</p>{data.profile.description && <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">{data.profile.description}</p>}</div><div className="flex gap-2"><Button onClick={onSubscribe} variant={data.isSubscribed ? "secondary" : "default"} className="rounded-full cn-modern-channel-button">{data.isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button onClick={onReport} variant="outline" className="rounded-full"><Flag className="mr-2 h-4 w-4" />Denunciar</Button></div></div><Tabs defaultValue="videos" className="mt-6"><TabsList className="cn-modern-channel-tabs"><TabsTrigger value="videos">Videos</TabsTrigger><TabsTrigger value="community">Comunidad</TabsTrigger><TabsTrigger value="about">Información</TabsTrigger></TabsList><TabsContent value="videos" className="pt-6">{data.videos.length > 0 ? <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{data.videos.map((v) => <VideoCard key={v.id} video={v} />)}</div> : <p className="py-12 text-center text-muted-foreground">Este canal todavía no tiene videos.</p>}</TabsContent><TabsContent value="community" className="pt-6"><CommunityFeed channelId={data.profile.id} /></TabsContent><TabsContent value="about" className="pt-6"><div className="max-w-2xl rounded-xl border p-5 text-sm" style={{ background: data.profile.channel_surface_color ?? "var(--surface)", color: data.profile.channel_text_color ?? "inherit", borderColor: data.profile.channel_secondary_color ?? "currentColor" }}><p className="whitespace-pre-wrap">{data.profile.description || "Este canal aún no escribió una descripción."}</p><p className="mt-4 opacity-70">En Cornet desde {new Date(data.profile.created_at).toLocaleDateString("es")}</p></div></TabsContent></Tabs></div></div></div>;
}

export function ChannelLayout({ data, onSubscribe, onReport }: ChannelLayoutProps) {
  if (data.profile.channel_style === "cosmic-panda") return <CosmicPandaChannel data={data} onSubscribe={onSubscribe} onReport={onReport} />;
  if ((data.profile.channel_style ?? "corenetwork") === "corenetwork") return <ClassicChannel data={data} onSubscribe={onSubscribe} onReport={onReport} />;
  return <HistoricalChannel data={data} onSubscribe={onSubscribe} onReport={onReport} />;
}
