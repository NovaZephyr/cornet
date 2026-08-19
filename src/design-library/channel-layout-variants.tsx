import { Flag, Heart, ListMusic, MessageCircle, Play, Star, Users, BarChart3, Gamepad2, Newspaper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelAvatar, SignedImage } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { CommunityFeed } from "@/components/CommunityFeed";
import { ChannelDistinctions } from "@/components/ChannelDistinctions";
import type { ChannelLayoutProps } from "./channel-data";

type Variant =
  | "early" | "star" | "transition" | "onechannel" | "material" | "modern" | "feather"
  | "studio" | "profile" | "community" | "video" | "music" | "gaming" | "minimal" | "2015" | "2019";

function Identity({ data, centered = false, size = 64 }: { data: ChannelLayoutProps["data"]; centered?: boolean; size?: number }) {
  return <div className={`cn-layout-identity ${centered ? "is-centered" : ""}`}>
    <ChannelAvatar path={data.profile.avatar_path} name={data.profile.display_name || data.profile.username} size={size} />
    <div className="min-w-0">
      <h1 className="cn-layout-identity-title">{data.profile.display_name || data.profile.username}<ChannelDistinctions className="ml-1.5 inline-flex" isVerified={data.profile.is_verified} isMusic={data.profile.is_music_channel} roles={data.roles} /></h1>
      <p className="cn-layout-identity-sub">@{data.profile.username} · {data.profile.subscriber_count ?? data.subscriptions.length} suscriptores · {data.videos.length} videos</p>
    </div>
  </div>;
}

