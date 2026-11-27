# MOD F — Cliente Web 1: HUD de J1

[Índice y contratos compartidos](../../AGENTS.md)

**Propósito.** Mostrar a J1 el armado que debe copiar, el tiempo restante durante la partida y el resultado final.

**Stack y estructura actual.** React/Vite en `MOD F Cliente Web React/CLIENTE_WEB_PRE_ARMADO/my-app/`. `src/App.jsx` monta `PanelPreArmado.jsx`; `src/services/servidorApi.js` consulta `/estado`, `/imagen1` y `/metrics`. `src/components/Cronometro.jsx` cuenta hacia arriba y reinicia al montarse. `VITE_SERVER_URL` define la dirección del servidor.

## Entradas y comportamiento visible

| Entrada | Comportamiento |
| --- | --- |
| `GET /api/juego/estado` y Socket.IO `estado_actualizado` | Cargar la vista al abrir y recuperar el estado al reconectar. Aplicar `fase`, `partida_id`, `imagen_url`, `vence_en_ms` y `resultado` de la vista. |
| `GET /api/partidas/:id/imagen` | En `espera`, cargar y mostrar solo la imagen `image/png` del ID indicado. En `sin_armado`, mostrar «Preparando armado». Ocultar la imagen al comenzar. |
| `activa` | Mostrar los minutos y segundos hasta `vence_en_ms`, ajustando el reloj local con `servidor_en_ms`. Mostrar como mínimo `00:00`. El navegador no declara derrota por su cuenta. |
| Socket.IO `evento_juego` | Aplicar el nuevo `vence_en_ms` de `penalizacion` y reproducir su efecto sonoro. En `resultado`, reproducir el efecto correspondiente una sola vez; consultar el estado si falta la vista actualizada. |
| `resultado` | Mostrar victoria o derrota. Esperar a que el servidor publique `espera` o `sin_armado`; cargar la imagen del nuevo ID solo al entrar en `espera`. |

Si se pierde la conexión, señalar que no hay sincronización y volver a consultar la vista. Una recarga recupera la cuenta regresiva o el resultado; no reproduce sonidos históricos. Si el navegador bloquea audio automático, ofrecer activación de sonido sin impedir la partida. El HUD no publica armados, no inicia partidas y no recibe la solución.

## Pendientes del responsable

- [ ] Reemplazar la selección por última imagen de métricas por la imagen y el ID de la vista actual.
- [ ] Integrar Socket.IO y convertir el cronómetro local en cuenta regresiva sincronizada. Mantener separadas las herramientas de simulación del HUD de juego.
- [ ] Añadir resultado y sonido; probar recarga en partida, penalización, derrota al agotarse el tiempo y transición a la siguiente imagen.
