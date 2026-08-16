import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";

type Report = {
  id: string;
  reporter_id: string;
  target_type: "video" | "channel";
  video_id: string | null;
  channel_id: string | null;
  reason: string;
  details: string;
  status: "pending" | "reviewed" | "dismissed" | "actioned";
  created_at: string;
};

const reasonLabels: Record<string, string> = {
  inappropriate: "Contenido inapropiado",
  spam_abuse: "Spam o abusos",
  under_13: "Usuario menor de 13 años",
  violent_shocking: "Contenido violento o shockante",
  hate_speech: "Discurso de odio",
  other: "Otro",
};

export function AdminReportsSection() {
  const qc = useQueryClient();
  const { data: reports = [], isLoading } = useQuery({
    queryKey: ["admin-content-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("content_reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Report[];
    },
  });

  const setStatus = async (id: string, status: Report["status"]) => {
    const { error } = await supabase
      .from("content_reports")
      .update({ status, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Denuncia actualizada");
    void qc.invalidateQueries({ queryKey: ["admin-content-reports"] });
  };

  if (isLoading) return <p className="py-8 text-center text-muted-foreground">Cargando denuncias…</p>;

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div key={report.id} className="rounded-xl bg-surface p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Denuncia de {report.target_type === "video" ? "video" : "canal"}
                <Badge variant={report.status === "pending" ? "destructive" : "secondary"}>{report.status}</Badge>
              </p>
              <p className="mt-1 text-sm">{reasonLabels[report.reason] ?? report.reason}</p>
              {report.details && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{report.details}</p>}
              <p className="mt-2 text-xs text-muted-foreground">{timeAgo(report.created_at)} · ID: {report.video_id ?? report.channel_id}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => void setStatus(report.id, "reviewed")}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Revisada
              </Button>
              <Button size="sm" variant="outline" onClick={() => void setStatus(report.id, "dismissed")}>
                <XCircle className="mr-1.5 h-4 w-4" /> Descartar
              </Button>
              <Button size="sm" onClick={() => void setStatus(report.id, "actioned")}>Acción tomada</Button>
            </div>
          </div>
        </div>
      ))}
      {reports.length === 0 && <p className="py-12 text-center text-muted-foreground">No hay denuncias.</p>}
    </div>
  );
}
