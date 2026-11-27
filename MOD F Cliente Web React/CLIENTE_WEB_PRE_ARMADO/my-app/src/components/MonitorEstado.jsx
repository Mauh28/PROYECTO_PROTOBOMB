import { INTERVALOS_POLLING_MS } from '../services/servidorApi.js';

function formatearValor(valor) {
  return valor !== null && valor !== undefined ? String(valor) : '—';
}

export default function MonitorEstado({
  estadoActual,
  estadoAnterior,
  pollingActivo,
  modoSimulacion,
  modoDirectoBD,
  intervaloMs,
  onCambiarIntervalo,
  onAlternarPolling,
  onConsultarAhora,
  onLimpiarHistorial,
  cargando,
  totalPeticiones,
  totalCambios,
  ultimaConsulta,
  ultimoCambio,
  cambioReciente,
  historialCambios,
  infoServidor,
  actualizadoEnServidor,
  error,
}) {
  let textoPolling = `🟢 Polling activo cada ${intervaloMs} ms`;
  let clasePolling = 'estado-activo';

  if (modoSimulacion) {
    textoPolling = '⏸️ Pausado por modo simulación';
    clasePolling = 'estado-espera';
  } else if (modoDirectoBD) {
    textoPolling = '⏸️ Pausado en /estado (modo directo BD)';
    clasePolling = 'estado-espera';
  } else if (!pollingActivo) {
    textoPolling = '⏸️ Polling pausado manualmente';
    clasePolling = 'estado-espera';
  }

  return (
    <div className="caja">
      <div className="monitor-header">
        <h2>📡 Monitor de Variable Android (estado)</h2>
        <span className={`estado-badge monitor-estado-polling ${clasePolling}`}>
          {textoPolling}
        </span>
      </div>

      {cambioReciente && ultimoCambio ? (
        <div className="cambio-banner cambio-banner-activo" role="status" aria-live="polite">
          🔔 ¡Cambio detectado! estado: {formatearValor(ultimoCambio.anterior)} →{' '}
          {formatearValor(ultimoCambio.nuevo)} ({ultimoCambio.hora})
        </div>
      ) : ultimoCambio ? (
        <div className="cambio-banner">
          Último cambio detectado: estado {formatearValor(ultimoCambio.anterior)} →{' '}
          {formatearValor(ultimoCambio.nuevo)} a las {ultimoCambio.hora}
        </div>
      ) : (
        <div className="cambio-banner">
          Sin cambios detectados aún (escuchando GET /estado)
        </div>
      )}

      <div className="monitor-grid">
        <div className="monitor-dato">
          <span className="monitor-etiqueta">Valor actual</span>
          <strong className="monitor-valor">{formatearValor(estadoActual)}</strong>
        </div>
        <div className="monitor-dato">
          <span className="monitor-etiqueta">Valor anterior</span>
          <strong className="monitor-valor">{formatearValor(estadoAnterior)}</strong>
        </div>
        <div className="monitor-dato">
          <span className="monitor-etiqueta">Peticiones</span>
          <strong className="monitor-valor">{totalPeticiones}</strong>
        </div>
        <div className="monitor-dato">
          <span className="monitor-etiqueta">Cambios</span>
          <strong className="monitor-valor">{totalCambios}</strong>
        </div>
      </div>

      <div className="monitor-meta">
        <p>Última consulta: {ultimaConsulta ?? 'Sin consultas todavía'}</p>
        {infoServidor && <p>Mensaje del servidor: {infoServidor}</p>}
        {actualizadoEnServidor && (
          <p>Actualizado en servidor: {actualizadoEnServidor}</p>
        )}
      </div>

      {error && !modoSimulacion && (
        <p className="mensaje-error">⚠️ Error al consultar /estado: {error}</p>
      )}

      <div className="monitor-controles">
        <label className="monitor-select-label">
          Intervalo:
          <select
            className="monitor-select"
            value={intervaloMs}
            onChange={(e) => onCambiarIntervalo(Number(e.target.value))}
          >
            {INTERVALOS_POLLING_MS.map((ms) => (
              <option key={ms} value={ms}>
                {ms} ms
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="btn"
          onClick={onAlternarPolling}
          disabled={modoSimulacion || modoDirectoBD}
        >
          {pollingActivo ? '⏸️ Pausar polling' : '▶️ Reanudar polling'}
        </button>

        <button
          type="button"
          className="btn"
          onClick={onConsultarAhora}
          disabled={cargando || modoSimulacion}
        >
          {cargando ? 'Consultando...' : '🔄 Consultar ahora'}
        </button>

        <button
          type="button"
          className="btn btn-secundario"
          onClick={onLimpiarHistorial}
          disabled={historialCambios.length === 0}
        >
          🧹 Limpiar historial
        </button>
      </div>

      <div className="historial-cambios">
        <h3>Historial reciente de cambios</h3>
        {historialCambios.length === 0 ? (
          <p className="mensaje-espera">No hay transiciones registradas todavía.</p>
        ) : (
          <ul className="historial-lista">
            {historialCambios.map((item) => (
              <li key={item.id} className="historial-item">
                <span className="historial-hora">{item.hora}</span>
                <span className="historial-transicion">
                  estado: {formatearValor(item.anterior)} → {formatearValor(item.nuevo)}
                </span>
                {item.info && <span className="historial-info">{item.info}</span>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
