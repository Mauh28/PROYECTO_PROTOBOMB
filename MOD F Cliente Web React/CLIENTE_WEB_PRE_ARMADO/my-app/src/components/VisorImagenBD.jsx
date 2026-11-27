// Equivalente a SensorDataTable.jsx: componente visual para mostrar la imagen de la BD
export default function VisorImagenBD({
  preArmado,
  estadoServidor,
  imagenInfo,
  srcImagenFinal,
  errorImagen,
  onErrorImagen,
}) {
  return (
    <div className="marco-imagen">
      {!preArmado ? (
        <p className="mensaje-espera">
          Esperando cambio de variable en /estado (actual: {estadoServidor ?? 'sin respuesta'})...
        </p>
      ) : !imagenInfo ? (
        <p className="mensaje-espera">
          No se encontró ninguna imagen guardada en la base de datos.
        </p>
      ) : errorImagen ? (
        <p className="mensaje-error">
          ⚠️ No se pudo cargar la imagen desde {srcImagenFinal}.
        </p>
      ) : imagenInfo.esBase64 ? (
        <img
          src={srcImagenFinal}
          alt="Imagen de pre-armado desde la base de datos"
          onError={onErrorImagen}
        />
      ) : (
        <a
          href={imagenInfo.urlOriginal ?? srcImagenFinal}
          target="_blank"
          rel="noreferrer"
          title="Abrir imagen en tamaño completo"
        >
          <img
            src={srcImagenFinal}
            alt="Imagen de pre-armado desde la base de datos"
            onError={onErrorImagen}
          />
        </a>
      )}
    </div>
  );
}
