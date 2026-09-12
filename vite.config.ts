import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import viteTsConfigPaths from "vite-tsconfig-paths";

// Vite 6+ compatible configuration
// Removes deprecated vite/internal access from @vitejs/plugin-react
export default defineConfig({
  plugins: [
    viteTsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
  ],
  ssr: {
    noExternal: ["@vitejs/plugin-react"],
  },
  optimizeDeps: {
    esbuildOptions: {
      resolveExtensions: [".ts", ".tsx", ".js", ".jsx"],
    },
  },
});
