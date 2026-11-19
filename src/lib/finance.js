import { FRECUENCIAS, PERSONAS } from './constants';
import { addMonths, currentMonth, daysInMonth, monthDiff } from './format';

const num = (v) => Number(v) || 0;
const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + num(f(x)), 0);

/** ¿Un elemento recurrente (desde/hasta) está activo en el mes dado? */
export function activoEn(item, mes) {
  if (item.desde && item.desde > mes) return false;
  if (item.hasta && item.hasta < mes) return false;
  return true;
}

/** ¿Un gasto fijo se cobra en el mes dado según su frecuencia? */
export function fijoAplicaEn(fijo, mes) {
  if (!activoEn(fijo, mes)) return false;
  const periodo = FRECUENCIAS[fijo.frecuencia || 'mensual']?.meses || 1;
  if (periodo === 1) return true;
  const inicio = fijo.desde || mes;
  return monthDiff(inicio, mes) % periodo === 0;
}

/** Equivalente mensual de un gasto fijo (para provisiones). */
export function fijoMensualizado(fijo) {
  const periodo = FRECUENCIAS[fijo.frecuencia || 'mensual']?.meses || 1;
  return num(fijo.monto) / periodo;
}

/** Resumen completo de un mes. */
export function resumenMes(data, mes) {
  const salarios = data.salarios.filter((s) => activoEn(s, mes));
  const extras = data.ingresos.filter((i) => (i.fecha || '').startsWith(mes));
  const fijos = data.gastosFijos.filter((f) => fijoAplicaEn(f, mes));
  const variables = data.gastos.filter((g) => (g.fecha || '').startsWith(mes));

  const ingresoSalarios = sum(salarios, (s) => s.monto);
  const ingresoExtras = sum(extras, (i) => i.monto);
  const ingresos = ingresoSalarios + ingresoExtras;
  const totalFijos = sum(fijos, (f) => f.monto);
  const totalVariables = sum(variables, (g) => g.monto);
  const gastos = totalFijos + totalVariables;
  const balance = ingresos - gastos;

  const porCategoria = {};
  [...fijos, ...variables].forEach((g) => {
    const c = g.categoria || 'Otros';
    porCategoria[c] = (porCategoria[c] || 0) + num(g.monto);
  });

  const ingresoPorPersona = Object.fromEntries(PERSONAS.map((p) => [p,
    sum(salarios.filter((s) => s.persona === p), (s) => s.monto)
    + sum(extras.filter((s) => s.persona === p), (s) => s.monto)]));

  const pagadoPorPersona = {};
  [...fijos, ...variables].forEach((g) => {
    const p = g.pagadoPor || 'Compartido';
    pagadoPorPersona[p] = (pagadoPorPersona[p] || 0) + num(g.monto);
  });

  const deseos = sum(variables.filter((g) => g.tipo === 'deseo'), (g) => g.monto);
  const necesidades = gastos - deseos;

  return {
    mes, salarios, extras, fijos, variables,
    ingresoSalarios, ingresoExtras, ingresos,
    totalFijos, totalVariables, gastos, balance,
    tasaAhorro: ingresos > 0 ? balance / ingresos : 0,
    porCategoria, ingresoPorPersona, pagadoPorPersona,
    necesidades, deseos,
  };
}

/**
 * Reparto justo: cuánto debería haber pagado cada uno de los gastos
 * pagados individualmente (no los de la cuenta compartida).
 */
export function repartoJusto(resumen, modo = 'proporcional') {
  const [a, b] = PERSONAS;
  const totalIngreso = resumen.ingresoPorPersona[a] + resumen.ingresoPorPersona[b];
  const share = {
    [a]: modo === 'mitad' || totalIngreso === 0 ? 0.5 : resumen.ingresoPorPersona[a] / totalIngreso,
  };
  share[b] = 1 - share[a];
  const pagado = { [a]: resumen.pagadoPorPersona[a] || 0, [b]: resumen.pagadoPorPersona[b] || 0 };
  const totalIndividual = pagado[a] + pagado[b];
  const deberia = { [a]: totalIndividual * share[a], [b]: totalIndividual * share[b] };
  const diffA = pagado[a] - deberia[a]; // >0 => A pagó de más
  return {
    share, pagado, deberia, totalIndividual,
    deudor: diffA > 0 ? b : a,
    acreedor: diffA > 0 ? a : b,
    monto: Math.abs(diffA),
  };
}

