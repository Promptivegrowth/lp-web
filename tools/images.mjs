/**
 * Pipeline de imagenes.
 * Redimensiona y comprime las fotos originales (~148 MB) a WebP + JPG
 * responsive dentro de public/img/. Ejecutar con `npm run images`.
 */
import sharp from 'sharp';
import { access, mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'fotos');
const OUT = path.join(ROOT, 'public', 'img');

const CEO = 'SESION DE FOTOS CEO';
const GER = 'SESION DE FOTOS GERENTES';
const GRU = 'SESIÓN DE FOTOS GRUPALES';
const PRO = 'SESIÓN DE FOTOS PROCESOS';
const f = (n) => `FOTO_${n}_EDITADA_FINAL.jpg`;
// Las fotos corregidas por el cliente (septiembre 2026) sustituyeron a sus
// originales dentro de fotos/ con el mismo nombre; las que llegaron en PNG
// conservan esa extensión. `localizar` acepta cualquiera de las dos.

const JOBS = [
  // ---------- HERO (16:9) ----------
  { src: [PRO, 'PROCESO 7', f(1)], out: 'hero/hero-1', widths: [1920, 1280, 800], ar: 16 / 9 },
  { src: [PRO, 'PROCESO 2', f(1)], out: 'hero/hero-2', widths: [1920, 1280, 800], ar: 16 / 9 },
  { src: [GRU, 'GRUPAL PRODUCCIÓN', f(1)], out: 'hero/hero-3', widths: [1920, 1280, 800], ar: 16 / 9 },

  // ---------- SECCIONES ----------
  { src: [GRU, 'GRUPAL ADMINISTRATIVO', f(1)], out: 'secciones/nosotros', widths: [1280, 800], ar: 4 / 3 },
  // Cabecera apaisada de la página Nosotros: al ser 4:3 la anterior se
  // recortaba en exceso sobre una banda ancha.
  { src: [GRU, 'GRUPAL ADMINISTRATIVO', f(2)], out: 'secciones/nosotros-hero', widths: [1920, 1280, 800], ar: 16 / 9 },
  { src: [CEO, f(9)], out: 'secciones/nosotros-2', widths: [1280, 800], ar: 4 / 3 },
  // «Quiénes somos»: el original es 3:4, así que en un marco vertical no se
  // recorta nada. La anterior era apaisada y perdía a media plantilla.
  { src: [PRO, 'PROCESO 1', f(4)], out: 'secciones/quienes-somos', widths: [900, 620], ar: 3 / 4 },
  { src: [PRO, 'PROCESO 6', f(5)], out: 'secciones/certificacion', widths: [1600, 1000], ar: 16 / 9 },
  { src: [GER, 'COMERCIAL', f(1)], out: 'secciones/contacto', widths: [1280, 800], ar: 4 / 3 },
  // Cabeceras panorámicas a 2:1. Los originales son 16:9; a 2:1 se pierde poco
  // de la fotografía y, sobre una banda ancha, casi no hace falta recortarla
  // otra vez al mostrarla.
  { src: [PRO, 'PROCESO 1', f(2)], out: 'secciones/certificacion-hero', widths: [1920, 1280, 800], ar: 2 },
  { src: [GER, 'COMERCIAL', f(1)], out: 'secciones/contacto-hero', widths: [1920, 1280, 800], ar: 2 },
  // En vertical la panorámica no cabe: se sirve un recorte cuadrado centrado.
  { src: [PRO, 'PROCESO 1', f(2)], out: 'secciones/certificacion-hero-movil', widths: [760, 540], ar: 1 },
  { src: [GER, 'COMERCIAL', f(1)], out: 'secciones/contacto-hero-movil', widths: [760, 540], ar: 1 },
  { src: [PRO, 'PROCESO 1', f(2)], out: 'secciones/calidad', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 2', f(2)], out: 'secciones/tecnologia', widths: [900, 600], ar: 3 / 2 },
  { src: [GRU, 'GRUPAL PRODUCCIÓN', f(4)], out: 'secciones/personal', widths: [900, 600], ar: 3 / 2 },
  // Banner apaisado para el tercer pilar de la portada.
  { src: [GRU, 'GRUPAL PRODUCCIÓN', f(3)], out: 'secciones/personal-ancho', widths: [1600, 1100, 760], ar: 21 / 9 },
  { src: [PRO, 'PROCESO 8', f(1)], out: 'secciones/proceso', widths: [1280, 800], ar: 4 / 3 },
  { src: [PRO, 'PROCESO 9', f(1)], out: 'secciones/instalaciones', widths: [1280, 800], ar: 4 / 3 },

  // ---------- SERVICIOS (9) ----------
  // El cliente corrigió qué carpeta es cada proceso: Proceso 7 es
  // acondicionado, Proceso 4 armado de kits y Proceso 5 etiquetado.
  { src: [PRO, 'PROCESO 7', f(2)], out: 'servicios/acondicionado', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 4', f(3)], out: 'servicios/reacondicionado', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 2', f(2)], out: 'servicios/rotulado-inkjet', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 5', f(2)], out: 'servicios/etiquetado', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 8', f(3)], out: 'servicios/cambio-envase', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 8', f(1)], out: 'servicios/rotulado-exportacion', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 6', f(4)], out: 'servicios/fraccionamiento', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 3', f(2)], out: 'servicios/termosellado', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 4', f(1)], out: 'servicios/packs-kits', widths: [900, 600], ar: 3 / 2 },

  // ---------- EQUIPO ----------
  // Cabecera apaisada: la anterior era 3:2 y se recortaba sobre la banda.
  { src: [GRU, 'GRUPAL PRODUCCIÓN', f(2)], out: 'secciones/equipo-hero', widths: [1920, 1280, 800], ar: 16 / 9 },
  // Retratos a 3:4, el encuadre que menos recorta estos originales verticales.
  { src: [CEO, f(4)], out: 'equipo/gerente-general', widths: [860, 560], ar: 3 / 4, pos: 'attention' },
  { src: [GER, 'DIRECTOR', f(3)], out: 'equipo/director-tecnico', widths: [860, 560], ar: 3 / 4, pos: 'attention' },
  { src: [GER, 'COMERCIAL', f(5)], out: 'equipo/comercial', widths: [860, 560], ar: 3 / 4, pos: 'attention' },
  { src: [GER, 'ALMACEN', f(5)], out: 'equipo/almacen', widths: [860, 560], ar: 3 / 4, pos: 'attention' },
  // «En planta»: versión grande y apaisada para el marco destacado.
  { src: [GRU, 'GRUPAL PRODUCCIÓN', f(1)], out: 'secciones/en-planta', widths: [1600, 1100, 760], ar: 16 / 9 },
];

