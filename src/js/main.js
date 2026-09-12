/* ============================================================
   LABORATORIOS PACHECO — Interacciones
   Vanilla JS, sin dependencias. Cada módulo es independiente:
   si su marcado no existe en la página, no hace nada.
   ============================================================ */

import '../styles/main.css';

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];
const menosMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------
   1. PRELOADER
   El código de barras se ilumina siguiendo el progreso real de
   carga de la página.
   ------------------------------------------------------------ */
function preloader() {
  const raiz = $('.preloader');
  if (!raiz) return;

  const activo = $('.barcode--activo', raiz);
  const haz = $('.preloader__haz', raiz);
  const pct = $('.preloader__pct', raiz);

  let valor = 0;
  let objetivo = 10;
  let terminado = false;
  document.body.classList.add('is-loading');

  // Proporción de imágenes ya descargadas.
  const recursos = () => {
    const imgs = $$('img');
    if (!imgs.length) return 1;
    return imgs.filter((i) => i.complete).length / imgs.length;
  };

  window.addEventListener('load', () => {
    objetivo = 100;
  });

  // Salvaguarda: nunca bloquear más de 6 s.
  const limite = setTimeout(() => {
    objetivo = 100;
  }, 6000);

  const pintar = () => {
    objetivo = Math.max(objetivo, Math.round(recursos() * 92));

    valor += Math.max(0.7, (objetivo - valor) * 0.08);
    if (valor > objetivo) valor = objetivo;
    if (valor >= 100) valor = 100;

    activo.style.clipPath = `inset(0 ${(100 - valor).toFixed(1)}% 0 0)`;
    haz.style.left = `${valor.toFixed(1)}%`;
    pct.textContent = String(Math.floor(valor)).padStart(2, '0');

    if (valor >= 100 && !terminado) {
      terminado = true;
      clearTimeout(limite);
      setTimeout(salir, 320);
      return;
    }
    requestAnimationFrame(pintar);
  };

  const salir = () => {
    raiz.classList.add('esta-saliendo');
    document.body.classList.remove('is-loading');
    document.body.classList.add('ya-cargo');
    // Hasta aquí el scroll del documento estaba bloqueado.
    document.dispatchEvent(new CustomEvent('preloader:fin'));
    setTimeout(() => {
      raiz.classList.add('ya-termino');
      raiz.setAttribute('aria-hidden', 'true');
    }, 1100);
  };

  if (menosMovimiento) {
    activo.style.clipPath = 'inset(0 0 0 0)';
    pct.textContent = '100';
    setTimeout(salir, 300);
  } else {
    requestAnimationFrame(pintar);
  }
}

/* ------------------------------------------------------------
   2. HEADER: estado al hacer scroll + auto-ocultar
   ------------------------------------------------------------ */
function header() {
  const el = $('.header');
  if (!el) return;
  const progreso = $('.barra-progreso');
  const esInterna = document.body.classList.contains('pagina-interna');
  let anterior = window.scrollY;

  const actualizar = () => {
    const y = window.scrollY;
    const umbral = esInterna ? 20 : Math.min(window.innerHeight * 0.75, 560);

    el.classList.toggle('esta-fija', y > umbral);

    // Se oculta al bajar, reaparece al subir (solo pasado el hero).
    const abajo = y > anterior && y > umbral + 160;
    el.classList.toggle('esta-oculta', abajo && !document.body.classList.contains('menu-abierto'));
    anterior = y;

    if (progreso) {
      const alto = document.documentElement.scrollHeight - window.innerHeight;
      progreso.style.transform = `scaleX(${alto > 0 ? y / alto : 0})`;
    }

    const arriba = $('.arriba');
    if (arriba) arriba.classList.toggle('es-visible', y > 600);
  };

  actualizar();
  window.addEventListener('scroll', actualizar, { passive: true });
}

/* ------------------------------------------------------------
   3. Menú móvil
   ------------------------------------------------------------ */
