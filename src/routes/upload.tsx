import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, CheckCircle2, DollarSign, Edit3, Eye, FileVideo, FolderOpen, HelpCircle, Languages, LayoutDashboard, ListVideo, MoreVertical, Music2, Palette, PlaySquare, Plus, Radio, Search, Settings, ShieldCheck, Trash2, UploadCloud, Users, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { untypedDb } from "@/lib/untyped-db";
import { AppShell } from "@/components/AppShell";
import { CommunityFeed } from "@/components/CommunityFeed";
import { CommunityStorage } from "@/components/CommunityStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile, useSignedUrl } from "@/lib/storage";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { generateVideoCode } from "@/lib/videoCode";
import { formatTimestamp, normalizeCaptionText, type ChapterDraft, validateChapterDrafts } from "@/lib/captions";
import { extractHashtags, syncVideoHashtags } from "@/lib/hashtags";
import { formatViews, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/upload")({
  head: () => ({ meta: [{ title: "Cornet Studio" }] }),
  validateSearch: (search: Record<string, unknown>): { edit?: string; create?: boolean } => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
    create: search.create === "1" || search.create === true,
  }),
  component: UploadPage,
});

type CaptionDraft = { id: string; file: File; language: string; label: string; isDefault: boolean };
type VideoRow = { id: string; code: string; title: string; description: string; video_path: string; thumbnail_path: string | null; duration_seconds: number; views: number; visibility: string; category: string; created_at: string };

const CATEGORIES = ["Autos & Vehicles", "Comedy", "Entertainment", "Film & Animation", "Gaming", "Howto & Style", "Nonprofits & Activism", "People & Blogs", "Pets & Animals", "Science & Technology", "Sports", "Travel & Events", "Education", "Music"] as const;

function Thumbnail({ path, alt }: { path: string | null; alt: string }) {
  const url = useSignedUrl(path);
  return url ? <img src={url} alt={alt} className="aspect-video w-full rounded-xl object-cover" /> : <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-muted-foreground"><Video className="h-8 w-8" /></div>;
}

function StatCard({ label, value, hint, icon: Icon }: { label: string; value: string; hint: string; icon: typeof Video }) {
  return <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{label}</span><Icon className="h-4 w-4 text-primary" /></div><p className="mt-3 text-2xl font-bold tracking-tight">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{hint}</p></div>;
}

