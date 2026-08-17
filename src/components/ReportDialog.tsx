import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type ReportTarget = { type: "video" | "channel"; id: string; name?: string };

const REASONS = [
  ["inappropriate", "Contenido inapropiado"],
  ["spam_abuse", "Spam o abusos"],
  ["under_13", "Usuario menor de 13 años"],
  ["violent_shocking", "Contenido violento o shockante"],
  ["hate_speech", "Discurso de odio"],
  ["other", "Otro"],
] as const;

export function ReportDialog({ target, open, onOpenChange }: { target: ReportTarget | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!target || !reason) return toast.error("Selecciona un motivo");
    setBusy(true);
    const { error } = await supabase.rpc("submit_content_report", {
      _target_type: target.type,
      _video_id: target.type === "video" ? target.id : undefined,
      _channel_id: target.type === "channel" ? target.id : undefined,
      _reason: reason,
      _details: details.trim(),
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Denuncia enviada. Gracias por avisarnos.");
    setReason("");
    setDetails("");
    onOpenChange(false);
  };

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader><DialogTitle>Denunciar {target?.type === "video" ? "video" : "canal"}</DialogTitle><DialogDescription>Selecciona el motivo de la denuncia y, si quieres, explica brevemente qué ocurre.</DialogDescription></DialogHeader>
    <div className="space-y-2">
      {REASONS.map(([value, label]) => <button key={value} type="button" onClick={() => setReason(value)} className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition-colors ${reason === value ? "border-primary bg-primary/10" : "border-border hover:bg-surface-hover"}`}>{label}</button>)}
    </div>
    <Textarea value={details} onChange={(e) => setDetails(e.target.value)} maxLength={2000} rows={4} placeholder="Di brevemente qué ocurre (opcional)…" />
    <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button disabled={busy || !reason} onClick={() => void submit()}><Flag className="mr-2 h-4 w-4" />{busy ? "Enviando…" : "Enviar denuncia"}</Button></DialogFooter>
  </DialogContent></Dialog>;
}