function menuMovil() {
  const btn = $('.hamburguesa');
  const menu = $('.menu-movil');
  if (!btn || !menu) return;

  $$('.menu-movil__lista > li').forEach((li, i) => li.style.setProperty('--i', i));

  const alternar = (abrir) => {
    const estado = abrir ?? !document.body.classList.contains('menu-abierto');
    document.body.classList.toggle('menu-abierto', estado);
    document.body.style.overflow = estado ? 'hidden' : '';
    btn.setAttribute('aria-expanded', String(estado));
    menu.setAttribute('aria-hidden', String(!estado));
  };

  btn.addEventListener('click', () => alternar());
  $$('a', menu).forEach((a) => a.addEventListener('click', () => alternar(false)));
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.body.classList.contains('menu-abierto')) alternar(false);
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth >= 1080 && document.body.classList.contains('menu-abierto')) alternar(false);
  });
}

/* ------------------------------------------------------------
   4. Hero: carrusel con Ken Burns
   ------------------------------------------------------------ */
function heroSlider() {
  const slides = $$('.hero__slide');
  const puntos = $$('.hero__punto');
  if (slides.length < 2) return;

  let actual = 0;
  let timer;
  const DURACION = 7000;

  const ir = (i) => {
    slides[actual].classList.remove('esta-activa');
    puntos[actual]?.classList.remove('esta-activo');
    actual = (i + slides.length) % slides.length;
    slides[actual].classList.add('esta-activa');

    // Reinicia la animación de la barra de progreso del punto activo.
    const p = puntos[actual];
    if (p) {
      p.classList.remove('esta-activo');
      void p.offsetWidth;
      p.classList.add('esta-activo');
    }
  };

  const arrancar = () => {
    clearInterval(timer);
    if (!menosMovimiento) timer = setInterval(() => ir(actual + 1), DURACION);
  };

  puntos.forEach((p, i) =>
    p.addEventListener('click', () => {
      ir(i);
      arrancar();
    })
  );

  // Pausa cuando la pestaña no está visible.
  document.addEventListener('visibilitychange', () => (document.hidden ? clearInterval(timer) : arrancar()));

  ir(0);
  arrancar();
}

/* ------------------------------------------------------------
   5. Revelado al hacer scroll
   Se usa un barrido propio en lugar de IntersectionObserver: con un
   scroll muy rápido el observador puede no llegar a notificar elementos
   que atraviesan la pantalla entre dos fotogramas y quedarían invisibles.
   ------------------------------------------------------------ */

/** Registro de elementos pendientes de mostrar y el umbral que los activa. */
const pendientes = new Map();
let barridoPedido = false;

function barrer() {
  barridoPedido = false;
  if (!pendientes.size) return;
  const alto = window.innerHeight;
  pendientes.forEach((accion, el) => {
    const r = el.getBoundingClientRect();
    // Se activa cuando el elemento entra por abajo o ya quedó por encima.
    if (r.top < alto * 0.92) {
      pendientes.delete(el);
      accion(el);
    }
  });
}

function pedirBarrido() {
  if (barridoPedido) return;
  barridoPedido = true;
  requestAnimationFrame(barrer);
}

function observarEntrada(el, accion) {
  pendientes.set(el, accion);
}

window.addEventListener('scroll', pedirBarrido, { passive: true });
window.addEventListener('resize', pedirBarrido);
// Al terminar de cargar las imágenes la altura puede cambiar: se repasa.
window.addEventListener('load', pedirBarrido);

function revelar() {
  const objetivos = $$('.revelar, .revelar-titulo');
  if (!objetivos.length) return;

  // Escalonado automático dentro de los grupos marcados.
  $$('[data-escalonar]').forEach((grupo) => {
    const paso = parseFloat(grupo.dataset.escalonar) || 0.08;
    $$(':scope > *', grupo).forEach((hijo, i) => {
      const objetivo = hijo.matches('.revelar, .revelar-titulo') ? hijo : $('.revelar, .revelar-titulo', hijo);
      objetivo?.style.setProperty('--d', `${i * paso}s`);
    });
  });

  if (menosMovimiento) {
    objetivos.forEach((el) => el.classList.add('es-visible'));
    return;
  }

  objetivos.forEach((el) => observarEntrada(el, (e) => e.classList.add('es-visible')));
  pedirBarrido();
}

/* ------------------------------------------------------------
   6. Contadores animados
   ------------------------------------------------------------ */
