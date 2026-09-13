import { createRootRoute, Outlet } from "@tanstack/react-router";

export const Route = createRootRoute({
  head: () => ({
    links: [
      { rel: "icon", type: "image/png", href: "/favicon.png" },
      { rel: "apple-touch-icon", href: "/corenetwork-mark.png" },
    ],
  }),
  component: RootLayout,
});

function RootLayout() {
  return <Outlet />;
}
