import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/about")({ head: () => ({ meta: [{ title: "About CoreNetwork" }] }), component: AboutPage });

const sections = [
  ["About CoreNetwork", "CoreNetwork es una plataforma de vídeo y comunidad para creadores. Aquí puedes publicar vídeos, crear playlists, seguir canales y participar en conversaciones."] ,
  ["Copyright", "Respeta los derechos de autor. Solo debes publicar contenido que tengas derecho a compartir. Las reclamaciones sobre contenido pueden enviarse a través de los canales de soporte de CoreNetwork."] ,
  ["Creators & Partners", "El programa de creadores y partners ofrece herramientas adicionales para personalizar canales y participar en funciones especiales de la plataforma."] ,
  ["Terms of Service", "El uso de CoreNetwork implica aceptar las reglas de la plataforma, respetar a otros usuarios y no utilizar el servicio para contenido ilegal o abusivo."] ,
  ["Privacy", "CoreNetwork utiliza datos necesarios para autenticar usuarios, mantener cuentas, vídeos, playlists y funciones de comunidad. No publiques información personal sensible."] ,
  ["Community Guidelines", "No se permite acoso, spam, fraude, suplantación, amenazas ni contenido que infrinja las leyes aplicables o los derechos de terceros."] ,
  ["Safety & Report a Bug", "Puedes comunicar problemas de seguridad, errores técnicos o contenido que infrinja las normas mediante las herramientas de soporte disponibles en la plataforma."] ,
];

function AboutPage() {
  return <AppShell><div className="mx-auto max-w-4xl pb-16"><div className="mb-8 border-b border-border pb-5"><h1 className="text-3xl font-bold">CoreNetwork</h1><p className="mt-2 text-sm text-muted-foreground">Información, copyright, privacidad y normas de la plataforma.</p></div><div className="grid gap-4 md:grid-cols-2">{sections.map(([title, body]) => <section key={title} className="rounded-lg border border-border bg-surface p-5"><h2 className="text-lg font-semibold">{title}</h2><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{body}</p></section>)}</div></div></AppShell>;
}
