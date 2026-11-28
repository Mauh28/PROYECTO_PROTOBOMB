import base64
from io import BytesIO
from pathlib import Path
from random import randint, shuffle

from PIL import Image, ImageDraw
import requests


URL = "http://172.16.184.225:3010/api/partidas"
carpeta = Path(__file__).resolve().parent

# Cada par va del orificio de la fila I al riel de tierra inferior.
cables = [
    ((746, 258), (741, 607)),    # 1: I31
    ((853, 258), (853, 607)),    # 2: I36
    ((938, 258), (942, 607)),    # 3: I40
    ((1024, 258), (1031, 607)),  # 4: I44
    ((1087, 258), (1098, 607)),  # 5: I47
]

colores = ["#DC2626", "#F97316", "#EAB308", "#16A34A", "#2563EB"]
shuffle(colores)

with Image.open(carpeta / "assets" / "protoboard-base.png") as plantilla:
    imagen = plantilla.convert("RGB")

dibujo = ImageDraw.Draw(imagen)
for (inicio, fin), color in zip(cables, colores):
    dibujo.line([inicio, fin], fill=color, width=6)

buffer = BytesIO()
# La paleta reduce el tamaño del Base64 sin cambiar las dimensiones.
imagen.quantize(colors=48, method=Image.Quantize.FASTOCTREE).save(
    buffer, format="PNG", optimize=True
)

payload = {
    "imagen_png_base64": base64.b64encode(buffer.getvalue()).decode("ascii"),
    "posicion_solucion": randint(1, 5),
}

requests.post(URL, json=payload)
