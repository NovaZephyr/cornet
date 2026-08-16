import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { ChannelAvatar, SignedImage, VerifiedBadge } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { CommunityFeed } from "@/components/CommunityFeed";
import { ReportDialog } from "@/components/ReportDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth, type AppRole, type Profile, type ChannelInfoLayout } from "@/hooks/useAuth";
import { useSignedUrl } from "@/lib/storage";
import { fetchVideos } from "@/lib/queries";
import { useTheme } from "@/hooks/useTheme";

export const Route = createFileRoute("/c/$username")({ head: () => ({ meta: [{ title: "Canal — CoreNetwork" }] }), component: Channel });

type ChannelProfile = Profile & { channel_style?: "corenetwork" | "channel-1" | "channel-2" | "cosmic-panda"; subscriber_count?: number; channel_primary_color?: string; channel_secondary_color?: string; channel_surface_color?: string; channel_text_color?: string; channel_info_layout?: ChannelInfoLayout };

const CHANNEL_STYLE_LABELS: Record<string, string> = { corenetwork: "CoreNetwork", "channel-1": "Channel 1.0", "channel-2": "Channel 2.0", "cosmic-panda": "Cosmic Panda" };

function getChannelVars(profile: ChannelProfile): React.CSSProperties {
  return {
    "--cn-channel-primary": profile.channel_primary_color ?? "#1f4fa3",
    "--cn-channel-secondary": profile.channel_secondary_color ?? "#2aa84a",
    "--cn-channel-surface": profile.channel_surface_color ?? "#ffffff",
    "--cn-channel-text": profile.channel_text_color ?? "#222222",
  } as React.CSSProperties;
}