function Dashboard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [section, setSection] = useState("panel");
  const [contentTab, setContentTab] = useState("videos");
  const [search, setSearch] = useState("");

  const { data: videos, isLoading } = useQuery({
    queryKey: ["my-videos", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("videos").select("id,code,title,description,video_path,thumbnail_path,duration_seconds,views,visibility,category,created_at").eq("user_id", userId).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as VideoRow[];
    },
  });
  const { data: profile } = useQuery({ queryKey: ["studio-profile", userId], queryFn: async () => { const { data, error } = await supabase.from("profiles").select("subscriber_count,display_name,username").eq("id", userId).maybeSingle(); if (error) throw error; return data; } });
  const { data: likes } = useQuery({ queryKey: ["studio-likes", userId], queryFn: async () => { const { data, error } = await untypedDb.rpc("video_like_totals", { p_video_ids: (videos ?? []).map((v) => v.id) }); if (error) return []; return (data ?? []) as { video_id: string; likes: number }[]; }, enabled: !!videos?.length });
  const totalViews = (videos ?? []).reduce((sum, video) => sum + Number(video.views ?? 0), 0);
  const publicVideos = (videos ?? []).filter((video) => video.visibility === "public").length;
  const averageViews = videos?.length ? Math.round(totalViews / videos.length) : 0;
  const topVideo = [...(videos ?? [])].sort((a, b) => b.views - a.views)[0];
  const likeTotal = (likes ?? []).reduce((sum, row) => sum + Number(row.likes ?? 0), 0);
  const filteredVideos = useMemo(() => (videos ?? []).filter((video) => !search.trim() || video.title.toLowerCase().includes(search.trim().toLowerCase())), [videos, search]);
  const removeVideo = async (video: VideoRow) => {
    if (!window.confirm("¿Eliminar “" + video.title + "”? Esta acción no se puede deshacer.")) return;
    const { error } = await supabase.from("videos").delete().eq("id", video.id).eq("user_id", userId);
    if (error) return void toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["my-videos", userId] });
    toast.success("Video eliminado");
  };

  const sidebarItems = [
    { key: "panel", label: "Panel", icon: LayoutDashboard },
    { key: "content", label: "Contenido", icon: PlaySquare },
    { key: "analytics", label: "Analíticas", icon: BarChart3 },
    { key: "community", label: "Comunidad", icon: Users },
    { key: "languages", label: "Idiomas", icon: Languages },
    { key: "monetization", label: "Monetización", icon: DollarSign },
    { key: "personalization", label: "Personalización", icon: Palette },
    { key: "copyright", label: "Derechos de autor", icon: ShieldCheck },
    { key: "audio", label: "Biblioteca de audio", icon: Music2 },
    { key: "settings", label: "Configuración", icon: Settings },
    { key: "help", label: "Ayuda y comentarios", icon: HelpCircle },
  ];
  const contentItems = [
    { key: "videos", label: "Videos", icon: Video },
    { key: "shorts", label: "Cuadrados", icon: PlaySquare },
    { key: "live", label: "En vivo", icon: Radio },
    { key: "posts", label: "Posts", icon: Users },
    { key: "playlists", label: "Playlists", icon: ListVideo },
    { key: "series", label: "Series", icon: FileVideo },
    { key: "files", label: "Archivos", icon: FolderOpen },
    { key: "podcasts", label: "Podcasts", icon: Music2 },
  ];
  const navButton = (item: typeof sidebarItems[number]) => {
    const Icon = item.icon;
    return <button key={item.key} type="button" onClick={() => setSection(item.key)} className={"flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-sm transition " + (section === item.key ? "bg-[#2b201e] text-white" : "text-white/75 hover:bg-[#211a19] hover:text-white")}><Icon className="h-4 w-4 text-[#ff604d]" /><span>{item.label}</span></button>;
  };

  return <div className="flex min-h-[calc(100vh-60px)] w-full">
    <aside className="hidden w-64 shrink-0 border-r border-[#38201b] bg-[#0c0b0b] p-3 md:block">
      <div className="mb-4 flex items-center gap-2 border-b border-[#38201b] px-1 pb-4">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f04438] text-white"><PlaySquare className="h-4 w-4" /></span>
        <span className="flex-1 text-xs font-bold tracking-wide">CORNET STUDIO</span>
        <button type="button" onClick={() => void navigate({ to: "/" })} className="rounded p-1 text-white/60 hover:text-white" aria-label="Regresar a Cornet"><X className="h-4 w-4" /></button>
      </div>
      <p className="mb-2 px-1 text-[9px] font-semibold uppercase tracking-widest text-white/45">Navegación</p>
      <nav className="grid gap-1.5">{sidebarItems.map(navButton)}</nav>
      <Link to="/" className="mt-2 flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm text-white/75 hover:bg-[#211a19]"><ArrowLeft className="h-4 w-4" />Regresar a Cornet</Link>
    </aside>
    <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">
      <nav className="mb-4 flex gap-1 overflow-x-auto pb-1 md:hidden" aria-label="Navegación de Cornet Studio">{sidebarItems.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => setSection(key)} title={label} className={"flex shrink-0 items-center gap-2 rounded-full px-3 py-2 text-xs " + (section === key ? "bg-[#2b201e] text-white" : "bg-muted text-muted-foreground")}><Icon className="h-4 w-4 text-[#ff604d]"/><span>{label}</span></button>)}</nav>
      {section === "panel" && <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Cornet Studio</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Panel del canal</h1><p className="mt-1 text-sm text-muted-foreground">Un resumen de lo que ocurre en tu canal.</p></div><Button className="rounded-full" onClick={() => void navigate({ to: "/upload", search: { create: true } })}><Plus className="mr-2 h-4 w-4" />Crear</Button></div>
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <section className="rounded-2xl border border-border bg-surface p-5"><h2 className="mb-4 font-semibold">Rendimiento del video más reciente</h2>{topVideo ? <div className="grid gap-4 sm:grid-cols-[minmax(180px,.8fr)_1.2fr]"><div><Thumbnail path={topVideo.thumbnail_path} alt={topVideo.title}/><p className="mt-2 truncate text-sm font-medium">{topVideo.title}</p><p className="text-xs text-muted-foreground">{formatViews(topVideo.views)} vistas · {timeAgo(topVideo.created_at)}</p></div><div className="grid grid-cols-2 gap-3"><StatCard label="Vistas totales" value={totalViews.toLocaleString("es-ES")} hint="en tus videos" icon={Eye}/><StatCard label="Me gusta" value={likeTotal.toLocaleString("es-ES")} hint="en tu contenido" icon={CheckCircle2}/><StatCard label="Suscriptores" value={Number(profile?.subscriber_count ?? 0).toLocaleString("es-ES")} hint="audiencia actual" icon={Users}/><StatCard label="Videos públicos" value={String(publicVideos)} hint={"de " + (videos ?? []).length + " videos"} icon={Video}/></div></div> : <div className="rounded-xl border border-dashed border-border p-10 text-center"><Video className="mx-auto mb-3 h-8 w-8 text-muted-foreground"/><p className="font-medium">Aún no tienes videos</p><Button className="mt-4" onClick={() => void navigate({ to: "/upload", search: { create: true } })}>Subir tu primer video</Button></div>}</section>
          <section className="rounded-2xl border border-border bg-surface p-5"><h2 className="font-semibold">Estadísticas del canal</h2><p className="mt-1 text-xs text-muted-foreground">Resumen de tu actividad en Cornet.</p><div className="mt-5 space-y-4"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Suscriptores actuales</span><strong>{Number(profile?.subscriber_count ?? 0).toLocaleString("es-ES")}</strong></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Videos publicados</span><strong>{videos?.length ?? 0}</strong></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Promedio de vistas</span><strong>{averageViews.toLocaleString("es-ES")}</strong></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Me gusta recibidos</span><strong>{likeTotal.toLocaleString("es-ES")}</strong></div><Button variant="secondary" className="w-full" onClick={() => setSection("analytics")}>Ver analíticas</Button></div></section>
        </div>
      </div>}

      {section === "content" && <div className="mx-auto max-w-7xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">Contenido del canal</h1><p className="mt-1 text-sm text-muted-foreground">Administra lo que publicas en Cornet.</p></div><Button onClick={() => void navigate({ to: "/upload", search: { create: true } })}><Plus className="mr-2 h-4 w-4"/>Crear</Button></div>
        <div className="flex flex-wrap gap-2 rounded-2xl bg-muted/60 p-2">{contentItems.map(({key,label,icon:Icon})=><button key={key} type="button" onClick={()=>setContentTab(key)} className={"inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium transition " + (contentTab===key?"bg-background text-foreground shadow-sm":"text-muted-foreground hover:text-foreground")}><Icon className="h-3.5 w-3.5"/>{label}</button>)}</div>
        {contentTab === "videos" && <section className="rounded-2xl border border-border bg-surface p-5"><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Tus videos</h2><p className="text-xs text-muted-foreground">Edita, revisa o elimina publicaciones.</p></div><Input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Buscar video…" className="max-w-xs"/></div>{isLoading?<p className="py-10 text-center text-sm text-muted-foreground">Cargando…</p>:filteredVideos.length?<div className="space-y-3">{filteredVideos.map(video=><div key={video.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border/70 p-3"><div className="w-32 shrink-0"><Thumbnail path={video.thumbnail_path} alt={video.title}/></div><div className="min-w-0 flex-1"><p className="truncate font-semibold">{video.title}</p><p className="mt-1 text-xs text-muted-foreground">{formatViews(video.views)} vistas · {timeAgo(video.created_at)} · {video.visibility==="public"?"Público":"Privado"}</p></div><Button variant="ghost" size="icon" asChild><Link to="/watch" search={{v:video.code}} aria-label="Ver video"><Eye className="h-4 w-4"/></Link></Button><Button variant="ghost" size="icon" onClick={()=>void navigate({to:"/upload",search:{edit:video.code}})} aria-label="Editar video"><Edit3 className="h-4 w-4"/></Button><Button variant="ghost" size="icon" onClick={()=>void removeVideo(video)} aria-label="Eliminar video"><Trash2 className="h-4 w-4"/></Button></div>)}</div>:<p className="py-10 text-center text-sm text-muted-foreground">No hay videos que coincidan.</p>}</section>}
        {contentTab === "posts" && <section className="rounded-2xl border border-border bg-surface p-4 sm:p-6"><h2 className="mb-4 font-semibold">Publicaciones de comunidad</h2><CommunityFeed channelId={userId}/></section>}
        {contentTab === "files" && <CommunityStorage/>}
        {contentTab === "live" && <section className="rounded-2xl border border-border bg-surface p-6"><Radio className="mb-3 h-8 w-8 text-primary"/><h2 className="text-xl font-semibold">Transmite en vivo</h2><p className="mt-2 max-w-xl text-sm text-muted-foreground">Prepara tu emisión, administra tu clave de OBS y consulta tus transmisiones desde el estudio en vivo de Cornet.</p><Button className="mt-5" asChild><Link to="/live">Abrir estudio de transmisión</Link></Button></section>}
        {contentTab === "shorts" && <section className="rounded-2xl border border-border bg-surface p-6"><h2 className="font-semibold">Cuadrados</h2><p className="mt-2 text-sm text-muted-foreground">Explora y administra tus videos cortos.</p><Button asChild className="mt-4" variant="secondary"><Link to="/shorts">Abrir Cuadrados</Link></Button></section>}
        {contentTab === "playlists" && <section className="rounded-2xl border border-border bg-surface p-6"><h2 className="font-semibold">Playlists</h2><p className="mt-2 text-sm text-muted-foreground">Organiza videos del canal en listas.</p><Button asChild className="mt-4" variant="secondary"><Link to="/playlists">Abrir playlists</Link></Button></section>}
        {contentTab === "series" && <section className="rounded-2xl border border-border bg-surface p-6"><h2 className="font-semibold">Series</h2><p className="mt-2 text-sm text-muted-foreground">Administra tus series publicadas.</p><Button asChild className="mt-4" variant="secondary"><Link to="/series">Abrir series</Link></Button></section>}
        {contentTab === "podcasts" && <section className="rounded-2xl border border-border bg-surface p-6"><h2 className="font-semibold">Podcasts</h2><p className="mt-2 text-sm text-muted-foreground">La publicación de podcasts estará disponible próximamente.</p></section>}
      </div>}

      {section === "analytics" && <div className="mx-auto max-w-7xl space-y-5"><div><h1 className="text-2xl font-bold">Analíticas del canal</h1><p className="mt-1 text-sm text-muted-foreground">Consulta el rendimiento general de tu contenido.</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard label="Suscriptores" value={Number(profile?.subscriber_count ?? 0).toLocaleString("es-ES")} hint="audiencia actual" icon={Users}/><StatCard label="Vistas totales" value={totalViews.toLocaleString("es-ES")} hint="en tus videos" icon={Eye}/><StatCard label="Videos públicos" value={String(publicVideos)} hint="visibles para todos" icon={Video}/><StatCard label="Me gusta" value={likeTotal.toLocaleString("es-ES")} hint="en todos tus videos" icon={CheckCircle2}/></div><section className="rounded-2xl border border-border bg-surface p-5"><h2 className="font-semibold">Videos destacados</h2><div className="mt-4 space-y-3">{[...(videos??[])].sort((a,b)=>b.views-a.views).slice(0,5).map((video,index)=><div key={video.id} className="flex items-center gap-3"><span className="w-6 text-sm text-muted-foreground">{index+1}</span><div className="w-28"><Thumbnail path={video.thumbnail_path} alt={video.title}/></div><p className="min-w-0 flex-1 truncate text-sm font-medium">{video.title}</p><strong className="text-sm">{formatViews(video.views)}</strong></div>)}</div></section></div>}

      {section === "community" && <div className="mx-auto max-w-5xl space-y-4"><div><h1 className="text-2xl font-bold">Comunidad</h1><p className="mt-1 text-sm text-muted-foreground">Publica actualizaciones para quienes siguen tu canal.</p></div><div className="rounded-2xl border border-border bg-surface p-4 sm:p-6"><CommunityFeed channelId={userId}/></div></div>}
      {!["panel","content","analytics","community"].includes(section) && <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-surface p-6 sm:p-10"><p className="text-xs font-semibold uppercase tracking-widest text-primary">Cornet Studio</p><h1 className="mt-2 text-2xl font-bold">{sidebarItems.find(item=>item.key===section)?.label}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Esta sección forma parte de la navegación de Studio. Las herramientas de este apartado todavía no están disponibles.</p><Button className="mt-5" variant="secondary" onClick={()=>setSection("panel")}>Volver al panel</Button></div>}
    </main>
  </div>;
}

