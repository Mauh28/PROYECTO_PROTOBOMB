# MOD D — Bot de Telegram

[Índice y contratos compartidos](../../AGENTS.md)

**Propósito.** Atender `/inicia` de J1, reenviar texto entre los chats privados durante la partida y entregar avisos al destinatario correcto. Ambos jugadores escriben al mismo bot desde sus respectivas apps de Telegram; Telegram y la app puente se usan en el mismo teléfono de J1.

**Stack y estructura actual.** El bot usa la API HTTPS de Telegram desde Java en `MOD A y D Android y Telegram/AndroidProtobomb/`. `background/MyService.java` hace `getUpdates` y `sendMessage`; `data/MyJSONParser.java` no recoge la identidad necesaria para autorizar a los jugadores. Extraer la lógica del bot dentro de la misma app. Solo esta lógica debe consumir `getUpdates`.

## Entradas y salidas

- `getUpdates`: leer `update_id`, `message.chat.id`, `message.chat.type` y `message.text`. Continuar con `offset=update_id+1`. Aceptar solo `chat.type=private` y los dos IDs configurados. Ignorar grupos, remitentes desconocidos y mensajes no textuales.
- Si el texto es `/inicia` y proviene de J1, llamar a `solicitarInicio()` del [puente Android](MOD-A-App-Android.md#entradas-y-salidas); no reenviar el comando. Si no se inicia, enviar el motivo solo a J1. El `/inicia` de J2 se ignora. No usar Gemini.
- Para los demás textos, llamar a `consultarEstado()`. Reenviar al otro chat solo si la fase devuelta es `activa`. Ante un fallo de consulta, bloquear el relay. Usar `sendMessage` con `{"chat_id":123,"text":"<texto>"}`; el ID es ilustrativo. Enviar texto plano como mensaje del bot para no adjuntar el perfil del remitente.
- Al recibir `penalizacion`, avisar solo a J1 con el descuento indicado por el servidor. Al recibir `resultado`, enviar victoria o derrota a ambos. `cancelacion` cierra el relay sin reportar una victoria o derrota. Si la penalización deja el tiempo en cero, el servidor envía únicamente el evento de derrota.

## Pendientes del responsable

- [ ] Configurar el token y los dos IDs privados fuera del código versionado. Revisar las credenciales hardcodeadas y reemplazar las activas antes de usar el bot.
- [ ] Conservar el polling a Telegram en la app Android, reconocer `/inicia` sin IA y aplicar el control de rol y estado a cada mensaje.
- [ ] Probar que no hay relay antes ni después de la partida, que J2 no puede iniciar, que la penalización llega solo a J1 y que el resultado llega a ambos.
