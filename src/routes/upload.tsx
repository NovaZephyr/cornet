import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/upload")({
  beforeLoad: ({ location }) => {
    const params = new URLSearchParams(location.searchStr);
    const edit = params.get("edit");
    if (edit) throw redirect({ to: "/studio", search: { edit } });
    if (params.get("create") === "1" || params.get("create") === "true") {
      throw redirect({ to: "/studio", search: { create: true } });
    }
    throw redirect({ to: "/studio" });
  },
  component: () => null,
});
