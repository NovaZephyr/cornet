import { Flag, Film, LayoutGrid, MessageSquare, Newspaper, Star, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ChannelAvatar, SignedImage } from "@/components/Media";
import { VideoCard } from "@/components/VideoCard";
import { CommunityFeed } from "@/components/CommunityFeed";
import { ChannelDistinctions } from "@/components/ChannelDistinctions";
import { useSignedUrl } from "@/lib/storage";
import { formatDuration, formatViews, timeAgo } from "@/lib/format";
import type { ChannelLayoutProps } from "./channel-data";

function Identity({ data, size = 72 }: { data: ChannelLayoutProps["data"]; size?: number }) {
  return <div className="flex min-w-0 items-center gap-3"><ChannelAvatar path={data.profile.avatar_path} name={data.profile.display_name || data.profile.username} size={size}/><div className="min-w-0"><h1 className="truncate text-xl font-bold leading-tight text-[#111]">{data.profile.display_name || data.profile.username}<ChannelDistinctions className="ml-2 inline-flex align-middle" isVerified={data.profile.is_verified} isMusic={data.profile.is_music_channel} roles={data.roles}/></h1><p className="text-xs text-[#666]">@{data.profile.username}</p></div></div>;
}

function Actions({ data, onSubscribe, onReport }: ChannelLayoutProps) {
  return <div className="flex flex-wrap items-center gap-1.5"><Button size="sm" onClick={onSubscribe} className="h-7 rounded-sm border border-[#b30000] bg-gradient-to-b from-[#ef3b3b] to-[#c40000] px-3 text-xs font-bold text-white shadow-[inset_0_1px_rgba(255,255,255,.35)] hover:from-[#f24a4a] hover:to-[#b40000]">{data.isSubscribed ? "Suscrito" : "Suscribirse"}</Button><Button size="sm" variant="outline" onClick={onReport} className="h-7 rounded-sm border-[#bbb] bg-gradient-to-b from-white to-[#e8e8e8] px-2 text-xs text-[#444] shadow-none"><Flag className="mr-1 h-3 w-3"/>Denunciar</Button></div>;
}

function FeaturedPlayer({ video }: { video: NonNullable<ChannelLayoutProps["data"]["videos"]>[number] }) {
  const videoUrl = useSignedUrl(video.video_path);
  const posterUrl = useSignedUrl(video.thumbnail_path);
  if (!videoUrl) return video.thumbnail_path ? <SignedImage path={video.thumbnail_path} alt={video.title} className="h-full w-full object-cover"/> : <div className="flex h-full w-full items-center justify-center bg-[#222] text-xs text-white/70">Sin vídeo destacado</div>;
  return <video className="h-full w-full bg-black object-contain" controls playsInline preload="metadata" poster={posterUrl ?? undefined} src={videoUrl} autoPlay muted/>;
}

function ClassicVideoItem({ video }: { video: NonNullable<ChannelLayoutProps["data"]["videos"]>[number] }) {
  return <article className="group grid min-w-0 grid-cols-[120px_minmax(0,1fr)] gap-2 border-b border-[#ddd] py-2"><Link to="/watch" search={{v: video.code}} className="relative block aspect-video overflow-hidden border border-[#bbb] bg-[#eee]">{video.thumbnail_path ? <SignedImage path={video.thumbnail_path} alt={video.title} className="h-full w-full object-cover"/> : <div className="h-full w-full bg-[#ddd]"/>}<span className="absolute bottom-0 right-0 bg-black/80 px-1 text-[10px] text-white">{formatDuration(video.duration_seconds)}</span></Link><div className="min-w-0 text-xs leading-4"><Link to="/watch" search={{v: video.code}} className="font-bold text-[#0645ad] hover:underline">{video.title}</Link><p className="mt-1 text-[#666]">{formatViews(video.views)} views · {timeAgo(video.created_at)}</p>{video.description && <p className="mt-1 line-clamp-2 text-[#444]">{video.description}</p>}</div></article>;
}

