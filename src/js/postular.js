/**
 * Trabaja con nosotros: formulario de postulación en un modal. Lo abren los
 * botones [data-postular] (cada vacante y «Enviar mi CV») y se envía al
 * portal del Grupo Pacheco con el CV adjunto.
 */
import { endpoint } from './config.js';
import { selectorUbigeo } from './ubigeo.js';

const $ = (sel, ctx = document) => ctx.querySelector(sel);

const CV_MAXIMO = 4 * 1024 * 1024;
const EXTENSIONES = /\.(pdf|docx?)$/i;

const peso = (bytes) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export function postulaciones() {
  const modal = $('#postular');
  if (!modal) return;

  const form = $('form', modal);
  const gracias = $('[data-postular-gracias]', modal);
  const aviso = $('.form-aviso', form);
  const boton = $('button[type="submit"]', form);
  const textoBoton = boton.innerHTML;
  const bloqueArea = $('[data-postular-area]', form);
  const area = $('#p-area', form);
  let ubigeo = null;
  let origen = null;

  // ---------------------------------------------------------------- abrir / cerrar

  const abrir = async (disparador) => {
    origen = disparador;
    const { empleoId = '', puesto = '', meta = '' } = disparador.dataset;
    const espontanea = !puesto;

    $('[data-postular-rotulo]', modal).textContent = espontanea ? 'Envíenos su CV' : 'Postular al puesto';
    $('[data-postular-puesto]', modal).textContent = espontanea ? 'Postulación espontánea' : puesto;
    const lineaMeta = $('[data-postular-meta]', modal);
    lineaMeta.textContent = meta;
    lineaMeta.hidden = !meta;

    form.elements.empleo_id.value = empleoId;
    form.elements.puesto.value = puesto;
    bloqueArea.hidden = !espontanea;
    area.required = espontanea;

    if (!gracias.hidden) reiniciar();
    document.documentElement.classList.add('modal-abierto');
    modal.showModal();
    modal.scrollTop = 0;
    $('#p-nombre', form).focus();
    ubigeo ??= await selectorUbigeo($('[data-ubigeo]', form));
  };

  const cerrar = () => modal.open && modal.close();

  modal.addEventListener('close', () => {
    document.documentElement.classList.remove('modal-abierto');
    origen?.focus();
  });
  // Clic en el fondo oscuro (fuera del marco) cierra.
  modal.addEventListener('click', (e) => {
    if (e.target === modal) cerrar();
  });
  modal.querySelectorAll('[data-postular-cerrar]').forEach((b) => b.addEventListener('click', cerrar));

  // Las tarjetas de vacantes se repintan con los datos del portal: delegación.
  document.addEventListener('click', (e) => {
    const disparador = e.target.closest('[data-postular]');
    if (!disparador) return;
    e.preventDefault();
    abrir(disparador);
  });

  // ---------------------------------------------------------------- campos

  // El DNI tiene 8 dígitos; CE y pasaporte, letras y números.
  const tipoDoc = $('#p-tipo-doc', form);
  const numDoc = $('#p-num-doc', form);
  const ajustarDocumento = () => {
    const dni = tipoDoc.value === 'DNI';
    numDoc.pattern = dni ? '\\d{8}' : '[A-Za-z0-9\\-]{6,15}';
    numDoc.inputMode = dni ? 'numeric' : 'text';
    numDoc.maxLength = dni ? 8 : 15;
    numDoc.title = dni ? 'El DNI tiene 8 dígitos' : '';
  };
  tipoDoc.addEventListener('change', ajustarDocumento);
  ajustarDocumento();

  const archivo = $('#p-cv', form);
  const caja = $('[data-postular-archivo]', form);
  const nombreArchivo = $('[data-postular-archivo-nombre]', form);
  const detalleArchivo = $('[data-postular-archivo-detalle]', form);
  const mostrarArchivo = () => {
    const f = archivo.files[0];
    let error = '';
    if (f && !EXTENSIONES.test(f.name)) error = 'El CV debe ser PDF o Word (.doc, .docx).';
    else if (f && f.size > CV_MAXIMO) error = `El CV pesa ${peso(f.size)}: el máximo es 4 MB.`;
    archivo.setCustomValidity(error);
    caja.classList.toggle('tiene-archivo', Boolean(f) && !error);
    caja.classList.toggle('con-error', Boolean(error));
    nombreArchivo.textContent = f ? f.name : 'Adjuntar CV';
    detalleArchivo.textContent = error || (f ? `${peso(f.size)} · clic para cambiarlo` : 'PDF o Word, hasta 4 MB');
  };
  archivo.addEventListener('change', () => {
    // Un aviso anterior (p. ej. el portal rechazó el archivo) ya no aplica.
    aviso.className = 'form-aviso';
    mostrarArchivo();
  });

  // ---------------------------------------------------------------- envío

  const decir = (mensaje) => {
    aviso.textContent = mensaje;
    aviso.className = 'form-aviso es-visible form-aviso--error';
    aviso.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  function reiniciar() {
    form.reset();
    ubigeo?.reiniciar();
    ajustarDocumento();
    mostrarArchivo();
    aviso.className = 'form-aviso';
    gracias.hidden = true;
    form.hidden = false;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    aviso.className = 'form-aviso';

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    // Los select deshabilitados no pasan por la validación nativa.
    const faltante = ['departamento', 'provincia', 'distrito']
      .map((n) => $(`[data-ubigeo-nivel="${n}"]`, form))
      .find((s) => !s.value);
    if (faltante) {
      decir('Seleccione departamento, provincia y distrito donde vive.');
      (faltante.disabled ? $('[data-ubigeo-nivel="departamento"]', form) : faltante).focus();
      return;
    }

    const datos = new FormData(form);
    datos.set('acepta', $('#p-acepta', form).checked ? 'si' : 'no');
    if (bloqueArea.hidden) datos.delete('area_interes');

    boton.disabled = true;
    boton.textContent = 'Enviando…';
    try {
      const r = await fetch(endpoint('postulacion'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: datos,
      });
      const res = await r.json().catch(() => ({}));

      if (!r.ok || !res.ok) {
        decir(res.error || 'No pudimos enviar su postulación. Inténtelo nuevamente en unos minutos.');
        const campo = res.campo === 'ubigeo' ? '[data-ubigeo-nivel="departamento"]' : `[name="${res.campo}"]`;
        if (res.campo) form.querySelector(campo)?.focus();
        return;
      }

      $('[data-postular-nota]', modal).textContent = res.correoEnviado
        ? `Te enviamos una confirmación a ${datos.get('correo')}.`
        : '';
      form.hidden = true;
      gracias.hidden = false;
      modal.scrollTop = 0;
      gracias.focus();
    } catch {
      decir('No hay conexión con el servidor. Revise su conexión e inténtelo nuevamente.');
    } finally {
      boton.disabled = false;
      boton.innerHTML = textoBoton;
    }
  });
}
