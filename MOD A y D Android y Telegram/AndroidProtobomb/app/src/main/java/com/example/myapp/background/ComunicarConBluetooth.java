package com.example.myapp.background;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothSocket;
import android.util.Log;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * Maneja la comunicacion bidireccional por Bluetooth.
 *
 * DISEÑO:
 *  - Un hilo lector persistente lee bytes del socket continuamente sin ser interrumpido.
 *    Esto evita que `future.cancel(true)` o `shutdownNow()` cierren el BluetoothSocket.
 *  - Las respuestas completas (TRUE/FALSE/1/0 o lineas terminadas en \n) se depositan
 *    en una LinkedBlockingQueue.
 *  - readWithTimeout() solo hace poll() con timeout sobre esa cola — nunca bloquea
 *    el hilo principal ni interrumpe el socket.
 */
public class ComunicarConBluetooth {
    private static final String TAG = "ON-ComunicarConBT";

    private final BluetoothSocket socket;
    private final InputStream inputStream;
    private final OutputStream outputStream;

    // Cola donde el hilo lector deposita respuestas completas
    private final LinkedBlockingQueue<String> responseQueue = new LinkedBlockingQueue<>();

    // Hilo lector persistente — NUNCA se interrumpe desde fuera
    private Thread readerThread;

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

        // Iniciar el hilo lector si los streams estan disponibles
        if (this.inputStream != null) {
            startReaderThread();
        }
    }

    // -------------------------------------------------------------------------
    // Hilo lector persistente
    // -------------------------------------------------------------------------

    private void startReaderThread() {
        readerThread = new Thread(() -> {
            Log.i(TAG, "readerThread: iniciado");
            byte[] buffer = new byte[256];
            StringBuilder sb = new StringBuilder();

            while (!Thread.currentThread().isInterrupted()) {
                try {
                    int bytesRead = inputStream.read(buffer);

                    if (bytesRead == -1) {
                        Log.w(TAG, "readerThread: fin de stream (socket cerrado por Arduino)");
                        break;
                    }

                    if (bytesRead > 0) {
                        String chunk = new String(buffer, 0, bytesRead, StandardCharsets.UTF_8);
                        sb.append(chunk);

                        String current = sb.toString().toUpperCase();

                        // Entregar respuesta cuando reconocemos una respuesta completa
                        boolean esRespuestaCompleta =
                                current.contains("TRUE")  ||
                                current.contains("FALSE") ||
                                current.trim().equals("1")||
                                current.trim().equals("0")||
                                sb.toString().contains("\n") ||
                                sb.toString().contains("\r");

                        if (esRespuestaCompleta) {
                            String respuesta = sb.toString().trim();
                            Log.i(TAG, "readerThread: respuesta completa recibida [" + respuesta + "]");
                            responseQueue.offer(respuesta);
                            sb.setLength(0); // Limpiar buffer para la siguiente respuesta
                        }
                    }

                } catch (IOException e) {
                    // Solo se sale si el socket se cerro externamente
                    if (!Thread.currentThread().isInterrupted()) {
                        Log.e(TAG, "readerThread: IOException (socket probablemente cerrado)", e);
                    }
                    break;
                }
            }
            Log.i(TAG, "readerThread: terminado");
        });

        readerThread.setName("BT-ReaderThread");
        readerThread.setDaemon(true); // Muere con la app, sin bloquear el proceso
        readerThread.start();
    }

    // -------------------------------------------------------------------------
    // API publica
    // -------------------------------------------------------------------------

    /** Verifica que el socket y los streams esten activos */
    public boolean isConnected() {
        return socket != null && socket.isConnected()
                && outputStream != null && inputStream != null;
    }

    /**
     * Descarta bytes residuales en la cola (respuestas de peticiones anteriores).
     * Llama antes de cada nueva consulta a Arduino.
     */
    public void flushResponseQueue() {
        int descartados = responseQueue.size();
        responseQueue.clear();
        if (descartados > 0) {
            Log.w(TAG, "flushResponseQueue: " + descartados + " respuesta(s) residual(es) descartada(s)");
        }
    }

    /**
     * Envia un texto por Bluetooth con codificacion UTF-8 y flush inmediato.
     * @return true si se envio correctamente, false si hubo un error.
     */
    public synchronized boolean write(String s) {
        Log.i(TAG, "write(): enviando ["
                + s.replace("\n", "\\n").replace("\r", "\\r") + "]");

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

    /**
     * Espera una respuesta de Arduino hasta timeoutMillis milisegundos.
     * NO interrumpe el socket — simplemente hace poll() sobre la cola.
     *
     * @param timeoutMillis Tiempo maximo de espera en milisegundos
     * @return Respuesta recibida, o "" si se agoto el tiempo
     */
    public String readWithTimeout(long timeoutMillis) {
        Log.i(TAG, "readWithTimeout(" + timeoutMillis + "ms): esperando respuesta en cola...");
        try {
            String result = responseQueue.poll(timeoutMillis, TimeUnit.MILLISECONDS);
            if (result != null) {
                Log.i(TAG, "readWithTimeout: respuesta obtenida [" + result + "]");
                return result;
            } else {
                Log.w(TAG, "readWithTimeout: timeout agotado sin respuesta");
                return "";
            }
        } catch (InterruptedException e) {
            Log.e(TAG, "readWithTimeout: InterruptedException", e);
            Thread.currentThread().interrupt();
            return "";
        }
    }

    /** Cierra el socket y detiene el hilo lector correctamente */
    public void close() {
        if (readerThread != null) {
            readerThread.interrupt();
        }
        try {
            if (socket != null) {
                socket.close();
            }
        } catch (IOException e) {
            Log.e(TAG, "close(): IOException al cerrar socket", e);
        }
    }
}
