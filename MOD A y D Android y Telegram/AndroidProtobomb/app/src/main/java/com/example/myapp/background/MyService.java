package com.example.myapp.background;

import android.annotation.SuppressLint;
import android.app.IntentService;
import android.bluetooth.BluetoothDevice;
import android.content.Intent;
import android.util.Log;

import com.example.myapp.SimpleActivity;
import com.example.myapp.data.MyData;
import com.example.myapp.data.MyJSONParser;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class MyService extends IntentService {
    private static final String TAG = "ON-MyService";
    private MyJSONParser parser = null;
    private int offset = -1;
    private String res;

    private ConectarMiBluetooth bt_connect = null;
    private ComunicarConBluetooth bt_comm = null;
    private String serverIp = "172.16.186.170";

    // Configuracion de Telegram
    // Aby 8990981558:AAExkbtqg1JilrYUHVmO-oMA7R3373kQ7Bk 8338452778
    // Isabel 8178912720:AAGbjJ7dC-GM72qG8FVP27D8NlPL8J4GxYo 8988285896
    // mau 8714770526:AAF7xHdHR8hA7mFsGB80_hN7FIB30RC3JOI 2048888975
    private String botTel = "8178912720:AAGbjJ7dC-GM72qG8FVP27D8NlPL8J4GxYo";
    private String chatId = "8988285896";

    public MyService() {
        super("MyService");
    }

    @SuppressLint("MissingPermission")
    @Override
    protected void onHandleIntent(Intent workIntent) {
        BluetoothDevice bt = workIntent != null ? workIntent.getParcelableExtra(SimpleActivity.TAG_BLUETOOTH_DEVICE) : null;
        String devName = (bt != null && bt.getName() != null) ? bt.getName() : "Dispositivo Bluetooth";
        Log.i(TAG, "onHandleIntent(): Iniciando servicio con [" + devName + "]");

        if (bt != null) {
            bt_connect = new ConectarMiBluetooth(bt);
            boolean conectado = bt_connect.execute();
            if (conectado && bt_connect.getSocket() != null) {
                bt_comm = new ComunicarConBluetooth(bt_connect.getSocket());
                this.send("Conectado por Bluetooth a " + devName + ". A la espera del comando Iniciar...");
            } else {
                bt_comm = null;
                this.send("ALERTA: No se pudo conectar por Bluetooth con " + devName + ". Verifique que esté encendido y emparejado.");
            }
        } else {
            this.send("ALERTA: No se recibió ningún dispositivo Bluetooth.");
        }

        MyData data = null;
        do {
            data = this.get_updates();
        } while (data == null || this.process(data));
    }

    private void send(String info) {
        Log.i(TAG, "send() a Telegram: " + info);
        try {
            String textoCodificado = URLEncoder.encode(info, "UTF-8");
            URL url = new URL("https://api.telegram.org/bot" + botTel + "/sendMessage?chat_id=" + chatId + "&text="
                    + textoCodificado);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();

            conn.setDoOutput(true);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Content-length", "0");

            conn.setUseCaches(false);
            conn.setAllowUserInteraction(false);
            conn.setConnectTimeout(3000);
            conn.setReadTimeout(3000);
            conn.connect();

            int status = conn.getResponseCode();
            if (status == 200) {
                res = "Message Send as BOT";
            }
            conn.disconnect();
        } catch (MalformedURLException e) {
            Log.e(TAG, "send(): MalformedURLException", e);
        } catch (IOException e) {
            Log.e(TAG, "send(): IOException", e);
        }
    }

    private boolean enviarEstadoAlServidor(int estado) {
        String urlString = "http://" + serverIp + ":3010/estado";
        Log.i(TAG, "enviarEstadoAlServidor(): " + estado + " enviando a " + urlString);
        HttpURLConnection conn = null;
        try {
            URL url = new URL(urlString);
            conn = (HttpURLConnection) url.openConnection();
            conn.setDoOutput(true);
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(4000);
            conn.setReadTimeout(4000);

            String jsonInput = "{\"estado\":" + estado + ",\"origen\":\"android\"}";
            OutputStream os = conn.getOutputStream();
            os.write(jsonInput.getBytes(StandardCharsets.UTF_8));
            os.flush();
            os.close();

            int code = conn.getResponseCode();
            Log.i(TAG, "enviarEstadoAlServidor responseCode: " + code);
            return (code >= 200 && code < 300);
        } catch (Exception e) {
            Log.e(TAG, "enviarEstadoAlServidor Exception hacia " + urlString + ": ", e);
            return false;
        } finally {
            if (conn != null) {
                conn.disconnect();
            }
        }
    }

    private MyData get_updates() {
        Log.d(TAG, "get_updates()");
        MyData data = null;
        HttpURLConnection conn = null;
        try {
            String myUrl = "https://api.telegram.org/bot" + botTel + "/getUpdates?offset=" + offset + "&timeout=0";
            URL url = new URL(myUrl);
            conn = (HttpURLConnection) url.openConnection();

            conn.setDoOutput(true);
            conn.setRequestMethod("GET");
            conn.setRequestProperty("Content-length", "0");

            conn.setUseCaches(false);
            conn.setAllowUserInteraction(false);
            conn.setConnectTimeout(3000);
            conn.setReadTimeout(3000);
            conn.connect();

            int status = conn.getResponseCode();
            if (status == 200) {
                InputStreamReader reader = new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8);
                BufferedReader br = new BufferedReader(reader);

                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line).append("\n");
                }
                br.close();
                res = sb.toString();

                this.parser = new MyJSONParser("[" + res + "]");
                data = this.parser.getValue();
            }
            conn.disconnect();
        } catch (MalformedURLException e) {
            Log.e(TAG, "get_updates(): MalformedURLException", e);
            if (conn != null) conn.disconnect();
        } catch (IOException e) {
            Log.e(TAG, "get_updates(): IOException", e);
            if (conn != null) conn.disconnect();
        }

        return data;
    }

    private boolean process(MyData data) {
        Log.d(TAG, "process()");
        int update_id = -1;
        String msg = "";
        for (int i = 0; i < data.msg.size(); ++i) {
            update_id = data.update_id.get(i);
            msg = data.msg.get(i);

            this.offset = update_id + 1;
            String msgTrim = msg != null ? msg.trim() : "";
            if (msgTrim.isEmpty()) {
                continue;
            }

            // Clasificar intencion con Gemini o directamente
            String comando = GeminiNLP.clasificarMensaje(msgTrim);
            String msgUpper = (comando != null && !comando.isEmpty()) ? comando.toUpperCase().trim() : msgTrim.toUpperCase();

            // Unicamente atendemos el comando INICIAR, cualquier otro se ignora
            if (msgUpper.equals("INICIAR") || msgTrim.toUpperCase().contains("INICIAR")) {
                if (bt_comm == null || !bt_comm.isConnected()) {
                    this.send("Error: Bluetooth desconectado de Arduino. Verifique la conexión.");
                    continue;
                }

                this.send("Verificando armado con Arduino...");

                // Limpiar respuestas residuales en la cola antes de nueva consulta
                bt_comm.flushResponseQueue();

                // Enviar comando INICIAR con salto de linea requerido por Arduino
                boolean enviado = bt_comm.write("INICIAR\n");
                if (!enviado) {
                    this.send("Error al enviar solicitud por Bluetooth a Arduino.");
                    continue;
                }

                // Leer respuesta booleana de Arduino (TRUE / FALSE) con timeout de 5 segundos
                String respuestaArduino = bt_comm.readWithTimeout(5000);
                Log.i(TAG, "Respuesta recibida de Arduino: [" + respuestaArduino + "]");

                String respUpper = respuestaArduino.toUpperCase().trim();
                if (respUpper.contains("TRUE") || respUpper.equals("1")) {
                    // True: se armo correctamente y se envia al servidor estado=1
                    this.send("Se armó correctamente.");
                    boolean srvOk = enviarEstadoAlServidor(1);
                    if (srvOk) {
                        this.send("Servidor notificado: estado=1.");
                    } else {
                        this.send("Aviso: Armado correcto, pero falló la notificación al servidor.");
                    }
                    return false;
                } else if (respUpper.contains("FALSE") || respUpper.equals("0")) {
                    // False: mostrar mensaje de que verifique el armado correcto
                    this.send("Verifique el armado correcto.");
                } else if (respuestaArduino.isEmpty()) {
                    // Tiempo agotado sin respuesta
                    this.send("Sin respuesta de Arduino (Tiempo agotado). Verifique las conexiones físicas TX/RX de Arduino.");
                } else {
                    this.send("Respuesta de Arduino: [" + respuestaArduino + "]. Verifique el armado.");
                }
            } else {
                // Cualquier otro comando es completamente ignorado en el juego
                Log.d(TAG, "Mensaje ignorado (no es INICIAR): " + msgTrim);
            }
        }

        return true;
    }
}
