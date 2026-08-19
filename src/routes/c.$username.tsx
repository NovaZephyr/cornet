import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ReportDialog } from "@/components/ReportDialog";
import { useAuth } from "@/hooks/useAuth";
import { ChannelLayoutStyles } from "@/design-library/ChannelLayoutStyles";
import { ChannelLayout } from "@/design-library/channel-layouts";
import { useChannelData } from "@/design-library/useChannelData";
import type { ChannelLayoutProps } from "@/design-library/channel-data";

export const Route = createFileRoute("/c/$username")({
  head: () => ({ meta: [{ title: "Canal — Cornet" }] }),
  component: Channel,
});

function Channel() {
  const { username } = Route.useParams();
  const { user } = useAuth();
  const { data, isLoading, error, toggleSubscription } = useChannelData(username);
  const [reportOpen, setReportOpen] = useState(false);

  const openReport = () => {
    if (!user) {
      toast.error("Inicia sesión para denunciar");
      return;
    }
    setReportOpen(true);
  };

  if (isLoading) {
    return <AppShell><p className="py-24 text-center text-muted-foreground">Cargando canal…</p></AppShell>;
  }

  if (error || !data) {
    return <AppShell><p className="py-24 text-center text-muted-foreground">Este canal no existe.</p></AppShell>;
  }

  const layoutId = data.profile.channel_style ?? "corenetwork";
  const layoutProps: ChannelLayoutProps = {
    data,
    onSubscribe: () => void toggleSubscription(),
    onReport: openReport,
  };
  const hideSidebar = layoutId !== "corenetwork";

  return (
    <AppShell hideSidebar={hideSidebar}>
      <ChannelLayoutStyles layoutId={layoutId} />
      <div className={hideSidebar ? "cn-retro-scope" : undefined}>
        <ChannelLayout {...layoutProps} />
      </div>
      <ReportDialog
        target={{ type: "channel", id: data.profile.id, name: data.profile.display_name || data.profile.username }}
        open={reportOpen}
        onOpenChange={setReportOpen}
      />
    </AppShell>
  );
}