// ---------- GALERIA ----------
export const GALERIA = [
  [[PRO, 'PROCESO 7', f(1)], 'Acondicionado en línea de productos'],
  [[PRO, 'PROCESO 2', f(2)], 'Rotulado inkjet sobre empaque secundario'],
  [[PRO, 'PROCESO 3', f(2)], 'Termosellado de estuches'],
  [[PRO, 'PROCESO 6', f(2)], 'Control de producto terminado'],
  [[PRO, 'PROCESO 5', f(4)], 'Etiquetado de viales y frascos'],
  [[PRO, 'PROCESO 1', f(1)], 'Faja transportadora de acondicionado'],
  [[PRO, 'PROCESO 9', f(3)], 'Estuches en proceso'],
  [[PRO, 'PROCESO 8', f(4)], 'Embalaje para distribución'],
  [[PRO, 'PROCESO 7', f(3)], 'Equipo de acondicionado en sala'],
  [[PRO, 'PROCESO 6', f(5)], 'Aseguramiento de calidad'],
  [[PRO, 'PROCESO 4', f(1)], 'Armado de kits'],
  [[PRO, 'PROCESO 5', f(1)], 'Área de fraccionamiento'],
  [[GRU, 'GRUPAL PRODUCCIÓN', f(3)], 'Equipo de producción'],
  [[GRU, 'GRUPAL ADMINISTRATIVO', f(2)], 'Equipo administrativo'],
  [[PRO, 'PROCESO 9', f(2)], 'Verificación de lote'],
  [[PRO, 'PROCESO 1', f(3)], 'Supervisión de proceso'],
];

GALERIA.forEach(([src], i) => {
  const n = String(i + 1).padStart(2, '0');
  JOBS.push({ src, out: `galeria/g${n}`, widths: [1000, 560], ar: 4 / 3 });
  JOBS.push({ src, out: `galeria/g${n}-full`, widths: [1500], ar: null });
});

/** Ruta real del original: .jpg o, si el cliente lo entregó así, .png. */
async function localizar(ruta) {
  for (const candidata of [ruta, ruta.replace(/\.jpg$/i, '.png')]) {
    try {
      await access(candidata);
      return candidata;
    } catch {
      // se prueba la siguiente
    }
  }
  throw new Error(`No existe el original: ${ruta} (ni en .png)`);
}