/** Gasto variable promedio de los últimos n meses cerrados que tengan datos. */
export function promedioVariable(data, n = 3, hasta = currentMonth()) {
  const meses = [];
  for (let i = 1; i <= 12 && meses.length < n; i++) {
    const m = addMonths(hasta, -i);
    const total = sum(data.gastos.filter((g) => (g.fecha || '').startsWith(m)), (g) => g.monto);
    if (total > 0) meses.push(total);
  }
  if (meses.length === 0) {
    // sin historia: extrapola el mes actual
    return proyeccionCierreMes(data, hasta).variablesEstimado;
  }
  return sum(meses) / meses.length;
}

/** Promedio de gasto variable por categoría (últimos n meses con datos). */
export function promedioPorCategoria(data, n = 3, hasta = currentMonth()) {
  const acc = {};
  let count = 0;
  for (let i = 1; i <= 12 && count < n; i++) {
    const m = addMonths(hasta, -i);
    const gs = data.gastos.filter((g) => (g.fecha || '').startsWith(m));
    if (!gs.length) continue;
    count++;
    gs.forEach((g) => { acc[g.categoria || 'Otros'] = (acc[g.categoria || 'Otros'] || 0) + num(g.monto); });
  }
  Object.keys(acc).forEach((k) => { acc[k] /= count || 1; });
  return acc;
}

/** Estima cómo cerrará el mes actual según el ritmo de gasto variable. */
export function proyeccionCierreMes(data, mes = currentMonth()) {
  const r = resumenMes(data, mes);
  const hoy = new Date();
  const esActual = mes === currentMonth();
  const dias = daysInMonth(mes);
  const transcurridos = esActual ? hoy.getDate() : dias;
  const ritmo = transcurridos > 0 ? r.totalVariables / transcurridos : 0;
  const variablesEstimado = esActual ? ritmo * dias : r.totalVariables;
  const gastosEstimado = r.totalFijos + variablesEstimado;
  return {
    ...r,
    dias, transcurridos, ritmo,
    variablesEstimado,
    gastosEstimado,
    balanceEstimado: r.ingresos - gastosEstimado,
    diarioDisponible: esActual && dias - transcurridos > 0
      ? Math.max(0, (r.ingresos - r.totalFijos - r.totalVariables) / (dias - transcurridos + 1))
      : 0,
  };
}

/**
 * Previsión de los próximos `meses` meses.
 * escenario: { recorteVariablePct, ingresoExtra, aumentoSalarialPct, ahorroInicial, recortesCategoria }
 */
export function prevision(data, meses = 12, escenario = {}) {
  const {
    recorteVariablePct = 0, ingresoExtra = 0, aumentoSalarialPct = 0, ahorroInicial = 0, recortesCategoria = {},
  } = escenario;
  const inicio = currentMonth();
  const promCat = promedioPorCategoria(data);
  let baseVariable = Object.keys(promCat).length
    ? Object.entries(promCat).reduce((a, [c, v]) => a + v * (1 - (recortesCategoria[c] || 0) / 100), 0)
    : promedioVariable(data);
  baseVariable *= 1 - recorteVariablePct / 100;

  let acumulado = num(ahorroInicial);
  const filas = [];
  for (let i = 0; i < meses; i++) {
    const mes = addMonths(inicio, i);
    const salarios = sum(data.salarios.filter((s) => activoEn(s, mes)), (s) => s.monto) * (1 + aumentoSalarialPct / 100);
    const ingresos = salarios + num(ingresoExtra);
    const fijos = sum(data.gastosFijos.filter((f) => fijoAplicaEn(f, mes)), (f) => f.monto);
    const gastos = fijos + baseVariable;
    const balance = ingresos - gastos;
    acumulado += balance;
    filas.push({ mes, ingresos, fijos, variables: baseVariable, gastos, balance, acumulado });
  }
  return filas;
}

