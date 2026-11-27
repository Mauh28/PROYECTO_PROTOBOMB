import { useState, useEffect } from 'react';

// Cronómetro en vivo que inicia en 00:00 cuando Android activa el cambio de estado
export default function Cronometro() {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSegundos((prev) => prev + 1);
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
