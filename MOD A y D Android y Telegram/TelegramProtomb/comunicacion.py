from flask import Flask, request, jsonify
import threading, time, requests

app = Flask(__name__)

TOKEN = "TU_NUEVO_TOKEN"
TG_URL = f"https://api.telegram.org/bot{TOKEN}"

ID_ARTIFICIERO = 8338452778
ID_EXPERTO = 8988285896

pareja = {
    ID_ARTIFICIERO: ID_EXPERTO,
    ID_EXPERTO: ID_ARTIFICIERO
}

bridge_activo = False

def enviar_tg(chat_id, texto, reply_markup=None):
    payload = {
        "chat_id": chat_id,
        "text": texto,
        "parse_mode": "HTML"
    }
    if reply_markup:
        payload["reply_markup"] = reply_markup
    requests.post(f"{TG_URL}/sendMessage", json=payload)

def bucle_intermediario():
    global bridge_activo
    
    offset = -1
    init_res = requests.get(f"{TG_URL}/getUpdates", params={"offset": -1}).json()
    if init_res.get("result"):
        offset = init_res["result"][-1]["update_id"] + 1

    teclado_art = {
        "keyboard": [
            [{"text": "🔴 Rojo"}, {"text": "🔵 Azul"}, {"text": "🟡 Amarillo"}, {"text": "⚪ Blanco"}],
            [{"text": "❓ ¿Qué hago?"}, {"text": "✅ Hecho, ¿qué sigue?"}, {"text": "🔄 Repite"}]
        ],
        "resize_keyboard": True
    }

    teclado_exp = {
        "keyboard": [
            [{"text": "🛑 ¡ALTO! No toques nada"}, {"text": "📖 Buscando en manual..."}],
            [{"text": "🎨 Dime colores en orden"}, {"text": "✂️ Procede con el corte"}]
        ],
        "resize_keyboard": True
    }

    enviar_tg(ID_ARTIFICIERO, "💣 <b>CANAL ABIERTO</b>\nDescribe lo que ves en la protoboard al Experto.", teclado_art)
    enviar_tg(ID_EXPERTO, "🚨 <b>¡BOMBA ARMADA!</b>\nEl Artificiero está en línea. Guíalo con el manual.", teclado_exp)

    while bridge_activo:
        try:
            r = requests.get(f"{TG_URL}/getUpdates", params={"offset": offset, "timeout": 10}).json()
            for update in r.get("result", []):
                offset = update["update_id"] + 1
                msg = update.get("message", {})
                remitente = msg.get("chat", {}).get("id")

                if remitente in pareja:
                    destinatario = pareja[remitente]
                    rol = "💣 <b>[Artificiero]</b>" if remitente == ID_ARTIFICIERO else "📘 <b>[Experto]</b>"

                    if "text" in msg:
                        # Escapar caracteres HTML básicos para evitar errores de formato
                        texto_seguro = msg["text"].replace("<", "&lt;").replace(">", "&gt;")
                        enviar_tg(destinatario, f"{rol}: {texto_seguro}")
                    else:
                        # Feedback inmediato si intentan mandar fotos, audios o stickers
                        enviar_tg(remitente, "🚫 <i>Solo se permite texto. Describe la información con tus propias palabras.</i>")

        except Exception as e:
            print("Error en polling:", e)
            time.sleep(1)

@app.route("/estado", methods=["POST"])
def recibir_estado():
    global bridge_activo
    data = request.get_json() or {}
    estado = data.get("estado")

    if estado == 1 and not bridge_activo:
        bridge_activo = True
        threading.Thread(target=bucle_intermediario, daemon=True).start()
    elif estado == 0 and bridge_activo:
        bridge_activo = False
        limpiar = {"remove_keyboard": True}
        enviar_tg(ID_ARTIFICIERO, "🏁 <b>PARTIDA FINALIZADA</b>\nCanal cerrado.", limpiar)
        enviar_tg(ID_EXPERTO, "🏁 <b>PARTIDA FINALIZADA</b>\nCanal cerrado.", limpiar)

    return jsonify({"ok": True}), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=3010)