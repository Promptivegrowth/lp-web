/**
 * Datos de contacto en vivo.
 *
 * Lee del portal (Supabase) el WhatsApp, los teléfonos, los correos, la
 * dirección y las redes, y los aplica sobre el HTML. El HTML ya trae los
 * valores actuales: si la consulta falla o tarda, la página se queda tal
 * cual, así que nunca se ve vacía.
 *
 * Puntos de enganche (atributos en el HTML):
 *   a[href*="wa.me/"]             todos los enlaces de WhatsApp
 *   [data-vivo="whatsapp-numero"] número de WhatsApp como texto
 *   [data-vivo="direccion"]       enlace con la dirección
 *   [data-vivo="telefonos-pie"]   lista del pie (li[data-vivo-item])
 *   [data-vivo="telefonos-menu"]  teléfonos del menú móvil
 *   [data-vivo="correo-principal"]
 *   [data-vivo="areas"]           contacto por área (li[data-vivo-item])
 *   [data-vivo="redes"]           iconos de redes sociales
 */
import { EMPRESA, leer } from './config.js';

const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ------------------------------------------------------------ formato

/** Solo dígitos, sin el código de país de Perú. */
const nacional = (n) => {
  const d = String(n).replace(/\D/g, '');
  return d.length > 9 && d.startsWith('51') ? d.slice(2) : d;
};

/** 987984071 → «987 984 071» · 014247290 → «(01) 424-7290». */
export function formatoTelefono(n) {
  const d = nacional(n);
  if (/^9\d{8}$/.test(d)) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  if (/^01\d{7}$/.test(d)) return `(01) ${d.slice(2, 5)}-${d.slice(5)}`;
  return d;
}

/** Enlace tel: internacional. El 0 del prefijo de Lima no se marca desde fuera. */
export function hrefTelefono(n) {
  const d = nacional(n);
  return `tel:+51${d.startsWith('0') ? d.slice(1) : d}`;
}

const esHttps = (u) => /^https:\/\/[^\s"'<>]+$/.test(u ?? '');
const esCorreo = (c) => /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/.test(c ?? '');

// ------------------------------------------------------------ iconos

const SVG = {
  linkedin: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3zM9 9h3.8v1.65h.05c.53-.95 1.83-1.95 3.77-1.95C20.6 8.7 21 11 21 14.1V21h-4v-6.1c0-1.45-.03-3.3-2.05-3.3-2.05 0-2.37 1.57-2.37 3.2V21H9z"/></svg>',
  facebook: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.55-1.5h1.65V3.63C16.42 3.56 15.44 3.5 14.3 3.5c-2.37 0-4 1.45-4 4.1V9.9H7.6V13h2.7v8z"/></svg>',
  instagram: '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="3.8"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor" stroke="none"/></svg>',
  youtube: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2c-.23-.86-.9-1.53-1.76-1.76C18.28 5 12 5 12 5s-6.28 0-7.84.44c-.86.23-1.53.9-1.76 1.76C2 8.76 2 12 2 12s0 3.24.4 4.8c.23.86.9 1.53 1.76 1.76C5.72 19 12 19 12 19s6.28 0 7.84-.44c.86-.23 1.53-.9 1.76-1.76.4-1.56.4-4.8.4-4.8s0-3.24-.4-4.8ZM10 15.2V8.8l5.2 3.2z"/></svg>',
  tiktok: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.5 3h-2.9v12.1a2.6 2.6 0 1 1-2.1-2.55V9.5a5.7 5.7 0 1 0 5.1 5.66V9.4a6.6 6.6 0 0 0 3.6 1.06V7.5a3.75 3.75 0 0 1-3.6-3.75z"/></svg>',
  x: '<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.8L22 21h-6.2l-4.9-6.4L5.3 21H2.2l7.3-8.3L2 3h6.3l4.4 5.9zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>',
};

const ICONO_AREA = {
  comercial: '<path d="M3 8.5h18v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5Z" /><path d="M9 8.5V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8v2.7" /><path d="M3 13h18" />',
  marketing: '<path d="M4 9.5h3l7-4.5v14l-7-4.5H4a1.5 1.5 0 0 1-1.5-1.5v-2A1.5 1.5 0 0 1 4 9.5Z" /><path d="M18 9a4 4 0 0 1 0 6" /><path d="M7 15.5V19a1.5 1.5 0 0 0 3 0v-2" />',
  tecnica: '<path d="M12 3 5 5.8v5.4c0 4.2 2.9 7.9 7 9.3 4.1-1.4 7-5.1 7-9.3V5.8Z" /><path d="m9 12 2.2 2.2L15.5 10" />',
  administracion: '<path d="M4 20.5V5.5A1.5 1.5 0 0 1 5.5 4h9A1.5 1.5 0 0 1 16 5.5v15" /><path d="M16 10h2.5A1.5 1.5 0 0 1 20 11.5v9" /><path d="M3 20.5h18M7.5 8h5M7.5 12h5M7.5 16h5" />',
  otro: '<circle cx="12" cy="8" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" />',
};

const iconoArea = (etiqueta) => {
  const e = etiqueta.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  if (e.includes('comercial') || e.includes('venta')) return ICONO_AREA.comercial;
  if (e.includes('marketing')) return ICONO_AREA.marketing;
  if (e.includes('tecnic') || e.includes('calidad')) return ICONO_AREA.tecnica;
  if (e.includes('administr')) return ICONO_AREA.administracion;
  return ICONO_AREA.otro;
};

// ------------------------------------------------------------ utilidades DOM

const el = (etiqueta, atributos = {}, hijos = []) => {
  const n = document.createElement(etiqueta);
  for (const [k, v] of Object.entries(atributos)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'texto') n.textContent = v;
    else n.setAttribute(k, v === true ? '' : v);
  }
  for (const h of [].concat(hijos)) if (h) n.append(h);
  return n;
};

