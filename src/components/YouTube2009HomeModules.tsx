import { Link } from "@tanstack/react-router";
import { SignedImage } from "@/components/Media";
import type { VideoWithChannel } from "@/components/VideoCard";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import "@/youtube2009-home.css";

function YT2009Video({ video }: { video: VideoWithChannel }) {
  const channel = video.profiles;
  return (
    <article className="cn-yt2009-video">
      <Link to="/watch" search={{ v: video.code }} className="cn-yt2009-video-thumb">
        {video.thumbnail_path ? <SignedImage path={video.thumbnail_path} alt={video.title} className="h-full w-full object-cover" fallback={<img src="/no-thumbnail.svg" alt="" aria-hidden="true" />} /> : <img src="/no-thumbnail.svg" alt="Sin miniatura" />}
        <span>{formatDuration(video.duration_seconds)}</span>
      </Link>
      <Link to="/watch" search={{ v: video.code }} className="cn-yt2009-video-title">{video.title}</Link>
      <Link to="/c/$username" params={{ username: channel?.username ?? "" }} className="cn-yt2009-video-channel">{channel?.display_name || channel?.username || "Canal"}</Link>
      <div className="cn-yt2009-video-meta">{formatViews(video.views)} views · {timeAgo(video.created_at)}</div>
    </article>
  );
}

function Shelf({ title, videos, moreLabel }: { title: string; videos: VideoWithChannel[]; moreLabel?: string }) {
  if (!videos.length) return null;
  return (
    <section className="cn-yt2009-shelf">
      <header><h2>{title}</h2>{moreLabel && <span>{moreLabel}</span>}</header>
      <div className="cn-yt2009-video-grid">{videos.map((video) => <YT2009Video key={video.id} video={video} />)}</div>
    </section>
  );
}

export function YouTube2009HomeModules({ videos }: { videos: VideoWithChannel[] }) {
  const watchedNow = videos.slice(0, 4);
  const featured = videos.slice(4, 8);
  const popular = [...videos].sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0)).slice(0, 4);

  const categories = new Map<string, VideoWithChannel[]>();
  for (const video of videos) {
    const category = video.category?.trim();
    if (!category) continue;
    const list = categories.get(category) ?? [];
    if (list.length < 4) list.push(video);
    categories.set(category, list);
  }

  return <div className="cn-yt2009-home-modules">
    <Shelf title="Videos Being Watched Now" videos={watchedNow} moreLabel="See all →" />
    <Shelf title="Featured Videos" videos={featured} moreLabel="More featured videos →" />
    <Shelf title="Most Popular" videos={popular} moreLabel="See more popular videos →" />
    <div className="cn-yt2009-categories">
      {Array.from(categories.entries()).slice(0, 6).map(([category, items]) => <Shelf key={category} title={category} videos={items} />)}
    </div>
  </div>;
}
