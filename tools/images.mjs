/**
 * Pipeline de imagenes.
 * Redimensiona y comprime las fotos originales (~148 MB) a WebP + JPG
 * responsive dentro de public/img/. Ejecutar con `npm run images`.
 */
import sharp from 'sharp';
import { mkdir, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const SRC = path.join(ROOT, 'fotos');
const OUT = path.join(ROOT, 'public', 'img');

const CEO = 'SESION DE FOTOS CEO';
const GER = 'SESION DE FOTOS GERENTES';
const GRU = 'SESIÓN DE FOTOS GRUPALES';
const PRO = 'SESIÓN DE FOTOS PROCESOS';
const f = (n) => `FOTO_${n}_EDITADA_FINAL.jpg`;

const JOBS = [
  // ---------- HERO (16:9) ----------
  { src: [PRO, 'PROCESO 7', f(1)], out: 'hero/hero-1', widths: [1920, 1280, 800], ar: 16 / 9 },
  { src: [PRO, 'PROCESO 2', f(1)], out: 'hero/hero-2', widths: [1920, 1280, 800], ar: 16 / 9 },
  { src: [GRU, 'GRUPAL PRODUCCIÓN', f(1)], out: 'hero/hero-3', widths: [1920, 1280, 800], ar: 16 / 9 },

  // ---------- SECCIONES ----------
  { src: [GRU, 'GRUPAL ADMINISTRATIVO', f(1)], out: 'secciones/nosotros', widths: [1280, 800], ar: 4 / 3 },
  { src: [CEO, f(9)], out: 'secciones/nosotros-2', widths: [1280, 800], ar: 4 / 3 },
  { src: [PRO, 'PROCESO 6', f(5)], out: 'secciones/certificacion', widths: [1600, 1000], ar: 16 / 9 },
  { src: [GER, 'COMERCIAL', f(1)], out: 'secciones/contacto', widths: [1280, 800], ar: 4 / 3 },
  { src: [PRO, 'PROCESO 1', f(2)], out: 'secciones/calidad', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 2', f(2)], out: 'secciones/tecnologia', widths: [900, 600], ar: 3 / 2 },
  { src: [GRU, 'GRUPAL PRODUCCIÓN', f(4)], out: 'secciones/personal', widths: [900, 600], ar: 3 / 2 },
  // Banner apaisado para el tercer pilar de la portada.
  { src: [GRU, 'GRUPAL PRODUCCIÓN', f(3)], out: 'secciones/personal-ancho', widths: [1600, 1100, 760], ar: 21 / 9 },
  { src: [PRO, 'PROCESO 8', f(1)], out: 'secciones/proceso', widths: [1280, 800], ar: 4 / 3 },
  { src: [PRO, 'PROCESO 9', f(1)], out: 'secciones/instalaciones', widths: [1280, 800], ar: 4 / 3 },

  // ---------- SERVICIOS (11) ----------
  { src: [PRO, 'PROCESO 4', f(1)], out: 'servicios/acondicionado', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 4', f(3)], out: 'servicios/reacondicionado', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 2', f(2)], out: 'servicios/rotulado-inkjet', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 9', f(3)], out: 'servicios/etiquetado', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 8', f(3)], out: 'servicios/cambio-envase', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 5', f(3)], out: 'servicios/actualizacion-informacion', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 8', f(1)], out: 'servicios/rotulado-exportacion', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 7', f(4)], out: 'servicios/colocacion-etiquetas', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 6', f(4)], out: 'servicios/fraccionamiento', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 3', f(2)], out: 'servicios/termosellado', widths: [900, 600], ar: 3 / 2 },
  { src: [PRO, 'PROCESO 7', f(2)], out: 'servicios/packs-kits', widths: [900, 600], ar: 3 / 2 },

  // ---------- EQUIPO (retratos 4:5) ----------
  { src: [CEO, f(3)], out: 'equipo/gerente-general', widths: [800, 500], ar: 4 / 5, pos: 'attention' },
  { src: [GER, 'DIRECTOR', f(2)], out: 'equipo/director-tecnico', widths: [800, 500], ar: 4 / 5, pos: 'attention' },
  { src: [GER, 'COMERCIAL', f(5)], out: 'equipo/comercial', widths: [800, 500], ar: 4 / 5, pos: 'attention' },
  { src: [GER, 'ALMACEN', f(4)], out: 'equipo/almacen', widths: [800, 500], ar: 4 / 5, pos: 'attention' },
];

// ---------- GALERIA ----------
export const GALERIA = [
  [[PRO, 'PROCESO 7', f(1)], 'Acondicionado en línea de productos'],
  [[PRO, 'PROCESO 2', f(2)], 'Rotulado inkjet sobre empaque secundario'],
  [[PRO, 'PROCESO 3', f(2)], 'Termosellado de estuches'],
  [[PRO, 'PROCESO 6', f(2)], 'Control de producto terminado'],
  [[PRO, 'PROCESO 5', f(4)], 'Etiquetado de viales y frascos'],
  [[PRO, 'PROCESO 1', f(1)], 'Faja transportadora de acondicionado'],
  [[PRO, 'PROCESO 9', f(3)], 'Colocación de etiquetas'],
  [[PRO, 'PROCESO 8', f(4)], 'Embalaje para distribución'],
  [[PRO, 'PROCESO 7', f(3)], 'Equipo de acondicionado en sala'],
  [[PRO, 'PROCESO 6', f(5)], 'Aseguramiento de calidad'],
  [[PRO, 'PROCESO 4', f(1)], 'Inclusión de insertos'],
  [[PRO, 'PROCESO 5', f(1)], 'Área de fraccionamiento'],
  [[GRU, 'GRUPAL PRODUCCIÓN', f(3)], 'Equipo de producción'],
  [[GRU, 'GRUPAL ADMINISTRATIVO', f(2)], 'Equipo administrativo'],
  [[PRO, 'PROCESO 9', f(2)], 'Verificación de lote'],
  [[PRO, 'PROCESO 1', f(3)], 'Supervisión de proceso'],
];

GALERIA.forEach(([src], i) => {
  const n = String(i + 1).padStart(2, '0');
  JOBS.push({ src, out: `galeria/g${n}`, widths: [640], ar: 4 / 3 });
  JOBS.push({ src, out: `galeria/g${n}-full`, widths: [1500], ar: null });
});

async function run() {
  await rm(OUT, { recursive: true, force: true });
  let totalIn = 0;
  let totalOut = 0;
  let count = 0;

  for (const job of JOBS) {
    const abs = path.join(SRC, ...job.src);
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
    const base = () => sharp(origen).resize({ width: 300, withoutEnlargement: true });
    const w = await base().webp({ quality: 82 }).toFile(`${salida}.webp`);
    const j = await base().jpeg({ quality: 80, mozjpeg: true }).toFile(`${salida}.jpg`);
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
