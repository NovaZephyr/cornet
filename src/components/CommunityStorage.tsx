import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Clock3, Copy, Download, FileArchive, FileCode2, FileImage, FileText, FileUp, FolderOpen, HardDrive, Loader2, MoreHorizontal, ShieldCheck, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const db = supabase as any;
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const MAX_TEMP_SIZE = 100 * 1024 * 1024;
const BLOCKED_EXTENSIONS = new Set(["exe", "dll", "com", "scr", "msi", "bat", "cmd", "ps1", "vbs", "js", "jar", "sh"]);
const TEMP_DURATIONS = [
  { value: 60 * 60, label: "1 hora" },
  { value: 6 * 60 * 60, label: "6 horas" },
  { value: 24 * 60 * 60, label: "24 horas" },
  { value: 3 * 24 * 60 * 60, label: "3 días" },
  { value: 7 * 24 * 60 * 60, label: "7 días" },
];

type StoredFile = { id: string; user_id: string; original_name: string; storage_path: string; mime_type: string | null; size_bytes: number; created_at: string };
type TempFile = StoredFile & { expires_at: string };

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) { value /= 1024; unit += 1; }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}
function safeName(name: string) { return name.replace(/[\\/\0]/g, "-").trim().slice(0, 255) || "archivo"; }
function extension(name: string) { return name.split(".").pop()?.toLowerCase() ?? ""; }
function fileIcon(file: StoredFile) {
  const mime = file.mime_type ?? "";
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("text/") || mime.includes("json") || mime.includes("xml")) return FileText;
  if (mime.includes("zip") || mime.includes("archive") || ["rar", "7z", "tar", "gz"].includes(extension(file.original_name))) return FileArchive;
  if (mime.includes("javascript") || mime.includes("typescript")) return FileCode2;
  return HardDrive;
}
function relativeExpiry(expiresAt: string) {
  const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
  if (seconds < 60) return `${seconds}s restantes`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min restantes`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h restantes`;
  return `${Math.floor(hours / 24)} d restantes`;
}
function validateFile(file: File, maxSize: number) {
  if (BLOCKED_EXTENSIONS.has(extension(file.name))) throw new Error("Este tipo de archivo no está permitido por seguridad.");
  if (file.size > maxSize) throw new Error(`El archivo supera el límite de ${formatBytes(maxSize)}.`);
}
async function copyText(text: string) { await navigator.clipboard.writeText(text); toast.success("Enlace copiado"); }

