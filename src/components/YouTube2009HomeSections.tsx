import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import type { VideoWithChannel } from "@/components/VideoCard";
import { SignedImage } from "@/components/Media";
import { formatViews, timeAgo } from "@/lib/format";
import "@/youtube2009-home-sections.css";

function VideoItem({ video, rank }: { video: VideoWithChannel; rank?: number }) {
  return (
    <article className="cn-yt2009-item">
      <Link to="/watch" search={{ v: video.code }} className="cn-yt2009-item-thumb">
        {video.thumbnail_path ? <SignedImage path={video.thumbnail_path} alt={video.title} className="h-full w-full object-cover" fallback={<img src="/no-thumbnail.svg" alt="" aria-hidden="true" />} /> : <img src="/no-thumbnail.svg" alt="Sin miniatura" />}
        {rank != null && <span className="cn-yt2009-rank">{rank}</span>}
      </Link>
      <div className="cn-yt2009-item-info">
        <Link to="/watch" search={{ v: video.code }} className="cn-yt2009-item-title">{video.title}</Link>
        <Link to="/c/$username" params={{ username: video.profiles?.username ?? "" }} className="cn-yt2009-item-channel">{video.profiles?.display_name || video.profiles?.username || "Canal"}</Link>
        <div className="cn-yt2009-item-meta">{formatViews(video.views)} views · {timeAgo(video.created_at)}</div>
      </div>
    </article>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return <section className="cn-yt2009-section"><header><h2>{title}</h2>{subtitle && <span>{subtitle}</span>}</header>{children}</section>;
}

export function YouTube2009HomeSections({ videos }: { videos: VideoWithChannel[] }) {
  if (!videos.length) return null;

  const recommended = videos.slice(0, 4);
  const sortedByViews = [...videos].sort((a, b) => Number(b.views ?? 0) - Number(a.views ?? 0));
  const popular = sortedByViews.slice(0, 8);
  const featured = sortedByViews.filter((video) => Number(video.views ?? 0) > 0).slice(0, 4);

  return <div className="cn-yt2009-home-sections">
    <Section title="Recommended Videos" subtitle="Videos you may enjoy">
      <div className="cn-yt2009-list-grid">{recommended.map((video) => <VideoItem key={video.id} video={video} />)}</div>
    </Section>
    <Section title="Featured Videos" subtitle="Featured on Cornet">
      <div className="cn-yt2009-featured-grid">{featured.map((video) => <VideoItem key={video.id} video={video} />)}</div>
    </Section>
    <Section title="Most Popular" subtitle="Most viewed videos">
      <div className="cn-yt2009-popular-list">{popular.map((video, index) => <VideoItem key={video.id} video={video} rank={index + 1} />)}</div>
    </Section>
  </div>;
}
