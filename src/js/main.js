/* ============================================================
   LABORATORIOS PACHECO — Interacciones
   Vanilla JS, sin dependencias. Cada módulo es independiente:
   si su marcado no existe en la página, no hace nada.
   ============================================================ */

import { endpoint } from './config.js';
import { datosVivos } from './datos-vivos.js';
import { libroReclamaciones } from './libro.js';
import { empleos } from './empleos.js';
import { postulaciones } from './postular.js';

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
    // La cabecera se vuelve sólida con un desplazamiento mínimo y recupera la
    // transparencia al volver arriba del todo.
    const umbral = esInterna ? 20 : 48;

    el.classList.toggle('esta-fija', y > umbral);

    // Se oculta al bajar, reaparece al subir. El margen es mayor que el umbral
    // de solidez para que ambos cambios no ocurran a la vez.
    const abajo = y > anterior && y > 520;
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

  // Con un formulario en pantalla, el WhatsApp flotante se aparta en el
  // celular (CSS) para no tapar campos, la casilla de privacidad ni el envío.
  const formularios = $$('form');
  if (formularios.length && 'IntersectionObserver' in window) {
    const visibles = new Set();
    const vigia = new IntersectionObserver(
      (entradas) => {
        entradas.forEach((e) => (e.isIntersecting ? visibles.add(e.target) : visibles.delete(e.target)));
        document.body.classList.toggle('formulario-a-la-vista', visibles.size > 0);
      },
      { rootMargin: '0px 0px -10% 0px' }
    );
    formularios.forEach((f) => vigia.observe(f));
  }
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
    // Se activa un poco antes de entrar por abajo (o si ya quedó por encima):
    // al hacer scroll el contenido ya está apareciendo, sin zonas vacías.
    if (r.top < alto * 1.08) {
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
    // Escalonado corto y con tope: el último de un grupo largo no espera.
    const paso = Math.min(parseFloat(grupo.dataset.escalonar) || 0.06, 0.08);
    $$(':scope > *', grupo).forEach((hijo, i) => {
      const objetivo = hijo.matches('.revelar, .revelar-titulo') ? hijo : $('.revelar, .revelar-titulo', hijo);
      objetivo?.style.setProperty('--d', `${Math.min(i * paso, 0.3)}s`);
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
   10. Formulario de contacto y cotización
   Se envía al portal del Grupo Pacheco, que lo guarda y avisa al
   área comercial. El de Contacto es la solicitud de cotización
   completa (data-tipo="cotizacion", con RUC, producto, cantidad,
   fecha y archivos adjuntos); el de Inicio, una consulta rápida.
   Si el portal no responde, se abre el correo con todo redactado.
   ------------------------------------------------------------ */
const ADJUNTOS_MAX = 3;
const ADJUNTOS_BYTES = 4 * 1024 * 1024;
const ADJUNTOS_EXT = /\.(pdf|docx?|xlsx?|jpe?g|png)$/i;
// Campos propios de la cotización: viajan en `datos` y el portal los muestra con su nombre.
const CAMPOS_DATOS = ['ruc', 'tipo_producto', 'cantidad', 'fecha_requerida'];

const pesoLegible = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);

function formulario() {
  const form = $('#form-contacto');
  if (!form) return;

  const tipo = form.dataset.tipo || 'contacto';
  const aviso = $('.form-aviso', form);
  const boton = $('button[type="submit"]', form);
  const textoBoton = boton?.innerHTML;

  const decir = (msg, ok = true) => {
    if (!aviso) return;
    aviso.textContent = msg;
    aviso.className = `form-aviso es-visible form-aviso--${ok ? 'ok' : 'error'}`;
  };

  // La fecha requerida no puede ser anterior a hoy (hora de Lima).
  const fecha = $('[name="fecha_requerida"]', form);
  if (fecha) {
    fecha.min = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
  }

  // ---------- Archivos adjuntos ----------
  const archivo = $('[name="adjuntos"]', form);
  const lista = $('[data-adjuntar-lista]', form);
  const caja = $('[data-adjuntar]', form);
  const titulo = $('[data-adjuntar-titulo]', form);
  const detalle = $('[data-adjuntar-detalle]', form);
  const detalleBase = detalle?.textContent;

  const validarAdjuntos = () => {
    if (!archivo) return '';
    const fs = [...archivo.files];
    let error = '';
    if (fs.length > ADJUNTOS_MAX) error = `Puede adjuntar hasta ${ADJUNTOS_MAX} archivos.`;
    else if (fs.some((f) => !ADJUNTOS_EXT.test(f.name))) error = 'Solo se admiten archivos PDF, Word, Excel, JPG o PNG.';
    else if (fs.reduce((t, f) => t + f.size, 0) > ADJUNTOS_BYTES) error = 'Los archivos no pueden superar 4 MB en total.';
    archivo.setCustomValidity(error);

    if (lista) {
      lista.replaceChildren(
        ...fs.map((f) => {
          const li = document.createElement('li');
          li.textContent = `${f.name} · ${pesoLegible(f.size)}`;
          return li;
        })
      );
      lista.hidden = fs.length === 0;
    }
    caja?.classList.toggle('tiene-archivo', fs.length > 0 && !error);
    caja?.classList.toggle('con-error', Boolean(error));
    if (titulo) titulo.textContent = fs.length ? `${fs.length} archivo${fs.length === 1 ? '' : 's'} · clic para cambiar` : 'Adjuntar archivos';
    if (detalle) detalle.textContent = error || detalleBase;
    return error;
  };
  archivo?.addEventListener('change', () => {
    aviso.className = 'form-aviso';
    validarAdjuntos();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    aviso.className = 'form-aviso';

    const errorAdjuntos = validarAdjuntos();
    if (!form.checkValidity()) {
      if (errorAdjuntos) decir(errorAdjuntos, false);
      form.reportValidity();
      return;
    }
    // Campo trampa anti-spam.
    if ($('[name="empresa_web"]', form)?.value) return;

    const valor = (n) => ($(`[name="${n}"]`, form)?.value || '').trim();
    const datos = Object.fromEntries(CAMPOS_DATOS.map((n) => [n, valor(n)]).filter(([, v]) => v));
    const cuerpo = {
      tipo,
      nombre: valor('nombre'),
      empresa: valor('empresa'),
      correo: valor('correo'),
      telefono: valor('telefono'),
      asunto: valor('servicio'),
      mensaje: valor('mensaje'),
      pagina: window.location.href,
      datos,
    };
    const archivos = archivo ? [...archivo.files] : [];

    // Con archivos va como formulario (multipart); sin ellos, como JSON.
    let peticion;
    if (archivos.length) {
      const fd = new FormData();
      for (const [k, v] of Object.entries(cuerpo)) if (k !== 'datos') fd.append(k, v);
      fd.append('datos', JSON.stringify(datos));
      archivos.forEach((f) => fd.append('adjuntos', f));
      peticion = { method: 'POST', headers: { Accept: 'application/json' }, body: fd };
    } else {
      peticion = {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      };
    }

    boton.disabled = true;
    boton.textContent = archivos.length ? 'Enviando archivos…' : 'Enviando…';
    try {
      const r = await fetch(form.dataset.endpoint || endpoint('contacto'), peticion);
      const respuesta = await r.json().catch(() => ({}));
      if (r.ok) {
        form.reset();
        validarAdjuntos();
        decir(
          tipo === 'cotizacion'
            ? 'Gracias, recibimos su solicitud de cotización. Nuestro equipo comercial se comunicará con usted a la brevedad.'
            : 'Gracias, hemos recibido su mensaje. Nos pondremos en contacto a la brevedad.'
        );
        return;
      }
      if (r.status === 422 || r.status === 429 || r.status === 413) {
        // Error del visitante (dato no válido, archivos o demasiados envíos): se explica.
        decir(respuesta.error || 'Revise los datos del formulario.', false);
        const campo = respuesta.campo === 'asunto' ? 'servicio' : respuesta.campo;
        if (campo) $(`[name="${campo}"]`, form)?.focus();
        return;
      }
      throw new Error(`HTTP ${r.status}`);
    } catch {
      // Sin conexión con el portal: se ofrece el correo con todo redactado.
    } finally {
      boton.disabled = false;
      boton.innerHTML = textoBoton;
    }

    // Sin portal: se prepara el correo con toda la información.
    const texto = [
      `Nombre: ${cuerpo.nombre}`,
      `Empresa: ${cuerpo.empresa}`,
      datos.ruc && `RUC: ${datos.ruc}`,
      `Correo: ${cuerpo.correo}`,
      `Teléfono: ${cuerpo.telefono}`,
      `Servicio de interés: ${cuerpo.asunto || 'No especificado'}`,
      datos.tipo_producto && `Tipo de producto: ${datos.tipo_producto}`,
      datos.cantidad && `Cantidad aproximada: ${datos.cantidad}`,
      datos.fecha_requerida && `Fecha requerida: ${datos.fecha_requerida}`,
      '',
      'Mensaje:',
      cuerpo.mensaje,
      archivos.length ? '\n(Adjunte a este correo los archivos que seleccionó en la web.)' : '',
    ]
      .filter((l) => l !== false && l !== undefined)
      .join('\n');

    const asunto = `${tipo === 'cotizacion' ? 'Solicitud de cotización' : 'Consulta web'} — ${cuerpo.empresa || cuerpo.nombre || 'Nuevo contacto'}`;
    window.location.href = `mailto:gestioncomercial@laboratoriospacheco.com?subject=${encodeURIComponent(
      asunto
    )}&body=${encodeURIComponent(texto)}`;

    decir('Se abrirá su gestor de correo con la consulta lista para enviar. Si prefiere, escríbanos por WhatsApp.');
  });
}

/* ------------------------------------------------------------
   11. Vídeo institucional
   Arranca al entrar en la sección y se pausa al salir, de modo que
   al volver continúa donde se quedó. Los navegadores sólo permiten
   la reproducción automática sin sonido, así que se ofrece un botón
   para activarlo.
   ------------------------------------------------------------ */
function video() {
  const caja = $('.video__caja');
  if (!caja) return;

  const medio = $('video.video__medio', caja);
  if (!medio) return;

  const boton = $('.video__sonido', caja);
  const estado = $('.video__estado', caja);
  const etiquetaBoton = boton ? $('span', boton) : null;

  let listo = false;
  let enPantalla = false;
  // Si el visitante pausa a mano, no se reanuda solo al volver a la sección.
  let pausadoPorVisitante = false;
  let pausaPropia = false;

  const decir = (texto) => {
    if (estado) estado.textContent = texto;
  };

  const sincronizar = () => {
    if (!listo) return;
    // Con «reducir movimiento» no se reproduce sola: el visitante decide.
    if (enPantalla && !document.hidden && !menosMovimiento && !pausadoPorVisitante) {
      medio.play().catch(() => decir('Pulse para reproducir'));
    } else if (!medio.paused) {
      pausaPropia = true;
      medio.pause();
    }
  };

  // Resolución según la pantalla: el de 720p pesa la mitad.
  const cargar = () => {
    if (medio.src) return;
    const grande = window.matchMedia('(min-width: 900px)').matches;
    medio.src = grande ? medio.dataset.srcGrande : medio.dataset.srcChico;
    medio.preload = 'auto';
    medio.load();
  };

  medio.addEventListener('loadedmetadata', () => {
    listo = true;
    caja.classList.add('esta-listo');
    decir(menosMovimiento ? 'Pulse para reproducir' : 'Listo');
    sincronizar();
  });
  medio.addEventListener('playing', () => decir('Reproduciendo'));
  medio.addEventListener('waiting', () => decir('Cargando…'));
  medio.addEventListener('ended', () => decir('Finalizado'));
  medio.addEventListener('play', () => {
    pausadoPorVisitante = false;
  });
  medio.addEventListener('pause', () => {
    if (medio.ended) return;
    if (pausaPropia) {
      pausaPropia = false;
      decir('En pausa · continúa al volver');
    } else {
      pausadoPorVisitante = true;
      decir('En pausa');
    }
  });
  medio.addEventListener('error', () => {
    decir('No se pudo cargar el vídeo. Compruebe su conexión.');
    caja.classList.add('tiene-error');
  });
  // El sonido también puede cambiarse desde los controles del propio vídeo.
  medio.addEventListener('volumechange', () => {
    const conSonido = !medio.muted && medio.volume > 0;
    caja.classList.toggle('tiene-sonido', conSonido);
    boton?.setAttribute('aria-pressed', String(conSonido));
    if (etiquetaBoton) etiquetaBoton.textContent = conSonido ? 'Silenciar' : 'Activar sonido';
  });

  if (!('IntersectionObserver' in window)) {
    cargar();
    return;
  }

  // El vídeo sólo se descarga cuando la sección se acerca: así no lastra la
  // carga inicial de quien nunca llega hasta aquí.
  const precarga = new IntersectionObserver(
    (entradas, obs) => {
      if (!entradas.some((e) => e.isIntersecting)) return;
      obs.disconnect();
      cargar();
    },
    { rootMargin: '500px 0px' }
  );
  precarga.observe(caja);

  // Entrada y salida de la sección.
  const vigia = new IntersectionObserver(
    (entradas) => {
      enPantalla = entradas[0].isIntersecting;
      caja.classList.toggle('esta-en-pantalla', enPantalla);
      sincronizar();
    },
    { threshold: 0.45 }
  );
  vigia.observe(caja);

  // Si la pestaña deja de verse, también se pausa.
  document.addEventListener('visibilitychange', sincronizar);

  boton?.addEventListener('click', () => {
    if (!listo) return;
    if (medio.muted) {
      medio.muted = false;
      medio.volume = 0.7;
      if (medio.paused) {
        pausadoPorVisitante = false;
        medio.play().catch(() => {});
      }
    } else {
      medio.muted = true;
    }
  });
}

/* ------------------------------------------------------------
   12. Ancla inicial
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
   13. Año actual en el pie
   ------------------------------------------------------------ */
function anio() {
  $$('[data-anio]').forEach((el) => (el.textContent = new Date().getFullYear()));
}

/* ------------------------------------------------------------
   13 bis. Copiar al portapapeles (N.º de registro DIGEMID)
   ------------------------------------------------------------ */
function copiar() {
  $$('[data-copiar]').forEach((boton) => {
    const estado = $('[data-copiar-estado]', boton);
    const original = estado.innerHTML;
    let reloj;

    boton.addEventListener('click', async () => {
      const texto = boton.dataset.copiar;
      try {
        await navigator.clipboard.writeText(texto);
      } catch {
        // Sin API de portapapeles (http o navegador antiguo): se recurre a
        // una selección temporal.
        const campo = Object.assign(document.createElement('textarea'), { value: texto });
        campo.setAttribute('readonly', '');
        campo.style.cssText = 'position:fixed;opacity:0';
        document.body.append(campo);
        campo.select();
        document.execCommand('copy');
        campo.remove();
      }
      boton.classList.add('esta-copiado');
      estado.textContent = 'Copiado';
      clearTimeout(reloj);
      reloj = setTimeout(() => {
        boton.classList.remove('esta-copiado');
        estado.innerHTML = original;
      }, 2200);
    });
  });
}

/* ------------------------------------------------------------
   14. Arranque
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
  video();
  anclaInicial();
  anio();
  copiar();
  // Contenido que llega del portal: entra en el mismo sistema de revelado.
  const revelarNuevos = (elementos) => {
    if (menosMovimiento) return elementos.forEach((el) => el.classList.add('es-visible'));
    elementos.forEach((el) => observarEntrada(el, (e) => e.classList.add('es-visible')));
    pedirBarrido();
  };
  datosVivos({ revelar: revelarNuevos });
  empleos({ revelar: revelarNuevos });
  postulaciones();
  libroReclamaciones();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', iniciar);
} else {
  iniciar();
}
