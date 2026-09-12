import { createFileRoute } from "@tanstack/react-router";
import { Download, Monitor, Smartphone, Terminal, ExternalLink } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Descargar Cornet" },
      {
        name: "description",
        content: "Descarga Cornet para Windows, Linux y Android.",
      },
    ],
  }),
  component: DownloadsPage,
});

const platforms = [
  {
    name: "Windows",
    description: "La aplicación de escritorio de Cornet para Windows 10 y Windows 11.",
    detail: "Windows 10/11 · 64-bit",
    icon: Monitor,
  },
  {
    name: "Linux",
    description: "Una versión de Cornet para distribuciones Linux compatibles.",
    detail: "Linux · AppImage / .deb",
    icon: Terminal,
  },
  {
    name: "Android",
    description: "Lleva Cornet contigo con la aplicación móvil para Android.",
    detail: "Android · APK",
    icon: Smartphone,
  },
];

function DownloadsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <section className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
            <Download className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Descarga Cornet</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Usa Cornet donde quieras. Elige tu plataforma para encontrar la versión correspondiente.
          </p>
        </section>

        <div className="grid gap-5 md:grid-cols-3">
          {platforms.map(({ name, description, detail, icon: Icon }) => (
            <article
              key={name}
              className="group flex min-h-[300px] flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
            >
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background">
                <Icon className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold">{name}</h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
              <p className="mb-4 text-xs font-medium text-muted-foreground">{detail}</p>
              <button
                type="button"
                disabled
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border bg-muted px-4 text-sm font-semibold text-muted-foreground opacity-70"
              >
                <Download className="h-4 w-4" />
                Próximamente
              </button>
            </article>
          ))}
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Versiones y lanzamientos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Los instaladores oficiales se publicarán mediante GitHub Releases.
              </p>
            </div>
            <a
              href="https://github.com/NovaZephyr/cornet/releases"
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-semibold transition hover:bg-muted"
            >
              Ver releases
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
