import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBannerIcon } from "@/lib/icons";

type SiteBannerRow = {
  message: string;
  color: string;
  icon: string | null;
  dismissible: boolean;
  is_active: boolean;
  updated_at: string;
};

const DISMISS_KEY = "corenetwork:banner-dismissed-at";

export function SiteBanner() {
  const [dismissed, setDismissed] = useState(false);

  const { data: banner } = useQuery({
    queryKey: ["site-banner"],
    queryFn: async () => {
      const { data } = await supabase.from("site_banner").select("*").eq("id", true).maybeSingle();
      return (data as SiteBannerRow) ?? null;
    },
    refetchInterval: 60_000, // revisa cada minuto por si un admin lo cambia
  });

  useEffect(() => {
    if (!banner) return;
    const stored = localStorage.getItem(DISMISS_KEY);
    // Si el banner se actualizó después de que lo cerraste, vuelve a mostrarse
    setDismissed(!!stored && stored === banner.updated_at);
  }, [banner]);

  if (!banner || !banner.is_active || !banner.message || dismissed) return null;

  const Icon = getBannerIcon(banner.icon);

  return (
    <div
      className="flex items-center gap-2 px-4 py-2 text-center text-sm font-medium text-black"
      style={{ backgroundColor: banner.color }}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{banner.message}</span>
      {banner.dismissible && (
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, banner.updated_at);
            setDismissed(true);
          }}
          className="shrink-0 rounded-full p-0.5 hover:bg-black/10"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
