# MOD A — App Android

[Índice y contratos compartidos](../../AGENTS.md)

**Propósito.** Mantener el vínculo Bluetooth, verificar continuidad a petición del bot y solicitar el inicio al servidor. El puente sigue funcionando al pasar a segundo plano y se detiene cuando se cierra la app.

**Stack y estructura actual.** Proyecto Java/Gradle en `MOD A y D Android y Telegram/AndroidProtobomb/`. Bajo `app/src/main/java/com/example/myapp/`, `MainActivity.java` y `SimpleActivity.java` seleccionan el dispositivo; `background/ConectarMiBluetooth.java` y `ComunicarConBluetooth.java` gestionan la conexión; `background/MyService.java` combina Telegram y el arranque. Actualmente es un `IntentService` y su bucle termina tras el primer `TRUE`, incluso si el POST falla.

## Entradas y salidas

Separar el bot de la lógica del puente en el mismo proyecto Android. Se propone el siguiente contrato interno; no requiere un servidor HTTP en el teléfono.

| Operación | Contrato |
| --- | --- |
| `solicitarInicio()` | Llamada asíncrona desde el bot tras autorizar `/inicia`. Devuelve `iniciada`, `sin_armado`, `inicio_no_disponible`, `armado_incompleto`, `error_bluetooth` o `error_servidor`. |
| `consultarEstado()` | Devuelve la vista de `GET /api/juego/estado` o un fallo. El bot usa la fase de esa vista antes de reenviar texto. |
| Entrega de eventos al bot | Android consulta `GET /api/juego/eventos?despues_de=N` y entrega al bot cada evento completo en orden, sin repeticiones durante la sesión del servicio. |

Al recibir `solicitarInicio()`, leer la vista. Si falta armado, devolver `sin_armado`; si la fase no es `espera`, devolver `inicio_no_disponible`. En `espera`, enviar `INICIAR\n` por Bluetooth y esperar hasta cinco segundos. `FALSE\n` significa `armado_incompleto`; una conexión ausente, un timeout o una respuesta inesperada significa `error_bluetooth`. Solo con `TRUE\n` hacer `POST /api/juego/iniciar` con `{"partida_id":42}` usando el ID leído antes de la verificación y el token Android. `200` confirma inicio; `409` indica que ya no se puede iniciar; un fallo de red devuelve `error_servidor`. No usar `POST /estado` del ejercicio anterior.

## Pendientes del responsable

- [ ] Sustituir el flujo de una sola partida por un servicio con notificación mientras se mantiene el puente activo en segundo plano. Detener sus tareas, el bot y el enlace Bluetooth al cerrar la app.
- [ ] Mantener la selección y verificación Bluetooth, separar el contrato interno y las llamadas al servidor, y evitar dos verificaciones simultáneas.
- [ ] Probar continuidad fallida, pérdida del servidor y dos partidas consecutivas con la app en segundo plano. Comprobar que al cerrarla cesan la lectura de Telegram y las consultas al servidor.