async function run() {
  await rm(OUT, { recursive: true, force: true });
  let totalIn = 0;
  let totalOut = 0;
  let count = 0;

  for (const job of JOBS) {
    const abs = await localizar(path.join(SRC, ...job.src));
    const dest = path.join(OUT, job.out);
    await mkdir(path.dirname(dest), { recursive: true });

    totalIn += (await stat(abs)).size;

    for (const w of job.widths) {
      const base = sharp(abs).rotate();
      const pipe = job.ar
        ? base.resize({
            width: w,
            height: Math.round(w / job.ar),
            fit: 'cover',
            position: job.pos === 'attention' ? sharp.strategy.attention : 'centre',
          })
        : base.resize({ width: w, withoutEnlargement: true });

      const suffix = job.widths.length > 1 ? `-${w}` : '';
      const webp = await pipe.clone().webp({ quality: 76, effort: 5 }).toFile(`${dest}${suffix}.webp`);
      const jpg = await pipe.clone().jpeg({ quality: 74, mozjpeg: true, progressive: true }).toFile(`${dest}${suffix}.jpg`);
      totalOut += webp.size + jpg.size;
      count += 2;
    }

    process.stdout.write('.');
  }

  // ---------- Marca ----------
  await mkdir(path.join(OUT, 'brand'), { recursive: true });
  const logo = path.join(ROOT, 'Logo Laboratorios Pacheco.png');
  await sharp(logo).resize({ width: 560 }).webp({ quality: 92 }).toFile(path.join(OUT, 'brand/logo.webp'));
  await sharp(logo).resize({ width: 560 }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'brand/logo.png'));

  // No se genera versión monocroma: la "L" y la "P" del logotipo van caladas en
  // blanco sobre el verde, y al pasarlo a blanco pleno esas letras desaparecen.
  // El logotipo a color tiene contraste suficiente sobre los fondos oscuros.

  const bpa = path.join(ROOT, 'BPA', 'bpa.png');
  await sharp(bpa).resize({ width: 340 }).webp({ quality: 90 }).toFile(path.join(OUT, 'brand/bpm.webp'));
  await sharp(bpa).resize({ width: 340 }).png({ compressionLevel: 9 }).toFile(path.join(OUT, 'brand/bpm.png'));

  // ---------- Logotipos de clientes ----------
  // Fuente en fuentes/clientes/1.jpg .. 18.jpg
  await mkdir(path.join(OUT, 'clientes'), { recursive: true });
  const clientes = (await readdir(path.join(ROOT, 'fuentes', 'clientes')))
    .filter((n) => /^\d+\.jpg$/i.test(n))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  for (const nombre of clientes) {
    const origen = path.join(ROOT, 'fuentes', 'clientes', nombre);
    const salida = path.join(OUT, 'clientes', `c${String(parseInt(nombre, 10)).padStart(2, '0')}`);

    // Los originales son cuadrados de 300x300 con muchísimo margen blanco:
    // al escalarlos la marca quedaba diminuta. Se recorta ese margen y se
    // vuelven a encajar todos en un lienzo común, para que pesen lo mismo
    // visualmente dentro del carrusel.
    const base = () =>
      sharp(origen)
        .trim({ background: '#ffffff', threshold: 18 })
        .resize({ width: 300, height: 132, fit: 'contain', background: '#ffffff' })
        .extend({ top: 16, bottom: 16, left: 22, right: 22, background: '#ffffff' });

    const w = await base().webp({ quality: 86 }).toFile(`${salida}.webp`);
    const j = await base().jpeg({ quality: 86, mozjpeg: true }).toFile(`${salida}.jpg`);
    totalOut += w.size + j.size;
    count += 2;
  }

  // ---------- Favicons (isotipo: la "L" dentro de la capsula) ----------
  const iso = await sharp(logo)
    .extract({ left: 40, top: 6, width: 100, height: 116 })
    .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  await sharp(iso).resize(180, 180).flatten({ background: '#ffffff' }).png().toFile(path.join(ROOT, 'public', 'apple-touch-icon.png'));
  await sharp(iso).resize(32, 32).png().toFile(path.join(ROOT, 'public', 'favicon-32.png'));
  await sharp(iso).resize(192, 192).png().toFile(path.join(ROOT, 'public', 'icon-192.png'));
  await sharp(iso).resize(512, 512).png().toFile(path.join(ROOT, 'public', 'icon-512.png'));

  console.log(`\n${count} archivos generados desde ${JOBS.length} fotos.`);
  console.log(`Origen ~${(totalIn / 1048576).toFixed(1)} MB -> salida ${(totalOut / 1048576).toFixed(2)} MB`);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
