# Cornet Design Architecture

## Invariants

- **Shell** owns application chrome: header, navigation, global footer, auth entry points and global experiments visibility.
- **Theme** owns global visual tokens and theme-level styles. A theme must not decide which channel layout is rendered.
- **Channel layout** owns only the composition of channel content. Layout CSS is loaded through `ChannelLayoutStyles` and is scoped to layout lifecycle.
- **Content/data** is fetched outside layout components and passed through `ChannelData`.
- **Experiments** are feature gates and are not themes or layouts.

## Dependency direction

`Shell -> Theme/Experiments`

`Channel route -> ChannelData -> Layout`

`Layout -> presentation only`

A layout must not import `AppShell`, `useTheme`, or perform Supabase fetching for its own structure.

## Migration rule

When adding a layout, register its stylesheet in `src/design-library/index.ts`. Do not add layout CSS to the root route or global theme bootstrap. Compatibility URLs may remain as no-op files for old references, but the canonical stylesheet must be owned by the Design Library runtime.
