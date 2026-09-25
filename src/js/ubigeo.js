/**
 * Selectores de ubigeo en cascada (departamento → provincia → distrito).
 * Datos: INEI, generados con scripts/ubigeo.py del portal. El distrito
 * lleva el código de 6 dígitos como valor, que es lo que se envía; el
 * portal resuelve los nombres a partir de él.
 */

let datos = null;

async function cargar() {
  if (datos) return datos;
  const r = await fetch('data/ubigeo-peru.json');
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  datos = (await r.json()).d;
  return datos;
}

function opciones(select, lista, vacio) {
  select.replaceChildren(
    new Option(vacio, ''),
    ...lista.map(([codigo, nombre]) => new Option(nombre, codigo)),
  );
}

/**
 * Prepara un bloque [data-ubigeo] con tres select [data-ubigeo-nivel].
 * Devuelve { reiniciar } para dejarlo como al principio.
 */
export async function selectorUbigeo(bloque) {
  const nivel = (n) => bloque.querySelector(`[data-ubigeo-nivel="${n}"]`);
  const dep = nivel('departamento');
  const prov = nivel('provincia');
  const dist = nivel('distrito');

  const vaciar = (select, texto) => {
    opciones(select, [], texto);
    select.disabled = true;
  };

  let arbol;
  try {
    arbol = await cargar();
  } catch {
    opciones(dep, [], 'No se pudo cargar la lista');
    dep.disabled = true;
    return { reiniciar() {} };
  }

  const reiniciar = () => {
    opciones(dep, arbol.map(([c, n]) => [c, n]), 'Seleccione');
    dep.disabled = false;
    vaciar(prov, 'Elija el departamento');
    vaciar(dist, 'Elija la provincia');
  };

  dep.addEventListener('change', () => {
    const d = arbol.find(([c]) => c === dep.value);
    vaciar(dist, 'Elija la provincia');
    if (!d) return vaciar(prov, 'Elija el departamento');
    opciones(prov, d[2].map(([c, n]) => [c, n]), 'Seleccione');
    prov.disabled = false;
    // Departamentos de una sola provincia (Callao): se elige sola.
    if (d[2].length === 1) {
      prov.value = d[2][0][0];
      prov.dispatchEvent(new Event('change'));
    }
  });

  prov.addEventListener('change', () => {
    const d = arbol.find(([c]) => c === dep.value);
    const p = d?.[2].find(([c]) => c === prov.value);
    if (!p) return vaciar(dist, 'Elija la provincia');
    opciones(dist, p[2], 'Seleccione');
    dist.disabled = false;
  });

  reiniciar();
  return { reiniciar };
}
