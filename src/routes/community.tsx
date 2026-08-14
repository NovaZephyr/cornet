import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CommunityFeed } from "@/components/CommunityFeed";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Comunidad — TocinoTube" },
      {
        name: "description",
        content: "Publicaciones, encuestas y novedades de los canales que sigues en TocinoTube.",
      },
      { property: "og:title", content: "Comunidad — TocinoTube" },
      { property: "og:description", content: "Habla con los creadores y su comunidad." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <AppShell>
      <h1 className="mx-auto mb-6 max-w-2xl text-2xl font-bold">Comunidad</h1>
      <CommunityFeed />
    </AppShell>
  );
}
