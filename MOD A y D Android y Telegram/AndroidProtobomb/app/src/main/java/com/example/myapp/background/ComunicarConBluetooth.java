package com.example.myapp.background;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothSocket;
import android.util.Log;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.Callable;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

// Maneja la comunicacion bidireccional por Bluetooth (lecturas y escrituras)
public class ComunicarConBluetooth {
    private static final String TAG = "ON-ComunicarConBT";
    private final BluetoothSocket socket;
    private final InputStream inputStream;
    private final OutputStream outputStream;

    @SuppressLint("MissingPermission")
    public ComunicarConBluetooth(BluetoothSocket socket) {
        Log.i(TAG, "Constructor ComunicarConBluetooth");
        this.socket = socket;
        InputStream tmpIn = null;
        OutputStream tmpOut = null;

        if (socket != null) {
            try {
                tmpIn = socket.getInputStream();
                tmpOut = socket.getOutputStream();
            } catch (IOException e) {
                Log.e(TAG, "Error al obtener flujos del socket", e);
            }
        }
        this.inputStream = tmpIn;
        this.outputStream = tmpOut;
    }

    public boolean isConnected() {
        return socket != null && socket.isConnected() && outputStream != null && inputStream != null;
    }

    // Limpia cualquier byte residual en el buffer de entrada antes de una nueva consulta
    public void flushInputStream() {
        if (inputStream == null) return;
        try {
            while (inputStream.available() > 0) {
                int read = inputStream.read();
                if (read == -1) break;
            }
        } catch (Exception e) {
            Log.w(TAG, "flushInputStream aviso: " + e.getMessage());
        }
    }

    // Envia un texto por Bluetooth con conversion UTF-8 y flush inmediato
    public synchronized boolean write(String s) {
        Log.i(TAG, "write(): enviando [" + s.replace("\n", "\\n").replace("\r", "\\r") + "]");
        if (outputStream == null) {
            Log.e(TAG, "write(): outputStream es null");
            return false;
        }

        try {
            byte[] outBuffer = s.getBytes(StandardCharsets.UTF_8);
            outputStream.write(outBuffer);
            outputStream.flush();
            Log.i(TAG, "write(): " + outBuffer.length + " bytes enviados con exito");
            return true;
        } catch (Exception e) {
            Log.e(TAG, "write(): Error al escribir en outputStream", e);
            return false;
        }
    }

    // Lectura bloqueante con timeout usando ExecutorService para no depender de available()
    public String readWithTimeout(long timeoutMillis) {
        Log.i(TAG, "readWithTimeout(" + timeoutMillis + "ms)");
        if (inputStream == null) {
            Log.e(TAG, "readWithTimeout: inputStream es null");
            return "";
        }

        ExecutorService executor = Executors.newSingleThreadExecutor();
        Future<String> future = executor.submit(new Callable<String>() {
            @Override
            public String call() throws Exception {
                StringBuilder sb = new StringBuilder();
                byte[] buffer = new byte[256];
                while (!Thread.currentThread().isInterrupted()) {
                    int bytesRead = inputStream.read(buffer);
                    if (bytesRead > 0) {
                        String chunk = new String(buffer, 0, bytesRead, StandardCharsets.UTF_8);
                        sb.append(chunk);
                        String current = sb.toString().toUpperCase();
                        // Si recibimos TRUE, FALSE, 1, 0, o salto de linea, terminamos
                        if (current.contains("TRUE") || current.contains("FALSE")
                                || current.trim().equals("1") || current.trim().equals("0")
                                || sb.toString().contains("\n") || sb.toString().contains("\r")) {
                            break;
                        }
                    } else if (bytesRead == -1) {
                        break;
                    }
                }
                return sb.toString().trim();
            }
        });

        try {
            String result = future.get(timeoutMillis, TimeUnit.MILLISECONDS);
            Log.i(TAG, "readWithTimeout: recibido [" + result + "]");
            return result != null ? result : "";
        } catch (TimeoutException e) {
            Log.w(TAG, "readWithTimeout: Tiempo de espera agotado (" + timeoutMillis + "ms)");
            future.cancel(true);
            return "";
        } catch (Exception e) {
            Log.e(TAG, "readWithTimeout: Error en lectura", e);
            future.cancel(true);
            return "";
        } finally {
            executor.shutdownNow();
        }
    }
}