function contadores() {
  const nums = $$('[data-contador]');
  if (!nums.length) return;

  const animar = (el) => {
    const fin = parseFloat(el.dataset.contador);
    const sufijo = el.dataset.sufijo || '';
    const decimales = (el.dataset.contador.split('.')[1] || '').length;
    const dur = 1700;
    const t0 = performance.now();

    const paso = (t) => {
      const p = Math.min((t - t0) / dur, 1);
      // easeOutExpo
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      el.textContent = (fin * e).toFixed(decimales) + sufijo;
      if (p < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  };

  if (menosMovimiento) {
    nums.forEach((el) => (el.textContent = el.dataset.contador + (el.dataset.sufijo || '')));
    return;
  }

  nums.forEach((el) => observarEntrada(el, animar));
  pedirBarrido();
}

/* ------------------------------------------------------------
   7. Galería + lightbox
   ------------------------------------------------------------ */
function lightbox() {
  const items = $$('.galeria__item');
  const caja = $('.lightbox');
  if (!items.length || !caja) return;

  const img = $('.lightbox__figura img', caja);
  const pie = $('.lightbox__figura figcaption', caja);
  const contador = $('.lightbox__contador', caja);
  let indice = 0;
  let ultimoFoco = null;

  const mostrar = (i) => {
    indice = (i + items.length) % items.length;
    const it = items[indice];
    img.src = it.dataset.full || $('img', it).src;
    img.alt = $('img', it).alt;
    pie.textContent = it.dataset.pie || $('img', it).alt;
    contador.textContent = `${String(indice + 1).padStart(2, '0')} / ${String(items.length).padStart(2, '0')}`;
  };

  const abrir = (i) => {
    ultimoFoco = document.activeElement;
    mostrar(i);
    caja.classList.add('esta-abierto');
    caja.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    $('.lightbox__cerrar', caja).focus();
  };

  const cerrar = () => {
    caja.classList.remove('esta-abierto');
    caja.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    ultimoFoco?.focus();
  };

  items.forEach((it, i) => {
    it.setAttribute('tabindex', '0');
    it.setAttribute('role', 'button');
    it.addEventListener('click', () => abrir(i));
    it.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        abrir(i);
      }
    });
  });

  $('.lightbox__cerrar', caja).addEventListener('click', cerrar);
  $('.lightbox__prev', caja).addEventListener('click', () => mostrar(indice - 1));
  $('.lightbox__sig', caja).addEventListener('click', () => mostrar(indice + 1));
  caja.addEventListener('click', (e) => {
    if (e.target === caja) cerrar();
  });

  document.addEventListener('keydown', (e) => {
    if (!caja.classList.contains('esta-abierto')) return;
    if (e.key === 'Escape') cerrar();
    if (e.key === 'ArrowLeft') mostrar(indice - 1);
    if (e.key === 'ArrowRight') mostrar(indice + 1);
  });

  // Deslizar en táctil.
  let x0 = null;
  caja.addEventListener('touchstart', (e) => (x0 = e.touches[0].clientX), { passive: true });
  caja.addEventListener(
    'touchend',
    (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 55) mostrar(indice + (dx < 0 ? 1 : -1));
      x0 = null;
    },
    { passive: true }
  );
}

/* ------------------------------------------------------------
   8. Marquesina de clientes: duplica la pista para bucle continuo
   ------------------------------------------------------------ */
function marquesina() {
  $$('.marquesina').forEach((m) => {
    const pista = $('.marquesina__pista', m);
    if (!pista) return;
    const copia = pista.cloneNode(true);
    copia.setAttribute('aria-hidden', 'true');
    m.appendChild(copia);
  });
}

/* ------------------------------------------------------------
   9. Índice de servicios: resalta la sección visible
   ------------------------------------------------------------ */
function indiceServicios() {
  const enlaces = $$('.indice-servicios a');
  if (!enlaces.length || !('IntersectionObserver' in window)) return;

  const secciones = enlaces.map((a) => $(a.getAttribute('href'))).filter(Boolean);

  const obs = new IntersectionObserver(
    (entradas) => {
      entradas.forEach((e) => {
        if (!e.isIntersecting) return;
        enlaces.forEach((a) => a.classList.toggle('esta-activo', a.getAttribute('href') === `#${e.target.id}`));
      });
    },
    { rootMargin: '-25% 0px -60% 0px' }
  );
  secciones.forEach((s) => obs.observe(s));
}

