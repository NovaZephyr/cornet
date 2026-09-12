# Custom Theme Contract

Custom themes are allowed to transform the global Cornet site experience. They may restyle or recompose the global shell, including the topbar, sidebar, navigation, page canvas, global surfaces, effects, shaders, and other site-level presentation.

## Channel layout isolation

Custom themes MUST NOT replace, resize, reposition, or otherwise alter a user's selected channel layout. Channel layout remains user-owned.

A custom theme may provide channel-specific visual decoration only when the channel component explicitly opts into that decoration. It must not override `channel_info_layout`, channel grid/flex geometry, widget positions, banner dimensions, or other user-selected layout decisions.

## Legacy migration

`retro2012` is a legacy identifier and resolves to the current `cosmic-panda` custom theme. Legacy CSS may remain archived for reference, but it must not be loaded as an active theme entry.
