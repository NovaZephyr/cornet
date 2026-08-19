import { lazy, Suspense } from "react";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";

const WatchContent = lazy(() => import("./watch-content").then((module) => ({ default: module.WatchContent })));

export const Route = createFileRoute("/watch")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>): { v: string } => ({
    v: typeof search.v === "string" ? search.v : "",
  }),
  component: WatchRoute,
});

function WatchRoute() {
  return (
    <ClientOnly fallback={<div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Cargando video…</div>}>
      <Suspense fallback={<div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">Cargando video…</div>}>
        <WatchContent />
      </Suspense>
    </ClientOnly>
  );
}
