package com.example.myapp.background;

import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class GeminiNLP {
    private static final String TAG = "GeminiNLP";

    // Pega tu API Key de Gemini aqui
    public static final String GEMINI_API_KEY = "TU_API_KEY_AQUI";

    private static final String GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=";

    // Envia el texto a Gemini para clasificar la intencion
    public static String clasificarMensaje(String mensajeUsuario) {
        if (mensajeUsuario == null || mensajeUsuario.trim().isEmpty()) {
            return "";
        }

        // Si no hay API Key configurada, devuelve el texto en mayusculas
        if (GEMINI_API_KEY == null || GEMINI_API_KEY.trim().isEmpty()) {
            Log.w(TAG, "API Key vacia, usando texto original");
            return mensajeUsuario.toUpperCase();
        }

        try {
            URL url = new URL(GEMINI_URL + GEMINI_API_KEY);
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setConnectTimeout(5000);
            conn.setReadTimeout(5000);
            conn.setDoOutput(true);

            // Instruccion del sistema para clasificar comandos del juego Protobomb
            String prompt = "Actua como clasificador de intenciones para un juego interactivo Protobomb con Arduino/ESP32 por Bluetooth. "
                    + "Analiza el mensaje del usuario y responde unicamente con una de estas dos opciones exactas:\n"
                    + "- 'INICIAR' si el usuario pide iniciar, armar, comenzar, arrancar o verificar armado de la bomba.\n"
                    + "- 'IGNORAR' para cualquier otro mensaje, comando o saludo.\n\n"
                    + "Mensaje: \"" + mensajeUsuario.replace("\"", "\\\"") + "\"";

            // Armar JSON para la API de Gemini
            JSONObject textObj = new JSONObject();
            textObj.put("text", prompt);

            JSONArray parts = new JSONArray();
            parts.put(textObj);

            JSONObject content = new JSONObject();
            content.put("parts", parts);

            JSONArray contents = new JSONArray();
            contents.put(content);

            JSONObject body = new JSONObject();
            body.put("contents", contents);

            OutputStream os = conn.getOutputStream();
            os.write(body.toString().getBytes("UTF-8"));
            os.flush();
            os.close();

            int code = conn.getResponseCode();
            if (code == HttpURLConnection.HTTP_OK) {
                BufferedReader br = new BufferedReader(new InputStreamReader(conn.getInputStream(), "UTF-8"));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line);
                }
                br.close();

                // Extraer el texto devuelto por Gemini
                JSONObject jsonRes = new JSONObject(sb.toString());
                JSONArray candidates = jsonRes.optJSONArray("candidates");
                if (candidates != null && candidates.length() > 0) {
                    JSONObject cand = candidates.getJSONObject(0);
                    JSONObject candContent = cand.optJSONObject("content");
                    if (candContent != null) {
                        JSONArray candParts = candContent.optJSONArray("parts");
                        if (candParts != null && candParts.length() > 0) {
                            String res = candParts.getJSONObject(0).optString("text", "").trim();
                            Log.i(TAG, "Gemini clasifica: " + res);
                            return res;
                        }
                    }
                }
            } else {
                Log.e(TAG, "Error HTTP Gemini: " + code);
            }
            conn.disconnect();
        } catch (Exception e) {
            Log.e(TAG, "Excepcion Gemini: " + e.getMessage(), e);
        }

        return mensajeUsuario.toUpperCase();
    }
}
