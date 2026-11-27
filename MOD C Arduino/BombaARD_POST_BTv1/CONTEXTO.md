# Contexto del Proyecto — BombaARD_POST_BTv1 (ESP32)

## Descripción general
Firmware en [BombaARD_POST_BTv1.ino](BombaARD_POST_BTv1.ino) para ESP32 (DevKit 38 pines) que monitorea un circuito de **5 cables** conectados a `GND` (usando `INPUT_PULLUP`), valida el armado inicial mediante **Bluetooth (UART2)** con Android, notifica al servidor por **HTTP POST** cuando un cable es desconectado y controla un **buzzer** para efectos de sonido.

---

## Mapa de pines utilizados

### 1. Cables del circuito (lado izquierdo — `INPUT_PULLUP`)
| Posición (`dato`) | Pin ESP32 | Pin físico | Lógica |
|-------------------|-----------|------------|--------|
| 1 | GPIO 32 | 7 | `LOW` = conectado (`true`), `HIGH` = desconectado (`false`) |
| 2 | GPIO 25 | 9 | `LOW` = conectado (`true`), `HIGH` = desconectado (`false`) |
| 3 | GPIO 33 | 8 | `LOW` = conectado (`true`), `HIGH` = desconectado (`false`) |
| 4 | GPIO 27 | 11 | `LOW` = conectado (`true`), `HIGH` = desconectado (`false`) |
| 5 | GPIO 26 | 10 | `LOW` = conectado (`true`), `HIGH` = desconectado (`false`) |

### 2. Buzzer (lado izquierdo — salida PWM / `tone()`)
- **Pin**: `GPIO 13` (pin físico 15, constante `SPEAKER_PIN`).
- **Conexión**: `GPIO 13` → Resistencia → Base del transistor NPN (buzzer alimentado desde `VIN 5V` y `GND` en pin 14).
- **Función**: `playShockwaveExplosion(SPEAKER_PIN)` (golpe inicial + ráfaga densa + eco decreciente).
- **Estado actual**: Probado y funcionando; se ejecuta al iniciar en `setup()` (pendiente asignarle su disparador definitivo en el flujo del juego).

### 3. Módulo Bluetooth externo (lado derecho — UART2)
- **Objeto**: `HardwareSerial MySerial(2)` a `9600` baudios (`SERIAL_8N1`).
- **RX ESP32 (`MySerialRX`)**: `GPIO 16` (pin físico 27) → conectado al **TX** del módulo Bluetooth.
- **TX ESP32 (`MySerialTX`)**: `GPIO 17` (pin físico 28) → conectado al **RX** del módulo Bluetooth.
- **GND**: Compartido entre ESP32 y módulo Bluetooth.

### 4. Pines libres seguros para futuras expansiones
- **Lado izquierdo**: `GPIO 14` *(emite un pulso breve al arrancar)*.
- **Lado derecho**: `GPIO 23`, `GPIO 22`, `GPIO 21`, `GPIO 19`, `GPIO 18`, `GPIO 4`.
- **Evitar**: `GPIO 34, 35, 36, 39` (solo entrada, sin `INPUT_PULLUP`), `GPIO 0, 2, 12, 15` (*strapping pins*), `GPIO 1, 3` (Serial USB), `GPIO 6–11` (Flash interna).

---

## Flujo de comunicación

### Bluetooth (verificación de armado con Android)
- **Comando recibido desde Android**: `INICIAR\n` (detección insensible a mayúsculas con `msgUpper.indexOf("INICIAR") >= 0`).
- **Acción del ESP32**: Comprueba los 5 cables con `todosConectados()`.
- **Respuesta enviada por `MySerial`**:
  - `TRUE\n` si los 5 cables están conectados (`LOW`).
  - `FALSE\n` si falta al menos uno.
