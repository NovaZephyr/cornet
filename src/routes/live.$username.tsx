import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, VerifiedBadge } from "@/components/Media";

export const Route = createFileRoute("/live/$username")({
  head: () => ({ meta: [{ title: "En vivo — CoreNetwork" }] }),
  component: LiveWatchPage,
});

function LiveWatchPage() {
  const { username } = Route.useParams();

  const { data: profile } = useQuery({
    queryKey: ["live-channel-profile", username],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: stream } = useQuery({
    queryKey: ["live-channel-stream", profile?.id],
    enabled: !!profile?.id,
    refetchInterval: 10_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("live_streams")
        .select("id, title, description, status, cf_playback_uid")
        .eq("user_id", profile!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!profile) {
    return <AppShell><p className="py-24 text-center text-muted-foreground">Este canal no existe.</p></AppShell>;
  }

  const isLive = stream?.status === "live";

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-4 pb-16">
        <div className="aspect-video w-full overflow-hidden rounded-2xl bg-black">
          {isLive && stream?.cf_playback_uid ? (
            <iframe
              src={`https://customer-cloudflarestream.com/${stream.cf_playback_uid}/iframe?autoplay=true`}
              className="h-full w-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title="Transmisión en vivo"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <Radio className="h-10 w-10" />
              <p>{profile.display_name || profile.username} no está en vivo ahora mismo.</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-white" /> EN VIVO
            </span>
          )}
          <Link
            to="/c/$username"
            params={{ username: profile.username }}
            className="flex items-center gap-2 hover:underline"
          >
            <ChannelAvatar path={profile.avatar_path} name={profile.display_name || profile.username} size={36} />
            <span className="font-medium">
              {profile.display_name || profile.username}
              {profile.is_verified && <VerifiedBadge className="ml-1 inline h-4 w-4" />}
            </span>
          </Link>
        </div>

        {stream?.title && <h1 className="text-xl font-bold">{stream.title}</h1>}
        {stream?.description && <p className="text-sm text-muted-foreground">{stream.description}</p>}
      </div>
    </AppShell>
  );
}
