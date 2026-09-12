# CoreNetwork Desktop (Tauri 2)

## Cómo se sirve el frontend

CoreNetwork es una app **TanStack Start con SSR** (build de Nitro/Cloudflare en
`.output/`), no una SPA estática, y usa server functions (`createServerFn`,
`src/lib/admin.functions.ts`). Por eso **no** existe una carpeta `dist` que
Tauri pueda empaquetar: hacerlo rompería auth, server functions y rutas.

Estrategia usada:

- `build.devUrl = http://localhost:8080` → `tauri dev` levanta `bun run dev`
  (Vite/TanStack en el puerto 8080 que usa este proyecto) y carga esa URL.
- `build.frontendDist = https://corenetwork.lovable.app` → `tauri build` NO
  ejecuta ningún build web y empaqueta una ventana que apunta al despliegue web
  real. El build/deploy web de CoreNetwork queda intacto.

Si algún día se quiere un bundle 100% offline, habría que crear una config Vite
aparte en modo SPA/prerender y mover las server functions a endpoints HTTP; hoy
no es necesario.

## Comandos

```bash
bun install
bun run tauri:dev      # desarrollo (requiere Rust + WebView2)
bun run tauri:build    # instaladores NSIS (.exe) y MSI en Windows
```

Salida en Windows: `src-tauri/target/release/bundle/nsis/*.exe` y
`src-tauri/target/release/bundle/msi/*.msi`.

Requisitos en Windows/CI: Rust stable (MSVC), Visual Studio Build Tools,
WebView2 (el instalador usa `downloadBootstrapper`) y para MSI el WiX toolset
que Tauri descarga automáticamente.

## Iconos

Generados desde el logo real `src/assets/corenetwork-mark.png` (512×512) en
`src-tauri/icons/` (`icon.ico`, `32x32.png`, `128x128.png`, `128x128@2x.png`,
`icon.png`).
