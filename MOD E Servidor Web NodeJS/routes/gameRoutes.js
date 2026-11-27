const estadoJuego = require('../models/estadoJuego');

module.exports = function (app) {
	// Endpoint principal para Android: inicia el juego y dispara Socket.IO a React
	app.post('/api/iniciar-juego', (req, res) => {
		const valor = req.body?.estado ?? req.body?.valor ?? req.query?.estado ?? 1;
		const origen = req.body?.origen || 'android';
		const resultado = estadoJuego.iniciarJuego(valor, origen);
		return res.status(resultado.status).json(resultado.body);
	});

	// Endpoint para reiniciar el estado del juego a 0
	app.post('/api/reiniciar-juego', (req, res) => {
		const origen = req.body?.origen || 'android';
		const resultado = estadoJuego.reiniciarJuego(origen);
		return res.status(resultado.status).json(resultado.body);
	});

	// Consulta HTTP de respaldo (y compatibilidad con polling de MOD F)
	const manejarGetEstado = (req, res) => {
		res.set('Cache-Control', 'no-store');
		if (req.query.estado !== undefined) {
			const resultado = estadoJuego.actualizarEstado(req.query.estado, {
				origen: req.query.origen || 'query'
			});
			return res.status(resultado.status).json(resultado.body);
		}
		return res.status(200).json(estadoJuego.getEstado());
	};

	app.get('/api/estado', manejarGetEstado);
	app.get('/estado', manejarGetEstado);

	// Alias POST /estado para compatibilidad directa
	app.post('/estado', (req, res) => {
		const valor = req.body?.estado ?? req.body?.valor ?? req.query?.estado;
		if (valor === undefined) {
			return res.status(400).json({
				success: false,
				coincide: false,
				msg: 'Falta el campo estado en la peticion'
			});
		}

		const origen = req.body?.origen || 'android';
		const resultado = estadoJuego.actualizarEstado(valor, { origen });
		return res.status(resultado.status).json(resultado.body);
	});
};
