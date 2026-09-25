/**
 * Libro de Reclamaciones: envía la hoja al portal del Grupo Pacheco, que la
 * numera, genera el PDF y manda la constancia al correo del consumidor.
 */
import { endpoint } from './config.js';
import { selectorUbigeo } from './ubigeo.js';

const $ = (sel, ctx = document) => ctx.querySelector(sel);

const fechaLarga = (iso) =>
  new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

export async function libroReclamaciones() {
  const form = $('#form-reclamo');
  if (!form) return;

  const ubigeo = await selectorUbigeo($('[data-ubigeo]', form));

  const aviso = $('.form-aviso', form);
  const boton = $('button[type="submit"]', form);
  const textoBoton = boton.innerHTML;
  const constancia = $('[data-libro-constancia]');

  // Fecha del día en Lima, como en la hoja impresa.
  const fecha = $('[data-libro-fecha]');
  if (fecha) {
    fecha.textContent = new Intl.DateTimeFormat('es-PE', {
      timeZone: 'America/Lima',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date());
  }

  // Padre, madre o apoderado solo si es menor de edad.
  const menor = $('#r-menor', form);
  const bloqueApoderado = $('[data-libro-apoderado]', form);
  const apoderado = $('#r-apoderado', form);
  menor.addEventListener('change', () => {
    bloqueApoderado.hidden = !menor.checked;
    apoderado.required = menor.checked;
    if (menor.checked) apoderado.focus();
  });

  // El DNI tiene 8 dígitos y el RUC 11: el campo se adapta al tipo.
  const tipoDoc = $('#r-tipo-doc', form);
  const numDoc = $('#r-num-doc', form);
  const ajustarDocumento = () => {
    const reglas = {
      DNI: ['\\d{8}', 'numeric', 8, '8 dígitos'],
      RUC: ['\\d{11}', 'numeric', 11, '11 dígitos'],
      CE: ['[A-Za-z0-9-]{6,15}', 'text', 15, ''],
      Pasaporte: ['[A-Za-z0-9-]{6,15}', 'text', 15, ''],
    }[tipoDoc.value];
    numDoc.pattern = reglas[0];
    numDoc.inputMode = reglas[1];
    numDoc.maxLength = reglas[2];
    numDoc.title = reglas[3] ? `Debe tener ${reglas[3]}` : '';
  };
  tipoDoc.addEventListener('change', ajustarDocumento);
  ajustarDocumento();

  const decir = (mensaje) => {
    aviso.textContent = mensaje;
    aviso.className = 'form-aviso es-visible form-aviso--error';
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    aviso.className = 'form-aviso';

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    // Los select deshabilitados no pasan por la validación nativa: se
    // comprueba a mano que el ubigeo esté completo.
    const faltante = ['departamento', 'provincia', 'distrito']
      .map((n) => $(`[data-ubigeo-nivel="${n}"]`, form))
      .find((s) => !s.value);
    if (faltante) {
      decir('Seleccione departamento, provincia y distrito de su domicilio.');
      (faltante.disabled ? $('[data-ubigeo-nivel="departamento"]', form) : faltante).focus();
      return;
    }

    const datos = Object.fromEntries(new FormData(form));
    datos.menor_edad = menor.checked;
    datos.acepta = $('#r-acepta', form).checked;
    if (!datos.menor_edad) delete datos.apoderado;

    boton.disabled = true;
    boton.textContent = 'Registrando…';
    try {
      const r = await fetch(endpoint('reclamo'), {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(datos),
      });
      const res = await r.json().catch(() => ({}));

      if (!r.ok || !res.ok) {
        decir(res.error || 'No pudimos registrar su hoja. Inténtelo nuevamente en unos minutos.');
        const campo = res.campo === 'ubigeo' ? '[data-ubigeo-nivel="departamento"]' : `[name="${res.campo}"]`;
        if (res.campo) form.querySelector(campo)?.focus();
        return;
      }

      // Robot atrapado por el campo trampa: el servidor responde sin código.
      if (!res.codigo) {
        form.reset();
        return;
      }

      $('[data-libro-codigo]').textContent = res.codigo;
      $('[data-libro-vence]').textContent = fechaLarga(res.vence);
      $('[data-libro-mensaje]').textContent = res.correoEnviado
        ? `Le enviamos la hoja de reclamación en PDF a ${datos.correo}. Conserve el número como constancia.`
        : `Conserve este número como constancia. Le haremos llegar la hoja y nuestra respuesta a ${datos.correo}.`;

      form.hidden = true;
      constancia.hidden = false;
      constancia.focus();
      constancia.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } catch {
      decir('No hay conexión con el servidor. Revise su conexión e inténtelo nuevamente.');
    } finally {
      boton.disabled = false;
      boton.innerHTML = textoBoton;
    }
  });

  $('[data-libro-otra]')?.addEventListener('click', () => {
    form.reset();
    ubigeo.reiniciar();
    bloqueApoderado.hidden = true;
    apoderado.required = false;
    ajustarDocumento();
    constancia.hidden = true;
    form.hidden = false;
    $('#r-nombre', form).focus();
  });
}
