import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CommunityFeed } from "@/components/CommunityFeed";
import { CommunityStorage } from "@/components/CommunityStorage";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, UploadCloud } from "lucide-react";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — CoreNetwork" },
      {
        name: "description",
        content: "Habla, comparte archivos y crea enlaces temporales en CoreNetwork.",
      },
      { property: "og:title", content: "Community — CoreNetwork" },
      { property: "og:description", content: "Comunidad, almacenamiento y enlaces temporales en un solo lugar." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-3 pb-10 pt-2 sm:px-4">
        <div className="mb-7">
          <p className="text-sm font-medium text-primary">CoreNetwork</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">Comunidad</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Conecta con otros usuarios, guarda tus archivos y comparte enlaces temporales sin salir de CoreNetwork.</p>
        </div>

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
