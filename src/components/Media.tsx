import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSignedUrl } from "@/lib/storage";

export function SignedImage({
  path,
  alt,
  className,
  fallback,
}: {
  path?: string | null | undefined;
  alt: string;
  className?: string | undefined;
  fallback?: React.ReactNode;
}) {
  const url = useSignedUrl(path);
  if (!url) return <div className={cn("bg-surface", className)}>{fallback}</div>;
  return <img src={url} alt={alt} loading="lazy" className={cn("object-cover", className)} />;
}

export function ChannelAvatar({
  path,
  name,
  size = 40,
  className,
}: {
  path?: string | null | undefined;
  name: string;
  size?: number | undefined;
  className?: string | undefined;
}) {
  const url = useSignedUrl(path);
  return (
    <span
      style={{ width: size, height: size }}
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-muted-foreground",
        className,
      )}
    >
      {url ? (
        <img src={url} alt={name} className="h-full w-full object-cover" />
      ) : (
        <span style={{ fontSize: size * 0.4 }} className="font-medium uppercase">
          {name.slice(0, 1)}
        </span>
      )}
    </span>
  );
}

export function VerifiedBadge({ className }: { className?: string | undefined }) {
  return (
    <BadgeCheck
      aria-label="Verificado"
      className={cn("h-4 w-4 shrink-0 fill-verified text-background", className)}
    />
  );
}
