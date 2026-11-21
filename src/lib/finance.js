import { CATEGORIAS, infoCategoria } from './constants';
import { addMonths, currentMonth, daysInMonth, monthDiff } from './format';
import { abonosEn, cuotaEn } from './deudas';

const num = (v) => Number(v) || 0;
const sum = (arr, f = (x) => x) => arr.reduce((a, x) => a + num(f(x)), 0);

/** De quién es un registro (compatibilidad con datos viejos que usaban pagadoPor). */
export const personaDe = (x) => x.persona || x.pagadoPor || 'Compartido';
export const tipoDe = (g) => g.tipo || infoCategoria(g.categoria).tipo;
export const duenoMeta = (m) => m.dueno || 'Ambos';

export function activoEn(item, mes) {
  if (item.desde && item.desde > mes) return false;
  if (item.hasta && item.hasta < mes) return false;
  return true;
}

const FREC = { mensual: 1, bimestral: 2, trimestral: 3, semestral: 6, anual: 12 };
export function fijoAplicaEn(fijo, mes) {
  if (!activoEn(fijo, mes)) return false;
  const periodo = FREC[fijo.frecuencia || 'mensual'] || 1;
  return periodo === 1 || monthDiff(fijo.desde || mes, mes) % periodo === 0;
}

/** persona = 'Stephania' | 'Santiago' | null (null = los dos juntos) */
export function resumen(data, mes, persona = null) {
  const de = (x) => !persona || personaDe(x) === persona;
  const salarios = data.salarios.filter(de).filter((s) => activoEn(s, mes));
  const extras = data.ingresos.filter(de).filter((i) => (i.fecha || '').startsWith(mes));
  // las cuotas y abonos de las deudas cuentan como gastos fijos (categoría Deudas)
  const deudasMes = (data.deudas || []).filter(de).flatMap((d) => {
    const base = { persona: personaDe(d), categoria: 'Deudas', tipo: 'necesidad', esDeuda: true };
    const out = [];
    const cuota = cuotaEn(d, mes);
    if (cuota > 0) out.push({ ...base, id: `deuda-${d.id}`, deudaId: d.id, concepto: `Cuota ${d.nombre}`, monto: cuota, dia: d.dia, pagados: d.pagados, prueba: d.prueba });
    const abono = abonosEn(d, mes);
    if (abono > 0) out.push({ ...base, id: `abono-${d.id}`, esAbono: true, concepto: `Abono extra ${d.nombre}`, monto: abono });
    return out;
  });
  const fijos = [...data.gastosFijos.filter(de).filter((f) => fijoAplicaEn(f, mes)), ...deudasMes];
  const variables = data.gastos.filter(de).filter((g) => (g.fecha || '').startsWith(mes));

  const ingresos = sum(salarios, (s) => s.monto) + sum(extras, (i) => i.monto);
  const totalFijos = sum(fijos, (f) => f.monto);
  const totalVariables = sum(variables, (g) => g.monto);
  const gastos = totalFijos + totalVariables;

  const cats = {};
  [...fijos, ...variables].forEach((g) => {
    const c = cats[g.categoria || 'Otros'] ||= { nombre: g.categoria || 'Otros', total: 0, necesidad: 0, gusto: 0, items: 0 };
    const t = tipoDe(g) === 'gusto' ? 'gusto' : 'necesidad';
    c.total += num(g.monto); c[t] += num(g.monto); c.items++;
  });
  const porCategoria = Object.values(cats).sort((a, b) => b.total - a.total);
  const gustos = sum(porCategoria, (c) => c.gusto);

  return {
    mes, salarios, extras, fijos, variables,
    ingresos, totalFijos, totalVariables, gastos,
    disponible: ingresos - gastos,
    gustos, necesidades: gastos - gustos,
    gustosFijos: sum(fijos.filter((f) => tipoDe(f) === 'gusto'), (f) => f.monto),
    porCategoria,
  };
}

/** Proyección simple del cierre del mes según el ritmo de gasto variable. */
export function ritmoMes(r) {
  const esActual = r.mes === currentMonth();
  const dias = daysInMonth(r.mes);
  const hoy = esActual ? new Date().getDate() : dias;
  const variablesFin = esActual && hoy > 3 ? (r.totalVariables / hoy) * dias : r.totalVariables;
  return { esActual, dias, hoy, restantes: esActual ? dias - hoy + 1 : 0, disponibleFin: r.ingresos - r.totalFijos - variablesFin };
}

