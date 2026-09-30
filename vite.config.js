import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('.');

/**
 * Inserta las partials HTML en tiempo de build.
 * Uso dentro del HTML:  <!--@include partials/header.html-->
 * Sustituciones dentro de la partial:  {{page}} para marcar el enlace activo.
 */
function includePartials() {
  const cache = new Map();
  const read = (rel) => {
    if (!cache.has(rel) || process.env.NODE_ENV !== 'production') {
      cache.set(rel, readFileSync(path.join(ROOT, 'src', rel), 'utf8'));
    }
    return cache.get(rel);
  };

  return {
    name: 'include-partials',
    enforce: 'pre',
    handleHotUpdate({ file, server }) {
      if (file.includes(path.join('src', 'partials'))) {
        cache.clear();
        server.ws.send({ type: 'full-reload' });
      }
    },
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const page = path.basename(ctx.path).replace(/\.html$/, '') || 'index';
        let out = html;
        // Se resuelve en bucle para permitir partials anidadas.
        for (let i = 0; i < 5 && /<!--@include /.test(out); i += 1) {
          out = out.replace(/<!--@include\s+([\w./-]+)\s*-->/g, (_, rel) => read(rel));
        }
        out = out.replace(/\{\{page\}\}/g, page);
        // Marca el enlace de navegación correspondiente a la página actual.
        return out.replace(new RegExp(`data-p="${page}"`, 'g'), `data-p="${page}" aria-current="page"`);
      },
    },
  };
}

/**
 * Etiquetas para redes sociales (Open Graph y Twitter) a partir del mismo
 * <title> y la misma meta description que lee Google: un solo mensaje en el
 * buscador y al compartir el enlace. Se descartan las escritas a mano; la
 * imagen de cada página se conserva de su og:image (o la del inicio).
 */
const IMAGEN_POR_DEFECTO = 'https://laboratoriospacheco.com/img/hero/hero-1-1280.jpg';

function etiquetasSociales() {
  const atributo = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const texto = (v) => v.replace(/\s+/g, ' ').trim();

  return {
    name: 'etiquetas-sociales',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const cabeza = html.slice(0, html.indexOf('</head>'));
        // Páginas que no se indexan (404) no llevan etiquetas para compartir.
        if (/<meta\s+name="robots"\s+content="noindex/.test(cabeza)) return html;

        const titulo = texto(cabeza.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '');
        const descripcion = texto(cabeza.match(/<meta\s+name="description"\s+content="([^"]*)"/)?.[1] ?? '');
        const canonica = cabeza.match(/<link\s+rel="canonical"\s+href="([^"]*)"/)?.[1] ?? '';
        const imagen = cabeza.match(/<meta\s+property="og:image"\s+content="([^"]*)"/)?.[1] ?? IMAGEN_POR_DEFECTO;
        if (!titulo || !descripcion) return html;

        const etiquetas = [
          ['property', 'og:type', 'website'],
          ['property', 'og:locale', 'es_PE'],
          ['property', 'og:site_name', 'Laboratorios Pacheco'],
          ['property', 'og:url', canonica],
          ['property', 'og:title', titulo],
          ['property', 'og:description', descripcion],
          ['property', 'og:image', imagen],
          ['name', 'twitter:card', 'summary_large_image'],
          ['name', 'twitter:title', titulo],
          ['name', 'twitter:description', descripcion],
          ['name', 'twitter:image', imagen],
        ]
          .filter(([, , v]) => v)
          .map(([a, n, v]) => `    <meta ${a}="${n}" content="${atributo(v)}" />`)
          .join('\n');

        const limpia = html.replace(/[ \t]*<meta\s+(?:property="og:[^"]*"|name="twitter:[^"]*")\s+content="[^"]*"\s*\/?>\s*\n?/g, '');
        return limpia.replace('</head>', `${etiquetas}\n  </head>`);
      },
    },
  };
}

/** Lista todos los .html de la raíz para el build multi-página. */
function htmlInputs() {
  const entries = {};
  for (const file of readdirSync(ROOT)) {
    if (file.endsWith('.html')) entries[file.replace(/\.html$/, '')] = path.resolve(ROOT, file);
  }
  return entries;
}

export default defineConfig({
  // Rutas relativas: el build funciona igual en Vercel (raíz) que en un
  // subdirectorio de cPanel (public_html/ o public_html/web/).
  base: './',
  plugins: [includePartials(), etiquetasSociales()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsInlineLimit: 2048,
    cssCodeSplit: false,
    rollupOptions: {
      input: htmlInputs(),
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
  server: { port: 5173, open: true },
});