- Se ejecuta `MySerial.flush()` tras el envío y se imprimen logs en el Monitor Serial (`[BT] Peticion recibida: [...]` y `[BT] Respuesta enviada con exito: ...`).
- *(Nota: la actualización dinámica de IP por Bluetooth fue eliminada por no ser necesaria.)*

### HTTP POST (notificación de cable desconectado)
- **Variables configurables** (inicio de `BombaARD_POST_BTv1.ino`):
  - `ip_servidor = "172.16.184.225"`
  - `WIFI_SSID = "UAS/DOCENTES"`
  - `WIFI_PASS = "print('estas_reprobado')"`
- **Endpoint**: `http://<ip_servidor>:3010/users`
- **Headers**: `Content-Type: application/json`
- **Timeouts**: `2000 ms` de conexión y lectura (evita bloquear la escucha de Bluetooth).
- **Comportamiento**:
  - Al iniciar, todos los cables se asumen conectados (`true`).
  - Cuando un cable cambia de estado y pasa a `false` (desconectado), su posición (`1` a `5`) se encola en `colaPost` (cola FIFO FreeRTOS de 16 elementos) sin bloquear `loop()`.
  - La tarea `tareaHttp` (en **Core 0**, stack `8192` bytes) mantiene el WiFi conectado en segundo plano y consume la cola enviando cada `POST` en orden:
    ```json
    {"dato":1}
    ```

### Monitor Serial (`115200` baudios)
- Imprime la tabla en una sola línea cada vez que cualquier cable cambia de estado (con debounce de `50 ms`):
  ```text
  C1    | C2    | C3    | C4    | C5    | TODOS
  ------|-------|-------|-------|-------|------
  true  | true  | true  | true  | true  | true
  ```

---

## Concurrencia y Cola de Envíos (FreeRTOS)
Para evitar que la conexión WiFi o las peticiones HTTP bloqueen la lectura de cables, la consola o el Bluetooth, el firmware divide el trabajo entre los dos núcleos del ESP32 usando **FreeRTOS**:

| Núcleo | Tarea / Función | Responsabilidad |
|--------|-----------------|-----------------|
| **Core 1** | `loop()` | Lee los 5 cables, imprime la tabla en consola al instante, atiende `INICIAR` por Bluetooth y encola eventos de desconexión. |
| **Core 0** | `tareaHttp` (stack `8192` B, prioridad `1`) | Mantiene el WiFi conectado en segundo plano y consume la cola enviando cada `POST` al servidor. |

### Funcionamiento de `colaPost`
- **Tipo**: `QueueHandle_t` (cola FIFO *thread-safe* de FreeRTOS).
- **Capacidad**: `16` enteros (`xQueueCreate(16, sizeof(int))`), cada uno representa la posición del cable desconectado (`1` a `5`).
- **Productor (Core 1)**: cuando un cable pasa de `true` a `false`, `loop()` inserta su posición con `xQueueSend(colaPost, &pos, 0)` sin esperar respuesta de red.
- **Consumidor (Core 0)**: `tareaHttp` espera elementos con `xQueueReceive(colaPost, &posicion, pdMS_TO_TICKS(100))` y llama a `enviarPost(posicion)` en el orden exacto de desconexión. Si no hay elementos y el WiFi está caído, intenta reconectar con `wifiMulti.run()`.

---

## Estado actual y pendientes
- [x] Lectura de 5 cables (`GPIO 32, 25, 33, 27, 26`) con tabla en Monitor Serial.
- [x] Comunicación Bluetooth UART2 (`GPIO 16/17`) compatible con `INICIAR` de Android.
- [x] Envío HTTP `POST` (`{"dato":1..5}`) en segundo plano con cola FIFO (`colaPost`) e hilo en Core 0 (`tareaHttp`).
- [x] Buzzer en `GPIO 13` con `playShockwaveExplosion()` probado y funcionando.
- [ ] Definir el evento/lógica que disparará el buzzer (y retirar la prueba automática en `setup()` cuando corresponda).
