import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FlaskConical, PlaySquare } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { EXPERIMENTS, readExperiments, setExperiment, type ExperimentState } from "@/lib/experiments";

export const Route = createFileRoute("/experiments")({ component: ExperimentsPage });

function ExperimentsPage() {
  const { user } = useAuth();
  const [state, setState] = useState<ExperimentState>(() => readExperiments());

  useEffect(() => {
    const sync = () => setState(readExperiments());
    window.addEventListener("corenetwork-experiments-change", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("corenetwork-experiments-change", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return <AppShell>
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FlaskConical className="h-6 w-6" /></div>
        <div><h1 className="text-2xl font-bold">Experimentos</h1><p className="mt-1 text-sm text-muted-foreground">Prueba funciones nuevas antes de que formen parte de la experiencia normal de Cornet.</p></div>
      </div>

      <div className="space-y-3">
        {EXPERIMENTS.map((experiment) => {
          const enabled = state[experiment.key];
          return <section key={experiment.key} className="rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted">
                {experiment.key === "shorts" ? <PlaySquare className="h-5 w-5" /> : <FlaskConical className="h-5 w-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold">{experiment.name}</h2><Badge variant="secondary">{experiment.status === "testing" ? "En pruebas" : "Estable"}</Badge></div>
                <p className="mt-1 text-sm text-muted-foreground">{experiment.description}</p>
                {experiment.key === "shorts" && <p className="mt-3 text-xs text-muted-foreground">Mientras esté desactivado, Shorts no aparecerá en la navegación ni se podrá abrir directamente.</p>}
              </div>
              <Switch checked={enabled} onCheckedChange={(checked) => { const next = setExperiment(experiment.key, checked); setState(next); }} aria-label={`Activar ${experiment.name}`} />
            </div>
          </section>;
        })}
      </div>

      {!user && <p className="mt-6 text-center text-xs text-muted-foreground">Los experimentos se guardan en este navegador.</p>}
    </div>
  </AppShell>;
}
