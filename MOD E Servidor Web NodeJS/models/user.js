const mysql = require('mysql');
const Connection = require('./mySQLConnection')

//CONEXION A LA BASE DE DATOS MODIFICADA
const connection = new Connection(
	'127.0.0.1',
	'root',
	'1234',
	'TSCU',
	'3306'
);

let userModel = {};

// ----------------------------------------
userModel.getUsers = (callback) => {
	// ULTIMO REGISTRO INGRESADO
	connection.pool.query('SELECT * FROM lecturas2 ORDER BY id DESC LIMIT 1', (err, rows) => {
		if (err) {
			return callback(err, null);
		}

		// SI NO HAY DATOS, REGRESA NULL
		if (!rows || rows.length === 0) {
			return callback(null, []);
		}

		const lectura = rows[0];

		// ELIMINA REGISTRO USANDO ID
		connection.pool.query('DELETE FROM lecturas2 WHERE id = ?', [lectura.id], (delErr, result) => {
			if (delErr) {
				return callback(delErr, null);
			}

			// RETORNA DATO A QUIEN LO PIDIO
			callback(null, rows);
		});
	});
};
userModel.getLecturas = userModel.getUsers;

userModel.insertLectura = (lecturaData, callback) => {
	const query = 'INSERT INTO lecturas2 (F1, F2, F3, F4) VALUES (?, ?, ?, ?)';
	const values = [
		lecturaData.F1 !== undefined ? lecturaData.F1 : lecturaData.s1t1,
		lecturaData.F2 !== undefined ? lecturaData.F2 : lecturaData.s1t2,
		lecturaData.F3 !== undefined ? lecturaData.F3 : lecturaData.s1t3,
		lecturaData.F4 !== undefined ? lecturaData.F4 : lecturaData.s1t4
	];
	connection.pool.query(query, values, (err, result) => {
		if (err) {
			return callback(err, null);
		}
		callback(null, result);
	});
}
userModel.insertUser = userModel.insertLectura;
// ----------------------------------------

module.exports = userModel;