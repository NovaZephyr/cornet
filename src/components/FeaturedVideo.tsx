import { Play } from "lucide-react";
import { useSignedUrl } from "@/lib/storage";
import { VideoCard } from "@/components/VideoCard";

type FeaturedVideoData = {
  id: string;
  title: string;
  video_path?: string | null;
  thumbnail_path?: string | null;
  duration_seconds?: number | null;
};

export function FeaturedVideo({ video, compact = false }: { video: FeaturedVideoData; compact?: boolean }) {
  const src = useSignedUrl(video.video_path);

  if (!src) return <VideoCard video={video as never} compact={compact} />;

  return (
    <div className={compact ? "overflow-hidden" : "overflow-hidden rounded-md border border-[#c8c8c8] bg-black"}>
      <div className="relative aspect-video w-full bg-black">
        <video
          className="h-full w-full object-contain"
          src={src}
          poster={undefined}
          controls
          preload="metadata"
          playsInline
        />
        <div className="pointer-events-none absolute left-2 top-2 inline-flex items-center gap-1 rounded-sm bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">
          <Play className="h-3 w-3 fill-current" /> Featured
        </div>
      </div>
      <div className="border-t border-border bg-surface px-3 py-2">
        <p className="line-clamp-2 text-sm font-semibold">{video.title}</p>
      </div>
    </div>
  );
}