/** Datos de una meta de ahorro. */
export function estadoMeta(meta, mes = currentMonth()) {
  const ahorrado = sum(meta.aportes || [], (a) => a.monto);
  const objetivo = num(meta.objetivo);
  const falta = Math.max(0, objetivo - ahorrado);
  const progreso = objetivo > 0 ? Math.min(1, ahorrado / objetivo) : 0;
  let mesesRestantes = null;
  let cuotaMensual = null;
  if (meta.fechaLimite) {
    mesesRestantes = Math.max(1, monthDiff(mes, meta.fechaLimite.slice(0, 7)) + 1);
    cuotaMensual = falta / mesesRestantes;
  }
  const aportesMes = sum((meta.aportes || []).filter((a) => (a.fecha || '').startsWith(mes)), (a) => a.monto);
  return { ahorrado, objetivo, falta, progreso, mesesRestantes, cuotaMensual, aportesMes, completa: falta === 0 && objetivo > 0 };
}

export function totalAhorradoMetas(metas) {
  return sum(metas, (m) => sum(m.aportes || [], (a) => a.monto));
}

/** Consejos automáticos a partir de los datos del mes. */
export function consejos(data, mes, config, presupuestos) {
  const r = resumenMes(data, mes);
  const out = [];
  const meta = (config.metaAhorroPct || 20) / 100;
  if (r.ingresos === 0) {
    out.push({ tipo: 'info', texto: 'Registren sus salarios en "Ingresos" para empezar a ver el panorama completo.' });
    return out;
  }
  if (r.balance < 0) {
    out.push({ tipo: 'peligro', texto: `Este mes están gastando más de lo que ganan (déficit de ${Math.round(-r.tasaAhorro * 100)}% del ingreso).` });
  } else if (r.tasaAhorro < meta) {
    out.push({ tipo: 'alerta', texto: `Están ahorrando el ${Math.round(r.tasaAhorro * 100)}% del ingreso; su meta es ${Math.round(meta * 100)}%.` });
  } else {
    out.push({ tipo: 'ok', texto: `¡Bien! Ahorran el ${Math.round(r.tasaAhorro * 100)}% del ingreso, por encima de su meta del ${Math.round(meta * 100)}%.` });
  }
  if (r.deseos / r.ingresos > 0.3) {
    out.push({ tipo: 'alerta', texto: `Los gustos/deseos son el ${Math.round((r.deseos / r.ingresos) * 100)}% del ingreso. La regla 50/30/20 recomienda máximo 30%.` });
  }
  if (r.totalFijos / r.ingresos > 0.5) {
    out.push({ tipo: 'alerta', texto: `Los gastos fijos se comen el ${Math.round((r.totalFijos / r.ingresos) * 100)}% del ingreso. Revisen suscripciones y servicios que puedan renegociar.` });
  }
  const prom = promedioPorCategoria(data, 3, mes);
  const varCat = {};
  r.variables.forEach((g) => { varCat[g.categoria] = (varCat[g.categoria] || 0) + num(g.monto); });
  Object.entries(varCat).forEach(([c, v]) => {
    if (prom[c] && v > prom[c] * 1.3 && v - prom[c] > r.ingresos * 0.02) {
      out.push({ tipo: 'alerta', texto: `${c}: llevan ${Math.round((v / prom[c] - 1) * 100)}% más que su promedio de los últimos meses.` });
    }
  });
  presupuestos.forEach((p) => {
    const gastado = r.porCategoria[p.categoria] || 0;
    if (num(p.limite) > 0 && gastado > num(p.limite)) {
      out.push({ tipo: 'peligro', texto: `Se pasaron del presupuesto de ${p.categoria}.` });
    }
  });
  const pequenos = r.variables.filter((g) => num(g.monto) < r.ingresos * 0.005);
  if (pequenos.length >= 15) {
    out.push({ tipo: 'info', texto: `Tienen ${pequenos.length} gastos pequeños este mes que suman ${Math.round((sum(pequenos, (g) => g.monto) / r.ingresos) * 100)}% del ingreso. ¡Los gastos hormiga cuentan!` });
  }
  return out;
}
