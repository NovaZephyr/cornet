import { useEffect } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/watch/$videoId")({ component: LegacyWatchRedirect });

function LegacyWatchRedirect() {
  const { videoId } = Route.useParams();

  useEffect(() => {
    let cancelled = false;

    const resolveVideo = async () => {
      const byId = await supabase.from("videos").select("code").eq("id", videoId).maybeSingle();
      const match = byId.data
        ? byId.data
        : (await supabase.from("videos").select("code").eq("code", videoId).maybeSingle()).data;

      if (cancelled) return;
      if (match?.code) {
        window.location.replace(`/watch?v=${encodeURIComponent(match.code)}`);
        return;
      }

      window.history.replaceState({}, "", "/watch");
    };

    void resolveVideo();
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl py-24 text-center">
        <p className="text-sm text-muted-foreground">Abriendo video…</p>
      </div>
    </AppShell>
  );
}
