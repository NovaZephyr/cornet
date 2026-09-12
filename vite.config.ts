import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import viteTsConfigPaths from "vite-tsconfig-paths";

// Keep Lovable's TanStack Start configuration, while explicitly enabling
// TypeScript path aliases for Vite 7. TanStack documents this plugin for Vite 7.
export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
  ],
  resolve: {
    alias: {
      "vite/internal": "vite",
    },
  },
  ssr: {
    noExternal: ["@vitejs/plugin-react"],
  },
  optimizeDeps: {
    exclude: ["vite"],
  },
});
