import { useState } from "react";
import { Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TwemojiPicker } from "@/components/TwemojiTools";

function normalizeGifUrl(value: string) {
  const raw = value.trim();
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    const path = url.pathname.toLowerCase();
    if (path.endsWith(".gif") || host.includes("giphy.com") || host.includes("tenor.com") || host.includes("klipy.com") || host.includes("klipy.co")) return url.toString();
  } catch {
    return null;
  }
  return null;
}

export function isGifMessage(content: string) {
  return content.startsWith("[gif]") && !!normalizeGifUrl(content.slice(5));
}

export function getGifUrl(content: string) {
  return isGifMessage(content) ? normalizeGifUrl(content.slice(5)) : null;
}

export function ChatMediaPicker({ onGif }: { onEmoji: (emoji: string) => void; onGif: (url: string) => void }) {
  const [open, setOpen] = useState(false);
  const [gifUrl, setGifUrl] = useState("");
  const submitGif = () => { const normalized = normalizeGifUrl(gifUrl); if (!normalized) return; onGif(normalized); setGifUrl(""); setOpen(false); };
  return <div className="relative flex items-center gap-1">
    <TwemojiPicker label="Insertar emoji en Messenger" />
    <Button type="button" variant="ghost" size="icon" className="h-9 w-9" title="GIF" onClick={() => setOpen((value) => !value)}><ImageIcon className="h-5 w-5" /></Button>
    {open && <div className="absolute bottom-12 left-0 z-50 w-[310px] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"><div className="flex items-center justify-between border-b border-border px-3 py-2"><span className="text-sm font-semibold text-foreground">GIF</span></div><div className="space-y-3 p-3"><p className="text-xs leading-5 text-muted-foreground">Pega un enlace directo a un GIF. Cornet mostrará el GIF en el mensaje.</p><Input autoFocus value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitGif(); } }} placeholder="https://.../animation.gif" /><Button type="button" className="w-full" disabled={!normalizeGifUrl(gifUrl)} onClick={submitGif}>Insertar GIF</Button></div></div>}
  </div>;
}
