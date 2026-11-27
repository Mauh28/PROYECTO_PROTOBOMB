import { useState, useEffect, useCallback, useRef } from 'react';
import Cronometro from './Cronometro.jsx';
import MonitorEstado from './MonitorEstado.jsx';
import VisorImagenBD from './VisorImagenBD.jsx';
import {
  BASE_URL,
  INTERVALO_MS,
  consultarEstadoServidor,
  consultarUltimaImagenBD,
} from '../services/servidorApi.js';

export default function PanelPreArmado() {
  const [cambioDetectado, setCambioDetectado] = useState(false);

  const [imagenInfo, setImagenInfo] = useState(null);
  const [versionImagen, setVersionImagen] = useState(() => Date.now());
  const [cargandoImagen, setCargandoImagen] = useState(false);
  const [errorImagen, setErrorImagen] = useState(false);
  const [errorImagenPeticion, setErrorImagenPeticion] = useState(null);

  const [estadoServidor, setEstadoServidor] = useState(null);
  const [estadoAnterior, setEstadoAnterior] = useState(null);
  const [cargandoEstado, setCargandoEstado] = useState(false);
  const [errorEstado, setErrorEstado] = useState(null);
  const [modoSimulacion, setModoSimulacion] = useState(false);
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

  const cambioDetectadoRef = useRef(false);
  const peticionEstadoEnCursoRef = useRef(false);
  const peticionImagenEnCursoRef = useRef(false);
  const estadoPrevioRef = useRef(undefined);
  const timeoutCambioRef = useRef(null);
  const blobUrlActualRef = useRef(null);

  const reemplazarImagenInfo = useCallback((nuevaInfo) => {
    if (blobUrlActualRef.current && blobUrlActualRef.current !== nuevaInfo?.src) {
      URL.revokeObjectURL(blobUrlActualRef.current);
    }
    blobUrlActualRef.current = nuevaInfo?.esBlob ? nuevaInfo.src : null;
    setImagenInfo(nuevaInfo);
  }, []);

  const cargarImagenBD = useCallback(async () => {
    if (peticionImagenEnCursoRef.current) {
      return;
    }

    peticionImagenEnCursoRef.current = true;
    try {
      setCargandoImagen(true);
      setErrorImagenPeticion(null);

      const ultima = await consultarUltimaImagenBD();
      if (!ultima) {
        reemplazarImagenInfo(null);
        setErrorImagen(false);
        return;
      }

      reemplazarImagenInfo({
        src: ultima.url,
        urlOriginal: ultima.urlOriginal ?? ultima.url,
        esBase64: false,
        esBlob: Boolean(ultima.esBlob),
        id: ultima.id,
        info: ultima.info,
      });
      setVersionImagen(Date.now());
      setErrorImagen(false);
    } catch (err) {
      setErrorImagenPeticion(err.message);
    } finally {
      setCargandoImagen(false);
      peticionImagenEnCursoRef.current = false;
    }
  }, [reemplazarImagenInfo]);

  const consultarEstado = useCallback(async () => {
    if (peticionEstadoEnCursoRef.current) {
      return;
    }

    peticionEstadoEnCursoRef.current = true;

    try {
      setCargandoEstado(true);
      const resultadoEstado = await consultarEstadoServidor();

      if (resultadoEstado.noEncontrado) {
        setErrorEstado('Ruta /estado no encontrada (404)');
        return;
      }

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
      setErrorEstado(null);

      const activo = Boolean(estado.preArmado);
      if (activo) {
        if (!cambioDetectadoRef.current) {
          cambioDetectadoRef.current = true;
          setCambioDetectado(true);
          reemplazarImagenInfo(null);
        }
      } else if (cambioDetectadoRef.current) {
        cambioDetectadoRef.current = false;
        setCambioDetectado(false);
        cargarImagenBD();
      }
    } catch (err) {
      setErrorEstado(err.message);
    } finally {
      setCargandoEstado(false);
      peticionEstadoEnCursoRef.current = false;
    }
  }, [cargarImagenBD, reemplazarImagenInfo]);

  const alternarSimulacion = () => {
    setModoSimulacion((prev) => {
      const siguiente = !prev;
      if (siguiente) {
        cambioDetectadoRef.current = true;
        setCambioDetectado(true);
        reemplazarImagenInfo(null);
      } else {
        cambioDetectadoRef.current = false;
        setCambioDetectado(false);
        cargarImagenBD();
      }
      return siguiente;
    });
  };

  useEffect(() => {
    const timeoutImagen = setTimeout(() => {
      cargarImagenBD();
    }, 0);

    return () => {
      clearTimeout(timeoutImagen);
      if (timeoutCambioRef.current) {
        clearTimeout(timeoutCambioRef.current);
      }
      if (blobUrlActualRef.current) {
        URL.revokeObjectURL(blobUrlActualRef.current);
        blobUrlActualRef.current = null;
      }
    };
  }, [cargarImagenBD]);

  useEffect(() => {
    if (modoSimulacion || !pollingActivo) {
      return undefined;
    }

    const timeoutInicial = setTimeout(() => {
      consultarEstado();
    }, 0);

    const interval = setInterval(() => {
      consultarEstado();
    }, intervaloMs);

    return () => {
      clearTimeout(timeoutInicial);
      clearInterval(interval);
    };
  }, [modoSimulacion, pollingActivo, intervaloMs, consultarEstado]);

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

  if (cambioDetectado) {
    return (
      <>
        <Cronometro />
        {modoSimulacion && (
          <div className="acciones">
            <button
              type="button"
              className="btn btn-secundario"
              onClick={alternarSimulacion}
            >
              Detener simulación (volver a imagen)
            </button>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <h1>Panel de Pre-Armado</h1>
      <p className="servidor-url">Servidor: {BASE_URL} (GET /imagen1 · GET /estado)</p>

      <div className="caja">
        <h2>🖼️ Imagen de Pre-Armado (Base de Datos)</h2>

        <div className="estado-badge estado-espera">
          {estadoServidor !== null
            ? `⚪ En espera de cambio desde Android (estado = ${estadoServidor})`
            : '⚪ En espera de cambio desde Android'}
        </div>

        {imagenInfo && (imagenInfo.id || imagenInfo.info) && (
          <p className="imagen-meta">
            {imagenInfo.id ? `Registro BD #${imagenInfo.id}` : 'Registro BD'}
            {imagenInfo.info ? ` — ${imagenInfo.info}` : ''}
          </p>
        )}

        {cargandoImagen && (
          <p className="mensaje-info">Solicitando imagen al servidor ({BASE_URL})...</p>
        )}
        {errorImagenPeticion && (
          <p className="mensaje-error">⚠️ Error al pedir imagen: {errorImagenPeticion}</p>
        )}

        <VisorImagenBD
          cargandoImagen={cargandoImagen}
          imagenInfo={imagenInfo}
          srcImagenFinal={srcImagenFinal}
          errorImagen={errorImagen}
          onErrorImagen={() => setErrorImagen(true)}
        />

        <div className="acciones">
          <button
            type="button"
            className="btn btn-imagen"
            onClick={cargarImagenBD}
            disabled={cargandoImagen}
          >
            {cargandoImagen ? 'Cargando imagen...' : '🖼️ Recargar imagen BD'}
          </button>

          <button
            type="button"
            className="btn"
            onClick={consultarEstado}
            disabled={cargandoEstado || modoSimulacion}
          >
            {cargandoEstado ? 'Consultando...' : '🔄 Consultar /estado ahora'}
          </button>

          <button
            type="button"
            className="btn btn-secundario"
            onClick={alternarSimulacion}
          >
            ⏱️ Simular cambio (ver cronómetro)
          </button>
        </div>
      </div>

      <MonitorEstado
        estadoActual={estadoServidor}
        estadoAnterior={estadoAnterior}
        pollingActivo={pollingActivo}
        modoSimulacion={modoSimulacion}
        modoDirectoBD={false}
        intervaloMs={intervaloMs}
        onCambiarIntervalo={setIntervaloMs}
        onAlternarPolling={() => setPollingActivo((prev) => !prev)}
        onConsultarAhora={consultarEstado}
        onLimpiarHistorial={limpiarHistorial}
        cargando={cargandoEstado}
        totalPeticiones={totalPeticiones}
        totalCambios={totalCambios}
        ultimaConsulta={ultimaConsulta}
        ultimoCambio={ultimoCambio}
        cambioReciente={cambioReciente}
        historialCambios={historialCambios}
        infoServidor={infoServidor}
        actualizadoEnServidor={actualizadoEnServidor}
        error={errorEstado}
      />
    </>
  );
}
