import { useState, useEffect } from 'react';

const DURACION_INICIAL_SEGUNDOS = 60;

// Cronómetro decreciente que inicia en 01:00 cuando Android activa el cambio de estado
export default function Cronometro() {
  const [segundos, setSegundos] = useState(DURACION_INICIAL_SEGUNDOS);

  useEffect(() => {
    const timer = setInterval(() => {
      setSegundos((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const minutos = String(Math.floor(segundos / 60)).padStart(2, '0');
  const segs = String(segundos % 60).padStart(2, '0');

  return (
    <div className="caja cronometro">
      <h2>⏱️ Cronómetro</h2>
      <p className="tiempo">
        {minutos}:{segs} <span className="unidad">({segundos} s)</span>
      </p>
    </div>
  );
}
