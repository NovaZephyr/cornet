import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, Github, Loader2 } from "lucide-react";

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
};

const API_URL = "https://api.github.com/repos/NovaZephyr/cornet-downloads/releases/latest";
const CORNET_LOGO = "https://raw.githubusercontent.com/NovaZephyr/cornet-downloads/main/assets/cornet-icon.png";

const platforms: Platform[] = [
  {
    key: "windows",
    title: "Windows",
    description: "Instalador de Cornet para Windows.",
    extensions: [".exe", ".msi"],
  },
  {
    key: "linux",
    title: "Linux",
    description: "Paquetes de Cornet para distribuciones Linux.",
    extensions: [".AppImage", ".deb"],
  },
  {
    key: "android",
    title: "Android",
    description: "Aplicación de Cornet para dispositivos Android.",
    extensions: [".apk"],
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

function PlatformIcon({ platform }: { platform: Platform["key"] }) {
  if (platform === "linux") {
    return (
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/3/35/Tux.svg"
        alt="Tux"
        className="h-7 w-7 object-contain"
      />
    );
  }

  if (platform === "android") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-current">
        <path d="M17.6 9.48 19.43 6.3a.45.45 0 0 0-.78-.45l-1.86 3.22A7.2 7.2 0 0 0 12 7.6a7.2 7.2 0 0 0-4.79 1.47L5.35 5.85a.45.45 0 1 0-.78.45L6.4 9.48A6.45 6.45 0 0 0 5.55 11H18.45a6.45 6.45 0 0 0-.85-1.52ZM8.9 12.6a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4Zm6.2 0a.7.7 0 1 1 0-1.4.7.7 0 0 1 0 1.4ZM5.5 12.4v5.35c0 .55.45 1 1 1h1.05v3.05a1.2 1.2 0 0 0 2.4 0v-3.05h4.1v3.05a1.2 1.2 0 0 0 2.4 0V18.75h1.05c.55 0 1-.45 1-1V12.4H5.5Zm13.1-1.9H5.4a.4.4 0 0 0-.4.4v.7h14v-.7a.4.4 0 0 0-.4-.4Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-current">
      <path d="M2 4.5 10.5 3.3v8.1H2V4.5Zm10.5-1.5L22 1.7v9.7h-9.5V3ZM2 12.6h8.5v8.1L2 19.5v-6.9Zm10.5 0H22v9.7l-9.5-1.3v-8.4Z" />
    </svg>
  );
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
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-6 sm:px-6 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-12 shadow-sm sm:px-10 sm:py-16">
          <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

          <div className="relative mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-background p-2.5 shadow-sm">
              <img src={CORNET_LOGO} alt="Logo de Cornet" className="h-full w-full object-contain" />
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
            const asset = release ? findAsset(release.assets, platform.extensions) : undefined;

            return (
              <article
                key={platform.key}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface p-6 shadow-sm transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:border-primary/80 hover:shadow-[0_0_28px_hsl(var(--primary)/0.28)]"
              >
                <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ boxShadow: "inset 0 0 22px hsl(var(--primary) / 0.08)" }} />

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background text-foreground transition-[border-color,box-shadow] duration-300 group-hover:border-primary/70 group-hover:shadow-[0_0_16px_hsl(var(--primary)/0.32)]">
                    <PlatformIcon platform={platform.key} />
                  </div>
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{platform.extensions.join(" / ")}</span>
                </div>

                <h2 className="relative mt-5 text-xl font-semibold">{platform.title}</h2>
                <p className="relative mt-2 min-h-12 text-sm leading-6 text-muted-foreground">{platform.description}</p>

                <div className="relative mt-6 flex-1">
                  {loading ? (
                    <div className="flex h-10 items-center justify-center rounded-xl border border-border text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Buscando build...
                    </div>
                  ) : asset ? (
                    <a
                      href={asset.browser_download_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_18px_hsl(var(--primary)/0.45)]"
                    >
                      <Download className="h-4 w-4" /> Descargar
                    </a>
                  ) : (
                    <div className="flex h-10 items-center justify-center rounded-xl border border-border bg-muted/40 px-4 text-sm text-muted-foreground">
                      Build no disponible
                    </div>
                  )}
                </div>

                {asset && <p className="relative mt-3 truncate text-center text-xs text-muted-foreground" title={asset.name}>{asset.name} · {formatSize(asset.size)}</p>}
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
      </div>
    </AppShell>
  );
}
