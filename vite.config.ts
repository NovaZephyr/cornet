import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  // Netlify's build settings publish "dist/client", but nitro's auto-detected
  // "netlify" preset writes static assets straight to "dist" by default.
  // Pin the public output dir so it matches what Netlify expects to deploy.
  nitro: {
    output: {
      publicDir: "dist/client",
    },
  },
});
