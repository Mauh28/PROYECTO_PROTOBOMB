// Componente visual para mostrar desde el inicio la imagen guardada en la base de datos
export default function VisorImagenBD({
  cargandoImagen,
  imagenInfo,
  srcImagenFinal,
  errorImagen,
  onErrorImagen,
}) {
  return (
    <div className="marco-imagen">
      {cargandoImagen && !imagenInfo ? (
        <p className="mensaje-espera">
          Cargando imagen desde la base de datos...
        </p>
      ) : !imagenInfo ? (
        <p className="mensaje-espera">
          No se encontró ninguna imagen guardada en la base de datos.
        </p>
      ) : errorImagen ? (
        <p className="mensaje-error">
          ⚠️ No se pudo cargar la imagen desde {imagenInfo.urlOriginal ?? srcImagenFinal}.
        </p>
      ) : imagenInfo.esBase64 ? (
        <img
          src={srcImagenFinal}
          alt="Imagen desde la base de datos"
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
            alt="Imagen desde la base de datos"
            onError={onErrorImagen}
          />
        </a>
      )}
    </div>
  );
}
