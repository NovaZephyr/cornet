import { useEffect, useState, type CSSProperties } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBannerIcon } from "@/lib/icons";
import { getSignedUrl } from "@/lib/storage";
import { fetchRelatedVideos } from "@/lib/queries";
import { useTheme } from "@/hooks/useTheme";
import "./site-banner-cosmic.css";

type SiteBannerRow = {
  message: string;
  color: string;
  icon: string | null;
  dismissible: boolean;
  is_active: boolean;
  updated_at: string;
  link_url: string | null;
  link_label: string | null;
};

type WatchRecommendation = { code: string; title: string; thumbnail_path: string | null };
const DISMISS_KEY = "corenetwork:banner-dismissed-at";

function CosmicWatchEnhancer() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search as Record<string, unknown> });
  const { theme } = useTheme();
  useEffect(() => {
    if (theme !== "cosmic-panda" || pathname !== "/watch") return;
    const code = typeof search.v === "string" ? search.v : "";
    let disposed = false; let observer: MutationObserver | null = null; let cleanupPlayer: (() => void) | null = null;
    const setup = async () => {
      if (!code) return;
      const { data: video } = await supabase.from("videos").select("id,user_id,category,code,title,thumbnail_path").eq("code", code).maybeSingle();
      if (disposed || !video) return;
      let related: WatchRecommendation[] = [];
      try { related = ((await fetchRelatedVideos({ id: video.id, user_id: video.user_id, category: video.category }, 12)) ?? []).map((row) => ({ code: row.code, title: row.title, thumbnail_path: row.thumbnail_path ?? null })); } catch { related = []; }
      const mount = () => {
        if (disposed) return false;
        const shell = document.querySelector<HTMLElement>("[data-corenet-player]"); const player = shell?.firstElementChild as HTMLElement | null;
        if (!shell || !player) return false;
        shell.classList.add("cn-retro-watch-size-shell"); player.classList.add("cn-retro-watch-player"); player.classList.remove("rounded-2xl", "rounded-xl", "rounded-lg");
        if (!player.querySelector(".cn-retro-size-rail")) {
          const rail = document.createElement("div"); rail.className = "cn-retro-size-rail"; rail.setAttribute("aria-label", "Tamaño del video");
          rail.innerHTML = [["small", "S", "Pequeño"], ["medium", "M", "Mediano"], ["large", "L", "Grande"], ["fullscreen", "F", "Pantalla completa"]].map(([size,label,title]) => `<button type="button" data-retro-size="${size}" title="${title}" aria-label="${title}">${label}</button>`).join("");
          const setSize = (size: string) => { shell.dataset.retroSize = size; rail.querySelectorAll<HTMLButtonElement>("button[data-retro-size]").forEach((button) => button.classList.toggle("is-active", button.dataset.retroSize === size)); if (size === "fullscreen") void player.requestFullscreen?.().catch(() => undefined); };
          rail.addEventListener("click", (event) => { const target = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-retro-size]"); if (!target) return; const size = target.dataset.retroSize ?? "large"; if (size !== "fullscreen" && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined); setSize(size); });
          player.appendChild(rail); cleanupPlayer = () => { rail.remove(); shell.removeAttribute("data-retro-size"); shell.classList.remove("cn-retro-watch-size-shell"); player.classList.remove("cn-retro-watch-player"); }; setSize("large");
        }
        if (!document.querySelector(".cn-retro-watch-filmstrip")) {
          const strip = document.createElement("section"); strip.className = "cn-retro-watch-filmstrip"; strip.setAttribute("aria-label", "Lista de reproducción"); const track = document.createElement("div"); track.className = "cn-retro-watch-filmstrip-track";
          if (!related.length) track.innerHTML = '<span class="cn-retro-watch-filmstrip-empty">No hay recomendaciones disponibles.</span>'; else for (const item of related) { const anchor = document.createElement("a"); anchor.className = "cn-retro-watch-filmstrip-item"; anchor.href = `/watch?v=${encodeURIComponent(item.code)}`; anchor.title = item.title; const image = document.createElement("img"); image.alt = ""; image.loading = "lazy"; image.className = "cn-retro-watch-filmstrip-thumb"; if (item.thumbnail_path) void getSignedUrl(item.thumbnail_path).then((url) => { if (!disposed && url) image.src = url; }); const title = document.createElement("span"); title.className = "cn-retro-watch-filmstrip-title"; title.textContent = item.title; anchor.append(image, title); track.appendChild(anchor); }
          strip.appendChild(track); shell.insertAdjacentElement("afterend", strip);
        }
        return true;
      };
      if (!mount()) { observer = new MutationObserver(() => { if (mount()) observer?.disconnect(); }); observer.observe(document.body, { childList: true, subtree: true }); }
    };
    void setup();
    return () => { disposed = true; observer?.disconnect(); cleanupPlayer?.(); document.querySelectorAll(".cn-retro-watch-filmstrip").forEach((element) => element.remove()); };
  }, [pathname, search.v, theme]);
  return null;
}

export function SiteBanner() {
  const [dismissed, setDismissed] = useState(false);
  const { data: banner } = useQuery({ queryKey: ["site-banner"], queryFn: async () => { const { data } = await supabase.from("site_banner").select("*").eq("id", true).maybeSingle(); return (data as SiteBannerRow) ?? null; }, refetchInterval: 60_000 });
  useEffect(() => { if (!banner) return; const stored = localStorage.getItem(DISMISS_KEY); setDismissed(!!stored && stored === banner.updated_at); }, [banner]);
  const Icon = getBannerIcon(banner?.icon);
  const isExternal = !!banner?.link_url && /^https?:\/\//i.test(banner.link_url);
  return <>
    <CosmicWatchEnhancer />
    {banner && banner.is_active && banner.message && !dismissed && <div className="cn-site-banner" style={{ "--cn-banner-color": banner.color } as CSSProperties} role="status">
      <div className="cn-site-banner-mark" aria-hidden="true" />
      {Icon && <Icon className="cn-site-banner-icon" aria-hidden="true" />}
      <span className="cn-site-banner-label">AVISO</span>
      <span className="cn-site-banner-message">{banner.message}</span>
      {banner.link_url && <a className="cn-site-banner-link" href={banner.link_url} target={isExternal ? "_blank" : undefined} rel={isExternal ? "noopener noreferrer" : undefined}>{banner.link_label || "Ver más"}</a>}
      {banner.dismissible && <button type="button" aria-label="Cerrar aviso" onClick={() => { localStorage.setItem(DISMISS_KEY, banner.updated_at); setDismissed(true); }} className="cn-site-banner-close"><X className="h-4 w-4" /></button>}
    </div>}
  </>;
}
