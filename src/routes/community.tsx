import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CommunityFeed } from "@/components/CommunityFeed";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Community — CoreNetwork" },
      {
        name: "description",
        content: "Community in CoreNetwork.",
      },
      { property: "og:title", content: "Community — CoreNetwork" },
      { property: "og:description", content: "Talk and make ideas with other creator content." },
    ],
  }),
  component: CommunityPage,
});

function CommunityPage() {
  return (
    <AppShell>
      <h1 className="mx-auto mb-6 max-w-2xl text-2xl font-bold">Community</h1>
      <CommunityFeed />
    </AppShell>
  );
}
