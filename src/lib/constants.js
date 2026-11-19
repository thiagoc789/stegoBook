export const PERSONAS = ['Stephania', 'Santiago'];
export const PAGADORES = [...PERSONAS, 'Compartido'];

export const COLOR_PERSONA = {
  Stephania: '#ec4899',
  Santiago: '#3b82f6',
  Compartido: '#8b5cf6',
};
export const EMOJI_PERSONA = { Stephania: '👩🏻', Santiago: '👨🏻', Compartido: '💑' };

export const CATEGORIAS_BASE = [
  { nombre: 'Vivienda', emoji: '🏠', color: '#6366f1' },
  { nombre: 'Servicios', emoji: '💡', color: '#f59e0b' },
  { nombre: 'Mercado', emoji: '🛒', color: '#10b981' },
  { nombre: 'Transporte', emoji: '🚗', color: '#0ea5e9' },
  { nombre: 'Restaurantes', emoji: '🍔', color: '#ef4444' },
  { nombre: 'Domicilios', emoji: '🛵', color: '#f97316' },
  { nombre: 'Salud', emoji: '💊', color: '#14b8a6' },
  { nombre: 'Entretenimiento', emoji: '🎬', color: '#a855f7' },
  { nombre: 'Ropa', emoji: '👕', color: '#ec4899' },
  { nombre: 'Educación', emoji: '📚', color: '#3b82f6' },
  { nombre: 'Suscripciones', emoji: '📺', color: '#8b5cf6' },
  { nombre: 'Mascotas', emoji: '🐾', color: '#84cc16' },
  { nombre: 'Deudas', emoji: '💳', color: '#dc2626' },
  { nombre: 'Regalos', emoji: '🎁', color: '#d946ef' },
  { nombre: 'Viajes', emoji: '✈️', color: '#06b6d4' },
  { nombre: 'Hogar', emoji: '🛋️', color: '#a16207' },
  { nombre: 'Cuidado personal', emoji: '💅', color: '#f472b6' },
  { nombre: 'Otros', emoji: '📦', color: '#64748b' },
];

const EXTRA_COLORS = ['#22c55e', '#eab308', '#0891b2', '#be185d', '#4f46e5', '#65a30d'];

export function categorias(config) {
  const extra = (config?.categoriasPersonalizadas || []).map((c, i) => ({
    nombre: c.nombre, emoji: c.emoji || '🏷️', color: EXTRA_COLORS[i % EXTRA_COLORS.length],
  }));
  return [...CATEGORIAS_BASE, ...extra];
}

export function infoCategoria(nombre, config) {
  return categorias(config).find((c) => c.nombre === nombre) || { nombre, emoji: '🏷️', color: '#64748b' };
}

export const FRECUENCIAS = {
  mensual: { label: 'Mensual', meses: 1 },
  bimestral: { label: 'Bimestral', meses: 2 },
  trimestral: { label: 'Trimestral', meses: 3 },
  semestral: { label: 'Semestral', meses: 6 },
  anual: { label: 'Anual', meses: 12 },
};

export const MONEDAS = ['COP', 'USD', 'EUR', 'MXN'];

export const CONFIG_DEFAULT = {
  moneda: 'COP',
  metaAhorroPct: 20,
  reparto: 'proporcional', // 'proporcional' | 'mitad'
  categoriasPersonalizadas: [],
};
