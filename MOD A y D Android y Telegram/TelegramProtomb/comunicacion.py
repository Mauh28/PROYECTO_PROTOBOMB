import time, requests

TOKEN = "8178912720:AAGbjJ7dC-GM72qG8FVP27D8NlPL8J4GxYo"  #
TG_URL = f"https://api.telegram.org/bot{TOKEN}"
SERVIDOR_URL = "http://172.16.184.225:3010/estado"

# IDs de los jugadores (Artificiero con protoboard y Experto a la espera)
ID_ARTIFICIERO = 8338452778  # Quien manda INICIAR[cite: 2]
ID_EXPERTO = 8988285896      # Quien espera el inicio de comunicacion[cite: 2]

pareja = {
    ID_ARTIFICIERO: ID_EXPERTO,
    ID_EXPERTO: ID_ARTIFICIERO
}

bridge_activo = False

def enviar_tg(chat_id, texto):
    requests.post(f"{TG_URL}/sendMessage", json={"chat_id": chat_id, "text": texto})

def bucle_intermediario():
    global bridge_activo
    
    # 1. Limpiar cola de mensajes viejos (ej. el INICIAR que ya proceso Android)[cite: 2]
    offset = -1
    init_res = requests.get(f"{TG_URL}/getUpdates", params={"offset": -1}).json()
    if init_res.get("result"):
        offset = init_res["result"][-1]["update_id"] + 1

    # 2. Notificar a ambos jugadores (despierta al Experto que estaba en espera)
    enviar_tg(ID_ARTIFICIERO, "💣 Canal abierto. Ya puedes comunicarte con el Experto.")
    enviar_tg(ID_EXPERTO, "🚨 ¡Bomba armada! El Artificiero está en línea. Comienza el desarmado.")

    # 3. Escuchar y reenviar mensajes entre ambos
    while bridge_activo:
        try:
            r = requests.get(f"{TG_URL}/getUpdates", params={"offset": offset, "timeout": 10}).json()
            for update in r.get("result", []):
                offset = update["update_id"] + 1
                msg = update.get("message", {})
                remitente = msg.get("chat", {}).get("id")
                texto = msg.get("text", "")

                if remitente in pareja and texto:
                    destinatario = pareja[remitente]
                    rol = "💣 [Artificiero]" if remitente == ID_ARTIFICIERO else "📘 [Experto]"
                    enviar_tg(destinatario, f"{rol}: {texto}")
        except Exception as e:
            print("Error en polling:", e)
            time.sleep(1)

def esperar_estado_inicio():
    print(f"Esperando estado=1 en {SERVIDOR_URL}...")
    while True:
        try:
            r = requests.get(SERVIDOR_URL, timeout=3)
            if r.status_code == 200:
                data = r.json()
                if data.get("estado") == 1 or data.get("juegoIniciado") is True:
                    print("Estado=1 detectado! Iniciando puente de Telegram...")
                    return
        except Exception as e:
            print("Error consultando /estado:", e)
        time.sleep(1)

if __name__ == "__main__":
    esperar_estado_inicio()
    bridge_activo = True
    bucle_intermediario()