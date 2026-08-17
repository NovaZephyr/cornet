import { useEffect, useMemo, useRef, useState } from "react";
import twemoji from "@twemoji/api";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const TWEMOJI_BASE = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/";
const RECENT_KEY = "cornet-twemoji-recent";

const CATEGORIES = [
  { id: "recent", label: "Recientes", emojis: [] as string[] },
  { id: "smileys", label: "Caritas", emojis: [
    "😀","😃","😄","😁","😆","😅","😂","🤣","😊","😇","🙂","🙃","😉","😌","😍","🥰","😘","😗","😙","😚","😋","😛","😝","😜","🤪","🤨","🧐","🤓","😎","🤩","🥳","😏","😒","😞","😔","😟","😕","🙁","☹️","😣","😖","😫","😩","🥺","😢","😭","😤","😠","😡","🤬","🤯","😳","🥵","🥶","😱","😨","😰","😥","😓","🤗","🤔","🤭","🤫","🤥","😶","😐","😑","😬","🙄","😯","😦","😧","😮","😲","🥱","😴","🤤","😪","😵","🤐","🥴","🤢","🤮","🤧","😷","🤒","🤕"
  ] },
  { id: "people", label: "Personas", emojis: [
    "👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","👇","☝️","✋","🤚","🖐️","🖖","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","💪","❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","🔥","✨","⭐","🌟","💫","💥","💯","💢","💦","💨"
  ] },
  { id: "animals", label: "Animales", emojis: [
    "🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🕷️","🐢","🐍","🦎","🦂","🐙","🦑","🦀","🐠","🐟","🐡","🐬","🐳","🦈","🐊","🐘","🦒","🦓","🦍","🐪","🐫"
  ] },
  { id: "food", label: "Comida", emojis: [
    "🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🥑","🍆","🥔","🥕","🌽","🌶️","🥒","🥬","🥦","🧄","🧅","🍞","🥐","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍔","🍟","🍕","🌭","🥪","🌮","🌯","🍿","🍣","🍜","🍚","🍦","🍩","🍪","🎂","🍰","🍫","🍭","🍬","☕","🍺","🍻"
  ] },
  { id: "travel", label: "Viajes", emojis: [
    "🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🛵","🏍️","🚲","✈️","🚀","🛸","🚁","⛵","🚤","🚢","⚓","🏠","🏡","🏢","🏥","🏦","🏫","🏰","🗼","🗽","⛪","🕌","🛕","🌋","🏕️","🏖️","🏝️","🏜️","🌅","🌄","🌇","🌃","🌌","🌉","🎡","🎢","🎠"
  ] },
  { id: "objects", label: "Objetos", emojis: [
    "⌚","📱","💻","⌨️","🖥️","🖨️","📷","📸","📹","🎥","☎️","📞","📺","📻","🎙️","💡","🔦","💰","💳","💎","🔑","🔒","🔓","🛠️","🔨","⚙️","🧰","📌","📍","✂️","📝","📖","📚","✏️","🖊️","📎","📁","📂","🗂️","📅","🗓️","📈","📉","📊","💾","💿","📀","🎮","🕹️","🎧","🎤","🎸","🎹","🥁","🎺","🎷"
  ] },
  { id: "symbols", label: "Símbolos", emojis: [
    "✅","❌","⭕","❗","❓","‼️","⁉️","⚠️","🚫","🔞","💤","♻️","⚡","☀️","🌙","⭐","☁️","☔","❄️","☃️","⚽","🏀","🏈","⚾","🎾","🏐","🏆","🥇","🥈","🥉","🎯","🎉","🎊","🎁","🎈","🎂","❤️","☮️","☯️","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓"
  ] },
] as const;

function twemojiHtml(emoji: string) {
  return twemoji.parse(emoji, { folder: "svg", ext: ".svg", className: "twemoji-picker-icon", base: TWEMOJI_BASE });
}

function insertIntoEditable(emoji: string, preferred: Element | null) {
  const target = preferred ?? document.activeElement;
  if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    const next = `${target.value.slice(0, start)}${emoji}${target.value.slice(end)}`;
    const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(target), "value")?.set;
    setter?.call(target, next);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.focus();
    const cursor = start + emoji.length;
    target.setSelectionRange(cursor, cursor);
    return true;
  }
  if (target instanceof HTMLElement && target.isContentEditable) {
    target.focus();
    const selection = window.getSelection();
    if (!selection?.rangeCount) return false;
    const range = selection.getRangeAt(0);
    range.deleteContents();
    range.insertNode(document.createTextNode(emoji));
    range.collapse(false);
    target.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: emoji }));
    return true;
  }
  return false;
}