/* ------------------------------------------------------------
   10. Formulario de contacto
   Hosting estático: si se define un endpoint en data-endpoint
   (Formspree, Web3Forms, función de Vercel…) se envía por fetch.
   Si no, se abre el cliente de correo con los datos completados.
   ------------------------------------------------------------ */
function formulario() {
  const form = $('#form-contacto');
  if (!form) return;

  const aviso = $('.form-aviso', form);
  const boton = $('button[type="submit"]', form);
  const textoBoton = boton?.textContent;

  const decir = (msg, ok = true) => {
    if (!aviso) return;
    aviso.textContent = msg;
    aviso.className = `form-aviso es-visible form-aviso--${ok ? 'ok' : 'error'}`;
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    // Campo trampa anti-spam.
    if ($('[name="empresa_web"]', form)?.value) return;

    const datos = Object.fromEntries(new FormData(form));
    const endpoint = form.dataset.endpoint;

    if (endpoint) {
      boton.disabled = true;
      boton.textContent = 'Enviando…';
      try {
        const r = await fetch(endpoint, {
          method: 'POST',
          headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
          body: JSON.stringify(datos),
        });
        if (!r.ok) throw new Error(r.statusText);
        form.reset();
        decir('Gracias, hemos recibido su mensaje. Nos pondremos en contacto a la brevedad.');
      } catch (err) {
        decir('No pudimos enviar el mensaje. Escríbanos a gestioncomercial@laboratoriospacheco.com o por WhatsApp.', false);
      } finally {
        boton.disabled = false;
        boton.textContent = textoBoton;
      }
      return;
    }

    // Sin backend: se prepara el correo con toda la información.
    const cuerpo = [
      `Nombre: ${datos.nombre || ''}`,
      `Empresa: ${datos.empresa || ''}`,
      `Correo: ${datos.correo || ''}`,
      `Teléfono: ${datos.telefono || ''}`,
      `Servicio de interés: ${datos.servicio || 'No especificado'}`,
      '',
      'Mensaje:',
      datos.mensaje || '',
    ].join('\n');

    const asunto = `Consulta web — ${datos.empresa || datos.nombre || 'Nuevo contacto'}`;
    window.location.href = `mailto:gestioncomercial@laboratoriospacheco.com?subject=${encodeURIComponent(
      asunto
    )}&body=${encodeURIComponent(cuerpo)}`;

    decir('Se abrirá su gestor de correo con la consulta lista para enviar. Si prefiere, escríbanos por WhatsApp.');
  });
}

/* ------------------------------------------------------------
   11. Ancla inicial
   Al abrir una URL con #seccion, las imágenes que todavía se están
   descargando desplazan la maquetación y el navegador deja el destino
   fuera de sitio. Se recoloca hasta que el visitante toque el scroll.
   ------------------------------------------------------------ */
function anclaInicial() {
  const hash = window.location.hash;
  if (!hash || hash === '#') return;

  let destino;
  try {
    destino = document.querySelector(hash);
  } catch {
    return; // hash que no es un selector válido
  }
  if (!destino) return;

  let intervenido = false;
  const marcar = () => {
    intervenido = true;
  };
  ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) =>
    window.addEventListener(ev, marcar, { once: true, passive: true })
  );

  const recolocar = () => {
    if (intervenido) return;
    // 'instant' evita encadenar desplazamientos suaves en cada reintento.
    destino.scrollIntoView({ block: 'start', behavior: 'instant' });
  };

  // El preloader mantiene el scroll bloqueado: se espera a que lo libere.
  document.addEventListener('preloader:fin', () => {
    recolocar();
    setTimeout(recolocar, 400);
  });
  window.addEventListener('load', () => setTimeout(recolocar, 500));
  recolocar();
}

/* ------------------------------------------------------------
   12. Año actual en el pie
   ------------------------------------------------------------ */
function anio() {
  $$('[data-anio]').forEach((el) => (el.textContent = new Date().getFullYear()));
}

/* ------------------------------------------------------------
   13. Arranque
   ------------------------------------------------------------ */
const iniciar = () => {
  preloader();
  header();
  menuMovil();
  heroSlider();
  revelar();
  contadores();
  lightbox();
  marquesina();
  indiceServicios();
  formulario();
  anclaInicial();
  anio();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
