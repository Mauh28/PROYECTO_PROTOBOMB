package com.example.myapp.background;

import android.annotation.SuppressLint;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.util.Log;

import java.io.IOException;
import java.lang.reflect.Method;
import java.util.UUID;

// Hilo encargado de solicitar una conexion Bluetooth segura con soporte de fallback
public class ConectarMiBluetooth {
    private static final String TAG = "ON-ConectarMiBT";
    private final BluetoothDevice dispositivo;
    private BluetoothSocket socket;
    private static final UUID BTMODULEUUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @SuppressLint("MissingPermission")
    public ConectarMiBluetooth(BluetoothDevice dispositivo) {
        this.dispositivo = dispositivo;
        BluetoothSocket tmpSocket = null;
        try {
            if (dispositivo != null) {
                tmpSocket = dispositivo.createRfcommSocketToServiceRecord(BTMODULEUUID);
            }
        } catch (IOException e) {
            Log.e(TAG, "Error al abrir el socket inicial", e);
        }
        this.socket = tmpSocket;
    }

    @SuppressLint("MissingPermission")
    public boolean execute() {
        Log.i(TAG, "execute(): Conectando con dispositivo: " + (dispositivo != null ? dispositivo.getName() : "null"));

        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        if (adapter != null && adapter.isDiscovering()) {
            adapter.cancelDiscovery();
            Log.i(TAG, "cancelDiscovery() ejecutado");
        }

        if (socket == null && dispositivo != null) {
            try {
                socket = dispositivo.createRfcommSocketToServiceRecord(BTMODULEUUID);
            } catch (Exception e) {
                Log.e(TAG, "Error recreando socket inicial", e);
            }
        }

        // Intento 1: Conexion estandar SPP
        try {
            if (socket != null) {
                socket.connect();
                Log.i(TAG, "Conexion Bluetooth establecida exitosamente (metodo estandar)");
                return true;
            }
        } catch (IOException e) {
            Log.w(TAG, "Conexion estandar fallo, intentando fallback por reflexion...", e);
            try {
                if (socket != null) {
                    socket.close();
                }
            } catch (Exception ignored) {}
        }

        // Intento 2: Fallback por reflexion createRfcommSocket (canal 1 RFCOMM)
        try {
            if (dispositivo != null) {
                Method m = dispositivo.getClass().getMethod("createRfcommSocket", new Class[]{int.class});
                socket = (BluetoothSocket) m.invoke(dispositivo, 1);
                if (socket != null) {
                    socket.connect();
                    Log.i(TAG, "Conexion Bluetooth establecida exitosamente (metodo fallback)");
                    return true;
                }
            }
        } catch (Exception e2) {
            Log.e(TAG, "Conexion fallback por reflexion tambien fallo", e2);
            try {
                if (socket != null) {
                    socket.close();
                }
            } catch (Exception ignored) {}
        }

        return false;
    }

    public boolean isConnected() {
        return socket != null && socket.isConnected();
    }

    public BluetoothSocket getSocket() {
        return this.socket;
    }
}
