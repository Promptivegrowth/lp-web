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
  plugins: [includePartials()],
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
