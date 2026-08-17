import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
      { title: "Partnership — CoreNetwork" },
      { name: "description", content: "Conoce los requisitos del programa Partnership de CoreNetwork." },
      { property: "og:title", content: "Partnership — CoreNetwork" },
      { property: "og:description", content: "Requisitos y solicitud para el programa Partnership de CoreNetwork." },
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

const REQUIREMENTS = [
  {
    question: "¿Tengo que crear contenido original?",
    answer: "Sí. El contenido de tu canal debe ser original y creado por ti.",
  },
  {
    question: "¿Puedo tener advertencias en mi cuenta?",
    answer: "No. Debes haber pasado los últimos 90 días sin recibir ninguna advertencia.",
  },
  {
    question: "¿Cuántas vistas necesito?",
    answer: "Necesitas alcanzar al menos 700 vistas en tu contenido.",
  },
  {
    question: "¿Cuántos suscriptores necesito?",
    answer: "Necesitas tener al menos 100 suscriptores.",
  },
  {
    question: "¿Qué pasa si cumplo todos los requisitos?",
    answer: "Podrás solicitar el Partnership y tu solicitud será revisada por el equipo de CoreNetwork.",
  },
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

        <section className="mt-6 rounded-2xl bg-surface p-6">
          <div className="mb-5">
            <h2 className="text-xl font-bold">Requisitos del Partnership</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aquí tienes las preguntas más importantes sobre los requisitos para postularte.
            </p>
          </div>
          <div className="space-y-3">
            {REQUIREMENTS.map((item) => (
              <details key={item.question} className="rounded-xl border border-border bg-background p-4">
                <summary className="cursor-pointer select-none font-medium">{item.question}</summary>
                <p className="mt-2 text-sm text-muted-foreground">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

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
              Ya eres Partner de CoreNetwork. ¡Gracias por formar parte de la comunidad!
            </p>
          ) : !user ? (
            <p className="text-center text-muted-foreground">
              Inicia sesión para postularte al programa de creadores.
            </p>
          ) : application && application.status === "pending" ? (
            <p className="text-center text-muted-foreground">
              Tu solicitud está en revisión. Te avisaremos cuando haya una decisión.
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
