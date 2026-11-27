# MOD F2 — Cliente Web 2: Manual de J2

[Índice y contratos compartidos](../../AGENTS.md)

**Propósito.** Mostrar el manual fijo que J2 usa para deducir qué posición debe desconectar J1. El manual se puede leer antes, durante y después de la partida.

**Stack y estructura.** `MOD F2 Cliente Web React/` solo contiene `.gitkeep`. Para el primer prototipo basta una página estática (`index.html` y sus recursos), sin dependencias de ejecución. Publicarla mediante una URL local accesible desde el dispositivo de J2.

## Entradas y salidas

- Entrada de la interfaz: J2 abre la URL del manual. No hay formularios, endpoints de juego, eventos Socket.IO ni intercambio Bluetooth.
- Entrada del procedimiento: los cinco colores que J1 relata por el bot en orden de posición `1`–`5`. Dejar clara la orientación y numeración con el mismo criterio que el diagrama de J1.
- Salida del procedimiento: J2 obtiene una única posición y se la comunica a J1 por texto. El sitio solo presenta las reglas: no consulta el armado actual, el reloj ni la solución de la BD.
- Las reglas oficiales y su prioridad están pendientes. No publicar reglas provisionales como definitivas. Si falta un color o el orden no está claro, el manual debe pedir que se confirme con J1.

## Pendientes del responsable

- [ ] Obtener las reglas, su prioridad y la referencia visual para numerar las posiciones.
- [ ] Redactar y publicar el manual. Verificar con el responsable de Python que la prioridad obtiene la misma solución para cada una de las 120 permutaciones.
- [ ] Probar que J2 puede leer el manual desde su dispositivo y resolver un armado solo con la descripción de J1.
