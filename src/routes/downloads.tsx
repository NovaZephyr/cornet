import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, ExternalLink } from "lucide-react";
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

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
};

type GithubRelease = {
  tag_name: string;
  html_url: string;
  assets: ReleaseAsset[];
};

function WindowsIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-current">
      <path d="M2.5 4.1 10.6 3v8.2H2.5V4.1Zm9.4-1.25L21.5 1.5v9.7h-9.6V2.85ZM2.5 12.8h8.1V21l-8.1-1.1v-7.1Zm9.4 0h9.6v9.7l-9.6-1.35v-8.35Z" />
    </svg>
  );
}

function LinuxIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-current">
      <path d="M12 2.2c-2.65 0-4.35 2.7-4.35 5.95 0 1.45-.48 2.45-1.08 3.35-.65.96-1.3 1.93-1.3 3.45 0 1.07.43 1.87 1.08 2.45-.48.62-.9 1.25-1.1 1.9-.28.9.25 1.7 1.25 1.7.83 0 1.68-.55 2.35-1.25.95.48 2 .75 3.15.75s2.2-.27 3.15-.75c.67.7 1.52 1.25 2.35 1.25 1 0 1.53-.8 1.25-1.7-.2-.65-.62-1.28-1.1-1.9.65-.58 1.08-1.38 1.08-2.45 0-1.52-.65-2.49-1.3-3.45-.6-.9-1.08-1.9-1.08-3.35C16.35 4.9 14.65 2.2 12 2.2Zm-2.1 6.45c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1Zm4.2 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1ZM8.7 12.3c.72.5 1.92.78 3.3.78s2.58-.28 3.3-.78c.15.82-.1 1.7-.78 2.18-.58.4-1.36.58-2.52.58s-1.94-.18-2.52-.58c-.68-.48-.93-1.36-.78-2.18ZM7.1 16.4c.48.35 1.12.62 1.83.78.82.18 1.75.27 3.07.27s2.25-.09 3.07-.27c.71-.16 1.35-.43 1.83-.78.3.38.48.77.48 1.2 0 .92-1.2 1.48-2.4 1.7-.88.17-1.8.23-2.98.23s-2.1-.06-2.98-.23c-1.2-.22-2.4-.78-2.4-1.7 0-.43.18-.82.48-1.2Z" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-7 w-7 fill-current">
      <path d="M7.1 8.2 5.8 6.1a.6.6 0 1 1 1.04-.6l1.37 2.35A7.1 7.1 0 0 1 12 6.7c1.38 0 2.68.4 3.79 1.15l1.37-2.35a.6.6 0 1 1 1.04.6L16.9 8.2A5.85 5.85 0 0 1 19.7 13v4.15a1.1 1.1 0 0 1-1.1 1.1h-.7v2.05a1.05 1.05 0 0 1-2.1 0v-2.05H8.2v2.05a1.05 1.05 0 0 1-2.1 0v-2.05h-.7a1.1 1.1 0 0 1-1.1-1.1V13a5.85 5.85 0 0 1 2.8-4.8ZM9 11.2a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Zm6 0a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM5.3 12.1H3.95a1.05 1.05 0 0 0 0 2.1H5.3v-2.1Zm13.4 0v2.1h1.35a1.05 1.05 0 0 0 0-2.1H18.7Z" />
    </svg>
  );
}

const platformInfo = [
  {
    name: "Windows",
    description: "La aplicación de escritorio de Cornet para Windows 10 y Windows 11.",
    detail: "Windows 10/11 · 64-bit",
    icon: WindowsIcon,
    glow: "border-sky-400/50 shadow-[0_0_28px_rgba(56,189,248,0.18)] hover:border-sky-300/80 hover:shadow-[0_0_38px_rgba(56,189,248,0.28)]",
    iconGlow: "text-sky-300 shadow-[0_0_22px_rgba(56,189,248,0.24)]",
  },
  {
    name: "Linux",
    description: "Una versión de Cornet para distribuciones Linux compatibles.",
    detail: "Linux · AppImage / .deb",
    icon: LinuxIcon,
    glow: "border-orange-400/50 shadow-[0_0_28px_rgba(251,146,60,0.16)] hover:border-orange-300/80 hover:shadow-[0_0_38px_rgba(251,146,60,0.25)]",
    iconGlow: "text-orange-300 shadow-[0_0_22px_rgba(251,146,60,0.22)]",
  },
  {
    name: "Android",
    description: "Lleva Cornet contigo con la aplicación móvil para Android.",
    detail: "Android · APK",
    icon: AndroidIcon,
    glow: "border-emerald-400/50 shadow-[0_0_28px_rgba(52,211,153,0.16)] hover:border-emerald-300/80 hover:shadow-[0_0_38px_rgba(52,211,153,0.25)]",
    iconGlow: "text-emerald-300 shadow-[0_0_22px_rgba(52,211,153,0.22)]",
  },
];

