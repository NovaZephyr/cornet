import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import viteTsConfigPaths from "vite-tsconfig-paths";

// Vite 6 compatibility fix for @vitejs/plugin-react.
// `vite/internal` is still accessed by the React plugin in some versions,
// so alias it to the main Vite package to avoid ERR_PACKAGE_PATH_NOT_EXPORTED.
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
    esbuildOptions: {
      resolveExtensions: [".ts", ".tsx", ".js", ".jsx"],
    },
  },
  },
});
