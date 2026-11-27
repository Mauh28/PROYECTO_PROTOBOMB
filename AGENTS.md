# Protobomb — índice técnico

Este archivo recoge las reglas y los contratos que sirven de referencia para la primera integración. Son decisiones de trabajo que el equipo puede revisar y ajustar conforme avance el proyecto. El código actual todavía usa contratos heredados, indicados en cada ficha.

## Cómo colaborar con el equipo

Cada responsable puede consultar a su agente de IA para implementar su módulo y resolver dudas. Si eres ese agente, revisa la ficha del módulo y los contratos compartidos antes de responder o editar. Si una propuesta difiere de lo documentado, explica qué regla o contrato cambia y qué módulos podrían verse afectados. Sugiere que el responsable consulte a sus compañeros para resolver la diferencia y acordar si conviene cambiar lo documentado. Si el equipo acuerda el cambio, actualiza la documentación compartida y las fichas afectadas, y coordina los ajustes entre los módulos que producen y consumen ese contrato.

## Enrutador por módulo

| Responsable | Ubicación del código | Ficha |
| --- | --- | --- |
| App Android | `MOD A y D Android y Telegram/AndroidProtobomb/` | [MOD A — App Android](docs/modulos/MOD-A-App-Android.md) |
| App de escritorio | `MOD B Cliente python/` | [MOD B — App Python](docs/modulos/MOD-B-Cliente-python.md) |
| Arduino y hardware | `MOD C Arduino/` | [MOD C — Arduino y hardware](docs/modulos/MOD-C-Arduino.md) |
| Bot de Telegram | Proyecto Android compartido; lógica del bot separada del puente Bluetooth | [MOD D — Bot de Telegram](docs/modulos/MOD-D-Bot-Telegram.md) |
| Servidor y BD | `MOD E Servidor Web NodeJS/` | [MOD E — Servidor y BD](docs/modulos/MOD-E-Servidor-Web-NodeJS.md) |
| HUD de J1 | `MOD F Cliente Web React/CLIENTE_WEB_PRE_ARMADO/my-app/` | [MOD F — HUD de J1](docs/modulos/MOD-F-Cliente-Web-React-J1.md) |
| Manual de J2 | `MOD F2 Cliente Web React/` | [MOD F2 — Manual de J2](docs/modulos/MOD-F2-Cliente-Web-React-J2.md) |

## Reglas de referencia para la primera integración

- Una partida, una ronda y una `posicion_solucion` en `1`–`5`. Los cinco colores son `rojo`, `naranja`, `amarillo`, `verde` y `azul`, cada uno una sola vez. Hay un buzzer y no se usan LEDs RGB.
- El servidor es la autoridad del reloj, el estado y el resultado. Solo hay una partida activa para el equipo físico. Se inicia con `/inicia` de J1, continuidad positiva y una partida lista con imagen y solución persistidas.
- Al empezar una partida, Python prepara la siguiente. Al finalizar, el HUD muestra el resultado por un momento y luego muestra el armado siguiente cuando esté listo. Si no hay armado listo, se rechaza el inicio.
- Un corte correcto finaliza en victoria. Un corte incorrecto resta tiempo; si agota el reloj, emite solo derrota. Volver a cortar tras reconectar cuenta como otro corte. Se procesan las posiciones en el orden en que el ESP32 las detecta.
- El bot solo reenvía texto entre los dos chats privados mientras el servidor mantiene una partida activa. Continuidad fallida y penalizaciones se notifican solo a J1; victoria o derrota, a ambos. La victoria no acciona el buzzer.
- Un reinicio del servidor cancela la partida activa. No reanuda el reloj ni inicia automáticamente. Se conserva el siguiente armado válido, si existe.
- No usar los endpoints de ejercicios previos como contrato del juego. No revelar `posicion_solucion` en lecturas públicas, eventos, imágenes ni mensajes.

## Estado y persistencia

**MySQL, esquema propuesto:**

| Tabla | Campos mínimos |
| --- | --- |
| `partida` | `id` entero autoincremental; `imagen_armado` binaria PNG; `posicion_solucion` entero `1`–`5`; `estado` (`lista`, `activa`, `victoria`, `derrota`, `cancelada`); `vence_en_ms` entero largo anulable; `resultado_hasta_ms` entero largo anulable. |
| `partida_evento` | `id` entero autoincremental; `partida_id` FK a `partida`; `tipo`; `datos` JSON. Permite consultar en orden los eventos que no se leyeron en el último intervalo. |

Mantener como máximo una partida `lista` además de la activa. Guardar imagen y solución juntas. Persistir el cambio de partida y sus eventos antes de publicarlos. Las marcas `*_ms` son milisegundos Unix.

La **vista de juego** que consumen los clientes tiene esta forma:

```json
{
  "fase": "espera",
  "partida_id": 42,
  "imagen_url": "/api/partidas/42/imagen",
  "vence_en_ms": null,
  "resultado": null,
  "servidor_en_ms": 1780000000000,
  "hay_armado_listo": true,
  "ultimo_evento_id": 0
}
```

| `fase` | `partida_id` | Datos visibles |
| --- | --- | --- |
| `sin_armado` | `null` | Mensaje de preparación. |
| `espera` | ID del armado listo | `imagen_url`. |
| `activa` | ID de la partida activa | `vence_en_ms`; la imagen deja de estar disponible a través de su ruta. |
| `resultado` | ID de la partida terminada | `resultado`: `victoria` o `derrota`. |

