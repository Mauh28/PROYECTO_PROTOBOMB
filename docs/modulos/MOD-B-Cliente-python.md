# MOD B — App de escritorio (Python)

[Índice y contratos compartidos](../../AGENTS.md)

**Propósito.** Mantener un armado listo en el servidor. Para cada armado, permutar los cinco colores, calcular la única posición correcta y renderizar la imagen que verá J1.

**Stack y estructura.** `MOD B Cliente python/` solo contiene `.gitkeep`. Para el prototipo se propone Python 3, Pillow para renderizar y `urllib.request` para HTTP. Separar `generador.py` (reglas y dibujo), `main.py` (bucle y servidor) y `assets/` (plantilla y trazos por posición). Basta un proceso de escritorio en ejecución; no se requiere una interfaz gráfica para la primera integración.

## Entradas y salidas

1. Consultar periódicamente `GET /api/juego/estado`. Si `hay_armado_listo` es `false`, generar el primero o reponer el que se acaba de consumir. Si es `true`, esperar.
2. Asignar sin repetición `rojo`, `naranja`, `amarillo`, `verde` y `azul` a las posiciones `1` a `5`. Evaluar las mismas reglas y en el mismo orden que el [manual de J2](MOD-F2-Cliente-Web-React-J2.md).
3. Usar un diagrama base de la protoboard con el circuito armado y sin los cinco cables. Sobreponer cada cable con su color sorteado, de modo que se vean sus dos orificios de conexión. Una posición conserva el mismo trazo y los mismos extremos entre armados; cambia su color. La imagen no señala la solución.
4. Publicar `POST /api/partidas` con `{"imagen_png_base64":"<base64>","posicion_solucion":3}` y el token de Python. Un `201` confirma que se guardó el armado. Un `409 armado_existente` indica que ya hay un armado listo: volver a consultar antes de generar otro.

Si falla el dibujo o una permutación no da una única solución válida, no publicar. Si el servidor no responde, esperar y consultar el estado antes de repetir la publicación. Python puede dejar lista la siguiente partida mientras la actual está activa; no ordena reinicios ni lee sensores.

## Pendientes del responsable

- [ ] Acordar con Hardware los orificios y trazos de las posiciones `1`–`5`; producir la plantilla sin cables.
- [ ] Obtener las reglas oficiales y comprobar con el responsable del manual que las 120 permutaciones dan una única posición y que ambos módulos coinciden.
- [ ] Implementar el render y la publicación; demostrar que se repone el armado durante una partida y que no se acumulan armados listos.
