const { EventEmitter } = require('events');

const ESTADO_ESPERADO_INICIO = 1;

class EstadoJuegoStore extends EventEmitter {
	constructor() {
		super();
		this._estado = {
			estado: 0,
			juegoIniciado: false,
			comando: null,
			info: 'En espera de inicio desde Android',
			imagenId: null,
			inicioEn: null,
			actualizadoEn: new Date().toISOString(),
			conectadoArduino: null
		};
	}

	getEstado() {
		return { ...this._estado };
	}

	/**
	 * Suscribe un listener interno cada vez que cambia el estado del juego.
	 */
	onCambio(listener) {
		this.on('estado_cambiado', listener);
		return () => this.off('estado_cambiado', listener);
	}

	/**
	 * Modifica el estado interno, evalua el valor esperado y dispara aviso automatico.
	 */
	actualizarEstado(valorCrudo, metadata = {}) {
		const origen = metadata.origen || 'android';
		const valorRecibido = Number(valorCrudo);

		if (Number.isNaN(valorRecibido)) {
			return {
				status: 400,
				body: {
					success: false,
					coincide: false,
					msg: 'El parametro estado debe ser numerico',
					...this.getEstado()
				}
			};
		}

		const ahora = new Date().toISOString();

		if (valorRecibido === ESTADO_ESPERADO_INICIO) {
			this._estado = {
				...this._estado,
				estado: valorRecibido,
				juegoIniciado: true,
				comando: metadata.comando || 'INICIAR',
				info: metadata.info || `Juego iniciado (${origen})`,
				imagenId: metadata.imagenId !== undefined ? metadata.imagenId : this._estado.imagenId,
				inicioEn: this._estado.inicioEn || ahora,
				actualizadoEn: ahora
			};

			const snapshot = this.getEstado();
			this.emit('estado_cambiado', snapshot);

			return {
				status: 200,
				body: {
					success: true,
					coincide: true,
					msg: 'Valor esperado verificado. Juego iniciado.',
					...snapshot
				}
			};
		}

		if (valorRecibido === 0) {
			this._estado = {
				...this._estado,
				estado: 0,
				juegoIniciado: false,
				comando: null,
				info: metadata.info || 'En espera de inicio desde Android',
				inicioEn: null,
				actualizadoEn: ahora
			};

			const snapshot = this.getEstado();
			this.emit('estado_cambiado', snapshot);

			return {
				status: 200,
				body: {
					success: true,
					coincide: false,
					msg: 'Estado reiniciado a 0.',
					...snapshot
				}
			};
		}

		return {
			status: 400,
			body: {
				success: false,
				coincide: false,
				msg: `El valor enviado (${valorRecibido}) no coincide con el esperado (${ESTADO_ESPERADO_INICIO}).`,
				...this.getEstado()
			}
		};
	}

	iniciarJuego(valorCrudo = ESTADO_ESPERADO_INICIO, origen = 'android') {
		return this.actualizarEstado(valorCrudo, {
			origen,
			comando: 'INICIAR',
			info: `Juego iniciado (${origen})`
		});
	}

	reiniciarJuego(origen = 'android') {
		return this.actualizarEstado(0, {
			origen,
			info: `Juego reiniciado (${origen})`
		});
	}

	actualizarArduino(conectado) {
		this._estado = {
			...this._estado,
			conectadoArduino: Boolean(conectado),
			actualizadoEn: new Date().toISOString()
		};
		const snapshot = this.getEstado();
		this.emit('estado_cambiado', snapshot);
		return snapshot;
	}
}

module.exports = new EstadoJuegoStore();
