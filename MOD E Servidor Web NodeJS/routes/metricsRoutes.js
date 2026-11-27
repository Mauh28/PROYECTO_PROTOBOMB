const Metrics = require('../models/metrics');

function enviarImagen(res, columnName, id) {
	Metrics.getImageById(id, columnName, (err, imgBuffer) => {
		if (err) {
			console.error(`Error al consultar ${columnName} en results:`, err);
			return res.status(500).json({ success: false, error: err.message });
		}
		if (!imgBuffer) {
			return res.status(404).json({ success: false, msg: 'Imagen no encontrada en results' });
		}
		res.set('Content-Type', 'image/png');
		res.set('Cache-Control', 'no-store');
		return res.status(200).send(imgBuffer);
	});
}

module.exports = function (app) {
	app.get('/metrics', (req, res) => {
		Metrics.getAllResults((err, rows) => {
			if (err) {
				console.error('Error al consultar tabla results:', err);
				return res.status(500).json({ success: false, error: err.message });
			}
			return res.status(200).json(rows);
		});
	});

	app.get('/metrics/:id/image1', (req, res) => {
		enviarImagen(res, 'imagen1', req.params.id);
	});

	app.get('/metrics/:id/image2', (req, res) => {
		enviarImagen(res, 'imagen2', req.params.id);
	});

	app.get('/imagen1', (req, res) => {
		enviarImagen(res, 'imagen1', 'latest');
	});

	app.get('/imagen2', (req, res) => {
		enviarImagen(res, 'imagen2', 'latest');
	});

	app.get('/sensor', (req, res) => {
		Metrics.getSensorData((err, rows) => {
			if (err) {
				console.error('Error al consultar tabla sensor:', err);
				return res.status(500).json({ success: false, error: err.message });
			}
			return res.status(200).json(rows);
		});
	});

	app.post('/sensor', (req, res) => {
		const dato = req.body?.dato;
		if (dato === undefined || dato === null) {
			return res.status(400).json({ success: false, msg: 'Falta el campo dato' });
		}
		Metrics.insertSensorData(dato, (err, result) => {
			if (err) {
				console.error('Error al insertar en tabla sensor:', err);
				return res.status(500).json({ success: false, error: err.message });
			}
			return res.status(200).json({ success: true, id: result.insertId, dato });
		});
	});
};
