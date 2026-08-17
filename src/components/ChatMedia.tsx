import { useMemo, useState } from "react";
import { Smile, Image as ImageIcon, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EMOJIS = [
  "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😎","🤓","🤩","🥳","😏","😢","😭","😡","🤬","😱","😳","🤔","🤨","😴","🤗","🤭","🤫","🫡","🫠","🙄","😬","😮","😯","😲","🥺","😤","😈","💀","👻","🤖","💩","👍","👎","👏","🙌","🙏","🤝","💪","❤️","🧡","💛","💚","💙","💜","🖤","🤍","💯","🔥","✨","⭐","🎉","🎊","🚀","🎯","💎","🌟"
];

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

export function ChatMediaPicker({ onEmoji, onGif }: { onEmoji: (emoji: string) => void; onGif: (url: string) => void }) {
  const [open, setOpen] = useState<"emoji" | "gif" | null>(null);
  const [query, setQuery] = useState("");
  const [gifUrl, setGifUrl] = useState("");
  const filtered = useMemo(() => EMOJIS.filter((emoji) => !query || emoji.includes(query)), [query]);

  const submitGif = () => {
    const normalized = normalizeGifUrl(gifUrl);
    if (!normalized) return;
    onGif(normalized);
    setGifUrl("");
    setOpen(null);
  };

  return (
    <div className="relative flex items-center gap-1">
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-white/60 hover:bg-white/10 hover:text-white" title="Emojis" onClick={() => setOpen(open === "emoji" ? null : "emoji")}>
        <Smile className="h-5 w-5" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9 text-white/60 hover:bg-white/10 hover:text-white" title="GIF" onClick={() => setOpen(open === "gif" ? null : "gif")}>
        <ImageIcon className="h-5 w-5" />
      </Button>
      {open && (
        <div className="absolute bottom-12 left-0 z-50 w-[310px] overflow-hidden rounded-2xl border border-white/10 bg-[#11131a] shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <span className="text-sm font-semibold text-white">{open === "emoji" ? "Emojis" : "GIF"}</span>
            <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-white/50" onClick={() => setOpen(null)}><X className="h-4 w-4" /></Button>
          </div>
          {open === "emoji" ? (
            <div className="p-3">
              <div className="relative mb-3"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" /><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar emoji" className="h-9 border-white/10 bg-white/5 pl-8 text-white placeholder:text-white/30" /></div>
              <div className="grid max-h-56 grid-cols-8 gap-1 overflow-y-auto">{filtered.map((emoji, index) => <button key={`${emoji}-${index}`} type="button" onClick={() => { onEmoji(emoji); setOpen(null); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-xl transition hover:bg-white/10">{emoji}</button>)}</div>
            </div>
          ) : (
            <div className="space-y-3 p-3">
              <p className="text-xs leading-5 text-white/50">Pega un enlace directo a un GIF. El enlace no aparecerá en el mensaje: Cornet mostrará solo el GIF.</p>
              <Input autoFocus value={gifUrl} onChange={(e) => setGifUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submitGif(); } }} placeholder="https://.../animation.gif" className="border-white/10 bg-white/5 text-white placeholder:text-white/30" />
              <Button type="button" className="w-full" disabled={!normalizeGifUrl(gifUrl)} onClick={submitGif}>Insertar GIF</Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
