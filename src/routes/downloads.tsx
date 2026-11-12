import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useEffect, useMemo, useState } from "react";
import {
  Apple,
  ArrowDownToLine,
  ArrowUpRight,
  Check,
  ChevronRight,
  Download,
  Github,
  Laptop,
  Loader2,
  Monitor,
  Smartphone,
} from "lucide-react";

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
  key: "macos" | "windows" | "linux" | "android";
  title: string;
  subtitle: string;
  description: string;
  extensions: string[];
  icon: typeof Apple;
  featured?: boolean;
};

const API_URL = "https://api.github.com/repos/NovaZephyr/cornet-downloads/releases/latest";
const RELEASES_URL = "https://github.com/NovaZephyr/cornet-downloads/releases";
const CORNET_LOGO = "https://raw.githubusercontent.com/NovaZephyr/cornet-downloads/main/assets/cornet-icon.png";

const platforms: Platform[] = [
  {
    key: "macos",
    title: "macOS",
    subtitle: "Mac",
    description: "Instala Cornet en tu Mac y disfruta de una experiencia de escritorio.",
    extensions: [".dmg", ".pkg", ".zip"],
    icon: Apple,
    featured: true,
  },
  {
    key: "windows",
    title: "Windows",
    subtitle: "PC",
    description: "Instalador de Cornet para equipos Windows.",
    extensions: [".exe", ".msi"],
    icon: Monitor,
  },
  {
    key: "linux",
    title: "Linux",
    subtitle: "Desktop",
    description: "Paquetes para distribuciones Linux compatibles.",
    extensions: [".appimage", ".deb"],
    icon: Laptop,
  },
  {
    key: "android",
    title: "Android",
    subtitle: "Móvil",
    description: "Aplicación de Cornet para dispositivos Android.",
    extensions: [".apk"],
    icon: Smartphone,
  },
];

export const Route = createFileRoute("/downloads")({
  head: () => ({
    meta: [
      { title: "Descargas — Cornet" },
      { name: "description", content: "Descarga e instala Cornet en tus dispositivos." },
    ],
  }),
  component: DownloadsPage,
});

