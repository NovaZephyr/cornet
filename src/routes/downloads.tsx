import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Github, Loader2, Package, Smartphone, Monitor, Terminal } from "lucide-react";

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
  size: number;
};

type GithubRelease = {
  tag_name: string;
  name: string;
  published_at: string;
  html_url: string;
  assets: ReleaseAsset[];
};

type Platform = {
  key: "windows" | "linux" | "android";
  title: string;
  description: string;
  extensions: string[];
  icon: typeof Monitor;
};

const API_URL = "https://api.github.com/repos/NovaZephyr/cornet-downloads/releases/latest";

const platforms: Platform[] = [
  {
    key: "windows",
    title: "Windows",
    description: "Instalador de Cornet para Windows.",
    extensions: [".exe", ".msi"],
    icon: Monitor,
  },
  {
    key: "linux",
    title: "Linux",
    description: "Paquetes de Cornet para distribuciones Linux.",
    extensions: [".AppImage", ".deb"],
    icon: Terminal,
  },
  {
    key: "android",
    title: "Android",
    description: "Aplicación de Cornet para dispositivos Android.",
    extensions: [".apk"],
    icon: Smartphone,
  },
];

export const Route = createFileRoute("/downloads")({
  head: () => ({ meta: [{ title: "Descargar Cornet" }] }),
  component: DownloadsPage,
});

function findAsset(assets: ReleaseAsset[], extensions: string[]) {
  return assets.find((asset) => extensions.some((extension) => asset.name.toLowerCase().endsWith(extension.toLowerCase())));
}

function formatSize(bytes: number) {
  if (!bytes) return "";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function DownloadsPage() {
  const [release, setRelease] = useState<GithubRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch(API_URL, {
      headers: { Accept: "application/vnd.github+json" },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("GitHub release request failed");
        return response.json() as Promise<GithubRelease>;
      })
      .then((data) => setRelease(data))
      .catch((reason) => {
        if (reason?.name !== "AbortError") setError(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const releaseDate = useMemo(() => {
    if (!release?.published_at) return null;
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(release.published_at));
  }, [release]);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-12 shadow-sm sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-background shadow-sm">
              <Package className="h-7 w-7" />
            </div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-primary">Cornet</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Descarga Cornet</h1>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Obtén la versión más reciente de Cornet para tu dispositivo. Los instaladores se detectan automáticamente desde nuestros releases oficiales.
            </p>

            <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
              {loading ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1.5">
                  <Loader2 className="h-4 w-4 animate-spin" /> Comprobando última versión...
                </span>
              ) : release ? (
                <>
                  <span className="rounded-full border border-border bg-background px-3 py-1.5 font-medium text-foreground">
                    {release.name || release.tag_name}
                  </span>
                  {releaseDate && <span>Publicado el {releaseDate}</span>}
                </>
              ) : (
                <span className="rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1.5 text-destructive">
                  No se pudo consultar el release
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {platforms.map((platform) => {
            const Icon = platform.icon;
            const asset = release ? findAsset(release.assets, platform.extensions) : undefined;

            return (
              <article key={platform.key} className="flex flex-col rounded-2xl border border-border bg-surface p-6 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{platform.extensions.join(" / ")}</span>
                </div>

                <h2 className="mt-5 text-xl font-semibold">{platform.title}</h2>
                <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{platform.description}</p>

                <div className="mt-6 flex-1">
                  {loading ? (
                    <div className="flex h-10 items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando build...
                    </div>
                  ) : asset ? (
                    <a
                      href={asset.browser_download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                    >
                      <Download className="h-4 w-4" /> Descargar
                    </a>
                  ) : (
                    <div className="flex h-10 items-center justify-center rounded-xl border border-border bg-muted/40 px-4 text-sm text-muted-foreground">
                      Build no disponible
                    </div>
                  )}
                </div>

                {asset && <p className="mt-3 truncate text-center text-xs text-muted-foreground" title={asset.name}>{asset.name} · {formatSize(asset.size)}</p>}
              </article>
            );
          })}
        </section>

        <section className="mt-6 flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold">Código fuente y releases</h2>
            <p className="mt-1 text-sm text-muted-foreground">Consulta las versiones publicadas y todos sus archivos.</p>
          </div>
          <a
            href={release?.html_url || "https://github.com/NovaZephyr/cornet-downloads/releases"}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted"
          >
            <Github className="h-4 w-4" /> Ver releases <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </section>

        {error && (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            GitHub no respondió correctamente. Puedes consultar los releases directamente desde el enlace anterior.
          </p>
        )}
      </main>
    </AppShell>
  );
}
