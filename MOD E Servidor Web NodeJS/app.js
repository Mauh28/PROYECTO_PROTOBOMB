
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const Connection = require('./models/mySQLConnection');
const myConnection = require('express-myconnection');
const estadoJuego = require('./models/estadoJuego');
const Metrics = require('./models/metrics');

const cors = require('cors');

// ORIGENES PERMITIDOS (RECUERDA AGREGAR ORIGEN SI USO UN CLIENTE WEB)
const allowedOrigins = ['http://localhost:3010', 'http://localhost:5173', 'https://172.20.16.1:3010', 'http://172.20.16.1:3010'];
const localNetworkOriginPattern = /^https?:\/\/(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+|172\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+)(:\d+)?$/i;

const corsOptions = {
	origin: function (origin, callback) {
		if (!origin || allowedOrigins.includes(origin) || localNetworkOriginPattern.test(origin)) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	},
	methods: ['GET', 'POST', 'DELETE']
};

// Canal en tiempo real Socket.IO con el mismo acceso CORS para React y Python
const io = new Server(server, {
	cors: corsOptions
});

app.set('io', io);

// Aviso automatico en tiempo real cada vez que cambia el estado en models/estadoJuego.js
estadoJuego.onCambio((nuevoEstado) => {
	io.emit('estado_actualizado', nuevoEstado);
});

io.on('connection', (socket) => {
	console.log('Cliente Socket.IO conectado:', socket.id);

	// Sincronizacion inmediata al conectar el navegador React
	socket.emit('estado_actualizado', estadoJuego.getEstado());

	// Soporte para cliente Python (ClientProject.py) al enviar graficas e metricas
	socket.on('metricas_calculadas', (paquete) => {
		Metrics.saveResult(paquete, (err, result) => {
			if (err) {
				console.error('Error guardando metricas desde Python:', err.message);
				return;
			}
			io.emit('nuevas_metricas', { id: result.insertId, result: paquete?.result });
		});
	});

	socket.on('disconnect', () => {
		console.log('Cliente Socket.IO desconectado:', socket.id);
	});
});


//settings
app.set('port', process.env.PORT || 3010);

//middlewares
app.use(morgan('dev'));
app.use(bodyParser.json());


// CONEXION A LA BASE DE DATOS
// ----------------------------------------
const dbConfig = new Connection(
	'127.0.0.1',
	'root',
	'1234',
	'TSCU',
	'3306'
);
// ----------------------------------------

app.use(myConnection(mysql, dbConfig.pool, 'pool'))

app.use(cors(corsOptions));

require('./routes/userRoutes')(app);
require('./routes/gameRoutes')(app);
require('./routes/metricsRoutes')(app);

server.listen(app.get('port'), '0.0.0.0', () => {
	console.log('server on port 3010 (HTTP + Socket.IO)');
});