function Actions({ data, onSubscribe, onReport }: ChannelLayoutProps) {
  return <div className="cn-layout-actions"><Button size="sm" onClick={onSubscribe}>{data.isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button size="sm" variant="outline" onClick={onReport}><Flag className="mr-1.5 h-3.5 w-3.5" />Denunciar</Button></div>;
}

function VideoList({ data, limit = 8, compact = false }: { data: ChannelLayoutProps["data"]; limit?: number; compact?: boolean }) {
  return <div className={compact ? "cn-layout-video-list compact" : "cn-layout-video-list"}>{data.videos.slice(0, limit).map((video) => <VideoCard key={video.id} video={video} compact={compact} />)}</div>;
}

export function ChannelVariantLayout({ data, onSubscribe, onReport, variant }: ChannelLayoutProps & { variant: Variant }) {
  const hero = data.videos[0];
  const description = data.profile.description || "Este canal todavía no tiene descripción.";

  if (variant === "early") return <div className="cn-layout-variant cn-layout-early"><div className="cn-layout-early-inner"><div className="cn-layout-early-logo">YouTube</div><Identity data={data} size={44} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /><div className="cn-layout-early-links"><span>videos</span><span>favorites</span><span>channels</span><span>about</span></div><table><thead><tr><th>video</th><th>views</th><th>date</th></tr></thead><tbody>{data.videos.slice(0, 12).map((v) => <tr key={v.id}><td><a href={`/watch?v=${v.code}`}>{v.title}</a></td><td>{v.views}</td><td>{new Date(v.created_at).toLocaleDateString("es")}</td></tr>)}</tbody></table></div></div>;

  if (variant === "star") return <div className="cn-layout-variant cn-layout-star"><div className="cn-layout-star-header"><Identity data={data} size={72} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></div><div className="cn-layout-star-body"><main><div className="cn-layout-star-title"><Star className="h-4 w-4" /> Videos del canal</div><VideoList data={data} /></main><aside><section><h2>Rating</h2><div className="cn-layout-stars">★★★★★</div><p>Valoración comunitaria</p></section><section><h2>Información</h2><p>{description}</p></section><section><h2>Actividad</h2><p>{data.videos.length} vídeos · {data.subscriptions.length} suscripciones</p></section></aside></div></div>;

  if (variant === "transition") return <div className="cn-layout-variant cn-layout-transition"><div className="cn-layout-transition-top"><Identity data={data} size={76} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></div><div className="cn-layout-transition-body"><aside><h2>Canal</h2><p>{description}</p><a href="#uploads">Uploads</a><a href="#community">Comunidad</a><a href="#about">Información</a></aside><main id="uploads"><div className="cn-layout-section-heading">Uploads <span>{data.videos.length}</span></div><div className="cn-layout-transition-grid">{data.videos.map((v) => <VideoCard key={v.id} video={v} />)}</div></main></div></div>;

  if (variant === "onechannel") return <div className="cn-layout-variant cn-layout-onechannel"><div className="cn-layout-onechannel-banner"><SignedImage path={data.profile.banner_path} alt="" className="h-full w-full object-cover" /></div><div className="cn-layout-onechannel-head"><Identity data={data} size={84} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></div><nav><span className="active">HOME</span><span>VIDEOS</span><span>CHANNELS</span><span>ABOUT</span></nav><div className="cn-layout-onechannel-feature">{hero ? <><div><VideoCard video={hero} /></div><div><h2>{hero.title}</h2><p>{hero.description || ""}</p><a href={`/watch?v=${hero.code}`}>Ver vídeo →</a></div></> : <p>No hay vídeo destacado.</p>}</div><VideoList data={data} limit={8} /></div>;

  if (variant === "material") return <div className="cn-layout-variant cn-layout-material"><Identity data={data} size={70} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /><section className="cn-layout-material-hero"><div><p className="eyebrow">DESTACADO</p><h2>{hero?.title || "Tu canal"}</h2><p>{hero?.description || description}</p></div>{hero && <VideoCard video={hero} compact />}</section><div className="cn-layout-material-grid">{data.videos.slice(1).map((v) => <article key={v.id}><VideoCard video={v} /><div className="cn-layout-material-meta">{v.views} vistas · {new Date(v.created_at).toLocaleDateString("es")}</div></article>)}</div></div>;

  if (variant === "modern") return <div className="cn-layout-variant cn-layout-modern"><div className="cn-layout-modern-hero" style={data.background ? { backgroundImage: `url(${data.background})` } : undefined}><div className="cn-layout-modern-scrim" /><div className="relative"><Identity data={data} size={96} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></div></div><div className="cn-layout-modern-main"><div className="cn-layout-modern-feature">{hero && <VideoCard video={hero} />}</div><aside><h2>Sobre el canal</h2><p>{description}</p><div className="cn-layout-modern-stats"><strong>{data.videos.length}</strong><span>vídeos</span><strong>{data.profile.subscriber_count ?? data.subscriptions.length}</strong><span>suscriptores</span></div></aside></div><VideoList data={data} limit={12} /></div>;

  if (variant === "feather") return <div className="cn-layout-variant cn-layout-feather"><header><Identity data={data} size={58} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></header><p className="cn-layout-feather-description">{description}</p><div className="cn-layout-feather-line" /><VideoList data={data} limit={10} compact /></div>;

  if (variant === "studio") return <div className="cn-layout-variant cn-layout-studio"><header><Identity data={data} size={64} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></header><div className="cn-layout-studio-metrics"><div><BarChart3 /><strong>{data.videos.reduce((n, v) => n + Number(v.views || 0), 0).toLocaleString("es")}</strong><span>vistas</span></div><div><Play /><strong>{data.videos.length}</strong><span>videos</span></div><div><Users /><strong>{data.profile.subscriber_count ?? data.subscriptions.length}</strong><span>suscriptores</span></div></div><section className="cn-layout-studio-feature">{hero && <VideoCard video={hero} />}<div><h2>Descripción</h2><p>{description}</p><p className="muted">Canal creado el {new Date(data.profile.created_at).toLocaleDateString("es")}</p></div></section><VideoList data={data} limit={9} /></div>;

  if (variant === "profile") return <div className="cn-layout-variant cn-layout-profile"><div className="cn-layout-profile-card"><Identity data={data} centered size={92} /><p>{description}</p><div className="cn-layout-profile-counts"><span><strong>{data.videos.length}</strong> vídeos</span><span><strong>{data.profile.subscriber_count ?? data.subscriptions.length}</strong> seguidores</span></div><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></div><VideoList data={data} limit={6} compact /></div>;

  if (variant === "community") return <div className="cn-layout-variant cn-layout-community"><header><Identity data={data} size={64} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></header><div className="cn-layout-community-body"><main><div className="cn-layout-section-heading"><MessageCircle /> Comunidad</div><CommunityFeed channelId={data.profile.id} /></main><aside><h2>Canal</h2><p>{description}</p><VideoList data={data} limit={4} compact /></aside></div></div>;

  if (variant === "video") return <div className="cn-layout-variant cn-layout-video"><header><Identity data={data} size={68} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></header>{hero && <section className="cn-layout-video-hero"><VideoCard video={hero} /><div><p className="eyebrow">FEATURED VIDEO</p><h2>{hero.title}</h2><p>{hero.description || ""}</p><a href={`/watch?v=${hero.code}`}>Reproducir</a></div></section>}<VideoList data={data} limit={12} /></div>;

  if (variant === "music") return <div className="cn-layout-variant cn-layout-music"><header><div><Identity data={data} size={72} /><p className="cn-layout-music-tag"><ListMusic className="inline h-4 w-4" /> Music Channel</p></div><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></header><div className="cn-layout-music-hero">{hero ? <SignedImage path={hero.thumbnail_path} alt={hero.title} className="aspect-square w-52 object-cover" /> : <div className="h-52 w-52 rounded-xl bg-white/10" />}<div><p className="eyebrow">LATEST RELEASE</p><h2>{hero?.title || "Sin lanzamientos"}</h2><p>{hero?.description || description}</p></div></div><div className="cn-layout-music-list">{data.videos.map((v, i) => <a key={v.id} href={`/watch?v=${v.code}`}><span>{String(i + 1).padStart(2, "0")}</span><span className="flex-1 truncate">{v.title}</span><span>{v.views} vistas</span></a>)}</div></div>;

  if (variant === "gaming") return <div className="cn-layout-variant cn-layout-gaming"><div className="cn-layout-gaming-banner"><SignedImage path={data.profile.banner_path} alt="" className="h-full w-full object-cover" /><div className="cn-layout-gaming-banner-copy"><Identity data={data} size={64} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></div></div><div className="cn-layout-gaming-body"><main><div className="cn-layout-section-heading"><Gamepad2 /> Últimos vídeos</div><VideoList data={data} limit={12} /></main><aside><h2>Stats</h2><p>{data.videos.length} vídeos</p><p>{data.profile.subscriber_count ?? data.subscriptions.length} suscriptores</p><h2>Sobre</h2><p>{description}</p></aside></div></div>;

  if (variant === "minimal") return <div className="cn-layout-variant cn-layout-minimal"><Identity data={data} centered size={72} /><div className="cn-layout-minimal-actions"><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></div><p className="cn-layout-minimal-description">{description}</p><div className="cn-layout-minimal-list">{data.videos.map((v) => <a key={v.id} href={`/watch?v=${v.code}`}><span>{v.title}</span><small>{v.views} vistas</small></a>)}</div></div>;

  if (variant === "2015") return <div className="cn-layout-variant cn-layout-2015"><div className="cn-layout-2015-top"><Identity data={data} size={74} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></div><nav><span className="active">CANAL</span><span>VIDEOS</span><span>PLAYLISTS</span><span>COMUNIDAD</span><span>INFORMACIÓN</span></nav><section className="cn-layout-2015-feature">{hero && <VideoCard video={hero} compact />}<div><h2>{hero?.title || "Bienvenido"}</h2><p>{hero?.description || description}</p></div></section><VideoList data={data} limit={10} /></div>;

  return <div className="cn-layout-variant cn-layout-2019"><div className="cn-layout-2019-banner"><SignedImage path={data.profile.banner_path} alt="" className="h-full w-full object-cover" /></div><div className="cn-layout-2019-head"><Identity data={data} size={80} /><Actions data={data} onSubscribe={onSubscribe} onReport={onReport} /></div><nav><span className="active">HOME</span><span>VIDEOS</span><span>COMMUNITY</span><span>ABOUT</span></nav><section className="cn-layout-2019-shelves"><article className="featured">{hero && <VideoCard video={hero} />}<div><h2>{hero?.title}</h2><p>{hero?.description || ""}</p></div></article><section><h2>Uploads</h2><VideoList data={{ ...data, videos: data.videos.slice(1) }} limit={8} /></section></section></div>;
}

export const EarlyYoutubeLayout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="early" />;
export const StarRatingLayout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="star" />;
export const Transition2010Layout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="transition" />;
export const OneChannel2013Layout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="onechannel" />;
export const MaterialLite2015Layout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="material" />;
export const ModernMinimal2020Layout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="modern" />;
export const FeatherProfileLayout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="feather" />;
export const CreatorStudioLayout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="studio" />;
export const ProfileCardLayout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="profile" />;
export const CommunityProfileLayout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="community" />;
export const VideoChannelLayout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="video" />;
export const MusicChannelLayout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="music" />;
export const GamingChannelLayout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="gaming" />;
export const MinimalProfileLayout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="minimal" />;
export const Channel2015Layout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="2015" />;
export const Channel2019Layout = (p: ChannelLayoutProps) => <ChannelVariantLayout {...p} variant="2019" />;
