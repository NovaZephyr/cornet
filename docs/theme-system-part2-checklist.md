# Theme System — Part 2 QA

Part 2 is dedicated to verification and safe polish after the theme-system refactor.

## Scope

- Theme switching and persistence.
- System theme resolution.
- Custom Theme persistence and gradients.
- Custom shell composition and effects.
- Visual isolation between themes.
- Channel/user-selected layout isolation.
- Legacy theme migration.
- Build/runtime verification.
- Follow-up fixes discovered in Preview.

## Theme contract

Historical themes reproduce their reference era. Custom themes may change the global Cornet site experience, including shell composition, topbar, sidebar, navigation, page canvas, effects, and shaders.

## Channel layout isolation contract

No theme may replace, resize, reposition, or otherwise alter a user's selected channel layout. Themes must not modify `channel_info_layout`, channel grid/flex geometry, widget positions, banner dimensions, routing, or user-selected channel presentation.

Channel-specific decoration is allowed only through explicit opt-in hooks and must remain visual rather than structural.

## Legacy migration

Legacy identifiers may remain resolvable for compatibility, but they must point to the current replacement and must not appear as separate active theme entries. `retro2012` resolves to `cosmic-panda`.

## Completion gate

Do not merge Part 2 until Preview loads without runtime errors and the full theme/layout smoke test passes.
