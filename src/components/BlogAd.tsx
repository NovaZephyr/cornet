import { useEffect } from "react";
import { ExternalLink, Megaphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SignedImage } from "@/components/Media";
import { Button } from "@/components/ui/button";

type BlogAd = { id: string; title: string; body: string | null; image_path: string | null; target_url: string; slot: string };

export function BlogAd({ slot = "article-top" }: { slot?: BlogAd["slot"] }) {
  const { data: ads } = useQuery({
    queryKey: ["blog-ads", slot],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_ads")
        .select("id,title,body,image_path,target_url,slot")
        .eq("slot", slot)
        .eq("status", "active")
        .or("starts_at.is.null,starts_at.lte.now()")
        .or("ends_at.is.null,ends_at.gte.now()")
        .order("created_at", { ascending: false })
        .limit(1);
      if (error) throw error;
      return (data ?? []) as BlogAd[];
    },
    staleTime: 60_000,
  });

  const ad = ads?.[0];
  useEffect(() => {
    if (!ad) return;
    void supabase.rpc("record_blog_ad_impression", { _ad_id: ad.id });
  }, [ad]);

  if (!ad) return null;
  const click = () => { void supabase.rpc("record_blog_ad_click", { _ad_id: ad.id }); };

  return (
    <aside className="rounded-2xl border border-border bg-surface/80 p-4 shadow-sm" aria-label="Publicidad">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <Megaphone className="h-3.5 w-3.5" /> Publicidad
      </div>
      <a href={ad.target_url} target="_blank" rel="noopener noreferrer" onClick={click} className="group block">
        {ad.image_path ? <SignedImage path={ad.image_path} alt={ad.title} className="mb-3 max-h-72 w-full rounded-xl object-cover" /> : null}
        <h2 className="text-base font-semibold group-hover:underline">{ad.title}</h2>
        {ad.body ? <p className="mt-1 text-sm text-muted-foreground">{ad.body}</p> : null}
        <Button variant="link" className="mt-1 h-auto px-0 text-sm">
          Ver anuncio <ExternalLink className="ml-1 h-3.5 w-3.5" />
        </Button>
      </a>
    </aside>
  );
}
