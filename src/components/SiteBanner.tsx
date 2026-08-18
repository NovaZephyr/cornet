import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getBannerIcon } from "@/lib/icons";
import "@/site-banner-cosmic.css";

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
    refetchInterval: 60_000,
  });

  useEffect(() => {
    if (!banner) return;
    const stored = localStorage.getItem(DISMISS_KEY);
    setDismissed(!!stored && stored === banner.updated_at);
  }, [banner]);

  if (!banner || !banner.is_active || !banner.message || dismissed) return null;

  const Icon = getBannerIcon(banner.icon);

  return (
    <div
      className="cn-site-banner"
      style={{ "--cn-banner-color": banner.color } as React.CSSProperties}
      role="status"
    >
      <div className="cn-site-banner-mark" aria-hidden="true" />
      {Icon && <Icon className="cn-site-banner-icon" aria-hidden="true" />}
      <span className="cn-site-banner-label">AVISO</span>
      <span className="cn-site-banner-message">{banner.message}</span>
      {banner.dismissible && (
        <button
          type="button"
          aria-label="Cerrar aviso"
          onClick={() => {
            localStorage.setItem(DISMISS_KEY, banner.updated_at);
            setDismissed(true);
          }}
          className="cn-site-banner-close"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