/**
 * Sustituye los elementos marcados con data-vivo-item de un contenedor.
 * Si los viejos ya se habían revelado, los nuevos aparecen sin animación
 * (no hay parpadeo); si no, entran en el sistema de revelado de la web.
 */
function reemplazarItems(contenedor, nuevos, revelar) {
  const viejos = $$(':scope > [data-vivo-item]', contenedor);
  if (!nuevos.length) return;
  const yaVisible = viejos.some((v) => v.classList.contains('es-visible'));
  const referencia = viejos[0] ?? null;
  for (const n of nuevos) {
    n.setAttribute('data-vivo-item', '');
    if (n.classList.contains('revelar') && yaVisible) n.classList.add('es-visible');
    contenedor.insertBefore(n, referencia);
  }
  viejos.forEach((v) => v.remove());
  if (!yaVisible) revelar?.(nuevos.filter((n) => n.classList.contains('revelar')));
}

// ------------------------------------------------------------ aplicación

export async function datosVivos({ revelar } = {}) {
  const filas = await leer(
    'datos_contacto',
    `empresa_id=eq.${EMPRESA}&visible=is.true&select=tipo,etiqueta,valor,detalle,red,orden&order=orden.asc`,
  );
  if (!filas?.length) return;

  const de = (tipo) => filas.filter((f) => f.tipo === tipo);
  const [wa] = de('whatsapp');
  const telefonos = de('telefono');
  const correos = de('correo');
  const [direccion] = de('direccion');
  const redes = de('red').filter((r) => SVG[r.red] && esHttps(r.valor));

  // WhatsApp: se cambia el número y se respeta el mensaje de cada enlace.
  if (wa && /^\d{9,15}$/.test(wa.valor)) {
    for (const a of $$('a[href*="wa.me/"]')) {
      const url = new URL(a.href);
      url.pathname = `/${wa.valor}`;
      if (!url.searchParams.get('text') && wa.detalle) url.searchParams.set('text', wa.detalle);
      a.href = url.toString();
    }
    $$('[data-vivo="whatsapp-numero"]').forEach((n) => (n.textContent = formatoTelefono(wa.valor)));
  }

  if (direccion) {
    for (const a of $$('[data-vivo="direccion"]')) {
      a.textContent = direccion.valor;
      if (esHttps(direccion.detalle)) a.href = direccion.detalle;
    }
  }

  // Pie: teléfonos con su área.
  if (telefonos.length) {
    for (const ul of $$('[data-vivo="telefonos-pie"]')) {
      reemplazarItems(
        ul,
        telefonos.map((t) =>
          el('li', {}, el('a', { href: hrefTelefono(t.valor) }, [el('b', { texto: t.etiqueta }), ` · ${formatoTelefono(t.valor)}`])),
        ),
        revelar,
      );
    }
    for (const p of $$('[data-vivo="telefonos-menu"]')) {
      p.replaceChildren(
        ...telefonos.slice(0, 3).flatMap((t, i) => [
          ...(i ? [' · '] : []),
          el('a', { href: hrefTelefono(t.valor), texto: formatoTelefono(t.valor) }),
        ]),
      );
    }
  }

  const [correoPrincipal] = correos;
  if (correoPrincipal && esCorreo(correoPrincipal.valor)) {
    for (const a of $$('[data-vivo="correo-principal"]')) {
      a.href = `mailto:${correoPrincipal.valor}`;
      a.textContent = correoPrincipal.valor;
    }
  }

  // Contacto por área: correo y teléfono emparejados por su etiqueta.
  const areas = [];
  for (const f of [...correos, ...telefonos]) {
    let a = areas.find((x) => x.etiqueta.toLowerCase() === f.etiqueta.toLowerCase());
    if (!a) areas.push((a = { etiqueta: f.etiqueta, correos: [], telefonos: [] }));
    (f.tipo === 'correo' ? a.correos : a.telefonos).push(f.valor);
  }
  if (areas.length) {
    for (const ul of $$('[data-vivo="areas"]')) {
      reemplazarItems(
        ul,
        areas.map((a) => {
          const ico = el('span', { class: 'contacto__ico' });
          ico.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${iconoArea(a.etiqueta)}</svg>`;
          return el('li', { class: 'revelar' }, [
            ico,
            el('div', {}, [
              el('p', { class: 'contacto__rotulo', texto: a.etiqueta }),
              ...a.correos.filter(esCorreo).map((c) => el('a', { href: `mailto:${c}`, texto: c })),
              ...a.telefonos.map((t) => el('a', { href: hrefTelefono(t), texto: formatoTelefono(t) })),
            ]),
          ]);
        }),
        revelar,
      );
    }
  }

  // Redes: se reconstruyen los iconos en el mismo orden del portal.
  if (redes.length) {
    for (const cont of $$('[data-vivo="redes"]')) {
      cont.replaceChildren(
        ...redes.map((r) => {
          const a = el('a', { href: r.valor, target: '_blank', rel: 'noopener', 'aria-label': r.etiqueta });
          a.innerHTML = SVG[r.red];
          return a;
        }),
      );
    }
  }
}
