/**
 * Trabaja con nosotros: pinta las vacantes publicadas en el portal. El HTML
 * trae las vigentes al publicar la web como respaldo; si la consulta falla,
 * se quedan esas.
 */
import { EMPRESA, leer } from './config.js';

const $ = (sel, ctx = document) => ctx.querySelector(sel);

const el = (etiqueta, atributos = {}, hijos = []) => {
  const n = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (v == null || v === false) continue;
    if (k === 'texto') n.textContent = v;
    else n.setAttribute(k, v);
  }
  for (const h of [].concat(hijos)) if (h) n.append(h);
  return n;
};

const fecha = (iso) =>
  new Intl.DateTimeFormat('es-PE', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${iso}T00:00:00Z`),
  );

function lista(titulo, elementos) {
  if (!elementos?.length) return null;
  return el('div', {}, [el('h4', { texto: titulo }), el('ul', {}, elementos.map((t) => el('li', { texto: t })))]);
}

/** «Empleo presencial – Callao», como en el MOF. */
const lugar = (v) =>
  [v.modalidad ? `Empleo ${v.modalidad.toLowerCase()}` : null, v.ubicacion].filter(Boolean).join(' – ');

/** Reporta a / Lugar de trabajo: una sola vez, al final del detalle. */
function datosPuesto(v) {
  const filas = [
    ['Reporta a', v.reporta_a],
    ['Lugar de trabajo', lugar(v)],
  ].filter(([, valor]) => valor);
  if (!filas.length) return null;
  return el(
    'dl',
    { class: 'vacante__datos' },
    filas.map(([k, valor]) => el('div', {}, [el('dt', { texto: `${k}:` }), el('dd', { texto: valor })])),
  );
}

function tarjeta(v) {
  // Orden del MOF: primero lo que hará, luego lo que se pide.
  const listas = [lista('Responsabilidades', v.funciones), lista('Requisitos', v.requisitos), lista('Beneficios', v.beneficios)].filter(Boolean);
  const meta = [v.ubicacion, v.modalidad, v.jornada].filter(Boolean);
  const datos = datosPuesto(v);

  return el('article', { class: 'vacante revelar' }, [
    el('div', { class: 'vacante__cabeza' }, [
      v.area ? el('span', { class: 'vacante__area', texto: v.area }) : null,
      el('span', {
        class: 'vacante__fecha',
        texto: v.fecha_cierre ? `Postule hasta el ${fecha(v.fecha_cierre)}` : `Publicada el ${fecha(v.fecha_publicacion)}`,
      }),
    ]),
    el('h3', { texto: v.titulo }),
    el(
      'ul',
      { class: 'vacante__meta' },
      meta.map((t) => el('li', { texto: t })),
    ),
    el('p', { class: 'vacante__resumen', texto: v.resumen }),
    listas.length || datos
      ? el('details', { class: 'vacante__detalle' }, [
          el('summary', { texto: v.funciones?.length ? 'Ver responsabilidades y requisitos' : 'Ver requisitos' }),
          el('div', { class: 'vacante__listas' }, listas),
          datos,
        ])
      : null,
    // Abre el formulario de postulación (postular.js).
    el('button', {
      type: 'button',
      class: 'btn vacante__postular',
      'data-postular': '',
      'data-empleo-id': v.id,
      'data-puesto': v.titulo,
      'data-meta': meta.join(' · '),
      texto: 'Postular',
    }),
  ]);
}

export async function empleos({ revelar } = {}) {
  const cont = $('[data-empleos]');
  if (!cont) return;

  const vacantes = await leer(
    'empleos',
    `empresa_id=eq.${EMPRESA}&select=id,titulo,area,ubicacion,modalidad,jornada,resumen,reporta_a,requisitos,funciones,beneficios,fecha_publicacion,fecha_cierre&order=orden.asc,fecha_publicacion.desc`,
  );
  if (!vacantes) return; // sin conexión: se quedan las del HTML

  const vacio = $('[data-empleos-vacio]');
  if (!vacantes.length) {
    cont.replaceChildren();
    cont.hidden = true;
    if (vacio) vacio.hidden = false;
    return;
  }

  // Si las del HTML ya se habían revelado, las nuevas aparecen sin animación.
  const yaVisible = [...cont.children].some((c) => c.classList.contains('es-visible'));
  const nuevas = vacantes.map(tarjeta);
  nuevas.forEach((n, i) => {
    n.style.setProperty('--d', `${i * 0.08}s`);
    if (yaVisible) n.classList.add('es-visible');
  });
  cont.replaceChildren(...nuevas);
  cont.hidden = false;
  if (vacio) vacio.hidden = true;
  if (!yaVisible) revelar?.(nuevas);
}
