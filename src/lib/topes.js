/**
 * Tope semanal de gustos por persona, calculado a partir de:
 *  - cuánto gasta normalmente en gustos (promedio de meses anteriores o ritmo de este mes)
 *  - el % de recorte que elijan
 *  - lo que realmente le alcanza: ingreso - fijos - deudas - necesidades - metas
 */
import { cuotaMetas, personaDe, resumen, tipoDe } from './finance';
import { addMonths, currentMonth, daysInMonth } from './format';

export const RECORTE_DEFAULT = 30;
const SIN_HISTORIAL_PCT = 0.15; // primer mes: 15% del ingreso como punto de partida

const iso = (d) => d.toLocaleDateString('en-CA');
export function semanaActual(hoy = new Date()) {
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const dow = (d.getDay() + 6) % 7; // lunes = 0
  const ini = new Date(d); ini.setDate(d.getDate() - dow);
  const fin = new Date(ini); fin.setDate(ini.getDate() + 6);
  return { inicio: iso(ini), fin: iso(fin), diaSemana: dow + 1, diasRestantes: 7 - dow };
}

function historico(data, persona, mes) {
  const meses = [];
  for (let i = 1; i <= 6 && meses.length < 3; i++) {
    const r = resumen(data, addMonths(mes, -i), persona);
    if (r.variables.length >= 5) meses.push(r);
  }
  if (!meses.length) return null;
  const avg = (f) => meses.reduce((a, r) => a + f(r), 0) / meses.length;
  return {
    meses: meses.length,
    gustos: avg((r) => r.variables.filter((g) => tipoDe(g) === 'gusto').reduce((a, g) => a + Number(g.monto), 0)),
    necesidades: avg((r) => r.variables.filter((g) => tipoDe(g) !== 'gusto').reduce((a, g) => a + Number(g.monto), 0)),
  };
}

export function topeGustos(data, persona, config, mes = currentMonth()) {
  const r = resumen(data, mes, persona);
  const recorte = Number(config?.topes?.[persona]?.recorte ?? RECORTE_DEFAULT);
  const dias = daysInMonth(mes);
  const hoy = mes === currentMonth() ? new Date().getDate() : dias;

  const gustosMes = r.variables.filter((g) => tipoDe(g) === 'gusto').reduce((a, g) => a + Number(g.monto), 0);
  const necesidadesMes = r.variables.filter((g) => tipoDe(g) !== 'gusto').reduce((a, g) => a + Number(g.monto), 0);
  const hist = historico(data, persona, mes);

  let base; let fuente; let necesidades;
  if (hist) {
    base = hist.gustos; necesidades = hist.necesidades;
    fuente = `lo que gastas en gustos en promedio (${hist.meses} ${hist.meses === 1 ? 'mes' : 'meses'})`;
  } else if (hoy >= 10 && gustosMes > 0) {
    base = (gustosMes / hoy) * dias; necesidades = (necesidadesMes / hoy) * dias;
    fuente = 'tu ritmo de gustos de este mes';
  } else {
    base = null; necesidades = necesidadesMes;
    fuente = null;
  }

  const metas = cuotaMetas(data.metas, persona, mes);
  const capacidad = r.ingresos - r.totalFijos - necesidades - metas;
  let mensual = base != null ? base * (1 - recorte / 100) : r.ingresos * SIN_HISTORIAL_PCT;
  const limitadoPorCapacidad = mensual > capacidad;
  mensual = Math.max(0, Math.min(mensual, capacidad));
  const semanal = (mensual * 7) / dias;

  const sem = semanaActual();
  const gastadoSemana = data.gastos
    .filter((g) => personaDe(g) === persona && tipoDe(g) === 'gusto' && g.fecha >= sem.inicio && g.fecha <= sem.fin)
    .reduce((a, g) => a + Number(g.monto), 0);

  return {
    persona, recorte, base, fuente, necesidades, metas, capacidad, limitadoPorCapacidad,
    ingresos: r.ingresos, fijos: r.totalFijos,
    mensual, semanal, gastadoSemana, quedaSemana: semanal - gastadoSemana,
    ratio: semanal > 0 ? gastadoSemana / semanal : gastadoSemana > 0 ? 2 : 0,
    semana: sem,
  };
}