/* ---------- metas ---------- */
export function metasDe(metas, persona) {
  return metas.filter((m) => !persona || duenoMeta(m) === persona || duenoMeta(m) === 'Ambos');
}

export function estadoMeta(meta, mes = currentMonth()) {
  const ahorrado = sum(meta.aportes || [], (a) => a.monto);
  const objetivo = num(meta.objetivo);
  const falta = Math.max(0, objetivo - ahorrado);
  const progreso = objetivo > 0 ? Math.min(1, ahorrado / objetivo) : 0;
  let mesesRestantes = null;
  let cuotaMensual = null;
  if (meta.fechaLimite && falta > 0) {
    const desde = mes < currentMonth() ? currentMonth() : mes;
    mesesRestantes = Math.max(1, monthDiff(desde, meta.fechaLimite.slice(0, 7)) + 1);
    cuotaMensual = falta / mesesRestantes;
  }
  const aportesMes = sum((meta.aportes || []).filter((a) => (a.fecha || '').startsWith(mes)), (a) => a.monto);
  return { ahorrado, objetivo, falta, progreso, mesesRestantes, cuotaMensual, aportesMes, completa: objetivo > 0 && falta === 0 };
}

/** Cuánto deben apartar al mes para sus metas. Las metas "Ambos" se dividen a la mitad en la vista individual. */
export function cuotaMetas(metas, persona, mes) {
  return metasDe(metas, persona).reduce((a, m) => {
    const c = estadoMeta(m, mes).cuotaMensual || 0;
    return a + (persona && duenoMeta(m) === 'Ambos' ? c / 2 : c);
  }, 0);
}

/* ---------- qué recortar ---------- */
export function sugerencias(data, r, persona, cuota) {
  const out = [];
  if (r.ingresos === 0) return out;
  const ritmo = ritmoMes(r);
  const libre = ritmo.disponibleFin - cuota;

  const pctGustos = r.gustos / r.ingresos;
  if (pctGustos > 0.3) {
    out.push({ tipo: 'alerta', texto: `Los gustos son el ${Math.round(pctGustos * 100)}% del ingreso. Lo recomendado es máximo 30% ({m}).`, monto: r.ingresos * 0.3 });
  }

  if (cuota > 0) {
    if (libre < 0) {
      const falta = -libre;
      if (r.gustos >= falta) {
        out.push({ tipo: 'peligro', texto: `Al ritmo de gasto actual, este mes faltarían {m} para las metas. Se logra recortando el ${Math.ceil((falta / r.gustos) * 100)}% de los gustos.`, monto: falta });
      } else {
        out.push({ tipo: 'peligro', texto: 'Al ritmo de gasto actual faltarían {m} para las metas y ni recortando todos los gustos alcanza: revisen los gastos fijos o den más tiempo a las metas.', monto: falta });
      }
    } else {
      out.push({ tipo: 'ok', texto: ritmo.esActual ? 'Al ritmo de gasto actual, después de apartar {m} para las metas el mes cerraría con {m2} libres.' : 'Después de apartar {m} para las metas quedaron {m2} libres.', monto: cuota, monto2: libre });
    }
  }

  const prev = resumen(data, addMonths(r.mes, -1), persona);
  r.porCategoria.filter((c) => c.gusto > 0).slice(0, 3).forEach((c) => {
    const antes = prev.porCategoria.find((p) => p.nombre === c.nombre)?.gusto || 0;
    const sube = antes > 0 && c.gusto > antes * 1.3 && !ritmo.esActual;
    out.push({
      tipo: 'recorte', categoria: c.nombre,
      texto: `${infoCategoria(c.nombre).emoji} ${c.nombre}: {m} en gustos${sube ? ` (${Math.round((c.gusto / antes - 1) * 100)}% más que el mes pasado)` : ''}. Bajándolo a la mitad ahorran {m2}.`,
      monto: c.gusto, monto2: c.gusto / 2,
    });
  });

  if (r.gustosFijos > 0) {
    const nombres = r.fijos.filter((f) => tipoDe(f) === 'gusto').map((f) => f.concepto).slice(0, 4).join(', ');
    out.push({ tipo: 'info', texto: `Pagan {m} al mes en fijos que son gustos (${nombres}). ¿Los usan todos?`, monto: r.gustosFijos });
  }
  return out;
}

export const CATEGORIAS_NOMBRES = CATEGORIAS.map((c) => c.nombre);
