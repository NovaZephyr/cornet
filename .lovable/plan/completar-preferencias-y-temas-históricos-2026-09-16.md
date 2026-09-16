# Completar preferencias y temas históricos

## Resultado
- Añadir en **Preferencias** el interruptor “Más animaciones”, guardado localmente y preparado para recibir comportamiento después.
- Mantener los identificadores internos actuales para no romper canales guardados, pero mostrar **Channel 1.0** y **Channel 2.0** y reconstruir ambos con la composición de las capturas.
- Actualizar los temas globales **YouTube 2009** y **YouTube 2013** según sus referencias históricas, sin alterar el layout elegido por cada canal.
- Retirar **YouTube 2012** del selector y migrar cualquier selección antigua a **Cosmic Panda**.
- Habilitar **Liquid Glass** como tema seleccionable y completar su apariencia global.

## Cambios visuales
- **Channel 1.0:** fondo personalizable visible, columna izquierda con identidad/información/conexiones, columna principal con destacado, cuadrícula compacta de videos y favoritos.
- **Channel 2.0:** lienzo estrecho sobre fondo personalizable, navegación superior compacta, columna de perfil y columna de video destacado, uploads y comunidad.
- **YouTube 2009:** cabecera blanca compacta, enlaces azules, controles biselados, superficies grises y mayor densidad.
- **YouTube 2013:** cabecera clara, guía gris, acento rojo, tarjetas planas y tipografía/espaciado propios de esa etapa.
- **Liquid Glass:** materiales translúcidos, desenfoque, reflejos y profundidad aplicados a navegación, controles, tarjetas, reproductor, configuración y ventanas.

## Detalles técnicos
- No se tocarán rutas, router ni el árbol de rutas.
- Themes y Channel Layouts seguirán siendo capas independientes dentro de la Design Library.
- Se conservarán `classic-2009` y `standard-2012` como IDs de compatibilidad; solo cambian nombre, estructura visual y presentación.
- Se alinearán los IDs de YouTube 2009/2013 entre el registro de temas y el cargador dinámico.
- Se verificará selector, persistencia, aislamiento entre tema/layout y visualización móvil/escritorio.
