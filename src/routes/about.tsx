import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About CoreNetwork" }] }),
  component: AboutRoute,
});

function AboutRoute() {
  return <div>Cornet /about funciona</div>;
}
