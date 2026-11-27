import { useState, useEffect } from 'react';

// Equivalente a MyTimer.jsx: cronómetro en vivo independiente
export default function Cronometro() {
  const [segundos, setSegundos] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSegundos((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="caja cronometro">
      <h2>⏱️ Cronómetro en vivo</h2>
      <p className="tiempo">
        {segundos} <span className="unidad">segundos</span>
      </p>
    </div>
  );
}
