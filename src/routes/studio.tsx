import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, BarChart3, CheckCircle2, DollarSign, Edit3, Eye, FileVideo, FolderOpen, HelpCircle, Languages, LayoutDashboard, ListVideo, Music2, Palette, PlaySquare, Plus, Radio, Settings, ShieldCheck, Trash2, UploadCloud, Users, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { untypedDb } from "@/lib/untyped-db";
import { AppShell } from "@/components/AppShell";
import { uploadToSupabasePublic, deleteFromSupabasePublic } from "@/lib/b2";
import { CommunityFeed } from "@/components/CommunityFeed";
import { CommunityStorage } from "@/components/CommunityStorage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { uploadFile, useSignedUrl } from "@/lib/storage";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { generateVideoCode } from "@/lib/videoCode";
import { formatTimestamp, normalizeCaptionText, type ChapterDraft, validateChapterDrafts } from "@/lib/captions";
import { extractHashtags, syncVideoHashtags } from "@/lib/hashtags";
import { formatViews, timeAgo } from "@/lib/format";

export const Route = createFileRoute("/studio")({
  head: () => ({ meta: [{ title: "Cornet Studio" }] }),
  validateSearch: (search: Record<string, unknown>): { edit?: string; create?: boolean } => ({
    edit: typeof search.edit === "string" ? search.edit : undefined,
    create: search.create === "1" || search.create === true,
  }),
  component: StudioPage,
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
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">Cornet Studio</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Panel del canal</h1><p className="mt-1 text-sm text-muted-foreground">Un resumen de lo que ocurre en tu canal.</p></div><Button className="rounded-full" onClick={() => void navigate({ to: "/studio", search: { create: true } })}><Plus className="mr-2 h-4 w-4" />Crear</Button></div>
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

function Editor({ userId, code, initialFile, onCancel }: { userId: string; code?: string; initialFile?: File | null; onCancel?: () => void }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const isEdit = !!code;
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [category, setCategory] = useState<string>("Entertainment");
  const [video, setVideo] = useState<File | null>(initialFile ?? null);
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
  useEffect(() => { if (initialFile) void readDuration(initialFile).then(setDuration); }, [initialFile]);
  const onCaptionFiles = (files: FileList | null) => { if (!files) return; const accepted = [...files].filter((file) => /\.(vtt|srt)$/i.test(file.name)); setCaptions((prev) => [...prev,...accepted.map(file=>({id:crypto.randomUUID(),file,language:"es",label:file.name.replace(/\.(srt|vtt)$/i,""),isDefault:false}))]); };
  const addChapter = () => setChapters((prev) => [...prev,{title:"Nuevo capítulo",startSeconds:prev.length?prev[prev.length-1].startSeconds+60:0,endSeconds:null}]);
  const save = async (e: React.FormEvent) => { e.preventDefault(); if (!isEdit && !video) return void toast.error("Selecciona un archivo de video"); if (video && !video.type.startsWith("video/")) return void toast.error("El archivo seleccionado no es un vídeo válido."); const chapterError=validateChapterDrafts(chapters); if(chapterError)return void toast.error(chapterError); setBusy(true); try { let videoPath=existingVideoPath; let thumbPath=existingThumbPath; if(video) videoPath=await uploadToCloudinary(video,userId,"video"); if(thumb && !thumb.type.startsWith("image/")) throw new Error("La miniatura no es válida."); if(thumb) thumbPath=await uploadToCloudinary(thumb,userId,"image"); let videoId:string; let finalCode=code??generateVideoCode(); if(isEdit&&existingQuery.data){videoId=existingQuery.data.id; const {error}=await supabase.from("videos").update({title:title.trim(),description:description.trim(),visibility,category,video_path:videoPath??undefined,thumbnail_path:thumbPath??undefined,duration_seconds:duration}).eq("id",videoId).eq("user_id",userId); if(error)throw error;}else{let inserted:{id:string;code:string}|null=null; for(let attempt=0;attempt<3&&!inserted;attempt+=1){const {data,error}=await supabase.from("videos").insert({user_id:userId,code:finalCode,title:title.trim(),description:description.trim(),visibility,category,video_path:videoPath??"",thumbnail_path:thumbPath??null,duration_seconds:duration}).select("id,code").single(); if(!error)inserted=data; else if((error as {code?:string}).code==="23505")finalCode=generateVideoCode();else throw error;} if(!inserted)throw new Error("No se pudo crear el video"); videoId=inserted.id;}
      await syncVideoHashtags(videoId,`${title}\n${description}`); await supabase.from("video_captions").delete().eq("video_id",videoId); for(const caption of captions.filter(c=>c.file.size>0)){const normalized=normalizeCaptionText(await caption.file.text(),caption.file.name);const path=await uploadFile("media",userId,new File([normalized],`${caption.file.name.replace(/\.(srt|vtt)$/i,"")}.vtt`,{type:"text/vtt"}),"captions-");const {error}=await supabase.from("video_captions").insert({video_id:videoId,user_id:userId,language_code:caption.language.slice(0,8).toLowerCase(),label:caption.label||caption.language,caption_path:path,is_default:caption.isDefault});if(error)throw error;} await supabase.from("video_chapters").delete().eq("video_id",videoId); if(chapters.length){const sorted=[...chapters].sort((a,b)=>a.startSeconds-b.startSeconds);const {error}=await supabase.from("video_chapters").insert(sorted.map((chapter,index)=>({video_id:videoId,user_id:userId,title:chapter.title.trim(),start_seconds:Math.round(chapter.startSeconds),end_seconds:chapter.endSeconds==null?null:Math.round(chapter.endSeconds),sort_order:index})));if(error)throw error;} void qc.invalidateQueries({queryKey:["my-videos",userId]}); void qc.invalidateQueries({queryKey:["videos"]}); toast.success(isEdit?"Video actualizado":"Video publicado"); await navigate({to:"/upload"}); } catch(error){toast.error(error instanceof Error?error.message:"No se pudo guardar el video");}finally{setBusy(false);} };

  if (isEdit && existingQuery.isLoading) return <AppShell><div className="py-24 text-center text-muted-foreground">Cargando editor…</div></AppShell>;
  return <AppShell><div className="mx-auto w-full max-w-6xl px-4 pb-12 pt-4 sm:px-7">
    <p className="mb-3 text-xs text-muted-foreground">Upload — Después de arrastrar o seleccionar archivo (Video/Cuadrado)</p>
    <form onSubmit={save} className="relative min-h-[540px] rounded-3xl border border-white/10 bg-[#242322] p-5 shadow-2xl sm:p-8">
      <button type="button" onClick={()=>onCancel?onCancel():void navigate({to:"/studio"})} className="absolute right-5 top-5 rounded p-1 text-white/70 hover:text-white" aria-label="Cerrar"><X className="h-5 w-5"/></button>
      <h1 className="text-2xl font-semibold">Detalles</h1>
      {isEdit && <p className="mt-1 text-xs text-muted-foreground">Edita la información y los recursos de tu video.</p>}
      <div className="mt-5 grid gap-6 lg:grid-cols-[1.35fr_.9fr]">
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="title">Título (obligatorio)</Label><Input id="title" required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)} placeholder="Título escrito por el usuario" className="h-12 rounded-2xl border-0 bg-white/[.06]"/></div>
          <div className="space-y-2"><Label htmlFor="description">Descripción</Label><Textarea id="description" rows={4} maxLength={5000} value={description} onChange={e=>setDescription(e.target.value)} placeholder="Descripción escrita por el usuario" className="rounded-2xl border-0 bg-white/[.06]"/><p className="text-xs text-muted-foreground">{extractHashtags(title + " " + description).length} hashtags detectados</p></div>
          <div className="rounded-2xl border border-white/[.08] bg-black/10 p-3"><div className="flex flex-wrap items-center gap-3"><FileVideo className="h-4 w-4 text-primary"/><p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{video?.name ?? "Selecciona tu archivo de video"}{video ? " · " + formatTimestamp(duration) + " · " + (video.size/1024/1024).toFixed(1) + " MB" : ""}</p><label className="cursor-pointer rounded-lg bg-white/[.06] px-3 py-2 text-xs hover:bg-white/[.1]">{video?"Cambiar":"Seleccionar video"}<input type="file" accept="video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi,.wmv,.flv,.mpeg,.mpg,.3gp,.ts,.m2ts" className="hidden" onChange={e=>void selectVideo(e.target.files?.[0]??null)}/></label></div></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <div className="space-y-2"><Label htmlFor="thumb">Miniatura</Label><label htmlFor="thumb" className="flex min-h-28 cursor-pointer items-center justify-center rounded-2xl bg-white/[.06] p-3 text-center text-xs text-muted-foreground hover:bg-white/[.09]">{thumb?.name ?? (existingThumbPath ? "Cambiar miniatura" : "Seleccionar miniatura")}<Input id="thumb" type="file" accept="image/*" onChange={e=>setThumb(e.target.files?.[0]??null)} className="hidden"/></label></div>
          <div className="space-y-2"><div className="flex items-center justify-between"><Label>Capítulos</Label><Button type="button" variant="ghost" size="sm" onClick={addChapter}><Plus className="mr-1 h-4 w-4"/>Crear</Button></div><div className="max-h-36 space-y-2 overflow-y-auto rounded-2xl bg-white/[.06] p-2">{chapters.map((chapter,index)=><div key={index} className="grid grid-cols-[1fr_62px_auto] gap-1"><Input value={chapter.title} onChange={e=>setChapters(prev=>prev.map((c,i)=>i===index?{...c,title:e.target.value}:c))} placeholder="Capítulo" className="h-8 text-xs"/><Input type="number" value={chapter.startSeconds} onChange={e=>setChapters(prev=>prev.map((c,i)=>i===index?{...c,startSeconds:Number(e.target.value)||0}:c))} className="h-8 text-xs"/><Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={()=>setChapters(prev=>prev.filter((_,i)=>i!==index))}><X className="h-3.5 w-3.5"/></Button></div>)}</div></div>
        </div>
      </div>
      <div className="mt-5 grid gap-4 border-t border-white/[.08] pt-4 sm:grid-cols-3">
        <div className="space-y-2"><Label htmlFor="captions">Subtítulos</Label><label htmlFor="captions" className="flex cursor-pointer items-center justify-center rounded-xl bg-white/[.06] px-3 py-2.5 text-xs hover:bg-white/[.1]">Subir subtítulos (SRT o WebVTT)<input id="captions" type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" multiple className="hidden" onChange={e=>onCaptionFiles(e.target.files)}/></label><p className="text-[11px] text-muted-foreground">{captions.length ? captions.length + " archivo(s) seleccionado(s)" : "Opcional"}</p></div>
        <div className="space-y-2"><Label>Restricción</Label><Select value={visibility} onValueChange={setVisibility}><SelectTrigger className="rounded-xl bg-white/[.06]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="public">Sin restricción · Público</SelectItem><SelectItem value="private">Privado</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Categoría</Label><Select value={category} onValueChange={setCategory}><SelectTrigger className="rounded-xl bg-white/[.06]"><SelectValue/></SelectTrigger><SelectContent>{CATEGORIES.map(item=><SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[.08] pt-4"><Button type="button" variant="ghost" onClick={()=>onCancel?onCancel():void navigate({to:"/studio"})}>Descartar</Button><div className="ml-auto flex items-center gap-2"><Button type="submit" disabled={busy}>{busy?"Subiendo…":isEdit?"Guardar":"Subir"}</Button><Select value={visibility} onValueChange={setVisibility}><SelectTrigger className="w-32 rounded-xl bg-white/[.06]"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="public">Público</SelectItem><SelectItem value="private">Privado</SelectItem></SelectContent></Select></div></div>
    </form>
  </div></AppShell>;
}


