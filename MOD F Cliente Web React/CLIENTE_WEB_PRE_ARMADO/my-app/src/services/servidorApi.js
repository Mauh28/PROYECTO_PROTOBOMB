// export const BASE_URL = 'http://localhost:3010';
// cd "CLIENTE_WEB_PRE_ARMADO\my-app" npm run dev
export const BASE_URL = import.meta.env?.VITE_SERVER_URL || 'http://172.16.184.225:3010';
// Se consulta sin parámetros (?estado=...) para no sobrescribir la variable del servidor
export const ESTADO_URL = `${BASE_URL}/estado`;
export const API_ESTADO_URL = `${BASE_URL}/api/estado`;
export const METRICS_URL = `${BASE_URL}/metrics`;
export const IMAGEN1_URL = `${BASE_URL}/imagen1`;
export const INTERVALO_MS = 1000;
export const INTERVALOS_POLLING_MS = [500, 1000, 2000, 5000];

export function leerEstadoPreArmado(rawData) {
  const registro = Array.isArray(rawData)
    ? (rawData[rawData.length - 1] ?? {})
    : (rawData ?? {});

  const estadoValor =
    registro.estado !== undefined &&
      registro.estado !== null &&
      registro.estado !== '' &&
      !Number.isNaN(Number(registro.estado))
      ? Number(registro.estado)
      : null;

  // Si luego usas estado === 2 para pasar solo al cronómetro, aquí se puede separar por número de estado
  const preArmado = Boolean(
    (estadoValor !== null && estadoValor >= 1) ||
    registro.juegoIniciado === true ||
    registro.pre_armado === true ||
    registro.pre_armado === 1 ||
    registro.pre_armado === '1' ||
    registro.activo === true ||
    registro.activo === 1 ||
    registro.estado === 'pre_armado' ||
    registro.comando === '/prearmado'
  );

  const comando =
    registro.comando ||
    (estadoValor !== null ? `estado = ${estadoValor}` : (preArmado ? '/prearmado' : null));

  return {
    preArmado,
    estadoValor,
    juegoIniciado: Boolean(registro.juegoIniciado),
    conectadoArduino: registro.conectadoArduino ?? null,
    comando,
    imagenBase64: registro.imagenBase64 ?? null,
    imageUrl: registro.imageUrl ?? null,
    imagenId: registro.imagen_id ?? registro.imagenId ?? null,
    info: registro.info ?? null,
    inicioEn: registro.inicioEn ?? null,
    actualizadoEn: registro.actualizadoEn ?? null,
  };
}

export function obtenerUltimaImagenDeMetricas(listaMetricas) {
  if (!Array.isArray(listaMetricas) || listaMetricas.length === 0) {
    return null;
  }

  for (let i = listaMetricas.length - 1; i >= 0; i -= 1) {
    const item = listaMetricas[i];
    const hasImg1 = Boolean(item?.imagen1 && (!item.imagen1.data || item.imagen1.data.length > 0));
    if (hasImg1) {
      const id = item.ID ?? (i + 1);
      return {
        id,
        url: `${BASE_URL}/metrics/${id}/image1`,
        info: item.info ?? null,
      };
    }
  }

  return null;
}

export async function consultarEstadoServidor() {
  const resEstado = await fetch(ESTADO_URL, { cache: 'no-store' });

  if (resEstado.status === 404) {
    return { noEncontrado: true, estado: null };
  }

  if (!resEstado.ok) {
    throw new Error(`Error al consultar ${ESTADO_URL}: estado ${resEstado.status}`);
  }

  const dataEstado = await resEstado.json();
  return { noEncontrado: false, estado: leerEstadoPreArmado(dataEstado) };
}

