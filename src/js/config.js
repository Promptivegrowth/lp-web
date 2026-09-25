/**
 * Conexión con el portal del Grupo Pacheco.
 *
 * - SUPABASE_*: lectura de los datos publicados (contacto y vacantes). La
 *   clave es la «publicable»: pública por diseño; la base solo deja leer lo
 *   visible y vigente.
 * - PORTAL: dirección del portal, que recibe los formularios (contacto y
 *   libro de reclamaciones). Cambiarla aquí si el portal cambia de dominio.
 */
export const EMPRESA = 'lp';
export const SUPABASE_URL = 'https://youlxcpbffsvokhygubh.supabase.co';
export const SUPABASE_CLAVE = 'sb_publishable_ldYnYlLuvA4fVu8Hnlh-nw_M2C2Hkui';
// En desarrollo se puede apuntar a un portal local con VITE_PORTAL en
// .env.development.local (no se versiona).
export const PORTAL = import.meta.env.VITE_PORTAL || 'https://panel-grupo-pacheco.vercel.app';

export const endpoint = (tipo) => `${PORTAL}/api/publico/${EMPRESA}/${tipo}`;

/** Consulta de solo lectura a Supabase; `null` si falla (se queda el HTML). */
export async function leer(tabla, consulta) {
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${tabla}?${consulta}`, {
      headers: { apikey: SUPABASE_CLAVE },
      signal: AbortSignal.timeout?.(7000),
    });
    if (!r.ok) return null;
    const datos = await r.json();
    return Array.isArray(datos) ? datos : null;
  } catch {
    return null;
  }
}
