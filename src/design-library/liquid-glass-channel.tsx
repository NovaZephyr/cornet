import { Flag, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChannelAvatar, SignedImage } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { CommunityFeed } from "@/components/CommunityFeed";
import { ChannelDistinctions } from "@/components/ChannelDistinctions";
import type { ChannelLayoutProps } from "./channel-data";

export function LiquidGlassChannel({ data, onSubscribe, onReport }: ChannelLayoutProps) {
  const hero = data.videos[0];
  return (
    <div className="cn-liquid-channel">
      <div className="cn-liquid-orb cn-liquid-orb-a" aria-hidden="true" />
      <div className="cn-liquid-orb cn-liquid-orb-b" aria-hidden="true" />
      <div className="cn-liquid-canvas">
        <header className="cn-liquid-hero-panel">
          <div className="cn-liquid-banner">
            {data.profile.banner_path ? <SignedImage path={data.profile.banner_path} alt="" className="h-full w-full object-cover" /> : null}
            <div className="cn-liquid-banner-glow" aria-hidden="true" />
          </div>
          <div className="cn-liquid-identity-row">
            <div className="cn-liquid-identity">
              <div className="cn-liquid-avatar-ring">
                <ChannelAvatar path={data.profile.avatar_path} name={data.profile.display_name || data.profile.username} size={88} />
              </div>
              <div className="min-w-0">
                <h1>{data.profile.display_name || data.profile.username}<ChannelDistinctions className="ml-2 inline-flex" isVerified={data.profile.is_verified} isMusic={data.profile.is_music_channel} roles={data.roles} /></h1>
                <p>@{data.profile.username} · {data.profile.subscriber_count ?? data.subscriptions.length} suscriptores · {data.videos.length} videos</p>
              </div>
            </div>
            <div className="cn-liquid-actions">
              <Button onClick={onSubscribe}>{data.isSubscribed ? "Suscrito" : "Suscribirse"}</Button>
              <Button onClick={onReport} variant="outline"><Flag className="mr-2 h-4 w-4" />Denunciar</Button>
            </div>
          </div>
          <nav className="cn-liquid-tabs" aria-label="Navegación del canal">
            <button className="is-active" type="button">Canal</button>
            <button type="button">Videos</button>
            <button type="button">Comunidad</button>
            <button type="button">Playlists</button>
            <button type="button">Información</button>
          </nav>
        </header>

        <main className="cn-liquid-content">
          <section className="cn-liquid-card cn-liquid-featured">
            <div className="cn-liquid-card-heading"><span><Sparkles className="inline h-4 w-4" /> Destacado</span>{hero ? <a href={`/watch?v=${hero.code}`}>Abrir video</a> : null}</div>
            {hero ? <div className="cn-liquid-feature-grid"><VideoCard video={hero} /><div><h2>{hero.title}</h2><p>{hero.description || "Sin descripción."}</p><div className="cn-liquid-metric-row"><span>{hero.views.toLocaleString("es-ES")} vistas</span><span>{data.videos.length} videos en el canal</span></div></div></div> : <p>No hay un video destacado todavía.</p>}
          </section>

          <div className="cn-liquid-columns">
            <section className="cn-liquid-card cn-liquid-videos"><div className="cn-liquid-card-heading"><span>Videos</span><span>{data.videos.length}</span></div><div className="cn-liquid-video-grid">{data.videos.map((video) => <VideoCard key={video.id} video={video} />)}</div></section>
            <aside className="cn-liquid-side">
              <section className="cn-liquid-card"><h2>Sobre el canal</h2><p>{data.profile.description || "Este canal todavía no tiene descripción."}</p><div className="cn-liquid-stats"><span><strong>{data.profile.subscriber_count ?? data.subscriptions.length}</strong> suscriptores</span><span><strong>{data.videos.length}</strong> videos</span></div></section>
              <section className="cn-liquid-card"><h2>Comunidad</h2><CommunityFeed channelId={data.profile.id} /></section>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
}
