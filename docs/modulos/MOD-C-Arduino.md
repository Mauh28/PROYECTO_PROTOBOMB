# MOD C — Arduino, ESP32 y hardware

[Índice y contratos compartidos](../../AGENTS.md)

**Propósito.** Verificar la continuidad de cinco cables, reportar cada corte por posición y emitir sonidos del juego con un solo buzzer.

**Stack y estructura actual.** `MOD C Arduino/BombaARD_POST_BTv1/BombaARD_POST_BTv1.ino` usa ESP32, Arduino, `HardwareSerial`, Wi-Fi, `HTTPClient` y una cola FreeRTOS. `CONTEXTO.md` en esa carpeta recoge el montaje actual. Las posiciones `1`, `2`, `3`, `4`, `5` corresponden a GPIO `32`, `25`, `33`, `27`, `26`. Se usa `INPUT_PULLUP`: `LOW` es conectado, `HIGH` es desconectado. El buzzer está en GPIO `13`. No se usan LEDs RGB. El software identifica la posición física; no detecta el color.

## Entradas y salidas

| Canal | Contrato |
| --- | --- |
| Bluetooth serie | UART2 a `9600` con RX `16` y TX `17`. Leer `INICIAR\n` y responder `TRUE\n` si los cinco pines están conectados; en otro caso, `FALSE\n`. |
| Inicio y recuperación | `GET /api/juego/estado` da la partida activa, si existe, y el cursor de eventos. En adelante consultar `GET /api/juego/eventos?despues_de=N` con el token del ESP32. |
| Corte | Con partida activa, encolar la posición al detectar la transición de conectado a desconectado. Enviar `POST /api/partidas/:id/cortes` con `{"posicion":3}`, un POST a la vez y en orden de detección. |
| Buzzer | Para `penalizacion`, sonido corto. Para `resultado: derrota`, sonido de explosión. Sin sonido de victoria o cancelación. Disparar por eventos, no también por la respuesta del POST. |

Guardar el ID de la partida junto con cada corte en cola. Si se desconectan varios cables juntos, recorrerlos en el orden de lectura del firmware y entregar los cortes en ese orden. Si se reconecta un cable y se vuelve a desconectar, generar otro corte. No mandar cortes fuera de partida. Un `409 partida_no_activa` indica que ese corte ya no corresponde al juego activo. Si falla la red, no reasignar cortes pendientes a otra partida; los reintentos de cortes con entrega incierta se dejan para una revisión posterior.

## Pendientes del responsable

- [ ] Confirmar con Python y J2 qué dos orificios ocupa cada posición en el diagrama de la protoboard.
- [ ] Reemplazar `POST /users` con `{"dato":…}`, etiquetar la cola con el ID y habilitar los cortes solo al sincronizar una partida activa.
- [ ] Leer eventos por consultas periódicas, retirar la reproducción de prueba en `setup()` y probar sonido corto y derrota por tiempo sin cortar ningún cable.