function StudioUploadFlow(props: { userId: string }) {
  const userId = props.userId;
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const close = () => void navigate({ to: "/studio" });
  const choose = (picked?: File) => { if (picked) setFile(picked); };

  if (file?.type.startsWith("video/")) return <Editor userId={userId} initialFile={file} onCancel={close} />;
  if (file) return <ArchiveDetailsEditor userId={userId} file={file} onCancel={close} />;

  return <><Dashboard userId={userId}/><div className="fixed inset-0 z-[1200] flex items-center justify-center overflow-y-auto bg-black/55 px-4 py-8 backdrop-blur-md">
    <section className="relative w-full max-w-[780px] overflow-hidden rounded-3xl border border-white/10 bg-[#171615]/90 px-6 py-8 text-center shadow-2xl sm:px-10">
      <button type="button" onClick={close} className="absolute right-5 top-4 rounded p-1 text-white/70 hover:text-white" aria-label="Cerrar"><X className="h-5 w-5"/></button>
      <p className="text-2xl font-semibold tracking-tight sm:text-3xl">Subir contenido.</p>
      <label onDragOver={(event)=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={(event)=>{event.preventDefault();setDragging(false);choose(event.dataTransfer.files?.[0]);}} className={"mx-auto mt-5 flex max-w-xl cursor-pointer flex-col items-center rounded-2xl border border-transparent px-4 py-3 transition " + (dragging ? "bg-primary/15" : "hover:bg-white/[.03]")}>
        <span className="flex h-24 w-24 items-center justify-center rounded-full bg-white/[.08] text-[#ff8068]"><UploadCloud className="h-14 w-14"/></span>
        <span className="mt-4 text-xl font-semibold sm:text-2xl">Arrastra y suelta archivos aquí</span>
        <span className="mt-4 rounded-full bg-white/[.07] px-7 py-2 text-sm hover:bg-white/[.12]">Seleccionar Archivos</span>
        <input type="file" accept="video/*,.mp4,.m4v,.mov,.webm,.mkv,.avi,.wmv,.flv,.mpeg,.mpg,.3gp,.ts,.m2ts,.zip,.pdf,.txt,.png,.jpg,.jpeg,.gif,.webp,.mp3,.wav,.ogg,.7z,.rar" className="hidden" onChange={(event)=>{choose(event.target.files?.[0]);event.currentTarget.value="";}}/>
      </label>
      <p className="mx-auto mt-2 max-w-2xl text-[10px] leading-relaxed text-white/55">Si subes tus videos a Cornet, aceptas las <Link to="/terms" className="underline">Condiciones del Servicio</Link> y los <Link to="/rules" className="underline">Lineamientos de la Comunidad</Link>. Asegúrate de que tus videos no infrinjan la privacidad ni los derechos de autor de otras personas. <Link to="/about" className="underline">Más información</Link></p>
    </section>
  </div></>;
}

function ArchiveDetailsEditor({ userId, file, onCancel }: { userId: string; file: File; onCancel: () => void }) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(file.name);
  const [busy, setBusy] = useState(false);
  const [visibility, setVisibility] = useState("public");
  const navigate = useNavigate();
  const publish = async (event: React.FormEvent) => {
    event.preventDefault();
    if (file.size > 50 * 1024 * 1024) return void toast.error("El archivo supera el límite de 50 MB.");
    if (/\.(exe|dll|com|scr|msi|bat|cmd|ps1|vbs|js|jar|sh)$/i.test(file.name)) return void toast.error("Este tipo de archivo no está permitido por seguridad.");
    setBusy(true);
    try {
      const { path, publicUrl } = await uploadToSupabasePublic(userId, file);
      const { error } = await (supabase as any).from("community_files").insert({ user_id: userId, original_name: title.trim() || file.name, storage_path: path, storage_provider: "supabase", public_url: publicUrl, mime_type: file.type || null, size_bytes: file.size });
      if (error) { await deleteFromSupabasePublic(path).catch(() => undefined); throw error; }
      void qc.invalidateQueries({ queryKey: ["community-files", userId] });
      toast.success("Archivo publicado en Cornet");
      await navigate({ to: "/studio" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No se pudo subir el archivo");
    } finally { setBusy(false); }
  };
  return <div className="mx-auto min-h-[calc(100vh-120px)] w-full max-w-5xl px-4 py-8 sm:px-8">
    <p className="mb-3 text-xs text-muted-foreground">Upload — Después de arrastrar o seleccionar archivo (Archivo)</p>
    <form onSubmit={publish} className="relative min-h-[420px] rounded-3xl border border-white/10 bg-[#242322] p-6 shadow-xl sm:p-9">
      <button type="button" onClick={onCancel} className="absolute right-5 top-5 rounded p-1 text-white/70 hover:text-white" aria-label="Cerrar"><X className="h-5 w-5"/></button>
      <h1 className="text-2xl font-semibold">Detalles</h1>
      <div className="mt-4 max-w-md space-y-2"><Label htmlFor="archive-title">Título (obligatorio)</Label><Input id="archive-title" required value={title} onChange={event=>setTitle(event.target.value)} placeholder="Título escrito por el usuario"/><p className="truncate text-xs text-muted-foreground">{file.name} · {(file.size/1024/1024).toFixed(1)} MB</p></div>
      <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between"><Button type="button" variant="ghost" onClick={onCancel}>Descartar</Button><div className="flex items-center gap-2"><Button type="submit" disabled={busy}>{busy?"Subiendo…":"Subir"}</Button><Select value={visibility} onValueChange={setVisibility}><SelectTrigger className="w-32"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="public">Público</SelectItem></SelectContent></Select></div></div>
    </form>
  </div>;
}

function StudioPage() {
  const { user } = useAuth();
  const { edit, create } = Route.useSearch();
  if (!user) return <AppShell studio><div className="py-24 text-center text-muted-foreground">Inicia sesión para usar Cornet Studio.</div></AppShell>;
  return <AppShell studio>{edit ? <Editor userId={user.id} code={edit} /> : create ? <StudioUploadFlow userId={user.id} /> : <Dashboard userId={user.id} />}</AppShell>;
}

