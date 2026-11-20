/** Plan "Irnos a vivir juntos": lista de cosas, costos de entrada, costo mensual y fecha estimada. */
import { personaDe, resumen } from './finance';
import { simular } from './deudas';
import { addMonths, currentMonth } from './format';
import { PERSONAS } from './constants';

export const CATEGORIAS_CASA = [
  { nombre: 'Entrada', emoji: '🚪' },
  { nombre: 'Habitación', emoji: '🛏️' },
  { nombre: 'Cocina', emoji: '🍳' },
  { nombre: 'Electrodomésticos', emoji: '🔌' },
  { nombre: 'Sala y comedor', emoji: '🛋️' },
  { nombre: 'Baño', emoji: '🛁' },
  { nombre: 'Aseo y hogar', emoji: '🧹' },
];

// Precios de referencia (COP, aproximados). Se editan en la app.
export const LISTA_SUGERIDA = [
  ['Estudio de arrendamiento / póliza', 'Entrada', 150000, 'indispensable'],
  ['Trasteo / mudanza', 'Entrada', 400000, 'indispensable'],
  ['Cama + colchón doble', 'Habitación', 1800000, 'indispensable'],
  ['Sábanas, cobijas y almohadas', 'Habitación', 300000, 'indispensable'],
  ['Clóset / organizador de ropa', 'Habitación', 400000, 'despues'],
  ['Nevera', 'Electrodomésticos', 1600000, 'indispensable'],
  ['Lavadora', 'Electrodomésticos', 1500000, 'indispensable'],
  ['Estufa (si el apto no trae)', 'Electrodomésticos', 600000, 'indispensable'],
  ['Microondas', 'Electrodomésticos', 400000, 'despues'],
  ['Juego de ollas y sartenes', 'Cocina', 300000, 'indispensable'],
  ['Vajilla, vasos y cubiertos', 'Cocina', 200000, 'indispensable'],
  ['Utensilios de cocina', 'Cocina', 150000, 'indispensable'],
  ['Olla arrocera', 'Cocina', 150000, 'indispensable'],
  ['Licuadora', 'Cocina', 180000, 'indispensable'],
  ['Comedor pequeño', 'Sala y comedor', 600000, 'despues'],
  ['Sofá', 'Sala y comedor', 1500000, 'despues'],
  ['Televisor', 'Sala y comedor', 1500000, 'despues'],
  ['Toallas, cortina y accesorios de baño', 'Baño', 200000, 'indispensable'],
  ['Escoba, trapero e implementos de aseo', 'Aseo y hogar', 150000, 'indispensable'],
  ['Primer mercado grande', 'Aseo y hogar', 500000, 'indispensable'],
  ['Cortinas', 'Aseo y hogar', 300000, 'despues'],
].map(([nombre, categoria, costo, prioridad]) => ({ nombre, categoria, costo, prioridad, estado: 'pendiente' }));

export const PLAN_DEFAULT = {
  arriendo: 1300000, administracion: 0, servicios: 300000, internet: 90000, mercado: 1000000,
  mesesAdelanto: 1, colchon: true, ahorroMensual: 1500000, reparto: 'proporcional',
};

const num = (v) => Number(v) || 0;

export function costoMensual(plan) {
  return num(plan.arriendo) + num(plan.administracion) + num(plan.servicios) + num(plan.internet) + num(plan.mercado);
}

/** Participación de cada uno (proporcional al ingreso o 50/50). */
export function participacion(data, plan, mes = currentMonth()) {
  const ing = Object.fromEntries(PERSONAS.map((p) => [p, resumen(data, mes, p).ingresos]));
  const total = ing[PERSONAS[0]] + ing[PERSONAS[1]];
  const a = plan.reparto === 'mitad' || !total ? 0.5 : ing[PERSONAS[0]] / total;
  return { [PERSONAS[0]]: a, [PERSONAS[1]]: 1 - a, ingresos: ing };
}

/** Lo que paga hoy cada uno en vivienda y servicios (para comparar). */
export function viviendaHoy(data, persona, mes = currentMonth()) {
  return resumen(data, mes, persona).fijos
    .filter((f) => ['Vivienda', 'Servicios'].includes(f.categoria))
    .reduce((a, f) => a + num(f.monto), 0);
}

export function totales(plan, items) {
  const cuenta = items.filter((i) => i.estado !== 'tengo');
  const indispensables = cuenta.filter((i) => i.prioridad !== 'despues');
  const despues = cuenta.filter((i) => i.prioridad === 'despues');
  const adelanto = num(plan.arriendo) * num(plan.mesesAdelanto);
  const colchon = plan.colchon ? costoMensual(plan) : 0;
  const cosas = indispensables.reduce((a, i) => a + num(i.costo), 0);
  return {
    adelanto, colchon, cosas,
    indispensable: adelanto + colchon + cosas,
    despues: despues.reduce((a, i) => a + num(i.costo), 0),
    comprados: items.filter((i) => i.estado === 'comprado').length,
    tengo: items.filter((i) => i.estado === 'tengo').length,
    pendientes: items.filter((i) => i.estado === 'pendiente' && i.prioridad !== 'despues').length,
  };
}

/**
 * Mes en que juntan `falta` ahorrando `mensual`, opcionalmente sumando
 * las cuotas de deudas que se van terminando.
 */
export function fechaMeta(falta, mensual, deudas = [], { conDeudas = false } = {}) {
  if (falta <= 0) return { mes: currentMonth(), meses: 0 };
  const fines = conDeudas
    ? deudas.map((d) => ({ cuota: num(d.cuota), fin: simular([d]).porDeuda[d.id]?.fin })).filter((x) => x.fin)
    : [];
  let acum = 0;
  for (let i = 0; i < 240; i++) {
    const mes = addMonths(currentMonth(), i);
    const liberado = fines.filter((x) => x.fin < mes).reduce((a, x) => a + x.cuota, 0);
    acum += num(mensual) + liberado;
    if (acum >= falta) return { mes, meses: i + 1 };
  }
  return null;
}

export const deudasDe = (data) => (data.deudas || []).filter((d) => PERSONAS.includes(personaDe(d)));
