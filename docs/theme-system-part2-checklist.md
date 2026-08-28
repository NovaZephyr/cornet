# Theme System — Part 2 QA

Part 2 is dedicated to verification and safe polish after the theme-system refactor.

## Scope

- Theme switching and persistence.
- System theme resolution.
- Custom Theme persistence and gradients.
- Visual isolation between themes.
- Channel/user-selected layout isolation.
- Build/runtime verification.
- Follow-up fixes discovered in Preview.

## Layout isolation contract

Themes are visual skins only. They must not modify channel layout, `channel_info_layout`, routing, component structure, or user-selected channel presentation.

## Completion gate

Do not merge Part 2 until Preview loads without runtime errors and the full theme/layout smoke test passes.