function findAsset(assets: ReleaseAsset[], extensions: string[]) {
  return assets.find((asset) =>
    extensions.some((extension) => asset.name.toLowerCase().endsWith(extension)),
  );
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
      .then(setRelease)
      .catch((reason) => {
        if (reason?.name !== "AbortError") setError(true);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const releaseDate = useMemo(() => {
    if (!release?.published_at) return null;
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(
      new Date(release.published_at),
    );
  }, [release]);

  return (
    <AppShell>
      <main className="cn-downloads-page mx-auto w-full max-w-6xl px-4 pb-20 pt-7 sm:px-6 lg:px-8">
        <section className="cn-downloads-hero relative overflow-hidden rounded-[2rem] border border-border px-6 py-12 sm:px-10 sm:py-16">
          <div className="cn-downloads-orb cn-downloads-orb-one" />
          <div className="cn-downloads-orb cn-downloads-orb-two" />
          <div className="relative z-10 mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-6 flex h-[76px] w-[76px] items-center justify-center rounded-[25px] border border-white/70 bg-white/70 p-3 shadow-xl shadow-sky-950/10 backdrop-blur-xl">
              <img src={CORNET_LOGO} alt="Cornet" className="h-full w-full object-contain" />
            </div>
            <p className="text-xs font-bold uppercase tracking-[.28em] text-primary">Cornet · Descargas</p>
            <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-6xl">
              Cornet en todos tus dispositivos.
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Una sola comunidad, estés donde estés. Elige tu dispositivo y encuentra la forma de instalar Cornet.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2 text-sm">
              {loading ? (
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Buscando la última versión
                </span>
              ) : release ? (
                <>
                  <span className="rounded-full border border-border bg-background/70 px-3 py-2 font-semibold">
                    {release.name || release.tag_name}
                  </span>
                  {releaseDate && <span className="text-muted-foreground">Publicado {releaseDate}</span>}
                </>
              ) : (
                <span className="rounded-full border border-destructive/30 bg-destructive/5 px-3 py-2 text-destructive">
                  No se pudo consultar la versión
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="mt-12">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-primary">Elige tu plataforma</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Descargar Cornet</h2>
            </div>
            <a href={RELEASES_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
              Todas las versiones <ArrowUpRight className="h-4 w-4" />
            </a>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {platforms.map((platform) => {
              const asset = release ? findAsset(release.assets, platform.extensions) : undefined;
              const Icon = platform.icon;

              return (
                <article
                  key={platform.key}
                  className={`cn-download-card group relative flex min-h-[245px] flex-col overflow-hidden rounded-[1.65rem] border border-border p-6 sm:p-7 ${platform.featured ? "cn-download-card-featured sm:col-span-2" : ""}`}
                >
                  <div className="relative z-10 flex items-start justify-between gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 bg-white/55 text-foreground shadow-sm backdrop-blur-xl">
                      <Icon className="h-7 w-7" strokeWidth={1.7} />
                    </div>
                    {platform.featured && (
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
                        Experiencia de escritorio
                      </span>
                    )}
                  </div>
                  <div className="relative z-10 mt-5 flex flex-1 flex-col sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                    <div className="max-w-xl">
                      <p className="text-xs font-semibold uppercase tracking-[.18em] text-muted-foreground">{platform.subtitle}</p>
                      <h3 className="mt-1 text-2xl font-bold tracking-tight">{platform.title}</h3>
                      <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{platform.description}</p>
                    </div>
                    <div className="mt-5 w-full shrink-0 sm:mt-0 sm:w-auto">
                      {loading ? (
                        <div className="flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl border border-border bg-background/60 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" /> Buscando
                        </div>
                      ) : asset ? (
                        <a
                          href={asset.browser_download_url}
                          className="flex h-11 min-w-40 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/15 transition hover:-translate-y-0.5 hover:shadow-xl"
                        >
                          <Download className="h-4 w-4" /> Descargar
                        </a>
                      ) : (
                        <span className="flex h-11 min-w-40 items-center justify-center rounded-xl border border-border bg-background/55 px-4 text-sm text-muted-foreground">
                          {platform.key === "macos" ? "Próximamente" : "Sin instalador"}
                        </span>
                      )}
                      {asset && <p className="mt-2 text-center text-xs text-muted-foreground">{asset.name} · {formatSize(asset.size)}</p>}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="cn-download-ios mt-5 overflow-hidden rounded-[1.65rem] border border-border p-6 sm:p-8">
          <div className="flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/60 bg-white/45 px-3 py-1.5 text-xs font-semibold text-primary backdrop-blur-lg">
                <Apple className="h-3.5 w-3.5" /> iPhone y iPad
              </div>
              <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">Lleva Cornet contigo.</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                En iOS, instala Cornet desde Safari en tu pantalla de inicio. Se abrirá como una aplicación web y tendrá su propio icono.
              </p>
            </div>
            <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white/55 p-5 shadow-lg shadow-slate-900/5 backdrop-blur-2xl">
              <ol className="space-y-4 text-sm">
                <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">1</span><span><strong>Abre Safari</strong><br /><span className="text-muted-foreground">Visita la página de Cornet desde tu iPhone o iPad.</span></span></li>
                <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">2</span><span><strong>Toca Compartir</strong><br /><span className="text-muted-foreground">Busca la opción «Añadir a pantalla de inicio».</span></span></li>
                <li className="flex gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">3</span><span><strong>Confirma Añadir</strong><br /><span className="text-muted-foreground">Abre Cornet desde el nuevo icono.</span></span></li>
              </ol>
              <a href="/" className="mt-5 flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground">
                Abrir Cornet <ChevronRight className="h-4 w-4" />
              </a>
            </div>
          </div>
        </section>

        <section className="mt-5 flex flex-col gap-4 rounded-[1.5rem] border border-border bg-surface/70 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="font-semibold">¿Buscas otra versión?</h2>
            <p className="mt-1 text-sm text-muted-foreground">Consulta el código fuente y todos los archivos publicados.</p>
          </div>
          <a href={release?.html_url || RELEASES_URL} target="_blank" rel="noreferrer" className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-semibold transition hover:bg-muted">
            <Github className="h-4 w-4" /> GitHub Releases <ArrowUpRight className="h-3.5 w-3.5" />
          </a>
        </section>

        {error && <p className="mt-4 text-center text-xs text-muted-foreground">GitHub no respondió correctamente. Puedes consultar los releases directamente desde el enlace anterior.</p>}
      </main>
    </AppShell>
  );
}