Los campos que no correspondan a una fase son `null`. `hay_armado_listo` indica si existe una fila `lista`, incluso durante otra partida. `ultimo_evento_id` es el mayor ID publicado, o `0` si aún no hay eventos. Tras la pausa de `resultado`, la vista pasa a `espera` o `sin_armado`. Una partida cancelada pasa directamente a esa vista de espera.

## HTTP y Socket.IO

Servidor Node.js, puerto `3010` por defecto. Los cuerpos y respuestas son JSON salvo la imagen. Para el prototipo se propone que cada cliente de integración use su propio token configurado fuera del repositorio (`Authorization: Bearer …`). Los `POST` y la consulta de eventos requieren el token del módulo autorizado; la vista y la imagen se consultan en la red local sin credenciales. Los tokens de escritura no van en el HUD ni en el manual.

| Método y ruta | Productor/consumidor | Contrato |
| --- | --- | --- |
| `GET /api/juego/estado` | Python, Android, ESP32, HUD | `200` con la vista de juego. Sin caché. |
| `POST /api/partidas` | Python | `{ "imagen_png_base64": "<base64>", "posicion_solucion": 3 }` → `201 { "partida_id": 42 }`; `409` si ya hay un armado listo. |
| `GET /api/partidas/:id/imagen` | HUD | `200 image/png` para el armado mostrado en `espera`; `404` cuando esa imagen no está disponible en espera. Sin caché. |
| `POST /api/juego/iniciar` | Android, tras continuidad positiva | `{ "partida_id": 42 }` → `200` con la vista activa; `409` si el ID dejó de estar listo, no hay armado o ya se está jugando o mostrando resultado. |
| `POST /api/partidas/:id/cortes` | ESP32 | `{ "posicion": 3 }` → `200 { "resultado_corte": "victoria" }`; los otros valores son `penalizacion` y `derrota`. `409` si no corresponde a la partida activa. |
| `GET /api/juego/eventos?despues_de=N` | Android y ESP32 | `200 { "eventos": [...] }`, IDs mayores que `N`, en orden ascendente. Al abrir el cliente, tomar el cursor de `GET /api/juego/estado`; después, avanzar el cursor por cada evento leído. |

Los errores de JSON usan `{ "error": "<codigo>" }`: `400` para datos inválidos, `401` para credencial ausente o inválida en las rutas protegidas, `404` para imagen no disponible, `409` para conflicto de estado. Códigos de conflicto propuestos: `armado_existente`, `inicio_no_disponible` y `partida_no_activa`, según la operación.

**Eventos:**

| `tipo` | `datos` | Consumo |
| --- | --- | --- |
| `inicio` | `{ "vence_en_ms": 1780000300000 }` | Android abre el relay; ESP32 identifica la partida. |
| `penalizacion` | `{ "posicion": 3, "descuento_ms": 15000, "vence_en_ms": 1780000285000 }` | Android avisa solo a J1; ESP32 reproduce sonido corto; HUD ajusta reloj y sonido. |
| `resultado` | `{ "resultado": "victoria" }` o `{ "resultado": "derrota" }` | Android cierra el relay y avisa a ambos; ESP32 toca explosión solo en derrota; HUD muestra resultado. |
| `cancelacion` | `{}` | Android cierra el relay; ESP32 deja de reportar para esa partida. Sin buzzer ni anuncio de victoria/derrota. |

Cada evento se envuelve como `{ "id": 8, "partida_id": 42, "tipo": "inicio", "datos": { ... } }`. Los números de los ejemplos son ilustrativos; no fijan duración ni penalización. Como punto de partida, hacer una consulta periódica por segundo, sin superponer peticiones. Android usa la vista del servidor para autorizar cada reenvío, aunque la siguiente consulta periódica de eventos todavía no haya llegado.

**Socket.IO del HUD:** `estado_actualizado` lleva una vista completa al conectar y cuando cambia; `evento_juego` lleva un evento del cuadro anterior para efectos en vivo. Ambos son del servidor al HUD. El HUD obtiene la vista por HTTP al abrir o recuperar conexión; no reproduce sonidos históricos. Arduino y Android usan consultas HTTP periódicas en esta primera versión.

## Bluetooth y Telegram

- Bluetooth serie Android → ESP32: `INICIAR\n` (`LF`). ESP32 → Android: `TRUE\n` o `FALSE\n`. En el firmware actual, UART2 a `9600`, RX GPIO 16 y TX GPIO 17. La consulta verifica continuidad, no color ni orden.
- Telegram: `/inicia` exacto de J1 por privado. La lógica de Telegram vive en la app Android y se comunica internamente con el puente Bluetooth. Usar dos chats privados configurados por ID para el primer prototipo; asignación dinámica y uso de IA quedan fuera.
- Ante falta de armado, fallo Bluetooth o rechazo del servidor, no abrir el relay. No ejecutar una segunda verificación mientras otra solicitud de inicio esté en curso.

**Pendientes antes de la prueba completa:** reglas oficiales y prioridad, plantilla visual y correspondencia entre los extremos de cada cable y los orificios de la protoboard, duración de partida, descuento y pausa final. Despliegue público, conexión persistente del ESP32 y resolución precisa de un corte en el último instante se dejan para después.
