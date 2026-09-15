import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Copyright,
  Sparkles,
  Megaphone,
  ScrollText,
  Lock,
  Users,
  ShieldCheck,
  Smile,
  Play,
  Compass,
  Handshake,
  BookOpenText,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useTheme } from "@/hooks/useTheme";
import corenetworkMark from "@/assets/corenetwork-mark.png";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Acerca de Cornet — video, comunidad y creadores" },
      {
        name: "description",
        content:
          "Conoce Cornet: plataforma de video y comunidad para creadores. Información sobre copyright, partners, privacidad, normas y seguridad.",
      },
      { property: "og:title", content: "Acerca de Cornet" },
      {
        property: "og:description",
        content:
          "Conoce Cornet: plataforma de video y comunidad para creadores. Copyright, partners, privacidad y normas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AboutPage,
});

const sections = [
  {
    title: "Acerca de Cornet",
    icon: Play,
    body: "Cornet es una plataforma de vídeo y comunidad para creadores. Aquí puedes publicar vídeos, crear playlists, seguir canales y participar en conversaciones.",
  },
  {
    title: "Copyright",
    icon: Copyright,
    body: "Respeta los derechos de autor. Solo debes publicar contenido que tengas derecho a compartir. Las reclamaciones sobre contenido pueden enviarse a través de los canales de soporte de Cornet.",
  },
  {
    title: "Creadores y Partners",
    icon: Sparkles,
    body: "El programa de creadores y partners ofrece herramientas adicionales para personalizar canales y participar en funciones especiales de la plataforma.",
  },
  {
    title: "Publicidad",
    icon: Megaphone,
    body: "Las herramientas publicitarias de Cornet están orientadas a creadores y socios, con espacios separados de la navegación y el contenido de la comunidad.",
  },
  {
    title: "Términos del servicio",
    icon: ScrollText,
    body: "El uso de Cornet implica aceptar las reglas de la plataforma, respetar a otros usuarios y no utilizar el servicio para contenido ilegal o abusivo.",
  },
  {
    title: "Privacidad",
    icon: Lock,
    body: "Cornet utiliza datos necesarios para autenticar usuarios, mantener cuentas, vídeos, playlists y funciones de comunidad. No publiques información personal sensible.",
  },
  {
    title: "Normas de la comunidad",
    icon: Users,
    body: "No se permite acoso, spam, fraude, suplantación, amenazas ni contenido que infrinja las leyes aplicables o los derechos de terceros.",
  },
  {
    title: "Seguridad y reportar errores",
    icon: ShieldCheck,
    body: "Puedes comunicar problemas de seguridad, errores técnicos o contenido que infrinja las normas mediante las herramientas de soporte disponibles en la plataforma.",
  },
  {
    title: "Emoji",
    icon: Smile,
    body: "Cornet usa Twemoji para renderizar emojis de forma consistente entre plataformas. Twemoji está distribuido bajo MIT y sus gráficos bajo CC-BY 4.0.",
  },
];

const quickLinks = [
  { to: "/terms", label: "Términos", icon: ScrollText },
  { to: "/privacy", label: "Privacidad", icon: Lock },
  { to: "/rules", label: "Normas", icon: BookOpenText },
  { to: "/partner", label: "Programa Partner", icon: Handshake },
  { to: "/explore", label: "Explorar", icon: Compass },
  { to: "/blog", label: "Blog", icon: Megaphone },
] as const;

function AboutPage() {
  const { theme } = useTheme();
  const retro = theme === "cosmic-panda";

  if (retro) {
    return (
      <AppShell>
        <div className="cn-2012-about-page">
          <div className="cn-2012-about-hero">
            <h1>Cornet</h1>
            <p>Información de la plataforma · Copyright · Creadores · Privacidad · Normas</p>
          </div>
          <div className="cn-2012-about-grid">
            <nav className="cn-2012-about-nav" aria-label="Información de Cornet">
              {sections.map(({ title }) => (
                <a key={title} href={`#${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
                  {title}
                </a>
              ))}
              <Link to="/" className="mt-2 block border-t border-[#e1e1e1] pt-2 font-semibold">
                Volver a Cornet
              </Link>
            </nav>
            <div className="cn-2012-about-content">
              {sections.map(({ title, body }) => (
                <section key={title} id={title.toLowerCase().replace(/[^a-z0-9]+/g, "-")} className="cn-2012-about-card">
                  <h2>{title}</h2>
                  <p>{body}</p>
                </section>
              ))}
            </div>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl pb-16">
        {/* Hero */}
        <div className="relative mb-8 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/15 via-transparent to-transparent" />
          <div className="relative flex flex-col items-start gap-4 p-8 sm:p-10">
            <img src={corenetworkMark} alt="Logotipo de Cornet" className="h-14 w-14" />
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Cornet</h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                Video, comunidad y creadores en un solo lugar. Publica, descubre, comparte y haz crecer tu canal.
              </p>
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {quickLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium transition-colors hover:bg-muted"
                >
                  <Icon size={13} />
                  {label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Sections */}
        <div className="grid gap-4 md:grid-cols-2">
          {sections.map(({ title, body, icon: Icon }) => (
            <section
              key={title}
              className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-background text-primary">
                  <Icon size={16} />
                </span>
                <h2 className="text-base font-semibold">{title}</h2>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{body}</p>
            </section>
          ))}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Hecho con cariño por el equipo de Cornet · {new Date().getFullYear()}
        </p>
      </div>
    </AppShell>
  );
}
