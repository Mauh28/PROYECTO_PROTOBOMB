import './index.css';
import { BASE_URL } from './services/servidorApi.js';
import Cronometro from './components/Cronometro.jsx';
import PanelPreArmado from './components/PanelPreArmado.jsx';

export default function App() {
  return (
    <div className="contenedor">
      <h1>Panel de Pre-Armado</h1>
      <p className="servidor-url">Servidor: {BASE_URL} (GET /estado)</p>

      <Cronometro />
      <PanelPreArmado />
    </div>
  );
}
