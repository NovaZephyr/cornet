import { Flag, Film, LayoutGrid, MessageSquare, Star, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChannelAvatar, SignedImage } from "@/components/Media";
import { ChannelDistinctions } from "@/components/ChannelDistinctions";
import { CommunityFeed } from "@/components/CommunityFeed";
import { useSignedUrl } from "@/lib/storage";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import type { ChannelLayoutProps } from "./channel-data";

function Channel2Player({ video }: { video: NonNullable<ChannelLayoutProps["data"]["videos"]>[number] }) {
  const videoUrl = useSignedUrl(video.video_path);
  const posterUrl = useSignedUrl(video.thumbnail_path);
  if (!videoUrl) return video.thumbnail_path ? <SignedImage path={video.thumbnail_path} alt={video.title} className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center bg-black text-xs text-white/70">Sin vídeo destacado</div>;
  return <video className="h-full w-full bg-black object-contain" controls playsInline preload="metadata" poster={posterUrl ?? undefined} src={videoUrl} />;
}

function VideoTile({ video }: { video: NonNullable<ChannelLayoutProps["data"]["videos"]>[number] }) {
  return <article className="cn-channel20-video-tile">
    <Link to="/watch" search={{ v: video.code }} className="cn-channel20-video-thumb">
      {video.thumbnail_path ? <SignedImage path={video.thumbnail_path} alt={video.title} className="h-full w-full object-cover" /> : <span />}
      <b>{formatDuration(video.duration_seconds)}</b>
    </Link>
    <Link to="/watch" search={{ v: video.code }} className="cn-channel20-video-title">{video.title}</Link>
    <p>{formatViews(video.views)} views<br />{timeAgo(video.created_at)}</p>
  </article>;
}