function findAsset(assets: ReleaseAsset[], patterns: RegExp[]) {
  return assets.find((asset) => patterns.some((pattern) => pattern.test(asset.name)));
}

function DownloadsPage() {
  const [release, setRelease] = useState<GithubRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("https://api.github.com/repos/NovaZephyr/cornet-downloads/releases/latest", {
      headers: { Accept: "application/vnd.github+json" },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`GitHub API: ${response.status}`);
        return (await response.json()) as GithubRelease;
      })
      .then((data) => {
        if (!cancelled) setRelease(data);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const assets = useMemo(() => {
    const available = release?.assets ?? [];
    return {
      windows: findAsset(available, [/\.exe$/i, /\.msi$/i]),
      windowsMsi: findAsset(available, [/\.msi$/i]),
      linuxAppImage: findAsset(available, [/\.AppImage$/i]),
      linuxDeb: findAsset(available, [/\.deb$/i]),
      android: findAsset(available, [/\.apk$/i]),
    };
  }, [release]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 pb-16 pt-8">
        <section className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-surface shadow-sm">
            <Download className="h-8 w-8" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Descarga Cornet</h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Usa Cornet donde quieras. Los botones se actualizan automáticamente con la última versión publicada en GitHub.
          </p>
          {release && (
            <p className="mt-2 text-xs font-medium text-muted-foreground">
              Última versión: {release.tag_name}
            </p>
          )}
        </section>

        {error && (
          <div className="mb-6 rounded-xl border border-border bg-surface p-4 text-center text-sm text-muted-foreground">
            No se pudo consultar la última versión. Puedes revisar los releases directamente en GitHub.
          </div>
        )}

        <div className="relative">
          <div className="pointer-events-none absolute left-[16.666%] right-[16.666%] top-1/2 hidden -translate-y-1/2 md:block" aria-hidden="true">
            <div className="mx-auto h-px w-2/3 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <div className="absolute left-1/2 top-1/2 h-20 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/15 blur-2xl animate-pulse" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary shadow-[0_0_18px_hsl(var(--primary))]" />
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {platformInfo.map(({ name, description, detail, icon: Icon, glow, iconGlow }) => {
              const asset =
                name === "Windows"
                  ? assets.windows
                  : name === "Linux"
                    ? assets.linuxAppImage
                    : assets.android;

              return (
                <article
                  key={name}
                  className={`group relative z-10 flex min-h-[300px] flex-col overflow-hidden rounded-2xl border bg-surface/95 p-6 backdrop-blur transition duration-300 hover:-translate-y-1 ${glow}`}
                >
                  <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full bg-current opacity-[0.06] blur-3xl transition-opacity duration-300 group-hover:opacity-[0.11]" aria-hidden="true" />
                  <div className={`relative mb-6 flex h-12 w-12 items-center justify-center rounded-xl border border-current/20 bg-background/80 shadow-sm ${iconGlow}`}>
                    <Icon />
                  </div>
                  <h2 className="relative text-2xl font-semibold">{name}</h2>
                  <p className="relative mt-3 flex-1 text-sm leading-6 text-muted-foreground">{description}</p>
                  <p className="relative mb-4 text-xs font-medium text-muted-foreground">{detail}</p>

                  {loading ? (
                    <div className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-muted px-4 text-sm font-semibold text-muted-foreground">
                      Cargando versión…
                    </div>
                  ) : asset ? (
                    <a
                      href={asset.browser_download_url}
                      className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
                    >
                      <Download className="h-4 w-4" />
                      Descargar
                    </a>
                  ) : (
                    <div className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-muted px-4 text-sm font-semibold text-muted-foreground">
                      No disponible
                    </div>
                  )}

                  {name === "Linux" && assets.linuxDeb && (
                    <a
                      href={assets.linuxDeb.browser_download_url}
                      className="mt-2 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border px-4 text-xs font-semibold transition hover:bg-muted"
                    >
                      Descargar .deb
                    </a>
                  )}

                  {name === "Windows" && assets.windowsMsi && assets.windowsMsi.name !== asset?.name && (
                    <a
                      href={assets.windowsMsi.browser_download_url}
                      className="mt-2 inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-border px-4 text-xs font-semibold transition hover:bg-muted"
                    >
                      Descargar .msi
                    </a>
                  )}
                </article>
              );
            })}
          </div>
        </div>

        <section className="mt-8 rounded-2xl border border-border bg-surface p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Versiones y lanzamientos</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Los instaladores se obtienen directamente de GitHub Releases. No hay URLs de descarga fijas que mantener.
              </p>
            </div>
            <a
              href={release?.html_url ?? "https://github.com/NovaZephyr/cornet-downloads/releases"}
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
