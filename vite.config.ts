
import netlify from '@netlify/vite-plugin-tanstack-start'
// dentro de plugins: [tanstackStart(), netlify(), viteReact(), ...]
export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
