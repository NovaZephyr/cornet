import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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

type ReleaseAsset = {
  name: string;
  browser_download_url: string;
};

type GithubRelease = {
  tag_name: string;
  html_url: string;
  assets: ReleaseAsset[];
};

const platformInfo = [
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

        <div className="grid gap-5 md:grid-cols-3">
          {platformInfo.map(({ name, description, detail, icon: Icon }) => {
            const asset =
              name === "Windows"
                ? assets.windows
                : name === "Linux"
                  ? assets.linuxAppImage
                  : assets.android;

            return (
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
