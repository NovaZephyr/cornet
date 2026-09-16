import { Flag, Film, MessageSquare, Star, Users } from "lucide-react";
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

  if (!videoUrl) {
    return video.thumbnail_path ? (
      <SignedImage path={video.thumbnail_path} alt={video.title} className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-[#222] text-xs text-white/70">Sin vídeo destacado</div>
    );
  }

  return (
    <video
      className="h-full w-full bg-black object-contain"
      controls
      playsInline
      preload="metadata"
      poster={posterUrl ?? undefined}
      src={videoUrl}
    />
  );
}

export function Channel20Layout({ data, onSubscribe, onReport }: ChannelLayoutProps) {
  const hero = data.videos[0];
  const uploads = data.videos.slice(1, 9);
  const bannerUrl = useSignedUrl(data.profile.banner_path);
  const backgroundStyle = data.background
    ? {
        backgroundImage: `url(${data.background})`,
        backgroundPosition: "top center",
        backgroundRepeat: "repeat-y" as const,
        backgroundSize: "auto" as const,
      }
    : undefined;

  return (
    <div className="cn-channel20-canvas" style={backgroundStyle}>
      <div className="cn-channel20-shell">
        {bannerUrl ? (
          <div className="cn-channel20-banner">
            <img src={bannerUrl} alt="Channel banner" />
          </div>
        ) : null}

        <header className="cn-channel20-header">
          <div className="cn-channel20-brand">
            <ChannelAvatar path={data.profile.avatar_path} name={data.profile.display_name || data.profile.username} size={42} />
            <div>
              <h1>
                {data.profile.display_name || data.profile.username}
                <ChannelDistinctions className="ml-1 inline-flex align-middle" isVerified={data.profile.is_verified} isMusic={data.profile.is_music_channel} roles={data.roles} />
              </h1>
              <p>@{data.profile.username}</p>
            </div>
          </div>
          <div className="cn-channel20-actions">
            <Button size="sm" onClick={onSubscribe} className="cn-channel20-subscribe">
              {data.isSubscribed ? "Suscrito" : "Suscribirse"}
            </Button>
            <Button size="sm" variant="outline" onClick={onReport} className="cn-channel20-report">
              <Flag className="mr-1 h-3 w-3" /> Denunciar
            </Button>
          </div>
        </header>

        <nav className="cn-channel20-nav" aria-label="Channel navigation">
          <a className="active" href="#home">CHANNEL</a>
          <a href="#uploads">VIDEOS</a>
          <a href="#community">COMMUNITY</a>
          <a href="#about">ABOUT</a>
        </nav>

        <div className="cn-channel20-columns">
          <aside className="cn-channel20-profile">
            <section>
              <h2>About</h2>
              <div className="cn-channel20-avatar-large">
                <ChannelAvatar path={data.profile.avatar_path} name={data.profile.display_name || data.profile.username} size={92} />
              </div>
              <p>{data.profile.description || "This channel has no description."}</p>
              <dl>
                <div><dt>Subscribers</dt><dd>{data.profile.subscriber_count ?? data.subscriptions.length}</dd></div>
                <div><dt>Videos</dt><dd>{data.videos.length}</dd></div>
                <div><dt>Views</dt><dd>{formatViews(data.videos.reduce((sum, video) => sum + video.views, 0))}</dd></div>
              </dl>
            </section>

            <section>
              <h2>Connect</h2>
              <a href="#message"><MessageSquare className="mr-1 inline h-3 w-3" />Send Message</a>
              <a href="#friend"><Users className="mr-1 inline h-3 w-3" />Add as Friend</a>
              <a href="#favorite"><Star className="mr-1 inline h-3 w-3" />Add as Favorite</a>
            </section>

            <section id="about">
              <h2>Channel Info</h2>
              <p>Joined {new Date(data.profile.created_at).toLocaleDateString()}</p>
              {data.profile.social_links?.slice(0, 4).map((link) => (
                <a key={link.url} href={link.url} target="_blank" rel="noreferrer">{link.platform}</a>
              ))}
            </section>
          </aside>

          <main id="home" className="cn-channel20-main">
            {hero ? (
              <section className="cn-channel20-feature">
                <div className="cn-channel20-section-title">Featured Video</div>
                <div className="cn-channel20-feature-body">
                  <div className="cn-channel20-player">
                    <Channel2Player video={hero} />
                  </div>
                  <div className="cn-channel20-feature-copy">
                    <Link to="/watch" search={{ v: hero.code }}>{hero.title}</Link>
                    <p>{formatViews(hero.views)} views · {timeAgo(hero.created_at)}</p>
                    {hero.description ? <p className="description">{hero.description}</p> : null}
                    <Link to="/watch" search={{ v: hero.code }} className="watch-link"><Film className="mr-1 inline h-3.5 w-3.5" />Watch this video</Link>
                  </div>
                </div>
              </section>
            ) : null}

            <section id="uploads" className="cn-channel20-section">
              <div className="cn-channel20-section-title">Uploads</div>
              {uploads.length ? (
                <div className="cn-channel20-upload-list">
                  {uploads.map((video) => (
                    <article key={video.id}>
                      <Link to="/watch" search={{ v: video.code }} className="thumbnail">
                        {video.thumbnail_path ? <SignedImage path={video.thumbnail_path} alt={video.title} className="h-full w-full object-cover" /> : <span />}
                        <b>{formatDuration(video.duration_seconds)}</b>
                      </Link>
                      <div>
                        <Link to="/watch" search={{ v: video.code }}>{video.title}</Link>
                        <p>{formatViews(video.views)} views · {timeAgo(video.created_at)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : <p className="cn-channel20-empty">No uploads yet.</p>}
            </section>

            <section id="community" className="cn-channel20-section">
              <div className="cn-channel20-section-title">Community</div>
              <div className="cn-channel20-community"><CommunityFeed channelId={data.profile.id} /></div>
            </section>
          </main>
        </div>
      </div>
    </div>
  );
}
