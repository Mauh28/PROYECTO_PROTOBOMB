package com.example.myapp.background;

import android.os.AsyncTask;
import android.util.Log;
import android.widget.TextView;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.URL;

public class MiPeticionREST extends AsyncTask<String,String,String> {
    private TextView output;

    HttpURLConnection urlConnection;
    StringBuilder json;
    String resultado = "";
    int offset;

    private String serverIp = "172.16.184.225";

    // Aby 8990981558:AAExkbtqg1JilrYUHVmO-oMA7R3373kQ7Bk 8338452778
    // Isabel 8178912720:AAGbjJ7dC-GM72qG8FVP27D8NlPL8J4GxYo 8988285896
    // mau 8714770526:AAF7xHdHR8hA7mFsGB80_hN7FIB30RC3JOI 2048888975
    private String botTel = "8178912720:AAGbjJ7dC-GM72qG8FVP27D8NlPL8J4GxYo";
    private String chatId = "8988285896";

    public MiPeticionREST(TextView output){
        offset = 0;
        this.output = output;

    }
    public MiPeticionREST(){
        offset = 0;
        this.output = null;
    }

    @Override
    public void onPreExecute(){
    }

    @Override
    protected String doInBackground(String... info) {
        String res = "";

        try
        {

            if( info[0].contains("POST")) {
                URL url = new URL("http://" + serverIp + ":3010/users");
                HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                conn.setDoOutput(true);
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");

                String input = "{\"F1\": 1, \"F2\": 1, \"F3\": 1, \"F4\": 1}";
                OutputStream os = conn.getOutputStream();
                os.write(input.getBytes());
                os.flush();

                int code = conn.getResponseCode();
                if (code < 200 || code >= 300) {
                    res = "error (" + code + ")";
                } else {
                    res = "ok (" + code + ")";
                }

                conn.disconnect();
            }

            if( info[0].contains("GET-SEND")){
                //Tiene como objetivo hacer que el BOT envíe un mensaje al chat con ID definido
                String textoCodificado = java.net.URLEncoder.encode(info[1], "UTF-8");
                URL url = new URL("https://api.telegram.org/bot" + botTel + "/sendMessage?chat_id=" + chatId + "&text=" + textoCodificado);

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

                if ( status == 200 ) {
                    res = "Message Send as  BOT";
                }

                conn.disconnect();
            }

            if( info[0].contains("GET-UPDATES")){
                URL url = new URL("https://api.telegram.org/bot" + botTel + "/getUpdates?offset=" + offset + "&timeout=5"); //IsabelBot
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

                if ( status == 200 ) {
                    //InputStreamReader reader = new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8);
                    InputStreamReader reader = new InputStreamReader(conn.getInputStream());
                    BufferedReader br = new BufferedReader(reader);

                    StringBuilder sb = new StringBuilder();
                    String line;
                    while ((line = br.readLine()) != null) {
                        sb.append(line + "\n");
                    }
                    br.close();
                    res = sb.toString();
                }

                conn.disconnect();
            }
        }
        catch (MalformedURLException e) {
            Log.e("ENVIOREST", "[MalformedURLException]=>" + e.getMessage());
            e.printStackTrace();

        } catch (IOException e) {
            Log.e("ENVIOREST", "[IOException]=>" + e.getMessage());
            e.printStackTrace();
        }

        return res;
    }

    @Override
    protected void onProgressUpdate(String... progress){

    }

    @Override
    protected void onPostExecute(String result) {
        this.resultado = result;
        if( this.output != null ) {
            this.output.setText("[" + result + "]");
        }
    }
}

