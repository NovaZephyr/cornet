import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import viteTsConfigPaths from "vite-tsconfig-paths";

// Fix for Vite 6.0.0 compatibility issue with @vitejs/plugin-react
// The issue: @vitejs/plugin-react tries to import 'vite/internal' which is not exported in Vite 6.0.0
// Solution: Redirect the internal import to the main vite package
export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
  ],
  ssr: {
    noExternal: ["@vitejs/plugin-react"],
  },
  resolve: {
    alias: {
      "vite/internal": "vite",
    },
  },
  optimizeDeps: {
    exclude: ["vite"],
  },
});
