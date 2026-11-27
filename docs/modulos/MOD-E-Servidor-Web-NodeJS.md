# MOD E — Servidor Web y MySQL

[Índice y contratos compartidos](../../AGENTS.md)

**Propósito.** Escuchar a los módulos, guardar armados y resolver cada corte. Node.js es la autoridad de cuándo empieza y termina la partida y de cuánto tiempo queda.

**Stack y estructura actual.** `MOD E Servidor Web NodeJS/` usa Node.js, Express, Socket.IO y MySQL. El punto de entrada es `app.js`; `routes/gameRoutes.js` y `models/estadoJuego.js` manejan el estado `0`/`1` en memoria. `routes/userRoutes.js`, `routes/metricsRoutes.js` y `script BD.sql` pertenecen al flujo anterior. `app_basic.js` no sirve el juego completo. La ruta antigua `/users` recibe el POST del firmware actual pero intenta guardarlo como lecturas `F1`–`F4`.

## Contrato y ciclo de vida

- Montar las seis rutas documentadas en [HTTP y Socket.IO](../../AGENTS.md#http-y-socketio) en `app.js`, en el mismo servidor que Socket.IO (`PORT`, por defecto `3010`). Aplicar la migración propuesta para `partida` y `partida_evento`. La lectura de imágenes devuelve `image/png`; los demás intercambios usan JSON.
- `POST /api/partidas` valida un PNG y una posición `1`–`5`; guarda ambos en una fila `lista`. No reemplaza una fila lista ni la activa.
- `POST /api/juego/iniciar` comprueba que el ID es el del armado en espera y que no hay partida activa ni resultado en pantalla. Lo activa, asigna `vence_en_ms` y registra `inicio`. La continuidad la comprueba Android antes del POST.
- `POST /api/partidas/:id/cortes` procesa los cortes de la partida activa en orden. Si la posición coincide con la solución, registra victoria. Si no, descuenta tiempo y registra `penalizacion` solo si queda tiempo. Si el descuento llega a cero, registra únicamente `resultado: derrota`. No se aceptan cortes de partidas cerradas.
- El propio servidor registra la derrota al vencer el plazo aunque no llegue ningún corte. El cierre, el resultado y su evento se guardan juntos; emitir un solo resultado. Al leer el estado o procesar un corte, resolver el vencimiento si el plazo ya pasó. No se define una regla especial para cortes al último instante.
- Tras la pausa de resultado, publicar una nueva vista por `estado_actualizado`; si no hay armado listo, publicar `sin_armado`. Al reiniciar, marcar la partida activa como `cancelada` y registrar `cancelacion` antes de admitir otro inicio. No restaurar su reloj.

En una caída de MySQL, fallar la operación y no emitir éxito. Solo Python puede publicar el armado, Android iniciar y ESP32 reportar cortes. Los eventos no exponen la solución. Ignorar las funcionalidades heredadas que no use el proyecto; no hace falta borrarlas para integrar el juego.

## Pendientes del responsable

- [ ] Añadir migración y persistencia; reemplazar en el flujo del juego el estado heredado en memoria y los endpoints de métricas.
- [ ] Implementar las rutas, publicar los eventos persistidos y emitir la vista al HUD. Configurar `DURACION_PARTIDA_MS`, `PENALIZACION_MS` y `PAUSA_RESULTADO_MS` cuando el equipo defina sus valores.
- [ ] Probar: inicio sin armado rechazado, corte incorrecto con y sin tiempo restante, victoria, derrota sin corte y reinicio durante partida. Comprobar que una penalización que agota el reloj produce un solo evento de derrota.