function RetroChannel({ profile, videos, roles, subs, isSubscribed, isPartnerChannel, partnerGif, onSubscribe, onReport }: { profile: ChannelProfile; videos: Awaited<ReturnType<typeof fetchVideos>>; roles?: AppRole[]; subs: { subscriber_id: string }[]; isSubscribed: boolean; isPartnerChannel: boolean; partnerGif: string | null; onSubscribe: () => void; onReport: () => void }) {
  const style = profile.channel_style ?? "corenetwork";
  const infoLayout = profile.channel_info_layout ?? "left";
  const styleClass = `cn-2012-channel cn-2012-channel--${style} cn-2012-info--${infoLayout}`;
  const hero = videos[0];
  const channelVars = getChannelVars(profile);

  const InfoPanel = infoLayout === "hidden" ? null : (
    <aside className="cn-2012-about">
      <h2>Información del canal</h2>
      <p>{profile.description || "Este canal todavía no tiene descripción."}</p>
      <div className="mt-3 space-y-1 text-xs opacity-80">
        <p>Suscriptores: {profile.subscriber_count ?? subs.length}</p>
        <p>Videos: {videos.length}</p>
        <p>Estilo: {CHANNEL_STYLE_LABELS[style]}</p>
      </div>
    </aside>
  );

  return (
    <div className={styleClass} style={channelVars}>
      <div className="cn-2012-cover"><SignedImage path={profile.banner_path} alt={`Banner de ${profile.display_name}`} className="h-full w-full object-cover" /></div>
      <div className="cn-2012-titlebar">
        <div className="flex items-center gap-3">
          <div className="relative"><ChannelAvatar path={profile.avatar_path} name={profile.display_name || profile.username} size={64} />{isPartnerChannel && partnerGif && <img src={partnerGif} alt="" className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full border object-cover" />}</div>
          <div className="min-w-0"><h1 className="truncate text-xl font-bold">{profile.display_name || profile.username}{profile.is_verified && <VerifiedBadge className="ml-1 inline h-4 w-4" />}</h1><p className="text-xs opacity-75">@{profile.username} · {profile.subscriber_count ?? subs.length} suscriptores · {videos.length} videos</p></div>
        </div>
        <div className="flex gap-2"><Button onClick={onSubscribe} variant={isSubscribed ? "secondary" : "default"} className="cn-2012-retro-button">{isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button onClick={onReport} variant="outline" className="cn-2012-retro-button"><Flag className="mr-2 h-4 w-4" />Denunciar</Button></div>
      </div>
      <div className="cn-2012-tabs"><span className="is-active">Videos</span><span>Información</span><span>Comunidad</span><span>Playlists</span></div>
      {style === "channel-2" && hero ? <div className="cn-2012-feature"><VideoCard video={hero} compact /></div> : null}
      {infoLayout === "top" && InfoPanel}
      <div className="cn-2012-body">
        {infoLayout === "left" && InfoPanel}
        <section className="cn-2012-video-column"><div className="cn-2012-section-title"><span>{style === "cosmic-panda" ? "Videos recientes" : style === "channel-2" ? "Videos destacados" : "Videos"}</span><span>Ver todos</span></div>{videos.length > 0 ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{videos.slice(style === "channel-2" ? 1 : 0).map((video) => <VideoCard key={video.id} video={video} />)}</div> : <p className="cn-2012-empty">Este canal todavía no tiene videos.</p>}</section>
        {infoLayout === "right" && InfoPanel}
      </div>
      {(roles?.length ?? 0) > 0 && <div className="cn-2012-badges">{roles?.includes("partner") && <Badge>Partner</Badge>}{roles?.includes("admin") && <Badge variant="secondary">Administrador</Badge>}{roles?.includes("moderator") && <Badge variant="secondary">Moderador</Badge>}</div>}
    </div>
  );
}

function Channel() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const qc = useQueryClient();
  const { theme } = useTheme();
  const [reportOpen, setReportOpen] = useState(false);
  const { data: profile, isLoading } = useQuery({ queryKey: ["channel", username], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("*").eq("username", username).maybeSingle(); if (error) throw error; return (data as ChannelProfile) ?? null; } });
  const { data: roles } = useQuery({ queryKey: ["channel-roles", profile?.id], enabled: !!profile?.id, queryFn: async () => { const { data, error } = await supabase.rpc("get_public_badges", { _user_id: profile!.id }); if (error) throw error; return (data ?? []) as AppRole[]; } });
  const { data: videos } = useQuery({ queryKey: ["channel-videos", profile?.id], enabled: !!profile?.id, queryFn: () => fetchVideos({ userId: profile!.id }) });
  const { data: subs } = useQuery({ queryKey: ["channel-subs", profile?.id], enabled: !!profile?.id, queryFn: async () => { const { data } = await supabase.from("subscriptions").select("subscriber_id").eq("channel_id", profile!.id); return (data ?? []) as { subscriber_id: string }[]; } });
  const background = useSignedUrl(profile?.background_path);
  const partnerGif = useSignedUrl(profile?.gif_path);
  const isSubscribed = !!subs?.some((s) => s.subscriber_id === user?.id);
  const isPartnerChannel = !!roles?.includes("partner");

  const toggleSub = async () => {
    if (!user || !profile) return void toast.error("Inicia sesión para suscribirte");
    if (isSubscribed) await supabase.from("subscriptions").delete().eq("subscriber_id", user.id).eq("channel_id", profile.id);
    else await supabase.from("subscriptions").insert({ subscriber_id: user.id, channel_id: profile.id });
    void qc.invalidateQueries({ queryKey: ["channel-subs", profile.id] });
    void qc.invalidateQueries({ queryKey: ["videos"] });
  };

  const openReport = () => { if (!user) return toast.error("Inicia sesión para denunciar"); setReportOpen(true); };

  if (isLoading) return <AppShell><p className="py-24 text-center text-muted-foreground">Cargando canal…</p></AppShell>;
  if (!profile) return <AppShell><p className="py-24 text-center text-muted-foreground">Este canal no existe.</p></AppShell>;
  const channelVideos = videos ?? [];
  const style = profile.channel_style ?? "corenetwork";
  const channelVars = getChannelVars(profile);

  if (theme === "retro2012") return <AppShell><RetroChannel profile={profile} videos={channelVideos} roles={roles} subs={subs ?? []} isSubscribed={isSubscribed} isPartnerChannel={isPartnerChannel} partnerGif={partnerGif} onSubscribe={() => void toggleSub()} onReport={openReport} /><ReportDialog target={{ type: "channel", id: profile.id, name: profile.display_name || profile.username }} open={reportOpen} onOpenChange={setReportOpen} /></AppShell>;

  const modernChannelStyles = `
    .cn-modern-channel{position:relative;min-height:calc(100vh - 9rem);margin:0 -1rem;padding:0 1rem 2rem;background-size:cover;background-position:center;background-attachment:fixed;background-color:var(--cn-channel-surface);overflow:hidden}
    .cn-modern-channel-overlay{position:absolute;inset:0;pointer-events:none;background:linear-gradient(180deg,color-mix(in srgb,var(--cn-channel-primary) 42%,transparent) 0%,color-mix(in srgb,var(--cn-channel-primary) 16%,transparent) 30%,color-mix(in srgb,var(--cn-channel-secondary) 20%,transparent) 100%);opacity:.72}
    .cn-modern-channel-content{position:relative;z-index:1;padding-top:.75rem}
    .cn-modern-channel-content>.mx-auto{border-color:color-mix(in srgb,var(--cn-channel-secondary) 40%,transparent);color:var(--cn-channel-text)}
    .cn-modern-channel-tabs{background:color-mix(in srgb,var(--cn-channel-primary) 18%,var(--cn-channel-surface));border-color:color-mix(in srgb,var(--cn-channel-secondary) 50%,transparent)}
    .cn-modern-channel-button{background:var(--cn-channel-primary)!important;color:var(--cn-channel-surface)!important;border-color:var(--cn-channel-primary)!important}
    .cn-modern-channel--channel-1 .cn-modern-channel-overlay{background:linear-gradient(135deg,color-mix(in srgb,var(--cn-channel-primary) 52%,transparent),transparent 54%,color-mix(in srgb,var(--cn-channel-secondary) 34%,transparent))}
    .cn-modern-channel--channel-2 .cn-modern-channel-overlay{background:linear-gradient(180deg,color-mix(in srgb,var(--cn-channel-primary) 48%,transparent),color-mix(in srgb,var(--cn-channel-secondary) 12%,transparent))}
    .cn-modern-channel--cosmic-panda .cn-modern-channel-overlay{background:linear-gradient(180deg,color-mix(in srgb,var(--cn-channel-primary) 38%,transparent),transparent 45%,color-mix(in srgb,var(--cn-channel-secondary) 24%,transparent))}
    .cn-modern-channel--corenetwork .cn-modern-channel-overlay{opacity:.42}
    @media(max-width:768px){.cn-modern-channel{margin:0 -.5rem;padding:0 .5rem 1rem;background-attachment:scroll}}
  `;

  return (
    <AppShell>
      <style>{modernChannelStyles}</style>
      <div
        className={`cn-modern-channel cn-modern-channel--${style}`}
        style={background ? { ...channelVars, backgroundImage: `url(${background})` } : channelVars}
      >
        <div className="cn-modern-channel-overlay" aria-hidden="true" />
        <div className="cn-modern-channel-content">
          <div className="mx-auto max-w-6xl rounded-2xl bg-background/90 p-2 shadow-2xl backdrop-blur-[2px] sm:p-4">
            <div className="aspect-[6/1] w-full overflow-hidden rounded-2xl bg-surface">
              <SignedImage path={profile.banner_path} alt={`Banner de ${profile.display_name}`} className="h-full w-full object-cover" />
            </div>
            <div className="mt-5 flex flex-col items-start gap-5 sm:flex-row sm:items-center">
              <ChannelAvatar path={profile.avatar_path} name={profile.display_name || profile.username} size={112} />
              <div className="min-w-0 flex-1">
                <h1 className="flex items-center gap-2 text-2xl font-bold">{profile.display_name || profile.username}{profile.is_verified && <VerifiedBadge className="h-5 w-5" />}</h1>
                <p className="text-sm text-muted-foreground">@{profile.username} · {profile.subscriber_count ?? subs?.length ?? 0} suscriptores · {channelVideos.length} videos</p>
                {profile.description && <p className="mt-1 line-clamp-2 max-w-2xl text-sm text-muted-foreground">{profile.description}</p>}
                <div className="mt-2 flex gap-2">{roles?.includes("partner") && <Badge className="bg-partner text-background">Partner</Badge>}{roles?.includes("admin") && <Badge variant="secondary">Administrador</Badge>}{roles?.includes("moderator") && <Badge variant="secondary">Moderador</Badge>}</div>
              </div>
              <div className="flex gap-2"><Button onClick={() => void toggleSub()} variant={isSubscribed ? "secondary" : "default"} className="rounded-full cn-modern-channel-button">{isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button onClick={openReport} variant="outline" className="rounded-full"> <Flag className="mr-2 h-4 w-4" />Denunciar</Button></div>
            </div>
            <Tabs defaultValue="videos" className="mt-6">
              <TabsList className="cn-modern-channel-tabs">
                <TabsTrigger value="videos">Videos</TabsTrigger>
                <TabsTrigger value="community">Comunidad</TabsTrigger>
                <TabsTrigger value="about">Información</TabsTrigger>
              </TabsList>
              <TabsContent value="videos" className="pt-6">{channelVideos.length > 0 ? <div className="grid grid-cols-1 gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{channelVideos.map((v) => <VideoCard key={v.id} video={v} />)}</div> : <p className="py-12 text-center text-muted-foreground">Este canal todavía no tiene videos.</p>}</TabsContent>
              <TabsContent value="community" className="pt-6"><CommunityFeed channelId={profile.id} /></TabsContent>
              <TabsContent value="about" className="pt-6"><div className="max-w-2xl rounded-xl border p-5 text-sm" style={{ background: profile.channel_surface_color ?? "var(--surface)", color: profile.channel_text_color ?? "inherit", borderColor: profile.channel_secondary_color ?? "currentColor" }}><p className="whitespace-pre-wrap">{profile.description || "Este canal aún no escribió una descripción."}</p><p className="mt-4 opacity-70">En CoreNetwork desde {new Date(profile.created_at).toLocaleDateString("es")}</p></div></TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <ReportDialog target={{ type: "channel", id: profile.id, name: profile.display_name || profile.username }} open={reportOpen} onOpenChange={setReportOpen} />
    </AppShell>
  );
}
