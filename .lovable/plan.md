# Tema Custom Cornet 2016

## Objetivo
Crear un tema seleccionable de toda la plataforma basado en la dirección **Cornet Classic 2016 v3**, conservando la marca Cornet y manteniendo completamente independientes los layouts de canal.

## Cambios
- Registrar **Cornet 2016** como tema Custom en la Design Library y en el selector de Preferencias.
- Crear una hoja de estilo encapsulada únicamente bajo `data-theme="cornet-2016"`.
- Aplicar la identidad elegida a:
  - barra superior azul con acabado clásico;
  - buscador, botones y menús compactos;
  - guía lateral clara con navegación densa;
  - fondo gris y superficies blancas con bordes finos;
  - tarjetas de video, miniaturas, metadatos y duración;
  - reproductor, página de video, comentarios y recomendaciones;
  - Preferencias, diálogos, menús, formularios y pie de página;
  - versión móvil con navegación y tarjetas adaptadas.
- Mantener el tema como capa visual: no tocar rutas, datos, autenticación ni selección/layout de canales.

## Detalles técnicos
- Añadir el identificador `cornet-2016` al registro de temas y al arranque persistente para que sobreviva a recargas.
- Cargar su CSS dinámicamente mediante `DesignLibraryRuntime`, sin añadir hojas nuevas a la raíz de la aplicación.
- Usar variables semánticas del sistema y selectores encapsulados para evitar filtraciones hacia Cosmic Panda, YouTube 2009/2013/2019, Liquid Glass u otros temas.
- Respetar reducción de movimiento y limitar las transiciones a estados breves propios de 2016.

## Verificación
- Seleccionar Cornet 2016 desde Preferencias y recargar la página.
- Revisar inicio, navegación móvil, Preferencias y una página de video.
- Cambiar entre Cornet 2016 y otros temas para confirmar aislamiento.
- Confirmar que cambiar el layout de canal no cambia el tema global y viceversa.
