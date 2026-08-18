import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CommunityFeed } from "@/components/CommunityFeed";
import { CommunityStorage } from "@/components/CommunityStorage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, UploadCloud, Heart, Sparkles } from "lucide-react";
import "@/retro2012-community.css";

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
      <div className="cn-community-page">
        <section className="cn-community-hero">
          <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="cn-community-pill px-3 py-1 text-xs font-semibold">Cornet</span>
                <span className="cn-community-pill inline-flex items-center gap-1 px-3 py-1 text-xs"><Sparkles className="h-3.5 w-3.5" />Un lugar para compartir</span>
              </div>
              <h1>Tu comunidad, más cerca.</h1>
              <p className="mt-3 text-sm leading-6 sm:text-base">Habla con otros usuarios, comparte archivos y crea enlaces temporales desde un mismo espacio.</p>
            </div>
            <div className="cn-community-pill inline-flex items-center gap-1 px-3 py-1.5 text-xs"><Heart className="h-3.5 w-3.5" />Hecho para compartir</div>
          </div>
        </section>

        <Tabs defaultValue="social">
          <TabsList className="cn-community-tabs mb-3 h-auto w-full max-w-xl">
            <TabsTrigger value="social" className="flex-1 gap-2 py-2.5"><MessageCircle className="h-4 w-4" />Publicaciones</TabsTrigger>
            <TabsTrigger value="storage" className="flex-1 gap-2 py-2.5"><UploadCloud className="h-4 w-4" />Archivos y enlaces</TabsTrigger>
          </TabsList>
          <TabsContent value="social"><div className="cn-community-card"><CommunityFeed /></div></TabsContent>
          <TabsContent value="storage"><div className="cn-community-card"><CommunityStorage /></div></TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