function InfoBox({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="border border-[#bbb] bg-white shadow-[0_1px_1px_rgba(0,0,0,.06)]"><h2 className="border-b border-[#c8c8c8] bg-gradient-to-b from-[#f8f8f8] to-[#e6e6e6] px-2 py-1 text-xs font-bold text-[#333]">{title}</h2><div className="p-2 text-[11px] leading-4 text-[#444]">{children}</div></section>;
}

export function Classic2009Layout({ data, onSubscribe, onReport }: ChannelLayoutProps) {
  const hero = data.videos[0];
  const visibleVideos = data.videos.slice(0, 9);
  const bannerUrl = useSignedUrl(data.profile.banner_path);
  const partnerBackground = data.isPartnerChannel ? data.background : null;
  const backgroundStyle = partnerBackground ? { backgroundImage: `url(${partnerBackground})`, backgroundAttachment: "fixed" as const, backgroundPosition: "top center", backgroundRepeat: "repeat" as const } : undefined;

  return <div className="min-h-[900px] bg-[#c7c7c7] px-2 py-3 font-[Arial,Helvetica,sans-serif] text-[#222]" style={backgroundStyle}>
    <div className="mx-auto w-full max-w-[980px] overflow-hidden border border-[#999] bg-white shadow-[0_1px_4px_rgba(0,0,0,.28)]">
      <header className="border-b border-[#aaa] bg-gradient-to-b from-[#fff] via-[#f6f6f6] to-[#ddd]">
        <div className="flex min-h-[48px] items-center justify-between gap-4 px-3 py-2"><div className="flex items-center gap-2"><div className="text-[27px] font-bold leading-none tracking-[-2px] text-[#c00]">YouTube</div><span className="border-l border-[#ccc] pl-2 text-[10px] text-[#777]">Channel</span></div><div className="hidden items-center gap-3 text-[10px] text-[#0645ad] sm:flex"><span>Videos</span><span>Categories</span><span>Channels</span><span>Community</span><span>Upload</span></div><div className="hidden h-6 max-w-[210px] flex-1 border border-[#aaa] bg-white sm:block"><div className="px-2 py-1 text-[10px] text-[#999]">Search</div></div></div>
        <div className="flex items-center justify-between border-t border-[#ddd] bg-[#f0f0f0] px-3 py-1 text-[10px] text-[#0645ad]"><div className="flex gap-3"><span>Home</span><span>Videos</span><span>Channels</span><span>Favorites</span></div><div className="hidden gap-3 sm:flex"><span>My Account</span><span>Help</span><span>Log In</span></div></div>
      </header>

      {bannerUrl ? <div className="border-b border-[#999] bg-[#ddd] p-1"><img src={bannerUrl} alt="Channel banner" className="block h-auto max-h-[180px] w-full object-cover"/></div> : <div className="h-[72px] border-b border-[#999] bg-gradient-to-b from-[#ededed] to-[#cfcfcf]"/>}

      <div className="grid grid-cols-1 gap-2 bg-[#e9e9e9] p-2 md:grid-cols-[190px_minmax(0,1fr)]">
        <aside className="space-y-2">
          <InfoBox title={`${data.profile.username} Channel`}><div className="mb-2 flex justify-center"><ChannelAvatar path={data.profile.avatar_path} name={data.profile.display_name || data.profile.username} size={96}/></div><div className="mb-2 flex justify-center"><Actions data={data} onSubscribe={onSubscribe} onReport={onReport}/></div><dl className="space-y-0.5"><div className="flex justify-between gap-2"><dt>Videos</dt><dd className="font-bold">{data.videos.length}</dd></div><div className="flex justify-between gap-2"><dt>Subscribers</dt><dd className="font-bold">{data.profile.subscriber_count ?? data.subscriptions.length}</dd></div><div className="flex justify-between gap-2"><dt>Views</dt><dd className="font-bold">{formatViews(data.videos.reduce((sum, video) => sum + video.views, 0))}</dd></div></dl><p className="mt-2 border-t border-[#ddd] pt-2">Joined {new Date(data.profile.created_at).toLocaleDateString()}</p></InfoBox>
          <InfoBox title="About this user"><p>{data.profile.description || "No description."}</p>{data.profile.social_links?.length ? <div className="mt-2 border-t border-[#ddd] pt-2"><p className="font-bold">Website / Links</p>{data.profile.social_links.slice(0,5).map(link => <a key={link.url} href={link.url} target="_blank" rel="noreferrer" className="block truncate text-[#0645ad] hover:underline">{link.platform}</a>)}</div> : null}</InfoBox>
          <InfoBox title={`Connect with ${data.profile.username}`}><div className="space-y-1 text-[#0645ad]"><div className="flex items-center gap-1"><MessageSquare className="h-3 w-3"/>Send Message</div><div className="flex items-center gap-1"><Users className="h-3 w-3"/>Add as Friend</div><div className="flex items-center gap-1"><Star className="h-3 w-3"/>Add as Favorite</div></div></InfoBox>
        </aside>

        <main className="min-w-0 space-y-2">
          {hero && <section className="border border-[#aaa] bg-white"><div className="border-b border-[#c8c8c8] bg-gradient-to-b from-[#f7f7f7] to-[#e3e3e3] px-2 py-1 text-xs font-bold text-[#333]">Featured Video</div><div className="grid grid-cols-1 gap-2 p-2 lg:grid-cols-[minmax(0,1fr)_220px]"><div className="aspect-video min-h-0 overflow-hidden border border-[#333] bg-black"><FeaturedPlayer video={hero}/></div><div className="min-w-0 text-xs"><Link to="/watch" search={{v: hero.code}} className="text-base font-bold text-[#0645ad] hover:underline">{hero.title}</Link><p className="mt-1 text-[#666]">{formatViews(hero.views)} views · {timeAgo(hero.created_at)}</p>{hero.description && <p className="mt-2 line-clamp-7 leading-4 text-[#444]">{hero.description}</p>}<Link to="/watch" search={{v: hero.code}} className="mt-3 inline-flex items-center text-[#0645ad] hover:underline"><Film className="mr-1 h-3.5 w-3.5"/>Watch this video</Link></div></div></section>}
          <section className="border border-[#aaa] bg-white"><div className="flex items-center justify-between border-b border-[#c8c8c8] bg-gradient-to-b from-[#f7f7f7] to-[#e3e3e3] px-2 py-1"><h2 className="text-xs font-bold text-[#333]">Videos ({data.videos.length})</h2><span className="text-[10px] text-[#777]">Uploads</span></div><div className="grid grid-cols-1 gap-x-3 px-2 md:grid-cols-2">{visibleVideos.map(video => <ClassicVideoItem key={video.id} video={video}/>)}</div>{!visibleVideos.length && <p className="p-4 text-xs text-[#777]">This channel has no videos.</p>}</section>
          <section className="border border-[#aaa] bg-white"><div className="flex items-center justify-between border-b border-[#c8c8c8] bg-gradient-to-b from-[#f7f7f7] to-[#e3e3e3] px-2 py-1"><h2 className="text-xs font-bold text-[#333]">Favorites (0)</h2><LayoutGrid className="h-3.5 w-3.5 text-[#777]"/></div><div className="flex min-h-[72px] items-center justify-center px-2 py-3 text-[11px] text-[#777]">No favorites to display.</div></section>
          <section className="border border-[#aaa] bg-white"><div className="border-b border-[#c8c8c8] bg-gradient-to-b from-[#f7f7f7] to-[#e3e3e3] px-2 py-1 text-xs font-bold text-[#333]">Channel information</div><div className="grid grid-cols-1 gap-3 p-2 text-[11px] text-[#444] sm:grid-cols-2"><div><span className="font-bold">Display Name:</span> {data.profile.display_name || data.profile.username}</div><div><span className="font-bold">Username:</span> @{data.profile.username}</div><div><span className="font-bold">Videos:</span> {data.videos.length}</div><div><span className="font-bold">Subscribers:</span> {data.profile.subscriber_count ?? data.subscriptions.length}</div></div></section>
        </main>
      </div>
      <footer className="border-t border-[#aaa] bg-[#eee] px-3 py-3 text-[10px] text-[#666]"><span className="font-bold text-[#c00]">YouTube</span> · Channel 1.0 · Cornet</footer>
    </div>
  </div>;
}

export function Standard2012Layout({ data, onSubscribe, onReport }: ChannelLayoutProps) { const hero=data.videos[0]; return <div className="cn-extra-layout cn-extra-standard2012"><header><Identity data={data}/><Actions data={data} onSubscribe={onSubscribe} onReport={onReport}/></header><nav><span className="active">CHANNEL</span><span>VIDEOS</span><span>PLAYLISTS</span><span>ABOUT</span></nav><section className="cn-extra-standard-main"><aside><h2>Channel</h2><p>{data.profile.description || "This channel has no description."}</p><a href="#videos">Uploads</a><a href="#community">Community</a></aside><div><div className="cn-extra-standard-feature">{hero && <VideoCard video={hero} compact/>}<div><h2>{hero?.title || "Featured video"}</h2><p>{hero?.description || ""}</p></div></div><div id="videos" className="cn-extra-standard-grid">{data.videos.slice(1).map(v=><VideoCard key={v.id} video={v}/>)}</div></div></section></div>; }

export function MagazineLayout({ data, onSubscribe, onReport }: ChannelLayoutProps) { const hero=data.videos[0]; return <div className="cn-extra-layout cn-extra-magazine"><header><div><p className="cn-extra-kicker">CORNET CHANNEL</p><Identity data={data} size={58}/></div><Actions data={data} onSubscribe={onSubscribe} onReport={onReport}/></header>{hero && <article className="cn-extra-magazine-hero"><SignedImage path={hero.thumbnail_path} alt={hero.title} className="aspect-[16/8] w-full object-cover"/><div><p className="cn-extra-kicker">FEATURED</p><h2>{hero.title}</h2><p>{hero.description || ""}</p><a href={`/watch?v=${hero.code}`}>Ver / leer →</a></div></article>}<div className="cn-extra-magazine-columns"><main><h2><Newspaper className="inline h-4 w-4"/> Últimos vídeos</h2>{data.videos.slice(1,9).map(v=><article key={v.id}><VideoCard video={v}/><h3>{v.title}</h3><p>{v.description || ""}</p></article>)}</main><aside><h2>Sobre el canal</h2><p>{data.profile.description || "Sin descripción."}</p><h2>Comunidad</h2><CommunityFeed channelId={data.profile.id}/></aside></div></div>; }

export function CinephileLayout({ data, onSubscribe, onReport }: ChannelLayoutProps) { const hero=data.videos[0]; return <div className="cn-extra-layout cn-extra-cinephile"><header><div><p className="cn-extra-kicker">CINEMA</p><Identity data={data} size={64}/></div><Actions data={data} onSubscribe={onSubscribe} onReport={onReport}/></header>{hero && <section className="cn-extra-cinema-hero"><div className="cn-extra-cinema-poster"><SignedImage path={hero.thumbnail_path} alt={hero.title} className="h-full w-full object-cover"/></div><div><p className="cn-extra-kicker">NOW SHOWING</p><h2>{hero.title}</h2><p>{hero.description || ""}</p><a href={`/watch?v=${hero.code}`}><Film className="mr-1 inline h-4 w-4"/> Reproducir</a></div></section>}<section className="cn-extra-cinema-shelf"><h2>Filmografía del canal</h2><div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">{data.videos.slice(1).map(v=><VideoCard key={v.id} video={v}/>)}</div></section></div>; }
