import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CommunityFeed } from "@/components/CommunityFeed";
import { CommunityStorage } from "@/components/CommunityStorage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, UploadCloud, Heart, Sparkles } from "lucide-react";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Comunidad — Cornet" },
      { name: "description", content: "Habla, comparte archivos y crea enlaces temporales en Cornet." },
      { property: "og:title", content: "Comunidad — Cornet" },
      { property: "og:description", content: "Un espacio sencillo para conversar, compartir y guardar cosas." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-3 pb-12 pt-3 sm:px-5">
        <section className="relative mb-7 overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-background to-surface p-6 shadow-sm sm:p-8">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Cornet</span>
                <span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-muted-foreground"><Sparkles className="h-3.5 w-3.5" />Un lugar para compartir</span>
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tu comunidad, más cerca.</h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">Habla con otros usuarios, comparte archivos y crea enlaces temporales desde un mismo espacio, sin complicarte.</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-3 py-1.5"><Heart className="h-3.5 w-3.5" />Hecho para compartir</span></div>
          </div>
        </section>

        <Tabs defaultValue="social">
          <TabsList className="mb-6 grid h-auto w-full max-w-xl grid-cols-2 rounded-2xl bg-muted/70 p-1">
            <TabsTrigger value="social" className="gap-2 rounded-xl py-2.5"><MessageCircle className="h-4 w-4" />Publicaciones</TabsTrigger>
            <TabsTrigger value="storage" className="gap-2 rounded-xl py-2.5"><UploadCloud className="h-4 w-4" />Archivos y enlaces</TabsTrigger>
          </TabsList>
          <TabsContent value="social"><CommunityFeed /></TabsContent>
          <TabsContent value="storage"><CommunityStorage /></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
