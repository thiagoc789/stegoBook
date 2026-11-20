/**
 * Deudas: el saldo se estima solo a partir del último saldo conocido (extracto),
 * asumiendo que cada mes se paga la cuota, más los abonos extra registrados.
 */
import { addMonths, currentMonth, monthDiff } from './format';

const num = (v) => Number(v) || 0;

export const TIPOS_DEUDA = {
  tarjeta: { label: 'Tarjeta de crédito', emoji: '💳' },
  carro: { label: 'Carro', emoji: '🚗' },
  moto: { label: 'Moto', emoji: '🏍️' },
  familiar: { label: 'Familiar / amigo', emoji: '🤝' },
  libranza: { label: 'Crédito / libranza', emoji: '🏦' },
  estudio: { label: 'Estudio', emoji: '🎓' },
  otro: { label: 'Otra', emoji: '📄' },
};

/** Tasa efectiva anual (%) -> tasa mensual (decimal). */
export const tasaMensual = (ea) => (num(ea) > 0 ? (1 + num(ea) / 100) ** (1 / 12) - 1 : 0);

const abonosEn = (d, mes) => (d.abonos || []).filter((a) => (a.fecha || '').startsWith(mes)).reduce((s, a) => s + num(a.monto), 0);
// abonos hechos después del último saldo informado (los anteriores ya están en ese saldo)
const abonosPost = (d, mes) => (d.abonos || [])
  .filter((a) => (a.fecha || '').startsWith(mes) && (a.creado || a.fecha || '') > (d.saldoActualizado || ''))
  .reduce((s, a) => s + num(a.monto), 0);

/** Saldo al inicio de `mes`: cada mes desde el extracto suma intereses y resta la cuota y los abonos. */
export function saldoEn(d, mes = currentMonth()) {
  const r = tasaMensual(d.tasaEA);
  let saldo = num(d.saldo);
  for (let m = d.fechaSaldo || mes; m < mes && saldo > 0; m = addMonths(m, 1)) {
    saldo = saldo * (1 + r) - num(d.cuota) - abonosPost(d, m);
  }
  return Math.max(0, saldo);
}

/** Saldo estimado hoy (antes de la cuota de este mes, ya con los abonos de este mes). */
export const saldoHoy = (d) => Math.max(0, saldoEn(d) - abonosPost(d, currentMonth()));

/** Cuota que se paga en `mes` (0 si ya terminó o aún no empieza). */
export function cuotaEn(d, mes) {
  if ((d.desde || d.fechaSaldo || '') > mes) return 0;
  const s = saldoEn(d, mes);
  if (s <= 0) return 0;
  return Math.min(num(d.cuota), s * (1 + tasaMensual(d.tasaEA)));
}

export { abonosEn };

/**
 * Simula el pago de un grupo de deudas.
 * extra: dinero adicional al mes. bolaDeNieve: cuando una deuda termina, su cuota pasa a la siguiente.
 * Estrategia avalancha: el extra va primero a la de mayor tasa.
 */
export function simular(deudas, { extra = 0, bolaDeNieve = false, desde = currentMonth() } = {}) {
  const ds = deudas.map((d) => ({
    id: d.id, nombre: d.nombre, r: tasaMensual(d.tasaEA), tasa: num(d.tasaEA), cuota: num(d.cuota),
    saldo: saldoHoy(d), interes: 0, fin: null,
  })).filter((d) => d.saldo > 0);
  let interesTotal = 0;
  let m = 0;
  const MAX = 360;
  while (ds.some((d) => d.saldo > 0.5) && m < MAX) {
    const mes = addMonths(desde, m);
    let bolsa = num(extra);
    ds.forEach((d) => {
      if (d.saldo <= 0.5) { if (bolaDeNieve) bolsa += d.cuota; return; }
      const i = d.saldo * d.r;
      d.saldo += i; d.interes += i; interesTotal += i;
      const pago = Math.min(d.saldo, d.cuota);
      d.saldo -= pago;
      bolsa += d.cuota - pago; // lo que sobró de la última cuota
      if (d.saldo <= 0.5) { d.saldo = 0; d.fin = mes; }
    });
    // el extra va a la de mayor tasa (y menor saldo si empatan)
    const orden = ds.filter((d) => d.saldo > 0).sort((a, b) => b.tasa - a.tasa || a.saldo - b.saldo);
    for (const d of orden) {
      if (bolsa <= 0) break;
      const p = Math.min(bolsa, d.saldo);
      d.saldo -= p; bolsa -= p;
      if (d.saldo <= 0.5) { d.saldo = 0; d.fin = mes; }
    }
    m++;
  }
  const nunca = ds.filter((d) => d.saldo > 0.5);
  return {
    meses: m, interesTotal, fin: m ? addMonths(desde, m - 1) : desde,
    porDeuda: Object.fromEntries(ds.map((d) => [d.id, { fin: d.fin, interes: d.interes }])),
    nunca: nunca.map((d) => d.nombre),
  };
}

export const mesesEntre = (a, b) => monthDiff(a, b);
