import { createFileRoute, Link } from "@tanstack/react-router";
import { Compass, MessageCircle, Palette, Sparkles, Wand2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/new")({ component: NewFeaturesPage, head: () => ({ meta: [{ title: "Probar algo nuevo — Cornet" }, { name: "description", content: "Descubre funciones nuevas y experimentales de Cornet." }] }) });

const features = [
  { title: "Temas", text: "Prueba temas normales, degradados y personalizados desde Ajustes → Apariencia.", icon: Palette, to: "/settings" },
  { title: "Messenger", text: "Envía mensajes, crea grupos y comparte GIFs con la búsqueda de KLIPY o enlaces directos.", icon: MessageCircle, to: "/messages" },
  { title: "Explorar", text: "Descubre videos por categorías y cambia entre Más vistos y Recientes.", icon: Compass, to: "/explore" },
];

function NewFeaturesPage() {
  return <AppShell><main className="mx-auto max-w-5xl px-4 py-10 sm:px-6"><div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm"><div className="bg-gradient-to-br from-primary/15 via-background to-primary/5 px-6 py-10 sm:px-10"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Wand2 className="h-6 w-6" /></div><h1 className="mt-5 text-3xl font-bold">Probar algo nuevo</h1><p className="mt-2 max-w-2xl text-muted-foreground">Funciones recientes de Cornet que puedes probar ahora mismo. Esta página se irá ampliando a medida que añadamos experimentos y mejoras.</p></div><div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 sm:p-10">{features.map((feature) => { const Icon = feature.icon; return <Card key={feature.title} className="flex h-full flex-col p-5"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Icon className="h-5 w-5" /></div><h2 className="mt-4 text-lg font-semibold">{feature.title}</h2><p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{feature.text}</p><Link to={feature.to} className="mt-5 text-sm font-semibold text-primary hover:underline">Probar ahora →</Link></Card>; })}</div><div className="mx-6 mb-6 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground sm:mx-10 sm:mb-10"><div className="flex items-center gap-2 font-semibold text-foreground"><Sparkles className="h-4 w-4 text-primary" />Experimental</div><p className="mt-1">Algunas funciones pueden cambiar mientras las pulimos. Tus datos y preferencias existentes se mantienen.</p></div></div></main></AppShell>;
}
