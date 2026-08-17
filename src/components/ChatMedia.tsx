import { useEffect, useState } from "react";
import { Image as ImageIcon, Link2, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TwemojiPicker } from "@/components/TwemojiTools";
import { supabase } from "@/integrations/supabase/client";

type KlipyGif = { id: string; title?: string; url: string; preview?: string; source?: string };

function normalizeGifUrl(value: string) {
  const raw = value.trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();
    if (path.endsWith(".gif") || host.includes("giphy.com") || host.includes("tenor.com") || host.includes("klipy.com") || host.includes("klipy.co")) return url.toString();
  } catch { return null; }
  return null;
}

export function isGifMessage(content: string) {
  return content.startsWith("[gif]") && !!normalizeGifUrl(content.slice(5));
}

export function getGifUrl(content: string) {
  return isGifMessage(content) ? normalizeGifUrl(content.slice(5)) : null;
}

async function searchKlipy(query: string) {
  const { data, error } = await supabase.functions.invoke("klipy-search", {
    body: { query, limit: 24 },
  });
  if (error) throw new Error(error.message || "No se pudieron cargar los GIFs.");
  if (data?.error) {
    if (data.error === "KLIPY_API_KEY_NOT_CONFIGURED") throw new Error("La API de KLIPY aún no está configurada en el servidor.");
    throw new Error(data.error === "KLIPY_REQUEST_FAILED" ? `KLIPY respondió ${data.status ?? "con un error"}.` : "No se pudieron cargar los GIFs.");
  }
  return (data?.gifs ?? []) as KlipyGif[];
}

export function ChatMediaPicker({ onGif }: { onEmoji: (emoji: string) => void; onGif: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"klipy" | "link">("klipy");
  const [gifUrl, setGifUrl] = useState("");
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<KlipyGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadKlipy = async (term = query) => {
    setLoading(true); setError("");
    try { setGifs(await searchKlipy(term)); }
    catch (e) { setError(e instanceof Error ? e.message : "No se pudieron cargar los GIFs."); }
    finally { setLoading(false); }
  };
  useEffect(() => { if (open && mode === "klipy" && !gifs.length && !error) void loadKlipy(""); }, [open, mode]);

  const submitGif = () => { const normalized = normalizeGifUrl(gifUrl); if (!normalized) return; onGif(normalized); setGifUrl(""); setOpen(false); };
  const pickGif = (url: string) => { onGif(url); setOpen(false); };

  return <div className="relative flex items-center gap-1">
    <TwemojiPicker label="Insertar emoji en Messenger" />
    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" title="GIF" onClick={() => setOpen((value) => !value)}><ImageIcon className="h-5 w-5" /></Button>
    {open && <div className="absolute bottom-12 left-0 z-50 w-[340px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
      <div className="flex items-center justify-between border-b border-border px-3 py-2"><span className="text-sm font-semibold text-foreground">GIFs</span><span className="text-[10px] font-medium text-muted-foreground">Powered by KLIPY</span></div>
      <div className="flex border-b border-border p-1"><button type="button" onClick={() => setMode("klipy")} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${mode === "klipy" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}>Buscar GIFs</button><button type="button" onClick={() => setMode("link")} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium ${mode === "link" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}><Link2 className="mr-1 inline h-3.5 w-3.5"/>Pegar enlace</button></div>
      {mode === "klipy" ? <div className="p-3"><form className="mb-3 flex gap-1.5" onSubmit={(e) => { e.preventDefault(); void loadKlipy(); }}><div className="relative flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search KLIPY" className="h-9 pl-8"/></div><Button type="submit" size="icon" className="h-9 w-9" disabled={loading}>{loading ? <Loader2 className="h-4 w-4 animate-spin"/> : <Search className="h-4 w-4"/>}</Button></form>
        {error ? <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs text-muted-foreground"><p>{error}</p><button type="button" className="mt-2 text-primary underline" onClick={() => setMode("link")}>Usar un enlace directo mientras se configura KLIPY</button></div> : <div className="grid max-h-[300px] grid-cols-3 gap-1.5 overflow-y-auto">{gifs.map((gif) => <button type="button" key={gif.id} onClick={() => pickGif(gif.url)} className="group aspect-square overflow-hidden rounded-lg bg-muted" title={gif.title}><img src={gif.preview || gif.url} alt={gif.title || "GIF"} loading="lazy" className="h-full w-full object-cover transition-transform group-hover:scale-105"/></button>)}{!loading && !gifs.length && <p className="col-span-3 py-8 text-center text-xs text-muted-foreground">No encontramos GIFs.</p>}</div>}
        <p className="mt-2 text-[10px] text-muted-foreground">Search KLIPY · GIFs proporcionados por KLIPY</p>
      </div> : <div className="space-y-3 p-3"><p className="text-xs leading-5 text-muted-foreground">Pega un enlace directo a un GIF. También aceptamos enlaces de GIPHY, Tenor y KLIPY.</p><Input autoFocus value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitGif(); } }} placeholder="https://.../animation.gif"/><Button type="button" className="w-full" disabled={!normalizeGifUrl(gifUrl)} onClick={submitGif}>Insertar GIF</Button></div>}
    </div>}
  </div>;
}
