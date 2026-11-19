import { addMonths, currentMonth } from './format';

/** Genera datos de ejemplo para explorar la app. */
export function datosDemo() {
  const cm = currentMonth();
  const desde = addMonths(cm, -5);
  const rand = (a, b) => Math.round((a + Math.random() * (b - a)) / 100) * 100;
  const gastos = [];
  const plantillas = [
    ['Mercado D1', 'Mercado', 'necesidad', 60000, 180000, 6],
    ['Rappi', 'Domicilios', 'deseo', 25000, 70000, 5],
    ['Uber', 'Transporte', 'necesidad', 12000, 35000, 6],
    ['Restaurante', 'Restaurantes', 'deseo', 50000, 160000, 3],
    ['Cine', 'Entretenimiento', 'deseo', 30000, 60000, 1],
    ['Farmacia', 'Salud', 'necesidad', 15000, 80000, 1],
    ['Ropa', 'Ropa', 'deseo', 80000, 250000, 1],
    ['Café', 'Restaurantes', 'deseo', 8000, 15000, 6],
  ];
  const quienes = ['Stephania', 'Santiago', 'Compartido'];
  for (let i = 5; i >= 0; i--) {
    const m = addMonths(cm, -i);
    const maxDia = i === 0 ? new Date().getDate() : 28;
    plantillas.forEach(([concepto, categoria, tipo, min, max, veces]) => {
      for (let k = 0; k < veces; k++) {
        const dia = String(1 + Math.floor(Math.random() * maxDia)).padStart(2, '0');
        gastos.push({ concepto, categoria, tipo, monto: rand(min, max), fecha: `${m}-${dia}`, pagadoPor: quienes[Math.floor(Math.random() * 3)], nota: '' });
      }
    });
  }
  return {
    salarios: [
      { persona: 'Stephania', concepto: 'Salario', monto: 4800000, desde, hasta: null },
      { persona: 'Santiago', concepto: 'Salario', monto: 5500000, desde, hasta: null },
    ],
    ingresos: [{ persona: 'Santiago', concepto: 'Freelance', monto: 800000, fecha: `${addMonths(cm, -1)}-15` }],
    gastosFijos: [
      { concepto: 'Arriendo', monto: 2400000, categoria: 'Vivienda', pagadoPor: 'Compartido', dia: 5, frecuencia: 'mensual', desde, hasta: null, pagados: {} },
      { concepto: 'Servicios públicos', monto: 380000, categoria: 'Servicios', pagadoPor: 'Santiago', dia: 15, frecuencia: 'mensual', desde, hasta: null, pagados: {} },
      { concepto: 'Internet + celulares', monto: 210000, categoria: 'Servicios', pagadoPor: 'Stephania', dia: 10, frecuencia: 'mensual', desde, hasta: null, pagados: {} },
      { concepto: 'Netflix + Spotify', monto: 65000, categoria: 'Suscripciones', pagadoPor: 'Stephania', dia: 20, frecuencia: 'mensual', desde, hasta: null, pagados: {} },
      { concepto: 'Gimnasio', monto: 180000, categoria: 'Salud', pagadoPor: 'Santiago', dia: 1, frecuencia: 'mensual', desde, hasta: null, pagados: {} },
      { concepto: 'Cuota carro', monto: 950000, categoria: 'Deudas', pagadoPor: 'Santiago', dia: 25, frecuencia: 'mensual', desde, hasta: null, pagados: {} },
      { concepto: 'SOAT', monto: 900000, categoria: 'Transporte', pagadoPor: 'Santiago', dia: 12, frecuencia: 'anual', desde: addMonths(cm, 2), hasta: null, pagados: {} },
    ],
    presupuestos: [
      { categoria: 'Restaurantes', limite: 500000 },
      { categoria: 'Domicilios', limite: 200000 },
      { categoria: 'Mercado', limite: 900000 },
    ],
    metas: [
      { nombre: 'Fondo de emergencia', emoji: '🛟', tipo: 'emergencia', objetivo: 25000000, fechaLimite: `${addMonths(cm, 12)}-01`,
        aportes: [{ monto: 1500000, persona: 'Compartido', fecha: `${addMonths(cm, -3)}-01` }, { monto: 1000000, persona: 'Stephania', fecha: `${addMonths(cm, -1)}-02` }] },
      { nombre: 'Viaje a San Andrés', emoji: '🏖️', tipo: 'meta', objetivo: 6000000, fechaLimite: `${addMonths(cm, 7)}-15`,
        aportes: [{ monto: 800000, persona: 'Santiago', fecha: `${addMonths(cm, -2)}-10` }] },
    ],
    aspiraciones: [
      { nombre: 'Apartamento propio (cuota inicial)', tipo: 'sueno', costo: 60000000, prioridad: 1, estado: 'soñando', quien: 'Ambos', nota: '', link: '', fecha: `${cm}-01` },
      { nombre: 'Sofá nuevo', tipo: 'compra', costo: 2500000, prioridad: 2, estado: 'soñando', quien: 'Stephania', nota: '', link: '', fecha: `${cm}-01` },
      { nombre: 'Concierto', tipo: 'experiencia', costo: 700000, prioridad: 3, estado: 'soñando', quien: 'Santiago', nota: '', link: '', fecha: `${cm}-01` },
    ],
    gastos,
  };
}