function EmojiIcon({ emoji, size = 22 }: { emoji: string; size?: number }) {
  return <span aria-hidden="true" className="inline-flex shrink-0" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: twemojiHtml(emoji) }} />;
}

export function TwemojiPicker({ className, label: ariaLabel = "Insertar emoji" }: { className?: string; label?: string }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("smileys");
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState<string[]>([]);
  const lastEditable = useRef<Element | null>(null);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
      if (Array.isArray(saved)) setRecent(saved.filter((x): x is string => typeof x === "string").slice(0, 24));
    } catch { /* ignore */ }
    const remember = (event: FocusEvent) => {
      const target = event.target as Element | null;
      if (!target || target.closest("[data-twemoji-picker]") || target.matches("input[data-twemoji-picker-search]")) return;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable)) lastEditable.current = target;
    };
    document.addEventListener("focusin", remember);
    return () => document.removeEventListener("focusin", remember);
  }, []);

  const activeEmojis = useMemo(() => {
    if (category === "recent") return recent;
    return CATEGORIES.find((item) => item.id === category)?.emojis ?? [];
  }, [category, recent]);

  const visibleEmojis = useMemo(() => activeEmojis.filter((emoji) => !query || emoji.includes(query)), [activeEmojis, query]);

  const choose = (emoji: string) => {
    if (!insertIntoEditable(emoji, lastEditable.current)) return;
    const next = [emoji, ...recent.filter((item) => item !== emoji)].slice(0, 24);
    setRecent(next);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    setOpen(false);
  };

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button data-twemoji-picker variant="ghost" size="icon" className={cn("rounded-full", className)} aria-label={ariaLabel} title={ariaLabel}><Smile className="h-5 w-5" /></Button>
    </PopoverTrigger>
    <PopoverContent data-twemoji-picker className="w-[360px] max-w-[calc(100vw-24px)] p-2" align="end">
      <div className="space-y-2">
        <Input data-twemoji-picker-search value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por emoji…" className="h-9" />
        <div className="flex gap-1 overflow-x-auto pb-1">
          {CATEGORIES.map((item) => <button key={item.id} type="button" title={item.label} onClick={() => setCategory(item.id)} className={cn("flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-xs transition", category === item.id ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{item.id === "recent" ? "🕘" : item.emojis[0] ? <EmojiIcon emoji={item.emojis[0]} size={18} /> : null}</button>)}
        </div>
        <div className="grid max-h-72 grid-cols-8 gap-1 overflow-y-auto pr-1">
          {visibleEmojis.map((emoji, index) => <button key={`${emoji}-${index}`} type="button" title={`Usar ${emoji}`} onClick={() => choose(emoji)} className="flex aspect-square items-center justify-center rounded-lg p-1 text-xl transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><EmojiIcon emoji={emoji} size={27} /></button>)}
          {!visibleEmojis.length && <p className="col-span-8 py-8 text-center text-sm text-muted-foreground">No hay emojis para esa búsqueda.</p>}
        </div>
      </div>
    </PopoverContent>
  </Popover>;
}

export function useTwemojiDomRenderer() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".cn-2012-app");
    if (!root) return;
    let processing = false;
    const render = () => {
      if (processing) return;
      processing = true;
      try {
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        const nodes: Text[] = [];
        let current: Node | null = walker.nextNode();
        while (current) {
          const text = current as Text;
          const parent = text.parentElement;
          if (parent && !parent.closest("script,style,textarea,input,select,option") && !parent.closest(".twemoji-picker-icon") && /\p{Extended_Pictographic}/u.test(text.nodeValue ?? "")) nodes.push(text);
          current = walker.nextNode();
        }
        for (const textNode of nodes) {
          if (!textNode.parentNode) continue;
          const holder = document.createElement("span");
          holder.textContent = textNode.nodeValue ?? "";
          twemoji.parse(holder, { folder: "svg", ext: ".svg", className: "twemoji", base: TWEMOJI_BASE });
          holder.querySelectorAll<HTMLImageElement>("img.twemoji").forEach((img) => {
            img.style.height = "1em";
            img.style.width = "1em";
            img.style.verticalAlign = "-0.15em";
            img.style.display = "inline-block";
            img.draggable = false;
            img.alt = "";
          });
          const fragment = document.createDocumentFragment();
          while (holder.firstChild) fragment.appendChild(holder.firstChild);
          textNode.parentNode.replaceChild(fragment, textNode);
        }
      } finally {
        processing = false;
      }
    };
    render();
    const observer = new MutationObserver(() => render());
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);
}
