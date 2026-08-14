import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Coins, Sparkles, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/partner")({
  head: () => ({
    meta: [
      { title: "Be Partner — CoreNetwork" },
      {
        name: "description",
        content: "Join to the good parter program on CoreNetwork.",
      },
      { property: "og:title", content: "Be Partner — CoreNetwork" },
      { property: "og:description", content: "Partner in CoreNetwork." },
    ],
  }),
  component: PartnerPage,
});

const BENEFITS = [
  { icon: BadgeCheck, title: "Insignia Partner", text: "Distintivo dorado visible en tu canal." },
  { icon: Coins, title: "Monetización", text: "Reparto de ingresos por vistas de tus videos." },
  { icon: TrendingUp, title: "Más alcance", text: "Prioridad en recomendaciones de la portada." },
  { icon: Sparkles, title: "Personalización", text: "Fondos y colores exclusivos para tu canal." },
];

function PartnerPage() {
  const { user, isPartner } = useAuth();
  const qc = useQueryClient();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const { data: application } = useQuery({
    queryKey: ["my-partner-app", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("partner_applications")
        .select("id, status, message, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return (data as { id: string; status: string; message: string } | null) ?? null;
    },
  });

  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("Inicia sesión para postularte");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("partner_applications")
      .insert({ user_id: user.id, message });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessage("");
    void qc.invalidateQueries({ queryKey: ["my-partner-app", user.id] });
    toast.success("Solicitud enviada, la revisaremos pronto");
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl bg-surface p-8 text-center">
          <Badge className="bg-partner text-background">Programa Partner</Badge>
          <h1 className="mt-4 text-3xl font-bold">Convierte tu canal en tu trabajo</h1>
          <p className="mt-2 text-muted-foreground">
            Los creadores Partner obtienen insignia, mejores herramientas y monetización.
          </p>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {BENEFITS.map((b) => (
            <div key={b.title} className="rounded-xl bg-surface p-5">
              <b.icon className="h-6 w-6 text-partner" />
              <h2 className="mt-3 font-semibold">{b.title}</h2>
              <p className="text-sm text-muted-foreground">{b.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl bg-surface p-6">
          {isPartner ? (
            <p className="text-center">
              <BadgeCheck className="mx-auto mb-2 h-8 w-8 text-partner" />
              You are partner of CoreNetwork, thanks for helping our community!
            </p>
          ) : !user ? (
            <p className="text-center text-muted-foreground">
              Log in for join to 0+ creators in the creator program!
            </p>
          ) : application && application.status === "pending" ? (
            <p className="text-center text-muted-foreground">
              Your request is waiting, sit down and do another thing!
            </p>
          ) : (
            <form onSubmit={apply} className="space-y-4">
              <h2 className="font-semibold">
                {application?.status === "rejected" ? "Vuelve a postularte" : "Postúlate"}
              </h2>
              <Textarea
                required
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Cuéntanos sobre tu canal, tu contenido y por qué quieres ser Partner…"
              />
              <Button type="submit" disabled={busy}>
                Enviar solicitud
              </Button>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}
