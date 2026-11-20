import { CATEGORIAS, infoCategoria } from './constants';

export const normalizar = (s = '') => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const KEYWORDS = CATEGORIAS.flatMap((c) => c.claves.map((k) => ({
  re: new RegExp(`(^|[^a-z0-9])${escape(k)}`), largo: k.length, categoria: c.nombre, tipo: c.tipo,
}))).sort((a, b) => b.largo - a.largo); // las claves más específicas primero

/** Mapa concepto normalizado -> { categoria, tipo, veces } a partir de los gastos registrados. */
export function aprender(gastos) {
  const mapa = new Map();
  [...gastos].sort((a, b) => (a.creado || a.fecha || '').localeCompare(b.creado || b.fecha || '')).forEach((g) => {
    const k = normalizar(g.concepto);
    if (!k) return;
    const prev = mapa.get(k);
    mapa.set(k, { concepto: g.concepto, categoria: g.categoria, tipo: g.tipo || infoCategoria(g.categoria).tipo, veces: (prev?.veces || 0) + 1 });
  });
  return mapa;
}

/**
 * Clasifica un concepto. Prioridad: lo que ya registraron antes > palabras clave.
 * Devuelve { categoria, tipo, fuente } o null si no reconoce nada.
 */
export function clasificar(concepto, historial) {
  const k = normalizar(concepto);
  if (k.length < 2) return null;
  const exacto = historial?.get(k);
  if (exacto) return { categoria: exacto.categoria, tipo: exacto.tipo, fuente: 'historial' };
  for (const kw of KEYWORDS) {
    if (kw.re.test(k)) return { categoria: kw.categoria, tipo: kw.tipo, fuente: 'auto' };
  }
  if (historial && k.length >= 3) {
    for (const [hk, v] of historial) {
      if (hk.startsWith(k) || k.startsWith(hk)) return { categoria: v.categoria, tipo: v.tipo, fuente: 'historial' };
    }
  }
  return null;
}

/** Conceptos más usados (para atajos). */
export function frecuentes(historial, n = 8) {
  return [...historial.values()].sort((a, b) => b.veces - a.veces).slice(0, n);
}