export function Channel20Layout({ data, onSubscribe, onReport }: ChannelLayoutProps) {
  const hero = data.videos[0];
  const uploads = data.videos.slice(1, 10);
  const bannerUrl = useSignedUrl(data.profile.banner_path);
  const backgroundStyle = data.background ? { backgroundImage: `url(${data.background})`, backgroundPosition: "top center", backgroundRepeat: "repeat-y" as const, backgroundSize: "auto" as const } : undefined;
  const totalViews = data.videos.reduce((sum, video) => sum + video.views, 0);

  return <div className="cn-channel20-canvas" style={backgroundStyle}>
    <div className="cn-channel20-shell">
      {bannerUrl ? <div className="cn-channel20-banner"><img src={bannerUrl} alt="Channel banner" /></div> : null}

      <header className="cn-channel20-header">
        <div className="cn-channel20-brand">
          <ChannelAvatar path={data.profile.avatar_path} name={data.profile.display_name || data.profile.username} size={58} />
          <div className="min-w-0">
            <h1>{data.profile.display_name || data.profile.username}<ChannelDistinctions className="ml-1 inline-flex align-middle" isVerified={data.profile.is_verified} isMusic={data.profile.is_music_channel} roles={data.roles} /></h1>
            <p>@{data.profile.username}</p>
          </div>
        </div>
        <div className="cn-channel20-actions">
          <Button size="sm" onClick={onSubscribe} className="cn-channel20-subscribe">{data.isSubscribed ? "Suscrito" : "Subscribe"}</Button>
          <Button size="sm" variant="outline" onClick={onReport} className="cn-channel20-report"><Flag className="mr-1 h-3 w-3" />Report</Button>
        </div>
      </header>

      <nav className="cn-channel20-nav" aria-label="Channel navigation">
        <a className="active" href="#videos">Videos</a>
        <a href="#favorites">Favorites</a>
        <a href="#playlists">Playlists</a>
        <a href="#friends">Friends</a>
        <a href="#subscribers">Subscribers</a>
        <a href="#subscriptions">Subscriptions</a>
      </nav>

      <div className="cn-channel20-columns">
        <aside className="cn-channel20-profile">
          <section>
            <h2>{data.profile.username}</h2>
            <div className="cn-channel20-avatar-large"><ChannelAvatar path={data.profile.avatar_path} name={data.profile.display_name || data.profile.username} size={108} /></div>
            <p className="cn-channel20-profile-name">{data.profile.display_name || data.profile.username}</p>
            <p>{data.profile.description || "Welcome to my channel."}</p>
            <dl>
              <div><dt>Subscribers</dt><dd>{data.profile.subscriber_count ?? data.subscriptions.length}</dd></div>
              <div><dt>Channel Views</dt><dd>{formatViews(totalViews)}</dd></div>
              <div><dt>Videos</dt><dd>{data.videos.length}</dd></div>
              <div><dt>Joined</dt><dd>{new Date(data.profile.created_at).toLocaleDateString()}</dd></div>
            </dl>
            <div className="cn-channel20-profile-links"><a href="#message"><MessageSquare className="mr-1 inline h-3 w-3" />Send Message</a><a href="#friend"><Users className="mr-1 inline h-3 w-3" />Add as Friend</a><a href="#favorite"><Star className="mr-1 inline h-3 w-3" />Add as Favorite</a></div>
          </section>

          <section>
            <h2>Connect</h2>
            {data.profile.social_links?.slice(0, 5).map((link) => <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.platform}</a>)}
          </section>

          <section id="subscribers">
            <h2>Subscribers</h2>
            <div className="cn-channel20-empty-small">{data.profile.subscriber_count ?? data.subscriptions.length} subscribers</div>
          </section>

          <section id="subscriptions">
            <h2>Subscriptions</h2>
            <div className="cn-channel20-empty-small">{data.subscriptions.length} subscriptions</div>
          </section>
        </aside>

        <main className="cn-channel20-main">
          {hero ? <section className="cn-channel20-feature">
            <div className="cn-channel20-section-title"><span>Featured Video</span><Link to="/watch" search={{ v: hero.code }}>Watch video <Film className="ml-1 inline h-3 w-3" /></Link></div>
            <div className="cn-channel20-feature-body">
              <div className="cn-channel20-player"><Channel2Player video={hero} /></div>
              <div className="cn-channel20-feature-copy"><Link to="/watch" search={{ v: hero.code }}>{hero.title}</Link><p>{formatViews(hero.views)} views · {timeAgo(hero.created_at)}</p>{hero.description ? <p className="description">{hero.description}</p> : null}<p className="cn-channel20-rating">★★★★★</p></div>
            </div>
          </section> : null}

          <section id="playlists" className="cn-channel20-section">
            <div className="cn-channel20-section-title"><span>Playlists</span><span>See all</span></div>
            <div className="cn-channel20-playlist-placeholder"><LayoutGrid className="h-5 w-5" /><span>No playlists to display.</span></div>
          </section>

          <section id="videos" className="cn-channel20-section">
            <div className="cn-channel20-section-title"><span>Videos ({data.videos.length})</span><span>Subscribe to {data.profile.username}'s videos</span></div>
            <div className="cn-channel20-video-grid">{uploads.length ? uploads.map((video) => <VideoTile key={video.id} video={video} />) : <p className="cn-channel20-empty">This channel has no videos.</p>}</div>
          </section>

          <section id="favorites" className="cn-channel20-section">
            <div className="cn-channel20-section-title"><span>Favorites (0)</span><span>Subscribe to favorites</span></div>
            <div className="cn-channel20-playlist-placeholder">No favorites to display.</div>
          </section>

          <section id="friends" className="cn-channel20-section">
            <div className="cn-channel20-section-title"><span>Friends</span></div>
            <div className="cn-channel20-playlist-placeholder">No friends to display.</div>
          </section>

          <section id="community" className="cn-channel20-section">
            <div className="cn-channel20-section-title"><span>Recent Activity / Community</span></div>
            <div className="cn-channel20-community"><CommunityFeed channelId={data.profile.id} /></div>
          </section>
        </main>
      </div>
    </div>
  </div>;
}
