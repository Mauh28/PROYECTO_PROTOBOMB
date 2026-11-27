const User = require('../models/user')
const estadoJuego = require('../models/estadoJuego')

module.exports = function (app) {
	app.get('/users',
		(req, res) => {
			User.getLecturas((err, data) => {
				if (err) {
					return res.status(500).json({ success: false, error: err });
				}
				res.status(200).json(data);
			});
		}
	);

	// CLIENTE PYTHON PIDE UN DATO
	app.get('/users/pendiente', (req, res) => {
		User.popLectura((err, lectura) => {
			if (err) {
				return res.status(500).json({ success: false, error: err.message });
			}
			if (lectura) {
				res.status(200).json({
					disponible: true,
					lectura: lectura
				});
			} else {
				res.status(200).json({
					disponible: false,
					lectura: null
				});
			}
		});
	});

	// Endpoint para que el cliente Python elimine el dato una vez procesado
	app.delete('/users', (req, res) => {
		User.deleteLectura(null, (err, result) => {
			if (err) return res.status(500).json({ success: false, error: err.message });
			res.status(200).json({ success: true, msg: 'Última lectura eliminada' });
		});
	});

	app.post('/users',
		(req, res) => {
			console.log('Lectura recibida desde Arduino:', req.body);

			// Compatibilidad con PRUEBA1.ino cuando envia {"conectado": true/false}
			if (req.body.conectado !== undefined && req.body.F1 === undefined && req.body.s1t1 === undefined) {
				const estadoActual = estadoJuego.actualizarArduino(req.body.conectado);
				const conectadoNum = estadoActual.conectadoArduino ? 1 : 0;
				return res.status(200).json({
					success: true,
					msg: 'Estado de cable recibido desde Arduino',
					conectado: estadoActual.conectadoArduino,
					valor: conectadoNum
				});
			}

			const lecturaData = {
				F1: req.body.F1 ?? req.body.f1 ?? req.body.s1t1,
				F2: req.body.F2 ?? req.body.f2 ?? req.body.s1t2,
				F3: req.body.F3 ?? req.body.f3 ?? req.body.s1t3,
				F4: req.body.F4 ?? req.body.f4 ?? req.body.s1t4
			};

			User.insertLectura(lecturaData, (err, data) => {
				if (err) {
					console.error('Error al insertar lectura en MySQL:', err);
					return res.status(500).json({
						success: false,
						msg: 'Error al insertar en la base de datos',
						error: err.message
					});
				}

				console.log('Lectura guardada con ID:', data.insertId);
				if (data && data.affectedRows) {
					res.status(200).json({
						success: true,
						msg: 'dato insertado',
						id: data.insertId,
						data: lecturaData
					});
				} else {
					res.status(500).json({
						success: false,
						msg: 'Error'
					});
				}
			});
		}
	);
}