async function descargarImagenComoBlob(url) {
  const urlConCacheBuster = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  const res = await fetch(urlConCacheBuster, { cache: 'no-store' });

  if (res.status === 404) {
    return { encontrada: false, status: 404, mensaje: null };
  }

  if (!res.ok) {
    let detalle = '';
    try {
      const dataError = await res.json();
      detalle = dataError?.error || dataError?.msg || '';
    } catch {
      detalle = '';
    }
    const sufijo = detalle ? ` - ${detalle}` : '';
    throw new Error(`Error al pedir imagen (${url}): HTTP ${res.status}${sufijo}`);
  }

  const blob = await res.blob();
  if (blob.size === 0) {
    return { encontrada: false, status: 200, mensaje: null };
  }

  return {
    encontrada: true,
    blobUrl: URL.createObjectURL(blob),
    urlOriginal: urlConCacheBuster,
  };
}

export async function consultarUltimaImagenBD() {
  const descargaDirecta = await descargarImagenComoBlob(IMAGEN1_URL);
  if (descargaDirecta.encontrada) {
    return {
      id: 'latest',
      url: descargaDirecta.blobUrl,
      urlOriginal: descargaDirecta.urlOriginal,
      esBlob: true,
      info: 'Última imagen (/imagen1)',
    };
  }

  const resMetrics = await fetch(METRICS_URL, { cache: 'no-store' });
  if (!resMetrics.ok) {
    throw new Error(`Error al consultar ${METRICS_URL}: estado ${resMetrics.status}`);
  }
  const dataMetrics = await resMetrics.json();
  const ultima = obtenerUltimaImagenDeMetricas(dataMetrics);
  if (!ultima) {
    return null;
  }

  const descargaMetrica = await descargarImagenComoBlob(ultima.url);
  if (!descargaMetrica.encontrada) {
    return null;
  }

  return {
    id: ultima.id,
    url: descargaMetrica.blobUrl,
    urlOriginal: descargaMetrica.urlOriginal,
    esBlob: true,
    info: ultima.info,
  };
}

export async function resolverImagenDesdeEstado(estado) {
  if (estado.imagenBase64) {
    const srcBase64 = estado.imagenBase64.startsWith('data:')
      ? estado.imagenBase64
      : `data:image/png;base64,${estado.imagenBase64}`;
    return {
      nuevaImagenInfo: {
        src: srcBase64,
        urlOriginal: srcBase64,
        esBase64: true,
        esBlob: false,
        id: estado.imagenId,
        info: estado.info,
      },
      key: `${estado.actualizadoEn ?? 'base64'}`,
    };
  }

  if (estado.imageUrl) {
    const srcUrl = estado.imageUrl.startsWith('http')
      ? estado.imageUrl
      : `${BASE_URL}${estado.imageUrl}`;
    const descarga = await descargarImagenComoBlob(srcUrl);
    if (!descarga.encontrada) {
      return { nuevaImagenInfo: null, key: null };
    }
    return {
      nuevaImagenInfo: {
        src: descarga.blobUrl,
        urlOriginal: descarga.urlOriginal,
        esBase64: false,
        esBlob: true,
        id: estado.imagenId,
        info: estado.info,
      },
      key: `${srcUrl}|${estado.actualizadoEn ?? ''}`,
    };
  }

  if (estado.imagenId !== null && estado.imagenId !== undefined) {
    const srcId = `${BASE_URL}/metrics/${estado.imagenId}/image1`;
    const descarga = await descargarImagenComoBlob(srcId);
    if (!descarga.encontrada) {
      return { nuevaImagenInfo: null, key: null };
    }
    return {
      nuevaImagenInfo: {
        src: descarga.blobUrl,
        urlOriginal: descarga.urlOriginal,
        esBase64: false,
        esBlob: true,
        id: estado.imagenId,
        info: estado.info,
      },
      key: `${estado.imagenId}|${estado.actualizadoEn ?? ''}`,
    };
  }

  const ultima = await consultarUltimaImagenBD();
  if (!ultima) {
    return { nuevaImagenInfo: null, key: null };
  }

  return {
    nuevaImagenInfo: {
      src: ultima.url,
      urlOriginal: ultima.urlOriginal,
      esBase64: false,
      esBlob: ultima.esBlob,
      id: ultima.id,
      info: ultima.info,
    },
    key: `${ultima.id}|${estado.actualizadoEn ?? ''}`,
  };
}
