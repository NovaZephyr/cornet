import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { SignedImage } from "@/components/Media";
import type { VideoWithChannel } from "@/components/VideoCard";
import { formatDuration, formatViews } from "@/lib/format";
import { fetchHomeFeed } from "@/lib/queries";
import "@/youtube2009-watched-now.css";

export function YouTube2009WatchedNow() {
  const { data: videos = [] } = useQuery<VideoWithChannel[]>({
    queryKey: ["home-feed", null, "recommended"],
    queryFn: () => fetchHomeFeed(32),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });

  const watched = [...videos]
    .sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0))
    .slice(0, 4);

  if (!watched.length) return null;

  return (
    <section className="cn-yt2009-watched" aria-labelledby="yt2009-watched-title">
      <header>
        <h2 id="yt2009-watched-title">Videos Being Watched Now</h2>
        <span>Videos being watched now</span>
      </header>
      <div className="cn-yt2009-watched-grid">
        {watched.map((video) => (
          <article key={video.id}>
            <Link to="/watch" search={{ v: video.code }} className="cn-yt2009-watched-thumb">
              {video.thumbnail_path ? <SignedImage path={video.thumbnail_path} alt={video.title} className="h-full w-full object-cover" fallback={<img src="/no-thumbnail.svg" alt="" aria-hidden="true" />} /> : <img src="/no-thumbnail.svg" alt="Sin miniatura" />}
              <span>{formatDuration(video.duration_seconds)}</span>
            </Link>
            <Link to="/watch" search={{ v: video.code }} className="cn-yt2009-watched-title">{video.title}</Link>
            <p>{video.profiles?.display_name || video.profiles?.username || "Canal"}</p>
            <small>{formatViews(video.views)} views</small>
          </article>
        ))}
      </div>
    </section>
  );
}
