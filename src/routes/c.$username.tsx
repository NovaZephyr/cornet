import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, SignedImage, VerifiedBadge } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { CommunityFeed } from "@/components/CommunityFeed";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, type AppRole, type Profile } from "@/hooks/useAuth";
import { useSignedUrl } from "@/lib/storage";
import { fetchVideos } from "@/lib/queries";

export const Route = createFileRoute("/c/$username")({
  head: () => ({
    meta: [
      { title: "Canal — CoreNetwork" },
      { name: "description", content: "Videos, comunidad e información del canal en CoreNetwork." },
      { property: "og:title", content: "Canal — CoreNetwork" },
      { property: "og:description", content: "Descubre los videos y publicaciones de este canal." },
    ],
  }),
  component: Channel,
});

function Channel() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["channel", username],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .maybeSingle();
      return (data as Profile) ?? null;
    },
  });

  const { data: roles } = useQuery({
    queryKey: ["channel-roles", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", profile!.id);
      return ((data ?? []) as { role: AppRole }[]).map((r) => r.role);
    },
  });

  const { data: videos } = useQuery({
    queryKey: ["channel-videos", profile?.id],
    enabled: !!profile?.id,
    queryFn: () => fetchVideos({ userId: profile!.id }),
  });

  const { data: subs } = useQuery({
    queryKey: ["channel-subs", profile?.id],
    enabled: !!profile?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("subscriptions")
        .select("subscriber_id")
        .eq("channel_id", profile!.id);
      return (data ?? []) as { subscriber_id: string }[];
    },
  });

  const background = useSignedUrl(profile?.background_path);
  const partnerGif = useSignedUrl(profile?.gif_path);
  const isSubscribed = !!subs?.some((s) => s.subscriber_id === user?.id);
  const isPartnerChannel = !!roles?.includes("partner");

  const toggleSub = async () => {
    if (!user || !profile) {
      toast.error("Inicia sesión para suscribirte");
      return;
    }
    if (isSubscribed) {
      await supabase
        .from("subscriptions")
        .delete()
        .eq("subscriber_id", user.id)
        .eq("channel_id", profile.id);
    } else {
      await supabase
        .from("subscriptions")
        .insert({ subscriber_id: user.id, channel_id: profile.id });
    }
    void qc.invalidateQueries({ queryKey: ["channel-subs", profile.id] });
  };

  if (isLoading) {
    return (
      <AppShell>
        <p className="py-24 text-center text-muted-foreground">Cargando canal…</p>
      </AppShell>
    );
  }

  if (!profile) {
    return (
      <AppShell>
        <p className="py-24 text-center text-muted-foreground">Este canal no existe.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div
        className="mx-auto max-w-6xl rounded-2xl"
        style={
          background
            ? {
                backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.75), rgba(0,0,0,0.95)), url(${background})`,
                backgroundSize: "cover",
                backgroundAttachment: "fixed",
              }
            : undefined
        }
      >
        <div className="p-2 sm:p-4">
          <div className="aspect-[6/1] w-full overflow-hidden rounded-2xl bg-surface">
            <SignedImage
              path={profile.banner_path}
              alt={`Banner de ${profile.display_name}`}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            <div className="relative shrink-0">
              <ChannelAvatar
                path={profile.avatar_path}
                name={profile.display_name || profile.username}
                size={112}
                className="ring-4"
                // eslint-disable-next-line react/forbid-dom-props
              />
              {isPartnerChannel && partnerGif && (
                <img
                  src={partnerGif}
                  alt={`GIF de perfil de ${profile.display_name || profile.username}`}
                  className="absolute -bottom-1 -right-1 h-9 w-9 rounded-full border-2 border-background object-cover"
                />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="flex items-center gap-2 text-2xl font-bold">
                {profile.display_name || profile.username}
                {profile.is_verified && <VerifiedBadge className="h-5 w-5" />}
              </h1>
              <p className="text-sm text-muted-foreground">
                @{profile.username} · {subs?.length ?? 0} suscriptores · {videos?.length ?? 0} videos
              </p>
              {profile.description && (
                <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">
                  {profile.description}
                </p>
              )}
              <div className="mt-2 flex gap-2">
                {roles?.includes("partner") && (
                  <Badge className="bg-partner text-background">Partner</Badge>
                )}
                {roles?.includes("admin") && <Badge variant="secondary">Administrador</Badge>}
                {roles?.includes("moderator") && <Badge variant="secondary">Moderador</Badge>}
              </div>
            </div>

            <Button
              onClick={() => void toggleSub()}
              variant={isSubscribed ? "secondary" : "default"}
              className="rounded-full"
              style={!isSubscribed ? { backgroundColor: profile.accent_color } : undefined}
            >
              {isSubscribed ? "Suscrito" : "Suscribirse"}
            </Button>
          </div>

          <Tabs defaultValue="videos" className="mt-6">
            <TabsList>
              <TabsTrigger value="videos">Videos</TabsTrigger>
              <TabsTrigger value="community">Comunidad</TabsTrigger>
              <TabsTrigger value="about">Información</TabsTrigger>
            </TabsList>

            <TabsContent value="videos" className="pt-6">
              {videos && videos.length > 0 ? (
                <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {videos.map((v) => (
                    <VideoCard key={v.id} video={v} />
                  ))}
                </div>
              ) : (
                <p className="py-12 text-center text-muted-foreground">
                  Este canal todavía no tiene videos.
                </p>
              )}
            </TabsContent>

            <TabsContent value="community" className="pt-6">
              <CommunityFeed channelId={profile.id} />
            </TabsContent>

            <TabsContent value="about" className="pt-6">
              <div className="max-w-2xl rounded-xl bg-surface p-5 text-sm">
                <p className="whitespace-pre-wrap">
                  {profile.description || "Este canal aún no escribió una descripción."}
                </p>
                <p className="mt-4 text-muted-foreground">
                  En CoreNetwork desde {new Date(profile.created_at).toLocaleDateString("es")}
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AppShell>
  );
}
