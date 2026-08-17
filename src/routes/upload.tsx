import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { BarChart3, CheckCircle2, Edit3, Eye, FileVideo, ListVideo, MoreVertical, PlaySquare, Plus, Search, Trash2, UploadCloud, Video, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
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
type Tab = "overview" | "videos" | "analytics";

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
  const [tab, setTab] = useState<Tab>("overview");
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
  const { data: likes } = useQuery({ queryKey: ["studio-likes", userId], queryFn: async () => { const { data, error } = await supabase.from("video_likes").select("video_id,is_like").in("video_id", (videos ?? []).map((v) => v.id)); if (error) return []; return data ?? []; }, enabled: !!videos?.length });

  const totalViews = (videos ?? []).reduce((sum, video) => sum + Number(video.views ?? 0), 0);
  const publicVideos = (videos ?? []).filter((video) => video.visibility === "public").length;
  const averageViews = videos?.length ? Math.round(totalViews / videos.length) : 0;
  const topVideo = [...(videos ?? [])].sort((a, b) => b.views - a.views)[0];
  const likeTotal = (likes ?? []).filter((row) => row.is_like).length;
  const filteredVideos = useMemo(() => (videos ?? []).filter((video) => !search.trim() || video.title.toLowerCase().includes(search.trim().toLowerCase())), [videos, search]);

  const removeVideo = async (video: VideoRow) => {
    if (!window.confirm(`¿Eliminar “${video.title}”? Esta acción no se puede deshacer.`)) return;
    const { error } = await supabase.from("videos").delete().eq("id", video.id).eq("user_id", userId);
    if (error) return void toast.error(error.message);
    void qc.invalidateQueries({ queryKey: ["my-videos", userId] });
    toast.success("Video eliminado");
  };

  return <div className="mx-auto w-full max-w-7xl space-y-6 pb-16">
    <section className="overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-surface to-background p-6 shadow-sm sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Creator Studio</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Bienvenido a Cornet Studio</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Gestiona tus vídeos, revisa el crecimiento del canal y publica contenido desde un solo lugar.</p></div>
        <Button size="lg" className="rounded-full" onClick={() => void navigate({ to: "/upload", search: { create: true } })}><Plus className="mr-2 h-4 w-4" />Subir video</Button>
      </div>
    </section>

    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard label="Suscriptores" value={Number(profile?.subscriber_count ?? 0).toLocaleString("es-ES")} hint="audiencia actual" icon={PlaySquare} />
      <StatCard label="Vistas totales" value={totalViews.toLocaleString("es-ES")} hint="en tus vídeos" icon={BarChart3} />
      <StatCard label="Vídeos públicos" value={String(publicVideos)} hint={`de ${(videos ?? []).length} publicados`} icon={Video} />
      <StatCard label="Media por vídeo" value={averageViews.toLocaleString("es-ES")} hint={`mejor: ${topVideo ? formatViews(topVideo.views) : "0"}`} icon={CheckCircle2} />
    </div>

    <div className="flex flex-wrap gap-2 rounded-2xl border border-border bg-surface p-2 shadow-sm">
      {([ ["overview","Resumen"],["videos","Contenido"],["analytics","Analíticas"] ] as const).map(([value, label]) => <Button key={value} variant={tab === value ? "default" : "ghost"} className="rounded-xl" onClick={() => setTab(value)}>{label}</Button>)}
      <Link to="/playlists" className="inline-flex items-center rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Playlists</Link>
      <Link to="/series" className="inline-flex items-center rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted"><ListVideo className="mr-2 h-4 w-4" />Series</Link>
      <Link to="/history" className="inline-flex items-center rounded-xl px-3 py-2 text-sm text-muted-foreground hover:bg-muted">Historial</Link>
    </div>

    {tab === "overview" && <div className="grid gap-5 lg:grid-cols-[1.25fr_.75fr]">
      <section className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center justify-between gap-3"><div><h2 className="font-semibold">Contenido reciente</h2><p className="text-xs text-muted-foreground">Tus últimos vídeos publicados.</p></div><Button variant="ghost" size="sm" onClick={() => setTab("videos")}>Ver todo</Button></div><div className="mt-4 space-y-3">{isLoading ? <div className="py-8 text-center text-sm text-muted-foreground">Cargando…</div> : videos?.slice(0,5).map((video) => <div key={video.id} className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/50 p-3"><div className="w-28 shrink-0"><Thumbnail path={video.thumbnail_path} alt={video.title} /></div><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{video.title}</p><p className="mt-1 text-xs text-muted-foreground">{formatViews(video.views)} vistas · {timeAgo(video.created_at)}</p></div><Badge variant="secondary">{video.visibility === "public" ? "Público" : "Privado"}</Badge></div>)}{!isLoading && !videos?.length && <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Aún no tienes vídeos.</div>}</div></section>
      <section className="rounded-2xl border border-border bg-surface p-5"><h2 className="font-semibold">Rendimiento rápido</h2><div className="mt-5 space-y-4"><div><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Vídeo destacado</span><strong>{topVideo ? formatViews(topVideo.views) : "0"}</strong></div><div className="mt-2 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: topVideo && totalViews ? `${Math.max(4, Math.round(topVideo.views / totalViews * 100))}%` : "0%" }} /></div></div><div className="rounded-xl bg-background/60 p-4"><p className="text-xs text-muted-foreground">Me gusta</p><p className="mt-1 text-2xl font-bold">{likeTotal.toLocaleString("es-ES")}</p></div><div className="rounded-xl bg-primary/5 p-4"><p className="text-xs text-muted-foreground">Consejo</p><p className="mt-1 text-sm">Mantén títulos claros, miniaturas consistentes y capítulos en vídeos largos.</p></div></div></section>
    </div>}

    {tab === "videos" && <section className="rounded-2xl border border-border bg-surface p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Contenido</h2><p className="text-xs text-muted-foreground">Edita, publica, revisa o elimina tus vídeos.</p></div><div className="relative w-full sm:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar vídeo…" className="pl-9" /></div></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[820px] text-sm"><thead><tr className="border-b border-border text-left text-xs text-muted-foreground"><th className="px-2 py-3 font-medium">Vídeo</th><th className="px-2 py-3 font-medium">Visibilidad</th><th className="px-2 py-3 font-medium">Vistas</th><th className="px-2 py-3 font-medium">Publicado</th><th className="px-2 py-3 text-right font-medium">Acciones</th></tr></thead><tbody>{filteredVideos.map((video) => <tr key={video.id} className="border-b border-border/60 last:border-0"><td className="px-2 py-3"><div className="flex min-w-0 items-center gap-3"><div className="w-28 shrink-0"><Thumbnail path={video.thumbnail_path} alt={video.title} /></div><div className="min-w-0"><p className="max-w-[340px] truncate font-semibold">{video.title}</p><p className="mt-1 text-xs text-muted-foreground">{formatTimestamp(video.duration_seconds)} · {video.category}</p></div></div></td><td className="px-2 py-3"><Badge variant="secondary">{video.visibility === "public" ? "Público" : "Privado"}</Badge></td><td className="px-2 py-3">{formatViews(video.views)}</td><td className="px-2 py-3 text-muted-foreground">{timeAgo(video.created_at)}</td><td className="px-2 py-3"><div className="flex justify-end gap-1"><Button variant="ghost" size="icon" asChild><Link to="/watch" search={{ v: video.code }} aria-label="Ver vídeo"><Eye className="h-4 w-4" /></Link></Button><Button variant="ghost" size="icon" onClick={() => void navigate({ to: "/upload", search: { edit: video.code } })} aria-label="Editar vídeo"><Edit3 className="h-4 w-4" /></Button><DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="text-destructive" onClick={() => void removeVideo(video)}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem></DropdownMenuContent></DropdownMenu></div></td></tr>)}</tbody></table>{!filteredVideos.length && <p className="py-10 text-center text-sm text-muted-foreground">No encontramos vídeos con esa búsqueda.</p>}</div></section>}

    {tab === "analytics" && <section className="grid gap-5 md:grid-cols-2"><div className="rounded-2xl border border-border bg-surface p-5"><h2 className="font-semibold">Panorama del canal</h2><div className="mt-5 space-y-4"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Vídeos</span><strong>{videos?.length ?? 0}</strong></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Públicos</span><strong>{publicVideos}</strong></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Vistas</span><strong>{totalViews.toLocaleString("es-ES")}</strong></div><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Me gusta</span><strong>{likeTotal.toLocaleString("es-ES")}</strong></div></div></div><div className="rounded-2xl border border-border bg-surface p-5"><h2 className="font-semibold">Qué mejorar</h2><ul className="mt-4 space-y-3 text-sm text-muted-foreground"><li className="rounded-xl bg-background/60 p-3">Añade una miniatura clara y reconocible.</li><li className="rounded-xl bg-background/60 p-3">Usa capítulos para mejorar la navegación.</li><li className="rounded-xl bg-background/60 p-3">Mantén una categoría precisa para que tus vídeos sean más fáciles de descubrir.</li></ul></div></section>}
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
  return edit || create ? <Editor userId={user.id} code={edit}/> : <AppShell><Dashboard userId={user.id}/></AppShell>;
}
