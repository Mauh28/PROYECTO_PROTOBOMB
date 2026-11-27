#include <Arduino.h>
#include <WiFi.h>
#include <WiFiMulti.h>
#include <HTTPClient.h>
#include <HardwareSerial.h>

const int MySerialRX = 16;  // GPIO 16
const int MySerialTX = 17;  // GPIO 17
HardwareSerial MySerial(2);

const int SPEAKER_PIN = 13;  // GPIO 13 -> Resistencia -> Base del NPN (buzzer alimentado desde VIN)

struct Cable {
  const int posicion;  // Posicion del cable (1 a 5)
  const int pin;
  bool conectado;
  bool estadoAnterior;
};

// 5 cables configurados (posiciones 1 a 5)
Cable cables[] = {
  {1, 32, true, true},  // Posicion 1 -> GPIO 32
  {2, 25, true, true},  // Posicion 2 -> GPIO 25
  {3, 33, true, true},  // Posicion 3 -> GPIO 33
  {4, 27, true, true},  // Posicion 4 -> GPIO 27
  {5, 26, true, true}   // Posicion 5 -> GPIO 26
};

const int NUM_CABLES = sizeof(cables) / sizeof(cables[0]);

// Configuracion de red y servidor
String ip_servidor = "172.16.184.225";
const char* WIFI_SSID = "UAS/DOCENTES";
const char* WIFI_PASS = "print('estas_reprobado')";
WiFiMulti wifiMulti;
QueueHandle_t colaPost;

bool todosConectados() {
  for (int i = 0; i < NUM_CABLES; i++) {
    if (digitalRead(cables[i].pin) != LOW) {
      return false;
    }
  }
  return true;
}

void enviarPost(int posicion) {
  if (wifiMulti.run() != WL_CONNECTED) {
    Serial.println("[WiFi] Sin conexion");
    return;
  }

  WiFiClient client;
  HTTPClient http;
  String url = "http://" + ip_servidor + ":3010/users";

  Serial.print("[HTTP] begin...\n");
  if (http.begin(client, url)) {
    http.setConnectTimeout(2000);
    http.setTimeout(2000);
    Serial.print("[HTTP] POST...\n");
    http.addHeader("Content-Type", "application/json");

    char cdata[64];
    sprintf(cdata, "{\"dato\":%d}", posicion);

    int httpCode = http.POST(cdata);
    if (httpCode > 0) {
      Serial.printf("[HTTP] POST cable %d -> code: %d\n", posicion, httpCode);
      if (httpCode == HTTP_CODE_OK || httpCode == HTTP_CODE_CREATED || httpCode == HTTP_CODE_MOVED_PERMANENTLY) {
        String payload = http.getString();
        Serial.println(payload);
      }
    } else {
      Serial.printf("[HTTP] POST... failed, error: %s\n", http.errorToString(httpCode).c_str());
    }
    http.end();
  } else {
    Serial.println("[HTTP] Unable to connect");
  }
}

void playShockwaveExplosion(int pin) {
  randomSeed(esp_random());

  // 1. Golpe seco inicial ("boom" rápido de alta energía percibida)
  for (int freq = 1900; freq >= 550; freq -= 140) {
    tone(pin, freq);
    delayMicroseconds(1800);  // Barrido ultra rápido para golpe seco
  }
  noTone(pin);
  delay(8);

  // 2. Ráfaga densa de detonación (frecuencias mezcladas sin pausas largas)
  for (int i = 0; i < 40; i++) {
    int f = random(260, 1350);
    tone(pin, f);
    delay(random(2, 6));
  }

  // 3. Onda de choque / eco decreciente (rebotes cada vez más separados y suaves)
  int echoDelay = 12;
  for (int echo = 0; echo < 6; echo++) {
    noTone(pin);
    delay(echoDelay);

    int echoFreq = random(220, 780) - (echo * 25);
    if (echoFreq < 120) echoFreq = 120;

    int pulseDuration = 18 - (echo * 2);
    if (pulseDuration < 6) pulseDuration = 6;

    for (int t = 0; t < pulseDuration; t++) {
      tone(pin, echoFreq + random(-60, 60));
      delay(2);
    }

    echoDelay += 14;
  }

  noTone(pin);
}

void tareaHttp(void* param) {
  int posicion;
  for (;;) {
    if (xQueueReceive(colaPost, &posicion, pdMS_TO_TICKS(100)) == pdTRUE) {
      enviarPost(posicion);
    } else if (WiFi.status() != WL_CONNECTED) {
      wifiMulti.run();
    }
  }
}

void imprimirFilaTabla() {
  Serial.printf("%-5s | %-5s | %-5s | %-5s | %-5s | %s\n",
    cables[0].conectado ? "true" : "false",
    cables[1].conectado ? "true" : "false",
    cables[2].conectado ? "true" : "false",
    cables[3].conectado ? "true" : "false",
    cables[4].conectado ? "true" : "false",
    todosConectados() ? "true" : "false");
}

void setup() {
  MySerial.begin(9600, SERIAL_8N1, MySerialRX, MySerialTX);
  Serial.begin(115200);
  wifiMulti.addAP(WIFI_SSID, WIFI_PASS);

  colaPost = xQueueCreate(16, sizeof(int));
  xTaskCreatePinnedToCore(tareaHttp, "TareaHTTP", 8192, NULL, 1, NULL, 0);

  for (int i = 0; i < NUM_CABLES; i++) {
    pinMode(cables[i].pin, INPUT_PULLUP);
    cables[i].conectado = (digitalRead(cables[i].pin) == LOW);
    cables[i].estadoAnterior = cables[i].conectado;
  }

  Serial.println("C1    | C2    | C3    | C4    | C5    | TODOS");
  Serial.println("------|-------|-------|-------|-------|------");
  imprimirFilaTabla();

  // Prueba del buzzer al iniciar
  playShockwaveExplosion(SPEAKER_PIN);
}

void loop() {
  if (MySerial.available() > 0) {
    String mensaje = MySerial.readStringUntil('\n');
    mensaje.trim();
    Serial.print("[BT] Peticion recibida: [");
    Serial.print(mensaje);
    Serial.println("]");

    String msgUpper = mensaje;
    msgUpper.toUpperCase();

    if (msgUpper.indexOf("INICIAR") >= 0) {
      bool armado = todosConectados();
      MySerial.print(armado ? "TRUE\n" : "FALSE\n");
      MySerial.flush();
      Serial.printf("[BT] Respuesta enviada con exito: %s\n", armado ? "TRUE" : "FALSE");
    }
  }

  bool huboCambio = false;

  for (int i = 0; i < NUM_CABLES; i++) {
    cables[i].conectado = (digitalRead(cables[i].pin) == LOW);

    if (cables[i].conectado != cables[i].estadoAnterior) {
      cables[i].estadoAnterior = cables[i].conectado;
      huboCambio = true;

      // Cuando un cable pasa a false (desconectado), encola su posicion para enviarla en segundo plano
      if (!cables[i].conectado) {
        int pos = cables[i].posicion;
        xQueueSend(colaPost, &pos, 0);
      }
    }
  }

  if (huboCambio) {
    imprimirFilaTabla();
    delay(20);
  }
}