function UploadZone({ onFile, busy, maxSize, title, subtitle }: { onFile: (file: File) => void; busy: boolean; maxSize: number; title: string; subtitle: string }) {
  const [dragging, setDragging] = useState(false);
  const acceptFile = (file?: File) => {
    if (!file) return;
    try { validateFile(file, maxSize); onFile(file); } catch (error) { toast.error(error instanceof Error ? error.message : "Archivo no válido"); }
  };
  return (
    <label className={`group block cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition ${dragging ? "border-primary bg-primary/5" : "border-border bg-background/50 hover:border-primary/50 hover:bg-surface-hover"}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); acceptFile(event.dataTransfer.files?.[0]); }}>
      <input type="file" className="hidden" disabled={busy} onChange={(event) => { acceptFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">{busy ? <Loader2 className="h-7 w-7 animate-spin" /> : <UploadCloud className="h-7 w-7" />}</div>
      <p className="font-semibold">{title}</p><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p><p className="mt-3 text-xs text-muted-foreground">Máximo {formatBytes(maxSize)} · Arrastra o haz clic para elegir</p>
    </label>
  );
}

function FileRow({ file, temporary, onDelete }: { file: StoredFile | TempFile; temporary?: boolean; onDelete: () => void }) {
  const Icon = fileIcon(file); const [link, setLink] = useState<string | null>(null); const [loadingLink, setLoadingLink] = useState(false);
  const expired = temporary && new Date((file as TempFile).expires_at).getTime() <= Date.now();
  const openLink = async () => {
    setLoadingLink(true);
    try {
      if (temporary) {
        const expires = Math.max(1, Math.floor((new Date((file as TempFile).expires_at).getTime() - Date.now()) / 1000));
        if (expires <= 0) throw new Error("El archivo temporal ya expiró.");
        const { data, error } = await supabase.storage.from("community-temp").createSignedUrl(file.storage_path, expires);
        if (error || !data?.signedUrl) throw error ?? new Error("No se pudo generar el enlace temporal.");
        setLink(data.signedUrl); return data.signedUrl;
      }
      const { data } = supabase.storage.from("community-files").getPublicUrl(file.storage_path);
      if (!data.publicUrl) throw new Error("No se pudo generar el enlace.");
      setLink(data.publicUrl); return data.publicUrl;
    } finally { setLoadingLink(false); }
  };
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-background/70 p-3 transition hover:bg-surface-hover">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"><Icon className="h-5 w-5" /></div>
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium" title={file.original_name}>{file.original_name}</p><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span>{formatBytes(file.size_bytes)}</span><span>·</span><span>{new Date(file.created_at).toLocaleDateString()}</span>{temporary && <Badge variant={expired ? "destructive" : "secondary"} className="gap-1 text-[10px]"><Clock3 className="h-3 w-3" />{expired ? "Expirado" : relativeExpiry((file as TempFile).expires_at)}</Badge>}</div>{link && <p className="mt-1 truncate text-[11px] text-primary" title={link}>{link}</p>}</div>
      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon" disabled={loadingLink || !!expired} onClick={async () => { const url = await openLink(); if (url) window.open(url, "_blank", "noopener,noreferrer"); }} title="Abrir">{loadingLink ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}</Button>
        <Button variant="ghost" size="icon" disabled={loadingLink || !!expired} onClick={async () => { const url = link ?? await openLink(); if (url) void copyText(url); }} title="Copiar enlace"><Copy className="h-4 w-4" /></Button>
        <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem className="text-destructive" onClick={onDelete}><Trash2 className="mr-2 h-4 w-4" />Eliminar</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
      </div>
    </div>
  );
}

export function CommunityStorage() {
  const { user } = useAuth(); const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("files"); const [fileBusy, setFileBusy] = useState(false); const [tempBusy, setTempBusy] = useState(false); const [tempDuration, setTempDuration] = useState(TEMP_DURATIONS[2].value); const [lastTempUrl, setLastTempUrl] = useState<string | null>(null); const [tick, setTick] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setTick((value) => value + 1), 30000); return () => window.clearInterval(timer); }, []);

  const filesQuery = useQuery({ queryKey: ["community-files", user?.id], enabled: !!user, queryFn: async () => { const { data, error } = await db.from("community_files").select("id,user_id,original_name,storage_path,mime_type,size_bytes,created_at").eq("user_id", user!.id).order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as StoredFile[]; } });
  const tempQuery = useQuery({ queryKey: ["community-temp-files", user?.id], enabled: !!user, queryFn: async () => { const { data, error } = await db.from("community_temp_files").select("id,user_id,original_name,storage_path,mime_type,size_bytes,created_at,expires_at").eq("user_id", user!.id).order("created_at", { ascending: false }); if (error) throw error; return (data ?? []) as TempFile[]; } });
  const activeTemps = useMemo(() => (tempQuery.data ?? []).filter((file) => new Date(file.expires_at).getTime() > Date.now()), [tempQuery.data, tick]);

  const uploadPermanent = async (file: File) => {
    if (!user) return toast.error("Inicia sesión para subir archivos."); setFileBusy(true); const path = `${user.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
    try {
      const { error: uploadError } = await supabase.storage.from("community-files").upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type || "application/octet-stream" }); if (uploadError) throw uploadError;
      const { error: dbError } = await db.from("community_files").insert({ user_id: user.id, original_name: safeName(file.name), storage_path: path, mime_type: file.type || null, size_bytes: file.size });
      if (dbError) { await supabase.storage.from("community-files").remove([path]); throw dbError; }
      await qc.invalidateQueries({ queryKey: ["community-files", user.id] }); toast.success("Archivo subido correctamente");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo subir el archivo"); } finally { setFileBusy(false); }
  };

  const uploadTemporary = async (file: File) => {
    if (!user) return toast.error("Inicia sesión para usar el host temporal."); setTempBusy(true); setLastTempUrl(null); const expiresAt = new Date(Date.now() + tempDuration * 1000); const path = `${user.id}/${crypto.randomUUID()}-${safeName(file.name)}`;
    try {
      const { error: uploadError } = await supabase.storage.from("community-temp").upload(path, file, { cacheControl: "60", upsert: false, contentType: file.type || "application/octet-stream" }); if (uploadError) throw uploadError;
      const { error: dbError } = await db.from("community_temp_files").insert({ user_id: user.id, original_name: safeName(file.name), storage_path: path, mime_type: file.type || null, size_bytes: file.size, expires_at: expiresAt.toISOString() });
      if (dbError) { await supabase.storage.from("community-temp").remove([path]); throw dbError; }
      const { data: signed, error: signedError } = await supabase.storage.from("community-temp").createSignedUrl(path, tempDuration); if (signedError || !signed?.signedUrl) throw signedError ?? new Error("No se pudo generar el enlace temporal.");
      setLastTempUrl(signed.signedUrl); await qc.invalidateQueries({ queryKey: ["community-temp-files", user.id] }); toast.success("Enlace temporal creado");
    } catch (error) { toast.error(error instanceof Error ? error.message : "No se pudo crear el enlace temporal"); } finally { setTempBusy(false); }
  };

  const deleteFile = async (file: StoredFile, temporary = false) => {
    const bucket = temporary ? "community-temp" : "community-files"; const table = temporary ? "community_temp_files" : "community_files";
    const { error: storageError } = await supabase.storage.from(bucket).remove([file.storage_path]); if (storageError) return void toast.error(storageError.message);
    const { error } = await db.from(table).delete().eq("id", file.id).eq("user_id", user!.id); if (error) return void toast.error(error.message);
    await qc.invalidateQueries({ queryKey: [temporary ? "community-temp-files" : "community-files", user?.id] }); toast.success("Archivo eliminado");
  };

  if (!user) return <Card className="mx-auto max-w-3xl border-border/70 bg-surface/70"><CardContent className="flex flex-col items-center py-16 text-center"><ShieldCheck className="mb-4 h-10 w-10 text-primary" /><h2 className="text-xl font-semibold">Tu espacio de archivos</h2><p className="mt-2 max-w-md text-sm text-muted-foreground">Inicia sesión para guardar archivos, generar enlaces directos y crear enlaces temporales.</p></CardContent></Card>;

  return (
    <section className="mx-auto w-full max-w-5xl">
      <div className="mb-6 overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-surface to-background p-6 shadow-sm sm:p-8"><div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between"><div><Badge variant="secondary" className="mb-3 gap-1"><ShieldCheck className="h-3.5 w-3.5" /> CoreNetwork Storage</Badge><h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Comparte archivos sin complicarte.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Guarda tus archivos en tu biblioteca o crea un enlace temporal que caduca automáticamente, al estilo de un temp hoster.</p></div><div className="grid grid-cols-2 gap-2 text-center text-xs text-muted-foreground"><div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3"><p className="text-lg font-semibold text-foreground">{filesQuery.data?.length ?? 0}</p><span>archivos</span></div><div className="rounded-2xl border border-border/70 bg-background/60 px-4 py-3"><p className="text-lg font-semibold text-foreground">{activeTemps.length}</p><span>temporales</span></div></div></div></div>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-5 grid h-auto w-full grid-cols-3 rounded-2xl bg-muted/70 p-1"><TabsTrigger value="files" className="gap-2 rounded-xl py-2.5"><FolderOpen className="h-4 w-4" />Archivos</TabsTrigger><TabsTrigger value="temp" className="gap-2 rounded-xl py-2.5"><Clock3 className="h-4 w-4" />Temporales</TabsTrigger><TabsTrigger value="mine" className="gap-2 rounded-xl py-2.5"><HardDrive className="h-4 w-4" />Mi espacio</TabsTrigger></TabsList>
        <TabsContent value="files" className="space-y-5"><Card className="border-border/70 bg-surface/60"><CardHeader><CardTitle className="flex items-center gap-2"><FileUp className="h-5 w-5 text-primary" />Subir un archivo</CardTitle></CardHeader><CardContent><UploadZone busy={fileBusy} maxSize={MAX_FILE_SIZE} onFile={(file) => void uploadPermanent(file)} title="Suelta tu archivo aquí" subtitle="Los enlaces de estos archivos son directos y permanentes hasta que los elimines." /></CardContent></Card><div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold">Mis archivos</h3><span className="text-xs text-muted-foreground">50 MB por archivo</span></div>{filesQuery.isLoading ? <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">Cargando archivos…</div> : filesQuery.data?.length ? filesQuery.data.map((file) => <FileRow key={file.id} file={file} onDelete={() => void deleteFile(file)} />) : <div className="rounded-2xl border border-dashed border-border p-10 text-center"><HardDrive className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">Todavía no tienes archivos</p><p className="mt-1 text-sm text-muted-foreground">Sube el primero desde el área superior.</p></div>}</div></TabsContent>
        <TabsContent value="temp" className="space-y-5"><Card className="border-border/70 bg-surface/60"><CardHeader><CardTitle className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-primary" />Temp Hoster</CardTitle></CardHeader><CardContent className="space-y-5"><div className="grid gap-2 sm:grid-cols-5">{TEMP_DURATIONS.map((duration) => <button key={duration.value} type="button" onClick={() => setTempDuration(duration.value)} className={`rounded-xl border px-3 py-2 text-sm transition ${tempDuration === duration.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-surface-hover"}`}>{duration.label}</button>)}</div><UploadZone busy={tempBusy} maxSize={MAX_TEMP_SIZE} onFile={(file) => void uploadTemporary(file)} title="Crea un enlace temporal" subtitle="El enlace deja de funcionar al llegar a la duración elegida." />{lastTempUrl && <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4"><div className="flex items-start gap-3"><Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div className="min-w-0 flex-1"><p className="font-medium">Tu enlace está listo</p><p className="mt-1 break-all text-sm text-muted-foreground">{lastTempUrl}</p></div><Button size="sm" onClick={() => void copyText(lastTempUrl)}><Copy className="mr-2 h-4 w-4" />Copiar</Button></div></div>}<div className="flex gap-3 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4 shrink-0" /><p>Los temporales viven en un bucket privado y se comparten mediante enlaces firmados. No contienen permisos para borrar o modificar el archivo.</p></div></CardContent></Card><div className="space-y-3"><div className="flex items-center justify-between"><h3 className="font-semibold">Temporales activos</h3><span className="text-xs text-muted-foreground">100 MB por archivo</span></div>{tempQuery.isLoading ? <div className="rounded-xl border border-border p-6 text-center text-sm text-muted-foreground">Cargando temporales…</div> : activeTemps.length ? activeTemps.map((file) => <FileRow key={file.id} file={file} temporary onDelete={() => void deleteFile(file, true)} />) : <div className="rounded-2xl border border-dashed border-border p-10 text-center"><Clock3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No hay enlaces temporales activos</p><p className="mt-1 text-sm text-muted-foreground">Crea uno arriba y podrás copiarlo al instante.</p></div>}</div></TabsContent>
        <TabsContent value="mine" className="space-y-5"><Card className="border-border/70 bg-surface/60"><CardHeader><CardTitle>Tu espacio en CoreNetwork</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-background p-4"><p className="text-xs text-muted-foreground">Archivos permanentes</p><p className="mt-1 text-2xl font-bold">{filesQuery.data?.length ?? 0}</p></div><div className="rounded-2xl bg-background p-4"><p className="text-xs text-muted-foreground">Temporales activos</p><p className="mt-1 text-2xl font-bold">{activeTemps.length}</p></div><div className="rounded-2xl bg-background p-4"><p className="text-xs text-muted-foreground">Espacio usado</p><p className="mt-1 text-2xl font-bold">{formatBytes((filesQuery.data ?? []).reduce((sum, file) => sum + file.size_bytes, 0))}</p></div></CardContent></Card><div className="rounded-2xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground"><p className="font-medium text-foreground">Buenas prácticas</p><ul className="mt-2 list-disc space-y-1 pl-5"><li>No subas información privada o sensible a enlaces públicos.</li><li>Los enlaces temporales son adecuados para compartir algo durante un tiempo limitado.</li><li>Los archivos bloqueados por seguridad no se pueden alojar.</li></ul></div></TabsContent>
      </Tabs>
    </section>
  );
}
