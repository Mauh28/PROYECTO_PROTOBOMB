const Connection = require('./mySQLConnection');

const connection = new Connection(
	'127.0.0.1',
	'root',
	'1234',
	'TSCU',
	'3306'
);

/**
 * Convierte el campo imagen1/imagen2 de MySQL (Buffer binario o string/Buffer Base64)
 * en un Buffer PNG/JPEG listo para enviarse por HTTP.
 */
function decodeImageBuffer(raw) {
	if (!raw) {
		return null;
	}

	const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(String(raw), 'utf8');
	if (buf.length === 0) {
		return null;
	}

	const isPng = buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
	const isJpeg = buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
	if (isPng || isJpeg) {
		return buf;
	}

	const text = buf.toString('utf8').trim();
	const cleanB64 = text.includes('base64,') ? text.split('base64,').pop().trim() : text;
	if (/^[A-Za-z0-9+/=\r\n]+$/.test(cleanB64) && cleanB64.length > 16) {
		return Buffer.from(cleanB64, 'base64');
	}

	return buf;
}

const metricsModel = {};

metricsModel.getAllResults = (callback) => {
	const query = `
		SELECT
			ID,
			result,
			CASE WHEN imagen1 IS NOT NULL AND OCTET_LENGTH(imagen1) > 0 THEN 1 ELSE 0 END AS has_img1,
			CASE WHEN imagen2 IS NOT NULL AND OCTET_LENGTH(imagen2) > 0 THEN 1 ELSE 0 END AS has_img2
		FROM results
		ORDER BY ID ASC
	`;

	connection.pool.query(query, (err, rows) => {
		if (err) {
			return callback(err, null);
		}
		const formatted = (rows || []).map((row) => ({
			ID: row.ID,
			result: row.result,
			info: row.result !== undefined && row.result !== null ? `Resultado: ${row.result}` : null,
			imagen1: row.has_img1 ? { type: 'Buffer', data: [1] } : null,
			imagen2: row.has_img2 ? { type: 'Buffer', data: [1] } : null
		}));
		callback(null, formatted);
	});
};

metricsModel.getImageById = (id, columnName, callback) => {
	const col = columnName === 'imagen2' ? 'imagen2' : 'imagen1';
	const isLatest = String(id).toLowerCase() === 'latest';

	const query = isLatest
		? `SELECT ID, ${col} AS img FROM results WHERE ${col} IS NOT NULL AND OCTET_LENGTH(${col}) > 0 ORDER BY ID DESC LIMIT 1`
		: `SELECT ID, ${col} AS img FROM results WHERE ID = ? LIMIT 1`;

	const params = isLatest ? [] : [id];

	connection.pool.query(query, params, (err, rows) => {
		if (err) {
			return callback(err, null);
		}
		if (!rows || rows.length === 0 || !rows[0].img) {
			return callback(null, null);
		}
		const imgBuffer = decodeImageBuffer(rows[0].img);
		callback(null, imgBuffer);
	});
};

metricsModel.getSensorData = (callback) => {
	connection.pool.query('SELECT id, dato FROM sensor ORDER BY id ASC', (err, rows) => {
		if (err) {
			return callback(err, null);
		}
		callback(null, rows || []);
	});
};

metricsModel.insertSensorData = (dato, callback) => {
	connection.pool.query('INSERT INTO sensor (dato) VALUES (?)', [dato], (err, result) => {
		if (err) {
			return callback(err, null);
		}
		callback(null, result);
	});
};

metricsModel.saveResult = (paquete, callback) => {
	const resultVal = paquete?.result ?? -1;
	const img1 = decodeImageBuffer(paquete?.image1);
	const img2 = decodeImageBuffer(paquete?.image2);

	connection.pool.query(
		'INSERT INTO results (result, imagen1, imagen2) VALUES (?, ?, ?)',
		[resultVal, img1, img2],
		(err, result) => {
			if (err) {
				return callback(err, null);
			}
			callback(null, result);
		}
	);
};

module.exports = metricsModel;