function Editor({ userId, code }: { userId: string; code?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!code;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [category, setCategory] = useState<string>("Entertainment");
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [existingVideoPath, setExistingVideoPath] = useState<string | null>(null);
  const [existingThumbPath, setExistingThumbPath] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [captions, setCaptions] = useState<CaptionDraft[]>([]);
  const [chapters, setChapters] = useState<ChapterDraft[]>([]);
  const [busy, setBusy] = useState(false);

  const existingQuery = useQuery({ queryKey: ["edit-video", code, userId], enabled: isEdit, queryFn: async () => { const { data, error } = await supabase.from("videos").select("id,code,title,description,video_path,thumbnail_path,duration_seconds,views,visibility,category").eq("code", code!).eq("user_id", userId).maybeSingle(); if (error) throw error; return data as (VideoRow & { id: string }) | null; } });
  useEffect(() => { if (!existingQuery.data) return; const v = existingQuery.data; setTitle(v.title); setDescription(v.description); setVisibility(v.visibility); setCategory(v.category || "Entertainment"); setDuration(v.duration_seconds); setExistingVideoPath(v.video_path); setExistingThumbPath(v.thumbnail_path); void Promise.all([supabase.from("video_captions").select("id,language_code,label,caption_path,is_default").eq("video_id",v.id).order("created_at"),supabase.from("video_chapters").select("id,title,start_seconds,end_seconds,sort_order").eq("video_id",v.id).order("sort_order").order("start_seconds")]).then(([captionsResult,chaptersResult])=>{setCaptions(((captionsResult.data??[]) as Array<{id:string;language_code:string;label:string;caption_path:string;is_default:boolean}>).map(c=>({id:c.id,file:new File([""],`${c.label}.vtt`,{type:"text/vtt"}),language:c.language_code,label:c.label,isDefault:c.is_default})));setChapters(((chaptersResult.data??[]) as Array<{id:string;title:string;start_seconds:number;end_seconds:number|null}>).map(c=>({title:c.title,startSeconds:c.start_seconds,endSeconds:c.end_seconds})) as ChapterDraft[]);}); }, [existingQuery.data]);

  const readDuration = (file: File) => new Promise<number>((resolve) => { const el = document.createElement("video"); el.preload = "metadata"; const url = URL.createObjectURL(file); el.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number.isFinite(el.duration) ? Math.round(el.duration) : 0); }; el.onerror = () => { URL.revokeObjectURL(url); resolve(0); }; el.src = url; });
  const selectVideo = async (file: File | null) => { if (!file) { setVideo(null); return; } if (!file.type.startsWith("video/")) { toast.error("Solo se admiten archivos de vídeo."); return; } setVideo(file); setDuration(await readDuration(file)); if (!chapters.length) setChapters([{ title: "Introducción", startSeconds: 0, endSeconds: null }]); };
  const onCaptionFiles = (files: FileList | null) => { if (!files) return; const accepted = [...files].filter((file) => /\.(vtt|srt)$/i.test(file.name)); setCaptions((prev) => [...prev,...accepted.map(file=>({id:crypto.randomUUID(),file,language:"es",label:file.name.replace(/\.(srt|vtt)$/i,""),isDefault:false}))]); };
  const addChapter = () => setChapters((prev) => [...prev,{title:"Nuevo capítulo",startSeconds:prev.length?prev[prev.length-1].startSeconds+60:0,endSeconds:null}]);
  const save = async (e: React.FormEvent) => { e.preventDefault(); if (!isEdit && !video) return void toast.error("Selecciona un archivo de video"); if (video && !video.type.startsWith("video/")) return void toast.error("El archivo seleccionado no es un vídeo válido."); const chapterError=validateChapterDrafts(chapters); if(chapterError)return void toast.error(chapterError); setBusy(true); try { let videoPath=existingVideoPath; let thumbPath=existingThumbPath; if(video) videoPath=await uploadToCloudinary(video,userId,"video"); if(thumb && !thumb.type.startsWith("image/")) throw new Error("La miniatura no es válida."); if(thumb) thumbPath=await uploadToCloudinary(thumb,userId,"image"); let videoId:string; let finalCode=code??generateVideoCode(); if(isEdit&&existingQuery.data){videoId=existingQuery.data.id; const {error}=await supabase.from("videos").update({title:title.trim(),description:description.trim(),visibility,category,video_path:videoPath??undefined,thumbnail_path:thumbPath??undefined,duration_seconds:duration}).eq("id",videoId).eq("user_id",userId); if(error)throw error;}else{let inserted:{id:string;code:string}|null=null; for(let attempt=0;attempt<3&&!inserted;attempt+=1){const {data,error}=await supabase.from("videos").insert({user_id:userId,code:finalCode,title:title.trim(),description:description.trim(),visibility,category,video_path:videoPath??"",thumbnail_path:thumbPath??null,duration_seconds:duration}).select("id,code").single(); if(!error)inserted=data; else if((error as {code?:string}).code==="23505")finalCode=generateVideoCode();else throw error;} if(!inserted)throw new Error("No se pudo crear el video"); videoId=inserted.id;}
      await syncVideoHashtags(videoId,`${title}\n${description}`); await supabase.from("video_captions").delete().eq("video_id",videoId); for(const caption of captions.filter(c=>c.file.size>0)){const normalized=normalizeCaptionText(await caption.file.text(),caption.file.name);const path=await uploadFile("media",userId,new File([normalized],`${caption.file.name.replace(/\.(srt|vtt)$/i,"")}.vtt`,{type:"text/vtt"}),"captions-");const {error}=await supabase.from("video_captions").insert({video_id:videoId,user_id:userId,language_code:caption.language.slice(0,8).toLowerCase(),label:caption.label||caption.language,caption_path:path,is_default:caption.isDefault});if(error)throw error;} await supabase.from("video_chapters").delete().eq("video_id",videoId); if(chapters.length){const sorted=[...chapters].sort((a,b)=>a.startSeconds-b.startSeconds);const {error}=await supabase.from("video_chapters").insert(sorted.map((chapter,index)=>({video_id:videoId,user_id:userId,title:chapter.title.trim(),start_seconds:Math.round(chapter.startSeconds),end_seconds:chapter.endSeconds==null?null:Math.round(chapter.endSeconds),sort_order:index})));if(error)throw error;} void qc.invalidateQueries({queryKey:["my-videos",userId]}); void qc.invalidateQueries({queryKey:["videos"]}); toast.success(isEdit?"Video actualizado":"Video publicado"); await navigate({to:"/upload"}); } catch(error){toast.error(error instanceof Error?error.message:"No se pudo guardar el video");}finally{setBusy(false);} };

  if (isEdit && existingQuery.isLoading) return <AppShell><div className="py-24 text-center text-muted-foreground">Cargando editor…</div></AppShell>;
  return <AppShell><div className="mx-auto w-full max-w-5xl pb-16"><div className="mb-6 flex items-center justify-between gap-4"><div><Link to="/upload" className="text-sm text-muted-foreground hover:text-foreground">← Volver a Studio</Link><h1 className="mt-2 text-3xl font-bold">{isEdit?"Editar video":"Subir video"}</h1><p className="mt-1 text-sm text-muted-foreground">Prepara tu publicación y deja que Cornet procese la salida para reproducción.</p></div><Badge variant="secondary" className="gap-1"><FileVideo className="h-3.5 w-3.5" />MP4 / H.264 / AAC</Badge></div>
    <form onSubmit={save} className="space-y-6 rounded-3xl border border-border bg-surface p-5 shadow-sm sm:p-7">
      <section className="rounded-2xl border border-dashed border-border bg-background/60 p-5"><div className="flex flex-col items-center justify-center py-8 text-center"><UploadCloud className="h-10 w-10 text-primary"/><h2 className="mt-3 text-lg font-semibold">Selecciona tu archivo de video</h2><p className="mt-1 max-w-lg text-sm text-muted-foreground">Solo archivos de vídeo. Los archivos que no sean vídeo son rechazados antes de la subida.</p><label className="mt-5 inline-flex cursor-pointer items-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Elegir video<input type="file" accept="video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi,.wmv,.flv,.mpeg,.mpg,.3gp,.ts,.m2ts" className="hidden" onChange={(e)=>void selectVideo(e.target.files?.[0]??null)}/></label>{video&&<p className="mt-3 text-xs text-muted-foreground">{video.name} · {formatTimestamp(duration)} · {(video.size/1024/1024).toFixed(1)} MB</p>}</div></section>
      <div className="grid gap-5 lg:grid-cols-[1.3fr_.7fr]"><div className="space-y-5"><div className="space-y-2"><Label htmlFor="title">Título</Label><Input id="title" required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Escribe un título claro y descriptivo"/></div><div className="space-y-2"><Label htmlFor="description">Descripción</Label><Textarea id="description" rows={8} maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Describe tu video…"/><p className="text-xs text-muted-foreground">{extractHashtags(`${title} ${description}`).length} hashtags detectados</p></div></div><div className="space-y-5"><div className="space-y-2"><Label>Categoría</Label><Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>{CATEGORIES.map(item=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div><div className="space-y-2"><Label>Visibilidad</Label><Select value={visibility} onValueChange={setVisibility}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="public">Público</SelectItem><SelectItem value="private">Privado</SelectItem></SelectContent></Select></div><div className="space-y-2"><Label htmlFor="thumb">Miniatura</Label><Input id="thumb" type="file" accept="image/*" onChange={e=>setThumb(e.target.files?.[0]??null)}/>{existingThumbPath&&!thumb&&<p className="text-xs text-muted-foreground">Se conservará la actual.</p>}</div></div></div>
      <section className="grid gap-5 lg:grid-cols-2"><div className="rounded-2xl border border-border p-4"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Subtítulos</h2><p className="text-xs text-muted-foreground">SRT o WebVTT.</p></div><label className="cursor-pointer rounded-lg border border-border px-3 py-2 text-xs hover:bg-surface-hover">Añadir<input type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" multiple className="hidden" onChange={e=>onCaptionFiles(e.target.files)}/></label></div><div className="mt-3 space-y-2">{captions.map((caption,index)=><div key={caption.id} className="flex items-center gap-2 rounded-xl bg-background/60 p-2"><span className="min-w-0 flex-1 truncate text-xs">{caption.file.name}</span><Input value={caption.language} onChange={e=>setCaptions(prev=>prev.map((c,i)=>i===index?{...c,language:e.target.value}:c))} className="h-8 w-16"/><Button type="button" variant="ghost" size="icon" onClick={()=>setCaptions(prev=>prev.filter((_,i)=>i!==index))}><X className="h-4 w-4"/></Button></div>)}</div></div><div className="rounded-2xl border border-border p-4"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Capítulos</h2><p className="text-xs text-muted-foreground">Organiza el video por secciones.</p></div><Button type="button" variant="secondary" size="sm" onClick={addChapter}><Plus className="mr-1 h-4 w-4"/>Capítulo</Button></div><div className="mt-3 space-y-2">{chapters.map((chapter,index)=><div key={`${index}-${chapter.title}`} className="grid gap-2 sm:grid-cols-[1fr_90px_90px_auto]"><Input value={chapter.title} onChange={e=>setChapters(prev=>prev.map((c,i)=>i===index?{...c,title:e.target.value}:c))} placeholder="Título"/><Input type="number" value={chapter.startSeconds} onChange={e=>setChapters(prev=>prev.map((c,i)=>i===index?{...c,startSeconds:Number(e.target.value)||0}:c))}/><Input type="number" value={chapter.endSeconds??""} onChange={e=>setChapters(prev=>prev.map((c,i)=>i===index?{...c,endSeconds:e.target.value===""?null:Number(e.target.value)}:c))}/><Button type="button" variant="ghost" size="icon" onClick={()=>setChapters(prev=>prev.filter((_,i)=>i!==index))}><Trash2 className="h-4 w-4"/></Button></div>)}</div></div></section>
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between"><Button type="button" variant="ghost" onClick={()=>void navigate({to:"/upload"})}>Cancelar</Button><Button type="submit" size="lg" disabled={busy}>{busy?"Procesando…":isEdit?"Guardar cambios":"Publicar video"}</Button></div>
    </form></div></AppShell>;
}

function UploadPage() {
  const { user } = useAuth();
  const { edit, create } = Route.useSearch();
  if (!user) return <AppShell><div className="py-24 text-center text-muted-foreground">Inicia sesión para usar Cornet Studio.</div></AppShell>;
  return edit || create ? <AppShell studio><Editor userId={user.id} code={edit}/></AppShell> : <AppShell studio><Dashboard userId={user.id}/></AppShell>;
}
