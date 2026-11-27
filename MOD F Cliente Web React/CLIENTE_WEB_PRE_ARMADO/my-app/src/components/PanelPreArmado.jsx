import { useState, useEffect, useCallback, useRef } from 'react';
import heroImg from '../assets/hero.png';
import MonitorEstado from './MonitorEstado.jsx';
import VisorImagenBD from './VisorImagenBD.jsx';
import {
  BASE_URL,
  INTERVALO_MS,
  consultarEstadoServidor,
  consultarUltimaImagenBD,
  resolverImagenDesdeEstado,
} from '../services/servidorApi.js';

// Equivalente a MyTable.jsx: consulta el estado y muestra la imagen de la BD
export default function PanelPreArmado() {
  const [estadoServidor, setEstadoServidor] = useState(null);
  const [estadoAnterior, setEstadoAnterior] = useState(null);
  const [preArmado, setPreArmado] = useState(false);
  const [comandoActual, setComandoActual] = useState(null);
  const [horaDeteccion, setHoraDeteccion] = useState(null);
  const [imagenInfo, setImagenInfo] = useState(null);
  const [versionImagen, setVersionImagen] = useState(() => Date.now());
  const [errorImagen, setErrorImagen] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [aviso, setAviso] = useState(null);
  const [modoSimulacion, setModoSimulacion] = useState(false);
  const [modoDirectoBD, setModoDirectoBD] = useState(false);
  const [pollingActivo, setPollingActivo] = useState(true);
  const [intervaloMs, setIntervaloMs] = useState(INTERVALO_MS);
  const [totalPeticiones, setTotalPeticiones] = useState(0);
  const [totalCambios, setTotalCambios] = useState(0);
  const [ultimaConsulta, setUltimaConsulta] = useState(null);
  const [ultimoCambio, setUltimoCambio] = useState(null);
  const [cambioReciente, setCambioReciente] = useState(false);
  const [historialCambios, setHistorialCambios] = useState([]);
  const [infoServidor, setInfoServidor] = useState(null);
  const [actualizadoEnServidor, setActualizadoEnServidor] = useState(null);

  const preArmadoAnteriorRef = useRef(false);
  const imagenKeyAnteriorRef = useRef(null);
  const peticionEnCursoRef = useRef(false);
  const estadoPrevioRef = useRef(undefined);
  const timeoutCambioRef = useRef(null);
  const ultimoDisparoImagenRef = useRef(null);
  const blobUrlActualRef = useRef(null);

  const reemplazarImagenInfo = useCallback((nuevaInfo) => {
    if (blobUrlActualRef.current && blobUrlActualRef.current !== nuevaInfo?.src) {
      URL.revokeObjectURL(blobUrlActualRef.current);
    }
    blobUrlActualRef.current = nuevaInfo?.esBlob ? nuevaInfo.src : null;
    setImagenInfo(nuevaInfo);
  }, []);

  const aplicarImagenDesdeBD = useCallback((ultima, comando, forzarActualizacion = false) => {
    const nuevaImagenInfo = ultima
      ? {
          src: ultima.url,
          urlOriginal: ultima.urlOriginal ?? ultima.url,
          esBase64: false,
          esBlob: Boolean(ultima.esBlob),
          id: ultima.id,
          info: ultima.info,
        }
      : null;

    const key = ultima ? `bd|${ultima.id}` : null;
    const cambioAEncendido = !preArmadoAnteriorRef.current;
    const cambioImagen = key !== null && key !== imagenKeyAnteriorRef.current;

    preArmadoAnteriorRef.current = true;
    imagenKeyAnteriorRef.current = key;

    setPreArmado(true);
    setComandoActual(comando);
    reemplazarImagenInfo(nuevaImagenInfo);

    if (cambioAEncendido) {
      setHoraDeteccion(new Date().toLocaleTimeString());
    }

    if (forzarActualizacion || cambioAEncendido || cambioImagen) {
      setVersionImagen(Date.now());
      setErrorImagen(false);
    }
  }, [reemplazarImagenInfo]);

  const fetchData = useCallback(async (forzarDirecto = false, forzarRecargaImagen = false) => {
    if (peticionEnCursoRef.current) {
      return;
    }

    peticionEnCursoRef.current = true;
    const usarDirecto = forzarDirecto || modoDirectoBD;

    try {
      setCargando(true);

      if (usarDirecto) {
        const ultima = await consultarUltimaImagenBD();
        aplicarImagenDesdeBD(ultima, 'Consulta directa a BD (/imagen1)', forzarDirecto || forzarRecargaImagen);
        setAviso(null);
        setError(null);
        return;
      }

      const resultadoEstado = await consultarEstadoServidor();

      if (resultadoEstado.noEncontrado) {
        const ultima = await consultarUltimaImagenBD();
        aplicarImagenDesdeBD(ultima, 'Consulta directa a BD (/imagen1)', forzarRecargaImagen);
        setAviso('Ruta /estado no encontrada (404); cargando imagen directamente desde /imagen1.');
        setError(null);
        return;
      }

      setAviso(null);
      const { estado } = resultadoEstado;
      const horaActual = new Date().toLocaleTimeString();

      setTotalPeticiones((prev) => prev + 1);
      setUltimaConsulta(horaActual);
      setInfoServidor(estado.info ?? null);
      setActualizadoEnServidor(estado.actualizadoEn ?? null);

      if (estadoPrevioRef.current === undefined) {
        estadoPrevioRef.current = estado.estadoValor;
      } else if (estadoPrevioRef.current !== estado.estadoValor) {
        const anterior = estadoPrevioRef.current;
        const nuevo = estado.estadoValor;
        const registroCambio = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          hora: horaActual,
          anterior,
          nuevo,
          info: estado.info ?? null,
          comando: estado.comando ?? null,
        };

        setEstadoAnterior(anterior);
        estadoPrevioRef.current = nuevo;
        setTotalCambios((prev) => prev + 1);
        setUltimoCambio(registroCambio);
        setHistorialCambios((prev) => [registroCambio, ...prev].slice(0, 15));
        setCambioReciente(true);

        if (timeoutCambioRef.current) {
          clearTimeout(timeoutCambioRef.current);
        }
        timeoutCambioRef.current = setTimeout(() => {
          setCambioReciente(false);
        }, 4000);
      }

      setEstadoServidor(estado.estadoValor);

      if (!estado.preArmado) {
        setPreArmado(false);
        setComandoActual(null);
        setHoraDeteccion(null);
        reemplazarImagenInfo(null);
        setErrorImagen(false);
        preArmadoAnteriorRef.current = false;
        imagenKeyAnteriorRef.current = null;
        ultimoDisparoImagenRef.current = null;
        setError(null);
        return;
      }

      const cambioAEncendido = !preArmadoAnteriorRef.current;
      preArmadoAnteriorRef.current = true;
      setPreArmado(true);
      setComandoActual(estado.comando);

      if (cambioAEncendido) {
        setHoraDeteccion(new Date().toLocaleTimeString());
      }

      const claveDisparo = `${estado.estadoValor}|${estado.imagenId ?? 'latest'}|${estado.actualizadoEn ?? ''}`;
      const debePedirImagen =
        forzarRecargaImagen ||
        cambioAEncendido ||
        claveDisparo !== ultimoDisparoImagenRef.current;

      if (debePedirImagen) {
        ultimoDisparoImagenRef.current = claveDisparo;
        const { nuevaImagenInfo, key } = await resolverImagenDesdeEstado(estado);
        const cambioImagen = key !== null && key !== imagenKeyAnteriorRef.current;

        imagenKeyAnteriorRef.current = key;
        reemplazarImagenInfo(nuevaImagenInfo);

        if (cambioAEncendido || cambioImagen || forzarRecargaImagen) {
          setVersionImagen(Date.now());
          setErrorImagen(false);
        }
      }

      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
      peticionEnCursoRef.current = false;
    }
  }, [modoDirectoBD, aplicarImagenDesdeBD, reemplazarImagenInfo]);

  const alternarModoDirectoBD = () => {
    if (modoSimulacion) {
      setModoSimulacion(false);
    }

    if (modoDirectoBD) {
      setModoDirectoBD(false);
      setEstadoServidor(null);
      setPreArmado(false);
      setComandoActual(null);
      setHoraDeteccion(null);
      reemplazarImagenInfo(null);
      setErrorImagen(false);
      setAviso(null);
      preArmadoAnteriorRef.current = false;
      imagenKeyAnteriorRef.current = null;
      ultimoDisparoImagenRef.current = null;
      return;
    }

    setModoDirectoBD(true);
    fetchData(true, true);
  };

  const alternarSimulacion = () => {
    if (modoDirectoBD) {
      setModoDirectoBD(false);
    }

    setModoSimulacion((prev) => {
      const siguiente = !prev;
      if (siguiente) {
        setEstadoServidor(1);
        setPreArmado(true);
        setComandoActual('/prearmado (simulado)');
        setHoraDeteccion(new Date().toLocaleTimeString());
        reemplazarImagenInfo({
          src: heroImg,
          esBase64: true,
          esBlob: false,
          id: 1,
          info: 'Imagen simulada desde BD',
        });
        setErrorImagen(false);
        setError(null);
        setAviso(null);
        preArmadoAnteriorRef.current = true;
        imagenKeyAnteriorRef.current = 'simulado';
        ultimoDisparoImagenRef.current = 'simulado';
      } else {
        setEstadoServidor(0);
        setPreArmado(false);
        setComandoActual(null);
        setHoraDeteccion(null);
        reemplazarImagenInfo(null);
        setErrorImagen(false);
        preArmadoAnteriorRef.current = false;
        imagenKeyAnteriorRef.current = null;
        ultimoDisparoImagenRef.current = null;
      }
      return siguiente;
    });
  };

  useEffect(() => {
    return () => {
      if (timeoutCambioRef.current) {
        clearTimeout(timeoutCambioRef.current);
      }
      if (blobUrlActualRef.current) {
        URL.revokeObjectURL(blobUrlActualRef.current);
        blobUrlActualRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (modoSimulacion || !pollingActivo) {
      return undefined;
    }

    const timeoutInicial = setTimeout(() => {
      fetchData();
    }, 0);

    const interval = setInterval(() => {
      fetchData();
    }, intervaloMs);

    return () => {
      clearTimeout(timeoutInicial);
      clearInterval(interval);
    };
  }, [modoSimulacion, pollingActivo, intervaloMs, fetchData]);

  const limpiarHistorial = () => {
    setHistorialCambios([]);
    setTotalCambios(0);
    setUltimoCambio(null);
    setCambioReciente(false);
  };

  const srcImagenFinal = imagenInfo
    ? (imagenInfo.esBase64 || imagenInfo.esBlob
      ? imagenInfo.src
      : `${imagenInfo.src}${imagenInfo.src.includes('?') ? '&' : '?'}t=${versionImagen}`)
    : null;

  return (
    <>
      <MonitorEstado
        estadoActual={estadoServidor}
        estadoAnterior={estadoAnterior}
        pollingActivo={pollingActivo}
        modoSimulacion={modoSimulacion}
        modoDirectoBD={modoDirectoBD}
        intervaloMs={intervaloMs}
        onCambiarIntervalo={setIntervaloMs}
        onAlternarPolling={() => setPollingActivo((prev) => !prev)}
        onConsultarAhora={() => fetchData(modoDirectoBD, true)}
        onLimpiarHistorial={limpiarHistorial}
        cargando={cargando}
        totalPeticiones={totalPeticiones}
        totalCambios={totalCambios}
        ultimaConsulta={ultimaConsulta}
        ultimoCambio={ultimoCambio}
        cambioReciente={cambioReciente}
        historialCambios={historialCambios}
        infoServidor={infoServidor}
        actualizadoEnServidor={actualizadoEnServidor}
        error={error}
      />

      <div className="caja">
        <h2>🖼️ Estado de Pre-Armado e Imagen</h2>

      <div className={`estado-badge ${preArmado ? 'estado-activo' : 'estado-espera'}`}>
        {preArmado
          ? (modoDirectoBD
            ? '🟢 Imagen desde BD activa'
            : (estadoServidor !== null ? `🟢 Pre-armado ACTIVO (estado = ${estadoServidor})` : '🟢 Pre-armado ACTIVO'))
          : (estadoServidor !== null ? `⚪ En espera (estado = ${estadoServidor})` : '⚪ En espera de estado = 1')}
      </div>

      {preArmado && comandoActual && (
        <p className="comando-badge">Origen: {comandoActual}</p>
      )}

      {preArmado && horaDeteccion && (
        <p className="hora-deteccion">Detectado a las {horaDeteccion}</p>
      )}

      {preArmado && imagenInfo && (imagenInfo.id || imagenInfo.info) && (
        <p className="imagen-meta">
          {imagenInfo.id ? `Registro BD #${imagenInfo.id}` : 'Registro BD'}
          {imagenInfo.info ? ` — ${imagenInfo.info}` : ''}
        </p>
      )}

      {cargando && <p className="mensaje-info">Consultando servidor ({BASE_URL})...</p>}
      {aviso && !modoSimulacion && <p className="mensaje-info">{aviso}</p>}
      {error && !modoSimulacion && <p className="mensaje-error">⚠️ Error: {error}</p>}

      <VisorImagenBD
        preArmado={preArmado}
        estadoServidor={estadoServidor}
        imagenInfo={imagenInfo}
        srcImagenFinal={srcImagenFinal}
        errorImagen={errorImagen}
        onErrorImagen={() => setErrorImagen(true)}
      />

      <div className="acciones">
        <button
          type="button"
          className="btn"
          onClick={() => fetchData(modoDirectoBD, true)}
          disabled={cargando || modoSimulacion}
        >
          {cargando ? 'Cargando...' : '🔄 Consultar ahora'}
        </button>

        <button
          type="button"
          className="btn btn-imagen"
          onClick={alternarModoDirectoBD}
          disabled={cargando}
        >
          {modoDirectoBD ? 'Volver a escuchar /estado' : '🖼️ Pedir imagen BD'}
        </button>

        <button
          type="button"
          className="btn btn-secundario"
          onClick={alternarSimulacion}
        >
          {modoSimulacion ? 'Detener simulación' : 'Simular /prearmado'}
        </button>
      </div>
      </div>
    </>
  );
}
