const fmtCache = {};
export function money(n, moneda = 'COP', compact = false) {
  const key = moneda + compact;
  if (!fmtCache[key]) {
    fmtCache[key] = new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: moneda === 'COP' ? 0 : 2,
      minimumFractionDigits: 0,
      notation: compact ? 'compact' : 'standard',
    });
  }
  return fmtCache[key].format(Number(n) || 0);
}

export const pct = (n) => `${Math.round((Number(n) || 0) * 100)}%`;

const pad = (n) => String(n).padStart(2, '0');
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};
export const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
export const currentMonth = () => monthKey();

export function addMonths(key, n) {
  const [y, m] = key.split('-').map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return monthKey(d);
}

export function monthDiff(from, to) {
  const [y1, m1] = from.split('-').map(Number);
  const [y2, m2] = to.split('-').map(Number);
  return (y2 - y1) * 12 + (m2 - m1);
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function monthLabel(key, short = false) {
  const [y, m] = key.split('-').map(Number);
  return short ? `${MESES_CORTOS[m - 1]} ${String(y).slice(2)}` : `${MESES[m - 1]} ${y}`;
}

export function dateLabel(iso) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES_CORTOS[m - 1]}${y !== new Date().getFullYear() ? ` ${y}` : ''}`;
}

export function daysInMonth(key) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m, 0).getDate();
}
