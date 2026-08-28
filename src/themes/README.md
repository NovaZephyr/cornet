# Cornet Theme Architecture

Themes are presentation skins only. They MUST NOT change page/user layout, routing, component structure, or user-selected layout preferences.

## Blocks

- `core/` — Cornet base themes.
- `youtube/` — historical YouTube-era visual skins.
- `custom/` — custom experiences such as Cosmic Panda and effect-heavy themes.
- `gradients/` — standalone gradient skins.

## Layout rule

Theme CSS may style existing layout primitives, surfaces, typography, borders, shadows, backgrounds and effects. It must not redefine the application's structural layout or override user layout settings.

User layout preferences remain owned by the component/layout system, independently of the active theme.
