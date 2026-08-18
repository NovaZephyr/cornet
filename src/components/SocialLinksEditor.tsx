import { useMemo, useState } from "react";
import { Facebook, Github, Instagram, Linkedin, MessageCircle, Plus, Twitch, Twitter, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SocialPlatform = "youtube" | "instagram" | "x" | "tiktok" | "twitch" | "discord" | "github" | "facebook" | "linkedin";
export type SocialLink = { platform: SocialPlatform; url: string };

export const SOCIAL_PLATFORMS: Array<{ value: SocialPlatform; label: string; Icon: typeof Youtube }> = [
  { value: "youtube", label: "YouTube", Icon: Youtube },
  { value: "instagram", label: "Instagram", Icon: Instagram },
  { value: "x", label: "X", Icon: Twitter },
  { value: "tiktok", label: "TikTok", Icon: MessageCircle },
  { value: "twitch", label: "Twitch", Icon: Twitch },
  { value: "discord", label: "Discord", Icon: MessageCircle },
  { value: "github", label: "GitHub", Icon: Github },
  { value: "facebook", label: "Facebook", Icon: Facebook },
  { value: "linkedin", label: "LinkedIn", Icon: Linkedin },
];

export function normalizeSocialLinks(value: unknown): SocialLink[] {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(SOCIAL_PLATFORMS.map((item) => item.value));
  return value
    .filter((item): item is { platform: SocialPlatform; url: string } => Boolean(item) && typeof item === "object" && allowed.has((item as { platform?: SocialPlatform }).platform ?? "") && typeof (item as { url?: unknown }).url === "string")
    .map((item) => ({ platform: item.platform, url: item.url.trim() }))
    .filter((item) => item.url.length > 0);
}

export function SocialLinksEditor({ value, onChange }: { value: SocialLink[]; onChange: (value: SocialLink[]) => void }) {
  const [platform, setPlatform] = useState<SocialPlatform>("youtube");
  const available = useMemo(() => SOCIAL_PLATFORMS.filter((item) => !value.some((social) => social.platform === item.value)), [value]);
  const add = () => { if (!available.some((item) => item.value === platform)) return; onChange([...value, { platform, url: "" }]); };
  const update = (index: number, url: string) => onChange(value.map((item, i) => i === index ? { ...item, url } : item));
  const remove = (index: number) => onChange(value.filter((_, i) => i !== index));

  return <section className="space-y-4 rounded-2xl border border-border bg-background p-4">
    <div><h3 className="font-semibold">Redes sociales</h3><p className="mt-1 text-xs text-muted-foreground">Selecciona una plataforma y añade el enlace a tu perfil. Puedes añadir varias.</p></div>
    <div className="flex flex-col gap-2 sm:flex-row">
      <Select value={platform} onValueChange={(next) => setPlatform(next as SocialPlatform)}>
        <SelectTrigger className="sm:w-56"><SelectValue placeholder="Selecciona una red" /></SelectTrigger>
        <SelectContent>{available.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
      </Select>
      <Button type="button" variant="secondary" onClick={add} disabled={!available.length}><Plus className="mr-2 h-4 w-4" />Añadir red</Button>
    </div>
    <div className="space-y-3">
      {value.map((item, index) => {
        const meta = SOCIAL_PLATFORMS.find((candidate) => candidate.value === item.platform)!;
        const Icon = meta.Icon;
        return <div key={`${item.platform}-${index}`} className="rounded-xl border border-border bg-surface p-3">
          <div className="mb-2 flex items-center gap-2"><Icon className="h-4 w-4" /><Label>{meta.label}</Label><Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => remove(index)}>Quitar</Button></div>
          <Input value={item.url} onChange={(e) => update(index, e.target.value)} placeholder={`https://...`} inputMode="url" />
        </div>;
      })}
      {!value.length && <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Todavía no has añadido ninguna red social.</p>}
    </div>
  </section>;
}
