/* Complemento de la PWA. No altera app.js ni manifest.json. */

const btnInstalar = document.getElementById('btn-instalar');
const btnPreparar = document.getElementById('btn-preparar-camara');
const btnConfirmar = document.getElementById('btn-confirmar-permiso');
const btnCancelar = document.getElementById('btn-cancelar-permiso');
const btnAlternar = document.getElementById('btn-alternar-camara');
const btnDetener = document.getElementById('btn-detener-camara');
const avisoPermiso = document.getElementById('aviso-permiso');
const visorCamara = document.getElementById('visor-camara');
const estadoCamara = document.getElementById('estado-camara');
const estadoPwa = document.getElementById('estado-pwa');

const tracksVigilados = new WeakSet();

let consentimientoDado = false;
let modoSeleccionado = 'environment';

function actualizarMensajeEstado(mensaje) {
  estadoCamara.textContent = mensaje;
}

function actualizarEstadoPwa(mensaje) {
  estadoPwa.textContent = mensaje;
}

function actualizarControles() {
  const usaTrasera = modoSeleccionado === 'environment';

  btnAlternar.textContent = usaTrasera
    ? 'Cambiar a cámara frontal'
    : 'Cambiar a cámara trasera';

  visorCamara.classList.toggle('modo-usuario', !usaTrasera);
  btnPreparar.hidden = consentimientoDado;
  btnAlternar.hidden = !consentimientoDado;
  btnDetener.hidden = !consentimientoDado;
}

function observarFinDelSensor() {
  const stream = visorCamara.srcObject;

  if (!stream) {
    return;
  }

  stream.getTracks().forEach((track) => {
    if (tracksVigilados.has(track)) {
      return;
    }

    tracksVigilados.add(track);

    track.addEventListener('ended', () => {
      detenerCamaraActiva();
      visorCamara.srcObject = null;
      consentimientoDado = false;
      actualizarControles();
      actualizarMensajeEstado('La cámara se desactivó. Vuelve a solicitar acceso si deseas continuar.');
    });
  });
}

function alIniciarSensor() {
  observarFinDelSensor();
  actualizarControles();
}

function liberarCamara() {
  detenerCamaraActiva();
  visorCamara.srcObject = null;
  consentimientoDado = false;
  actualizarControles();
  actualizarMensajeEstado('Sensor liberado. La cámara está apagada.');
}

function enfocarConfirmacion() {
  Promise.resolve().then(() => {
    btnConfirmar.focus();
  });
}

/* El aviso ya es mostrado por app.js; aquí solo preparamos el foco. */
btnPreparar.addEventListener('click', enfocarConfirmacion);

btnCancelar.addEventListener('click', () => {
  avisoPermiso.hidden = true;
  actualizarMensajeEstado('Solicitud cancelada. El sensor sigue apagado.');
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !avisoPermiso.hidden) {
    avisoPermiso.hidden = true;
    actualizarMensajeEstado('Aviso cerrado. La cámara no se ha activado.');
  }
});

/* Mantemos sincronizada la variable de modo que usa app.js. */
btnConfirmar.addEventListener('click', () => {
  consentimientoDado = true;
  modoCamaraActual = modoSeleccionado;
  actualizarMensajeEstado('Conectando con la cámara…');
});

visorCamara.addEventListener('loadedmetadata', alIniciarSensor);

btnAlternar.addEventListener('click', () => {
  if (!consentimientoDado) {
    avisoPermiso.hidden = false;
    enfocarConfirmacion();
    return;
  }

  const modoSiguiente = modoSeleccionado === 'environment' ? 'user' : 'environment';

  modoSeleccionado = modoSiguiente;
  modoCamaraActual = modoSiguiente;
  visorCamara.srcObject = null;
  actualizarMensajeEstado('Cambiando de lente…');

  iniciarCamara(modoSiguiente).then(alIniciarSensor);
});

btnDetener.addEventListener('click', liberarCamara);

window.addEventListener('pagehide', () => {
  detenerCamaraActiva();
  visorCamara.srcObject = null;
});

/* Instalación: app.js captura beforeinstallprompt; aquí se usa el evento diferido. */
btnInstalar.addEventListener('click', () => {
  if (!eventoInstalacionDiferido) {
    return;
  }

  const evento = eventoInstalacionDiferido;

  evento.prompt()
    .then((respuesta) => {
      if (respuesta.outcome === 'accepted') {
        actualizarEstadoPwa('Aplicación instalada en el dispositivo.');
      } else {
        actualizarEstadoPwa('Instalación cancelada. Puedes intentarlo de nuevo.');
      }
    })
    .catch(() => {
      actualizarEstadoPwa('No se pudo completar la instalación.');
    })
    .finally(() => {
      eventoInstalacionDiferido = null;
      btnInstalar.hidden = true;
    });
});

window.addEventListener('appinstalled', () => {
  eventoInstalacionDiferido = null;
  btnInstalar.hidden = true;
  actualizarEstadoPwa('Aplicación instalada correctamente.');
});

/* Registro del service worker usando únicamente promesas. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(() => {
        actualizarEstadoPwa('Soporte offline y de instalación listo.');
      })
      .catch(() => {
        actualizarEstadoPwa('La app funciona en línea; el modo offline no está disponible.');
      });
  });
}

actualizarControles();
